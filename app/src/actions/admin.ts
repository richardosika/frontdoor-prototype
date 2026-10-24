"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole, VerificationTier } from "@prisma/client";
import { requireAdmin } from "@/lib/current-user";
import { initialsFromName, isTier, tierAfterAdminApprovesVouch } from "@/lib/domain";
import { tierLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { canPromoteTierFromVouch } from "@/lib/verification";
import { ensureVerificationCase, reviewVouchOnChecklist } from "@/lib/verification-db";
import { BRAND } from "@/lib/brand";
import { appBaseUrl } from "@/lib/url";

export async function reviewApplication(formData: FormData) {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  if (decision !== "APPROVED" && decision !== "REJECTED") redirect("/admin/applications");

  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application || application.status !== "PENDING") redirect("/admin/applications");

  if (decision === "REJECTED") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "REJECTED", reviewerNote: note, reviewedAt: new Date(), reviewerId: admin.id },
    });
    await sendEmail({
      to: application.email,
      subject: `${BRAND.name} application update`,
      text: `Hello ${application.name},\n\nThe committee did not approve this application.${note ? ` Note: ${note}` : ""}\n\nYou can read the decision here: ${await appBaseUrl()}/apply/status/${application.statusToken}\n`,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    redirect("/admin/applications");
  }

  const existing = await prisma.user.findUnique({ where: { email: application.email } });
  if (existing) {
    redirect("/admin/applications?error=That+email+is+already+a+member");
  }

  const user = await prisma.user.create({
    data: {
      email: application.email,
      passwordHash: application.passwordHash,
      name: application.name,
      initials: initialsFromName(application.name),
      role: application.role as MemberRole,
      org: application.org,
      location: application.location,
      credentialNote: application.credentialValue,
      bio: application.statement,
      tier: "INVITED",
      status: "ACTIVE",
    },
  });

  await ensureVerificationCase({ subject: "MEMBER", userId: user.id, actorId: admin.id });

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "APPROVED",
      reviewerNote: note,
      reviewedAt: new Date(),
      reviewerId: admin.id,
      userId: user.id,
    },
  });

  const base = await appBaseUrl();
  await sendEmail({
    to: application.email,
    subject: `You're in — ${BRAND.name} application approved`,
    text: `Hello ${application.name},\n\nYour application was approved. You are an Invited member.${note ? ` Note: ${note}` : ""} Sign in at ${base}/login with this email and the password you chose.\n\nThe decision is also here: ${base}/apply/status/${application.statusToken}\n`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/network");
  redirect("/admin/applications?notice=Approved");
}

export async function setMemberTier(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const tier = String(formData.get("tier") || "");
  if (!isTier(tier)) redirect("/admin/members?error=Unknown+tier");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) redirect("/admin/members?error=Member+not+found");
  if (tier === "CONFIRMED" && member.tier !== "CONFIRMED") {
    const approved = await prisma.confirmation.count({
      where: { reviewStatus: "APPROVED", project: { userId } },
    });
    if (!canPromoteTierFromVouch({ adminReviewed: approved > 0 })) {
      redirect("/admin/members?error=Accept+a+counterparty+vouch+before+promoting+to+Confirmed");
    }
  }
  if (member.tier !== tier) {
    await prisma.user.update({
      where: { id: userId },
      data: { tier: tier as VerificationTier },
    });
    await notify(userId, {
      title: "Verification tier updated",
      body: `Your tier is now ${tierLabel(tier)}.`,
      href: "/profile",
    });
  }
  revalidatePath("/admin/members");
  revalidatePath(`/members/${userId}`);
  revalidatePath("/profile");
  revalidatePath("/alerts");
  redirect("/admin/members?notice=Tier+updated");
}

export async function reviewVouch(formData: FormData) {
  const admin = await requireAdmin();
  const confirmationId = String(formData.get("confirmationId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "APPROVED" && decision !== "REJECTED") redirect("/admin");

  const confirmation = await prisma.confirmation.findUnique({
    where: { id: confirmationId },
    include: { project: { include: { user: true } } },
  });
  if (!confirmation || confirmation.status !== "CONFIRMED" || confirmation.reviewStatus !== "PENDING_ADMIN") {
    redirect("/admin?error=That+vouch+is+not+waiting+for+review");
  }

  const member = confirmation.project.user;
  if (decision === "APPROVED") {
    const nextTier = tierAfterAdminApprovesVouch(member.tier);
    await prisma.$transaction([
      prisma.confirmation.update({
        where: { id: confirmation.id },
        data: { reviewStatus: "APPROVED" },
      }),
      prisma.user.update({
        where: { id: member.id },
        data: { tier: nextTier },
      }),
    ]);
    await notify(member.id, {
      title: "Vouch accepted",
      body: `${admin.name} accepted the vouch on ${confirmation.project.name}. Your tier is now ${tierLabel(nextTier)}.`,
      href: "/profile",
    });
    await reviewVouchOnChecklist({
      memberId: member.id,
      adminId: admin.id,
      adminName: admin.name,
      accepted: true,
      projectName: confirmation.project.name,
      counterpartyName: confirmation.counterpartyName,
    });
  } else {
    await prisma.confirmation.update({
      where: { id: confirmation.id },
      data: { reviewStatus: "REJECTED" },
    });
    await notify(member.id, {
      title: "Vouch not accepted",
      body: `The committee did not accept the vouch on ${confirmation.project.name}. Your tier is unchanged.`,
      href: "/profile",
    });
    await reviewVouchOnChecklist({
      memberId: member.id,
      adminId: admin.id,
      adminName: admin.name,
      accepted: false,
      projectName: confirmation.project.name,
      counterpartyName: confirmation.counterpartyName,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath(`/members/${member.id}`);
  revalidatePath("/alerts");
  redirect("/admin?notice=Vouch+reviewed");
}

export async function createInvite(formData: FormData) {
  const admin = await requireAdmin();
  const raw = String(formData.get("code") || "").trim().toUpperCase().replace(/\s+/g, "");
  const maxUses = Math.max(1, Math.min(100, Number(formData.get("maxUses") || 1)));
  const note = String(formData.get("note") || "").trim().slice(0, 160);
  if (raw.length < 4) redirect("/admin?error=Code+is+too+short");
  try {
    await prisma.inviteCode.create({
      data: { code: raw, maxUses, note, createdById: admin.id },
    });
  } catch {
    redirect("/admin?error=That+code+already+exists");
  }
  revalidatePath("/admin");
  redirect("/admin?notice=Invite+created");
}
