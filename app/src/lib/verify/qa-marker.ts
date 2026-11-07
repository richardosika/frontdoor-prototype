import type { ApplicantFacts } from "@/lib/verify/types";

const QA_EMAIL = /^qa-test-[^@\s]+@privatefloorclub\.com$/i;
const QA_PREFIX = "QA-TEST ";

/** True only for a qa-test mailbox at privatefloorclub.com whose company starts with the strict prefix. */
export function qaMarkerApplies(email: string, org: string): boolean {
  return QA_EMAIL.test(email.trim()) && org.startsWith(QA_PREFIX);
}

export function stripQaOrg(org: string): string {
  return org.startsWith(QA_PREFIX) ? org.slice(QA_PREFIX.length).trim() : org;
}

/**
 * Search copy of the facts. The stored application keeps the prefixed company.
 * Any other email, including a production applicant, is returned unchanged.
 */
export function factsForSearch(facts: ApplicantFacts, log: (message: string) => void = console.info): ApplicantFacts {
  if (!qaMarkerApplies(facts.email || "", facts.org || "")) return facts;
  const org = stripQaOrg(facts.org);
  log(`QA marker removed for search only. email=${facts.email.trim()} org="${facts.org}" searchOrg="${org}"`);
  return { ...facts, org };
}
