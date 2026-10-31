"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/current-user";
import { sendEmail } from "@/lib/email";
import { isLocale } from "@/lib/i18n/messages";
import { RATE_LIMITS, withinRateLimit } from "@/lib/messaging";
import { notify, notifyAdmins } from "@/lib/notify";
import { deliverPortalMessage, isBlocked } from "@/lib/portal-message";
import { prisma } from "@/lib/prisma";
import {
  canContactAboutProject,
  canEditProject,
  formatProjectValue,
  projectLocation,
  readProjectForm,
  reviewOutcome,
  serializeSeeking,
  parseSeeking,
  seekLabel,
} from "@/lib/project-contact";
import { roleLabel, roleShort } from "@/lib/roles";
import { readFacts, serializeFacts } from "@/lib/project-facts";
import { projectContactEmail, projectReviewEmail } from "@/lib/project-review-email";
import { PROJECT_ROLE_LABELS } from "@/lib/project-roles";
import { appBaseUrl } from "@/lib/url";
import { ensureVerificationCase } from "@/lib/verification-db";
import { DOC_ERROR, SUBMIT_FILES_MAX, announceDocumentChange, readUpload } from "@/lib/project-upload";

const DAY = 24 * 60 * 60 * 1000;

function backPath(formData: FormData): string {
  const back = String(formData.get("back") || "/profile");
  if (/^\/projects\/[A-Za-z0-9_-]+$/.test(back)) return back;
  return back === "/feed" ? "/feed" : "/profile";
}

function go(back: string, key: "error" | "notice", text: string): never {
  redirect(`${back}?${key}=${encodeURIComponent(text)}`);
}

function refresh() {
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath("/admin/projects");
}

/** New projects go to staff review. Nobody else sees them until a Private Floor administrator approves. */
export async function addProject(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const read = readProjectForm(formData, PROJECT_ROLE_LABELS);
  if (!read.ok) go(back, "error", read.reason);
  // #44: only developers seek people on a project; other members' projects are past work.
  const value = user.role === "DEVELOPER" ? read.value : { ...read.value, seeking: [] };
  const attached = await readSubmissionFiles(formData);
  if (!attached.ok) go(back, "error", attached.reason);
  const project = await prisma.trackProject.create({
    data: {
      userId: user.id,
      name: value.name,
      asset: value.asset,
      street: value.street,
      city: value.city,
      state: value.state,
      location: projectLocation(value),
      year: value.year,
      valueLabel: value.valueLabel,
      role: value.role,
      summary: value.summary,
      seeking: serializeSeeking(value.seeking),
      shareWithCircle: value.shareWithCircle,
      roleFacts: serializeFacts(readFacts(formData)),
      reviewStatus: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });
  if (attached.files.length) await prisma.projectDocument.createMany({ data: attached.files.map((file) => ({ projectId: project.id, ...file })) });
  await ensureVerificationCase({ subject: "PROJECT", projectId: project.id, actorId: user.id });
  const { queueProjectVerification } = await import("@/lib/verify/queue");
  await queueProjectVerification(project.id, value.name);
  await notifyAdmins({ title: "Project to review", body: `${user.name} submitted ${value.name}.`, href: "/admin/projects" });
  refresh();
  // #35: back to the Ledger with a thank-you card.
  redirect(`/feed?submitted=${project.id}`);
}

/** Edit a project that is pending review or came back for more information. Saving sends it back to review. */
export async function resubmitProject(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== user.id) go(back, "error", "Project not found.");
  if (!canEditProject(project.reviewStatus)) go(back, "error", "This project cannot be edited right now.");
  const read = readProjectForm(formData, PROJECT_ROLE_LABELS);
  if (!read.ok) go(back, "error", read.reason);
  // #44: only developers seek people on a project; other members' projects are past work.
  const value = user.role === "DEVELOPER" ? read.value : { ...read.value, seeking: [] };
  await prisma.trackProject.update({
    where: { id: project.id },
    data: {
      name: value.name,
      asset: value.asset,
      street: value.street,
      city: value.city,
      state: value.state,
      location: projectLocation(value),
      year: value.year,
      valueLabel: value.valueLabel,
      role: value.role,
      summary: value.summary,
      seeking: serializeSeeking(value.seeking),
      shareWithCircle: value.shareWithCircle,
      roleFacts: serializeFacts(readFacts(formData)),
      reviewStatus: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });
  await notifyAdmins({ title: "Project resubmitted", body: `${user.name} resubmitted ${value.name}.`, href: "/admin/projects" });
  refresh();
  go(back, "notice", "Project resubmitted. It is pending review.");
}

/** Share an approved project's details with My Circle, or stop sharing. */
export async function setProjectSharing(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== user.id) go(back, "error", "Project not found.");
  const share = formData.get("share") === "on";
  await prisma.trackProject.update({ where: { id: projectId }, data: { shareWithCircle: share } });
  refresh();
  go(back, "notice", share ? "Shared with My Circle." : "No longer shared with My Circle.");
}

/** Staff decision on a submitted project: Approve, More info needed, or Decline. Emails the owner in their language. */
export async function reviewProject(formData: FormData) {
  const admin = await requireAdmin();
  const projectId = String(formData.get("projectId") || "");
  const decision = String(formData.get("decision") || "");
  const outcome = reviewOutcome(decision, String(formData.get("note") || ""));
  if (!outcome.ok) redirect(`/admin/projects?error=${encodeURIComponent(outcome.reason)}`);
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, include: { user: true } });
  if (!project) redirect("/admin/projects?error=Project+not+found");
  await prisma.trackProject.update({
    where: { id: project.id },
    data: { reviewStatus: outcome.status, reviewNote: outcome.note, reviewedAt: new Date() },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "REVIEW_PROJECT",
      summary: `${admin.name} marked ${project.name} by ${project.user.name} as ${outcome.status}.`,
    },
  });
  const status = outcome.status as "APPROVED" | "NEEDS_INFO" | "DECLINED";
  const base = await appBaseUrl();
  const link = status === "NEEDS_INFO" ? `${base}/profile#project-${project.id}` : status === "APPROVED" ? `${base}/deals` : `${base}/feed`;
  const locale = isLocale(project.user.locale) ? project.user.locale : "en";
  const mail = projectReviewEmail({
    locale,
    status,
    firstName: project.user.name.split(" ")[0] || project.user.name,
    projectName: project.name,
    note: outcome.note,
    link,
  });
  if (project.user.notifyProjectDecisions) await sendEmail({ to: project.user.email, subject: mail.subject, text: mail.text });
  await notify(project.userId, {
    title: mail.subject,
    body: outcome.note ? `${project.name}: ${outcome.note}` : project.name,
    href: status === "NEEDS_INFO" ? `/profile#project-${project.id}` : status === "APPROVED" ? "/deals" : "/feed",
  });
  if (status === "APPROVED") {
    const { alertProjectSeekers } = await import("@/lib/member-alerts");
    await alertProjectSeekers(project.id);
  }
  refresh();
  redirect(`/admin/projects?notice=${encodeURIComponent(`${project.name}: ${status}`)}`);
}

/**
 * Contact about one project. A member in a category the project seeks can contact the owner, and the owner can
 * reach out to a member in a category the project seeks. Nothing else. Enforced here, not only in the page.
 */
export async function contactAboutProject(formData: FormData) {
  const user = await requireUser();
  const rawBack = String(formData.get("back") || "/feed");
  const back = /^\/(members|projects)\/[A-Za-z0-9_-]+$/.test(rawBack) ? rawBack : ["/profile", "/deals", "/network"].includes(rawBack) ? rawBack : "/feed";
  const projectId = String(formData.get("projectId") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  const project = await prisma.trackProject.findUnique({ where: { id: projectId } });
  if (!project) go(back, "error", "Project not found.");
  const toId = project.userId === user.id ? String(formData.get("toId") || "") : project.userId;
  const to = await prisma.user.findUnique({ where: { id: toId }, select: { id: true, role: true, extraCategories: true, status: true, email: true, locale: true, notifyIntros: true } });
  if (!to || to.status !== "ACTIVE") go(back, "error", "That member is not available.");
  const decision = canContactAboutProject({ project, from: { id: user.id, role: user.role, extraCategories: user.extraCategories }, to: { id: to.id, role: to.role, extraCategories: to.extraCategories } });
  if (!decision.ok) go(back, "error", decision.reason);
  if (await isBlocked(user.id, to.id)) go(back, "error", "Messaging is closed between these members.");
  const recent = await prisma.projectContact.count({ where: { fromId: user.id, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (!withinRateLimit(recent, RATE_LIMITS.introductionsPerDay)) go(back, "error", "You have sent too many contact requests today.");
  const existing = await prisma.projectContact.findFirst({
    where: { projectId, OR: [{ fromId: user.id, toId: to.id }, { fromId: to.id, toId: user.id }] },
  });
  if (existing) go(back, "notice", "There is already a contact request for this project.");
  await prisma.projectContact.create({
    data: { projectId, fromId: user.id, toId: to.id, category: decision.category, note },
  });
  await notify(to.id, { title: "Project contact request", body: `${user.name}${user.org ? ` (${user.org})` : ""}: ${project.name}`, href: "/feed#ledger-outreach" });
  if (to.notifyIntros) {
    const base = await appBaseUrl();
    const mail = projectContactEmail({
      locale: isLocale(to.locale) ? to.locale : "en",
      link: `${base}/feed#ledger-outreach`,
      fromName: user.name,
      fromOrg: user.org,
      fromRole: roleShort(roleLabel(user.role)),
      projectName: project.name,
      basics: [project.asset, projectLocation(project) || project.location, project.year ? String(project.year) : ""].filter(Boolean).join(" · "),
      seeking: parseSeeking(project.seeking).map(seekLabel),
      note,
      profileLink: `${base}/members/${user.id}`,
    });
    await sendEmail({ to: to.email, subject: mail.subject, text: mail.text });
  }
  refresh();
  revalidatePath(`/members/${project.userId}`);
  go(back, "notice", "Contact request sent.");
}

/** Accept or decline a contact request you received. Accepting opens messages about that project. */
export async function respondProjectContact(formData: FormData) {
  const user = await requireUser();
  const contactId = String(formData.get("contactId") || "");
  const decision = String(formData.get("decision") || "");
  const respondBack = /^\/projects\/[A-Za-z0-9_-]+$/.test(String(formData.get("back") || "")) ? String(formData.get("back")) : "/feed";
  if (decision !== "ACCEPTED" && decision !== "DECLINED") redirect(respondBack);
  const contact = await prisma.projectContact.findUnique({ where: { id: contactId }, include: { from: true, project: true } });
  if (!contact || contact.toId !== user.id || contact.status !== "PENDING") redirect("/feed");
  await prisma.projectContact.update({ where: { id: contact.id }, data: { status: decision, decidedAt: new Date() } });
  await notify(contact.fromId, {
    title: decision === "ACCEPTED" ? "Project contact accepted" : "Project contact declined",
    body: `${user.name}: ${contact.project.name}`,
    href: "/feed",
  });
  if (decision === "ACCEPTED") {
    const sent = await deliverPortalMessage({
      from: contact.from,
      toId: user.id,
      kind: "INTRO",
      body: `${contact.project.name}${contact.note ? `: ${contact.note}` : ""}`,
    });
    refresh();
    revalidatePath("/messages");
    if (sent.ok) redirect(`/messages/${sent.conversationId}`);
  }
  refresh();
  go(respondBack, "notice", decision === "ACCEPTED" ? "Contact accepted." : "Contact declined.");
}

/** After an accepted project contact, the project owner can add the other member to My Circle. */
export async function addContactToCircle(formData: FormData) {
  const user = await requireUser();
  const contactId = String(formData.get("contactId") || "");
  const contact = await prisma.projectContact.findUnique({ where: { id: contactId }, include: { project: { select: { userId: true } } } });
  if (!contact || contact.status !== "ACCEPTED" || contact.project.userId !== user.id) go("/feed", "error", "Only the project owner can add an accepted contact to My Circle.");
  const otherId = contact.fromId === user.id ? contact.toId : contact.fromId;
  if (await isBlocked(user.id, otherId)) go("/feed", "error", "Messaging is closed between these members.");
  const existing = await prisma.connection.findFirst({
    where: { OR: [{ fromId: user.id, toId: otherId }, { fromId: otherId, toId: user.id }] },
  });
  if (existing) await prisma.connection.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
  else await prisma.connection.create({ data: { fromId: user.id, toId: otherId, status: "ACCEPTED", note: "Added after a project contact" } });
  await notify(otherId, { title: "Added to a circle", body: `${user.name} added you to their circle.`, href: `/members/${user.id}` });
  refresh();
  revalidatePath("/network");
  go("/feed", "notice", "Added to My Circle.");
}

async function readDocument(formData: FormData, back: string) {
  const upload = formData.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (!file) go(back, "error", DOC_ERROR);
  const read = await readUpload(file);
  if (!read) go(back, "error", DOC_ERROR);
  return read;
}

/** Files attached to a new project at submission, each with a label. Labels default to the file name. */
async function readSubmissionFiles(formData: FormData) {
  const files = formData.getAll("docFile");
  const titles = formData.getAll("docTitle").map(String);
  const out: { title: string; fileName: string; contentType: string; sizeBytes: number; bytes: Uint8Array<ArrayBuffer> }[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;
    if (out.length >= SUBMIT_FILES_MAX) return { ok: false as const, reason: "Attach up to 10 files." };
    const read = await readUpload(file);
    if (!read) return { ok: false as const, reason: `${file.name}: ${DOC_ERROR}` };
    const title = (titles[i] || "").trim().slice(0, 120) || file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Document";
    out.push({ title, ...read });
  }
  return { ok: true as const, files: out };
}

async function ownProject(formData: FormData, userId: string, back: string) {
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) go(back, "error", "Project not found.");
  return project;
}

function sentNotice(count: number) {
  return count ? "Document saved. Everyone involved in this project was notified." : "Document saved.";
}

/** Add a document. Allowed on an approved project without sending it back to review. */
export async function addProjectDocument(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const project = await ownProject(formData, user.id, back);
  const title = String(formData.get("title") || "").trim().slice(0, 120);
  if (title.length < 2) go(back, "error", "Add a document title.");
  const file = await readDocument(formData, back);
  await prisma.projectDocument.create({ data: { projectId: project.id, title, ...file } });
  const count = await announceDocumentChange(project, user, "added", title);
  refresh();
  revalidatePath(`/members/${user.id}`);
  go(back, "notice", sentNotice(count));
}

/** Replace a document's file. The project's other fields and review status stay as they are. */
export async function replaceProjectDocument(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const project = await ownProject(formData, user.id, back);
  const documentId = String(formData.get("documentId") || "");
  const existing = await prisma.projectDocument.findUnique({ where: { id: documentId } });
  if (!existing || existing.projectId !== project.id) go(back, "error", "Document not found.");
  const file = await readDocument(formData, back);
  await prisma.projectDocument.update({ where: { id: existing.id }, data: { ...file, version: existing.version + 1 } });
  const count = await announceDocumentChange(project, user, "replaced", existing.title);
  refresh();
  revalidatePath(`/members/${user.id}`);
  go(back, "notice", sentNotice(count));
}

export async function removeProjectDocument(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const project = await ownProject(formData, user.id, back);
  const documentId = String(formData.get("documentId") || "");
  const existing = await prisma.projectDocument.findUnique({ where: { id: documentId }, select: { id: true, projectId: true, title: true } });
  if (!existing || existing.projectId !== project.id) go(back, "error", "Document not found.");
  await prisma.projectDocument.delete({ where: { id: existing.id } });
  const count = await announceDocumentChange(project, user, "removed", existing.title);
  refresh();
  revalidatePath(`/members/${user.id}`);
  go(back, "notice", count ? "Document removed. Everyone involved in this project was notified." : "Document removed.");
}

/** Link one of your deal rooms to the project, so its approved members hear about document updates. */
export async function linkProjectDeal(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const project = await ownProject(formData, user.id, back);
  const dealId = String(formData.get("dealId") || "");
  await prisma.deal.updateMany({ where: { sponsorId: user.id, projectId: project.id }, data: { projectId: null } });
  if (dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { sponsorId: true } });
    if (!deal || deal.sponsorId !== user.id) go(back, "error", "Deal not found.");
    await prisma.deal.update({ where: { id: dealId }, data: { projectId: project.id } });
  }
  refresh();
  go(back, "notice", "Deal room link saved.");
}

/** Owners change what an approved project is looking for. The listing stays approved; matching follows the new categories. */
export async function updateProjectSeeking(formData: FormData) {
  const user = await requireUser();
  const back = backPath(formData);
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== user.id) go(back, "error", "Project not found.");
  const seeking = serializeSeeking(formData.getAll("seeking").map(String));
  if (!seeking) go(back, "error", "Choose at least one category.");
  await prisma.trackProject.update({ where: { id: projectId }, data: { seeking } });
  refresh();
  go(back, "notice", "Saved what this project is looking for.");
}

/** Owner updates the optional details for the members a project seeks. Supplementary, so no new staff review. */
export async function updateProjectFacts(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, select: { id: true, userId: true } });
  const back = `/projects/${projectId}`;
  if (!project || project.userId !== user.id) go("/feed", "error", "Project not found.");
  await prisma.trackProject.update({ where: { id: project.id }, data: { roleFacts: serializeFacts(readFacts(formData)) } });
  refresh();
  revalidatePath(back);
  go(back, "notice", "Project details saved.");
}
