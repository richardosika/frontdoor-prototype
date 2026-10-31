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
  /**
   * The company name matched on the applicant's own site or a LinkedIn company page.
   * The person did not. This is partial credit and does not corroborate the person.
   */
  companyOnly?: boolean;
  /**
   * Applicant-supplied material (their own site, a footprint from that same site, or their card).
   * Several of these together are one self-reported source. They do not corroborate the person.
   */
  selfReported?: boolean;
};

export type ApplicantFacts = {
  name: string;
  /** The applicant's own name on every run, including the company report. */
  applicantName: string;
  email: string;
  org: string;
  location: string;
  role: string;
  /**
   * False when the file is a referral or request and no application was submitted.
   * Absent on older runs and on project files.
   */
  applicationSubmitted?: boolean;
  phone: string;
  website: string;
  linkedinUrl: string;
  socialLinks: string;
  statement: string;
  inviteNote: string;
  /** False when a stored referral or request code is expired or used up. Absent when no code was supplied. */
  inviteValid?: boolean;
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
