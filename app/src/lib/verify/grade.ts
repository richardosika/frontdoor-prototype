import { annualDuesCents } from "@/lib/dues";
import { roleLabel } from "@/lib/roles";
import { US_POSTAL_CODES, statedUsState } from "@/lib/verify/address";
import type { ApplicantFacts, CheckOutput, EvidenceStatus, Verdict } from "@/lib/verify/types";

/**
 * Letter grade for an admin file. Points are fixed. A missing, blocked, or empty
 * source earns 0 and still counts toward the possible total, so missing data
 * cannot raise the grade. Email domain and MX earn nothing.
 *
 * The recommendation is advice to Richard Osika. It does not approve or decline anyone.
 * There is no model call. The same structure is produced from the checks every time.
 */

export const RUBRIC_VERSION = "2026-10-25";

export const LETTERS = ["A", "B", "C", "D", "F"] as const;
export type Letter = (typeof LETTERS)[number];

export const RECOMMENDATIONS = ["APPROVE", "APPROVE WITH CONDITIONS", "NEEDS MORE INFO", "DECLINE"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export type Confidence = "High" | "Medium" | "Low";
export type AttentionSeverity = "High" | "Medium" | "Low";

/** Lowest score that still receives each letter, before caps. F is everything below D. */
export const LETTER_FLOORS = { A: 90, B: 80, C: 70, D: 60 } as const;

/**
 * Caps only move a letter down. They are the rules Richard asked to be able to read.
 * noCorroboration: no passing check that actually ties the person to the company.
 *   The letter stays below C. Point floors are unchanged.
 * ambiguousNews: a negative headline names the person and not the company or city.
 * reviewRedFlag: a disposable address that still has a public page, a sanctions name
 *   without country or date of birth, or fraud, sanctions, or a criminal charge tied to the
 *   person with the company or city. A company-level lawsuit is an attention item, not this cap.
 * hardRedFlag: corroborated sanctions, fraud-pattern text, disposable address with no
 *   website or LinkedIn, or an email that already belongs to a member or a declined applicant.
 * twoConflicts: two or more failed checks that disagree with the application.
 */
export const CAP_RULES = {
  noCorroboration: "D",
  /** One independent source can reach C. It cannot be an approval, and it cannot be an A or a B. */
  thinCorroboration: "C",
  ambiguousNews: "C",
  reviewRedFlag: "D",
  hardRedFlag: "F",
  twoConflicts: "C",
} as const satisfies Record<string, Letter>;

export const CONFIDENCE_RULES = {
  highMinRatio: 0.7,
  highMinCorroboration: 2,
  mediumMinRatio: 0.45,
  mediumMinCorroboration: 1,
} as const;

/** Fixed points. The keys are the check keys, except the completeness rows which come from the application. */
export const GRADE_WEIGHTS = {
  identity: {
    "email-syntax": 2,
    "disposable-email": 4,
    "role-address": 2,
    "phone-state": 3,
    "linkedin-format": 3,
    "linkedin-fetch": 4,
  },
  company: {
    website: 8,
    edgar: 6,
    "business-card": 4,
    rdap: 2,
    "business-registry": 2,
  },
  footprint: {
    "web-footprint": 8,
    news: 8,
    "social-links": 2,
  },
  risk: {
    sanctions: 8,
    duplicate: 6,
    "text-risk": 4,
    velocity: 2,
  },
  role: {
    plausibility: 8,
    "invite-source": 4,
  },
  completeness: {
    phone: 2,
    location: 2,
    contactPage: 2,
    statement: 2,
    card: 1,
    references: 1,
  },
} as const;

export type GradeWeightsMode = "standard" | "r2";

/**
 * R2 is off until Richard turns it on.
 * It moves the 4 LinkedIn-fetch points and the 2 registry points onto the website and the web footprint.
 * Letter floors stay A 90, B 80, C 70, D 60.
 */
export const GRADE_WEIGHTS_MODE: GradeWeightsMode = "standard";

type GradeWeightTable = {
  [Group in keyof typeof GRADE_WEIGHTS]: { [Key in keyof (typeof GRADE_WEIGHTS)[Group]]: number };
};

export function weightsFor(mode: GradeWeightsMode = GRADE_WEIGHTS_MODE): GradeWeightTable {
  if (mode !== "r2") return GRADE_WEIGHTS;
  return {
    ...GRADE_WEIGHTS,
    identity: { ...GRADE_WEIGHTS.identity, "linkedin-fetch": 0 },
    company: { ...GRADE_WEIGHTS.company, website: 11, "business-registry": 0 },
    footprint: { ...GRADE_WEIGHTS.footprint, "web-footprint": 11 },
  };
}

/** Points whose check did not run or did not answer. An inconclusive EDGAR row stays in the denominator. */
export function r2CheckablePossible(checks: CheckOutput[], weights: GradeWeightTable = weightsFor("r2")): number {
  const pairs: [string, number][] = [
    ["email-syntax", weights.identity["email-syntax"]],
    ["disposable-email", weights.identity["disposable-email"]],
    ["role-address", weights.identity["role-address"]],
    ["phone-state", weights.identity["phone-state"]],
    ["linkedin-format", weights.identity["linkedin-format"]],
    ["linkedin-fetch", weights.identity["linkedin-fetch"]],
    ["website", weights.company.website],
    ["edgar", weights.company.edgar],
    ["business-card", weights.company["business-card"]],
    ["rdap", weights.company.rdap],
    ["business-registry", weights.company["business-registry"]],
    ["web-footprint", weights.footprint["web-footprint"]],
    ["news", weights.footprint.news],
    ["social-links", weights.footprint["social-links"]],
    ["sanctions", weights.risk.sanctions],
    ["duplicate", weights.risk.duplicate],
    ["text-risk", weights.risk["text-risk"]],
    ["velocity", weights.risk.velocity],
    ["plausibility", weights.role.plausibility],
    ["invite-source", weights.role["invite-source"]],
  ];
  let excluded = 0;
  for (const [key, weight] of pairs) {
    const row = checks.find((check) => check.key === key);
    if (!row) continue;
    if (row.status === "NOT_RUN" || row.status === "UNAVAILABLE") {
      excluded += weight;
      continue;
    }
    if (key === "phone-state" && row.status === "INCONCLUSIVE" && /toll-free/i.test(row.finding)) excluded += weight;
  }
  return Math.max(0, 100 - excluded);
}

export const FREE_SOURCE_LIMIT =
  "Paid people-search, credit files, full court dockets, a logged-in LinkedIn page, and state registries that have no stable free API were not checked. A blocked source, or a source that came back empty, is not a clean result. Email domain and mail-server records are not treated as proof of identity.";

export type GradeFacts = Partial<ApplicantFacts> & { referenceCount?: number };

export type GradeCategory = {
  id: string;
  label: string;
  earned: number;
  possible: number;
  reason: string;
};

export type AttentionItem = {
  severity: AttentionSeverity;
  title: string;
  detail: string;
};

export type ExecutiveSections = {
  applicant: string;
  company: string;
  checkedOut: string;
  didNotCheckOut: string;
  couldNotCheck: string;
  reasoning: string;
  nextStep: string;
};

export type GradeReport = {
  version: 1;
  rubricVersion: typeof RUBRIC_VERSION;
  gradedAt: string;
  letter: Letter;
  score: number;
  rawScore: number;
  confidence: Confidence;
  recommendation: Recommendation;
  categories: GradeCategory[];
  attention: AttentionItem[];
  summary: ExecutiveSections;
  banner: string | null;
  caps: string[];
  changeNote: string;
  plainText: string;
};

type Line = { earned: number; possible: number; reason: string };

const CATEGORY_LABELS = {
  identity: "Identity and contact",
  company: "Company legitimacy",
  footprint: "Public footprint and reputation",
  risk: "Risk and sanctions",
  role: "Role fit and plausibility",
  completeness: "Completeness of application",
} as const;

export function letterFromScore(score: number): Letter {
  if (score >= LETTER_FLOORS.A) return "A";
  if (score >= LETTER_FLOORS.B) return "B";
  if (score >= LETTER_FLOORS.C) return "C";
  if (score >= LETTER_FLOORS.D) return "D";
  return "F";
}

export function capLetter(letter: Letter, ceiling: Letter): Letter {
  return LETTERS.indexOf(letter) < LETTERS.indexOf(ceiling) ? ceiling : letter;
}

function findCheck(checks: CheckOutput[], key: string): CheckOutput | undefined {
  return checks.find((check) => check.key === key);
}

function passed(check: CheckOutput | undefined): boolean {
  return check?.status === "PASS";
}

/** Fixture rows stand in for a live source on the offline sample. A live pass wins. */
function passedKey(checks: CheckOutput[], key: string, fixtureKey?: string): boolean {
  if (passed(findCheck(checks, key))) return true;
  return fixtureKey ? passed(findCheck(checks, fixtureKey)) : false;
}

function sourceOf(checks: CheckOutput[], key: string, fixtureKey?: string): string {
  const live = findCheck(checks, key);
  if (live?.status === "PASS") return live.source;
  const fixture = fixtureKey ? findCheck(checks, fixtureKey) : undefined;
  if (fixture?.status === "PASS") return fixture.source;
  return live?.source || fixture?.source || "the check";
}

function award(earned: boolean, possible: number, yes: string, no: string): Line {
  return {
    earned: earned ? possible : 0,
    possible,
    reason: earned ? `${yes} (${possible} of ${possible}).` : `${no} (0 of ${possible}).`,
  };
}

/** Half of a person-and-company award, and never the full amount. A zero-weight row stays zero. */
function companyOnlyPoints(possible: number): number {
  if (possible <= 1) return 0;
  return Math.floor(possible / 2);
}

function unavailableLine(possible: number, reason: string, mode: GradeWeightsMode): Line {
  if (mode === "r2") return { earned: 0, possible: 0, reason: `${reason}.` };
  return { earned: 0, possible, reason: `${reason} (0 of ${possible}).` };
}

function sumLines(lines: Line[]): { earned: number; possible: number; reason: string } {
  const earned = lines.reduce((sum, line) => sum + line.earned, 0);
  const possible = lines.reduce((sum, line) => sum + line.possible, 0);
  return { earned, possible, reason: lines.map((line) => line.reason).join(" ") };
}

function dataChecks(checks: CheckOutput[]): CheckOutput[] {
  return checks.filter((check) => check.weight > 0);
}

function withData(check: CheckOutput): boolean {
  return check.status === "PASS" || check.status === "FAIL";
}

export function corroboratingPasses(checks: CheckOutput[]): CheckOutput[] {
  return checks.filter((check) => check.status === "PASS" && check.corroborates && !check.selfReported);
}

function confidenceOf(checks: CheckOutput[]): Confidence {
  const counted = dataChecks(checks);
  const ratio = counted.length ? counted.filter(withData).length / counted.length : 0;
  const corroboration = corroboratingPasses(checks).length;
  if (corroboration === 0) return "Low";
  if (ratio >= CONFIDENCE_RULES.highMinRatio && corroboration >= CONFIDENCE_RULES.highMinCorroboration) return "High";
  if (ratio >= CONFIDENCE_RULES.mediumMinRatio || corroboration >= CONFIDENCE_RULES.mediumMinCorroboration) return "Medium";
  return "Low";
}

function isHardSanctions(check: CheckOutput): boolean {
  return (check.key === "sanctions" || check.key === "opensanctions") && Boolean(check.hardFlag);
}

function isPossibleSanctions(check: CheckOutput): boolean {
  return (check.key === "sanctions" || check.key === "opensanctions") && Boolean(check.reviewFlag) && !check.hardFlag;
}

function isDisposableHard(check: CheckOutput): boolean {
  return check.key === "disposable-email" && Boolean(check.hardFlag);
}

function isDisposableReview(check: CheckOutput): boolean {
  return check.key === "disposable-email" && check.status === "FAIL" && !check.hardFlag;
}

function isFraudText(check: CheckOutput): boolean {
  return check.key === "text-risk" && Boolean(check.hardFlag);
}

function isDuplicate(check: CheckOutput): boolean {
  return check.key === "duplicate" && (Boolean(check.hardFlag) || check.status === "FAIL");
}

function isDeclinedDuplicate(check: CheckOutput): boolean {
  return isDuplicate(check) && /declined|banned/i.test(check.finding);
}

function isCompanyLawsuitOnly(check: CheckOutput): boolean {
  return /company-level litigation|^Company litigation ·/i.test(check.finding);
}

function isDepartureOrSuffix(check: CheckOutput): boolean {
  return /may no longer be at|different generational suffix|^Departure ·|^Different suffix ·/i.test(check.finding);
}

function isAmbiguousNews(check: CheckOutput): boolean {
  if (check.key !== "news" && check.key !== "news-story") return false;
  if (check.status === "FAIL") return false;
  if (isCompanyLawsuitOnly(check) || isDepartureOrSuffix(check)) return false;
  return Boolean(check.reviewFlag) || /possible match/i.test(check.finding);
}

function isCorroboratedNegative(check: CheckOutput): boolean {
  if (check.key !== "news" && check.key !== "web-footprint" && check.key !== "courts") return false;
  if (check.status === "FAIL" && (check.key === "news" || check.reviewFlag)) return true;
  return Boolean(check.reviewFlag) && /possible match/i.test(check.finding) && (check.key === "courts" || check.key === "web-footprint");
}

function isConflict(check: CheckOutput): boolean {
  if (check.key === "news-story") return false;
  if (check.status !== "FAIL" || check.hardFlag) return false;
  if (isDisposableReview(check) || isPossibleSanctions(check) || isCorroboratedNegative(check)) return false;
  return true;
}

function joinSentences(lines: string[]): string {
  const unique = lines.map((line) => line.trim()).filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of unique) {
    if (seen.has(line)) continue;
    seen.add(line);
    kept.push(line);
  }
  return kept.join(" ");
}

function passSentence(check: CheckOutput): string | null {
  if (check.status !== "PASS") return null;
  const source = check.source || "the check";
  switch (check.key) {
    case "email-syntax":
      return `The email address is well formed (${source}).`;
    case "disposable-email":
      return `The email domain is not on the disposable-address list (${source}).`;
    case "role-address":
      return `The email is a personal address, not a shared inbox (${source}).`;
    case "phone-state":
      return `The phone area code fits the state on the application (${source}).`;
    case "linkedin-format":
      return `The LinkedIn link looks like a public profile (${source}).`;
    case "linkedin-fetch":
      if (check.companyOnly) return `The LinkedIn company page confirms the company. company confirmed, person NOT confirmed (${source}). A logged-in page was not opened.`;
      return `A public LinkedIn page included the person's name (${source}). A logged-in page was not opened.`;
    case "duplicate":
      return `This email is not already a member and does not match a declined application (${source}).`;
    case "sanctions":
      return `No sanctions-list name matched on the lists that were loaded (${source}).`;
    case "text-risk":
      return `The note about their work has no fraud-pattern phrasing (${source}).`;
    case "velocity":
      return `This email was not used for a burst of applications (${source}).`;
    case "plausibility":
      return `The name, company, and role are filled in and can be read (${source}).`;
    case "invite-source":
      return `A referral or request code is on the file (${source}).`;
    case "social-links":
      return `The other social links are full web addresses (${source}). Those pages were not opened.`;
    case "website":
    case "fixture-website":
      if (check.companyOnly) return `The company's own site confirms the company. company confirmed, person NOT confirmed (${source}).`;
      return `A public web page included the person or the company name (${source}).`;
    case "edgar":
    case "fixture-edgar":
      return `SEC EDGAR returned a hit for the company name (${source}). Someone still needs to confirm it is the same firm.`;
    case "rdap":
      return `A domain registration record responded (${source}). That is a weak signal, not proof of who the person is.`;
    case "business-card":
      return `The business card text includes the name and company on the application (${source}).`;
    case "web-footprint":
    case "fixture-web":
      return `A public web result names both the person and the company (${source}).`;
    case "news":
      return `A headline names both the person and the company and does not tie them to a problem (${source}).`;
    default:
      if (check.key.startsWith("screen-")) {
        return `${labelFor(check.key)} returned a public result that names this person and this company (${source}). ${scoreClause(check)}`.trim();
      }
      return null;
  }
}

function scoreClause(check: CheckOutput): string {
  const score = check.finding.match(/Name: [^.]+\. Company: [^.]+\. City: [^.]+\. Confidence: [^.]+\./);
  return score?.[0] || "";
}

/** YouTube, TikTok, and news count only when the person is named with the company or the city. */
function socialScoreQualified(score: string): boolean {
  return /Name: yes\./.test(score) && (/Company: yes\./.test(score) || /City: yes\./.test(score));
}

function failSentence(check: CheckOutput): string | null {
  if (check.status !== "FAIL") return null;
  const source = check.source || "the check";
  if (isHardSanctions(check)) {
    return `A sanctions list name matches, and the location or date of birth on the application lines up with the list entry (${source}). Confirm the entry before you decide.`;
  }
  if (isPossibleSanctions(check)) {
    return `A sanctions list has a similar name, without the same country or date of birth (${source}). Possible match, verify. This is not a confirmed hit.`;
  }
  if (isDisposableHard(check) || isDisposableReview(check)) {
    return `The email domain is disposable (${source}).`;
  }
  if (isFraudText(check)) {
    return `The write-up matches a fraud pattern: guaranteed returns together with a request to send funds (${source}).`;
  }
  if (isDeclinedDuplicate(check)) {
    return `This email matches a person who was already declined (${source}).`;
  }
  if (isDuplicate(check)) {
    return `This email already belongs to a member (${source}).`;
  }
  if (check.key === "news" && check.status === "FAIL") {
    return `A headline names this person together with the company or city, near a negative word (${source}). Possible match, verify. This is not proof of wrongdoing.`;
  }
  if (check.key === "phone-state" && check.status === "FAIL") {
    return `The phone area code does not match the state on the application (${source}).`;
  }
  if ((check.key === "website" || check.key === "rdap") && /domain does not resolve/i.test(check.finding)) {
    return `domain does not resolve (${source}).`;
  }
  if (check.key === "rdap" && /did not check out/i.test(check.finding)) {
    return `did not check out (${source}).`;
  }
  if (check.key === "address") {
    return `address did not check out (${source}).`;
  }
  if (check.key === "website" && check.status === "FAIL") {
    return `The website responded, but the person and company names were not on the home page, the about page, or the team page (${source}).`;
  }
  if (check.key === "business-card" && check.status === "FAIL") {
    return `The business card text does not match the name and company on the application (${source}).`;
  }
  if (check.key === "role-address" && check.status === "FAIL") {
    return `The email looks like a shared inbox (${source}).`;
  }
  if (check.key === "plausibility" && check.status === "FAIL") {
    return `The name or company looks incomplete (${source}).`;
  }
  if (check.key === "velocity" && check.status === "FAIL") {
    return `Several applications used this email in the last hour (${source}).`;
  }
  if (check.key === "text-risk" && check.status === "FAIL") {
    return `The write-up looks unreadable (${source}).`;
  }
  if (check.key === "linkedin-format" && check.status === "FAIL") {
    return `The LinkedIn link is not a public profile or company page (${source}).`;
  }
  if (check.key === "email-syntax" && check.status === "FAIL") {
    return `The email address is not well formed (${source}).`;
  }
  if (check.status === "FAIL") return `${check.finding} (${source}).`;
  return null;
}

function uncheckedSentence(check: CheckOutput): string | null {
  if (check.key === "news-story" || check.key === "email-provider" || check.key === "mx") return null;
  if (check.status !== "INCONCLUSIVE" && check.status !== "NOT_RUN" && check.status !== "UNAVAILABLE") return null;
  if (check.key === "invite-source") {
    if (check.status === "NOT_RUN" || /no referral|no invite (code|note) was stored/i.test(check.finding)) return "No referral was supplied.";
    return "The referral could not be matched.";
  }
  if (check.key === "address" && check.status === "UNAVAILABLE") {
    return "The address is not checkable. The Census geocoder timed out or did not respond. This is not a pass and not a failure.";
  }
  const source = check.source || check.key;
  if (check.status === "UNAVAILABLE") {
    return `${labelFor(check.key)} could not be checked because ${source} was blocked, timed out, or did not answer. Couldn't check for free.`;
  }
  if (check.key === "screen-youtube" || check.key === "screen-tiktok" || check.key === "screen-news") {
    const score = scoreClause(check);
    if (score && socialScoreQualified(score)) {
      return `${labelFor(check.key)} returned a public result. ${score} That is evidence on the file. It is not a pass.`;
    }
    return `${labelFor(check.key)}: no match found. ${score}`.replace(/\s+/g, " ").trim();
  }
  if (check.key.startsWith("screen-")) {
    const score = scoreClause(check);
    if (score) return `${labelFor(check.key)} returned a public result. ${score} That is evidence on the file. It is not a pass.`;
  }
  if (check.status === "NOT_RUN") {
    return `${labelFor(check.key)} was not run. ${check.finding}`.replace(/\s+/g, " ").trim();
  }
  return `${labelFor(check.key)} came back without a usable match (${source}). That is not a clean result.`;
}

function labelFor(key: string): string {
  const labels: Record<string, string> = {
    "email-syntax": "Email syntax",
    "disposable-email": "Disposable-email check",
    "role-address": "Shared-inbox check",
    "phone-state": "Phone area code",
    "linkedin-format": "LinkedIn link",
    "linkedin-fetch": "Public LinkedIn page",
    duplicate: "Duplicate check",
    sanctions: "Sanctions check",
    "text-risk": "Write-up check",
    velocity: "Repeat-application check",
    plausibility: "Name and company check",
    "invite-source": "Referral",
    "social-links": "Social links",
    website: "Company website",
    edgar: "SEC EDGAR",
    rdap: "Domain registration",
    "business-card": "Business card",
    "business-registry": "State business registry",
    "web-footprint": "Public web search",
    "screen-web": "Public web search",
    "screen-news": "News search",
    "screen-x": "X",
    "screen-facebook": "Facebook",
    "screen-instagram": "Instagram",
    "screen-youtube": "YouTube",
    "screen-tiktok": "TikTok",
    news: "News search",
    courts: "Court search",
    address: "Address",
  };
  return labels[key] || key;
}

function quoteStatement(value: string | undefined): string {
  const text = (value || "").trim();
  if (!text) return "They did not write what they do.";
  const short = text.length > 280 ? `${text.slice(0, 277)}...` : text;
  return `They say: “${short}”`;
}

function applicantSection(facts: GradeFacts, subject: string): string {
  const name = facts.applicantName || facts.name || "This applicant";
  const org = facts.org?.trim() || "a company they did not name";
  const role = roleLabel(facts.role);
  const location = facts.location?.trim() || "no location was given";
  const invite = facts.inviteNote?.trim() ? `They came in through a referral or request: ${facts.inviteNote.trim()}.` : "No referral was supplied.";
  const requestOnly =
    facts.applicationSubmitted === false
      ? "Referral or request only — no application submitted; grade based on request fields only."
      : "";
  if (subject === "COMPANY") {
    return `${requestOnly} This is the company file for ${facts.org?.trim() || facts.name || "the company on the application"}. The applicant is ${name}. ${quoteStatement(facts.statement)} ${invite}`.trim();
  }
  return `${requestOnly} ${name} applied as a ${role} at ${org}, ${location}. ${quoteStatement(facts.statement)} ${invite}`.trim();
}

function companySection(checks: CheckOutput[], facts: GradeFacts): string {
  const org = facts.org?.trim() || facts.name?.trim() || "The company";
  const evidence: string[] = [`${org} is the company named on the application.`];
  const website = findCheck(checks, "website") || findCheck(checks, "fixture-website");
  if (website?.status === "PASS" && website.companyOnly) {
    evidence.push(`The company's own site names the company. company confirmed, person NOT confirmed (${website.source}).`);
  } else if (website?.status === "PASS") {
    evidence.push(`A public page included the person or the company name (${website.source}).`);
  } else if (website?.status === "UNAVAILABLE") {
    evidence.push("The company website is not checkable for free.");
  } else if (website?.status === "FAIL" && /domain does not resolve/i.test(website.finding)) {
    evidence.push("domain does not resolve.");
  } else {
    evidence.push("No company website was confirmed.");
  }
  if (passedKey(checks, "edgar", "fixture-edgar")) {
    evidence.push(`SEC EDGAR returned a hit for the company name (${sourceOf(checks, "edgar", "fixture-edgar")}). Confirm it is the same firm before you rely on it.`);
  } else {
    evidence.push("No EDGAR filing was confirmed.");
  }
  if (passedKey(checks, "web-footprint", "fixture-web")) {
    evidence.push(`A public web result names the person and the company (${sourceOf(checks, "web-footprint", "fixture-web")}).`);
  } else {
    evidence.push("No public web result confirmed the person and the company together.");
  }
  const news = findCheck(checks, "news");
  if (passed(news)) evidence.push(`A headline names the person and the company (${news?.source || "News"}).`);
  else evidence.push("No news item was confirmed as this person at this company.");
  const courts = findCheck(checks, "courts");
  if (!courts || courts.status === "UNAVAILABLE" || courts.status === "NOT_RUN") {
    evidence.push("Court records were not checked, or the court source did not answer.");
  } else if (isCorroboratedNegative(courts)) {
    evidence.push("A court result may name this person and company near a serious word. Possible match, verify. It is not treated as a confirmed case.");
  } else if (courts.status === "PASS") {
    evidence.push("No record was found in CourtListener federal data. That is not a clearance of all litigation.");
  } else {
    evidence.push("The court search did not confirm a case against this person and company.");
  }
  const registry = findCheck(checks, "business-registry");
  if (registry?.status === "PASS") {
    evidence.push(registry.finding);
  } else if (registry?.status === "INCONCLUSIVE" || registry?.status === "UNAVAILABLE") {
    evidence.push(registry.finding);
  } else if (registry?.url) {
    evidence.push(`The state registry was not searched automatically. A manual link is on the file (${registry.source}).`);
  } else {
    evidence.push("No free state-registry search was run.");
  }
  evidence.push("Free sources cannot show ownership, good standing, credit, or that this person controls the company.");
  return joinSentences(evidence);
}

function usStateKnown(location: string | undefined): boolean {
  const state = statedUsState(location || "");
  return Boolean(state && US_POSTAL_CODES.has(state));
}

function payingRole(role: string | undefined): boolean {
  return annualDuesCents(role || "") > 0;
}

function portionLine(earned: number, possible: number, reason: string): Line {
  return { earned, possible, reason: `${reason} (${earned} of ${possible}).` };
}

function websiteAward(checks: CheckOutput[], possible: number, mode: GradeWeightsMode): Line {
  const row = findCheck(checks, "website") || findCheck(checks, "fixture-website");
  if (row?.status === "UNAVAILABLE") return unavailableLine(possible, "The company website is not checkable for free", mode);
  if (row?.status === "FAIL" && /domain does not resolve/i.test(row.finding)) return portionLine(0, possible, "domain does not resolve");
  if (row?.status === "PASS" && row.companyOnly) return portionLine(companyOnlyPoints(possible), possible, "company confirmed, person NOT confirmed");
  return award(row?.status === "PASS", possible, "A public website includes the person or company", "No website confirmed the person or company");
}

function linkedinAward(row: CheckOutput | undefined, possible: number, mode: GradeWeightsMode): Line {
  if (possible <= 0) {
    return award(Boolean(row?.status === "PASS" && !row.companyOnly), possible, "A public LinkedIn page included the name", "A public LinkedIn page did not confirm the name");
  }
  if (row?.status === "UNAVAILABLE") return unavailableLine(possible, "The LinkedIn page is not checkable for free", mode);
  if (row?.status === "PASS" && row.companyOnly) return portionLine(companyOnlyPoints(possible), possible, "company confirmed, person NOT confirmed");
  return award(row?.status === "PASS", possible, "A public LinkedIn page included the name", "A public LinkedIn page did not confirm the name");
}

function footprintAward(row: CheckOutput | undefined, earned: boolean, possible: number, mode: GradeWeightsMode): Line {
  if (!earned && row?.status === "UNAVAILABLE") return unavailableLine(possible, "Web search is not checkable for free", mode);
  return award(earned, possible, "A public web result names the person and the company", "No public web result confirmed the person and the company");
}

function phoneAward(row: CheckOutput | undefined, possible: number): Line {
  if (row?.status === "INCONCLUSIVE" && /toll-free/i.test(row.finding)) {
    return { earned: 0, possible: 0, reason: "The phone is toll-free, so the area code is not applicable." };
  }
  return award(passed(row), possible, "The phone area code fits the state", "The phone area code was not confirmed against the state");
}

function rdapAward(row: CheckOutput | undefined, possible: number): Line {
  if (row?.status === "FAIL" && /domain does not resolve/i.test(row.finding)) return portionLine(0, possible, "domain does not resolve");
  if (row?.status === "FAIL" && /did not check out/i.test(row.finding)) return portionLine(0, possible, "did not check out");
  return award(passed(row), possible, "A domain record responded", "No domain record was confirmed");
}

function registryAward(row: CheckOutput | undefined, possible: number, mode: GradeWeightsMode): Line {
  if (!row || row.status === "NOT_RUN") {
    return award(false, possible, "A free state registry has this exact company name", "The state registry is not searched for free");
  }
  if (row.status === "UNAVAILABLE") return unavailableLine(possible, "The state registry is not checkable for free", mode);
  return award(
    row.status === "PASS",
    possible,
    "A free state registry has this exact company name",
    "The state registry did not confirm this exact company name",
  );
}

function locationAward(checks: CheckOutput[], facts: GradeFacts, possible: number): Line {
  const row = findCheck(checks, "address");
  if (!row) return award(Boolean(facts.location?.trim()), possible, "A location is on the application", "No location is on the application");
  if (row.status === "FAIL") return portionLine(0, possible, "address did not check out");
  if (row.status === "UNAVAILABLE") return { earned: 0, possible: 0, reason: "The address is not checkable." };
  if (row.status === "PASS") return award(true, possible, "A location is on the application", "No location is on the application");
  return award(Boolean(facts.location?.trim()), possible, "A location is on the application", "No location is on the application");
}

function inviteAward(row: CheckOutput | undefined, possible: number, mode: GradeWeightsMode, facts: GradeFacts): Line {
  if (row?.status === "FAIL") return portionLine(0, possible, "The referral or request code was supplied but is not valid");
  const absent = !facts.inviteNote?.trim() || row?.status === "NOT_RUN" || /no referral|no invite (code|note) was stored/i.test(row?.finding || "");
  if (absent && mode === "r2") return { earned: 0, possible: 0, reason: "No referral was supplied." };
  if (absent) return portionLine(0, possible, "No referral was supplied");
  if (row?.status === "INCONCLUSIVE") return portionLine(0, possible, "The referral could not be matched");
  if (row?.status === "PASS") return award(true, possible, "A referral or request code is on the file", "No referral was supplied");
  return { earned: 0, possible, reason: "No referral was supplied." };
}

export function gradeChecks(
  checks: CheckOutput[],
  facts: GradeFacts = {},
  options?: { gradedAt?: string; subject?: string; weightsMode?: GradeWeightsMode },
): GradeReport {
  const weightsMode = options?.weightsMode || GRADE_WEIGHTS_MODE;
  const weights = weightsFor(weightsMode);
  const edgarPass = passedKey(checks, "edgar", "fixture-edgar");
  const footprintRow = findCheck(checks, "web-footprint");
  const thirdPartyFootprint = passed(footprintRow) && !footprintRow?.selfReported;
  const webPass =
    thirdPartyFootprint ||
    passed(findCheck(checks, "fixture-web")) ||
    checks.some((item) => item.key.startsWith("screen-") && item.status === "PASS" && item.corroborates && !item.selfReported);
  const card = findCheck(checks, "business-card");
  const linkedin = findCheck(checks, "linkedin-fetch");

  const independent = corroboratingPasses(checks).length > 0;
  const linkedinPerson = passed(linkedin) && !linkedin?.companyOnly;
  const identity = sumLines([
    award(passed(findCheck(checks, "email-syntax")), weights.identity["email-syntax"], "The email address is well formed", "The email address is missing or not well formed"),
    award(passed(findCheck(checks, "disposable-email")), weights.identity["disposable-email"], "The email domain is not disposable", "The disposable-email check did not pass"),
    award(passed(findCheck(checks, "role-address")), weights.identity["role-address"], "The email is not a shared inbox", "The shared-inbox check did not pass"),
    phoneAward(findCheck(checks, "phone-state"), weights.identity["phone-state"]),
    award(
      passed(findCheck(checks, "linkedin-format")) && (linkedinPerson || independent),
      weights.identity["linkedin-format"],
      "The LinkedIn link looks like a public profile",
      "No usable LinkedIn link was confirmed",
    ),
    linkedinAward(linkedin, weights.identity["linkedin-fetch"], weightsMode),
  ]);
  const company = sumLines([
    websiteAward(checks, weights.company.website, weightsMode),
    award(edgarPass, weights.company.edgar, "EDGAR returned a company-name hit", "No EDGAR hit was confirmed"),
    award(passed(card), weights.company["business-card"], "The business card matches the name and company", "No matching business card was confirmed"),
    rdapAward(findCheck(checks, "rdap"), weights.company.rdap),
    registryAward(findCheck(checks, "business-registry"), weights.company["business-registry"], weightsMode),
  ]);
  const footprint = sumLines([
    footprintAward(footprintRow, webPass, weights.footprint["web-footprint"], weightsMode),
    award(passed(findCheck(checks, "news")), weights.footprint.news, "A headline names the person and the company", "No headline confirmed the person at the company"),
    award(
      passed(findCheck(checks, "social-links")) && independent,
      weights.footprint["social-links"],
      "Social links are full web addresses",
      "Social links were missing or not usable",
    ),
  ]);
  const risk = sumLines([
    award(passed(findCheck(checks, "sanctions")), weights.risk.sanctions, "The loaded sanctions lists had no name match", "Sanctions were not cleared"),
    award(passed(findCheck(checks, "duplicate")), weights.risk.duplicate, "The email is not a known member or a declined applicant", "The duplicate check did not pass"),
    award(passed(findCheck(checks, "text-risk")), weights.risk["text-risk"], "The write-up has no fraud-pattern phrasing", "The write-up was not cleared"),
    award(passed(findCheck(checks, "velocity")), weights.risk.velocity, "There was no burst of applications", "The repeat-application check did not pass"),
  ]);
  const role = sumLines([
    award(passed(findCheck(checks, "plausibility")), weights.role.plausibility, "The name, company, and role are readable", "The name, company, or role is not readable"),
    inviteAward(findCheck(checks, "invite-source"), weights.role["invite-source"], weightsMode, facts),
  ]);
  const statementOk = (facts.statement || "").trim().length >= 40;
  const contactPage = Boolean(facts.website?.trim() || facts.linkedinUrl?.trim());
  const completeness = sumLines([
    award(Boolean(facts.phone?.trim()), weights.completeness.phone, "A phone number is on the application", "No phone number is on the application"),
    locationAward(checks, facts, weights.completeness.location),
    award(contactPage, weights.completeness.contactPage, "A website or LinkedIn URL is on the application", "No website or LinkedIn URL is on the application"),
    award(statementOk, weights.completeness.statement, "They wrote a track-record note", "The track-record note is missing or very short"),
    award(Boolean(facts.cardUploaded || facts.cardText?.trim()), weights.completeness.card, "A business card is on the file", "No business card was uploaded"),
    award((facts.referenceCount || 0) > 0, weights.completeness.references, "A reference email is on the file", "No reference email is on the file"),
  ]);

  const categories: GradeCategory[] = [
    { id: "identity", label: CATEGORY_LABELS.identity, ...identity, reason: `${identity.earned} of ${identity.possible}. ${identity.reason} Email domain and mail-server records earn no points.` },
    { id: "company", label: CATEGORY_LABELS.company, ...company, reason: `${company.earned} of ${company.possible}. ${company.reason}` },
    { id: "footprint", label: CATEGORY_LABELS.footprint, ...footprint, reason: `${footprint.earned} of ${footprint.possible}. ${footprint.reason}` },
    { id: "risk", label: CATEGORY_LABELS.risk, ...risk, reason: `${risk.earned} of ${risk.possible}. ${risk.reason}` },
    { id: "role", label: CATEGORY_LABELS.role, ...role, reason: `${role.earned} of ${role.possible}. ${role.reason}` },
    { id: "completeness", label: CATEGORY_LABELS.completeness, ...completeness, reason: `${completeness.earned} of ${completeness.possible}. ${completeness.reason}` },
  ];

  const earnedPoints = Math.max(0, Math.min(100, categories.reduce((sum, category) => sum + category.earned, 0)));
  const checkablePoints = weightsMode === "r2" ? r2CheckablePossible(checks, weights) : 100;
  const rawScore =
    weightsMode === "r2"
      ? Math.max(0, Math.min(100, Math.round((100 * earnedPoints) / Math.max(checkablePoints, 1))))
      : earnedPoints;
  let letter = letterFromScore(rawScore);
  const caps: string[] = [];
  const banners: string[] = [];
  const applyCap = (ceiling: Letter, reason: string, banner?: string) => {
    const next = capLetter(letter, ceiling);
    if (next !== letter || letter === ceiling) caps.push(`Capped at ${ceiling}: ${reason}`);
    letter = next;
    if (banner) banners.push(banner);
  };

  const hardChecks = checks.filter((check) => isHardSanctions(check) || isFraudText(check) || isDisposableHard(check) || isDuplicate(check));
  if (hardChecks.length) {
    const reasons = hardChecks.map((check) => failSentence(check) || check.finding);
    applyCap(
      CAP_RULES.hardRedFlag,
      reasons[0] || "a hard red flag is on the file",
      `Red flag. Grade capped at F. ${reasons.join(" ")} This is a recommendation. Richard Osika still decides.`,
    );
  }
  const reviewRed = checks.filter((check) => isDisposableReview(check) || isPossibleSanctions(check) || isCorroboratedNegative(check));
  if (reviewRed.length) {
    const reasons = reviewRed.map((check) => failSentence(check) || check.finding);
    applyCap(
      CAP_RULES.reviewRedFlag,
      "a doubtful hit needs a human to verify it",
      `Needs a close look. Grade capped at D. ${reasons.join(" ")} This is not proof, and it is not an automatic decline.`,
    );
  }
  if (checks.some(isAmbiguousNews)) {
    applyCap(
      CAP_RULES.ambiguousNews,
      "a headline may be a different person with the same name",
    );
  }
  const conflicts = checks.filter(isConflict);
  if (conflicts.length >= 2) {
    applyCap(CAP_RULES.twoConflicts, "two or more checks disagree with the application");
  }
  const independentCount = corroboratingPasses(checks).length;
  if (independentCount === 0) {
    applyCap(CAP_RULES.noCorroboration, "no free source corroborated the person and the company");
  } else if (independentCount < 2) {
    applyCap(CAP_RULES.thinCorroboration, "fewer than two independent sources tied this person to this company");
  }

  const checked = checks.map(passSentence).filter((line): line is string => Boolean(line));
  const failed = checks.map(failSentence).filter((line): line is string => Boolean(line));
  const unchecked = checks.map(uncheckedSentence).filter((line): line is string => Boolean(line));
  const storyCount = checks.filter((check) => check.key === "news-story").length;
  if (storyCount) {
    unchecked.push(
      `${storyCount} headline${storyCount === 1 ? "" : "s"} ${storyCount === 1 ? "was" : "were"} saved for review. A headline that only matches a name is not treated as a confirmed fact.`,
    );
  }
  unchecked.push(FREE_SOURCE_LIMIT);

  const attention: AttentionItem[] = [];
  const pushAttention = (item: AttentionItem) => {
    if (attention.some((existing) => existing.title === item.title)) return;
    attention.push(item);
  };
  for (const check of hardChecks) {
    pushAttention({ severity: "High", title: labelFor(check.key), detail: failSentence(check) || check.finding });
  }
  for (const check of reviewRed) {
    pushAttention({
      severity: "High",
      title: `${labelFor(check.key)}: possible match, verify`,
      detail: failSentence(check) || "Possible match, verify. Do not treat this as a confirmed fact.",
    });
  }
  for (const check of checks.filter(isAmbiguousNews)) {
    pushAttention({
      severity: "High",
      title: "News headline may be a different person",
      detail: `Possible match, verify. ${check.finding} The match is a name only. This file does not say this person did what the headline describes.`,
    });
  }
  for (const check of checks) {
    if (!/possible match/i.test(check.finding)) continue;
    if (isAmbiguousNews(check) || isCorroboratedNegative(check) || isPossibleSanctions(check)) continue;
    pushAttention({
      severity: "Medium",
      title: `${labelFor(check.key)}: possible match, verify`,
      detail: `Possible match, verify. ${check.finding} This may be a different person with the same name.`,
    });
  }
  for (const check of conflicts) {
    pushAttention({ severity: "Medium", title: labelFor(check.key), detail: failSentence(check) || check.finding });
  }
  if (independentCount === 0) {
    const selfReported = checks.some((check) => check.status === "PASS" && check.selfReported);
    pushAttention({
      severity: "Medium",
      title: "Thin public record",
      detail: selfReported
        ? "The applicant's own website or card is one self-reported source. No independent source tied this person to this company. The grade stays below a C, and a thin file should not be read as clean."
        : "No free source tied this person to this company. The grade stays below a C, and a thin file should not be read as clean.",
    });
  } else if (independentCount < 2) {
    pushAttention({
      severity: "Medium",
      title: "Only one independent source",
      detail: "Only one independent source tied this person to this company. The applicant's own site and a self-reported card do not count. The grade cannot go above a C, and this is not an approval.",
    });
  }
  for (const check of checks) {
    if (check.key === "news" && /company-level litigation/i.test(check.finding)) {
      pushAttention({
        severity: "Medium",
        title: "Company litigation headline",
        detail: check.finding,
      });
    }
    if ((check.key === "news" || check.key === "website" || check.key === "web-footprint") && /may no longer be at/i.test(check.finding)) {
      pushAttention({
        severity: "Medium",
        title: "Headline may be a departure",
        detail: check.finding,
      });
    }
    if (/different generational suffix/i.test(check.finding)) {
      pushAttention({
        severity: "Medium",
        title: "Different generational suffix",
        detail: check.finding,
      });
    }
  }
  const phone = findCheck(checks, "phone-state");
  if (phone?.status === "INCONCLUSIVE" && /toll-free/i.test(phone.finding)) {
    pushAttention({
      severity: "Low",
      title: "Toll-free phone number",
      detail: phone.finding,
    });
  } else if (phone?.status === "INCONCLUSIVE" && /outside the stated state/i.test(phone.finding)) {
    pushAttention({
      severity: "Low",
      title: "Phone area code is outside the stated state",
      detail: phone.finding,
    });
  }
  const importantMissing = ["website", "edgar", "courts", "web-footprint", "news", "sanctions", "linkedin-fetch", "business-registry"].filter((key) => {
    const check = findCheck(checks, key);
    if (!check) return key !== "linkedin-fetch" || Boolean(facts.linkedinUrl?.trim());
    return check.status === "INCONCLUSIVE" || check.status === "NOT_RUN" || check.status === "UNAVAILABLE";
  });
  if (importantMissing.length) {
    pushAttention({
      severity: importantMissing.includes("sanctions") ? "High" : "Medium",
      title: "Sources that did not produce a result",
      detail: `${importantMissing.map(labelFor).join(", ")} did not confirm anything. Missing data is not a pass.`,
    });
  }
  if (!facts.website?.trim()) {
    pushAttention({ severity: "Low", title: "No company website on the application", detail: "Ask for the company site if you need one. A private email is allowed and is not scored as a key signal." });
  }
  if (!facts.linkedinUrl?.trim()) {
    pushAttention({ severity: "Low", title: "No LinkedIn URL", detail: "A public profile link would give you something else to open. Its absence is not a failure." });
  }
  if (!facts.cardUploaded && !facts.cardText?.trim()) {
    pushAttention({ severity: "Low", title: "No business card", detail: "The card is optional. You can ask for one before you decide." });
  }
  if ((facts.statement || "").trim().length < 40) {
    pushAttention({ severity: "Low", title: "Short track record", detail: "They wrote little about what they do, so the write-up could not be read for substance." });
  }
  if (!usStateKnown(facts.location)) {
    pushAttention({
      severity: "Low",
      title: "Location is outside the free US registry list",
      detail: "Phone area codes and the manual registry links cover a few US states only. A location elsewhere was not searched, and that is not a clean result.",
    });
  }
  if ((facts.referenceCount || 0) === 0) {
    pushAttention({ severity: "Low", title: "No references", detail: "Reference emails are optional. Ask for one if the rest of the file is thin." });
  }

  const score = rawScore;
  const confidence = confidenceOf(checks);
  const paying = payingRole(facts.role);
  const corroboration = corroboratingPasses(checks).length;
  const doubtfulHit = reviewRed.length > 0 || checks.some(isAmbiguousNews);
  let recommendation: Recommendation;
  if (hardChecks.length) recommendation = "DECLINE";
  else if (doubtfulHit || confidence === "Low" || corroboration < 2 || letter === "F" || letter === "D") recommendation = "NEEDS MORE INFO";
  else if (letter === "A" && confidence === "High" && conflicts.length === 0 && !paying && (facts.cardUploaded || facts.cardText?.trim())) {
    recommendation = "APPROVE";
  } else if (letter === "A" || letter === "B" || (letter === "C" && corroboration >= 2)) {
    recommendation = "APPROVE WITH CONDITIONS";
  } else recommendation = "NEEDS MORE INFO";

  const reasoning = reasoningFor({ recommendation, letter, score, confidence, paying, role: facts.role, hard: hardChecks.length > 0, review: reviewRed.length > 0 });
  const nextStep = nextStepFor({ recommendation, checks, facts, paying });
  const summary: ExecutiveSections = {
    applicant: applicantSection(facts, options?.subject || "APPLICATION"),
    company: companySection(checks, facts),
    checkedOut: checked.length ? joinSentences(checked) : "Nothing in the checks that ran confirmed a fact about this person or company.",
    didNotCheckOut: failed.length ? joinSentences(failed) : "Nothing in the checks that ran showed a direct conflict.",
    couldNotCheck: joinSentences(
      weightsMode === "r2"
        ? [
            ...unchecked,
            `Coverage: ${earnedPoints} of ${checkablePoints} checkable points, rescaled to ${rawScore} of 100. ${checkablePoints} of 100 rubric points were checkable for free. An EDGAR result with no registrant stays in that denominator. Letter floors are unchanged.`,
          ]
        : unchecked,
    ),
    reasoning,
    nextStep,
  };
  const reportWithoutPlain: Omit<GradeReport, "plainText"> = {
    version: 1,
    rubricVersion: RUBRIC_VERSION,
    gradedAt: options?.gradedAt || new Date().toISOString(),
    letter,
    score,
    rawScore,
    confidence,
    recommendation,
    categories,
    attention,
    summary,
    banner: banners.length ? joinSentences(banners) : null,
    caps,
    changeNote: "First graded run.",
  };
  return { ...reportWithoutPlain, plainText: gradePlainText(reportWithoutPlain) };
}

function reasoningFor(input: {
  recommendation: Recommendation;
  letter: Letter;
  score: number;
  confidence: Confidence;
  paying: boolean;
  role?: string;
  hard: boolean;
  review: boolean;
}): string {
  const grade = `The grade is ${input.letter} (${input.score} of 100) and confidence is ${input.confidence}.`;
  if (input.recommendation === "DECLINE") {
    return `${grade} A hard red flag is on the file. I recommend you decline unless you have read that flag and you still want this person. This is a recommendation only. You approve every member yourself.`;
  }
  if (input.review) {
    return `${grade} Something on the file might be this person, and it might be someone else. I recommend you get more information before you approve. I am not treating that hit as fact.`;
  }
  if (input.recommendation === "NEEDS MORE INFO") {
    return `${grade} The file is too thin, or too many sources came back empty, for me to recommend approval. Empty sources were not counted in their favor.`;
  }
  if (input.recommendation === "APPROVE WITH CONDITIONS") {
    const dues = input.paying
      ? ` ${roleLabel(input.role)} is a paying role. Membership is month to month. The first month is 50% off, then the full monthly price, and the link goes out only after you approve.`
      : " I would still ask you to look at the attention list before you approve.";
    return `${grade} The checks that found something line up well enough to recommend approval with conditions.${dues}`;
  }
  return `${grade} The free checks that found something line up, and I do not see a red flag. This is still a recommendation. You approve every member yourself.`;
}

function nextStepFor(input: { recommendation: Recommendation; checks: CheckOutput[]; facts: GradeFacts; paying: boolean }): string {
  if (input.recommendation === "DECLINE") {
    return "Read the red banner. If you approve anyway, the decision form asks you to confirm, and that confirmation is written to the audit log.";
  }
  const asks: string[] = [];
  if (!input.facts.cardUploaded && !input.facts.cardText?.trim()) asks.push("ask for a business card");
  if (!input.facts.linkedinUrl?.trim()) asks.push("ask for a LinkedIn URL");
  if ((input.facts.referenceCount || 0) === 0) asks.push("ask for a reference");
  if (!input.facts.website?.trim()) asks.push("ask for the company website");
  if (input.checks.some(isAmbiguousNews) || input.checks.some(isCorroboratedNegative) || input.checks.some(isPossibleSanctions)) {
    asks.unshift("open the possible match and confirm it is this person");
  }
  if (input.paying) asks.push("if you approve, the membership-dues link goes out only after your approval");
  if (!asks.length) return "Read the grade breakdown, then approve, ask for more, or decline.";
  const lead = asks.slice(0, 3).join(", ");
  return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}.`;
}

export function gradePlainText(report: Pick<GradeReport, "letter" | "score" | "confidence" | "recommendation" | "summary" | "banner" | "attention">): string {
  const attention = report.attention.length
    ? `Needs your attention: ${report.attention.map((item) => `${item.severity}: ${item.title}. ${item.detail}`).join(" ")}`
    : "";
  return [
    `Grade ${report.letter} (${report.score} of 100). Confidence: ${report.confidence}.`,
    `Recommendation to Richard Osika: ${report.recommendation}. ${report.summary.reasoning}`,
    `Next step: ${report.summary.nextStep}`,
    `Applicant: ${report.summary.applicant}`,
    `Company: ${report.summary.company}`,
    `What checked out: ${report.summary.checkedOut}`,
    `What did not check out: ${report.summary.didNotCheckOut}`,
    `What could not be checked for free: ${report.summary.couldNotCheck}`,
    report.banner ? `Banner: ${report.banner}` : "",
    attention,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function lowerConfidence(confidence: Confidence): Confidence {
  if (confidence === "High") return "Medium";
  if (confidence === "Medium") return "Low";
  return "Low";
}

function recommendationAfterConfidence(recommendation: Recommendation, confidence: Confidence): Recommendation {
  if (confidence === "Low" && (recommendation === "APPROVE" || recommendation === "APPROVE WITH CONDITIONS")) return "NEEDS MORE INFO";
  if (confidence !== "High" && recommendation === "APPROVE") return "APPROVE WITH CONDITIONS";
  return recommendation;
}

/** A skipped review step is not a pass. The letter and score stay put. Confidence drops one step, and that drop can lower the recommendation. */
export function applyReviewSkips(report: GradeReport, skips: { title: string; reason: string }[]): GradeReport {
  if (!skips.length) return report;
  const extra: AttentionItem[] = skips.map((skip) => ({
    severity: "Medium",
    title: `Skipped: ${skip.title}`,
    detail: `Skipped, not a pass. Reason: ${skip.reason || "No reason recorded."} This does not confirm the step.`,
  }));
  const confidence = lowerConfidence(report.confidence);
  const recommendation = recommendationAfterConfidence(report.recommendation, confidence);
  const summary =
    recommendation === report.recommendation
      ? report.summary
      : {
          ...report.summary,
          reasoning: reasoningFor({
            recommendation,
            letter: report.letter,
            score: report.score,
            confidence,
            paying: /month to month/i.test(report.summary.reasoning),
            hard: false,
            review: false,
          }),
          nextStep:
            recommendation === "NEEDS MORE INFO"
              ? "Read the skipped steps. A skipped step is not a pass, and confidence is too low to recommend approval."
              : report.summary.nextStep,
        };
  const next: GradeReport = {
    ...report,
    confidence,
    recommendation,
    summary,
    attention: [...extra, ...report.attention],
  };
  return { ...next, plainText: gradePlainText(next) };
}

export function gradeChangeNote(previous: GradeReport | null, next: Pick<GradeReport, "letter" | "score" | "recommendation" | "confidence" | "attention" | "banner">): string {
  if (!previous) return "First graded run. Nothing earlier to compare.";
  const changes: string[] = [];
  if (previous.letter !== next.letter || previous.score !== next.score) {
    changes.push(`Grade moved from ${previous.letter} (${previous.score}) to ${next.letter} (${next.score}).`);
  }
  if (previous.recommendation !== next.recommendation) {
    changes.push(`Recommendation moved from ${previous.recommendation} to ${next.recommendation}.`);
  }
  if (previous.confidence !== next.confidence) {
    changes.push(`Confidence moved from ${previous.confidence} to ${next.confidence}.`);
  }
  const before = new Set(previous.attention.map((item) => item.title));
  const after = new Set(next.attention.map((item) => item.title));
  const added = [...after].filter((title) => !before.has(title));
  const removed = [...before].filter((title) => !after.has(title));
  if (added.length) changes.push(`New attention items: ${added.join(", ")}.`);
  if (removed.length) changes.push(`Attention items that cleared: ${removed.join(", ")}.`);
  if ((previous.banner || "") !== (next.banner || "")) changes.push("The red-flag banner changed.");
  if (!changes.length) return "Re-ran. The grade, recommendation, confidence, and attention list are unchanged.";
  return changes.join(" ");
}

export function rubricSections(mode: GradeWeightsMode = GRADE_WEIGHTS_MODE): { title: string; body: string }[] {
  const weights = weightsFor(mode);
  const points = (group: Record<string, number>) =>
    Object.entries(group)
      .map(([key, value]) => `${labelFor(key)} ${value}`)
      .join(", ");
  const identityPossible = Object.values(weights.identity).reduce((sum, value) => sum + value, 0);
  const companyPossible = Object.values(weights.company).reduce((sum, value) => sum + value, 0);
  const footprintPossible = Object.values(weights.footprint).reduce((sum, value) => sum + value, 0);
  const registrySentence =
    mode === "r2"
      ? "The state registry is 0 under R2."
      : "The registry row is 2 only when a free state list has the exact company name (NY, CT, CO, OR, PA). That hit does not corroborate a person. NJ, WA, IA, and states with no keyless API are not checkable for free and earn 0.";
  const r2Note =
    mode === "r2"
      ? " R2 is on: LinkedIn fetch is 0 and the state registry is 0. Those 6 points sit on the website and the web footprint instead. The displayed score rescales earned points over the checkable points. A check that did not run, or did not answer, leaves the denominator. No SEC registrant stays in the denominator as 0 of 6. Letter floors are unchanged."
      : "";
  return [
    {
      title: "Points",
      body: `Identity and contact, ${points(weights.identity)} (${identityPossible}). Company legitimacy, ${points(weights.company)} (${companyPossible}). ${registrySentence} Public footprint, ${points(weights.footprint)} (${footprintPossible}). Risk and sanctions, ${points(weights.risk)} (20). Role fit, ${points(weights.role)} (12). Completeness, phone 2, location 2, website or LinkedIn 2, track record 2, business card 1, references 1 (10). Total 100. Email domain and MX earn 0.${r2Note}`,
    },
    {
      title: "Letters",
      body: `Before caps, A is ${LETTER_FLOORS.A} to 100, B is ${LETTER_FLOORS.B} to 89, C is ${LETTER_FLOORS.C} to 79, D is ${LETTER_FLOORS.D} to 69, and F is 0 to 59. Caps can only lower the letter.`,
    },
    {
      title: "Caps",
      body: `No independent person-and-company corroboration: cannot exceed ${CAP_RULES.noCorroboration}. The applicant's own site and a footprint from that same site count as one self-reported source and do not lift this cap. A negative headline that is only a name match: cannot exceed ${CAP_RULES.ambiguousNews}, and the file says possible match, verify. Disposable email with some public page, an uncorroborated sanctions name, or fraud, sanctions, or a criminal charge tied to the person with the company or city: cannot exceed ${CAP_RULES.reviewRedFlag}, with a red banner. A company-level lawsuit is an attention item and does not use that cap. Corroborated sanctions, including an OpenSanctions hard flag when that source answers, fraud-pattern text, a disposable email with no website or LinkedIn, or a duplicate of a member or a declined applicant: cannot exceed ${CAP_RULES.hardRedFlag}, with a red banner. Two or more conflicting checks: cannot exceed ${CAP_RULES.twoConflicts}. Separate news headlines are not separate conflicts.`,
    },
    {
      title: "Confidence",
      body: `Confidence is separate from the letter. High means at least ${Math.round(CONFIDENCE_RULES.highMinRatio * 100)} percent of weighted checks returned a pass or a fail, and at least ${CONFIDENCE_RULES.highMinCorroboration} sources corroborated the person and the company. Medium means at least ${Math.round(CONFIDENCE_RULES.mediumMinRatio * 100)} percent returned a pass or a fail, or at least ${CONFIDENCE_RULES.mediumMinCorroboration} source corroborated them. Low means fewer than that, or no corroboration at all. A blocked or empty source lowers confidence. It never raises the grade. A step Richard skips is not a pass and lowers confidence by one step. It never raises the letter or the score.`,
    },
    {
      title: "What free sources cannot show",
      body: FREE_SOURCE_LIMIT,
    },
  ];
}

export function failedGrade(message: string, gradedAt = new Date().toISOString()): GradeReport {
  const summary: ExecutiveSections = {
    applicant: "The verification job did not finish, so this snapshot has no applicant facts from a completed run.",
    company: "No company evidence was saved for this failed run.",
    checkedOut: "Nothing checked out, because the run did not finish.",
    didNotCheckOut: "No completed check reported a conflict.",
    couldNotCheck: `${message} ${FREE_SOURCE_LIMIT}`,
    reasoning: "The grade is F (0 of 100) because the job failed. That is not a judgment of the person. Read the application yourself.",
    nextStep: "Use Re-run verification. If it fails again, decide from the application without this grade.",
  };
  const base: Omit<GradeReport, "plainText"> = {
    version: 1,
    rubricVersion: RUBRIC_VERSION,
    gradedAt,
    letter: "F",
    score: 0,
    rawScore: 0,
    confidence: "Low",
    recommendation: "NEEDS MORE INFO",
    categories: [],
    attention: [{ severity: "High", title: "Verification did not finish", detail: message }],
    summary,
    banner: null,
    caps: ["Capped at F: the verification job failed before it could grade the file."],
    changeNote: "This run failed.",
  };
  return { ...base, plainText: gradePlainText(base) };
}

export function parseGradeSnapshot(value: unknown): GradeReport | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<GradeReport>;
  if (!record.letter || !LETTERS.includes(record.letter)) return null;
  if (!record.recommendation || !RECOMMENDATIONS.includes(record.recommendation)) return null;
  if (!record.summary || typeof record.summary.applicant !== "string") return null;
  if (typeof record.score !== "number") return null;
  return {
    version: 1,
    rubricVersion: RUBRIC_VERSION,
    gradedAt: typeof record.gradedAt === "string" ? record.gradedAt : "",
    letter: record.letter,
    score: record.score,
    rawScore: typeof record.rawScore === "number" ? record.rawScore : record.score,
    confidence: record.confidence === "High" || record.confidence === "Medium" || record.confidence === "Low" ? record.confidence : "Low",
    recommendation: record.recommendation,
    categories: Array.isArray(record.categories) ? record.categories : [],
    attention: Array.isArray(record.attention) ? record.attention : [],
    summary: record.summary,
    banner: typeof record.banner === "string" ? record.banner : null,
    caps: Array.isArray(record.caps) ? record.caps.filter((item) => typeof item === "string") : [],
    changeNote: typeof record.changeNote === "string" ? record.changeNote : "",
    plainText: typeof record.plainText === "string" ? record.plainText : "",
  };
}

/** Used when an older run has no snapshot. Findings fill in flags the table did not store. */
export function inferFlags(key: string, status: EvidenceStatus | string, finding: string): { hardFlag: boolean; reviewFlag: boolean; corroborates: boolean } {
  const text = finding.toLowerCase();
  const hard =
    ((key === "sanctions" || key === "opensanctions") && status === "FAIL" && text.includes("lines up")) ||
    (key === "disposable-email" && status === "FAIL" && text.includes("no website or linkedin")) ||
    (key === "duplicate" && status === "FAIL") ||
    (key === "text-risk" && status === "FAIL" && text.includes("fraud pattern"));
  const review = /possible match|needs review|owner's eye|does not line up|usually maps to|gibberish|shared role|looks incomplete|not a public/.test(text);
  const corroborates =
    status === "PASS" &&
    (key.startsWith("fixture-") ||
      /includes the person or company|names both the person|names this person and company|hit\(s\) for the company|includes the applicant name and company|public fetch of the linkedin|includes the person's name/.test(
        text,
      ));
  return { hardFlag: hard, reviewFlag: review && !hard, corroborates };
}

export function checksFromEvidence(
  rows: {
    checkKey: string;
    status: string;
    weight: number;
    finding: string;
    source: string;
    url: string;
    ranAt: Date | string;
    hardFlag?: boolean | null;
    reviewFlag?: boolean | null;
    corroborates?: boolean | null;
  }[],
): CheckOutput[] {
  return rows.map((row) => {
    const inferred = inferFlags(row.checkKey, row.status, row.finding);
    return {
      key: row.checkKey,
      status: row.status as EvidenceStatus,
      weight: row.weight,
      finding: row.finding,
      source: row.source,
      url: row.url,
      ranAt: row.ranAt instanceof Date ? row.ranAt.toISOString() : row.ranAt,
      hardFlag: Boolean(row.hardFlag) || inferred.hardFlag,
      reviewFlag: Boolean(row.reviewFlag) || inferred.reviewFlag,
      corroborates: Boolean(row.corroborates) || inferred.corroborates,
    };
  });
}

export function decisionNoticeText(input: {
  name: string;
  decision: string;
  grade: Pick<GradeReport, "letter" | "score" | "confidence" | "recommendation" | "summary" | "banner" | "attention"> | null;
}): string {
  if (!input.grade) {
    return `${input.name}: you recorded ${input.decision}. No grade snapshot was stored on the verification run, so this notice cannot quote one. Open the application and re-run verification if you need the grade.`;
  }
  return `${input.name}: you recorded ${input.decision}. ${gradePlainText(input.grade)} Members do not see this grade.`;
}

export function gradeForRun(
  run: {
    subject?: string;
    finishedAt?: Date | null;
    gradeSnapshot?: unknown;
    evidence?: Parameters<typeof checksFromEvidence>[0];
  } | null
  | undefined,
  facts: GradeFacts = {},
): GradeReport | null {
  if (!run) return null;
  const saved = parseGradeSnapshot(run.gradeSnapshot);
  if (saved) return saved;
  if (!run.evidence?.length) return null;
  return gradeChecks(checksFromEvidence(run.evidence), facts, {
    gradedAt: run.finishedAt ? run.finishedAt.toISOString() : undefined,
    subject: run.subject,
  });
}

export function gradeFactsFromApplication(application: {
  name: string;
  email?: string;
  org: string;
  location: string;
  role: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  socialLinks?: string;
  statement?: string;
  referenceEmails?: string[];
  inviteCode?: { code: string; note: string } | null;
  businessCard?: { deletedAt: Date | null; sizeBytes: number } | null;
}): GradeFacts {
  const card = application.businessCard;
  return {
    name: application.name,
    applicantName: application.name,
    email: application.email || "",
    org: application.org,
    location: application.location,
    role: application.role,
    phone: application.phone || "",
    website: application.website || "",
    linkedinUrl: application.linkedinUrl || "",
    socialLinks: application.socialLinks || "",
    statement: application.statement || "",
    inviteNote: application.inviteCode ? `${application.inviteCode.code}${application.inviteCode.note ? ` · ${application.inviteCode.note}` : ""}` : "",
    cardUploaded: Boolean(card && !card.deletedAt && card.sizeBytes > 0),
    referenceCount: application.referenceEmails?.length || 0,
  };
}
