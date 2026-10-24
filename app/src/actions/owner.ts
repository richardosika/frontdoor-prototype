"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole } from "@prisma/client";
import { requireAdmin } from "@/lib/current-user";
import { annualDuesCents } from "@/lib/dues";
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
  if (!invite) return { ok: false, error: "Create an invite code first" };
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
        duesWaived: true,
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

async function removeMemberAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isAdmin: true } });
  if (!user || user.isAdmin) return;
  await prisma.application.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.application.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
  await prisma.inviteCode.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.verificationCheck.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
  await prisma.verificationEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.applicationDecision.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.dealEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.moderationEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.businessCard.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.message.deleteMany({ where: { senderId: userId } });
  await prisma.conversation.deleteMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] } });
  await prisma.connection.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } });
  await prisma.dealAccess.deleteMany({ where: { requesterId: userId } });
  const deals = await prisma.deal.findMany({ where: { sponsorId: userId }, select: { id: true } });
  if (deals.length) {
    const dealIds = deals.map((deal) => deal.id);
    await prisma.post.updateMany({ where: { dealId: { in: dealIds } }, data: { dealId: null } });
    await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
  }
  const projects = await prisma.trackProject.findMany({ where: { userId }, select: { id: true } });
  if (projects.length) {
    await prisma.verificationRun.deleteMany({ where: { projectId: { in: projects.map((project) => project.id) } } });
  }
  await prisma.user.delete({ where: { id: userId } });
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
  await prisma.outboxNotice.deleteMany({
    where: { OR: [{ applicationId: { in: foundIds } }, { intendedTo: { in: emails } }] },
  });
  await prisma.emailChallenge.deleteMany({ where: { email: { in: emails } } });
  const counts = new Map<string, number>();
  for (const row of applications) counts.set(row.inviteCodeId, (counts.get(row.inviteCodeId) ?? 0) + 1);
  for (const [inviteCodeId, count] of counts) {
    const invite = await prisma.inviteCode.findUnique({ where: { id: inviteCodeId } });
    if (!invite) continue;
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { uses: Math.max(0, invite.uses - count) },
    });
  }
  for (const row of applications) {
    if (row.userId) await removeMemberAccount(row.userId);
  }
  await prisma.application.deleteMany({ where: { id: { in: foundIds } } });
  return `Removed ${applications.length} applicant(s) and their data.`;
}

export async function deleteTestData() {
  const admin = await requireAdmin();
  const applications = await prisma.application.findMany({ where: { isTest: true }, select: { id: true } });
  const notice = await deleteApplicantRecords(applications.map((row) => row.id), admin.id);
  const leftovers = await prisma.user.findMany({ where: { isTest: true, isAdmin: false }, select: { id: true } });
  for (const user of leftovers) await removeMemberAccount(user.id);
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/audit");
  redirect(`/admin/test?notice=${encodeURIComponent(applications.length ? notice : "No test applicants to remove.")}`);
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

export async function createCustomTestApplicant(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const org = String(formData.get("org") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const website = String(formData.get("website") || "").trim();
  const location = String(formData.get("location") || "").trim() || "Newark, NJ";
  if (name.length < 2 || org.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/admin/test?error=Name%2C+company%2C+and+a+valid+email+are+required");
  }
  const invite = await prisma.inviteCode.findFirst({ orderBy: { createdAt: "asc" } });
  if (!invite) redirect("/admin/test?error=Create+an+invite+code+first");
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
  redirect(`/admin/applications/${application.id}?notice=${encodeURIComponent("Test applicant created. Verification is running on live sources.")}`);
}
