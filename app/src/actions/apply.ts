"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { isRoleId } from "@/lib/roles";
import { isInviteUsable, normalizeInviteCode, validateApplication, type ApplicationInput } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/url";

export async function checkInvite(code: string): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  const normalized = normalizeInviteCode(code);
  if (normalized.length < 4) return { ok: false, error: "Enter the invite code a member shared with you." };
  const invite = await prisma.inviteCode.findUnique({ where: { code: normalized } });
  if (!invite || !isInviteUsable(invite)) {
    return { ok: false, error: "That invite code is not active. Ask a member for a current code." };
  }
  return { ok: true, note: invite.note || "Invite accepted." };
}

export async function submitApplication(
  input: ApplicationInput,
): Promise<{ ok: true; statusToken: string } | { ok: false; error: string }> {
  const errors = validateApplication(input);
  if (errors.length) return { ok: false, error: errors[0] };
  if (!isRoleId(input.role)) return { ok: false, error: "Pick the role that best describes you." };

  const code = normalizeInviteCode(input.code);
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { ok: false, error: "An account with that email already exists. Sign in instead." };

  const pending = await prisma.application.findFirst({
    where: { email, status: "PENDING" },
  });
  if (pending) return { ok: false, error: "An application for that email is already under review." };

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite || !isInviteUsable(invite)) {
    return { ok: false, error: "That invite code is not active." };
  }

  const references = input.referenceEmails.map((item) => item.trim().toLowerCase()).filter(Boolean);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const statusToken = randomBytes(24).toString("hex");

  await prisma.$transaction([
    prisma.application.create({
      data: {
        inviteCodeId: invite.id,
        email,
        statusToken,
        name: input.name.trim(),
        passwordHash,
        role: input.role,
        org: input.org.trim(),
        location: input.location.trim(),
        credentialValue: input.credentialValue.trim(),
        referenceEmails: references,
        statement: (input.statement ?? "").trim(),
      },
    }),
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    }),
  ]);

  await sendEmail({
    to: email,
    subject: `${BRAND.name} application received`,
    text: `Hello ${input.name.trim()},\n\nWe received your ${BRAND.name} application. A committee member will review your role, credential, and references. You can sign in after the application is approved.\n\nFollow the decision here: ${await appBaseUrl()}/apply/status/${statusToken}\n`,
  });

  return { ok: true, statusToken };
}
