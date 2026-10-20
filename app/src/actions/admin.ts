"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole, VerificationTier } from "@prisma/client";
import { requireAdmin } from "@/lib/current-user";
import { initialsFromName, isTier } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
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
      text: `Hello ${application.name},\n\nThe committee did not approve this application.${note ? ` Note: ${note}` : ""}\n\nDelivered by the console email adapter.`,
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
    text: `Hello ${application.name},\n\nYour application was approved. You are an Invited member. Sign in at ${base}/login with this email and the password you chose.\n\nDelivered by the console email adapter.`,
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
  await prisma.user.update({
    where: { id: userId },
    data: { tier: tier as VerificationTier },
  });
  revalidatePath("/admin/members");
  revalidatePath(`/members/${userId}`);
  revalidatePath("/profile");
  redirect("/admin/members?notice=Tier+updated");
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
