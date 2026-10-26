import { annualDuesCents } from "@/lib/dues";
import { assessCourts } from "@/lib/verify/courts";
import { locationsCorroborate, nameMatchScore, SANCTIONS_MATCH_THRESHOLD } from "@/lib/verify/fuzzy";
import { registrableHost } from "@/lib/verify/host";
import { mentionsCompany, mentionsPerson } from "@/lib/verify/public-match";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";
import { assessOpenCorporates, assessOpenSanctions, openCorporatesApiUrl, openSanctionsApiUrl } from "@/lib/verify/free-sources";
import { newsChecks } from "@/lib/verify/news";
import { lookupEdgar } from "@/lib/verify/edgar";
import { assessNyRegistry, nyRegistryQueryUrl } from "@/lib/verify/ny-registry";
import { runPublicScreen } from "@/lib/verify/screen";

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
};

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
  network: boolean;
  fetchText?: (url: string) => Promise<{ ok: boolean; status: number; text: string }>;
};

function check(partial: Omit<CheckOutput, "ranAt"> & { ranAt?: string }): CheckOutput {
  return { ranAt: new Date().toISOString(), ...partial };
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
  const area = digits.length >= 10 ? digits.slice(-10, -7) : "";
  const state = facts.location.toUpperCase().match(PHONE_STATE_RE)?.[1] || "";
  const expected = area ? AREA_TO_STATE[area] : "";
  if (!area || !expected || !state) {
    return check({
      key: "phone-state",
      status: "INCONCLUSIVE",
      weight: 4,
      finding: "Phone area code and state could not both be read, so this check is inconclusive.",
      source: "Local area-code table",
      url: "",
    });
  }
  if (expected === state) {
    return check({
      key: "phone-state",
      status: "PASS",
      weight: 4,
      finding: `The area code ${area} fits ${state}.`,
      source: "Local area-code table",
      url: "",
    });
  }
  return check({
    key: "phone-state",
    status: "INCONCLUSIVE",
    weight: 4,
    finding: `The area code ${area} usually maps to ${expected}, while the application says ${state}. This is inconclusive, not a failure. Look at the phone before you decide.`,
    source: "Local area-code table",
    url: "",
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

export function sanctionsCheck(facts: ApplicantFacts, watchlist: WatchlistEntry[]): CheckOutput {
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
        finding: "No OFAC watchlist was loaded, so this check did not run. The local test name is not a loaded list and is not a pass.",
        source: "OFAC SDN cache",
        url: "https://ofac.treasury.gov/sanctions-list-service",
      });
    }
    return check({
      key: "sanctions",
      status: "PASS",
      weight: 10,
      finding: "No corroborated sanctions or watchlist name match on the OFAC list that was loaded.",
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
  const ok = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-z0-9\-_%]+(?:\/[a-z0-9\-_%]+)*\/?(?:\?[^#]*)?(?:#.*)?$/i.test(url);
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

export function inviteCheck(facts: ApplicantFacts): CheckOutput {
  if (!facts.inviteNote.trim()) {
    return check({
      key: "invite-source",
      status: "INCONCLUSIVE",
      weight: 6,
      finding: "No invite note was stored, so the sponsoring member is not named here.",
      source: "Invite code",
      url: "",
    });
  }
  return check({
    key: "invite-source",
    status: "PASS",
    weight: 6,
    finding: `Invite source: ${facts.inviteNote}.`,
    source: "Invite code",
    url: "",
  });
}

export function plausibilityCheck(facts: ApplicantFacts): CheckOutput {
  const nameOk = facts.name.trim().split(/\s+/).length >= 2 && facts.name.trim().length >= 5;
  const orgOk = facts.org.trim().length >= 2 && !/asdf|qwerty|testtest/i.test(facts.org);
  const roleKnown = annualDuesCents(facts.role) >= 0;
  if (nameOk && orgOk && roleKnown) {
    return check({
      key: "plausibility",
      status: "PASS",
      weight: 4,
      finding: "The name, company, and role are filled in and readable.",
      source: "Local plausibility heuristic",
      url: "",
    });
  }
  return check({
    key: "plausibility",
    status: "FAIL",
    weight: 4,
    reviewFlag: true,
    finding: "The name or company looks incomplete. Read the application before you decide.",
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

export function registryLinkCheck(facts: ApplicantFacts): CheckOutput {
  const state = facts.location.toUpperCase().match(/\b(NJ|NY|DE|FL|TX|DC|CA|IL|MA|WA|GA|PA|CT|MD|CO|VA)\b/)?.[1];
  const links: Record<string, string> = {
    NJ: "https://www.njportal.com/DOR/BusinessNameSearch/",
    NY: "https://apps.dos.ny.gov/publicInquiry/",
    DE: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx",
    FL: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
    TX: "https://mycpa.cpa.state.tx.us/coa/",
    DC: "https://os.dc.gov/service/corporate-registration-search",
    CA: "https://bizfileonline.sos.ca.gov/search/business",
    IL: "https://www.ilsos.gov/departments/business_services/corp.html",
    MA: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx",
    WA: "https://ccfs.sos.wa.gov/",
    GA: "https://ecorp.sos.ga.gov/BusinessSearch",
    PA: "https://www.corporations.pa.gov/search/corpsearch",
    CT: "https://service.ct.gov/business/s/onlinebusinesssearch",
    MD: "https://egov.maryland.gov/businessexpress/entitysearch",
    CO: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
    VA: "https://cis.scc.virginia.gov/",
  };
  if (state === "NY") {
    return check({
      key: "business-registry",
      status: "NOT_RUN",
      weight: 8,
      finding: "NY Active Corporations was not searched on this pass. A skipped search is not a pass.",
      source: "NY Active Corporations",
      url: "https://data.ny.gov/d/n9v6-gdp6",
    });
  }
  if (!state || !links[state]) {
    return check({
      key: "business-registry",
      status: "NOT_RUN",
      weight: 8,
      finding: "Couldn't check for free. No stable free registry API for this state. Search the secretary of state manually.",
      source: "State registry",
      url: "",
    });
  }
  return check({
    key: "business-registry",
    status: "NOT_RUN",
    weight: 8,
    finding: `Couldn't check for free. No free ${state} registry API. Open the state search and look up ${facts.org}.`,
    source: "State registry",
    url: links[state],
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
  const out: CheckOutput[] = [];
  const domain = domainOf(ctx.facts.email);
  if (domain && !DISPOSABLE.has(domain)) {
    try {
      const dns = await import(/* webpackIgnore: true */ "node:dns/promises");
      const records = await dns.resolveMx(domain);
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
  if (rdapHost && !FREE_PROVIDERS.has(rdapHost)) {
    const rdap = await pageText(fetchText, `https://rdap.org/domain/${rdapHost}`);
    const rdapMissing = rdap.status === 404;
    out.push(
      check({
        key: "rdap",
        status: rdap.ok ? "PASS" : rdapMissing ? "INCONCLUSIVE" : "UNAVAILABLE",
        weight: 4,
        finding: rdap.ok
          ? `RDAP responded for ${rdapHost}. Open the record for registrar and registration date. Domain age is a bonus, not proof of identity.`
          : rdapMissing
            ? `RDAP responded for ${rdapHost}. No data found for that domain.`
            : `RDAP was blocked, timed out, or did not respond for ${rdapHost}. This source could not be checked.`,
        source: "RDAP",
        url: `https://rdap.org/domain/${rdapHost}`,
      }),
    );
  }
  out.push(...(await runPublicScreen(ctx.facts, fetchText)));
  if (/\bNY\b/i.test(ctx.facts.location || "")) {
    const registryUrl = nyRegistryQueryUrl(ctx.facts.org);
    const registryHttp = await fetchText(registryUrl).catch(() => ({ ok: false, status: 0, text: "" }));
    const registry = assessNyRegistry(ctx.facts.org, registryHttp);
    out.push(
      check({
        key: "business-registry",
        status: registry.status,
        weight: 8,
        finding: registry.finding,
        source: "NY Active Corporations",
        url: registry.url,
        corroborates: false,
      }),
    );
  }
  const edgar = await lookupEdgar(ctx.facts.org, ctx.facts.applicantName || ctx.facts.name, fetchText);
  out.push(
    check({
      key: "edgar",
      status: edgar.status,
      weight: 12,
      finding: edgar.finding,
      source: "SEC EDGAR",
      url: edgar.url,
      corroborates: edgar.corroborates,
    }),
  );
  const courtUrl = `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(`"${ctx.facts.name}"`)}&type=o`;
  const court = await fetchText(courtUrl);
  out.push(check({ ...assessCourts(court.text, court, ctx.facts), url: courtUrl }));
  const companyQuery = ctx.facts.org.trim();
  const registryHttp = companyQuery
    ? await fetchText(openCorporatesApiUrl(companyQuery)).catch(() => ({ ok: false, status: 0, text: "" }))
    : { ok: false, status: 0, text: "" };
  out.push(check(assessOpenCorporates(companyQuery, registryHttp)));
  const sanctionsQuery = ctx.facts.name.trim() || companyQuery;
  const sanctionsHttp = sanctionsQuery
    ? await fetchText(openSanctionsApiUrl(sanctionsQuery)).catch(() => ({ ok: false, status: 0, text: "" }))
    : { ok: false, status: 0, text: "" };
  out.push(check(assessOpenSanctions(ctx.facts, sanctionsHttp)));
  // Public screening always records web-footprint, including an explicit miss. The direct
  // webFootprintCheck helper is not a second production pass.
  out.push(...(await newsChecks(ctx.facts, fetchText)));
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

export async function collectChecks(ctx: CheckContext): Promise<CheckOutput[]> {
  const nyOnNetwork = Boolean(ctx.network && /\bNY\b/i.test(ctx.facts.location || ""));
  const local = [
    ...emailChecks(ctx.facts),
    phoneStateCheck(ctx.facts),
    textRiskCheck(ctx.facts),
    duplicateCheck(ctx.facts),
    sanctionsCheck(ctx.facts, ctx.watchlist),
    linkedinFormatCheck(ctx.facts),
    cardConsistencyCheck(ctx.facts),
    inviteCheck(ctx.facts),
    plausibilityCheck(ctx.facts),
    velocityCheck(ctx.facts),
    socialFormatCheck(ctx.facts),
    ...(nyOnNetwork ? [] : [registryLinkCheck(ctx.facts)]),
  ];
  const remote = await networkChecks(ctx);
  const fixture = ctx.facts.testProfile === "strong" && !ctx.network ? strongFixtureChecks() : [];
  return [...local, ...remote, ...fixture];
}
