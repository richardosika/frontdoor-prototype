"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contactAboutProject } from "@/actions/projects";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { checklistRoom } from "@/lib/deal-checklist-db";
import { CHECKLIST_FILE_MAX, CHECKLIST_FILE_TYPES, STATUS_LABEL, isChecklistStatus, parseDueDate } from "@/lib/deal-checklist";
import { isSeekCategory, parseSeeking, seekLabel, serializeSeeking } from "@/lib/project-contact";

const roomPath = (dealId: string) => `/deals/${dealId}/room`;
function back(dealId: string, kind: "notice" | "error", text: string, anchor = "checklist"): never {
  redirect(`${roomPath(dealId)}?${kind}=${encodeURIComponent(text)}#${anchor}`);
}
async function event(dealId: string, actorId: string, summary: string) {
  await prisma.dealEvent.create({ data: { dealId, actorId, summary } });
}

export async function addChecklistItem(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const room = await checklistRoom(dealId, user);
  if (!room?.manage) back(dealId, "error", "Only the sponsor can change the checklist.");
  const title = String(formData.get("title") || "").trim().slice(0, 140);
  const section = String(formData.get("section") || "").trim().slice(0, 60) || "Other";
  const category = String(formData.get("category") || "");
  if (title.length < 2) back(dealId, "error", "Add a name for the item.");
  const assigneeId = String(formData.get("assigneeId") || "");
  const last = await prisma.dealChecklistItem.aggregate({ where: { dealId }, _max: { position: true } });
  await prisma.dealChecklistItem.create({
    data: {
      dealId,
      title,
      section,
      category: isSeekCategory(category) ? category : "",
      assigneeId: room.memberIds.includes(assigneeId) ? assigneeId : null,
      dueDate: parseDueDate(String(formData.get("dueDate") || "")),
      position: (last._max.position ?? 0) + 1,
    },
  });
  await event(dealId, user.id, `${user.name} added ${title}`);
  revalidatePath(roomPath(dealId));
  back(dealId, "notice", "Item added.");
}

export async function updateChecklistItem(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") || "");
  const item = await prisma.dealChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) redirect("/feed");
  const room = await checklistRoom(item.dealId, user);
  if (!room) redirect(`/deals/${item.dealId}`);
  const canEdit = room.manage || item.assigneeId === user.id;
  if (!canEdit) back(item.dealId, "error", "Only the sponsor or the person assigned can change this item.");
  const status = String(formData.get("status") || item.status);
  const data: Record<string, unknown> = {};
  if (isChecklistStatus(status) && status !== item.status) data.status = status;
  if (room.manage) {
    const title = String(formData.get("title") ?? item.title).trim().slice(0, 140);
    if (title.length >= 2) data.title = title;
    const assigneeId = String(formData.get("assigneeId") ?? "");
    data.assigneeId = room.memberIds.includes(assigneeId) ? assigneeId : null;
    if (formData.has("dueDate")) data.dueDate = parseDueDate(String(formData.get("dueDate") || ""));
    const category = String(formData.get("category") ?? item.category);
    data.category = isSeekCategory(category) ? category : "";
  }
  await prisma.dealChecklistItem.update({ where: { id: item.id }, data });
  if (data.status) await event(item.dealId, user.id, `${user.name} marked ${item.title} ${STATUS_LABEL[data.status as keyof typeof STATUS_LABEL].toLowerCase()}`);
  if (data.assigneeId && data.assigneeId !== item.assigneeId && data.assigneeId !== user.id) {
    await notify(String(data.assigneeId), { title: "Checklist item assigned to you", body: item.title, href: `${roomPath(item.dealId)}#item-${item.id}` });
  }
  revalidatePath(roomPath(item.dealId));
  back(item.dealId, "notice", "Saved.", `item-${item.id}`);
}

export async function removeChecklistItem(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") || "");
  const item = await prisma.dealChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) redirect("/feed");
  const room = await checklistRoom(item.dealId, user);
  if (!room?.manage) back(item.dealId, "error", "Only the sponsor can change the checklist.");
  await prisma.dealChecklistItem.delete({ where: { id: item.id } });
  await event(item.dealId, user.id, `${user.name} removed ${item.title}`);
  revalidatePath(roomPath(item.dealId));
  back(item.dealId, "notice", "Item removed.");
}

export async function uploadChecklistFile(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") || "");
  const item = await prisma.dealChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) redirect("/feed");
  const room = await checklistRoom(item.dealId, user);
  if (!room) redirect(`/deals/${item.dealId}`);
  if (!room.manage && item.assigneeId !== user.id) back(item.dealId, "error", "Only the sponsor or the person assigned can change this item.");
  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size === 0) back(item.dealId, "error", "Choose a file.", `item-${item.id}`);
  if (upload.size > CHECKLIST_FILE_MAX) back(item.dealId, "error", "That file is larger than 10 MB.", `item-${item.id}`);
  const type = upload.type || "application/octet-stream";
  if (!CHECKLIST_FILE_TYPES.includes(type)) back(item.dealId, "error", "Use a PDF, image, spreadsheet, or Word file.", `item-${item.id}`);
  await prisma.dealChecklistItem.update({
    where: { id: item.id },
    data: {
      fileName: upload.name.slice(0, 180),
      contentType: type,
      sizeBytes: upload.size,
      bytes: new Uint8Array(await upload.arrayBuffer()),
      fileAt: new Date(),
      ...(formData.get("markDone") === "on" ? { status: "DONE" } : {}),
    },
  });
  await event(item.dealId, user.id, `${user.name} uploaded ${upload.name.slice(0, 120)} to ${item.title}`);
  revalidatePath(roomPath(item.dealId));
  back(item.dealId, "notice", "File attached.", `item-${item.id}`);
}

export async function commentChecklistItem(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") || "");
  const body = String(formData.get("body") || "").trim().slice(0, 1000);
  const item = await prisma.dealChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) redirect("/feed");
  const room = await checklistRoom(item.dealId, user);
  if (!room) redirect(`/deals/${item.dealId}`);
  if (body.length < 1) back(item.dealId, "error", "Write a comment first.", `item-${item.id}`);
  await prisma.dealChecklistComment.create({ data: { itemId: item.id, authorId: user.id, body } });
  await event(item.dealId, user.id, `${user.name} commented on ${item.title}: “${body.slice(0, 80)}${body.length > 80 ? "…" : ""}”`);
  revalidatePath(roomPath(item.dealId));
  back(item.dealId, "notice", "Comment added.", `item-${item.id}`);
}

/**
 * "Find a [category]": the sponsor picks a member for a checklist item. The category is added to what the project
 * is seeking first, so the usual contact rule (approved project, seeking the member's category) allows it.
 */
export async function reachOutForChecklist(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") || "");
  const item = await prisma.dealChecklistItem.findUnique({ where: { id: itemId }, include: { deal: { select: { id: true, sponsorId: true, projectId: true } } } });
  if (!item || !item.deal.projectId || item.deal.sponsorId !== user.id) redirect("/feed");
  const project = await prisma.trackProject.findUnique({ where: { id: item.deal.projectId } });
  if (!project || project.userId !== user.id) back(item.deal.id, "error", "Project not found.");
  if (project.reviewStatus !== "APPROVED") back(item.deal.id, "error", "This project is not open yet. It is waiting for staff review.");
  if (isSeekCategory(item.category)) {
    const seeking = parseSeeking(project.seeking);
    if (!seeking.includes(item.category)) {
      await prisma.trackProject.update({ where: { id: project.id }, data: { seeking: serializeSeeking([...seeking, item.category]) } });
      await event(item.deal.id, user.id, `${user.name} added ${seekLabel(item.category)} to what ${project.name} is seeking`);
    }
  }
  const forward = new FormData();
  forward.set("projectId", project.id);
  forward.set("toId", String(formData.get("toId") || ""));
  forward.set("note", String(formData.get("note") || ""));
  forward.set("back", `/projects/${project.id}`);
  await contactAboutProject(forward);
}
