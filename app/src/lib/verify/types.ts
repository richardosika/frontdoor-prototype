export const EVIDENCE_STATUSES = ["PASS", "FAIL", "INCONCLUSIVE", "NOT_RUN", "UNAVAILABLE"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const VERDICTS = ["LEGIT", "NOT_LEGIT", "NEEDS_OWNER_DECISION"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type CheckOutput = {
  key: string;
  status: EvidenceStatus;
  weight: number;
  finding: string;
  source: string;
  url: string;
  ranAt: string;
  hardFlag?: boolean;
  reviewFlag?: boolean;
  /** True only when this pass corroborates the person and the company, not merely the absence of a red flag. */
  corroborates?: boolean;
};

export type ApplicantFacts = {
  name: string;
  /** The applicant's own name on every run, including the company report. */
  applicantName: string;
  email: string;
  org: string;
  location: string;
  role: string;
  phone: string;
  website: string;
  linkedinUrl: string;
  socialLinks: string;
  statement: string;
  inviteNote: string;
  testProfile: string;
  cardText: string;
  cardUploaded: boolean;
  duplicateOfMember: boolean;
  duplicateOfDeclined: boolean;
  recentApplications: number;
  referenceCount?: number;
};

export type ScoredReport = {
  score: number;
  verdict: Verdict;
  summary: string;
  checks: CheckOutput[];
};
