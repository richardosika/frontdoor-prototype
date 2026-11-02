"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { orderedPair } from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import { isLocale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import { RATE_LIMITS, withinRateLimit } from "@/lib/messaging";
import { notify } from "@/lib/notify";
import { eligibleForDirectory } from "@/lib/payments";
import { isBlocked } from "@/lib/portal-message";
import { prisma } from "@/lib/prisma";
import { canMessagePair } from "@/lib/project-contact-db";
import { appBaseUrl } from "@/lib/url";

const DAY = 24 * 60 * 60 * 1000;
const back = (key: "error" | "notice", text: string): never => redirect(`/network?${key}=${encodeURIComponent(text)}#introduce`);

/**
 * A member introduces two people they already know on Private Floor. Both get a message thread with each other and a
 * notification. The introducer must be able to message both; blocked pairs are never introduced.
 */
export async function introduceTwoMembers(formData: FormData) {
  const user = await requireUser();
  const aId = String(formData.get("memberA") || "");
  const bId = String(formData.get("memberB") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 800);
  if (!aId || !bId || aId === bId || aId === user.id || bId === user.id) back("error", "Choose two different members.");
  if (note.length < 2) back("error", "Write a short note with the introduction.");
  const people = await prisma.user.findMany({
    where: { id: { in: [aId, bId] } },
    select: { id: true, name: true, email: true, status: true, paymentStatus: true, locale: true, notifyIntros: true },
  });
  if (people.length !== 2 || people.some((p) => !eligibleForDirectory(p))) back("error", "That member is not available.");
  if (!(await canMessagePair(user.id, aId)) || !(await canMessagePair(user.id, bId))) back("error", "You can introduce only members you are connected with.");
  if (await isBlocked(aId, bId)) back("error", "Messaging is closed between these members.");
  const recent = await prisma.memberIntroduction.count({ where: { introducerId: user.id, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (!withinRateLimit(recent, RATE_LIMITS.introductionsPerDay)) back("error", "You have sent too many introductions today.");
  const [first, second] = orderedPair(aId, bId);
  const existing = await prisma.memberIntroduction.findUnique({ where: { introducerId_memberAId_memberBId: { introducerId: user.id, memberAId: first, memberBId: second } } });
  if (existing) back("notice", "You already introduced these members.");

  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId: first, userBId: second } },
    update: { updatedAt: new Date() },
    create: { userAId: first, userBId: second },
  });
  const [a, b] = [people.find((p) => p.id === first)!, people.find((p) => p.id === second)!];
  await prisma.message.create({
    data: { conversationId: conversation.id, senderId: user.id, kind: "INTRO", body: `${user.name}: ${a.name} · ${b.name}\n\n${note}` },
  });
  await prisma.memberIntroduction.create({ data: { introducerId: user.id, memberAId: first, memberBId: second, note, conversationId: conversation.id } });
  const base = await appBaseUrl();
  for (const [me, other] of [[a, b], [b, a]] as const) {
    const locale = isLocale(me.locale) ? me.locale : "en";
    await notify(me.id, {
      title: phrase(locale, "You were introduced"),
      body: `${user.name} → ${other.name}`,
      href: `/messages/${conversation.id}`,
    });
    if (me.notifyIntros) {
      await sendEmail({
        to: me.email,
        subject: phrase(locale, "You have a new message on Private Floor"),
        text: `${user.name} → ${other.name}\n\n${phrase(locale, "Open messages")}\n${base}/messages/${conversation.id}\n`,
      }).catch(() => null);
    }
  }
  revalidatePath("/network");
  revalidatePath("/messages");
  back("notice", "Introduction sent. Both members have a new message thread.");
}
