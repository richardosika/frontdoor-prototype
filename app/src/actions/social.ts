"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canConnect, orderedPair } from "@/lib/domain";
import { canMessageAfterIntro } from "@/lib/member-network";
import { RATE_LIMITS, withinRateLimit } from "@/lib/messaging";
import { deliverPortalMessage, isBlocked } from "@/lib/portal-message";
import { notify, notifyAdmins } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

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
  const back = String(formData.get("back") || `/members/${otherId}`);
  if (note.length < 2) redirect(`${back}?error=${encodeURIComponent("Write a short note with the introduction.")}`);
  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, status: true, email: true, notifyIntros: true, name: true },
  });
  if (!other || other.status !== "ACTIVE" || other.id === user.id) redirect("/network");
  if (await isBlocked(user.id, otherId)) {
    redirect(`${back}?error=${encodeURIComponent("Messaging is closed between these members.")}`);
  }
  const recent = await prisma.introduction.count({
    where: { fromId: user.id, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
  if (!withinRateLimit(recent, RATE_LIMITS.introductionsPerDay)) {
    redirect(`${back}?error=${encodeURIComponent("You have sent too many introductions today.")}`);
  }
  const existing = await prisma.introduction.findFirst({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [
        { fromId: user.id, toId: otherId },
        { fromId: otherId, toId: user.id },
      ],
    },
  });
  if (existing?.status === "ACCEPTED") redirect(`/members/${otherId}?notice=You+already+have+an+introduction`);
  if (existing?.status === "PENDING") redirect(`${back}?notice=That+introduction+is+already+waiting`);
  await prisma.introduction.create({ data: { fromId: user.id, toId: otherId, note, isTest: user.isTest } });
  await notify(other.id, {
    title: "Introduction request",
    body: `${user.name} asked for an introduction. Accept or decline in Network.`,
    href: "/network",
  });
  if (other.notifyIntros) {
    const base = await appBaseUrl();
    await sendEmail({
      to: other.email,
      subject: "You have a new message on Private Floor",
      text: `You have an introduction request on Private Floor.\n${base}/network\n`,
    });
  }
  revalidatePath("/network");
  revalidatePath("/alerts");
  redirect(`${back}?notice=Introduction+requested.+It+stays+inside+Private+Floor+until+they+accept.`);
}

export async function respondIntroduction(formData: FormData) {
  const user = await requireUser();
  const introductionId = String(formData.get("introductionId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "ACCEPTED" && decision !== "DECLINED") redirect("/network");
  const intro = await prisma.introduction.findUnique({ where: { id: introductionId }, include: { from: true } });
  if (!intro || intro.toId !== user.id || intro.status !== "PENDING") redirect("/network");
  await prisma.introduction.update({
    where: { id: intro.id },
    data: { status: decision, decidedAt: new Date() },
  });
  if (decision === "DECLINED") {
    await notify(intro.fromId, {
      title: "Introduction declined",
      body: `${user.name} declined the introduction.`,
      href: "/network",
    });
    revalidatePath("/network");
    redirect("/network?notice=Introduction+declined");
  }
  const sent = await deliverPortalMessage({
    from: intro.from,
    toId: user.id,
    kind: "INTRO",
    body: `${intro.from.name} requested an introduction. ${intro.note}`,
  });
  revalidatePath("/network");
  revalidatePath("/messages");
  if (!sent.ok) redirect(`/network?error=${encodeURIComponent(sent.reason)}`);
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
  const [intro, connection, existing] = await Promise.all([
    prisma.introduction.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { fromId: user.id, toId: otherId },
          { fromId: otherId, toId: user.id },
        ],
      },
      select: { status: true },
    }),
    prisma.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { fromId: user.id, toId: otherId },
          { fromId: otherId, toId: user.id },
        ],
      },
      select: { status: true },
    }),
    prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: user.id, userBId: otherId },
          { userAId: otherId, userBId: user.id },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (!existing && !canMessageAfterIntro({ intro: intro?.status ?? null, connection: connection?.status ?? null })) {
    redirect(`/members/${otherId}?error=${encodeURIComponent("Request an introduction first. Messaging opens after they accept.")}`);
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
    href: "/admin/moderation",
  });
  revalidatePath("/admin/moderation");
  redirect(`${back}?notice=Report+sent+to+a+Private+Floor+administrator`);
}

export async function reportPost(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);
  const back = String(formData.get("back") || "/feed");
  if (reason.length < 3 || !postId) redirect(`${back}?error=${encodeURIComponent("Add a short reason for the report.")}`);
  const recent = await prisma.report.count({
    where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
  if (!withinRateLimit(recent, RATE_LIMITS.reportsPerDay)) {
    redirect(`${back}?error=${encodeURIComponent("You have filed too many reports today.")}`);
  }
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: { select: { id: true, name: true } } } });
  if (!post || post.authorId === user.id) redirect(back);
  await prisma.report.create({
    data: { reporterId: user.id, targetUserId: post.authorId, postId, reason },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: user.id,
      action: "REPORT_POST",
      summary: `${user.name} reported a post by ${post.author.name}.`,
    },
  });
  await notifyAdmins({
    title: "Post report",
    body: "A member reported a post.",
    href: "/admin/moderation",
  });
  revalidatePath("/admin/moderation");
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
