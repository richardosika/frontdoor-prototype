"use server";
import { MEMBER_RISK_VERSION } from "@/lib/member-risk";
import { normalizeWebUrl } from "@/lib/web-url";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { after } from "next/server";
import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { CARD_MISSING_NOTE, CARD_UPLOADED_NOTE, safeCardFileName, validateBusinessCard } from "@/lib/business-card";
import { isInviteUsable, normalizeInviteCode } from "@/lib/domain";
import { annualDuesCents } from "@/lib/dues";
import { duplicateJoinMessage } from "@/lib/invite-request";
import {
  emptyProfile,
  joinRoleLabel,
  locationLine,
  pageOneErrors,
  pageTwoErrors,
  type JoinProfile,
} from "@/lib/join-form";
import { acceptanceVersions, legalVersion, hashClientIp } from "@/lib/legal";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { publicStatusPath } from "@/lib/public-status";
import { givenNameFrom } from "@/lib/person-fields";
import type { RoleId } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";
import { queueApplicationVerification } from "@/lib/verify/queue";

export async function checkJoinEmail(emailRaw: string): Promise<{ ok: true } | { ok: false; title: string; detail: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: true };
  const [user, application, request] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.application.findFirst({ where: { email, status: { in: [...OPEN_APPLICATION_STATUSES] } }, select: { id: true } }),
    prisma.inviteRequest.findFirst({ where: { email, status: "PENDING" }, select: { id: true } }),
  ]);
  const message = duplicateJoinMessage({
    hasAccount: Boolean(user),
    hasOpenApplication: Boolean(application),
    hasOpenRequest: Boolean(request),
  });
  if (!message) return { ok: true };
  return {
    ok: false,
    title: "A request for this email is already waiting",
    detail: message,
  };
}

export async function submitJoinApplication(
  formData: FormData,
): Promise<{ ok: true; statusToken: string } | { ok: false; error: string }> {
  const raw = String(formData.get("profile") || "");
  let profile: JoinProfile;
  try {
    profile = { ...emptyProfile(), ...JSON.parse(raw) } as JoinProfile;
  } catch {
    return { ok: false, error: "The form could not be read. Start again." };
  }
  const errors = [...pageOneErrors(profile), ...pageTwoErrors(profile)];
  if (errors.length) return { ok: false, error: errors[0] };
  const waiting = await checkJoinEmail(profile.email);
  if (!waiting.ok) return { ok: false, error: waiting.detail };

  const code = normalizeInviteCode(profile.referralCode);
  const invite = code ? await prisma.inviteCode.findUnique({ where: { code } }) : null;
  if (code && (!invite || !isInviteUsable(invite))) return { ok: false, error: "That referral code is not active." };

  const upload = formData.get("businessCard");
  let card: { fileName: string; contentType: string; bytes: Uint8Array } | null = null;
  if (upload instanceof File && upload.size > 0) {
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const checked = validateBusinessCard({ contentType: upload.type, bytes });
    if (!checked.ok) return checked;
    card = { fileName: safeCardFileName(upload.name), contentType: checked.contentType, bytes };
  }

  const email = profile.email.trim().toLowerCase();
  const givenName = givenNameFrom(profile.firstName);
  const name = `${profile.firstName.trim()} ${profile.lastName.trim()}`.replace(/\s+/g, " ");
  const location = locationLine(profile);
  const passwordHash = await bcrypt.hash(profile.password, 10);
  const statusToken = randomBytes(24).toString("hex");
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  const ipHash = hashClientIp(ip);
  const acceptedAt = new Date();
  const linkedin = profile.links.find((link) => link.kind.startsWith("LinkedIn") && link.url.trim())?.url.trim() || "";
  const socialLinks = profile.links
    .filter((link) => link.url.trim())
    .map((link) => `${link.kind}: ${normalizeWebUrl(link.url)}`)
    .join("\n")
    .slice(0, 1000);
  const stored = { ...profile, password: "" };

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        inviteCodeId: invite?.id ?? null,
        email,
        statusToken,
        name,
        givenName,
        passwordHash,
        role: profile.role as RoleId,
        org: profile.company.trim(),
        location,
        credentialValue: card ? CARD_UPLOADED_NOTE : CARD_MISSING_NOTE,
        referenceEmails: [profile.referenceContact].map((item) => item.trim().toLowerCase()).filter((item) => item.includes("@")),
        phone: profile.phone.trim().slice(0, 40),
        linkedinUrl: normalizeWebUrl(linkedin).slice(0, 300),
        statement: profile.standout.trim().slice(0, 4000),
        website: normalizeWebUrl(profile.website).slice(0, 300),
        socialLinks,
        joinProfile: stored,
        memberRiskAcceptedAt: acceptedAt,
        memberRiskTermsVersion: `${legalVersion("terms")}+${MEMBER_RISK_VERSION}`,
        status: "IN_REVIEW",
        duesCents: annualDuesCents(profile.role),
        duesWaived: annualDuesCents(profile.role) === 0,
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
    if (invite) await tx.inviteCode.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } });
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
      role: joinRoleLabel(profile.role),
      org: profile.company.trim(),
      statusLink: `${base}${publicStatusPath(statusToken)}`,
    }),
    person: { name, role: profile.role, org: profile.company.trim(), location },
  });
  after(() => {
    void queueApplicationVerification(application.id, profile.company.trim(), { network: true }).catch(() => undefined);
  });
  return { ok: true, statusToken };
}
