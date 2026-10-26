import { COULD_NOT_VERIFY } from "@/lib/verify/free-sources";

/** Shown on a prefilled mark until an administrator confirms it. */
export const AUTO_SUGGESTED_PREFIX = "Auto-suggested.";

export const SUGGESTED_MARKS = ["PASS", "CONCERN", "FAIL", "COULDNT_VERIFY"] as const;
export type SuggestedMark = (typeof SUGGESTED_MARKS)[number];

export type EvidenceRow = {
  checkKey: string;
  status: string;
  finding: string;
  source: string;
  url: string;
  hardFlag?: boolean;
  reviewFlag?: boolean;
  corroborates?: boolean;
};

export type PrefillFacts = {
  name: string;
  org: string;
  location: string;
  statement: string;
  linkedinUrl: string;
  website: string;
  referenceEmails: string[];
  cardOnFile: boolean;
  cardText: string;
};

export type StepSuggestion = {
  key: string;
  mark: SuggestedMark;
  result: "PASS" | "FAIL" | "NEEDS_INFO" | "NOT_PROVIDED";
  evidenceUrl: string;
  evidenceUrls: string[];
  note: string;
  autoSuggested: true;
};

const RANK: Record<SuggestedMark, number> = { FAIL: 4, CONCERN: 3, COULDNT_VERIFY: 2, PASS: 1 };

export function stricterMark(left: SuggestedMark, right: SuggestedMark): SuggestedMark {
  return RANK[left] >= RANK[right] ? left : right;
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function httpUrls(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const url = value.trim().replace(/[),.;]+$/, "");
    if (!isHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function isAutoSuggestedNote(note: string | null | undefined): boolean {
  return (note || "").trim().toLowerCase().startsWith("auto-suggested");
}

export function confirmedNote(note: string): string {
  return note.replace(/^\s*auto-suggested\.\s*/i, "").trim();
}

export function resultForMark(mark: SuggestedMark): StepSuggestion["result"] {
  if (mark === "PASS") return "PASS";
  if (mark === "FAIL") return "FAIL";
  if (mark === "CONCERN") return "NEEDS_INFO";
  return "NOT_PROVIDED";
}

export function markLabel(mark: SuggestedMark): string {
  if (mark === "PASS") return "Pass";
  if (mark === "CONCERN") return "Concern";
  if (mark === "FAIL") return "Fail";
  return "Couldn't verify";
}

/** A skip, a vouch waiting on review, or a mark Richard already confirmed stays put. */
export function keepExistingMark(check: {
  note: string;
  reviewerId?: string | null;
  autoSuggested?: boolean;
}): boolean {
  const note = check.note.trim();
  if (note.toLowerCase().startsWith("skipped:")) return true;
  if (note.includes("Awaiting admin review")) return true;
  if (check.reviewerId && !check.autoSuggested && !isAutoSuggestedNote(note)) return true;
  return false;
}

export function canAutofill(
  check: { note: string; result: string; reviewerId?: string | null; autoSuggested?: boolean },
  mode: "fill-empty" | "refresh",
): boolean {
  if (keepExistingMark(check)) return false;
  if (mode === "refresh") return true;
  return !check.note.trim() && check.result === "PENDING" && !check.autoSuggested;
}

function row(evidence: EvidenceRow[], key: string): EvidenceRow | undefined {
  return evidence.find((item) => item.checkKey === key);
}

function sourced(item: EvidenceRow | undefined): item is EvidenceRow {
  return Boolean(item && isHttpUrl(item.url));
}

function blocked(item: EvidenceRow | undefined): boolean {
  if (!item) return true;
  return item.status === "UNAVAILABLE" || item.status === "NOT_RUN" || !isHttpUrl(item.url);
}

function pack(key: string, mark: SuggestedMark, urls: string[], found: string[], missing: string[]): StepSuggestion {
  const links = httpUrls(urls);
  let next = mark;
  if (next === "PASS" && links.length === 0) {
    next = "COULDNT_VERIFY";
    missing.unshift("A pass needs a source link. None was returned, so this is not a pass.");
  }
  if (next === "COULDNT_VERIFY" && !missing.join(" ").toLowerCase().includes(COULD_NOT_VERIFY) && !found.join(" ").toLowerCase().includes(COULD_NOT_VERIFY)) {
    missing.push(`This ${COULD_NOT_VERIFY}.`);
  }
  const blockedLines = missing.filter((line) => /couldn't check for free|couldn't verify for free|could not be checked|blocked automated access/i.test(line));
  const gapLines = missing.filter((line) => !blockedLines.includes(line));
  const foundText = found.length ? `Found: ${found.join(" ")}` : "Found: nothing a free source could tie to this file.";
  const missingText = gapLines.length ? `Not found: ${gapLines.join(" ")}` : "Not found: no extra gap was recorded.";
  const blockedText = blockedLines.length ? ` Blocked sources: ${blockedLines.join(" ")}` : "";
  let body = `${foundText} ${missingText}${blockedText}`;
  if (next === "COULDNT_VERIFY" && !body.toLowerCase().includes(COULD_NOT_VERIFY)) body = `${body} ${COULD_NOT_VERIFY}.`;
  if (next === "PASS") body = body.replace(/couldn't verify for free/gi, "was not treated as proof");
  const linkText = links.length ? ` Links: ${links.join(" ")}` : "";
  const note = `${AUTO_SUGGESTED_PREFIX} Suggested mark: ${markLabel(next)}. ${body}${linkText}`.replace(/\s+/g, " ").trim().slice(0, 1900);
  return {
    key,
    mark: next,
    result: resultForMark(next),
    evidenceUrl: (links[0] || "").slice(0, 500),
    evidenceUrls: links,
    note,
    autoSuggested: true,
  };
}

function suggestIdentity(facts: PrefillFacts, evidence: EvidenceRow[]): StepSuggestion {
  const found: string[] = [];
  const missing: string[] = ["Email domain was not used as proof."];
  const urls: string[] = [];
  let mark: SuggestedMark = "COULDNT_VERIFY";
  const publicKeys = [
    "web-footprint",
    "linkedin-fetch",
    "website",
    "screen-web",
    "screen-news",
    "screen-x",
    "screen-facebook",
    "screen-instagram",
    "screen-youtube",
    "screen-tiktok",
  ];
  for (const key of publicKeys) {
    const item = row(evidence, key);
    if (!item) continue;
    if (item.status === "PASS" && sourced(item)) {
      mark = "PASS";
      found.push(item.finding);
      urls.push(item.url);
    } else if (item.status === "UNAVAILABLE" || item.status === "NOT_RUN") {
      missing.push(item.finding || `This source ${COULD_NOT_VERIFY}.`);
      if (isHttpUrl(item.url)) urls.push(item.url);
    } else if (item.status === "INCONCLUSIVE" && item.finding) {
      found.push(item.finding);
      if (isHttpUrl(item.url)) urls.push(item.url);
    }
  }
  if (!facts.linkedinUrl.trim() && !row(evidence, "linkedin-fetch")) {
    missing.push(`No LinkedIn URL was on the file. A public profile ${COULD_NOT_VERIFY}.`);
  }
  if (!row(evidence, "web-footprint") && !row(evidence, "website")) {
    missing.push(`Public web search ${COULD_NOT_VERIFY}.`);
  }
  return pack("identity", mark, urls, found, missing);
}

function suggestLicense(facts: PrefillFacts, evidence: EvidenceRow[]): StepSuggestion {
  const card = row(evidence, "business-card");
  const website = row(evidence, "website");
  const edgar = row(evidence, "edgar");
  const registry = row(evidence, "opencorporates");
  const stateRegistry = row(evidence, "business-registry");
  const found: string[] = [];
  const missing: string[] = [];
  const urls: string[] = [];
  let mark: SuggestedMark = "COULDNT_VERIFY";

  const publicHit = [website, edgar, registry].find((item) => item?.status === "PASS" && item.corroborates && sourced(item));
  if (card?.status === "FAIL") {
    mark = "FAIL";
    found.push(card.finding || "The card text does not line up with the name and company.");
  } else if (website?.status === "FAIL" && sourced(website)) {
    mark = "CONCERN";
    found.push(website.finding);
    urls.push(website.url);
  }

  if (publicHit && sourced(publicHit)) {
    found.push(publicHit.finding);
    urls.push(publicHit.url);
  }
  if (facts.cardOnFile && card?.status === "PASS" && publicHit) {
    found.push("The card text includes the name and company, and a public page with a source link names them.");
    if (mark !== "FAIL") mark = "PASS";
  } else if (!facts.cardOnFile) {
    missing.push(`No business card was uploaded. Matching a card to public records ${COULD_NOT_VERIFY}.`);
  } else if (card?.status === "UNAVAILABLE" || card?.status === "NOT_RUN") {
    missing.push(card.finding || `The business card ${COULD_NOT_VERIFY}.`);
  } else if (card?.status === "PASS" && !publicHit) {
    missing.push("The card text includes the name and company, but no public record with a source link matched. This is not a pass.");
  }

  if (!registry || blocked(registry)) {
    missing.push(registry?.finding || `OpenCorporates ${COULD_NOT_VERIFY}.`);
    if (registry && isHttpUrl(registry.url)) urls.push(registry.url);
  }
  if (!stateRegistry || stateRegistry.status === "NOT_RUN" || stateRegistry.status === "UNAVAILABLE") {
    missing.push(stateRegistry?.finding || `The state registry ${COULD_NOT_VERIFY}.`);
    if (stateRegistry && isHttpUrl(stateRegistry.url)) urls.push(stateRegistry.url);
  }
  return pack("license", mark, urls, found, missing);
}

function suggestReferences(facts: PrefillFacts): StepSuggestion {
  const names = facts.referenceEmails.map((item) => item.trim()).filter(Boolean);
  const found = names.length
    ? [`They named ${names.join(", ")}. A name on the form is not a completed reference.`]
    : ["They did not name a reference."];
  return pack(
    "references",
    "COULDNT_VERIFY",
    [],
    found,
    [`References and vouches ${COULD_NOT_VERIFY}. Private Floor does not use a paid people-search, and email domain is not proof.`],
  );
}

function suggestSanctions(evidence: EvidenceRow[]): StepSuggestion {
  const sanctions = row(evidence, "sanctions");
  const courts = row(evidence, "courts");
  const opensanctions = row(evidence, "opensanctions");
  const found: string[] = [];
  const missing: string[] = [];
  const urls: string[] = [];
  let mark: SuggestedMark = "COULDNT_VERIFY";

  if (sanctions?.status === "FAIL" && sourced(sanctions)) {
    mark = sanctions.hardFlag ? "FAIL" : "CONCERN";
    found.push(sanctions.finding);
    urls.push(sanctions.url);
  } else if (sanctions?.status === "PASS" && sourced(sanctions)) {
    found.push(sanctions.finding);
    urls.push(sanctions.url);
    mark = "PASS";
  } else {
    missing.push(sanctions?.finding || `The OFAC list ${COULD_NOT_VERIFY}.`);
    if (sanctions && isHttpUrl(sanctions.url)) urls.push(sanctions.url);
  }

  if (opensanctions?.status === "FAIL" && sourced(opensanctions)) {
    mark = stricterMark(mark, opensanctions.hardFlag ? "FAIL" : "CONCERN");
    found.push(opensanctions.finding);
    urls.push(opensanctions.url);
  } else if (opensanctions?.status === "PASS" && sourced(opensanctions)) {
    found.push(opensanctions.finding);
    urls.push(opensanctions.url);
  } else {
    missing.push(opensanctions?.finding || `OpenSanctions ${COULD_NOT_VERIFY}.`);
    if (opensanctions && isHttpUrl(opensanctions.url)) urls.push(opensanctions.url);
    if (mark === "PASS") mark = "COULDNT_VERIFY";
  }

  if (courts && (courts.status === "UNAVAILABLE" || courts.status === "NOT_RUN" || !sourced(courts))) {
    missing.push(courts.finding || `Litigation dockets ${COULD_NOT_VERIFY}.`);
    if (isHttpUrl(courts.url)) urls.push(courts.url);
    if (mark === "PASS") mark = "COULDNT_VERIFY";
  } else if (courts?.reviewFlag) {
    mark = stricterMark(mark, "CONCERN");
    found.push(courts.finding);
    if (sourced(courts)) urls.push(courts.url);
  } else if (courts && sourced(courts)) {
    found.push(courts.finding);
    urls.push(courts.url);
  } else {
    missing.push(`Litigation dockets ${COULD_NOT_VERIFY}.`);
    if (mark === "PASS") mark = "COULDNT_VERIFY";
  }

  return pack("sanctions", mark, urls, found, missing);
}

function suggestTrack(facts: PrefillFacts, evidence: EvidenceRow[]): StepSuggestion {
  const text = row(evidence, "text-risk");
  const web = row(evidence, "web-footprint");
  const news = row(evidence, "news");
  const stories = evidence.filter((item) => item.checkKey === "news-story" && isHttpUrl(item.url));
  const found: string[] = [];
  const missing: string[] = [];
  const urls: string[] = [];
  const claim = facts.statement.trim();
  let mark: SuggestedMark = "COULDNT_VERIFY";

  if (!claim) missing.push(`No track-record claim was written. The claim ${COULD_NOT_VERIFY}.`);
  else found.push("A track-record note is on the file. The note itself is not a public source.");

  if (text?.hardFlag) {
    mark = "FAIL";
    found.push(text.finding);
  } else if (text?.status === "PASS") {
    missing.push("A long note with no fraud-pattern phrasing is not a public source and is not a pass.");
  }

  const screens = evidence.filter((item) => item.checkKey.startsWith("screen-"));
  for (const item of screens) {
    if (item.status === "UNAVAILABLE" || item.status === "NOT_RUN") {
      missing.push(item.finding || `${item.source || "A social source"} ${COULD_NOT_VERIFY}.`);
      if (isHttpUrl(item.url)) urls.push(item.url);
    } else if (item.finding) {
      found.push(item.finding);
      if (isHttpUrl(item.url)) urls.push(item.url);
    }
  }
  const strongScreen = screens.some((item) => item.status === "PASS" && sourced(item));

  const negative = stories.find((item) => item.status === "FAIL" || /negative/i.test(item.finding));
  const positive = stories.find((item) => item.status === "PASS");
  if (negative) {
    mark = stricterMark(mark, "CONCERN");
    found.push(negative.finding);
    urls.push(negative.url);
  } else if (positive && claim && !text?.hardFlag && mark !== "FAIL") {
    mark = "PASS";
    found.push(positive.finding);
    urls.push(positive.url);
  } else if (positive) {
    found.push(positive.finding);
    urls.push(positive.url);
  }

  if (news?.status === "FAIL" && sourced(news)) {
    mark = stricterMark(mark, "CONCERN");
    found.push(news.finding);
    urls.push(news.url);
  } else if (((web?.status === "PASS" && sourced(web)) || strongScreen) && claim && mark !== "FAIL" && mark !== "CONCERN") {
    mark = "PASS";
    if (web?.status === "PASS" && sourced(web)) {
      found.push(web.finding);
      urls.push(web.url);
    }
  } else if ((!news || blocked(news)) && (!web || blocked(web)) && !positive) {
    missing.push(`News and public web search ${COULD_NOT_VERIFY}.`);
    if (news && isHttpUrl(news.url)) urls.push(news.url);
    if (web && isHttpUrl(web.url)) urls.push(web.url);
    if (mark === "PASS") mark = "COULDNT_VERIFY";
  } else if (!positive && !(web?.status === "PASS" && sourced(web))) {
    missing.push("No free public page tied the track-record claim to this person and company.");
    if (mark === "PASS") mark = "COULDNT_VERIFY";
  }

  if (mark === "PASS" && !claim) mark = "COULDNT_VERIFY";
  return pack("track", mark, urls, found, missing);
}

export function suggestCompany(facts: PrefillFacts, evidence: EvidenceRow[]): StepSuggestion {
  const website = row(evidence, "website");
  const edgar = row(evidence, "edgar");
  const registry = row(evidence, "opencorporates");
  const stateRegistry = row(evidence, "business-registry");
  const found: string[] = [];
  const missing: string[] = ["Email domain was not used as proof."];
  const urls: string[] = [];
  const hit = [website, edgar, registry].find((item) => item?.status === "PASS" && sourced(item));
  let mark: SuggestedMark = hit ? "PASS" : "COULDNT_VERIFY";
  if (hit) {
    found.push(hit.finding);
    urls.push(hit.url);
  }
  if (website?.status === "FAIL" && sourced(website)) {
    mark = stricterMark(mark, "CONCERN");
    found.push(website.finding);
    urls.push(website.url);
  }
  for (const item of [website, edgar, registry]) {
    if (item && blocked(item)) {
      missing.push(item.finding || `A company source ${COULD_NOT_VERIFY}.`);
      if (isHttpUrl(item.url)) urls.push(item.url);
    }
  }
  if (stateRegistry && (stateRegistry.status === "NOT_RUN" || stateRegistry.status === "UNAVAILABLE" || !sourced(stateRegistry))) {
    missing.push(stateRegistry.finding || `The state registry ${COULD_NOT_VERIFY}.`);
    if (isHttpUrl(stateRegistry.url)) urls.push(stateRegistry.url);
  } else if (!hit) {
    missing.push(`Company registries and the public site ${COULD_NOT_VERIFY}.`);
  }
  if (!facts.org.trim()) missing.push("No company name was on the file.");
  return pack("company", mark, urls, found, missing);
}

function suggestUnsupported(key: string, what: string): StepSuggestion {
  return pack(key, "COULDNT_VERIFY", [], [], [`${what} ${COULD_NOT_VERIFY}. No free source covers this, and email domain is not proof.`]);
}

export function suggestOne(key: string, facts: PrefillFacts, evidence: EvidenceRow[]): StepSuggestion {
  if (key === "identity") return suggestIdentity(facts, evidence);
  if (key === "license") return suggestLicense(facts, evidence);
  if (key === "references") return suggestReferences(facts);
  if (key === "sanctions") return suggestSanctions(evidence);
  if (key === "track") return suggestTrack(facts, evidence);
  if (key === "sponsor") return suggestUnsupported(key, "Whether the sponsor is verified");
  if (key === "title") return suggestUnsupported(key, "Property ownership, title, or a purchase contract");
  if (key === "entitlements") return suggestUnsupported(key, "Entitlements and permits");
  if (key === "capital") return suggestUnsupported(key, "The capital stack");
  if (key === "budget") return suggestUnsupported(key, "The budget and GC bid");
  return suggestUnsupported(key, "This item");
}

export function suggestChecklist(keys: string[], facts: PrefillFacts, evidence: EvidenceRow[]): StepSuggestion[] {
  return keys.map((key) => suggestOne(key, facts, evidence));
}

export function emptyPrefillFacts(partial: Partial<PrefillFacts> = {}): PrefillFacts {
  return {
    name: "",
    org: "",
    location: "",
    statement: "",
    linkedinUrl: "",
    website: "",
    referenceEmails: [],
    cardOnFile: false,
    cardText: "",
    ...partial,
  };
}
