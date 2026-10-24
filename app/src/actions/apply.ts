"use server";

import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { isRoleId } from "@/lib/roles";
import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { isInviteUsable, normalizeInviteCode, validateApplication, type ApplicationInput } from "@/lib/domain";
import { CARD_MISSING_NOTE, CARD_UPLOADED_NOTE, safeCardFileName, validateBusinessCard } from "@/lib/business-card";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { annualDuesCents } from "@/lib/dues";
import { acceptanceVersions, hashClientIp } from "@/lib/legal";
import { sendNotice } from "@/lib/notices";
import { queueApplicationVerification } from "@/lib/verify/queue";
import { appBaseUrl } from "@/lib/url";

const CODE_MINUTES = 15;

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

function hashCode(code: string): string {
  const secret = process.env.AUTH_SECRET || "private-floor";
  return createHash("sha256").update(`${code}|${secret}`).digest("hex");
}

async function clientIpHash(): Promise<string> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  return hashClientIp(ip);
}

export async function sendApplicationCode(emailRaw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email before requesting a code." };
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return { ok: false, error: "An account with that email already exists. Sign in instead." };
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.emailChallenge.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= 5) return { ok: false, error: "Too many codes for that email this hour. Try again later." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.emailChallenge.create({
    data: {
      email,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    },
  });
  await sendNotice({
    intendedTo: email,
    subject: `${BRAND.name} application code`,
    text: `Your Private Floor application code is ${code}. It expires in ${CODE_MINUTES} minutes. During this test the code is delivered only to the test recipient, not to the applicant.`,
  });
  return { ok: true };
}

export async function confirmApplicationCode(
  emailRaw: string,
  codeRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code." };
  const challenge = await prisma.emailChallenge.findFirst({
    where: { email, verifiedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge || challenge.codeHash !== hashCode(code)) {
    return { ok: false, error: "That code does not match, or it has expired." };
  }
  await prisma.emailChallenge.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });
  return { ok: true };
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
    website: textField(formData, "website"),
    socialLinks: textField(formData, "socialLinks"),
  };
  const errors = validateApplication(input);
  if (errors.length) return { ok: false, error: errors[0] };
  if (!isRoleId(input.role)) return { ok: false, error: "Pick the role that best describes you." };
  const acceptedTerms = textField(formData, "accept_terms") === "yes";
  const acceptedVerification = textField(formData, "accept_verification") === "yes";
  if (!acceptedTerms || !acceptedVerification) {
    return { ok: false, error: "Check both boxes before you submit. The application needs your agreement and your consent to the verification checks." };
  }
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
  const verified = await prisma.emailChallenge.findFirst({
    where: { email, verifiedAt: { gt: new Date(Date.now() - 30 * 60 * 1000) } },
    orderBy: { verifiedAt: "desc" },
  });
  if (!verified?.verifiedAt) return { ok: false, error: "Verify the email code before you submit." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { ok: false, error: "An account with that email already exists. Sign in instead." };

  const pending = await prisma.application.findFirst({
    where: { email, status: { in: [...OPEN_APPLICATION_STATUSES] } },
  });
  if (pending) return { ok: false, error: "An application for that email is already under review." };

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite || !isInviteUsable(invite)) {
    return { ok: false, error: "That invite code is not active." };
  }

  const references = (input.referenceEmails ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const statusToken = randomBytes(24).toString("hex");
  const ipHash = await clientIpHash();
  const acceptedAt = new Date();
  const website = (input.website ?? "").trim().slice(0, 300);
  const socialLinks = (input.socialLinks ?? "").trim().slice(0, 1000);

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
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
        website,
        socialLinks,
        status: "SUBMITTED",
        emailVerifiedAt: verified.verifiedAt,
        duesCents: annualDuesCents(role),
        duesWaived: annualDuesCents(role) === 0,
      },
    });
    if (card) {
      await tx.businessCard.create({
        data: {
          applicationId: created.id,
          fileName: card.fileName,
          contentType: card.contentType,
          sizeBytes: card.bytes.byteLength,
          bytes: Buffer.from(card.bytes),
        },
      });
    }
    await tx.legalAcceptance.createMany({
      data: acceptanceVersions().map(({ document, version }) => ({
        applicationId: created.id,
        email,
        document,
        version,
        acceptedAt,
        ipHash,
      })),
    });
    await tx.inviteCode.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });
    return created;
  });

  const base = await appBaseUrl();
  await sendNotice({
    intendedTo: email,
    applicationId: application.id,
    subject: `${BRAND.name} application received`,
    text: `Hello ${input.name.trim()},\n\nWe received your ${BRAND.name} application. Richard Osika reviews every application. Nothing was charged. You can sign in after the application is approved.\n\nFollow the decision here: ${base}/apply/status/${statusToken}\n`,
  });
  await queueApplicationVerification(application.id, input.org.trim(), { network: true });

  return { ok: true, statusToken };
}

export async function respondToApplication(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = textField(formData, "token");
  const note = textField(formData, "note").trim().slice(0, 2000);
  if (note.length < 2) return { ok: false, error: "Add a short reply." };
  const application = await prisma.application.findUnique({ where: { statusToken: token } });
  if (!application || application.status !== "NEEDS_INFO") {
    return { ok: false, error: "This application is not waiting for a reply." };
  }
  const upload = formData.get("businessCard");
  let card: { fileName: string; contentType: string; bytes: Uint8Array } | null = null;
  if (upload instanceof File && upload.size > 0) {
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const checked = validateBusinessCard({ contentType: upload.type, bytes });
    if (!checked.ok) return checked;
    card = { fileName: safeCardFileName(upload.name), contentType: checked.contentType, bytes };
  }
  const stamp = new Date().toISOString();
  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "IN_REVIEW",
      statement: `${application.statement}\n\nMember reply (${stamp}):\n${note}`.slice(0, 4000),
    },
  });
  if (card) {
    await prisma.businessCard.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        fileName: card.fileName,
        contentType: card.contentType,
        sizeBytes: card.bytes.byteLength,
        bytes: Buffer.from(card.bytes),
      },
      update: {
        fileName: card.fileName,
        contentType: card.contentType,
        sizeBytes: card.bytes.byteLength,
        bytes: Buffer.from(card.bytes),
        deletedAt: null,
      },
    });
  }
  await sendNotice({
    intendedTo: application.email,
    applicationId: application.id,
    subject: `${BRAND.name} reply received`,
    text: `${application.name} replied on the application status page.\n\n${note}`,
  });
  await queueApplicationVerification(application.id, application.org, { network: true });
  return { ok: true };
}
