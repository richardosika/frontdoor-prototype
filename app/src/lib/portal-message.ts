import { isLocale } from "@/lib/i18n/messages";
import { orderedPair } from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import { canMessage, portalMessageEmail, RATE_LIMITS, withinRateLimit, type MessageKind } from "@/lib/messaging";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";
import { COLD_MESSAGE_REASON } from "@/lib/project-contact";
import { canMessagePair } from "@/lib/project-contact-db";

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
  // No cold solicitation: a typed message needs a circle, an accepted introduction, or an accepted project contact.
  if ((input.kind ?? "TEXT") === "TEXT" && !(await canMessagePair(input.from.id, input.toId))) {
    return { ok: false, reason: COLD_MESSAGE_REASON };
  }

  const since = new Date(Date.now() - HOUR);
  const recent = await prisma.message.count({ where: { senderId: input.from.id, createdAt: { gte: since } } });
  if (!withinRateLimit(recent, RATE_LIMITS.messagesPerHour)) {
    return { ok: false, reason: "You have sent too many messages this hour. Try again later." };
  }

  const recipient = await prisma.user.findUnique({
    where: { id: input.toId },
    select: { id: true, email: true, status: true, locale: true, notifyMessages: true, notifyIntros: true, notifyDeals: true },
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
  if (emailOn) {
    const mail = portalMessageEmail(`${await appBaseUrl()}/messages`, isLocale(recipient.locale) ? recipient.locale : "en");
    await sendEmail({ to: recipient.email, subject: mail.subject, text: mail.text });
  }
  return { ok: true, conversationId: conversation.id };
}

export async function countRecentKind(senderId: string, kind: MessageKind): Promise<number> {
  return prisma.message.count({
    where: { senderId, kind, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
}

export async function sendPortalNotice(userId: string) {
  const recipient = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, status: true, locale: true } });
  if (!recipient || recipient.status !== "ACTIVE") return;
  const mail = portalMessageEmail(`${await appBaseUrl()}/messages`, isLocale(recipient.locale) ? recipient.locale : "en");
  await sendEmail({ to: recipient.email, subject: mail.subject, text: mail.text });
}
