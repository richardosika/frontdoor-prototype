import type { Prisma } from "@prisma/client";
import { canAutofill, emptyPrefillFacts, suggestChecklist, type EvidenceRow, type PrefillFacts, type StepSuggestion } from "@/lib/guided-prefill";
import { prisma } from "@/lib/prisma";
import { MEMBER_CHECKS, PROJECT_CHECKS } from "@/lib/verification";
import { ensureVerificationCase } from "@/lib/verification-db";
import { collectChecks, type CheckContext } from "@/lib/verify/checks";
import { politeFetch } from "@/lib/verify/fetch";
import { gradeChecks, parseGradeSnapshot, type GradeReport } from "@/lib/verify/grade";
import type { ApplicantFacts, CheckOutput, EvidenceStatus } from "@/lib/verify/types";
import { loadWatchlist } from "@/lib/verify/watchlist";

const liveInflight = new Set<string>();
const liveStartedAt = new Map<string, number>();
const LIVE_COOLDOWN_MS = 10 * 60 * 1000;

function checklistKeys(subject: string): string[] {
  return (subject === "PROJECT" ? PROJECT_CHECKS : MEMBER_CHECKS).map((item) => item.key);
}

async function rememberSources(caseId: string, rows: EvidenceRow[]): Promise<void> {
  if (!rows.length) return;
  await prisma.verificationCase.update({
    where: { id: caseId },
    data: { sourceSnapshot: rows },
  });
}

function asEvidence(checks: CheckOutput[]): EvidenceRow[] {
  return checks.map((check) => ({
    checkKey: check.key,
    status: check.status,
    finding: check.finding,
    source: check.source,
    url: check.url,
    hardFlag: check.hardFlag,
    reviewFlag: check.reviewFlag,
    corroborates: check.corroborates,
  }));
}

function factsToApplicant(facts: PrefillFacts, extra: Partial<ApplicantFacts> = {}): ApplicantFacts {
  return {
    name: facts.name,
    applicantName: facts.name,
    email: extra.email || "",
    org: facts.org,
    location: facts.location,
    role: extra.role || "DEVELOPER",
    applicationSubmitted: extra.applicationSubmitted,
    phone: extra.phone || "",
    website: facts.website,
    linkedinUrl: facts.linkedinUrl,
    socialLinks: extra.socialLinks || "",
    statement: facts.statement,
    inviteNote: extra.inviteNote || "",
    testProfile: extra.testProfile || "",
    cardText: facts.cardText,
    cardUploaded: facts.cardOnFile,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
    referenceCount: facts.referenceEmails.length,
  };
}

async function writeSuggestions(input: {
  caseId: string;
  suggestions: StepSuggestion[];
  grade: GradeReport | null;
  mode: "fill-empty" | "refresh";
  summary: string;
}): Promise<number> {
  const record = await prisma.verificationCase.findUnique({
    where: { id: input.caseId },
    include: { checks: true },
  });
  if (!record) return 0;
  let updated = 0;
  for (const suggestion of input.suggestions) {
    const check = record.checks.find((item) => item.key === suggestion.key);
    if (!check) continue;
    if (!canAutofill(check, input.mode)) continue;
    if (
      check.autoSuggested &&
      check.result === suggestion.result &&
      check.evidenceUrl === suggestion.evidenceUrl &&
      check.note === suggestion.note
    ) {
      continue;
    }
    const wrote = await prisma.verificationCheck.updateMany({
      where: {
        id: check.id,
        note: check.note,
        result: check.result,
        reviewerId: check.reviewerId,
        autoSuggested: check.autoSuggested,
      },
      data: {
        result: suggestion.result,
        note: suggestion.note,
        evidenceUrl: suggestion.evidenceUrl,
        autoSuggested: true,
        reviewerId: null,
        reviewedAt: null,
      },
    });
    updated += wrote.count;
  }
  if (input.grade && (updated > 0 || input.mode === "refresh")) {
    await prisma.verificationCase.update({
      where: { id: record.id },
      data: { gradeSnapshot: input.grade as unknown as Prisma.InputJsonValue },
    });
  }
  if (updated > 0) {
    await prisma.verificationEvent.create({
      data: {
        caseId: record.id,
        fromStatus: record.status,
        toStatus: record.status,
        summary: input.summary,
      },
    });
  }
  return updated;
}

async function storedEvidence(caseId: string): Promise<{ evidence: EvidenceRow[]; grade: GradeReport | null; facts: PrefillFacts | null }> {
  const record = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    select: { applicationId: true, projectId: true, gradeSnapshot: true },
  });
  if (!record) return { evidence: [], grade: null, facts: null };
  if (record.applicationId) {
    const runs = await prisma.verificationRun.findMany({
      where: { applicationId: record.applicationId, status: "DONE", subject: { in: ["APPLICATION", "COMPANY"] } },
      orderBy: { finishedAt: "desc" },
      include: { evidence: true },
    });
    const application = runs.find((run) => run.subject === "APPLICATION");
    const company = runs.find((run) => run.subject === "COMPANY");
    const seen = new Set<string>();
    const evidence: EvidenceRow[] = [];
    for (const run of [application, company]) {
      for (const item of run?.evidence ?? []) {
        if (seen.has(item.checkKey) && item.checkKey !== "news-story") continue;
        seen.add(item.checkKey);
        evidence.push({
          checkKey: item.checkKey,
          status: item.status,
          finding: item.finding,
          source: item.source,
          url: item.url,
          hardFlag: item.hardFlag,
          reviewFlag: item.reviewFlag,
          corroborates: item.corroborates,
        });
      }
    }
    return { evidence, grade: parseGradeSnapshot(application?.gradeSnapshot) || parseGradeSnapshot(record.gradeSnapshot), facts: null };
  }
  if (record.projectId) {
    const run = await prisma.verificationRun.findFirst({
      where: { projectId: record.projectId, status: "DONE" },
      orderBy: { finishedAt: "desc" },
      include: { evidence: true },
    });
    return {
      evidence: (run?.evidence ?? []).map((item) => ({
        checkKey: item.checkKey,
        status: item.status,
        finding: item.finding,
        source: item.source,
        url: item.url,
        hardFlag: item.hardFlag,
        reviewFlag: item.reviewFlag,
        corroborates: item.corroborates,
      })),
      grade: parseGradeSnapshot(run?.gradeSnapshot) || parseGradeSnapshot(record.gradeSnapshot),
      facts: null,
    };
  }
  return { evidence: [], grade: parseGradeSnapshot(record.gradeSnapshot), facts: null };
}

export async function factsForCase(caseId: string): Promise<{ facts: PrefillFacts; applicant: ApplicantFacts; subject: string; test: boolean } | null> {
  const record = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: {
      user: true,
      project: { include: { user: true } },
      application: { include: { businessCard: true, inviteCode: true } },
      inviteRequest: true,
    },
  });
  if (!record) return null;
  const application = record.application
    || (record.userId
      ? await prisma.application.findFirst({
          where: { userId: record.userId },
          orderBy: { createdAt: "desc" },
          include: { businessCard: true, inviteCode: true },
        })
      : null);
  const card = application?.businessCard;
  const cardOnFile = Boolean(card && !card.deletedAt && card.sizeBytes > 0);
  if (record.subject === "PROJECT" && record.project) {
    const facts = emptyPrefillFacts({
      name: record.project.user?.name || "",
      org: record.project.name,
      location: record.project.location,
      statement: record.project.summary,
      website: record.project.user?.website || "",
      linkedinUrl: record.project.user?.linkedinUrl || "",
    });
    return {
      facts,
      applicant: factsToApplicant(facts, { email: record.project.user?.email || "", role: record.project.user?.role || "DEVELOPER" }),
      subject: record.subject,
      test: Boolean(record.project.user?.isTest),
    };
  }
  const invite = record.inviteRequest;
  const person = application || invite;
  const user = record.user;
  const facts = emptyPrefillFacts({
    name: person?.name || user?.name || "",
    org: person?.org || user?.org || "",
    location: person?.location || user?.location || "",
    statement: application?.statement || invite?.note || user?.bio || "",
    linkedinUrl: application?.linkedinUrl || user?.linkedinUrl || "",
    website: application?.website || user?.website || "",
    referenceEmails: application?.referenceEmails || [],
    cardOnFile,
    cardText: "",
  });
  return {
    facts,
    applicant: factsToApplicant(facts, {
      email: application?.email || user?.email || invite?.email || "",
      role: application?.role || user?.role || invite?.role || "DEVELOPER",
      applicationSubmitted: Boolean(application),
      phone: application?.phone || user?.phone || "",
      socialLinks: application?.socialLinks || "",
      inviteNote: application?.inviteCode ? `${application.inviteCode.code} ${application.inviteCode.note}` : "",
      testProfile: application?.testProfile || "",
    }),
    subject: record.subject,
    test: Boolean(application?.isTest || user?.isTest),
  };
}

async function gradeFor(checks: CheckOutput[], applicant: ApplicantFacts, subject: string): Promise<GradeReport> {
  return gradeChecks(checks, applicant, { gradedAt: new Date().toISOString(), subject });
}

const EVIDENCE_STATUSES = new Set(["PASS", "FAIL", "INCONCLUSIVE", "NOT_RUN", "UNAVAILABLE"]);

function toCheckOutput(row: EvidenceRow): CheckOutput {
  return {
    key: row.checkKey,
    status: (EVIDENCE_STATUSES.has(row.status) ? row.status : "INCONCLUSIVE") as EvidenceStatus,
    weight: 0,
    finding: row.finding,
    source: row.source,
    url: row.url,
    ranAt: new Date().toISOString(),
    hardFlag: Boolean(row.hardFlag),
    reviewFlag: Boolean(row.reviewFlag),
    corroborates: Boolean(row.corroborates),
  };
}

/** Fill blank steps only. A later live re-run is left in place. */
export async function prepareGuidedCase(caseId: string): Promise<void> {
  const loaded = await factsForCase(caseId);
  if (!loaded) return;
  const stored = await storedEvidence(caseId);
  if (stored.evidence.length) await rememberSources(caseId, stored.evidence);
  const suggestions = suggestChecklist(checklistKeys(loaded.subject), loaded.facts, stored.evidence);
  const grade = stored.evidence.length
    ? stored.grade || (await gradeFor(stored.evidence.map(toCheckOutput), loaded.applicant, loaded.subject))
    : await gradeFor([], loaded.applicant, loaded.subject);
  await writeSuggestions({
    caseId,
    suggestions,
    grade,
    mode: "fill-empty",
    summary: stored.evidence.length
      ? "Free-source checks prefilled the guided review. Each mark is Auto-suggested until it is confirmed."
      : "Free-source checks prefilled the guided review. Each mark is Auto-suggested until it is confirmed. Live sources run in the background.",
  });
  const hasSocialScreen = stored.evidence.some((row) => row.checkKey.startsWith("screen-"));
  if (!stored.evidence.length || !hasSocialScreen) enqueueLivePrefill(caseId);
}

/** Replace auto-suggested marks from the latest saved run. Confirmed marks and skips stay. */
export async function refreshGuidedCase(caseId: string): Promise<void> {
  const loaded = await factsForCase(caseId);
  if (!loaded) return;
  const stored = await storedEvidence(caseId);
  if (!stored.evidence.length) {
    await runLivePrefill(caseId);
    return;
  }
  const suggestions = suggestChecklist(checklistKeys(loaded.subject), loaded.facts, stored.evidence);
  const grade = stored.grade || (await gradeFor(stored.evidence.map(toCheckOutput), loaded.applicant, loaded.subject));
  await rememberSources(caseId, stored.evidence);
  await writeSuggestions({
    caseId,
    suggestions,
    grade,
    mode: "refresh",
    summary: "Free-source checks prefilled the guided review. Each mark is Auto-suggested until it is confirmed.",
  });
}

export function enqueueLivePrefill(caseId: string): void {
  const started = liveStartedAt.get(caseId) || 0;
  if (liveInflight.has(caseId) || Date.now() - started < LIVE_COOLDOWN_MS) return;
  liveInflight.add(caseId);
  liveStartedAt.set(caseId, Date.now());
  void runLivePrefill(caseId)
    .catch((error) => {
      console.error("guided prefill failed", caseId, error instanceof Error ? error.message : "error");
    })
    .finally(() => {
      liveInflight.delete(caseId);
    });
}

export async function runLivePrefill(caseId: string): Promise<void> {
  const loaded = await factsForCase(caseId);
  if (!loaded) return;
  const watch = await loadWatchlist().catch(() => ({ entries: [], fetchedAt: null }));
  const ctx: CheckContext = {
    facts: loaded.applicant,
    watchlist: watch.entries,
    network: !loaded.applicant.testProfile,
    fetchText: politeFetch,
  };
  const checks = await collectChecks(ctx);
  const evidence = asEvidence(checks);
  const grade = await gradeFor(checks, loaded.applicant, loaded.subject);
  await rememberSources(caseId, evidence);
  const suggestions = suggestChecklist(checklistKeys(loaded.subject), loaded.facts, evidence);
  await writeSuggestions({
    caseId,
    suggestions,
    grade,
    mode: "refresh",
    summary: "Re-ran free-source checks. Auto-suggested marks were refreshed. Confirmed items and skips were left as they were.",
  });
}

export async function prefillFromApplication(applicationId: string): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true },
  });
  if (!application) return;
  const record = await ensureVerificationCase({
    subject: "MEMBER",
    applicationId: application.id,
    userId: application.userId || undefined,
  });
  await refreshGuidedCase(record.id);
}

export async function prefillFromProject(projectId: string): Promise<void> {
  const record = await ensureVerificationCase({ subject: "PROJECT", projectId });
  await refreshGuidedCase(record.id);
}

export async function openInviteReview(inviteRequestId: string): Promise<string> {
  const record = await ensureVerificationCase({ subject: "MEMBER", inviteRequestId });
  await prepareGuidedCase(record.id);
  return record.id;
}
