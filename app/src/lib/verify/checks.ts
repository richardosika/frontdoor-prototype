import { annualDuesCents } from "@/lib/dues";
import { normalizeInviteCode } from "@/lib/domain";
import { factsForSearch } from "@/lib/verify/qa-marker";
import { assessCourts, courtSearchQuery } from "@/lib/verify/courts";
import { locationsCorroborate, nameMatchScore, SANCTIONS_MATCH_THRESHOLD } from "@/lib/verify/fuzzy";
import {
  assessCensusBody,
  assessLocalAddress,
  assessNominatimBody,
  censusGeocodeUrl,
  geocoderSaysAddressInvalid,
  nominatimGeocodeUrl,
  statedUsState,
  streetGeocodeForms,
  type ParsedAddress,
} from "@/lib/verify/address";
import { isReservedDomain, registrableHost } from "@/lib/verify/host";
import { companyPhraseTokens, isDistinctiveCompanyToken, isShortBrandToken, mentionsCompany, mentionsPerson } from "@/lib/verify/public-match";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";
import { assessOpenCorporates, assessOpenSanctions, openCorporatesApiUrl, openSanctionsApiUrl } from "@/lib/verify/free-sources";
import { alignNewsRows, newsChecks } from "@/lib/verify/news";
import { edgarIsExactCompany, incorporationStateFromFinding, lookupEdgar } from "@/lib/verify/edgar";
import { assessNyRegistry, nyRegistryQueryUrl } from "@/lib/verify/ny-registry";
import { manualRegistryFinding, stateRegistrySearchUrl } from "@/lib/state-registry-search";
import { assessFdicBank, assessStateRegistry, fdicBankFindUrl, registryPortal, socrataRegistryUrl } from "@/lib/verify/state-registries";
import { completeScreenRows, runPublicScreen } from "@/lib/verify/screen";

const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "tempmail.com",
  "10minutemail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "discard.email",
  "maildrop.cc",
  "fakeinbox.com",
  "throwawaymail.com",
  "emailondeck.com",
  "mohmal.com",
  "dispostable.com",
  "mailnesia.com",
  "tempinbox.com",
  "trash-mail.com",
]);

const FREE_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
]);

const STATE_AREA_CODES: Record<string, string[]> = {
  NJ: ["201", "551", "609", "640", "732", "848", "856", "862", "908", "973"],
  NY: ["212", "315", "332", "347", "363", "516", "518", "585", "607", "631", "646", "680", "716", "718", "838", "845", "914", "917", "929", "934"],
  CT: ["203", "475", "860", "959"],
  CA: ["209", "213", "279", "310", "323", "341", "408", "415", "424", "442", "510", "530", "559", "562", "619", "626", "628", "650", "657", "661", "669", "707", "714", "747", "760", "805", "818", "820", "831", "840", "858", "909", "916", "925", "949", "951"],
  TX: ["210", "214", "254", "281", "325", "346", "361", "409", "430", "432", "469", "512", "682", "713", "726", "737", "806", "817", "830", "832", "903", "915", "936", "940", "945", "956", "972", "979"],
  FL: ["239", "305", "321", "352", "386", "407", "448", "561", "656", "689", "727", "754", "772", "786", "813", "850", "863", "904", "941", "954"],
  DE: ["302"],
  PA: ["215", "223", "267", "272", "412", "445", "484", "570", "582", "610", "717", "724", "814", "835", "878"],
  SC: ["803", "839", "843", "854"],
  IL: ["217", "224", "309", "312", "331", "447", "464", "618", "630", "708", "773", "779", "815", "847", "872"],
  MA: ["339", "351", "413", "508", "617", "774", "781", "857", "978"],
  GA: ["229", "404", "470", "478", "678", "706", "762", "770", "912"],
  DC: ["202"],
  MD: ["227", "240", "301", "410", "443", "667"],
  CO: ["303", "719", "720", "970", "983"],
  VA: ["276", "434", "540", "571", "703", "757", "804", "826", "948"],
  WA: ["206", "253", "360", "425", "509", "564"],
  NC: ["252", "336", "472", "704", "743", "828", "910", "919", "980", "984"],
  AZ: ["480", "520", "602", "623", "928"],
  OH: ["216", "220", "234", "283", "326", "330", "380", "419", "436", "440", "513", "567", "614", "740", "937"],
  MI: ["231", "248", "269", "313", "517", "586", "616", "679", "734", "810", "906", "947", "989"],
  AL: ["205", "251", "256", "334", "659", "938"],
  AK: ["907"],
  AR: ["479", "501", "870"],
  HI: ["808"],
  ID: ["208", "986"],
  IN: ["219", "260", "317", "463", "574", "765", "812", "930"],
  IA: ["319", "515", "563", "641", "712"],
  KS: ["316", "620", "785", "913"],
  KY: ["270", "364", "502", "606", "859"],
  LA: ["225", "318", "337", "504", "985"],
  ME: ["207"],
  MN: ["218", "320", "507", "612", "651", "763", "952"],
  MS: ["228", "601", "662", "769"],
  MO: ["314", "417", "557", "573", "636", "660", "816"],
  MT: ["406"],
  NE: ["308", "402", "531"],
  NV: ["702", "725", "775"],
  NH: ["603"],
  NM: ["505", "575"],
  ND: ["701"],
  OK: ["405", "539", "572", "580", "918"],
  OR: ["458", "503", "541", "971"],
  RI: ["401"],
  SD: ["605"],
  TN: ["423", "615", "629", "731", "865", "901", "931"],
  UT: ["385", "435", "801"],
  VT: ["802"],
  WV: ["304", "681"],
  WI: ["262", "274", "414", "534", "608", "715", "920"],
  WY: ["307"],
};

const TOLL_FREE_AREA_CODES = new Set(["800", "833", "844", "855", "866", "877", "888"]);

const AREA_TO_STATE: Record<string, string> = {};
for (const [state, codes] of Object.entries(STATE_AREA_CODES)) {
  for (const code of codes) AREA_TO_STATE[code] = state;
}
const PHONE_STATE_RE = new RegExp(`\\b(${Object.keys(STATE_AREA_CODES).join("|")})\\b`);

/** Local overlay so the test console can show a corroborated sanctions hit without a paid list. */
export const TEST_WATCHLIST = [{ name: "Alexei Sanctionhit", location: "Newark United States" }];

export type WatchlistEntry = { name: string; location: string; dob?: string; aliasOf?: string };

export type CheckContext = {
  facts: ApplicantFacts;
  watchlist: WatchlistEntry[];
  /** When the OFAC list was loaded. A pass names this date. */
  watchlistFetchedAt?: Date | string | null;
  network: boolean;
  fetchText?: (url: string, init?: { userAgent?: string }) => Promise<{ ok: boolean; status: number; text: string }>;
};

function check(partial: Omit<CheckOutput, "ranAt"> & { ranAt?: string }): CheckOutput {
  return { ranAt: new Date().toISOString(), ...partial };
}

/** One slow source returns unavailable. It does not hold the rest of the case. */
export async function settleWithin<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** A timed-out check is tried once more with twice the budget. The fallback stays unavailable, never a failure. */
export async function settleWithinRetry<T>(work: () => Promise<T>, ms: number, fallback: T): Promise<T> {
  const first = await settleWithin(work(), ms, fallback);
  if (first !== fallback) return first;
  return settleWithin(work(), ms * 2, fallback);
}

function timedOut(key: string, source: string, weight: number): CheckOutput {
  return check({
    key,
    status: "UNAVAILABLE",
    weight,
    finding: "This check timed out. The source could not be checked.",
    source,
    url: "",
  });
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function domainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

export function emailChecks(facts: ApplicantFacts): CheckOutput[] {
  const email = facts.email.trim().toLowerCase();
  const domain = domainOf(email);
  const syntax = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const disposable = DISPOSABLE.has(domain);
  const free = FREE_PROVIDERS.has(domain);
  const roleAddress = /^(info|admin|office|hello|contact|sales|support)@/.test(email);
  const noFootprint = !facts.website.trim() && !facts.linkedinUrl.trim();
  const out: CheckOutput[] = [
    check({
      key: "email-syntax",
      status: syntax ? "PASS" : "FAIL",
      weight: 5,
      finding: syntax ? "The email address is well formed." : "The email address is not well formed.",
      source: "Local syntax check",
      url: "",
    }),
    check({
      key: "email-provider",
      status: "PASS",
      weight: free ? 2 : 6,
      finding: free
        ? "This is a private-email provider. That is allowed. It is a bonus signal only, not a requirement."
        : "The email is not on the free-provider list. Domain match is a bonus, not a requirement.",
      source: "Bundled provider list",
      url: "",
    }),
  ];
  if (disposable) {
    out.push(
      check({
        key: "disposable-email",
        status: "FAIL",
        weight: 20,
        hardFlag: noFootprint,
        reviewFlag: !noFootprint,
        finding: noFootprint
          ? "The email domain is disposable and there is no website or LinkedIn URL to corroborate the person."
          : "The email domain is disposable. A public website or profile is present, so this needs the owner's eye.",
        source: "Bundled disposable-domain list",
        url: "",
      }),
    );
  } else {
    out.push(
      check({
        key: "disposable-email",
        status: "PASS",
        weight: 8,
        finding: "The email domain is not on the bundled disposable list.",
        source: "Bundled disposable-domain list",
        url: "",
      }),
    );
  }
  out.push(
    check({
      key: "role-address",
      status: roleAddress ? "FAIL" : "PASS",
      weight: 4,
      reviewFlag: roleAddress,
      finding: roleAddress ? "The address looks like a shared role inbox." : "The address is not a shared role inbox.",
      source: "Local role-address list",
      url: "",
    }),
  );
  return out;
}

export function phoneStateCheck(facts: ApplicantFacts): CheckOutput {
  const digits = facts.phone.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.length >= 10 ? digits.slice(-10) : "";
  const area = national.length === 10 ? national.slice(0, 3) : "";
  const state = statedUsState(facts.location) || facts.location.toUpperCase().match(PHONE_STATE_RE)?.[1] || "";
  const base = { key: "phone-state", weight: 4, source: "Local area-code table", url: "" };
  if (area && TOLL_FREE_AREA_CODES.has(area)) {
    const where = state ? `so it does not confirm ${state}` : "so it does not confirm a state";
    return check({
      ...base,
      status: "INCONCLUSIVE",
      finding: `The area code ${area} is toll-free, ${where}. This is inconclusive, not a failure.`,
    });
  }
  if (!area || !state) {
    return check({
      ...base,
      status: "INCONCLUSIVE",
      finding: "Phone area code and state could not both be read, so this check is inconclusive.",
    });
  }
  const expected = AREA_TO_STATE[area] || "";
  if (!expected || expected !== state) {
    const where = expected ? `It is used in ${expected}.` : "It is not in the US area-code table.";
    return check({
      ...base,
      status: "INCONCLUSIVE",
      finding: `The area code ${area} is outside the stated state ${state}. ${where} This is inconclusive, not a failure.`,
    });
  }
  return check({
    ...base,
    status: "PASS",
    finding: `The area code ${area} fits ${state}.`,
  });
}

function isIpHost(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(bare)) return true;
  return bare.includes(":");
}

export function rdapRegisteredAt(payload: string): Date | null {
  try {
    const parsed = JSON.parse(payload) as { events?: { eventAction?: string; eventDate?: string }[] };
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    const registration = events.find((event) => /registration|registered/i.test(event.eventAction || ""));
    if (!registration?.eventDate) return null;
    const date = new Date(registration.eventDate);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function youngerThanMonths(registeredAt: Date, months: number, now: Date): boolean {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return registeredAt.getTime() > cutoff.getTime();
}

/** .us has no RDAP service. A bootstrap reply that names no server is the same gap. */
export function rdapServiceMissing(host: string, text: string): boolean {
  const tld = host.split(".").filter(Boolean).pop()?.toLowerCase() || "";
  if (tld === "us") return true;
  return /no rdap servers|no rdap service|unsupported tld|rdap servers? (?:were|was)? not found/i.test(text.slice(0, 800));
}

/** No row for an IP host. A reserved or example name does not earn points. A domain younger than 12 months does not corroborate. */
export function assessRdap(
  host: string,
  http: { ok: boolean; status: number; text: string; failure?: string },
  now = new Date(),
): CheckOutput | null {
  if (!host || isIpHost(host)) return null;
  const url = `https://rdap.org/domain/${host}`;
  const base = { key: "rdap", weight: 4, source: "RDAP", url };
  if (isReservedDomain(host)) {
    return check({
      ...base,
      status: "FAIL",
      reviewFlag: true,
      corroborates: false,
      finding: `RDAP was not treated as a pass for ${host}. This is a reserved or example domain and did not check out.`,
    });
  }
  if (!http.ok) {
    if (rdapServiceMissing(host, http.text)) {
      return check({
        ...base,
        status: "UNAVAILABLE",
        corroborates: false,
        finding: `RDAP couldn't check for free. ${host} uses a TLD with no RDAP service.`,
      });
    }
    if (http.failure === "nxdomain" || http.status === 404) {
      return check({
        ...base,
        status: "FAIL",
        reviewFlag: true,
        corroborates: false,
        finding: `RDAP has no registration for ${host}. domain is not registered. This counts against the company.`,
      });
    }
    return check({
      ...base,
      status: "UNAVAILABLE",
      corroborates: false,
      finding: `RDAP was blocked, timed out, or did not respond for ${host}. This source could not be checked.`,
    });
  }
  const registered = rdapRegisteredAt(http.text);
  if (registered && youngerThanMonths(registered, 12, now)) {
    return check({
      ...base,
      status: "INCONCLUSIVE",
      corroborates: false,
      finding: `RDAP shows ${host} was registered within the last 12 months. A young domain is not corroboration.`,
    });
  }
  return check({
    ...base,
    status: "PASS",
    corroborates: false,
    finding: `RDAP responded for ${host}. Open the record for registrar and registration date. Domain age is a bonus, not proof of identity.`,
  });
}

export function textRiskCheck(facts: ApplicantFacts): CheckOutput {
  const text = `${facts.statement} ${facts.org}`.toLowerCase();
  const fraud = /guaranteed returns/.test(text) && /wire|seed phrase|send funds|no risk/.test(text);
  const letters = text.replace(/[^a-z]/g, "");
  const vowels = letters.replace(/[^aeiou]/g, "").length;
  const gibberish = letters.length > 40 && vowels / letters.length < 0.15;
  if (fraud) {
    return check({
      key: "text-risk",
      status: "FAIL",
      weight: 12,
      hardFlag: true,
      finding: "The write-up matches a fraud pattern: guaranteed returns together with a request to send funds.",
      source: "Local text heuristic",
      url: "",
    });
  }
  if (gibberish) {
    return check({
      key: "text-risk",
      status: "FAIL",
      weight: 6,
      reviewFlag: true,
      finding: "The write-up looks like gibberish. Read it before you decide.",
      source: "Local text heuristic",
      url: "",
    });
  }
  return check({
    key: "text-risk",
    status: facts.statement.trim().length >= 40 ? "PASS" : "INCONCLUSIVE",
    weight: 4,
    finding:
      facts.statement.trim().length >= 40
        ? "The track-record note is long enough to read and has no fraud-pattern phrasing."
        : "The track-record note is short, so this check is inconclusive.",
    source: "Local text heuristic",
    url: "",
  });
}

export function duplicateCheck(facts: ApplicantFacts): CheckOutput {
  if (facts.duplicateOfMember || facts.duplicateOfDeclined) {
    return check({
      key: "duplicate",
      status: "FAIL",
      weight: 16,
      hardFlag: true,
      finding: facts.duplicateOfDeclined
        ? "This email matches a person who was already declined or banned."
        : "This email matches a member who is already on the floor.",
      source: "Private Floor member and application records",
      url: "",
    });
  }
  return check({
    key: "duplicate",
    status: "PASS",
    weight: 8,
    finding: "No existing member or declined application uses this email.",
    source: "Private Floor member and application records",
    url: "",
  });
}

function ofacListDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function sanctionsCheck(facts: ApplicantFacts, watchlist: WatchlistEntry[], fetchedAt?: Date | string | null): CheckOutput {
  const realLoaded = watchlist.length > 0;
  const lists = [...TEST_WATCHLIST, ...watchlist];
  let best = { score: 0, entry: null as WatchlistEntry | null, field: "" };
  for (const entry of lists) {
    const person = nameMatchScore(facts.name, entry.name);
    const company = nameMatchScore(facts.org, entry.name);
    const score = Math.max(person, company);
    const field = person >= company ? "name" : "company";
    if (score > best.score) best = { score, entry, field };
  }
  const overlayHit = Boolean(best.entry && TEST_WATCHLIST.some((entry) => entry.name === best.entry?.name) && !watchlist.some((entry) => entry.name === best.entry?.name));
  if (!best.entry || best.score < SANCTIONS_MATCH_THRESHOLD) {
    if (!realLoaded) {
      return check({
        key: "sanctions",
        status: "NOT_RUN",
        weight: 10,
        finding: "OFAC was not checked. No list was loaded. This is not a pass.",
        source: "OFAC SDN cache",
        url: "https://ofac.treasury.gov/sanctions-list-service",
      });
    }
    const date = ofacListDate(fetchedAt);
    return check({
      key: "sanctions",
      status: "PASS",
      weight: 10,
      finding: date
        ? `No name matched the OFAC list loaded ${date}.`
        : "No name matched the OFAC list that was loaded. The list date was not recorded.",
      source: "OFAC SDN cache",
      url: "https://ofac.treasury.gov/sanctions-list-service",
    });
  }
  const byLocation = locationsCorroborate(facts.location, best.entry.location);
  const corroborated = sanctionsCorroborated(facts, best.entry);
  return check({
    key: "sanctions",
    status: "FAIL",
    weight: 20,
    hardFlag: corroborated,
    reviewFlag: !corroborated,
    finding: corroborated
      ? byLocation
        ? `Watchlist name match on ${best.entry.name} (${best.field}) and the application location lines up with ${best.entry.location}.`
        : `Watchlist name match on ${best.entry.name} (${best.field}) and a date of birth in the file lines up with ${best.entry.dob}.`
      : `Possible watchlist match on ${best.entry.name} without country or date-of-birth corroboration. Owner review, not an automatic red flag.`,
    source: overlayHit ? "Private Floor test overlay (not a loaded sanctions list)" : "OFAC SDN cache",
    url: "https://ofac.treasury.gov/sanctions-list-service",
  });
}

export function linkedinFormatCheck(facts: ApplicantFacts): CheckOutput {
  const url = facts.linkedinUrl.trim();
  if (!url) {
    return check({
      key: "linkedin-format",
      status: "INCONCLUSIVE",
      weight: 4,
      finding: "No LinkedIn URL was provided.",
      source: "Local URL check",
      url: "",
    });
  }
  const ok = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:in|company)\/[a-z0-9\-_%&.]+(?:\/[a-z0-9\-_%&.]+)*\/?(?:\?[^#]*)?(?:#.*)?$/i.test(url);
  return check({
    key: "linkedin-format",
    status: ok ? "PASS" : "FAIL",
    weight: 4,
    reviewFlag: !ok,
    finding: ok ? "The LinkedIn URL has a public profile shape." : "The LinkedIn URL is not a public /in or /company link.",
    source: "Local URL check",
    url,
  });
}

export function sanctionsCorroborated(facts: ApplicantFacts, entry: WatchlistEntry): boolean {
  if (locationsCorroborate(facts.location, entry.location)) return true;
  const year = (entry.dob || "").match(/\b(?:19|20)\d{2}\b/)?.[0];
  if (!year) return false;
  return new RegExp(`\\b(?:dob|born)\\b[^\\n]{0,40}\\b${year}\\b`, "i").test(`${facts.statement} ${facts.location}`);
}

const GENERIC_SITE_TOKENS = new Set([
  "example",
  "domain",
  "test",
  "holding",
  "holdings",
  "company",
  "companies",
  "group",
  "partner",
  "partners",
  "llc",
  "inc",
  "incorporated",
  "the",
  "and",
  "for",
  "capital",
  "realty",
  "properties",
  "property",
  "limited",
  "corp",
  "corporation",
  "club",
  "private",
  "floor",
  "real",
  "estate",
  "development",
  "developers",
  "investments",
  "investment",
  "management",
  "associates",
  "advisory",
  "advisors",
  "builders",
  "construction",
]);

function siteTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Shared by the application report and the company report. A short or generic fragment is not a match. */
export function websiteNamesMatch(blob: string, personName: string, org: string): boolean {
  const text = blob.toLowerCase();
  const person = siteTokens(personName).filter((token) => token.length >= 3 && !GENERIC_SITE_TOKENS.has(token));
  const personHit =
    person.length >= 2
      ? person.every((token) => text.includes(token))
      : person.length === 1 && person[0].length >= 4 && text.includes(person[0]);
  const orgHit = siteTokens(org).some((token) => token.length >= 6 && !GENERIC_SITE_TOKENS.has(token) && text.includes(token));
  return personHit || orgHit;
}

export function cardConsistencyCheck(facts: ApplicantFacts): CheckOutput {
  const card = facts.cardText.trim();
  if (!card) {
    if (facts.cardUploaded) {
      return check({
        key: "business-card",
        status: "UNAVAILABLE",
        weight: 10,
        finding:
          "The business card image could not be checked. OCR is installed (tesseract.js) and did not return readable text. The file is on the application for a Private Floor administrator to read.",
        source: "Card text compare",
        url: "",
      });
    }
    return check({
      key: "business-card",
      status: "NOT_RUN",
      weight: 10,
      finding: "No business card was uploaded.",
      source: "Card text compare",
      url: "",
    });
  }
  const nameHit = mentionsPerson(card, facts.name);
  const orgHit = facts.org.trim().length > 2 && mentionsCompany(card, facts.org, facts.name);
  if (nameHit && orgHit) {
    return check({
      key: "business-card",
      status: "PASS",
      weight: 10,
      finding: "The card text includes the applicant's full first and last name and the company. The card is self-reported. It does not independently tie the person to the company.",
      source: "Card text compare",
      url: "",
      corroborates: false,
      selfReported: true,
    });
  }
  return check({
    key: "business-card",
    status: "FAIL",
    weight: 10,
    reviewFlag: true,
    finding: "The card text does not line up with the name and company on the application.",
    source: "Card text compare",
    url: "",
  });
}

function inviteToken(note: string): string {
  const head = note.split("·")[0] || note;
  return normalizeInviteCode(head);
}

export function inviteCheck(facts: ApplicantFacts): CheckOutput {
  const note = facts.inviteNote.trim();
  if (!note) {
    return check({
      key: "invite-source",
      status: "NOT_RUN",
      weight: 6,
      finding: "No referral or request code was stored",
      source: "Referral or request code",
      url: "",
    });
  }
  const token = inviteToken(note);
  const formatOk = token.length >= 4 && /^[A-Z0-9-]+$/.test(token);
  if (facts.inviteValid === false || !formatOk) {
    return check({
      key: "invite-source",
      status: "FAIL",
      weight: 6,
      reviewFlag: true,
      finding: "The referral or request code was supplied but is not valid.",
      source: "Referral or request code",
      url: "",
    });
  }
  return check({
    key: "invite-source",
    status: "PASS",
    weight: 6,
    finding: `Referral or request: ${facts.inviteNote}.`,
    source: "Referral or request code",
    url: "",
  });
}

/**
 * A made-up company token. Strict signs only: no vowel, the same letter three times,
 * or five consonants in a row once h is ignored. A q that is not followed by u
 * is a real brand pattern (Northmarq) and is not enough on its own.
 * A consonant pair or a q/x/z/j cluster is not enough. Those flags mark real
 * surnames such as Schwartz, Herzka, and Hovnanian.
 */
export function tokenLooksGibberish(token: string): boolean {
  const word = token.toLowerCase();
  if (word.length < 4) return false;
  if (!/[aeiouy]/.test(word)) return true;
  if (/(.)\1\1/.test(word)) return true;
  const withoutH = word.replace(/h/g, "");
  if (/[^aeiouy]{5,}/.test(withoutH)) return true;
  return false;
}

/** Person-name tokens that fail the strict company rule. This is a note, not a failing check. */
export function personNameTokensLookMadeUp(name: string): boolean {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length >= 4 && !/^(jr|sr|ii|iii|iv)$/.test(token))
    .some((token) => tokenLooksGibberish(token));
}

export function companyNameLooksReal(org: string): boolean {
  if (org.trim().length < 2 || /asdf|qwerty|testtest/i.test(org)) return false;
  return !companyPhraseTokens(org).some((token) => tokenLooksGibberish(token));
}

export function plausibilityCheck(facts: ApplicantFacts): CheckOutput {
  const parts = facts.name.trim().split(/\s+/).filter(Boolean);
  const firmToken = parts.length === 1 ? parts[0].toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const orgToken = facts.org.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const oneWordFirm =
    parts.length === 1 &&
    companyNameLooksReal(facts.org) &&
    (isDistinctiveCompanyToken(firmToken) || isShortBrandToken(firmToken)) &&
    (firmToken === orgToken || orgToken.startsWith(firmToken));
  const nameOk = (parts.length >= 2 && facts.name.trim().length >= 5) || oneWordFirm;
  const orgReal = companyNameLooksReal(facts.org);
  // Person names are not failed by the gibberish heuristic. A strict mash is an attention note and the points stay.
  const personReal = true;
  const roleKnown = annualDuesCents(facts.role) >= 0;
  if (nameOk && orgReal && personReal && roleKnown) {
    const madeUpPerson = personNameTokensLookMadeUp(facts.name);
    return check({
      key: "plausibility",
      status: "PASS",
      weight: 4,
      finding: madeUpPerson
        ? "The name, company, and role are filled in and readable. The person name may not be real words. This note does not change the points."
        : "The name, company, and role are filled in and readable.",
      source: "Local plausibility heuristic",
      url: "",
    });
  }
  const gibberish = !orgReal && facts.org.trim().length >= 2;
  return check({
    key: "plausibility",
    status: "FAIL",
    weight: 4,
    reviewFlag: true,
    finding: gibberish
      ? "The company name does not look like real words."
      : !personReal
        ? "The person name does not look like real words."
        : "The name or company looks incomplete. Read the application before you decide.",
    source: "Local plausibility heuristic",
    url: "",
  });
}

export function velocityCheck(facts: ApplicantFacts): CheckOutput {
  if (facts.recentApplications >= 3) {
    return check({
      key: "velocity",
      status: "FAIL",
      weight: 6,
      reviewFlag: true,
      finding: `${facts.recentApplications} applications used this email in the last hour. Look at the timing before you decide.`,
      source: "Private Floor application records",
      url: "",
    });
  }
  return check({
    key: "velocity",
    status: "PASS",
    weight: 4,
    finding: "No burst of applications from this email in the last hour.",
    source: "Private Floor application records",
    url: "",
  });
}

export function socialFormatCheck(facts: ApplicantFacts): CheckOutput {
  const links = facts.socialLinks.split(/\s+/).map((item) => item.trim()).filter(Boolean);
  if (!links.length) {
    return check({
      key: "social-links",
      status: "INCONCLUSIVE",
      weight: 2,
      finding: "No other social links were provided.",
      source: "Local URL check",
      url: "",
    });
  }
  const bad = links.filter((link) => !/^https?:\/\//i.test(link));
  if (bad.length) {
    return check({
      key: "social-links",
      status: "FAIL",
      weight: 2,
      reviewFlag: true,
      finding: "A social link does not start with http. Ask the applicant to send a full URL.",
      source: "Local URL check",
      url: links[0] || "",
    });
  }
  return check({
    key: "social-links",
    status: "PASS",
    weight: 2,
    finding: `${links.length} social link${links.length === 1 ? "" : "s"} use a full URL. A blocked public page is inconclusive, not a failure.`,
    source: "Local URL check",
    url: links[0] || "",
  });
}

/**
 * An exact EDGAR filer incorporated in another state. The address-state miss does not count against the company.
 * A free registry in the incorporation state replaces the miss when that lookup passes.
 */
export function noteIncorporationRegistry(
  registry: CheckOutput,
  edgarFinding: string,
  addressState: string,
  incorporationPass?: CheckOutput | null,
): CheckOutput {
  const incorporated = incorporationStateFromFinding(edgarFinding);
  if (!incorporated || !addressState || incorporated === addressState || !edgarIsExactCompany(edgarFinding)) return registry;
  if (registry.status === "PASS") return registry;
  if (incorporationPass?.status === "PASS") {
    return {
      ...registry,
      status: "PASS",
      finding: incorporationPass.finding,
      source: incorporationPass.source || registry.source,
      url: incorporationPass.url || registry.url,
      corroborates: false,
      reviewFlag: undefined,
    };
  }
  const url = stateRegistrySearchUrl(incorporated) || registry.url;
  const finding = `${registry.finding} This miss does not count against the company. EDGAR lists an exact match incorporated in ${incorporated}. Open the ${incorporated} secretary of state search.`
    .replace(/\s+/g, " ")
    .trim();
  return { ...registry, finding, url };
}

export function registryLinkCheck(facts: ApplicantFacts): CheckOutput {
  const state = statedUsState(facts.location) || "";
  const portal = state ? registryPortal(state) : undefined;
  if (portal) {
    return check({
      key: "business-registry",
      status: "NOT_RUN",
      weight: 8,
      finding: `${portal.label} was not searched on this pass. A skipped search is not a pass.`,
      source: portal.source,
      url: portal.portalUrl,
    });
  }
  const url = state ? stateRegistrySearchUrl(state) : "";
  if (!state || !url) {
    return check({
      key: "business-registry",
      status: "NOT_RUN",
      weight: 8,
      finding: state
        ? `Couldn't check for free. No free ${state} registry API. Open the state search and look up ${facts.org}.`
        : "Couldn't check for free. No free registry API for this location. Open the state search and look up the company.",
      source: "State registry",
      url: "",
    });
  }
  return check({
    key: "business-registry",
    status: "NOT_RUN",
    weight: 8,
    finding: manualRegistryFinding(state, facts.org),
    source: "State registry",
    url,
  });
}

async function pageText(fetchText: NonNullable<CheckContext["fetchText"]>, url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const result = await fetchText(url);
    return { ...result, text: stripHtml(result.text) };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

export async function networkChecks(ctx: CheckContext): Promise<CheckOutput[]> {
  if (!ctx.network || !ctx.fetchText) {
    return [
      check({
        key: "mx",
        status: "NOT_RUN",
        weight: 6,
        finding: "MX lookup was not run in this pass.",
        source: "DNS",
        url: "",
      }),
      check({
        key: "website",
        status: "NOT_RUN",
        weight: 14,
        finding: "Website, RDAP, EDGAR, courts, web search, and news were not run in this pass.",
        source: "Network",
        url: "",
      }),
    ];
  }
  const fetchText = ctx.fetchText;
  const searchFacts = factsForSearch(ctx.facts);
  const out: CheckOutput[] = [];
  const domain = domainOf(ctx.facts.email);
  if (domain && !DISPOSABLE.has(domain)) {
    let mxTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const dns = await import(/* webpackIgnore: true */ "node:dns/promises");
      const records = await Promise.race([
        dns.resolveMx(domain),
        new Promise<never>((_, reject) => {
          mxTimer = setTimeout(() => reject(new Error("timeout")), 8_000);
        }),
      ]);
      out.push(
        check({
          key: "mx",
          status: records.length ? "PASS" : "INCONCLUSIVE",
          weight: 6,
          finding: records.length ? `MX records exist for ${domain}.` : `No MX records were returned for ${domain}.`,
          source: "DNS MX lookup",
          url: "",
        }),
      );
    } catch {
      out.push(
        check({
          key: "mx",
          status: "UNAVAILABLE",
          weight: 6,
          finding: `MX lookup for ${domain} timed out or did not complete. The source could not be checked.`,
          source: "DNS MX lookup",
          url: "",
        }),
      );
    } finally {
      if (mxTimer) clearTimeout(mxTimer);
    }
  } else {
    out.push(
      check({
        key: "mx",
        status: "NOT_RUN",
        weight: 6,
        finding: domain ? "MX lookup skipped for a disposable domain." : "No email domain to look up.",
        source: "DNS MX lookup",
        url: "",
      }),
    );
  }
  const statedSite = ctx.facts.website.trim();
  let host = "";
  try {
    host = statedSite ? new URL(statedSite.startsWith("http") ? statedSite : `https://${statedSite}`).host : "";
  } catch {
    host = "";
  }
  const rdapHost = host ? registrableHost(host) : "";
  if (rdapHost && isReservedDomain(rdapHost)) {
    const judged = assessRdap(rdapHost, { ok: false, status: 0, text: "" });
    if (judged) out.push(judged);
  } else if (rdapHost && !FREE_PROVIDERS.has(rdapHost) && !isIpHost(rdapHost)) {
    const rdap = await settleWithin(pageText(fetchText, `https://rdap.org/domain/${rdapHost}`), 20_000, { ok: false, status: 0, text: "" });
    const judged = assessRdap(rdapHost, rdap);
    if (judged) out.push(judged);
  }
  const screenSink: CheckOutput[] = [];
  let screenRows: CheckOutput[] | null = null;
  try {
    const pending: Promise<CheckOutput[] | null> = runPublicScreen(searchFacts, fetchText, screenSink);
    screenRows = await settleWithin(pending, 120_000, null);
  } catch {
    screenRows = null;
  }
  // A finished row stays. A row the timeout dropped is unavailable, not a miss and not a failure.
  out.push(...completeScreenRows(screenRows ?? screenSink.slice()));
  const registryState = statedUsState(ctx.facts.location || "");
  const portal = registryState ? registryPortal(registryState) : undefined;
  const domainResolves = !out.some((row) => row.key === "website" && /does not resolve|is not registered/i.test(row.finding));
  if (portal) {
    const registryUrl = portal.state === "NY" ? nyRegistryQueryUrl(searchFacts.org) : socrataRegistryUrl(portal, searchFacts.org);
    const registryHttp = await settleWithin(fetchText(registryUrl).catch(() => ({ ok: false, status: 0, text: "" })), 20_000, {
      ok: false,
      status: 0,
      text: "",
    });
    const registry = portal.state === "NY"
      ? assessNyRegistry(searchFacts.org, registryHttp, searchFacts.website, domainResolves)
      : assessStateRegistry(portal, searchFacts.org, registryHttp, searchFacts.website, domainResolves);
    out.push(
      check({
        key: "business-registry",
        status: registry.status,
        weight: 8,
        finding: registry.finding,
        source: portal.source,
        url: registry.url,
        corroborates: false,
      }),
    );
  }
  const registryRow = out.find((row) => row.key === "business-registry");
  const wantsBankFind = /\bbank\b/i.test(searchFacts.org) || (/\blender\b/i.test(searchFacts.role || "") && registryRow?.status !== "PASS");
  if (wantsBankFind && registryRow?.status !== "PASS") {
    const fdicHttp = await settleWithin(fetchText(fdicBankFindUrl(searchFacts.org)).catch(() => ({ ok: false, status: 0, text: "" })), 20_000, {
      ok: false,
      status: 0,
      text: "",
    });
    const fdic = assessFdicBank(searchFacts.org, searchFacts.location, fdicHttp);
    if (fdic) {
      const row = check({
        key: "business-registry",
        status: fdic.status,
        weight: 8,
        finding: fdic.finding,
        source: "FDIC BankFind",
        url: fdic.url,
        corroborates: false,
        reviewFlag: fdic.reviewFlag,
      });
      const index = out.findIndex((item) => item.key === "business-registry");
      if (index >= 0) out[index] = row;
      else out.push(row);
    }
  }
  const edgar = await settleWithin(lookupEdgar(searchFacts.org, searchFacts.applicantName || searchFacts.name, fetchText, searchFacts.website), 40_000, {
    status: "UNAVAILABLE" as const,
    corroborates: false,
    url: "https://www.sec.gov/edgar/search/",
    finding: "EDGAR was blocked, timed out, or did not respond. This source could not be checked.",
  });
  out.push(
    check({
      key: "edgar",
      status: edgar.status,
      weight: 12,
      finding: edgar.finding,
      source: "SEC EDGAR",
      url: edgar.url,
      corroborates: edgar.corroborates,
      reviewFlag: edgar.reviewFlag,
      companyOnly: edgar.companyOnly,
    }),
  );
  const incorporated = incorporationStateFromFinding(edgar.finding);
  const registryIndex = out.findIndex((row) => row.key === "business-registry");
  if (registryIndex >= 0 && incorporated && registryState && incorporated !== registryState && edgarIsExactCompany(edgar.finding)) {
    const homePortal = registryPortal(incorporated);
    let incorporationPass: CheckOutput | null = null;
    if (homePortal) {
      const homeUrl = homePortal.state === "NY" ? nyRegistryQueryUrl(searchFacts.org) : socrataRegistryUrl(homePortal, searchFacts.org);
      const homeHttp = await settleWithin(fetchText(homeUrl).catch(() => ({ ok: false, status: 0, text: "" })), 20_000, {
        ok: false,
        status: 0,
        text: "",
      });
      const home = homePortal.state === "NY"
        ? assessNyRegistry(searchFacts.org, homeHttp, searchFacts.website, domainResolves)
        : assessStateRegistry(homePortal, searchFacts.org, homeHttp, searchFacts.website, domainResolves);
      if (home.status === "PASS") {
        incorporationPass = check({
          key: "business-registry",
          status: "PASS",
          weight: 8,
          finding: home.finding,
          source: homePortal.source,
          url: home.url,
          corroborates: false,
        });
      }
    }
    out[registryIndex] = noteIncorporationRegistry(out[registryIndex], edgar.finding, registryState, incorporationPass);
  }
  const courtQuery = courtSearchQuery(ctx.facts.name);
  const courtUrl = courtQuery
    ? `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(courtQuery)}&type=o`
    : "https://www.courtlistener.com/";
  const courtFallback = { ok: false, status: 0, text: "", failure: "timeout" as const };
  const court = courtQuery
    ? await settleWithin(fetchText(courtUrl).catch(() => courtFallback), 12_000, courtFallback)
    : { ok: true, status: 200, text: JSON.stringify({ results: [] }) };
  out.push(check({ ...assessCourts(court.text, court, ctx.facts), url: courtUrl }));
  const companyQuery = searchFacts.org.trim();
  const registryHttp = companyQuery
    ? await settleWithin(fetchText(openCorporatesApiUrl(companyQuery)).catch(() => ({ ok: false, status: 0, text: "" })), 20_000, {
        ok: false,
        status: 0,
        text: "",
      })
    : { ok: false, status: 0, text: "" };
  out.push(check(assessOpenCorporates(companyQuery, registryHttp)));
  const sanctionsQuery = ctx.facts.name.trim() || companyQuery;
  const sanctionsHttp = sanctionsQuery
    ? await settleWithin(fetchText(openSanctionsApiUrl(sanctionsQuery)).catch(() => ({ ok: false, status: 0, text: "" })), 20_000, {
        ok: false,
        status: 0,
        text: "",
      })
    : { ok: false, status: 0, text: "" };
  out.push(check(assessOpenSanctions(ctx.facts, sanctionsHttp)));
  // Public screening always records web-footprint, including an explicit miss. The direct
  // webFootprintCheck helper is not a second production pass.
  const newsFallback = [timedOut("news", "News", 8)];
  out.push(...(await settleWithinRetry(() => newsChecks(searchFacts, fetchText), 45_000, newsFallback)));
  return out;
}

export function strongFixtureChecks(): CheckOutput[] {
  return [
    check({
      key: "fixture-website",
      status: "PASS",
      weight: 14,
      finding: "Test fixture: the sample company site names this person. This row exists so the owner can see a LEGIT recommendation offline.",
      source: "Test fixture (local)",
      url: "",
      corroborates: true,
    }),
    check({
      key: "fixture-edgar",
      status: "PASS",
      weight: 12,
      finding: "Test fixture: a public filing name matches the sample company.",
      source: "Test fixture (local)",
      url: "",
      corroborates: true,
    }),
    check({
      key: "fixture-web",
      status: "PASS",
      weight: 12,
      finding: "Test fixture: a public directory mentions the sample person at the sample company.",
      corroborates: true,
      source: "Test fixture (local)",
      url: "",
    }),
  ];
}

const ADDRESS_SOURCE = "US state and ZIP ranges; US Census Geocoder, then OpenStreetMap Nominatim, when a street is present";

export async function resolveAddressCheck(ctx: CheckContext): Promise<CheckOutput | null> {
  const local = assessLocalAddress(ctx.facts.location || "");
  const base = { key: "address", weight: 2, source: ADDRESS_SOURCE, url: "" };
  if (local.kind === "absent") return null;
  if (local.kind === "non-us") {
    return check({ ...base, status: "INCONCLUSIVE", corroborates: false, finding: local.finding });
  }
  if (local.kind === "invalid") {
    return check({ ...base, status: "FAIL", reviewFlag: true, corroborates: false, finding: local.finding });
  }
  if (local.kind === "unstructured") {
    return check({
      ...base,
      status: "PASS",
      corroborates: false,
      finding: "A location is on the application. It is not a US street address, so the state and ZIP were not checked.",
    });
  }
  if (!local.geocode || !ctx.network || !ctx.fetchText) {
    const finding = local.parsed.zip
      ? "The state and ZIP on the application check out. No street was sent to the Census geocoder."
      : "The state on the application is a US state code. No ZIP or street was sent to the Census geocoder.";
    return check({
      ...base,
      status: "PASS",
      corroborates: false,
      finding,
    });
  }
  const forms = streetGeocodeForms(local.parsed.street);
  const census = await askGeocoder(ctx, forms, local.parsed, "census");
  if (census.kind === "match") {
    return check({
      ...base,
      status: "PASS",
      url: census.url,
      corroborates: false,
      finding: "The Census geocoder matched this street address. The state and ZIP also check out.",
    });
  }
  const nominatim = await askGeocoder(ctx, forms, local.parsed, "nominatim");
  if (nominatim.kind === "match") {
    const censusNote = census.kind === "none" ? "The Census geocoder returned no match. " : "The Census geocoder did not respond. ";
    return check({
      ...base,
      status: "PASS",
      url: nominatim.url,
      corroborates: false,
      finding: `${censusNote}OpenStreetMap Nominatim matched this street address. The state and ZIP also check out.`,
    });
  }
  if (census.kind === "invalid" || nominatim.kind === "invalid") {
    return check({
      ...base,
      status: "FAIL",
      url: nominatim.url || census.url,
      corroborates: false,
      finding: "The address did not check out. The geocoder said this address is invalid.",
    });
  }
  const url = nominatim.url || census.url;
  const bothDown = census.kind === "down" && nominatim.kind === "down";
  const bothMissed = census.kind === "none" && nominatim.kind === "none";
  const finding = bothDown
    ? "Could not check. The Census geocoder and OpenStreetMap Nominatim did not respond. This is inconclusive. It is not a pass and not a failure."
    : bothMissed
      ? "Could not check. The Census geocoder and OpenStreetMap Nominatim returned no match. This is inconclusive. It is not a pass and not a failure."
      : "Could not check. A geocoder returned no match and the other did not respond. This is inconclusive. It is not a pass and not a failure.";
  return check({
    ...base,
    status: "INCONCLUSIVE",
    url,
    corroborates: false,
    finding,
  });
}

async function askGeocoder(
  ctx: CheckContext,
  forms: string[],
  parsed: ParsedAddress,
  source: "census" | "nominatim",
): Promise<{ kind: "match"; url: string } | { kind: "none"; url: string } | { kind: "invalid"; url: string } | { kind: "down"; url: string }> {
  let lastUrl = "";
  let sawNone = false;
  for (const street of forms) {
    const addressed = { ...parsed, street };
    const url = source === "census" ? censusGeocodeUrl(addressed) : nominatimGeocodeUrl(addressed);
    lastUrl = url;
    try {
      const http = await ctx.fetchText?.(url);
      if (!http?.ok) continue;
      if (geocoderSaysAddressInvalid(http.text)) return { kind: "invalid", url };
      const judged = source === "census" ? assessCensusBody(http.text, parsed) : assessNominatimBody(http.text, parsed);
      if (judged === "match") return { kind: "match", url };
      if (judged === "none") sawNone = true;
    } catch {
      continue;
    }
  }
  return sawNone ? { kind: "none", url: lastUrl } : { kind: "down", url: lastUrl };
}

export async function collectChecks(ctx: CheckContext): Promise<CheckOutput[]> {
  const registryState = statedUsState(ctx.facts.location || "");
  const registryOnNetwork = Boolean(ctx.network && registryState && registryPortal(registryState));
  const local = [
    ...emailChecks(ctx.facts),
    phoneStateCheck(ctx.facts),
    textRiskCheck(ctx.facts),
    duplicateCheck(ctx.facts),
    sanctionsCheck(ctx.facts, ctx.watchlist, ctx.watchlistFetchedAt),
    linkedinFormatCheck(ctx.facts),
    cardConsistencyCheck(ctx.facts),
    inviteCheck(ctx.facts),
    plausibilityCheck(ctx.facts),
    velocityCheck(ctx.facts),
    socialFormatCheck(ctx.facts),
    ...(registryOnNetwork ? [] : [registryLinkCheck(ctx.facts)]),
  ];
  const address = await resolveAddressCheck(ctx);
  const remote = await networkChecks(ctx);
  const fixture = ctx.facts.testProfile === "strong" && !ctx.network ? strongFixtureChecks() : [];
  return alignNewsRows([...local, ...(address ? [address] : []), ...remote, ...fixture]);
}
