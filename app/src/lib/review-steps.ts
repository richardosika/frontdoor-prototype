import { emptyPrefillFacts, suggestCompany, suggestOne, type PrefillFacts, type StepSuggestion } from "@/lib/guided-prefill";

/**
 * Guided review on an application file. A saved skip is not a pass.
 * Automated findings are shown with their source. A check that did not pass is not described as confirmed.
 */

export const REVIEW_STEP_IDS = ["identity", "card", "card-match", "references", "company", "news", "risk", "decision"] as const;
export type ReviewStepId = (typeof REVIEW_STEP_IDS)[number];

export const STEP_STATUSES = ["PASS", "CONCERN", "FAIL", "COULDNT_VERIFY", "NOT_CHECKED", "SKIPPED"] as const;
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
  corroborates?: boolean;
};

/**
 * Items that were not corroborated about the person.
 * A company-name SEC hit can auto-pass the company step and still leave this unverified.
 */
export function unverifiedPersonItems(evidence: { checkKey: string; status: string; corroborates?: boolean }[]): string[] {
  const personTied = evidence.some((row) => row.status === "PASS" && row.corroborates === true);
  return personTied ? [] : ["person-to-company link"];
}

export function approveConfirmMessage(input: { dues: string; extra?: string; unverified: string[] }): string {
  const extra = input.extra ? ` ${input.extra}` : "";
  const unverified = input.unverified.length
    ? ` Unverified: ${input.unverified.join(", ")}. A company that exists is not the same as this applicant being connected to it.`
    : "";
  return `${input.dues}${extra}${unverified}`;
}

export type BuiltStep = {
  id: ReviewStepId;
  title: string;
  about: string;
  index: number;
  status: StepStatus;
  saved: StepMark | null;
  prefill: StepSuggestion | null;
  findings: { source: string; status: string; text: string; url: string }[];
};

const STEP_META: Record<Exclude<ReviewStepId, "decision">, { title: string; about: string; keys: string[] }> = {
  identity: {
    title: "Identity and LinkedIn",
    about: "Name, company, and city searched on the open web, LinkedIn, and the major social platforms. A blocked site is not a not-found result, and it is not a pass.",
    keys: [
      "email-syntax",
      "disposable-email",
      "role-address",
      "phone-state",
      "linkedin-format",
      "linkedin-fetch",
      "web-footprint",
      "screen-web",
      "website",
      "screen-news",
      "screen-x",
      "screen-facebook",
      "screen-instagram",
      "screen-youtube",
      "screen-tiktok",
      "news",
    ],
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
    about: "Website, SEC EDGAR, domain registration, and the state registry. NY, CT, CO, OR, and PA are exact-name company checks. NJ, WA, IA, and other states without a free API are a manual link.",
    keys: ["website", "edgar", "rdap", "business-registry"],
  },
  news: {
    title: "News and public footprint",
    about: "Headlines and public social pages. Each platform shows the link, whether the name, company, and city matched, and a confidence. A blocked platform was not checked.",
    keys: ["news", "news-story", "social-links", "courts", "web-footprint", "screen-web", "screen-news", "screen-x", "screen-facebook", "screen-instagram", "screen-youtube", "screen-tiktok"],
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

/** `?step=5` and `?step=company` both open the same step. There are 8 steps, and the last one is the decision. */
export function reviewStepFromQuery(value: string | undefined, fallback: ReviewStepId = "identity"): ReviewStepId {
  if (!value) return fallback;
  if (isReviewStepId(value)) return value;
  const index = Number(value);
  if (Number.isInteger(index) && index >= 1 && index <= REVIEW_STEP_IDS.length) return REVIEW_STEP_IDS[index - 1];
  return fallback;
}

export function applicantReviewTitles(): string[] {
  return [
    "Identity and LinkedIn",
    "Business card",
    "Match the card to public records",
    "References",
    "Company and registry",
    "News and public footprint",
    "Sanctions and risk",
    "Your decision",
  ];
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
  if (status === "FAIL") return "Fail";
  if (status === "COULDNT_VERIFY") return "Couldn't verify";
  if (status === "SKIPPED") return "Skipped";
  return "Not checked";
}

/** A skip is never a pass. Only an explicit pass counts. */
export function stepCountsAsPass(status: StepStatus): boolean {
  return status === "PASS";
}

/** Checklist rows on a member file. A note that starts with "Skipped:" is a skip, not a pass. */
export function displayCheckStatus(result: string, note: string): "Pass" | "Concern" | "Fail" | "Couldn't verify" | "Not checked" | "Skipped" {
  if (note.trim().toLowerCase().startsWith("skipped:")) return "Skipped";
  if (result === "PASS") return "Pass";
  if (result === "FAIL") return "Fail";
  if (result === "NEEDS_INFO") return "Concern";
  if (result === "NOT_PROVIDED" && /not checked/i.test(note)) return "Not checked";
  if (result === "NOT_PROVIDED") return "Couldn't verify";
  return "Not checked";
}

export function publicFinding(status: string, finding: string): string {
  const text = finding.trim();
  if (status === "PASS") return text || "This check passed.";
  if (status === "FAIL") return text || "This check did not pass.";
  if (status === "NOT_RUN" && /not checked/i.test(text)) return text;
  if (status === "UNAVAILABLE") {
    if (/couldn't check for free|could not be checked|could not be verified for free|couldn't verify for free/i.test(text)) return text;
    return text ? `${text} Couldn't check for free.` : "Couldn't check for free.";
  }
  if (!text) return "Not confirmed. This check did not return a result.";
  if (/^not confirmed\./i.test(text)) return text;
  return `Not confirmed. ${text}`;
}

function matchesKey(checkKey: string, keys: string[]): boolean {
  if (keys.includes(checkKey)) return true;
  if (keys.includes("news") && checkKey.startsWith("news")) return true;
  return false;
}

function reviewSuggestion(id: Exclude<ReviewStepId, "decision">, facts: PrefillFacts, evidence: StepEvidence[]): StepSuggestion {
  const rows = evidence.map((row) => ({
    checkKey: row.checkKey,
    status: row.status,
    finding: row.finding,
    source: row.source,
    url: row.url,
  }));
  if (id === "card") return suggestOne("license", { ...facts, cardOnFile: facts.cardOnFile }, rows);
  if (id === "card-match") return suggestOne("license", facts, rows);
  if (id === "company") return suggestCompany(facts, rows);
  if (id === "news") return suggestOne("track", facts, rows);
  if (id === "risk") {
    const sanctions = suggestOne("sanctions", facts, rows);
    const track = suggestOne("track", facts, rows);
    return sanctions.mark === "FAIL" || sanctions.mark === "CONCERN" ? sanctions : track.mark === "FAIL" || track.mark === "CONCERN" ? track : sanctions;
  }
  if (id === "identity") return suggestOne("identity", facts, rows);
  if (id === "references") return suggestOne("references", facts, rows);
  return suggestOne(id, facts, rows);
}

function statusFromSuggestion(mark: StepSuggestion["mark"]): StepStatus {
  if (mark === "PASS") return "PASS";
  if (mark === "CONCERN") return "CONCERN";
  if (mark === "FAIL") return "FAIL";
  return "COULDNT_VERIFY";
}

export function buildReviewSteps(input: {
  evidence: StepEvidence[];
  saved: ReviewProgress;
  references: string[];
  cardOnFile: boolean;
  facts?: Partial<PrefillFacts>;
}): BuiltStep[] {
  const facts = emptyPrefillFacts({ ...input.facts, referenceEmails: input.facts?.referenceEmails || input.references, cardOnFile: input.cardOnFile });
  const work = REVIEW_STEP_IDS.filter((id) => id !== "decision") as Exclude<ReviewStepId, "decision">[];
  const built: BuiltStep[] = work.map((id, index) => {
    const meta = STEP_META[id];
    const rows = input.evidence.filter((row) => matchesKey(row.checkKey, meta.keys));
    const prefill = reviewSuggestion(id, facts, input.evidence);
    let status = statusFromSuggestion(prefill.mark);
    const saved = input.saved.steps[id] || null;
    if (saved) status = saved.status;
    if (id === "risk" && !saved && status === "COULDNT_VERIFY") {
      const sanctionsRow = input.evidence.find((row) => row.checkKey === "sanctions");
      if (!sanctionsRow || sanctionsRow.status === "NOT_RUN") status = "NOT_CHECKED";
    }
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
    return { id, title: meta.title, about: meta.about, index: index + 1, status, saved, prefill, findings };
  });
  built.push({
    id: "decision",
    title: "Your decision",
    about: "Richard Osika approves every member. The grade is a recommendation.",
    index: built.length + 1,
    status: "NOT_CHECKED",
    saved: null,
    prefill: null,
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
