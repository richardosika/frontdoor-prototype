import { annualDuesCents } from "@/lib/dues";
import { locationsCorroborate, nameMatchScore, SANCTIONS_MATCH_THRESHOLD } from "@/lib/verify/fuzzy";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";

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

const AREA_TO_STATE: Record<string, string> = {
  "201": "NJ",
  "551": "NJ",
  "609": "NJ",
  "732": "NJ",
  "848": "NJ",
  "856": "NJ",
  "862": "NJ",
  "908": "NJ",
  "973": "NJ",
  "212": "NY",
  "332": "NY",
  "347": "NY",
  "516": "NY",
  "518": "NY",
  "585": "NY",
  "607": "NY",
  "631": "NY",
  "646": "NY",
  "716": "NY",
  "718": "NY",
  "845": "NY",
  "914": "NY",
  "917": "NY",
  "929": "NY",
  "203": "CT",
  "475": "CT",
  "860": "CT",
  "959": "CT",
};

/** Local overlay so the test console can show a corroborated sanctions hit without a paid list. */
export const TEST_WATCHLIST = [{ name: "Alexei Sanctionhit", location: "Newark United States" }];

export type WatchlistEntry = { name: string; location: string };

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
  const state = facts.location.toUpperCase().match(/\b(NJ|NY|CT|FL|TX|DE|CA)\b/)?.[1] || "";
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
  const match = expected === state;
  return check({
    key: "phone-state",
    status: match ? "PASS" : "FAIL",
    weight: 4,
    reviewFlag: !match,
    finding: match
      ? `The area code ${area} fits ${state}.`
      : `The area code ${area} usually maps to ${expected}, while the application says ${state}. Look at the phone before you decide.`,
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
  const lists = [...TEST_WATCHLIST, ...watchlist];
  let best = { score: 0, entry: null as WatchlistEntry | null, field: "" };
  for (const entry of lists) {
    const person = nameMatchScore(facts.name, entry.name);
    const company = nameMatchScore(facts.org, entry.name);
    const score = Math.max(person, company);
    const field = person >= company ? "name" : "company";
    if (score > best.score) best = { score, entry, field };
  }
  if (!best.entry || best.score < SANCTIONS_MATCH_THRESHOLD) {
    return check({
      key: "sanctions",
      status: lists.length ? "PASS" : "NOT_RUN",
      weight: 10,
      finding: lists.length
        ? "No corroborated sanctions or watchlist name match on the lists that were loaded."
        : "No watchlist was loaded, so this check did not run.",
      source: "OFAC cache plus Private Floor test overlay",
      url: "https://ofac.treasury.gov/sanctions-list-service",
    });
  }
  const corroborated = locationsCorroborate(facts.location, best.entry.location);
  return check({
    key: "sanctions",
    status: "FAIL",
    weight: 20,
    hardFlag: corroborated,
    reviewFlag: !corroborated,
    finding: corroborated
      ? `Watchlist name match on ${best.entry.name} (${best.field}) and the application location lines up with ${best.entry.location}.`
      : `Possible watchlist match on ${best.entry.name} without location corroboration. Owner review, not an automatic red flag.`,
    source: "OFAC cache plus Private Floor test overlay",
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
  const ok = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-z0-9\-_%]+\/?$/i.test(url);
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

export function cardConsistencyCheck(facts: ApplicantFacts): CheckOutput {
  const card = facts.cardText.trim();
  if (!card) {
    return check({
      key: "business-card",
      status: "NOT_RUN",
      weight: 10,
      finding: "No card text was available. Image OCR is not run on this host. Compare the card on the application if one was uploaded.",
      source: "Card text compare",
      url: "",
    });
  }
  const nameHit = nameMatchScore(facts.name, card) >= 0.5 || card.toLowerCase().includes(facts.name.toLowerCase().split(" ")[0] || "");
  const orgHit = facts.org.length > 2 && card.toLowerCase().includes(facts.org.toLowerCase().slice(0, 8));
  if (nameHit && orgHit) {
    return check({
      key: "business-card",
      status: "PASS",
      weight: 10,
      finding: "The card text includes the applicant name and company.",
      source: "Card text compare",
      url: "",
      corroborates: true,
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
  const state = facts.location.toUpperCase().match(/\b(NJ|NY|DE|FL|TX)\b/)?.[1];
  const links: Record<string, string> = {
    NJ: "https://www.njportal.com/DOR/BusinessNameSearch/",
    NY: "https://apps.dos.ny.gov/publicInquiry/",
    DE: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx",
    FL: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
    TX: "https://mycpa.cpa.state.tx.us/coa/",
  };
  if (!state || !links[state]) {
    return check({
      key: "business-registry",
      status: "NOT_RUN",
      weight: 8,
      finding: "Not run: no stable free registry API for this state. Search the secretary of state manually.",
      source: "State registry",
      url: "",
    });
  }
  return check({
    key: "business-registry",
    status: "NOT_RUN",
    weight: 8,
    finding: `Not run: manual link provided. Open the ${state} registry search and look up ${facts.org}.`,
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
        finding: "Website, RDAP, EDGAR, courts, and web search were not run in this pass.",
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
          status: "INCONCLUSIVE",
          weight: 6,
          finding: `MX lookup for ${domain} did not complete. Marked inconclusive.`,
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
  const website = ctx.facts.website.trim() || (domain && !FREE_PROVIDERS.has(domain) && !DISPOSABLE.has(domain) ? `https://${domain}` : "");
  let host = "";
  try {
    host = website ? new URL(website.startsWith("http") ? website : `https://${website}`).host : "";
  } catch {
    host = "";
  }
  if (host && !FREE_PROVIDERS.has(host)) {
    const rdap = await pageText(fetchText, `https://rdap.org/domain/${host}`);
    out.push(
      check({
        key: "rdap",
        status: rdap.ok ? "PASS" : "INCONCLUSIVE",
        weight: 4,
        finding: rdap.ok
          ? `RDAP responded for ${host}. Open the record for registrar and registration date. Domain age is a bonus, not proof of identity.`
          : `RDAP did not respond for ${host}. Marked inconclusive.`,
        source: "RDAP",
        url: `https://rdap.org/domain/${host}`,
      }),
    );
  }
  if (website && host) {
    const base = website.startsWith("http") ? website : `https://${website}`;
    const home = await pageText(fetchText, base);
    const about = await pageText(fetchText, new URL("/about", base).toString());
    const team = await pageText(fetchText, new URL("/team", base).toString());
    const blob = `${home.text} ${about.text} ${team.text}`;
    const reachable = home.ok || home.status > 0;
    const first = ctx.facts.name.split(" ")[0]?.toLowerCase() || "";
    const nameHit = first.length > 2 && blob.includes(first);
    const orgHit = ctx.facts.org.length > 3 && blob.includes(ctx.facts.org.slice(0, 8).toLowerCase());
    out.push(
      check({
        key: "website",
        status: !reachable ? "INCONCLUSIVE" : nameHit || orgHit ? "PASS" : "FAIL",
        weight: 14,
        reviewFlag: reachable && !(nameHit || orgHit),
        finding: !reachable
          ? "The website could not be fetched. Marked inconclusive."
          : nameHit || orgHit
            ? "The site responded. Homepage, /about, or /team text includes the person or company name."
            : "The site responded, but the person and company names were not on the homepage, /about, or /team. Look at the site yourself.",
        source: "Public website fetch",
        url: base,
        corroborates: Boolean(nameHit || orgHit),
      }),
    );
  } else {
    out.push(
      check({
        key: "website",
        status: "INCONCLUSIVE",
        weight: 14,
        finding: "No company website was given, and the email domain is not a company domain. A private email is allowed.",
        source: "Public website fetch",
        url: "",
      }),
    );
  }
  const edgarUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${ctx.facts.org}"`)}&dateRange=custom&startdt=2015-01-01&enddt=2030-01-01&forms=D`;
  const edgar = await fetchText(edgarUrl);
  let edgarHits = 0;
  try {
    const parsed = JSON.parse(edgar.text) as { hits?: { total?: { value?: number } } };
    edgarHits = parsed.hits?.total?.value ?? 0;
  } catch {
    edgarHits = 0;
  }
  out.push(
    check({
      key: "edgar",
      status: !edgar.ok ? "NOT_RUN" : edgarHits > 0 ? "PASS" : "INCONCLUSIVE",
      weight: 12,
      finding: !edgar.ok
        ? "EDGAR search did not respond. Marked not run."
        : edgarHits > 0
          ? `EDGAR full-text search returned ${edgarHits} hit(s) for the company name. Open the link and confirm it is the same firm.`
          : "EDGAR responded and did not show a hit count for this company name.",
      source: "SEC EDGAR",
      url: edgarUrl,
      corroborates: edgar.ok && edgarHits > 0,
    }),
  );
  const courtUrl = `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(`"${ctx.facts.name}"`)}&type=o`;
  const court = await fetchText(courtUrl);
  const courtText = stripHtml(court.text);
  const courtSevere = /bankruptcy|fraud|indicted|ponzi/.test(courtText) && courtText.includes((ctx.facts.name.split(" ")[0] || "").toLowerCase());
  out.push(
    check({
      key: "courts",
      status: court.status === 401 || court.status === 403 || !court.ok ? "NOT_RUN" : courtSevere ? "FAIL" : "INCONCLUSIVE",
      weight: 8,
      reviewFlag: courtSevere,
      finding:
        court.status === 401 || court.status === 403
          ? "CourtListener refused an anonymous search. Not run."
          : !court.ok
            ? "CourtListener did not respond. Not run."
            : courtSevere
              ? "CourtListener text includes a severe term near this name. Confirm the docket before you treat it as a red flag. This is not an automatic decline."
              : "CourtListener returned a public search payload. Read it before treating any case as fraud.",
      source: "CourtListener",
      url: courtUrl,
    }),
  );
  const query = `"${ctx.facts.name}" "${ctx.facts.org}"`;
  const webUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const web = await fetchText(webUrl);
  const webText = stripHtml(web.text);
  const blocked = web.status === 202 || web.status === 403 || /captcha|anomaly/.test(webText);
  const firstName = (ctx.facts.name.split(" ")[0] || "").toLowerCase();
  const negative = /fraud|lawsuit|indicted|scam|ponzi/.test(webText) && firstName.length > 2 && webText.includes(firstName);
  const named = firstName.length > 2 && webText.includes(firstName) && ctx.facts.org.length > 3 && webText.includes(ctx.facts.org.slice(0, 8).toLowerCase());
  out.push(
    check({
      key: "web-footprint",
      status: blocked || !web.ok ? "INCONCLUSIVE" : negative ? "FAIL" : named ? "PASS" : "INCONCLUSIVE",
      weight: 12,
      reviewFlag: Boolean(negative),
      finding: blocked || !web.ok
        ? "Public web search was blocked or unreachable. Marked inconclusive."
        : negative
          ? "A free web search page mentions a negative term near this name. Confirm the snippet before you treat it as a red flag."
          : named
            ? "A free web search page includes both the person and the company."
            : "A free web search responded, but the person and company were not both in the fetched text.",
      source: "DuckDuckGo HTML",
      url: webUrl,
      corroborates: Boolean(named) && !negative,
    }),
  );
  if (ctx.facts.linkedinUrl) {
    const linked = await fetchText(ctx.facts.linkedinUrl);
    const linkedText = stripHtml(linked.text);
    const blockedLinked = linked.status === 999 || linked.status === 403 || linked.status === 401 || !linked.ok;
    const titleHit = firstName.length > 2 && linkedText.includes(firstName);
    out.push(
      check({
        key: "linkedin-fetch",
        status: blockedLinked ? "INCONCLUSIVE" : titleHit ? "PASS" : "INCONCLUSIVE",
        weight: 8,
        finding: blockedLinked
          ? "LinkedIn blocked a public fetch. Marked inconclusive. Logged-in pages are not scraped."
          : titleHit
            ? "A public fetch of the LinkedIn URL returned a page that includes the person's name."
            : "A public fetch returned a page, but the name was not in the title or text.",
        source: "LinkedIn public page",
        url: ctx.facts.linkedinUrl,
        corroborates: Boolean(titleHit) && !blockedLinked,
      }),
    );
  }
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
    registryLinkCheck(ctx.facts),
  ];
  const remote = await networkChecks(ctx);
  const fixture = ctx.facts.testProfile === "strong" && !ctx.network ? strongFixtureChecks() : [];
  return [...local, ...remote, ...fixture];
}
