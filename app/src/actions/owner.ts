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

export async function rerunVerification(formData: FormData) {
  await requireAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) redirect("/admin/applications");
  await queueApplicationVerification(application.id, application.org, { network: true, wait: true });
  revalidatePath(`/admin/applications/${application.id}`);
  redirect(`/admin/applications/${application.id}?notice=Verification+finished.+Live+sources+may+differ+from+the+offline+sample.`);
}

export async function refreshWatchlists() {
  await requireAdmin();
  const result = await refreshWatchlist();
  const notice = result.error ? result.error : `Watchlist refreshed. ${result.count} names cached.`;
  redirect(`/admin/sources?notice=${encodeURIComponent(notice)}`);
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

export async function deleteTestData() {
  await requireAdmin();
  const applications = await prisma.application.findMany({
    where: { isTest: true },
    select: { id: true, email: true, userId: true, inviteCodeId: true },
  });
  const ids = applications.map((row) => row.id);
  const emails = applications.map((row) => row.email);
  const userIds = applications.map((row) => row.userId).filter((id): id is string => Boolean(id));
  if (ids.length) {
    await prisma.outboxNotice.deleteMany({
      where: { OR: [{ applicationId: { in: ids } }, { intendedTo: { in: emails } }] },
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
    await prisma.application.deleteMany({ where: { id: { in: ids } } });
  }
  const testUsers = await prisma.user.findMany({
    where: { isTest: true, isAdmin: false },
    select: { id: true },
  });
  const extraIds = testUsers.map((user) => user.id).filter((id) => !userIds.includes(id));
  const allUserIds = [...new Set([...userIds, ...extraIds])];
  if (allUserIds.length) {
    const projects = await prisma.trackProject.findMany({ where: { userId: { in: allUserIds } }, select: { id: true } });
    if (projects.length) {
      await prisma.verificationRun.deleteMany({ where: { projectId: { in: projects.map((project) => project.id) } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: allUserIds }, isTest: true, isAdmin: false } });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  redirect(`/admin/test?notice=${encodeURIComponent(`Removed ${ids.length} test applications`)}`);
}
