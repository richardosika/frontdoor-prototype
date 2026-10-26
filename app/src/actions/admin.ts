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
import { applyDecisionStatus, noteApplicationReferences, reviewVouchOnChecklist } from "@/lib/verification-db";
import { issueInviteCodeForRequest } from "@/lib/invite-issue";
import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { annualDuesCents, mailDuesAmounts } from "@/lib/dues";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { noticeTestRecipient } from "@/lib/brand";
import { sendNotice } from "@/lib/notices";
import { notifyAdmins } from "@/lib/notify";
import { decisionNoticeText, parseGradeSnapshot, type GradeReport } from "@/lib/verify/grade";
import { paymentRenewalLabel, paymentRequired } from "@/lib/payments";
import { roleLabel } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";

export async function reviewApplication(formData: FormData) {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const caseId = String(formData.get("caseId") || "");
  const postedReturn = String(formData.get("returnTo") || "");
  const reviewPath = postedReturn.startsWith("/admin/verification/") && !postedReturn.includes("..") && !postedReturn.includes("://")
    ? postedReturn.split("?")[0]
    : "";
  const fail = (message: string) => {
    if (reviewPath) redirect(`${reviewPath}?step=decision&error=${encodeURIComponent(message)}`);
    redirect(`/admin/applications/${applicationId}?error=${encodeURIComponent(message)}`);
  };
  const succeed = async (notice: string, chosen: "APPROVED" | "DECLINED" | "NEEDS_INFO") => {
    const linked = caseId
      ? await prisma.verificationCase.findUnique({ where: { id: caseId }, select: { id: true } })
      : applicationId
        ? await prisma.verificationCase.findUnique({ where: { applicationId }, select: { id: true } })
        : null;
    if (linked) {
      await applyDecisionStatus({
        caseId: linked.id,
        decision: chosen,
        actorId: admin.id,
        actorName: admin.name,
      });
      revalidatePath(`/admin/verification/${linked.id}`);
      revalidatePath("/admin/verification");
    }
    if (reviewPath) redirect(`${reviewPath}?step=decision&notice=${encodeURIComponent(notice)}`);
    redirect(`/admin/applications/${applicationId}?notice=${encodeURIComponent(notice)}`);
  };
  const decision = String(formData.get("decision") || "");
  let note = String(formData.get("note") || "").trim().slice(0, 500);
  const normalized = decision === "REJECTED" ? "DECLINED" : decision;
  if (normalized !== "APPROVED" && normalized !== "DECLINED" && normalized !== "NEEDS_INFO") {
    redirect("/admin/applications");
  }

  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application || !(OPEN_APPLICATION_STATUSES as readonly string[]).includes(application.status)) {
    fail("That application is not open");
    return;
  }

  if (normalized === "NEEDS_INFO" && note.length < 2) {
    fail("Write what you need from the applicant");
  }
  if (normalized === "APPROVED") {
    const existing = await prisma.user.findUnique({ where: { email: application.email } });
    if (existing) {
      fail("That email is already a member");
    }
    const latest = await prisma.verificationRun.findFirst({
      where: { applicationId: application.id, subject: "APPLICATION", status: "DONE" },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.verdict === "NOT_LEGIT" && String(formData.get("confirmNotLegit") || "") !== "yes") {
      fail("Confirm the NOT LEGIT recommendation before approving.");
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
  const latestGradeRun = await prisma.verificationRun.findFirst({
    where: { applicationId: application.id, subject: "APPLICATION", status: "DONE" },
    orderBy: { finishedAt: "desc" },
  });
  const grade = parseGradeSnapshot(latestGradeRun?.gradeSnapshot);
  await prisma.applicationDecision.create({
    data: {
      applicationId: application.id,
      actorId: admin.id,
      decision: normalized,
      reason: note,
      gradeLetter: grade?.letter || latestGradeRun?.gradeLetter || "",
      gradeScore: grade?.score ?? latestGradeRun?.gradeScore ?? null,
      recommendation: grade?.recommendation || latestGradeRun?.recommendation || "",
    },
  });
  await tellRichard(application, normalized, grade);

  if (normalized === "DECLINED") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "DECLINED", reviewerNote: note, reviewedAt: new Date(), reviewerId: admin.id },
    });
    await sendTemplate({
      key: "declined",
      to: application.email,
      applicationId: application.id,
      vars: buildMailVars({
        name: application.name,
        role: roleLabel(application.role),
        org: application.org,
        statusLink: `${base}/apply/status/${application.statusToken}`,
        note: "",
      }),
      person: { name: application.name, role: application.role, org: application.org, location: application.location },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    revalidatePath("/admin/members");
    revalidatePath("/admin/crm");
    await succeed("Declined", "DECLINED");
    return;
  }

  if (normalized === "NEEDS_INFO") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "NEEDS_INFO", reviewerNote: note, reviewedAt: new Date(), reviewerId: admin.id },
    });
    await sendTemplate({
      key: "needs_info",
      to: application.email,
      applicationId: application.id,
      vars: buildMailVars({
        name: application.name,
        role: roleLabel(application.role),
        org: application.org,
        statusLink: `${base}/apply/status/${application.statusToken}`,
        note,
      }),
      person: { name: application.name, role: application.role, org: application.org, location: application.location },
    });
    revalidatePath("/admin/applications");
    revalidatePath("/admin/members");
    revalidatePath("/admin/crm");
    await succeed("Asked for more info", "NEEDS_INFO");
    return;
  }

  const card = await prisma.businessCard.findUnique({
    where: { applicationId: application.id },
    select: { id: true, deletedAt: true },
  });
  const paying = paymentRequired(application.role);
  const duesCents = annualDuesCents(application.role);
  const paymentToken = paying ? randomBytes(24).toString("hex") : null;
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
      paymentStatus: paying ? "DUE" : "NOT_REQUIRED",
      duesCents,
      paymentToken,
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
    applicationId: application.id,
    actorId: admin.id,
    referenceEmails: application.referenceEmails,
    speaker: application.statement,
  });
  const { prefillFromApplication } = await import("@/lib/guided-prefill-db");
  await prefillFromApplication(application.id).catch((error) => {
    console.error("guided prefill failed", error instanceof Error ? error.message : "error");
  });

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: paying ? "PAYMENT_DUE" : "APPROVED",
      duesCents,
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

  const person = { name: application.name, role: application.role, org: application.org, location: application.location };
  if (paying && paymentToken) {
    const amounts = mailDuesAmounts(application.role, duesCents);
    await sendTemplate({
      key: "payment_due",
      to: application.email,
      applicationId: application.id,
      vars: buildMailVars({
        name: application.name,
        role: roleLabel(application.role),
        org: application.org,
        statusLink: `${base}/apply/status/${application.statusToken}`,
        paymentLink: `${base}/pay/${paymentToken}`,
        loginLink: `${base}/login`,
        duesAmount: amounts.duesAmount,
        introAmount: amounts.introAmount,
        renewalDate: paymentRenewalLabel(null),
        note,
      }),
      person,
    });
  } else {
    await sendTemplate({
      key: "approved",
      to: application.email,
      applicationId: application.id,
      vars: buildMailVars({
        name: application.name,
        role: roleLabel(application.role),
        org: application.org,
        statusLink: `${base}/apply/status/${application.statusToken}`,
        loginLink: `${base}/login`,
        note,
      }),
      person,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/members");
  revalidatePath("/admin/crm");
  revalidatePath("/network");
  await succeed(paying ? `Approved, payment due — ${application.name}` : `Approved ${application.name}`, "APPROVED");
}

async function tellRichard(
  application: { id: string; name: string },
  decision: string,
  grade: GradeReport | null,
) {
  const text = decisionNoticeText({ name: application.name, decision, grade });
  await notifyAdmins({
    title: `${application.name}: ${decision} · grade ${grade?.letter || "ungraded"}`,
    body: text.slice(0, 600),
    href: `/admin/applications/${application.id}`,
  });
  await sendNotice({
    intendedTo: noticeTestRecipient(),
    applicationId: application.id,
    subject: `${application.name}: ${decision} · grade ${grade?.letter || "ungraded"}`,
    text,
    templateKey: "admin_decision",
  });
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
      redirect("/admin/members?error=Accept+a+counterparty+vouch+before+this+change");
    }
  }
  if (member.tier !== tier) {
    await prisma.user.update({
      where: { id: userId },
      data: { tier: tier as VerificationTier },
    });
    await notify(userId, {
      title: "Membership updated",
      body: `Your membership is ${tierLabel(tier)}. The Verified badge is a separate verification file.`,
      href: "/profile",
    });
  }
  revalidatePath("/admin/members");
  revalidatePath(`/members/${userId}`);
  revalidatePath("/profile");
  revalidatePath("/alerts");
  redirect("/admin/members?notice=Membership+updated");
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
      body: `${admin.name} accepted the confirmation on ${confirmation.project.name}. Membership stays Approved. The Verified badge is a separate file.`,
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
      body: `A Private Floor administrator did not accept the confirmation on ${confirmation.project.name}. Membership is unchanged.`,
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

export async function issueInviteForRequest(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") || "");
  const issued = await issueInviteCodeForRequest({ adminId: admin.id, requestId });
  if (!issued.ok) redirect(`/admin?error=${encodeURIComponent(issued.error)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/outbox");
  redirect(
    `/admin?issued=${encodeURIComponent(issued.code)}&issuedFor=${encodeURIComponent(issued.email)}&notice=${encodeURIComponent("Invite code issued. The information email is in the Outbox for the test recipient. Copy the code below.")}`,
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

export async function deleteInviteRequest(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") || "");
  const request = await prisma.inviteRequest.findUnique({ where: { id: requestId } });
  if (!request) redirect("/admin?error=That+invite+request+was+not+found");
  await prisma.crmPerson.updateMany({ where: { inviteRequestId: request.id }, data: { inviteRequestId: null } });
  await prisma.inviteRequest.delete({ where: { id: request.id } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "DELETE_INVITE_REQUEST",
      summary: `${admin.name} deleted the invite request for ${request.name} <${request.email}>.`,
    },
  });
  revalidatePath("/admin");
  redirect("/admin?notice=Invite+request+deleted");
}

export async function deleteInviteCode(formData: FormData) {
  const admin = await requireAdmin();
  const inviteId = String(formData.get("inviteId") || "");
  const invite = await prisma.inviteCode.findUnique({
    where: { id: inviteId },
    include: { applications: { select: { id: true } } },
  });
  if (!invite) redirect("/admin?error=That+invite+code+was+not+found");
  if (invite.applications.length) {
    redirect("/admin?error=This+code+has+applications.+Delete+those+applicants+first.");
  }
  await prisma.inviteRequest.updateMany({ where: { inviteCodeId: invite.id }, data: { inviteCodeId: null } });
  await prisma.inviteCode.delete({ where: { id: invite.id } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "DELETE_INVITE_CODE",
      summary: `${admin.name} deleted invite code ${invite.code}.`,
    },
  });
  revalidatePath("/admin");
  redirect("/admin?notice=Invite+code+deleted");
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
