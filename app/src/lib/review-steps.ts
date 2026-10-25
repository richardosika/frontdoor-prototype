/**
 * Guided review on an application file. A saved skip is not a pass.
 * Automated findings are shown with their source. A check that did not pass is not described as confirmed.
 */

export const REVIEW_STEP_IDS = ["identity", "card", "card-match", "references", "company", "news", "risk", "decision"] as const;
export type ReviewStepId = (typeof REVIEW_STEP_IDS)[number];

export const STEP_STATUSES = ["PASS", "CONCERN", "NOT_CHECKED", "SKIPPED"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export type StepMark = {
  status: StepStatus;
  note: string;
  evidenceUrl: string;
  skipReason: string;
  updatedAt: string;
};

export type ReviewProgress = {
  version: 1;
  current: ReviewStepId;
  steps: Partial<Record<ReviewStepId, StepMark>>;
};

export type StepEvidence = {
  checkKey: string;
  status: string;
  finding: string;
  source: string;
  url: string;
};

export type BuiltStep = {
  id: ReviewStepId;
  title: string;
  about: string;
  index: number;
  status: StepStatus;
  saved: StepMark | null;
  findings: { source: string; status: string; text: string; url: string }[];
};

const STEP_META: Record<Exclude<ReviewStepId, "decision">, { title: string; about: string; keys: string[] }> = {
  identity: {
    title: "Identity and LinkedIn",
    about: "Name, email, phone, and the LinkedIn link the applicant typed. A matching format is not proof it is their account.",
    keys: ["email-syntax", "disposable-email", "role-address", "phone-state", "linkedin-format", "linkedin-fetch"],
  },
  card: {
    title: "Business card",
    about: "The card image on the application, if they uploaded one. Private Floor does not require a card.",
    keys: ["business-card"],
  },
  "card-match": {
    title: "Match the card to public records",
    about: "Whether a free public page ties the name on the card to the company. No card, or no public page, means this was not confirmed.",
    keys: ["website", "web-footprint"],
  },
  references: {
    title: "References",
    about: "People the applicant named who can speak for them. A name on the form is not a completed reference check.",
    keys: [],
  },
  company: {
    title: "Company and registry",
    about: "Website, SEC EDGAR, domain registration, and the state registry link. A state registry is not searched automatically.",
    keys: ["website", "edgar", "rdap", "business-registry"],
  },
  news: {
    title: "News and public footprint",
    about: "Headlines, court names, and other public mentions. A headline that only shares a name is a possible match. Verify it before you treat it as this person.",
    keys: ["news", "social-links", "courts", "web-footprint"],
  },
  risk: {
    title: "Sanctions and risk",
    about: "Sanctions lists, a duplicate of someone already on file, and the track-record note. A name on a list without a country or date of birth is not proof.",
    keys: ["sanctions", "duplicate", "text-risk", "velocity"],
  },
};

export function isReviewStepId(value: string): value is ReviewStepId {
  return (REVIEW_STEP_IDS as readonly string[]).includes(value);
}

export function isStepStatus(value: string): value is StepStatus {
  return (STEP_STATUSES as readonly string[]).includes(value);
}

export function emptyProgress(): ReviewProgress {
  return { version: 1, current: "identity", steps: {} };
}

export function parseReviewProgress(value: unknown): ReviewProgress {
  const base = emptyProgress();
  if (!value || typeof value !== "object") return base;
  const record = value as { current?: unknown; steps?: unknown };
  if (typeof record.current === "string" && isReviewStepId(record.current)) base.current = record.current;
  if (!record.steps || typeof record.steps !== "object") return base;
  for (const id of REVIEW_STEP_IDS) {
    const raw = (record.steps as Record<string, unknown>)[id];
    if (!raw || typeof raw !== "object") continue;
    const mark = raw as Partial<StepMark>;
    if (!mark.status || !isStepStatus(mark.status)) continue;
    base.steps[id] = {
      status: mark.status,
      note: typeof mark.note === "string" ? mark.note : "",
      evidenceUrl: typeof mark.evidenceUrl === "string" ? mark.evidenceUrl : "",
      skipReason: typeof mark.skipReason === "string" ? mark.skipReason : "",
      updatedAt: typeof mark.updatedAt === "string" ? mark.updatedAt : "",
    };
  }
  return base;
}

export function stepStatusLabel(status: StepStatus): string {
  if (status === "PASS") return "Pass";
  if (status === "CONCERN") return "Concern";
  if (status === "SKIPPED") return "Skipped";
  return "Not checked";
}

/** A skip is never a pass. Only an explicit pass counts. */
export function stepCountsAsPass(status: StepStatus): boolean {
  return status === "PASS";
}

/** Checklist rows on a member file. A note that starts with "Skipped:" is a skip, not a pass. */
export function displayCheckStatus(result: string, note: string): "Pass" | "Concern" | "Not checked" | "Skipped" {
  if (note.trim().toLowerCase().startsWith("skipped:")) return "Skipped";
  if (result === "PASS") return "Pass";
  if (result === "FAIL" || result === "NEEDS_INFO") return "Concern";
  return "Not checked";
}

export function publicFinding(status: string, finding: string): string {
  const text = finding.trim();
  if (status === "PASS") return text || "This check passed.";
  if (status === "FAIL") return text || "This check did not pass.";
  if (!text) return "Not confirmed. This check did not return a result.";
  return `Not confirmed. ${text}`;
}

function matchesKey(checkKey: string, keys: string[]): boolean {
  if (keys.includes(checkKey)) return true;
  if (keys.includes("news") && checkKey.startsWith("news")) return true;
  return false;
}

function derivedStatus(rows: StepEvidence[]): StepStatus {
  if (!rows.length) return "NOT_CHECKED";
  if (rows.some((row) => row.status === "FAIL")) return "CONCERN";
  if (rows.some((row) => row.status === "PASS")) return "PASS";
  return "NOT_CHECKED";
}

export function buildReviewSteps(input: {
  evidence: StepEvidence[];
  saved: ReviewProgress;
  references: string[];
  cardOnFile: boolean;
}): BuiltStep[] {
  const work = REVIEW_STEP_IDS.filter((id) => id !== "decision") as Exclude<ReviewStepId, "decision">[];
  const built: BuiltStep[] = work.map((id, index) => {
    const meta = STEP_META[id];
    const rows = input.evidence.filter((row) => matchesKey(row.checkKey, meta.keys));
    let status = derivedStatus(rows);
    if (id === "references" && input.references.length === 0) status = "NOT_CHECKED";
    if (id === "card" && !input.cardOnFile && !rows.some((row) => row.status === "PASS")) status = "NOT_CHECKED";
    const saved = input.saved.steps[id] || null;
    if (saved) status = saved.status;
    const findings = rows.map((row) => ({
      source: row.source || "Check",
      status: row.status,
      text: publicFinding(row.status, row.finding),
      url: row.url || "",
    }));
    if (id === "references") {
      findings.unshift({
        source: "Application",
        status: input.references.length ? "NO_DATA" : "NO_DATA",
        text: input.references.length
          ? `Not confirmed. They named ${input.references.join(", ")}. A name on the form is not a completed reference.`
          : "Not confirmed. They did not name a reference.",
        url: "",
      });
    }
    if (id === "card" && !input.cardOnFile) {
      findings.unshift({
        source: "Application",
        status: "NO_DATA",
        text: "Not confirmed. No business card was uploaded.",
        url: "",
      });
    }
    return { id, title: meta.title, about: meta.about, index: index + 1, status, saved, findings };
  });
  built.push({
    id: "decision",
    title: "Your decision",
    about: "Richard Osika approves every member. The grade is a recommendation.",
    index: built.length + 1,
    status: "NOT_CHECKED",
    saved: null,
    findings: [],
  });
  return built;
}

export function nextStepId(id: ReviewStepId): ReviewStepId {
  const index = REVIEW_STEP_IDS.indexOf(id);
  return REVIEW_STEP_IDS[Math.min(REVIEW_STEP_IDS.length - 1, index + 1)] || "decision";
}

export function previousStepId(id: ReviewStepId): ReviewStepId {
  const index = REVIEW_STEP_IDS.indexOf(id);
  return REVIEW_STEP_IDS[Math.max(0, index - 1)] || "identity";
}

export function skippedFrom(steps: BuiltStep[]): BuiltStep[] {
  return steps.filter((step) => step.id !== "decision" && step.status === "SKIPPED");
}
