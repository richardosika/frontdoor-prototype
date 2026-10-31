"use server";
import { normalizeWebUrl } from "@/lib/web-url";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole } from "@prisma/client";
import { requireAdmin, requireVerificationAdmin } from "@/lib/current-user";
import { initialsFromName, orderedPair } from "@/lib/domain";
import { applicantRemovalList, cleanupWindowHours } from "@/lib/demo-cleanup";
import { annualDuesCents } from "@/lib/dues";
import { deleteMemberAccount, deleteOutboxTied } from "@/lib/remove-member";
import { prisma } from "@/lib/prisma";
import { acceptanceVersions } from "@/lib/legal";
import { queueApplicationVerification } from "@/lib/verify/queue";
import { refreshWatchlist } from "@/lib/verify/watchlist";

const DEMO_PASSWORD = "cornicio-demo";

const SAMPLES: {
  email: string;
  name: string;
  org: string;
  location: string;
  role: MemberRole;
  phone: string;
  linkedinUrl: string;
  website: string;
  statement: string;
  testProfile: string;
}[] = [
  {
    email: "priya.testlegit@halerow-test.example",
    name: "Priya Testlegit",
    org: "TEST Hale Row Test Partners",
    location: "Newark, NJ",
    role: "DEVELOPER",
    phone: "201-555-0142",
    linkedinUrl: "https://www.linkedin.com/in/priya-testlegit",
    website: "https://halerow-test.example",
    statement: "I sponsor small multifamily projects in northern New Jersey and keep a written track record for each one.",
    testProfile: "strong",
  },
  {
    email: "jordan.ambiguous@gmail.com",
    name: "Jordan Ambiguous",
    org: "TEST Ambiguous Holdings",
    location: "Newark, NJ",
    role: "BROKER",
    phone: "212-555-0199",
    linkedinUrl: "https://www.linkedin.com/in/jordan-ambiguous",
    website: "",
    statement: "I broker a few off-market buildings and the public record is thin. Please look at the phone and the private email.",
    testProfile: "ambiguous",
  },
  {
    email: "test.sanctionhit@example.com",
    name: "Alexei Sanctionhit",
    org: "TEST Sanctionhit Holdings",
    location: "Newark, NJ",
    role: "INVESTOR_PE",
    phone: "201-555-0177",
    linkedinUrl: "",
    website: "",
    statement: "I invest in Newark industrial property and this name is a labelled test of the watchlist overlay.",
    testProfile: "",
  },
  {
    email: "sam.thinfile@gmail.com",
    name: "Sam Thinfile",
    org: "TEST Thinfile",
    location: "Austin, TX",
    role: "DEVELOPER",
    phone: "",
    linkedinUrl: "",
    website: "",
    statement: "Hi",
    testProfile: "thin",
  },
  {
    email: "test.disposable@mailinator.com",
    name: "Drop Box",
    org: "TEST No Footprint LLC",
    location: "Miami, FL",
    role: "GENERAL_CONTRACTOR",
    phone: "",
    linkedinUrl: "",
    website: "",
    statement: "Looking for deals.",
    testProfile: "",
  },
  {
    email: "marcus.hale@halerow.example",
    name: "Marcus Hale",
    org: "TEST Duplicate of Hale Row",
    location: "Hoboken, NJ",
    role: "DEVELOPER",
    phone: "201-555-0100",
    linkedinUrl: "https://www.linkedin.com/in/marcus-hale",
    website: "",
    statement: "This labelled test uses an email that already belongs to a member.",
    testProfile: "",
  },
];

export async function saveInternalNote(formData: FormData) {
  await requireAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const internalNote = String(formData.get("internalNote") || "").trim().slice(0, 2000);
  await prisma.application.update({ where: { id: applicationId }, data: { internalNote } });
  revalidatePath(`/admin/applications/${applicationId}`);
  redirect(`/admin/applications/${applicationId}?notice=Note+saved`);
}

export async function rerunVerification(applicationId: string): Promise<{ href: string }> {
  await requireAdmin();
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) return { href: "/admin/applications?error=That+application+was+not+found" };
  await queueApplicationVerification(application.id, application.org, { network: true, wait: true });
  revalidatePath(`/admin/applications/${application.id}`);
  revalidatePath("/admin/applications");
  return {
    href: `/admin/applications/${application.id}?notice=${encodeURIComponent("Verification finished. Live sources may differ from the offline sample.")}`,
  };
}

export async function refreshWatchlists(): Promise<{ href: string }> {
  await requireAdmin();
  const result = await refreshWatchlist();
  revalidatePath("/admin/sources");
  const notice = result.error ? result.error : `Watchlist refreshed. ${result.count} names cached.`;
  return { href: `/admin/sources?notice=${encodeURIComponent(notice)}` };
}

export async function insertSampleApplicants(actorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const invite = await prisma.inviteCode.findFirst({ orderBy: { createdAt: "asc" } });
  if (!invite) return { ok: false, error: "Create a referral code first" };
  if (invite.uses + SAMPLES.length > invite.maxUses) {
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { maxUses: invite.uses + SAMPLES.length },
    });
  }
  const emails = SAMPLES.map((sample) => sample.email);
  await prisma.application.deleteMany({ where: { isTest: true, email: { in: emails } } });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const sample of SAMPLES) {
    const application = await prisma.application.create({
      data: {
        inviteCodeId: invite.id,
        email: sample.email,
        name: sample.name,
        passwordHash,
        role: sample.role,
        org: sample.org,
        location: sample.location,
        credentialValue: "No business card uploaded.",
        phone: sample.phone,
        linkedinUrl: sample.linkedinUrl,
        website: sample.website,
        statement: sample.statement,
        status: "SUBMITTED",
        emailVerifiedAt: new Date(),
        duesCents: annualDuesCents(sample.role),
        duesWaived: annualDuesCents(sample.role) === 0,
        isTest: true,
        testProfile: sample.testProfile,
        statusToken: `test-${sample.email.replace(/[^a-z0-9]/gi, "").slice(0, 24)}-${Date.now().toString(36)}`,
      },
    });
    await prisma.legalAcceptance.createMany({
      data: acceptanceVersions().map(({ document, version }) => ({
        applicationId: application.id,
        email: sample.email,
        document,
        version,
        ipHash: "test",
      })),
    });
    await prisma.inviteCode.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } });
    await queueApplicationVerification(application.id, sample.org, { network: false, wait: true });
  }
  await prisma.applicationDecision.create({
    data: {
      applicationId: (await prisma.application.findFirst({ where: { email: emails[0], isTest: true }, select: { id: true } }))!.id,
      actorId,
      decision: "SEEDED",
      reason: "Test console created the labelled sample set. Offline fixtures supply the strong LEGIT row. Re-run uses live sources.",
    },
  });
  return { ok: true };
}

export async function createSampleApplicants() {
  const admin = await requireAdmin();
  const result = await insertSampleApplicants(admin.id);
  if (!result.ok) redirect(`/admin/test?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  redirect("/admin/test?notice=Six+labelled+TEST+applicants+are+in+the+queue");
}

export async function deleteApplicantRecords(ids: string[], actorId: string): Promise<string> {
  const applications = await prisma.application.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, name: true, userId: true, inviteCodeId: true },
  });
  if (!applications.length) return "No matching applicants.";
  await prisma.moderationEvent.create({
    data: {
      actorId,
      action: "DELETE_APPLICANT",
      summary: `Deleted ${applications.length} applicant record(s): ${applications.map((row) => `${row.name} <${row.email}>`).join("; ")}.`,
    },
  });
  const foundIds = applications.map((row) => row.id);
  const emails = applications.map((row) => row.email);
  await prisma.verificationCase.deleteMany({ where: { applicationId: { in: foundIds } } });
  await deleteOutboxTied(prisma, emails, { applicationIds: foundIds });
  await prisma.emailChallenge.deleteMany({ where: { email: { in: emails } } });
  const counts = new Map<string, number>();
  for (const row of applications) {
    if (!row.inviteCodeId) continue;
    counts.set(row.inviteCodeId, (counts.get(row.inviteCodeId) ?? 0) + 1);
  }
  for (const [inviteCodeId, count] of counts) {
    const invite = await prisma.inviteCode.findUnique({ where: { id: inviteCodeId } });
    if (!invite) continue;
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { uses: Math.max(0, invite.uses - count) },
    });
  }
  const userIds = applications.map((row) => row.userId).filter((id): id is string => Boolean(id));
  const crmCount = await prisma.crmPerson.count({
    where: { OR: [{ email: { in: emails } }, { applicationId: { in: foundIds } }, { userId: { in: userIds } }] },
  });
  for (const userId of userIds) await deleteMemberAccount(userId);
  await prisma.crmPerson.deleteMany({
    where: { OR: [{ email: { in: emails } }, { applicationId: { in: foundIds } }, { userId: { in: userIds } }] },
  });
  await prisma.application.deleteMany({ where: { id: { in: foundIds } } });
  const removed = applicantRemovalList({ member: userIds.length > 0, crm: crmCount > 0 });
  return `Removed ${applications.length} applicant(s): ${removed.join(", ")}.`;
}

export async function setMemberStatus(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "");
  if (status !== "ACTIVE" && status !== "DISABLED") redirect(`/admin/members/${userId}`);
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member || member.isAdmin) redirect(`/admin/members/${userId}?error=Administrators+stay+active`);
  await prisma.user.update({ where: { id: userId }, data: { status } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: status === "ACTIVE" ? "REINSTATE_MEMBER" : "SUSPEND_MEMBER",
      summary: `${admin.name} ${status === "ACTIVE" ? "reinstated" : "suspended"} ${member.name}.`,
    },
  });
  revalidatePath(`/admin/members/${userId}`);
  redirect(`/admin/members/${userId}?notice=${status === "ACTIVE" ? "Member+reinstated" : "Member+suspended"}`);
}

export async function removeMember(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isAdmin: true, name: true } });
  if (!member || member.isAdmin) redirect("/admin/members?error=That+account+cannot+be+removed");
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "REMOVE_MEMBER",
      summary: `${admin.name} removed ${member.name}.`,
    },
  });
  await deleteMemberAccount(userId);
  revalidatePath("/admin/members");
  redirect("/admin/members?notice=Member+removed");
}

export async function deleteVerificationCase(formData: FormData) {
  const admin = await requireVerificationAdmin();
  const caseId = String(formData.get("caseId") || "");
  const record = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      subject: true,
      user: { select: { name: true, email: true } },
      application: { select: { name: true, email: true, org: true } },
      inviteRequest: { select: { name: true, email: true, org: true } },
      project: { select: { name: true } },
    },
  });
  if (!record) redirect("/admin/verification?error=That+case+was+not+found");
  const label =
    record.user?.name ||
    record.application?.name ||
    record.inviteRequest?.name ||
    record.project?.name ||
    record.id;
  const email = record.user?.email || record.application?.email || record.inviteRequest?.email || "";
  const org = record.application?.org || record.inviteRequest?.org || "";
  await prisma.verificationCase.delete({ where: { id: record.id } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "DELETE_VERIFICATION_CASE",
      summary: `${admin.name} deleted the verification case for ${label}${email ? ` <${email}>` : ""}${org ? ` at ${org}` : ""}.`,
    },
  });
  revalidatePath("/admin/verification");
  redirect("/admin/verification?notice=Case+deleted");
}

export async function seedMemberNetwork() {
  const admin = await requireAdmin();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const specs: {
    email: string;
    name: string;
    role: MemberRole;
    org: string;
    location: string;
    markets: string;
    dealTypes: string;
    assetClasses: string;
    checkSize: string;
    lookingFor: string;
    offering: string;
  }[] = [
    {
      email: "test.dev.floor@example.com",
      name: "Dana Testfloor",
      role: "DEVELOPER",
      org: "TEST Floor Development",
      location: "Austin, TX",
      markets: "TX, CO",
      dealTypes: "Equity, Development",
      assetClasses: "Multifamily",
      checkSize: "$2–5M",
      lookingFor: "Equity partners for multifamily sites",
      offering: "Ground-up development",
    },
    {
      email: "test.gc.floor@example.com",
      name: "Gabe Testfloor",
      role: "GENERAL_CONTRACTOR",
      org: "TEST Floor Builders",
      location: "Dallas, TX",
      markets: "TX",
      dealTypes: "Development",
      assetClasses: "Multifamily, Industrial",
      checkSize: "$5M+",
      lookingFor: "Projects to price",
      offering: "General contracting",
    },
    {
      email: "test.lp.floor@example.com",
      name: "Lena Testfloor",
      role: "INVESTOR_PE",
      org: "TEST Floor Capital",
      location: "Denver, CO",
      markets: "CO, TX",
      dealTypes: "Equity",
      assetClasses: "Multifamily",
      checkSize: "$1–5M",
      lookingFor: "Development equity",
      offering: "LP equity",
    },
  ];
  const users = [];
  for (const spec of specs) {
    const existing = await prisma.user.findUnique({ where: { email: spec.email } });
    if (existing) {
      users.push(existing);
      continue;
    }
    users.push(
      await prisma.user.create({
        data: {
          ...spec,
          passwordHash,
          initials: initialsFromName(spec.name),
          bio: "Sample member on the test floor. Contact details stay inside Private Floor.",
          website: "https://example.com",
          isTest: true,
          status: "ACTIVE",
          tier: "INVITED",
          seenWelcome: true,
        },
      }),
    );
  }
  const [dev, gc, lp] = users;
  if (!dev || !gc || !lp) redirect("/admin/test?error=Could+not+seed+the+sample+members");

  const verified = await prisma.verificationCase.findUnique({ where: { userId: dev.id } });
  if (!verified) {
    const record = await prisma.verificationCase.create({
      data: {
        subject: "MEMBER",
        status: "VERIFIED",
        userId: dev.id,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.verificationCheck.createMany({
      data: ["identity", "license", "references", "sanctions", "track"].map((key) => ({
        caseId: record.id,
        key,
        label: key,
        result: "PASS",
      })),
    });
  }

  const publishedTitle = "TEST Multifamily sites in Texas";
  let published = await prisma.post.findFirst({ where: { title: publishedTitle, isTest: true }, include: { deal: true } });
  if (!published) {
    const deal = await prisma.deal.create({
      data: {
        sponsorId: dev.id,
        kind: "SEEKING",
        title: publishedTitle,
        blurb: "Looking for a general contractor on a multifamily site in Texas.",
        market: "TX",
        sizeBand: "scope",
        assetClass: "Multifamily",
        raiseLabel: "120 units",
        roleNeeded: "GENERAL_CONTRACTOR",
      },
    });
    published = await prisma.post.create({
      data: {
        authorId: dev.id,
        kind: "SEEKING",
        status: "PUBLISHED",
        title: publishedTitle,
        intent: "seeking-gc",
        body: "Looking for a general contractor on a multifamily site in Texas. About 120 units.",
        market: "TX",
        assetClass: "Multifamily",
        sizeRange: "120 units",
        rulesVersion: "2026-10-24-draft-1",
        rulesAckAt: new Date(),
        dealId: deal.id,
        isTest: true,
      },
      include: { deal: true },
    });
  }
  if (published.dealId) {
    const access = await prisma.dealAccess.findUnique({
      where: { dealId_requesterId: { dealId: published.dealId, requesterId: gc.id } },
    });
    if (!access) {
      await prisma.dealAccess.create({
        data: {
          dealId: published.dealId,
          requesterId: gc.id,
          status: "APPROVED",
          ndaAcknowledged: true,
          ndaAcknowledgedAt: new Date(),
          ndaVersion: "2026-10-24-draft-1",
          ndaIpHash: "test-seed",
          reviewedAt: new Date(),
        },
      });
      await prisma.dealDocument.create({
        data: {
          dealId: published.dealId,
          authorId: dev.id,
          title: "Site sketch",
          url: "",
          note: "Name, type, and size only. The file itself is not stored on this host.",
          fileName: "site-sketch.pdf",
          contentType: "application/pdf",
          sizeBytes: 120000,
        },
      });
      await prisma.dealEvent.create({
        data: { dealId: published.dealId, actorId: dev.id, summary: "Dana Testfloor listed a document: Site sketch." },
      });
    }
  }

  const flaggedTitle = "TEST Held raise";
  const flagged = await prisma.post.findFirst({ where: { title: flaggedTitle, isTest: true } });
  if (!flagged) {
    const deal = await prisma.deal.create({
      data: {
        sponsorId: dev.id,
        kind: "DEAL",
        title: flaggedTitle,
        blurb: "This sample mentions an 18% IRR and stays in review.",
        market: "TX",
        sizeBand: "1-5",
        assetClass: "Multifamily",
        raiseLabel: "$4M",
      },
    });
    await prisma.post.create({
      data: {
        authorId: dev.id,
        kind: "DEAL",
        status: "PENDING_REVIEW",
        title: flaggedTitle,
        intent: "raising-equity",
        body: "Sample post held because it says 18% IRR.",
        market: "TX",
        assetClass: "Multifamily",
        sizeRange: "$4M",
        rulesVersion: "2026-10-24-draft-1",
        rulesAckAt: new Date(),
        flagReason: "IRR",
        dealId: deal.id,
        isTest: true,
      },
    });
  }

  const pendingIntro = await prisma.introduction.findFirst({ where: { fromId: gc.id, toId: lp.id } });
  if (!pendingIntro) {
    await prisma.introduction.create({
      data: {
        fromId: gc.id,
        toId: lp.id,
        note: "Would like to compare Texas projects inside Private Floor.",
        status: "PENDING",
        isTest: true,
      },
    });
  }
  const accepted = await prisma.introduction.findFirst({ where: { fromId: dev.id, toId: gc.id, status: "ACCEPTED" } });
  if (!accepted) {
    await prisma.introduction.create({
      data: {
        fromId: dev.id,
        toId: gc.id,
        note: "GC intro for the Texas site.",
        status: "ACCEPTED",
        isTest: true,
        decidedAt: new Date(),
      },
    });
    const [userAId, userBId] = orderedPair(dev.id, gc.id);
    const conversation = await prisma.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });
    const count = await prisma.message.count({ where: { conversationId: conversation.id } });
    if (count === 0) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: dev.id,
          kind: "INTRO",
          body: "Dana Testfloor requested an introduction. GC intro for the Texas site.",
        },
      });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: gc.id,
          kind: "TEXT",
          body: "Happy to look at the Texas site inside Private Floor.",
          readAt: null,
        },
      });
    }
  }

  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "SEED_NETWORK",
      summary: "Seeded is_test members, posts, an introduction, and a thread.",
    },
  });
  revalidatePath("/admin/test");
  revalidatePath("/feed");
  revalidatePath("/network");
  revalidatePath("/admin/moderation");
  redirect("/admin/test?notice=Sample+members,+posts,+and+a+thread+are+ready.+Password+is+cornicio-demo.");
}

export async function seedPaymentDueMember() {
  const admin = await requireAdmin();
  const email = "test.gc.pay@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/test?notice=Gina+Paytest+is+already+on+the+floor.+Password+is+cornicio-demo.");
  }
  const invite = await prisma.inviteCode.findFirst({ orderBy: { createdAt: "asc" } });
  if (!invite) redirect("/admin/test?error=Create+a+referral+code+first");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const paymentToken = randomBytes(24).toString("hex");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Gina Paytest",
      initials: initialsFromName("Gina Paytest"),
      role: "GENERAL_CONTRACTOR",
      org: "TEST Pay Builders",
      location: "Newark, NJ",
      bio: "Sample member waiting on monthly dues. Contact details stay inside Private Floor.",
      isTest: true,
      status: "ACTIVE",
      tier: "INVITED",
      paymentStatus: "DUE",
      duesCents: annualDuesCents("GENERAL_CONTRACTOR"),
      paymentToken,
    },
  });
  await prisma.application.create({
    data: {
      inviteCodeId: invite.id,
      email,
      name: user.name,
      passwordHash,
      role: "GENERAL_CONTRACTOR",
      org: user.org,
      location: user.location,
      credentialValue: "No business card uploaded.",
      statement: "Test member approved with payment due. isTest is set so this row can be deleted with the other test data.",
      status: "PAYMENT_DUE",
      emailVerifiedAt: new Date(),
      reviewedAt: new Date(),
      reviewerId: admin.id,
      duesCents: user.duesCents,
      duesWaived: false,
      isTest: true,
      statusToken: `test-pay-${randomBytes(6).toString("hex")}`,
      userId: user.id,
    },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "SEED_PAYMENT",
      summary: "Seeded Gina Paytest, an is_test general contractor with payment due.",
    },
  });
  revalidatePath("/admin/test");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/members");
  redirect("/admin/test?notice=Gina+Paytest+is+approved+with+payment+due.+Password+is+cornicio-demo.");
}

export async function deleteTestData() {
  const admin = await requireAdmin();
  const applications = await prisma.application.findMany({ where: { isTest: true }, select: { id: true } });
  const notice = await deleteApplicantRecords(applications.map((row) => row.id), admin.id);
  const leftovers = await prisma.user.findMany({ where: { isTest: true, isAdmin: false }, select: { id: true } });
  for (const user of leftovers) await deleteMemberAccount(user.id);
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/audit");
  redirect(`/admin/test?notice=${encodeURIComponent(applications.length ? notice : "No test applicants to remove.")}`);
}

export async function deleteRecentRecords(formData: FormData) {
  const admin = await requireAdmin();
  const hours = cleanupWindowHours(String(formData.get("hours") || ""));
  if (!hours) redirect("/admin/test?error=Choose+a+whole+number+of+hours+from+1+to+168");
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const applications = await prisma.application.findMany({ where: { createdAt: { gte: since } }, select: { id: true } });
  const notice = applications.length ? await deleteApplicantRecords(applications.map((row) => row.id), admin.id) : "";
  const members = await prisma.user.findMany({
    where: { isAdmin: false, createdAt: { gte: since } },
    select: { id: true },
  });
  for (const member of members) await deleteMemberAccount(member.id);
  const people = await prisma.crmPerson.deleteMany({ where: { createdAt: { gte: since } } });
  const requests = await prisma.inviteRequest.findMany({ where: { createdAt: { gte: since } }, select: { id: true } });
  if (requests.length) {
    await prisma.crmPerson.updateMany({
      where: { inviteRequestId: { in: requests.map((row) => row.id) } },
      data: { inviteRequestId: null },
    });
    await prisma.inviteRequest.deleteMany({ where: { id: { in: requests.map((row) => row.id) } } });
  }
  const codes = await prisma.inviteCode.findMany({
    where: { createdAt: { gte: since }, applications: { none: {} } },
    select: { id: true },
  });
  if (codes.length) {
    await prisma.inviteRequest.updateMany({
      where: { inviteCodeId: { in: codes.map((row) => row.id) } },
      data: { inviteCodeId: null },
    });
    await prisma.inviteCode.deleteMany({ where: { id: { in: codes.map((row) => row.id) } } });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/test");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/crm");
  redirect(
    `/admin/test?notice=${encodeURIComponent(
      `Deleted records from the last ${hours} hours: ${applications.length} application(s), ${members.length} member account(s), ${people.count} CRM people, ${requests.length} request(s) to join, ${codes.length} unused referral code(s). Administrators were kept. ${notice}`.trim(),
    )}`,
  );
}

export async function deleteSelectedApplications(formData: FormData) {
  const admin = await requireAdmin();
  const ids = formData.getAll("applicationId").map((value) => String(value)).filter(Boolean);
  if (!ids.length) redirect("/admin/applications?error=Select+at+least+one+applicant");
  const notice = await deleteApplicantRecords(ids, admin.id);
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/audit");
  redirect(`/admin/applications?notice=${encodeURIComponent(notice)}`);
}

export async function deleteOneApplication(applicationId: string): Promise<{ href: string }> {
  const admin = await requireAdmin();
  const notice = await deleteApplicantRecords([applicationId], admin.id);
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/audit");
  return { href: `/admin/applications?notice=${encodeURIComponent(notice)}` };
}

export async function createCustomTestApplicant(
  formData: FormData,
): Promise<{ href: string; message: string } | { error: string }> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const org = String(formData.get("org") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const website = normalizeWebUrl(String(formData.get("website") || ""));
  const location = String(formData.get("location") || "").trim() || "Newark, NJ";
  if (name.length < 2 || org.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Name, company, and a valid email are required." };
  }
  const invite = await prisma.inviteCode.findFirst({ orderBy: { createdAt: "asc" } });
  if (!invite) return { error: "Create a referral code first." };
  if (invite.uses >= invite.maxUses) {
    await prisma.inviteCode.update({ where: { id: invite.id }, data: { maxUses: invite.uses + 1 } });
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const application = await prisma.application.create({
    data: {
      inviteCodeId: invite.id,
      email,
      name,
      passwordHash,
      role: "DEVELOPER",
      org,
      location,
      credentialValue: "No business card uploaded.",
      website,
      statement: "Test console applicant. isTest is set so this row can be deleted with the other test data.",
      status: "SUBMITTED",
      emailVerifiedAt: new Date(),
      duesCents: annualDuesCents("DEVELOPER"),
      duesWaived: true,
      isTest: true,
      statusToken: `test-custom-${Date.now().toString(36)}`,
    },
  });
  await prisma.legalAcceptance.createMany({
    data: acceptanceVersions().map(({ document, version }) => ({
      applicationId: application.id,
      email,
      document,
      version,
      ipHash: "test",
    })),
  });
  await prisma.inviteCode.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } });
  await prisma.applicationDecision.create({
    data: {
      applicationId: application.id,
      actorId: admin.id,
      decision: "SEEDED",
      reason: "Test console created a custom isTest applicant.",
    },
  });
  await queueApplicationVerification(application.id, org, { network: true, wait: false });
  revalidatePath("/admin/applications");
  revalidatePath("/admin/test");
  return {
    href: `/admin/applications/${application.id}`,
    message: `Created ${name}. Verification is running on live sources.`,
  };
}
