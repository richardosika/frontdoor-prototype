"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole, VerificationTier } from "@prisma/client";
import { requireAdmin } from "@/lib/current-user";
import { CARD_MISSING_NOTE, CARD_UPLOADED_NOTE } from "@/lib/business-card";
import { initialsFromName, isMembershipTier, tierAfterAdminApprovesVouch } from "@/lib/domain";
import { tierLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { canPromoteTierFromVouch } from "@/lib/verification";
import { noteApplicationReferences, reviewVouchOnChecklist } from "@/lib/verification-db";
import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { BRAND } from "@/lib/brand";
import { sendNotice } from "@/lib/notices";
import { appBaseUrl } from "@/lib/url";

export async function reviewApplication(formData: FormData) {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const decision = String(formData.get("decision") || "");
  let note = String(formData.get("note") || "").trim().slice(0, 500);
  const normalized = decision === "REJECTED" ? "DECLINED" : decision;
  if (normalized !== "APPROVED" && normalized !== "DECLINED" && normalized !== "NEEDS_INFO") {
    redirect("/admin/applications");
  }

  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application || !(OPEN_APPLICATION_STATUSES as readonly string[]).includes(application.status)) {
    redirect(`/admin/applications/${applicationId}?error=That+application+is+not+open`);
  }

  if (normalized === "NEEDS_INFO" && note.length < 2) {
    redirect(`/admin/applications/${application.id}?error=Write+what+you+need+from+the+applicant`);
  }
  if (normalized === "APPROVED") {
    const existing = await prisma.user.findUnique({ where: { email: application.email } });
    if (existing) {
      redirect(`/admin/applications/${application.id}?error=That+email+is+already+a+member`);
    }
    const latest = await prisma.verificationRun.findFirst({
      where: { applicationId: application.id, subject: "APPLICATION", status: "DONE" },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.verdict === "NOT_LEGIT" && String(formData.get("confirmNotLegit") || "") !== "yes") {
      redirect(`/admin/applications/${application.id}?error=${encodeURIComponent("Confirm the NOT LEGIT recommendation before approving.")}`);
    }
    if (latest?.verdict === "NOT_LEGIT") {
      note = [note, "Approved despite recommendation NOT LEGIT."].filter(Boolean).join(" ");
      await prisma.moderationEvent.create({
        data: {
          actorId: admin.id,
          action: "APPROVE_NOT_LEGIT",
          summary: `${admin.name} approved ${application.name} (${application.email}) despite recommendation NOT LEGIT.`,
        },
      });
    }
  }

  const base = await appBaseUrl();
  await prisma.applicationDecision.create({
    data: {
      applicationId: application.id,
      actorId: admin.id,
      decision: normalized,
      reason: note,
    },
  });

  if (normalized === "DECLINED") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "DECLINED", reviewerNote: note, reviewedAt: new Date(), reviewerId: admin.id },
    });
    await sendNotice({
      intendedTo: application.email,
      applicationId: application.id,
      subject: `${BRAND.name} application update`,
      text: `Hello ${application.name},\n\nThis application was not approved. Reasons are not included.\n\nYou can read the decision here: ${base}/apply/status/${application.statusToken}\n`,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    redirect(`/admin/applications/${application.id}?notice=Declined`);
  }

  if (normalized === "NEEDS_INFO") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "NEEDS_INFO", reviewerNote: note, reviewedAt: new Date(), reviewerId: admin.id },
    });
    await sendNotice({
      intendedTo: application.email,
      applicationId: application.id,
      subject: `${BRAND.name} needs a bit more`,
      text: `Hello ${application.name},\n\nRichard Osika needs more information before deciding.\n\n${note}\n\nReply on this page: ${base}/apply/status/${application.statusToken}\n`,
    });
    revalidatePath("/admin/applications");
    redirect(`/admin/applications/${application.id}?notice=Asked+for+more+info`);
  }

  const card = await prisma.businessCard.findUnique({
    where: { applicationId: application.id },
    select: { id: true, deletedAt: true },
  });
  const user = await prisma.user.create({
    data: {
      email: application.email,
      passwordHash: application.passwordHash,
      name: application.name,
      initials: initialsFromName(application.name),
      role: application.role as MemberRole,
      org: application.org,
      location: application.location,
      credentialNote: card && !card.deletedAt ? CARD_UPLOADED_NOTE : CARD_MISSING_NOTE,
      bio: "",
      phone: application.phone,
      linkedinUrl: application.linkedinUrl,
      tier: "INVITED",
      status: "ACTIVE",
      isTest: application.isTest,
    },
  });
  if (card) {
    await prisma.businessCard.update({
      where: { id: card.id },
      data: { userId: user.id },
    });
  }

  await noteApplicationReferences({
    userId: user.id,
    actorId: admin.id,
    referenceEmails: application.referenceEmails,
    speaker: application.statement,
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
  await prisma.legalAcceptance.updateMany({
    where: { applicationId: application.id },
    data: { userId: user.id },
  });

  await sendNotice({
    intendedTo: application.email,
    applicationId: application.id,
    subject: `You're in — ${BRAND.name} application approved`,
    text: `Hello ${application.name},\n\nRichard Osika approved your application. You are an Invited member.${note ? ` Note: ${note}` : ""} Sign in at ${base}/login with this email and the password you chose.\n\nThe decision is also here: ${base}/apply/status/${application.statusToken}\n`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/network");
  redirect(`/admin/applications/${application.id}?notice=${encodeURIComponent(`Approved ${application.name}`)}`);
}

export async function setMemberTier(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const tier = String(formData.get("tier") || "");
  if (!isMembershipTier(tier)) redirect("/admin/members?error=Unknown+tier");
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
      title: "Membership tier updated",
      body: `Your membership tier is now ${tierLabel(tier)}. The Verified badge is a separate verification file.`,
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
      body: `A Private Floor administrator did not accept the vouch on ${confirmation.project.name}. Your tier is unchanged.`,
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

function mintInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = (size: number) =>
    Array.from(randomBytes(size), (byte) => alphabet[byte % alphabet.length]).join("");
  return `PF-${chunk(4)}-${chunk(4)}`;
}

export async function issueInviteForRequest(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") || "");
  const request = await prisma.inviteRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") redirect("/admin?error=That+invite+request+is+not+waiting");

  let code = mintInviteCode();
  let inviteId = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const invite = await prisma.inviteCode.create({
        data: {
          code,
          maxUses: 1,
          note: `For ${request.name}`,
          createdById: admin.id,
        },
      });
      inviteId = invite.id;
      break;
    } catch {
      code = mintInviteCode();
    }
  }
  if (!inviteId) redirect("/admin?error=Could+not+issue+a+code.+Try+again.");

  await prisma.inviteRequest.update({
    where: { id: request.id },
    data: { status: "ISSUED", inviteCodeId: inviteId },
  });
  revalidatePath("/admin");
  redirect(
    `/admin?issued=${encodeURIComponent(code)}&issuedFor=${encodeURIComponent(request.email)}&notice=${encodeURIComponent("Invite code issued. Copy it below. Private Floor does not email codes.")}`,
  );
}

export async function moderatePost(formData: FormData) {
  const admin = await requireAdmin();
  const postId = String(formData.get("postId") || "");
  const decision = String(formData.get("decision") || "");
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: true } });
  if (!post) redirect("/admin/moderation");
  if (decision === "PUBLISH") {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "PUBLISHED", flagReason: "", closedAt: null },
    });
    await notify(post.authorId, {
      title: "Post published",
      body: "A Private Floor administrator published your post.",
      href: "/feed",
    });
  } else if (decision === "REJECT") {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "REJECTED", closedAt: new Date() },
    });
    await notify(post.authorId, {
      title: "Post not published",
      body: "A Private Floor administrator did not publish this post.",
      href: "/feed",
    });
  } else {
    redirect("/admin/moderation");
  }
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "MODERATE_POST",
      summary: `${admin.name} ${decision === "PUBLISH" ? "published" : "rejected"} a post by ${post.author.name}.`,
    },
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/feed");
  revalidatePath("/deals");
  redirect("/admin/moderation?notice=Post+updated");
}

export async function resolveReport(formData: FormData) {
  const admin = await requireAdmin();
  const reportId = String(formData.get("reportId") || "");
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.status !== "OPEN") redirect("/admin/moderation");
  await prisma.report.update({ where: { id: report.id }, data: { status: "RESOLVED" } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "RESOLVE_REPORT",
      summary: `${admin.name} closed a member report.`,
    },
  });
  revalidatePath("/admin/moderation");
  redirect("/admin/moderation?notice=Report+closed");
}

export async function declineInviteRequest(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get("requestId") || "");
  const request = await prisma.inviteRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") redirect("/admin?error=That+invite+request+is+not+waiting");
  await prisma.inviteRequest.update({ where: { id: request.id }, data: { status: "DECLINED" } });
  revalidatePath("/admin");
  redirect("/admin?notice=Invite+request+declined");
}
