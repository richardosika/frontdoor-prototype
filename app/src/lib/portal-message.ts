import { orderedPair } from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import { canMessage, portalMessageEmail, withinRateLimit, type MessageKind } from "@/lib/messaging";
import { activeMessagingRestriction, restrictionMessage, threadEmailPlan, type EmailModeId } from "@/lib/platform/messaging-policy";
import { loadMessagingSettings } from "@/lib/platform/messaging-settings";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export async function isBlocked(a: string, b: string): Promise<boolean> {
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function deliverPortalMessage(input: {
  from: { id: string; name: string };
  toId: string;
  body: string;
  kind?: MessageKind;
}): Promise<{ ok: true; conversationId: string } | { ok: false; reason: string }> {
  const body = input.body.trim().slice(0, 2000);
  if (!body) return { ok: false, reason: "Write a message under 2000 characters." };
  const blockedEitherWay = await isBlocked(input.from.id, input.toId);
  const decision = canMessage({ fromId: input.from.id, toId: input.toId, blockedEitherWay });
  if (!decision.ok) return decision;

  const settings = await loadMessagingSettings();
  const since = new Date(Date.now() - HOUR);
  const recent = await prisma.message.count({ where: { senderId: input.from.id, createdAt: { gte: since } } });
  if (!withinRateLimit(recent, settings.messageHourly)) {
    return { ok: false, reason: "You have sent too many messages this hour. Try again later." };
  }
  const [senderLimits, recipientLimits] = await Promise.all([
    prisma.userRestriction.findMany({ where: { userId: input.from.id }, select: { kind: true, startsAt: true, endsAt: true } }),
    prisma.userRestriction.findMany({ where: { userId: input.toId }, select: { kind: true, startsAt: true, endsAt: true } }),
  ]);
  const now = new Date();
  const stopped = restrictionMessage(activeMessagingRestriction(senderLimits, now) || activeMessagingRestriction(recipientLimits, now));
  if (stopped) return { ok: false, reason: stopped };

  const recipient = await prisma.user.findUnique({
    where: { id: input.toId },
    select: { id: true, email: true, status: true, notifyMessages: true, notifyIntros: true, notifyDeals: true, notificationPref: true },
  });
  if (!recipient || recipient.status !== "ACTIVE") return { ok: false, reason: "That member is not available." };

  const [userAId, userBId] = orderedPair(input.from.id, input.toId);
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: { updatedAt: new Date() },
    create: { userAId, userBId },
  });
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: input.from.id,
      body,
      kind: input.kind ?? "TEXT",
    },
  });
  await notify(recipient.id, {
    title: "New message",
    body: "You have a new message on Private Floor.",
    href: `/messages/${conversation.id}`,
  });
  const kind = input.kind ?? "TEXT";
  const emailOn =
    kind === "INTRO" || kind === "CONNECTION"
      ? recipient.notifyIntros
      : kind === "ACCESS" || kind === "DEAL" || kind === "VOUCH"
        ? recipient.notifyDeals
        : recipient.notifyMessages;
  const pref = recipient.notificationPref;
  const mode: EmailModeId = !emailOn ? "OFF" : pref?.messages ?? "THROTTLED";
  const throttleKey = `conv:${conversation.id}`;
  const throttle = await prisma.emailThrottle.findUnique({ where: { userId_key: { userId: recipient.id, key: throttleKey } } });
  const plan = threadEmailPlan({
    isRequest: false,
    mode,
    lastSentAt: throttle?.lastSentAt ?? null,
    now,
    windowMinutes: settings.threadWindowMinutes,
    inboxUrl: `${await appBaseUrl()}/messages`,
  });
  if (plan.deliver === "send") {
    await sendEmail({ to: recipient.email, subject: plan.subject, text: plan.text });
    await prisma.emailThrottle.upsert({
      where: { userId_key: { userId: recipient.id, key: throttleKey } },
      create: { userId: recipient.id, key: throttleKey, lastSentAt: now, suppressedCount: 0 },
      update: { lastSentAt: now, suppressedCount: 0 },
    });
  } else if (plan.deliver === "hold" || plan.deliver === "digest") {
    await prisma.outboxNotice.create({
      data: {
        intendedTo: recipient.email,
        deliveredTo: recipient.email,
        subject: plan.subject,
        body: `Intended recipient: ${recipient.email}\n\n${plan.text}`,
        templateKey: plan.deliver === "digest" ? "message_digest_hold" : "message_held",
        suppressed: true,
        suppressedReason: plan.reason,
      },
    });
    await prisma.emailThrottle.upsert({
      where: { userId_key: { userId: recipient.id, key: throttleKey } },
      create: { userId: recipient.id, key: throttleKey, lastSentAt: throttle?.lastSentAt ?? now, suppressedCount: 1 },
      update: { suppressedCount: { increment: 1 } },
    });
  }
  return { ok: true, conversationId: conversation.id };
}

export async function countRecentKind(senderId: string, kind: MessageKind): Promise<number> {
  return prisma.message.count({
    where: { senderId, kind, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
}

export async function sendPortalNotice(userId: string) {
  const recipient = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, status: true } });
  if (!recipient || recipient.status !== "ACTIVE") return;
  const mail = portalMessageEmail(`${await appBaseUrl()}/messages`);
  await sendEmail({ to: recipient.email, subject: mail.subject, text: mail.text });
}
