"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { after } from "next/server";
import { isRoleId, roleLabel } from "@/lib/roles";
import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import {
  applicationLocation,
  applicationName,
  isInviteUsable,
  normalizeInviteCode,
  validateApplication,
  type ApplicationInput,
} from "@/lib/domain";
import {
  APPLICATION_CODE_LENGTH,
  emailProviderConfigured,
  newApplicationCode,
  normalizeApplicationCode,
  showTestCodeRequested,
  testModeCodeMessage,
  verificationCodeForScreen,
} from "@/lib/application-code";
import { CARD_MISSING_NOTE, CARD_UPLOADED_NOTE, safeCardFileName, validateBusinessCard } from "@/lib/business-card";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { annualDuesCents } from "@/lib/dues";
import { acceptanceVersions, hashClientIp } from "@/lib/legal";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { sendNotice } from "@/lib/notices";
import { queueApplicationVerification } from "@/lib/verify/queue";
import { appendMemberReply } from "@/lib/statement";
import { publicStatusPath } from "@/lib/public-status";
import { appBaseUrl } from "@/lib/url";
import { givenNameFrom } from "@/lib/person-fields";

const CODE_MINUTES = 15;

export async function checkInvite(code: string): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return { ok: true, note: "" };
  if (normalized.length < 4) return { ok: false, error: "That referral code is not valid." };
  const invite = await prisma.inviteCode.findUnique({ where: { code: normalized } });
  if (!invite || !isInviteUsable(invite)) {
    return { ok: false, error: "That referral code is not active." };
  }
  return { ok: true, note: invite.note || "Referral code accepted." };
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

export async function sendApplicationCode(
  emailRaw: string,
): Promise<{ ok: true; testCode: string | null; testHint: string | null } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email before requesting a code." };
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return { ok: false, error: "An account with that email already exists. Sign in instead." };
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.emailChallenge.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= 5) return { ok: false, error: "Too many codes for that email this hour. Try again later." };
  const code = newApplicationCode();
  const challenge = await prisma.emailChallenge.create({
    data: {
      email,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    },
  });
  try {
    await sendTemplate({
      key: "application_code",
      to: email,
      vars: buildMailVars({ name: "", code }),
    });
  } catch {
    await prisma.emailChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
    return { ok: false, error: "Could not record the code. Try again." };
  }
  const providerConfigured = emailProviderConfigured();
  const testCode = verificationCodeForScreen({
    providerConfigured,
    showTestCode: showTestCodeRequested(),
    code,
  });
  return { ok: true, testCode, testHint: testCode ? testModeCodeMessage(code, { providerConfigured }) : null };
}

export async function confirmApplicationCode(
  emailRaw: string,
  codeRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const code = normalizeApplicationCode(codeRaw);
  if (code.length !== APPLICATION_CODE_LENGTH) return { ok: false, error: "Enter the 4-digit code." };
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
    firstName: textField(formData, "firstName"),
    lastName: textField(formData, "lastName"),
    email: textField(formData, "email"),
    password: textField(formData, "password"),
    org: textField(formData, "org"),
    street: textField(formData, "street"),
    city: textField(formData, "city"),
    state: textField(formData, "state"),
    zip: textField(formData, "zip"),
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

  const invite = code ? await prisma.inviteCode.findUnique({ where: { code } }) : null;
  if (code && (!invite || !isInviteUsable(invite))) {
    return { ok: false, error: "That referral code is not active." };
  }

  const references = (input.referenceEmails ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  const givenName = givenNameFrom(input.firstName);
  const name = applicationName(input);
  const location = applicationLocation(input);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const statusToken = randomBytes(24).toString("hex");
  const ipHash = await clientIpHash();
  const acceptedAt = new Date();
  const website = (input.website ?? "").trim().slice(0, 300);
  const socialLinks = (input.socialLinks ?? "").trim().slice(0, 1000);

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        inviteCodeId: invite?.id ?? null,
        email,
        statusToken,
        name,
        givenName,
        passwordHash,
        role,
        org: input.org.trim(),
        location,
        credentialValue: card ? CARD_UPLOADED_NOTE : CARD_MISSING_NOTE,
        referenceEmails: references,
        phone: (input.phone ?? "").trim().slice(0, 40),
        linkedinUrl: (input.linkedinUrl ?? "").trim().slice(0, 300),
        statement: (input.statement ?? "").trim(),
        website,
        socialLinks,
        status: "IN_REVIEW",
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
    if (invite) {
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      });
    }
    return created;
  });

  const base = await appBaseUrl();
  await sendTemplate({
    key: "application_thanks",
    to: email,
    applicationId: application.id,
      vars: buildMailVars({
        name,
        givenName,
        role: roleLabel(role),
        org: input.org.trim(),
        statusLink: `${base}${publicStatusPath(statusToken)}`,
      }),
    person: {
      name,
      role,
      org: input.org.trim(),
      location,
    },
  });
  after(() => {
    void queueApplicationVerification(application.id, input.org.trim(), { network: true }).catch((error) => {
      console.error("verification queue failed", error instanceof Error ? error.message : "error");
    });
  });

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
  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "IN_REVIEW",
      statement: appendMemberReply(application.statement, note),
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
  after(() => {
    void queueApplicationVerification(application.id, application.org, { network: true }).catch((error) => {
      console.error("verification queue failed", error instanceof Error ? error.message : "error");
    });
  });
  return { ok: true };
}
