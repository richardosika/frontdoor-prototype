"use server";

import { categoryForRole, serializeSeeking } from "@/lib/project-contact";
import { readAlertPrefs } from "@/lib/alert-prefs";
import { phrase } from "@/lib/i18n/phrases";
import { isLocale } from "@/lib/i18n/messages";
import { normalizeWebUrl } from "@/lib/web-url";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { safeCardFileName, validateBusinessCard } from "@/lib/business-card";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { tierAfterCounterpartyConfirm } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, vouchDelivery, withinRateLimit } from "@/lib/messaging";
import { deliverPortalMessage, isBlocked, sendPortalNotice } from "@/lib/portal-message";
import { canOpenProjectToCounterparties, toPublicVerification, type VerificationStatus } from "@/lib/verification";
import { attachVouchEvidence, ensureVerificationCase } from "@/lib/verification-db";
import { notify, notifyAdmins } from "@/lib/notify";
import { appBaseUrl } from "@/lib/url";

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const bio = String(formData.get("bio") || "").trim().slice(0, 1200);
  const website = normalizeWebUrl(String(formData.get("website") || "")).slice(0, 200);
  const markets = formData.getAll("markets").map((value) => String(value)).filter(Boolean).join(", ");
  const dealTypes = formData.getAll("dealTypes").map((value) => String(value)).filter(Boolean).join(", ");
  const assetClasses = formData.getAll("assetClasses").map((value) => String(value)).filter(Boolean).join(", ");
  const checkSize = String(formData.get("checkSize") || "").trim().slice(0, 80);
  // #30: "What I am looking for" is gone and developers have no services field; keep whatever is saved.
  const offering = formData.has("offering") ? String(formData.get("offering") || "").trim().slice(0, 800) : undefined;
  const vendor = Object.fromEntries(
    (["yearsInBusiness", "typicalJobSize", "licenses", "insuranceInfo", "specialties", "privateTerms"] as const)
      .filter((key) => formData.has(key))
      .map((key) => [key, String(formData.get(key) || "").trim().slice(0, key === "yearsInBusiness" ? 40 : key === "typicalJobSize" ? 80 : key === "specialties" ? 300 : 400)]),
  );
  const location = String(formData.get("location") || "").trim().slice(0, 120) || user.location;
  // #42: extra categories (the main one comes from the role and is never stored twice).
  const primaryCategory = categoryForRole(user.role);
  const extraCategories = formData.has("profileCategoriesShown")
    ? serializeSeeking(formData.getAll("extraCategories").map(String).filter((id) => id !== primaryCategory))
    : undefined;
  await prisma.user.update({
    where: { id: user.id },
    data: { bio, website, markets, dealTypes, assetClasses, checkSize, ...(offering === undefined ? {} : { offering }), ...vendor, ...(extraCategories === undefined ? {} : { extraCategories }), location },
  });
  const upload = formData.get("card");
  if (upload instanceof File && upload.size > 0) {
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const checked = validateBusinessCard({ contentType: upload.type, bytes });
    if (!checked.ok) redirect(`/profile?error=${encodeURIComponent(checked.error)}`);
    const application = await prisma.application.findFirst({ where: { userId: user.id }, select: { id: true } });
    const data = {
      fileName: safeCardFileName(upload.name),
      contentType: checked.contentType,
      sizeBytes: bytes.byteLength,
      bytes: Buffer.from(bytes),
      deletedAt: null,
      userId: user.id,
      ...(application?.id ? { applicationId: application.id } : {}),
    };
    const existing = await prisma.businessCard.findUnique({ where: { userId: user.id } });
    if (existing) await prisma.businessCard.update({ where: { id: existing.id }, data });
    else await prisma.businessCard.create({ data });
  }
  revalidatePath("/profile");
  revalidatePath("/network");
  redirect("/profile?notice=Profile+saved");
}

export async function saveNotificationPrefs(formData: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      notifyMessages: formData.get("notifyMessages") === "on",
      notifyIntros: formData.get("notifyIntros") === "on",
      notifyDeals: formData.get("notifyDeals") === "on",
      ...readAlertPrefs(formData),
    },
  });
  revalidatePath("/settings");
  redirect("/settings?notice=Notification+settings+saved");
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  if (next.length < 8 || next.length > 72) redirect("/settings?error=Password+must+be+8+to+72+characters");
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) {
    redirect("/settings?error=The+current+password+is+wrong");
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  redirect("/settings?notice=Password+updated");
}

export async function requestAccountDeletion(formData: FormData) {
  const user = await requireUser();
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  await prisma.user.update({ where: { id: user.id }, data: { deletionRequestedAt: new Date() } });
  await prisma.moderationEvent.create({
    data: {
      actorId: user.id,
      action: "DELETION_REQUEST",
      summary: `${user.name} asked a Private Floor administrator to delete their account. ${note}`,
    },
  });
  await notifyAdmins({
    title: "Account deletion requested",
    body: `${user.name} asked to be removed.`,
    href: `/admin/members/${user.id}`,
  });
  const { sendEmail } = await import("@/lib/email");
  await sendEmail({
    to: user.email,
    subject: phrase(isLocale(user.locale) ? user.locale : "en", "Account deletion requested"),
    text: phrase(isLocale(user.locale) ? user.locale : "en", "A Private Floor administrator will review this deletion request. No contact details were sent to other members."),
  });
  revalidatePath("/settings");
  redirect("/settings?notice=Deletion+request+sent+to+a+Private+Floor+administrator");
}

export async function requestConfirmation(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const counterpartyName = String(formData.get("counterpartyName") || "").trim();
  const counterpartyEmail = String(formData.get("counterpartyEmail") || "").trim().toLowerCase();
  if (!counterpartyName || !counterpartyEmail.includes("@")) {
    redirect("/profile?error=Add+the+counterparty+name+and+email");
  }
  const project = await prisma.trackProject.findUnique({
    where: { id: projectId },
    include: { verification: { include: { checks: { select: { result: true } } } } },
  });
  if (!project || project.userId !== user.id) redirect("/profile");
  const open = canOpenProjectToCounterparties(
    toPublicVerification(
      project.verification
        ? { ...project.verification, status: project.verification.status as VerificationStatus }
        : null,
    ),
  );
  if (!open) {
    redirect("/profile?error=This+project+is+not+open+to+counterparties+until+verification+is+complete");
  }
  const recentVouches = await prisma.confirmation.count({
    where: { project: { userId: user.id }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (!withinRateLimit(recentVouches, RATE_LIMITS.vouchesPerDay)) {
    redirect("/profile?error=You+have+sent+too+many+vouch+requests+today");
  }

  const counterparty = await prisma.user.findUnique({ where: { email: counterpartyEmail } });
  const counterpartyIsMember = Boolean(counterparty && counterparty.status === "ACTIVE" && counterparty.id !== user.id);
  if (counterpartyIsMember && counterparty && (await isBlocked(user.id, counterparty.id))) {
    redirect("/profile?error=Messaging+is+closed+between+these+members");
  }
  const delivery = vouchDelivery({ counterpartyIsMember });

  const token = randomBytes(24).toString("hex");
  await prisma.confirmation.create({
    data: { projectId, counterpartyName, counterpartyEmail, token },
  });

  if (delivery.channel === "portal" && counterparty) {
    const link = `${await appBaseUrl()}/confirm/${token}`;
    const sent = await deliverPortalMessage({
      from: user,
      toId: counterparty.id,
      kind: "VOUCH",
      body: `${user.name} asked you to confirm ${project.name} (${project.location}, ${project.year}). Open the request in Private Floor: ${link}`,
    });
    if (!sent.ok) redirect(`/profile?error=${encodeURIComponent(sent.reason)}`);
    revalidatePath("/profile");
    revalidatePath("/messages");
    redirect(`/messages/${sent.conversationId}`);
  }

  revalidatePath("/profile");
  redirect("/profile?notice=The+portal+link+is+on+this+project.+Private+Floor+does+not+email+it.");
}

export async function respondConfirmation(formData: FormData) {
  const token = String(formData.get("token") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  if (decision !== "CONFIRMED" && decision !== "DECLINED") redirect(`/confirm/${token}`);

  const confirmation = await prisma.confirmation.findUnique({
    where: { token },
    include: { project: { include: { user: true } } },
  });
  if (!confirmation) redirect("/");
  if (confirmation.status !== "PENDING") redirect(`/confirm/${token}`);

  const nextTier = tierAfterCounterpartyConfirm(confirmation.project.user.tier);
  await prisma.confirmation.update({
    where: { id: confirmation.id },
    data: {
      status: decision,
      reviewStatus: decision === "CONFIRMED" ? "PENDING_ADMIN" : "OPEN",
      note,
      respondedAt: new Date(),
    },
  });

  if (nextTier !== confirmation.project.user.tier) {
    await prisma.user.update({
      where: { id: confirmation.project.userId },
      data: { tier: nextTier },
    });
  }

  if (decision === "CONFIRMED") {
    await notify(confirmation.project.userId, {
      title: "Vouch received",
      body: `${confirmation.counterpartyName} confirmed ${confirmation.project.name}. Membership stays Approved. A Private Floor administrator still reviews the vouch. Accepting it does not change membership.`,
      href: "/profile",
    });
    await notifyAdmins({
      title: "Vouch to review",
      body: `${confirmation.counterpartyName} confirmed ${confirmation.project.name} for ${confirmation.project.user.name}.`,
      href: "/admin/verification",
    });
    await attachVouchEvidence({
      memberId: confirmation.project.userId,
      projectName: confirmation.project.name,
      counterpartyName: confirmation.counterpartyName,
      note,
      evidenceUrl: `${await appBaseUrl()}/confirm/${token}`,
    });
    await sendPortalNotice(confirmation.project.userId);
  } else {
    await notify(confirmation.project.userId, {
      title: "Vouch declined",
      body: `${confirmation.counterpartyName} declined ${confirmation.project.name}. Your tier is unchanged.`,
      href: "/profile",
    });
  }

  revalidatePath("/profile");
  revalidatePath(`/members/${confirmation.project.userId}`);
  redirect(`/confirm/${token}`);
}
