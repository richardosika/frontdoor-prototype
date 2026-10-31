import type { CrmStage } from "@prisma/client";
import { crmStage, stageOverride } from "@/lib/crm-stage";
import { formatRunScores } from "@/lib/verify/score";
import { prisma } from "@/lib/prisma";

export async function ensureCrmPerson(input: {
  email: string;
  name: string;
  role?: string;
  org?: string;
  location?: string;
  inviteCode?: string;
  inviteRequestId?: string | null;
  applicationId?: string | null;
  userId?: string | null;
  ownerId?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.crmPerson.findUnique({ where: { email } });
  if (existing) {
    return prisma.crmPerson.update({
      where: { id: existing.id },
      data: {
        name: input.name || existing.name,
        role: input.role || existing.role,
        org: input.org || existing.org,
        location: input.location || existing.location,
        inviteCode: input.inviteCode || existing.inviteCode,
        inviteRequestId: input.inviteRequestId ?? existing.inviteRequestId,
        applicationId: input.applicationId ?? existing.applicationId,
        userId: input.userId ?? existing.userId,
        ownerId: existing.ownerId || input.ownerId || null,
      },
    });
  }
  return prisma.crmPerson.create({
    data: {
      email,
      name: input.name || email,
      role: input.role || "",
      org: input.org || "",
      location: input.location || "",
      inviteCode: input.inviteCode || "",
      inviteRequestId: input.inviteRequestId || null,
      applicationId: input.applicationId || null,
      userId: input.userId || null,
      ownerId: input.ownerId || null,
      stage: "INVITED",
    },
  });
}

export async function recordCrmEvent(input: { email: string; kind: string; summary: string; sourceKey?: string | null }) {
  const person = await prisma.crmPerson.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!person) return;
  if (input.sourceKey) {
    const existing = await prisma.crmEvent.findUnique({ where: { sourceKey: input.sourceKey } });
    if (existing) return;
  }
  await prisma.crmEvent.create({
    data: {
      personId: person.id,
      kind: input.kind,
      summary: input.summary.slice(0, 500),
      sourceKey: input.sourceKey || null,
    },
  });
}

/** Rebuilds people and timeline rows from invites, applications, members, and the Outbox. Notes and do-not-contact stay put. */
export async function syncCrm() {
  const [invites, applications, users, runs, decisions, payments, notices] = await Promise.all([
    prisma.inviteRequest.findMany({ include: { inviteCode: true }, orderBy: { createdAt: "asc" } }),
    prisma.application.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.verificationRun.findMany({
      where: { applicationId: { not: null }, status: "DONE" },
      include: { application: { select: { email: true } } },
    }),
    prisma.applicationDecision.findMany({ include: { application: { select: { email: true } } } }),
    prisma.paymentEvent.findMany({ include: { user: { select: { email: true } } } }),
    prisma.outboxNotice.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  type Bucket = {
    email: string;
    name: string;
    role: string;
    org: string;
    location: string;
    inviteStatus?: string | null;
    applicationStatus?: string | null;
    memberActive?: boolean;
    paymentStatus?: string | null;
    inviteCode?: string;
    inviteRequestId?: string | null;
    applicationId?: string | null;
    userId?: string | null;
  };
  const buckets = new Map<string, Bucket>();
  const bucket = (email: string): Bucket => {
    const key = email.trim().toLowerCase();
    const found = buckets.get(key);
    if (found) return found;
    const created: Bucket = { email: key, name: key, role: "", org: "", location: "" };
    buckets.set(key, created);
    return created;
  };

  for (const invite of invites) {
    const row = bucket(invite.email);
    row.name = invite.name || row.name;
    row.role = invite.role;
    row.org = invite.org;
    row.location = invite.location;
    row.inviteStatus = invite.status;
    row.inviteRequestId = invite.id;
    row.inviteCode = invite.inviteCode?.code || row.inviteCode;
  }
  for (const application of applications) {
    const row = bucket(application.email);
    row.name = application.name;
    row.role = application.role;
    row.org = application.org;
    row.location = application.location;
    row.applicationStatus = application.status;
    row.applicationId = application.id;
    if (application.userId) row.userId = application.userId;
  }
  for (const user of users) {
    const row = bucket(user.email);
    row.name = user.name;
    row.role = user.role;
    row.org = user.org;
    row.location = user.location;
    row.userId = user.id;
    row.memberActive = user.status === "ACTIVE";
    row.paymentStatus = user.paymentStatus;
  }

  for (const row of buckets.values()) {
    const existing = await prisma.crmPerson.findUnique({ where: { email: row.email } });
    const manualStage = stageOverride(existing?.manualStage);
    const stage = crmStage({
      inviteStatus: row.inviteStatus,
      applicationStatus: row.applicationStatus,
      memberActive: row.memberActive,
      paymentStatus: row.paymentStatus,
      manualStage,
    }) as CrmStage;
    const data = {
      name: row.name,
      role: row.role,
      org: row.org,
      location: row.location,
      stage,
      manualStage,
      inviteCode: row.inviteCode || existing?.inviteCode || "",
      inviteRequestId: row.inviteRequestId ?? existing?.inviteRequestId ?? null,
      applicationId: row.applicationId ?? existing?.applicationId ?? null,
      userId: row.userId ?? existing?.userId ?? null,
    };
    if (existing) await prisma.crmPerson.update({ where: { id: existing.id }, data });
    else await prisma.crmPerson.create({ data: { email: row.email, ...data } });
  }

  const people = await prisma.crmPerson.findMany({ select: { id: true, email: true } });
  const byEmail = new Map(people.map((person) => [person.email, person.id]));
  const events: { personId: string; kind: string; summary: string; sourceKey: string; createdAt: Date }[] = [];
  const push = (email: string, kind: string, summary: string, sourceKey: string, createdAt: Date) => {
    const personId = byEmail.get(email.trim().toLowerCase());
    if (!personId) return;
    events.push({ personId, kind, summary: summary.slice(0, 500), sourceKey, createdAt });
  };

  for (const invite of invites) {
    push(invite.email, "invited", `Request to join ${invite.status.toLowerCase()}${invite.inviteCode ? ` · ${invite.inviteCode.code}` : ""}.`, `invite:${invite.id}`, invite.createdAt);
  }
  for (const application of applications) {
    push(application.email, "applied", `Application submitted for ${application.role}.`, `application:${application.id}`, application.createdAt);
  }
  for (const decision of decisions) {
    if (!decision.application) continue;
    push(decision.application.email, "decision", `${decision.decision}${decision.reason ? ` · ${decision.reason}` : ""}`, `decision:${decision.id}`, decision.createdAt);
  }
  for (const run of runs) {
    if (!run.application) continue;
    const scores = formatRunScores(run);
    push(run.application.email, "verification", `Verification ${run.verdict || run.status}${scores ? ` · ${scores}` : ""}.`, `run:${run.id}`, run.finishedAt || run.createdAt);
  }
  for (const payment of payments) {
    if (!payment.user) continue;
    push(payment.user.email, "payment", payment.kind, `payment:${payment.id}`, payment.createdAt);
  }
  for (const notice of notices) {
    const kind = notice.suppressed ? "suppressed" : "email";
    const summary = notice.suppressed
      ? `Not sent. ${notice.suppressedReason}`
      : `${notice.templateKey || "notice"} · ${notice.subject}`;
    push(notice.intendedTo, kind, summary, `outbox:${notice.id}`, notice.createdAt);
  }
  if (events.length) await prisma.crmEvent.createMany({ data: events, skipDuplicates: true });
}
