"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { isRoleId } from "@/lib/roles";
import { isInviteUsable, normalizeInviteCode, validateApplication, type ApplicationInput } from "@/lib/domain";
import { CARD_MISSING_NOTE, CARD_UPLOADED_NOTE, safeCardFileName, validateBusinessCard } from "@/lib/business-card";
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

function textField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitApplication(
  formData: FormData,
): Promise<{ ok: true; statusToken: string } | { ok: false; error: string }> {
  const input: ApplicationInput = {
    code: textField(formData, "code"),
    role: textField(formData, "role"),
    name: textField(formData, "name"),
    email: textField(formData, "email"),
    password: textField(formData, "password"),
    org: textField(formData, "org"),
    location: textField(formData, "location"),
    referenceEmails: [textField(formData, "referenceEmail"), textField(formData, "referenceEmail2")],
    phone: textField(formData, "phone"),
    linkedinUrl: textField(formData, "linkedinUrl"),
    statement: textField(formData, "statement"),
  };
  const errors = validateApplication(input);
  if (errors.length) return { ok: false, error: errors[0] };
  if (!isRoleId(input.role)) return { ok: false, error: "Pick the role that best describes you." };
  const role = input.role;

  const upload = formData.get("businessCard");
  let card: { fileName: string; contentType: string; bytes: Uint8Array } | null = null;
  if (upload instanceof File && upload.size > 0) {
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const checked = validateBusinessCard({ contentType: upload.type, bytes });
    if (!checked.ok) return checked;
    card = { fileName: safeCardFileName(upload.name), contentType: checked.contentType, bytes };
  }

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

  const references = (input.referenceEmails ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const statusToken = randomBytes(24).toString("hex");

  await prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        inviteCodeId: invite.id,
        email,
        statusToken,
        name: input.name.trim(),
        passwordHash,
        role,
        org: input.org.trim(),
        location: input.location.trim(),
        credentialValue: card ? CARD_UPLOADED_NOTE : CARD_MISSING_NOTE,
        referenceEmails: references,
        phone: (input.phone ?? "").trim().slice(0, 40),
        linkedinUrl: (input.linkedinUrl ?? "").trim().slice(0, 300),
        statement: (input.statement ?? "").trim(),
      },
    });
    if (card) {
      await tx.businessCard.create({
        data: {
          applicationId: application.id,
          fileName: card.fileName,
          contentType: card.contentType,
          sizeBytes: card.bytes.byteLength,
          bytes: Buffer.from(card.bytes),
        },
      });
    }
    await tx.inviteCode.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });
  });

  await sendEmail({
    to: email,
    subject: `${BRAND.name} application received`,
    text: `Hello ${input.name.trim()},\n\nWe received your ${BRAND.name} application. A committee member will review it. You can sign in after the application is approved.\n\nFollow the decision here: ${await appBaseUrl()}/apply/status/${statusToken}\n`,
  });

  return { ok: true, statusToken };
}
