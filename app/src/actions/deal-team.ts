"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/current-user";
import { documentVersion, hashClientIp, readLegalMarkdown } from "@/lib/legal";
import { DEFAULT_DOC_MAX_MB, canAddToDealTeam, fileAllowed, parseDocSettings, safeStorageKey, teamRoleForMember, type TeamRoleId } from "@/lib/platform/deal-team";
import { prisma } from "@/lib/prisma";
import { dealStorage } from "@/lib/storage";
import { notify } from "@/lib/notify";

const ROLES = new Set(["LENDER", "INVESTOR", "GC", "DESIGN", "ATTORNEY", "BROKER", "ADVISOR", "OTHER"]);

export async function addToDealTeam(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const memberId = String(formData.get("userId") || "");
  const roleRaw = String(formData.get("teamRole") || "OTHER");
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) redirect("/deals");
  const back = `/deals/${dealId}/room`;
  const [intro, thread, blocked] = await Promise.all([
    prisma.introduction.findFirst({
      where: { status: "ACCEPTED", OR: [{ fromId: user.id, toId: memberId }, { fromId: memberId, toId: user.id }] },
      select: { id: true },
    }),
    prisma.conversation.findFirst({
      where: { OR: [{ userAId: user.id, userBId: memberId }, { userAId: memberId, userBId: user.id }] },
      select: { id: true },
    }),
    prisma.block.findFirst({
      where: { OR: [{ blockerId: user.id, blockedId: memberId }, { blockerId: memberId, blockedId: user.id }] },
      select: { id: true },
    }),
  ]);
  const decision = canAddToDealTeam({
    isSponsor: deal.sponsorId === user.id,
    hasIntro: Boolean(intro),
    hasThread: Boolean(thread),
    blocked: Boolean(blocked),
  });
  if (!decision.ok) redirect(`${back}?error=${encodeURIComponent(decision.reason)}`);
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true, name: true, role: true, status: true } });
  if (!member || member.status !== "ACTIVE" || member.id === user.id) redirect(back);
  const teamRole = (ROLES.has(roleRaw) ? roleRaw : teamRoleForMember(member.role)) as TeamRoleId;
  await prisma.dealTeamMember.upsert({
    where: { dealId_userId: { dealId, userId: memberId } },
    create: { dealId, userId: memberId, teamRole, status: "REQUESTED", addedBySponsor: true },
    update: { teamRole, status: "REQUESTED", addedBySponsor: true, removedAt: null },
  });
  await notify(memberId, {
    title: "Deal team request",
    body: `${user.name} asked you to join the deal team for ${deal.title}.`,
    href: `/deals/${dealId}`,
  });
  await prisma.dealEvent.create({
    data: { dealId, actorId: user.id, summary: `${user.name} sent an add to deal team request to ${member.name}.` },
  });
  await prisma.moderationEvent.create({
    data: { actorId: user.id, action: "DEAL_TEAM_REQUEST", targetUserId: memberId, targetType: "deal", summary: `${user.name} added a request for ${member.name} on ${deal.title}.` },
  });
  revalidatePath(back);
  revalidatePath(`/deals/${dealId}`);
  redirect(`${back}?notice=Add+to+deal+team+request+sent`);
}

export async function acceptDealTeam(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  if (formData.get("nda") !== "on") redirect(`/deals/${dealId}?error=${encodeURIComponent("Acknowledge the platform NDA before the documents open.")}`);
  const row = await prisma.dealTeamMember.findUnique({ where: { dealId_userId: { dealId, userId: user.id } } });
  if (!row || row.status !== "REQUESTED") redirect(`/deals/${dealId}`);
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ndaVersion = documentVersion(readLegalMarkdown("deal-room-nda.md"));
  const now = new Date();
  await prisma.dealTeamMember.update({
    where: { id: row.id },
    data: { status: "ADDED", ndaVersion, ndaAckAt: now, ndaIpHash: hashClientIp(ip), addedAt: now },
  });
  await prisma.dealAccess.upsert({
    where: { dealId_requesterId: { dealId, requesterId: user.id } },
    create: {
      dealId,
      requesterId: user.id,
      status: "APPROVED",
      ndaAcknowledged: true,
      ndaAcknowledgedAt: now,
      ndaVersion,
      ndaIpHash: hashClientIp(ip),
      reviewedAt: now,
    },
    update: { status: "APPROVED", ndaAcknowledged: true, ndaAcknowledgedAt: now, ndaVersion, ndaIpHash: hashClientIp(ip), reviewedAt: now },
  });
  await prisma.dealEvent.create({ data: { dealId, actorId: user.id, summary: `${user.name} joined the deal team and acknowledged the platform NDA.` } });
  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/deals/${dealId}/room`);
  redirect(`/deals/${dealId}/room?notice=You+are+on+the+deal+team`);
}

export async function removeFromDealTeam(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const memberId = String(formData.get("userId") || "");
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal || deal.sponsorId !== user.id || memberId === user.id) redirect("/deals");
  await prisma.dealTeamMember.updateMany({
    where: { dealId, userId: memberId },
    data: { status: "REMOVED", removedAt: new Date() },
  });
  await prisma.dealAccess.updateMany({ where: { dealId, requesterId: memberId }, data: { status: "REMOVED", reviewedAt: new Date() } });
  await prisma.dealEvent.create({ data: { dealId, actorId: user.id, summary: `${user.name} removed a member from the deal team.` } });
  await prisma.moderationEvent.create({
    data: { actorId: user.id, action: "DEAL_TEAM_REMOVED", targetUserId: memberId, targetType: "deal", summary: `${user.name} removed a member from ${deal.title}.` },
  });
  revalidatePath(`/deals/${dealId}/room`);
  redirect(`/deals/${dealId}/room?notice=Removed+from+the+deal+team`);
}

export async function addDealFolder(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal || deal.sponsorId !== user.id || name.length < 2) redirect(`/deals/${dealId}/room`);
  const roles = formData.getAll("audience").map(String).filter((item): item is TeamRoleId => ROLES.has(item));
  await prisma.dealFolder.create({ data: { dealId, name, audienceRoles: roles } });
  revalidatePath(`/deals/${dealId}/room`);
  redirect(`/deals/${dealId}/room?notice=Folder+added`);
}

export async function saveDocSettings(formData: FormData) {
  const admin = await requireAdmin();
  const maxMb = Number(formData.get("maxMb") || DEFAULT_DOC_MAX_MB);
  const types = String(formData.get("types") || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const settings = parseDocSettings([
    { key: "doc.maxMb", value: { n: maxMb } },
    { key: "doc.allowedTypes", value: { types } },
  ]);
  await prisma.siteSetting.upsert({
    where: { key: "doc.maxMb" },
    create: { key: "doc.maxMb", value: { n: settings.maxMb }, updatedById: admin.id },
    update: { value: { n: settings.maxMb }, updatedById: admin.id },
  });
  await prisma.siteSetting.upsert({
    where: { key: "doc.allowedTypes" },
    create: { key: "doc.allowedTypes", value: { types: settings.types }, updatedById: admin.id },
    update: { value: { types: settings.types }, updatedById: admin.id },
  });
  await prisma.moderationEvent.create({
    data: { actorId: admin.id, action: "DOC_SETTINGS", targetType: "settings", summary: `${admin.name} updated deal file settings.` },
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?notice=File+settings+saved");
}

export async function loadDocSettings() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: ["doc.maxMb", "doc.allowedTypes"] } } });
  return parseDocSettings(rows);
}

export async function storeDealFile(input: { dealId: string; documentId: string; bytes: Uint8Array; contentType: string }) {
  const key = safeStorageKey(input.dealId, input.documentId);
  if (!key) throw new Error("That storage key is not allowed.");
  const storage = dealStorage();
  await storage.put({ key, bytes: input.bytes, contentType: input.contentType });
  return { key, scanStatus: storage.mode === "local" ? "STORED" : "PENDING" };
}

export { fileAllowed };
