"use server";

import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/current-user";
import { KEEP_ADMIN_EMAIL } from "@/lib/clean-test-data";
import { isLocale } from "@/lib/i18n/messages";
import { withinRateLimit } from "@/lib/messaging";
import { sendNotice } from "@/lib/notices";
import { validatePersonName } from "@/lib/person-fields";
import { prisma } from "@/lib/prisma";
import { referralEmail, referrerPublicName } from "@/lib/referral-email";
import { appBaseUrl } from "@/lib/url";

const DAY = 24 * 60 * 60 * 1000;
const REFERRALS_PER_DAY = 10;

function mintCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = (size: number) => Array.from(randomBytes(size), (byte) => alphabet[byte % alphabet.length]).join("");
  return `PF-${chunk(4)}-${chunk(4)}`;
}

export type ReferralResult = { ok: true; name: string; email: string; code: string } | { ok: false; error: string };

/**
 * "Refer a colleague": mint a one-use referral code for this member and send the approved referral email
 * (src/lib/referral-email.ts) in the member's language. Mail goes through the test outbox like every notice.
 */
export async function sendReferral(input: { firstName: string; lastName: string; email: string; note: string }): Promise<ReferralResult> {
  const user = await requireUser();
  const firstName = input.firstName.trim().slice(0, 60);
  const lastName = input.lastName.trim().slice(0, 60);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  const nameError = validatePersonName(firstName, lastName)[0];
  if (nameError) return { ok: false, error: nameError };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (email === user.email.toLowerCase()) return { ok: false, error: "Enter your colleague's email, not your own." };
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "That person already has a Private Floor account." };
  const recent = await prisma.inviteCode.count({ where: { createdById: user.id, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (!withinRateLimit(recent, REFERRALS_PER_DAY)) return { ok: false, error: "You have sent too many referrals today. Try again tomorrow." };

  const name = `${firstName} ${lastName}`.trim();
  let code = "";
  for (let attempt = 0; attempt < 3 && !code; attempt += 1) {
    const candidate = mintCode();
    try {
      await prisma.inviteCode.create({ data: { code: candidate, maxUses: 1, note: `Referral from ${user.name} for ${name}`, createdById: user.id } });
      code = candidate;
    } catch {
      // collision; try another code
    }
  }
  if (!code) return { ok: false, error: "Could not create a referral code. Try again." };

  const mail = referralEmail({
    locale: isLocale(user.locale) ? user.locale : "en",
    recipientFirstName: firstName,
    referrerName: referrerPublicName(user.name, user.isAdmin && user.email.toLowerCase() === KEEP_ADMIN_EMAIL.toLowerCase()),
    referrerRole: user.role,
    code,
    base: await appBaseUrl(),
    note: input.note,
  });
  await sendNotice({ intendedTo: email, subject: mail.subject, text: mail.text, templateKey: "member_referral" });
  return { ok: true, name, email, code };
}
