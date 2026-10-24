"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canConnect, orderedPair } from "@/lib/domain";
import { RATE_LIMITS, withinRateLimit } from "@/lib/messaging";
import { countRecentKind, deliverPortalMessage, isBlocked } from "@/lib/portal-message";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;

export async function requestConnection(formData: FormData) {
  const user = await requireUser();
  const toId = String(formData.get("toId") || "");
  const decision = canConnect(user.id, toId);
  if (!decision.ok) redirect(`/network?error=${encodeURIComponent(decision.reason)}`);

  const target = await prisma.user.findUnique({ where: { id: toId } });
  if (!target || target.status !== "ACTIVE") redirect("/network");
  if (await isBlocked(user.id, toId)) {
    redirect(`/members/${toId}?error=${encodeURIComponent("Messaging is closed between these members.")}`);
  }

  const recent = await prisma.connection.count({
    where: { fromId: user.id, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
  if (!withinRateLimit(recent, RATE_LIMITS.connectionsPerDay)) {
    redirect(`/members/${toId}?error=${encodeURIComponent("You have sent too many connection requests today.")}`);
  }

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { fromId: user.id, toId },
        { fromId: toId, toId: user.id },
      ],
    },
  });

  if (existing?.status === "ACCEPTED") redirect(`/members/${toId}`);
  if (existing?.status === "PENDING") redirect(`/members/${toId}?notice=Request+already+pending`);

  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: { fromId: user.id, toId, status: "PENDING" },
    });
  } else {
    await prisma.connection.create({ data: { fromId: user.id, toId, status: "PENDING" } });
  }

  const sent = await deliverPortalMessage({
    from: user,
    toId,
    kind: "CONNECTION",
    body: `${user.name} requested to connect. Accept or decline in Network.`,
  });
  if (!sent.ok) redirect(`/members/${toId}?error=${encodeURIComponent(sent.reason)}`);

  revalidatePath("/network");
  revalidatePath(`/members/${toId}`);
  revalidatePath("/messages");
  redirect(`/messages/${sent.conversationId}`);
}

export async function respondConnection(formData: FormData) {
  const user = await requireUser();
  const connectionId = String(formData.get("connectionId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "ACCEPTED" && decision !== "DECLINED") redirect("/network");

  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.toId !== user.id) redirect("/network");
  if (await isBlocked(user.id, connection.fromId)) redirect("/network?error=Messaging+is+closed+between+these+members.");

  await prisma.connection.update({
    where: { id: connection.id },
    data: { status: decision },
  });
  await deliverPortalMessage({
    from: user,
    toId: connection.fromId,
    kind: "CONNECTION",
    body: decision === "ACCEPTED" ? `${user.name} accepted your connection request.` : `${user.name} declined your connection request.`,
  });
  revalidatePath("/network");
  revalidatePath("/messages");
  redirect("/network");
}

export async function introduceMember(formData: FormData) {
  const user = await requireUser();
  const otherId = String(formData.get("userId") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  if (note.length < 2) redirect(`/members/${otherId}?error=${encodeURIComponent("Write a short introduction.")}`);
  const other = await prisma.user.findUnique({ where: { id: otherId } });
  if (!other || other.status !== "ACTIVE" || other.id === user.id) redirect("/network");
  const recent = await countRecentKind(user.id, "INTRO");
  if (!withinRateLimit(recent, RATE_LIMITS.introductionsPerDay)) {
    redirect(`/members/${otherId}?error=${encodeURIComponent("You have sent too many introductions today.")}`);
  }
  const sent = await deliverPortalMessage({
    from: user,
    toId: otherId,
    kind: "INTRO",
    body: `${user.name} (${user.org}) sent an introduction. ${note}`,
  });
  if (!sent.ok) redirect(`/members/${otherId}?error=${encodeURIComponent(sent.reason)}`);
  revalidatePath("/messages");
  redirect(`/messages/${sent.conversationId}`);
}

export async function openConversation(formData: FormData) {
  const user = await requireUser();
  const otherId = String(formData.get("userId") || "");
  if (otherId === user.id) redirect("/messages");
  const other = await prisma.user.findUnique({ where: { id: otherId } });
  if (!other) redirect("/messages");
  if (await isBlocked(user.id, otherId)) {
    redirect(`/members/${otherId}?error=${encodeURIComponent("Messaging is closed between these members.")}`);
  }
  const [userAId, userBId] = orderedPair(user.id, otherId);
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId") || "");
  const body = String(formData.get("body") || "").trim();
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.userAId !== user.id && conversation.userBId !== user.id)) {
    redirect("/messages");
  }
  const recipientId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId;
  const sent = await deliverPortalMessage({ from: user, toId: recipientId, body, kind: "TEXT" });
  if (!sent.ok) {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent(sent.reason)}`);
  }
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

export async function reportMember(formData: FormData) {
  const user = await requireUser();
  const targetUserId = String(formData.get("userId") || "");
  const conversationId = String(formData.get("conversationId") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);
  const back = conversationId ? `/messages/${conversationId}` : `/members/${targetUserId}`;
  if (reason.length < 3 || !targetUserId || targetUserId === user.id) {
    redirect(`${back}?error=${encodeURIComponent("Add a short reason for the report.")}`);
  }
  const recent = await prisma.report.count({
    where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
  if (!withinRateLimit(recent, RATE_LIMITS.reportsPerDay)) {
    redirect(`${back}?error=${encodeURIComponent("You have filed too many reports today.")}`);
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } });
  if (!target) redirect("/messages");
  await prisma.report.create({
    data: { reporterId: user.id, targetUserId, conversationId, reason },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: user.id,
      action: "REPORT",
      conversationId,
      summary: `${user.name} reported ${target.name}.`,
    },
  });
  await notifyAdmins({
    title: "Member report",
    body: "A member filed a report. Open message review.",
    href: "/admin/messages",
  });
  revalidatePath("/admin/messages");
  redirect(`${back}?notice=Report+sent+to+a+Private+Floor+administrator`);
}

export async function blockMember(formData: FormData) {
  const user = await requireUser();
  const blockedId = String(formData.get("userId") || "");
  const conversationId = String(formData.get("conversationId") || "");
  if (!blockedId || blockedId === user.id) redirect("/messages");
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
    update: {},
    create: { blockerId: user.id, blockedId },
  });
  revalidatePath("/messages");
  revalidatePath(`/members/${blockedId}`);
  redirect(conversationId ? `/messages/${conversationId}` : `/members/${blockedId}?notice=Member+blocked`);
}

export async function unblockMember(formData: FormData) {
  const user = await requireUser();
  const blockedId = String(formData.get("userId") || "");
  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId } });
  revalidatePath("/messages");
  revalidatePath(`/members/${blockedId}`);
  redirect(`/members/${blockedId}?notice=Member+unblocked`);
}
