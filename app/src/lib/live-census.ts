import { prisma } from "@/lib/prisma";
import { SEED_USER_IDS } from "@/lib/clean-test-data";
import { isDemoRecord } from "@/lib/person-standing";

const SEED_USERS = new Set(SEED_USER_IDS);

/** Domain class only. The local part of an address is never logged. */
export function emailDomainClass(email: string): "example" | "buildpro" | "owner" | "other" {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  if (domain.endsWith(".example")) return "example";
  if (domain === "buildpro-cs.com") return "buildpro";
  if (domain === "privatefloorclub.com") return "owner";
  return "other";
}

function tally(rows: string[]): string {
  const counts = { example: 0, buildpro: 0, owner: 0, other: 0 };
  for (const email of rows) counts[emailDomainClass(email)] += 1;
  return `example=${counts.example} buildpro=${counts.buildpro} owner=${counts.owner} other=${counts.other}`;
}

/** Counts only. Rejects a line that contains an address. */
export function assertCensusLine(line: string): string {
  if (line.includes("@")) throw new Error("Census line contained an address");
  if (!/^[A-Za-z0-9_= .-]+$/.test(line)) throw new Error("Census line was rejected");
  return line;
}

export async function logApplicantCensus(): Promise<void> {
  const [admins, invites, applications, cases, people] = await Promise.all([
    prisma.user.findMany({ where: { isAdmin: true }, select: { id: true, initials: true, email: true, isTest: true } }),
    prisma.inviteRequest.findMany({ select: { status: true, email: true } }),
    prisma.application.findMany({ select: { status: true, email: true, isTest: true } }),
    prisma.verificationCase.findMany({ select: { subject: true, userId: true } }),
    prisma.crmPerson.findMany({ select: { email: true, inviteRequestId: true, applicationId: true, userId: true } }),
  ]);
  const inviteStatus = (status: string) => invites.filter((row) => row.status === status).length;
  const applicationStatus = (status: string) => applications.filter((row) => row.status === status).length;
  const adminBits = admins.map((admin) => {
    const demo = isDemoRecord({ isTest: admin.isTest, email: admin.email }) || SEED_USERS.has(admin.id) ? 1 : 0;
    return `initials=${admin.initials} seed=${SEED_USERS.has(admin.id) ? 1 : 0} demo=${demo} domain=${emailDomainClass(admin.email)}`;
  });
  const inviteOnly = people.filter((person) => person.inviteRequestId && !person.applicationId);
  const line = assertCensusLine(
    [
      "APPLICANT_CENSUS",
      `admins=${admins.length}`,
      adminBits.join(" "),
      `application=${applications.length}`,
      `application_pending=${applicationStatus("PENDING") + applicationStatus("SUBMITTED")}`,
      `application_review=${applicationStatus("IN_REVIEW")}`,
      `invite=${invites.length}`,
      `invite_pending=${inviteStatus("PENDING")}`,
      `invite_issued=${inviteStatus("ISSUED")}`,
      `invite_declined=${inviteStatus("DECLINED")}`,
      `invite_domain ${tally(invites.map((row) => row.email))}`,
      `verification=${cases.length}`,
      `verification_member=${cases.filter((row) => row.subject === "MEMBER").length}`,
      `verification_project=${cases.filter((row) => row.subject === "PROJECT").length}`,
      `people=${people.length}`,
      `people_invite_only=${inviteOnly.length}`,
      `people_invite_domain ${tally(inviteOnly.map((row) => row.email))}`,
    ].join(" "),
  );
  console.log(line);
}
