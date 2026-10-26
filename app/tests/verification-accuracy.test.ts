import { describe, expect, it } from "vitest";
import { assessLocalAddress, zipMatchesState } from "@/lib/verify/address";
import { isReservedDomain } from "@/lib/verify/host";
import { assessRdap, cardConsistencyCheck, collectChecks, companyNameLooksReal, inviteCheck, linkedinFormatCheck, phoneStateCheck, plausibilityCheck, registryLinkCheck, resolveAddressCheck, sanctionsCheck, TEST_WATCHLIST } from "@/lib/verify/checks";
import { RERUN_STATUS, rerunChecksHref } from "@/lib/rerun-checks";
import { assessStateRegistry, registryPortal, socrataRegistryUrl } from "@/lib/verify/state-registries";
import { assessCourts } from "@/lib/verify/courts";
import { assessEdgarMatch, clearEdgarTickerCache, companyFromDisplayName, edgarCompanySearchPhrase, lookupEdgar, matchEdgarCompany } from "@/lib/verify/edgar";
import { classifyFetchError, fetchLimits, looksLikeHtml, prepareFetchedText, userAgentFor, USER_AGENT } from "@/lib/verify/fetch";
import { applyReviewSkips, dedupeSourceLines, gradeChecks, gradeComparisonLine, rerunAuditSummary, type GradeReport } from "@/lib/verify/grade";
import { classifyNews, newsSearchQueries } from "@/lib/verify/news";
import { assessNyRegistry, normalizeRegistryName } from "@/lib/verify/ny-registry";
import { factsForSearch } from "@/lib/verify/qa-marker";
import { companySearchTerm, distinctiveCompanyTokens, isDistinctiveCompanyToken, mentionsCompany, mentionsPerson, personHit, surnameForSearch } from "@/lib/verify/public-match";
import { formatRunScores, scoreOf } from "@/lib/verify/score";
import { fallbackTeamUrls, isBotChallenge, runPublicScreen, sameOriginPages, scorePublicText, serpUnusable, sitemapLastNameUrls, sitemapPersonUrls } from "@/lib/verify/screen";
import { isLinkedInDirectory, webFootprintCheck } from "@/lib/verify/web-search";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";
import { watchlistNeedsRefresh } from "@/lib/verify/watchlist";

const NOW = new Date("2026-10-25T16:00:00.000Z");

function facts(overrides: Partial<ApplicantFacts> = {}): ApplicantFacts {
  return {
    name: "Jane Roe",
    applicantName: "Jane Roe",
    email: "jane.roe.probe@gmail.com",
    org: "Zorblax Holdings",
    location: "New York, NY",
    role: "DEVELOPER",
    phone: "",
    website: "",
    linkedinUrl: "",
    socialLinks: "",
    statement: "I develop small buildings and keep a written record of each project for the application.",
    inviteNote: "PF-TEST",
    testProfile: "",
    cardText: "",
    cardUploaded: false,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
    ...overrides,
  };
}

function row(partial: Partial<CheckOutput> & { key: string; status: CheckOutput["status"] }): CheckOutput {
  return {
    weight: 4,
    finding: partial.finding || partial.status,
    source: partial.source || "Test source",
    url: "",
    ranAt: "2026-10-25T16:00:00.000Z",
    ...partial,
  };
}

describe("sanctions list must be real", () => {
  it("does not pass when the only names are the test overlay", () => {
    const result = sanctionsCheck(facts(), []);
    expect(result.status).toBe("NOT_RUN");
    expect(result.status).not.toBe("PASS");
    expect(result.finding.toLowerCase()).toContain("not a pass");
    const graded = gradeChecks([result, row({ key: "duplicate", status: "PASS" })], facts());
    const risk = graded.categories.find((category) => category.id === "risk");
    expect(risk?.reason).toContain("0 of 8");
    expect(graded.attention.some((item) => item.title === "Sources that did not produce a result" && item.severity === "High")).toBe(true);
  });

  it("still flags the labelled test name without treating the overlay as a loaded list", () => {
    const hit = sanctionsCheck(facts({ name: "Alexei Sanctionhit", org: "TEST Sanctionhit Holdings", location: "Newark, NJ" }), []);
    expect(hit.hardFlag).toBe(true);
    expect(hit.source.toLowerCase()).toContain("not a loaded sanctions list");
    expect(TEST_WATCHLIST).toHaveLength(1);
  });
});

describe("corroboration is independent of the applicant's own page", () => {
  it("keeps a padded self-reported file under C and off APPROVE", () => {
    const checks: CheckOutput[] = [
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({ key: "phone-state", status: "PASS" }),
      row({ key: "text-risk", status: "PASS" }),
      row({ key: "duplicate", status: "PASS" }),
      row({ key: "sanctions", status: "PASS" }),
      row({ key: "linkedin-format", status: "PASS", finding: "The LinkedIn URL has a public profile shape." }),
      row({ key: "invite-source", status: "PASS" }),
      row({ key: "plausibility", status: "PASS" }),
      row({ key: "velocity", status: "PASS" }),
      row({ key: "social-links", status: "PASS" }),
      row({
        key: "website",
        status: "PASS",
        selfReported: true,
        corroborates: false,
        finding: "The applicant's own page names the person and the company.",
      }),
      row({
        key: "web-footprint",
        status: "PASS",
        selfReported: true,
        corroborates: false,
        finding: "A footprint from the same page names the person and the company.",
      }),
      row({ key: "business-card", status: "PASS", selfReported: true, corroborates: false, finding: "The card names the person and the company." }),
      row({ key: "rdap", status: "PASS", corroborates: false, finding: "RDAP responded." }),
      row({ key: "business-registry", status: "PASS", corroborates: false, finding: "NY Active Corporations lists the exact company name." }),
      row({ key: "edgar", status: "PASS", corroborates: false, finding: "EDGAR lists the company. It does not tie the person to the firm." }),
    ];
    const graded = gradeChecks(checks, {
      ...facts({
        website: "http://127.0.0.1/F04b/",
        linkedinUrl: "https://www.linkedin.com/in/marisol-quentin-vale",
        socialLinks: "https://example.com/marisol",
        phone: "212-555-0147",
        cardUploaded: true,
        cardText: "Marisol Quentin Vale, Example Group",
      }),
      referenceCount: 1,
    });
    expect(graded.score).toBeGreaterThanOrEqual(70);
    expect(graded.letter).toBe("D");
    expect(graded.caps.some((line) => line.startsWith("Capped at D"))).toBe(true);
    expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
    expect(graded.attention.some((item) => /one self-reported source/i.test(item.detail) && /stays below a C/i.test(item.detail))).toBe(true);
    const identity = graded.categories.find((category) => category.id === "identity");
    expect(identity?.reason).toContain("0 of 3");
  });

  it("does not treat a company-only EDGAR hit as person corroboration", () => {
    const companyOnly = assessEdgarMatch({
      org: "Toll Brothers, Inc.",
      person: "Douglas Yearley",
      tickersOk: true,
      companies: [{ title: "TOLL BROTHERS INC", ticker: "TOL", cik: "79565" }],
      filingNames: [],
    });
    expect(companyOnly.status).toBe("PASS");
    expect(companyOnly.corroborates).toBe(false);
    expect(companyOnly.finding.toLowerCase()).toContain("does not tie the person");
    const personTied = assessEdgarMatch({
      org: "Toll Brothers, Inc.",
      person: "Douglas Yearley",
      tickersOk: true,
      companies: [{ title: "TOLL BROTHERS INC", ticker: "TOL", cik: "79565" }],
      filingNames: ["TOLL BROTHERS INC", "YEARLEY DOUGLAS C JR"],
    });
    expect(personTied.corroborates).toBe(true);
  });

  it("requires the full name and the company on a self-reported card", () => {
    const loose = cardConsistencyCheck(facts({ name: "Douglas Yearley", org: "Toll Brothers, Inc.", cardText: "Douglas, Toll Bro" }));
    expect(loose.status).toBe("FAIL");
    const strict = cardConsistencyCheck(facts({
      name: "Douglas Yearley",
      org: "Toll Brothers, Inc.",
      cardText: "Douglas Yearley, Toll Brothers",
    }));
    expect(strict.status).toBe("PASS");
    expect(strict.corroborates).toBe(false);
    expect(strict.selfReported).toBe(true);
  });

  it("caps a single independent source at C and does not approve it", () => {
    const graded = gradeChecks(
      [
        row({ key: "email-syntax", status: "PASS" }),
        row({ key: "disposable-email", status: "PASS" }),
        row({ key: "role-address", status: "PASS" }),
        row({ key: "phone-state", status: "PASS" }),
        row({ key: "text-risk", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "linkedin-format", status: "PASS" }),
        row({ key: "invite-source", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "velocity", status: "PASS" }),
        row({ key: "website", status: "PASS", selfReported: true, corroborates: false }),
        row({ key: "edgar", status: "PASS", corroborates: false }),
        row({ key: "rdap", status: "PASS", corroborates: false }),
        row({ key: "business-card", status: "PASS", selfReported: true, corroborates: false }),
        row({ key: "news", status: "PASS", corroborates: true, finding: "One headline names the person and the company." }),
      ],
      facts({
        phone: "201-555-0100",
        website: "https://example.com",
        linkedinUrl: "https://www.linkedin.com/in/jane-roe",
        cardUploaded: true,
        cardText: "Jane Roe, Zorblax Holdings",
      }),
    );
    expect(graded.score).toBeGreaterThanOrEqual(80);
    expect(graded.letter).toBe("C");
    expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
    expect(graded.caps.some((line) => line.startsWith("Capped at C"))).toBe(true);
  });
});

describe("news penalties and name attribution", () => {
  it("does not cap a company lawsuit, and does not treat Bo Hines as Jeff Hines", () => {
    const blackstone = classifyNews(
      facts({ name: "Jonathan Gray", applicantName: "Jonathan Gray", org: "Blackstone", location: "New York, NY" }),
      [
        {
          title: "New York lawsuit says Blackstone overcharged rent-stabilized tenants",
          snippet: "The complaint names the company.",
          url: "https://example.com/bx-suit",
          source: "Court Desk",
          publishedAt: "2026-09-11T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(blackstone[0].status).not.toBe("FAIL");
    expect(blackstone[0].reviewFlag).toBeUndefined();
    const graded = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "edgar", status: "PASS", corroborates: true }),
        row({ key: "web-footprint", status: "PASS", corroborates: true }),
        ...blackstone,
      ],
      facts({ name: "Jonathan Gray", applicantName: "Jonathan Gray", org: "Blackstone" }),
    );
    expect(graded.caps.some((line) => line.startsWith("Capped at D"))).toBe(false);
    expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(true);

    const hines = classifyNews(
      facts({ name: "Jeff Hines", applicantName: "Jeff Hines", org: "Hines", location: "Houston, TX" }),
      [
        {
          title: "Blumenthal Asks Tether to Detail Every Payment to Nxum, Bo Hines' Consulting Firm",
          snippet: "The letter asks about a lawsuit.",
          url: "https://example.com/bo-hines",
          source: "Senate Desk",
          publishedAt: "2026-10-22T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(hines.some((check) => /bo hines/i.test(check.finding) && check.status === "FAIL")).toBe(false);
    expect(mentionsCompany("Bo Hines' Consulting Firm sued", "Hines", "Jeff Hines")).toBe(false);
  });

  it("keeps a person-tied criminal charge as a review flag and does not count each story as its own conflict", () => {
    const checks = classifyNews(
      facts({ name: "Stephen Ross", applicantName: "Stephen Ross", org: "Related Companies", location: "New York, NY" }),
      [
        {
          title: "SEC charges Stephen Ross and Related Companies",
          snippet: "The SEC charges were filed in New York.",
          url: "https://example.com/charges",
          source: "Court Desk",
          publishedAt: "2026-03-04T15:00:00.000Z",
          provider: "Google News",
        },
        {
          title: "Stephen Ross indicted alongside Related Companies",
          snippet: "A criminal charge was unsealed.",
          url: "https://example.com/indicted",
          source: "Court Desk",
          publishedAt: "2026-04-04T15:00:00.000Z",
          provider: "Bing News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(checks[0].status).toBe("FAIL");
    expect(checks[0].reviewFlag).toBe(true);
    const stories = checks.filter((check) => check.key === "news-story" && check.status === "FAIL");
    expect(stories.length).toBeGreaterThanOrEqual(2);
    const graded = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "news", status: "PASS", corroborates: true }),
        ...stories,
      ],
      facts({ name: "Stephen Ross", applicantName: "Stephen Ross", org: "Related Companies" }),
    );
    expect(graded.caps.some((line) => /two or more checks/i.test(line))).toBe(false);
  });
});

describe("EDGAR short tokens and offline fetch", () => {
  it("matches Toll Brothers without matching a different brothers firm", () => {
    expect(distinctiveCompanyTokens("Toll Brothers, Inc.")).toEqual(expect.arrayContaining(["toll", "brothers"]));
    const rows = [
      { title: "TOLL BROTHERS INC", ticker: "TOL", cik: "79565" },
      { title: "BROTHERS INTERNATIONAL FOOD CORP", ticker: "", cik: "1" },
    ];
    expect(matchEdgarCompany(rows, "Toll Brothers, Inc.")?.ticker).toBe("TOL");
    expect(matchEdgarCompany(rows, "Toll")?.ticker).toBeUndefined();
  });

  it("uses the injected fetch and does not require the network", async () => {
    clearEdgarTickerCache();
    const seen: string[] = [];
    const result = await lookupEdgar("Toll Brothers, Inc.", "Douglas Yearley", async (url) => {
      seen.push(url);
      if (url.includes("company_tickers")) {
        return { ok: true, status: 200, text: JSON.stringify({ "0": { title: "TOLL BROTHERS INC", ticker: "TOL", cik_str: 79565 } }) };
      }
      return { ok: true, status: 200, text: JSON.stringify({ hits: { hits: [] } }) };
    });
    expect(result.status).toBe("PASS");
    expect(result.corroborates).toBe(false);
    expect(seen.some((url) => url.includes("sec.gov"))).toBe(true);
    expect(seen.some((url) => url.startsWith("http") && !url.includes("sec.gov"))).toBe(false);
  });
});

describe("honest labels and the legacy score", () => {
  it("keeps blocked sources in the legacy denominator", () => {
    const passes = [row({ key: "duplicate", status: "PASS", weight: 30 })];
    const blocked = [
      row({ key: "website", status: "UNAVAILABLE", weight: 40 }),
      row({ key: "news", status: "UNAVAILABLE", weight: 40 }),
      row({ key: "edgar", status: "NOT_RUN", weight: 40 }),
    ];
    expect(formatRunScores({ score: 69, gradeLetter: "F", gradeScore: 55 })).toBe("grade F 55 · legacy weight score 69");
    expect(formatRunScores({ score: 63, gradeLetter: "F", gradeScore: 52 })).toBe("grade F 52 · legacy weight score 63");
    expect(formatRunScores({ score: 53 })).toBe("legacy weight score 53");
    expect(gradeComparisonLine({ letter: "F", score: 53 }, { letter: "F", score: 55 })).toBe(
      "Latest check: grade F 53. Grade at application: grade F 55.",
    );
    expect(gradeComparisonLine({ letter: "F", score: 53 }, { letter: "F", score: 53 })).toBe("Latest check: grade F 53.");
    expect(rerunAuditSummary({ letter: "F", score: 53 }, { letter: "F", score: 55 })).toBe(
      "Re-ran checks. Latest check: grade F 53. Grade at application was grade F 55.",
    );
    expect(scoreOf(passes)).toBe(100);
    expect(scoreOf([...passes, ...blocked])).toBeLessThan(74);
    expect(scoreOf([...passes, blocked[2]])).toBe(100);
  });

  it("downgrades APPROVE after a skip drops confidence", () => {
    const report = {
      version: 1,
      rubricVersion: "2026-10-25",
      gradedAt: "2026-10-25T00:00:00.000Z",
      letter: "A",
      score: 92,
      rawScore: 92,
      confidence: "Medium",
      recommendation: "APPROVE",
      categories: [],
      attention: [],
      summary: {
        applicant: "Sample.",
        company: "Sample.",
        checkedOut: "Checked.",
        didNotCheckOut: "None.",
        couldNotCheck: "None.",
        reasoning: "The checks line up.",
        nextStep: "Read the grade.",
      },
      banner: null,
      caps: [],
      changeNote: "",
      plainText: "",
    } as GradeReport;
    const graded = applyReviewSkips(report, [{ title: "Sanctions and risk", reason: "List was down" }]);
    expect(graded.confidence).toBe("Low");
    expect(graded.recommendation).toBe("NEEDS MORE INFO");
    expect(graded.letter).toBe("A");
    expect(graded.score).toBe(92);
    expect(graded.summary.reasoning.toLowerCase()).not.toContain("recommend approval with conditions");
  });

  it("treats an empty reachable search as inconclusive and a blank site as missing", () => {
    expect(serpUnusable([], { name: "Jane Roe", org: "Zorblax", location: "New York, NY" })).toBe(false);
    expect(serpUnusable(["Poor Richard font family Microsoft"], { name: "Richard Osika", org: "BuildPro Construction Services LLC", location: "Saddle Brook, NJ" })).toBe(true);
  });
});

describe("low-risk check fixes", () => {
  it("treats an out-of-area or toll-free phone as inconclusive and accepts a wider match", () => {
    const mismatch = phoneStateCheck(facts({ phone: "212-555-0100", location: "Newark, NJ" }));
    expect(mismatch.status).toBe("INCONCLUSIVE");
    expect(mismatch.status).not.toBe("FAIL");
    expect(mismatch.reviewFlag).toBeUndefined();
    expect(mismatch.finding).toContain("outside the stated state");
    const charleston = phoneStateCheck(facts({ phone: "843-555-0100", location: "Charleston, SC" }));
    expect(charleston.status).toBe("PASS");
    const nashville = phoneStateCheck(facts({ phone: "615-555-0100", location: "Nashville, TN" }));
    expect(nashville.status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "818-555-0100", location: "Los Angeles, CA" })).status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "310-555-0199", location: "Los Angeles, CA" })).status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "512-555-0199", location: "Austin, TX" })).status).toBe("PASS");
    const tollFree = phoneStateCheck(facts({ phone: "800-555-0100", location: "Newark, NJ" }));
    expect(tollFree.status).toBe("INCONCLUSIVE");
    expect(tollFree.reviewFlag).toBeUndefined();
    expect(tollFree.finding).toContain("toll-free");
    const graded = gradeChecks([mismatch], facts({ phone: "212-555-0100", location: "Newark, NJ" }));
    expect(graded.attention.some((item) => item.title === "Phone area code is outside the stated state")).toBe(true);
    const tollGraded = gradeChecks([tollFree], facts({ phone: "800-555-0100", location: "Newark, NJ" }));
    expect(tollGraded.attention.some((item) => item.title === "Toll-free phone number")).toBe(true);
  });

  it("accepts a LinkedIn URL with a query, a hash, a locale, or a country subdomain", () => {
    const shaped = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/in/marisol-quentin-vale?trk=public_profile" }));
    expect(shaped.status).toBe("PASS");
    const nested = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/toll-brothers/about/" }));
    expect(nested.status).toBe("PASS");
    const hashed = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/in/marisol-quentin-vale#experience" }));
    expect(hashed.status).toBe("PASS");
    const locale = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/en/in/marisol-quentin-vale" }));
    expect(locale.status).toBe("PASS");
    const regional = linkedinFormatCheck(facts({ linkedinUrl: "https://nj.linkedin.com/in/marisol-quentin-vale" }));
    expect(regional.status).toBe("PASS");
    const bare = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/feed/" }));
    expect(bare.status).toBe("FAIL");
  });

  it("skips RDAP for an IP and does not treat a young domain as corroboration", () => {
    expect(assessRdap("192.0.2.10", { ok: true, status: 200, text: "{}" })).toBeNull();
    expect(assessRdap("[2001:db8::1]", { ok: true, status: 200, text: "{}" })).toBeNull();
    const now = new Date("2026-10-26T00:00:00.000Z");
    const young = assessRdap(
      "acme-builders.com",
      { ok: true, status: 200, text: JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2026-06-01T00:00:00.000Z" }] }) },
      now,
    );
    expect(young?.status).toBe("INCONCLUSIVE");
    expect(young?.corroborates).toBe(false);
    expect(young?.finding).toContain("not corroboration");
    const older = assessRdap(
      "acme-builders.com",
      { ok: true, status: 200, text: JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2014-06-01T00:00:00.000Z" }] }) },
      now,
    );
    expect(older?.status).toBe("PASS");
    expect(older?.corroborates).toBe(false);
    const graded = gradeChecks([young!], facts());
    expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(0);
  });

  it("reports a CourtListener no-hit without calling the person cleared", () => {
    const clean = assessCourts(JSON.stringify({ results: [] }), { ok: true, status: 200 }, facts());
    expect(clean.status).toBe("PASS");
    expect(clean.weight).toBe(0);
    expect(clean.finding).toContain("Not checkable for free.");
    expect(clean.corroborates).toBe(false);
    expect(clean.finding).toContain("No record found in CourtListener federal data");
    expect(clean.finding.toLowerCase()).toContain("not a clearance of all litigation");
    expect(clean.finding.toLowerCase()).not.toContain("cleared of all");
  });

  it("keeps the SEC ticker file above the default body cap", () => {
    const tickers = fetchLimits("https://www.sec.gov/files/company_tickers.json");
    expect(tickers.maxChars).toBeGreaterThanOrEqual(2_000_000);
    expect(tickers.timeoutMs).toBeGreaterThanOrEqual(20_000);
    const filings = fetchLimits("https://efts.sec.gov/LATEST/search-index?q=%22Yearley%22%20%22toll%22");
    expect(filings.maxChars).toBeGreaterThanOrEqual(1_500_000);
    expect(fetchLimits("https://example.com/page").maxChars).toBe(180_000);
  });

  it("does not treat a name-and-city video as person-to-company corroboration", async () => {
    const title = "Larry Silverstein signed a lease in New York";
    const html = `{"title":{"runs":[{"text":"${title}"}]}}`;
    const checks = await runPublicScreen(
      facts({ name: "Larry Silverstein", applicantName: "Larry Silverstein", org: "Toll Brothers, Inc.", location: "New York, NY", website: "" }),
      async (url) => (url.includes("youtube.com") ? { ok: true, status: 200, text: html } : { ok: false, status: 403, text: "" }),
    );
    const youtube = checks.find((check) => check.key === "screen-youtube");
    expect(youtube?.status).toBe("INCONCLUSIVE");
    expect(youtube?.corroborates).toBe(false);
    expect(youtube?.finding).toContain("Company: no");
    const graded = gradeChecks(checks, facts({ name: "Larry Silverstein", org: "Toll Brothers, Inc.", location: "New York, NY" }));
    const footprint = graded.categories.find((category) => category.id === "footprint");
    expect(footprint?.reason).toContain("0 of 8");
  });

  it("uses an identifying user agent for social hosts", () => {
    expect(userAgentFor("www.linkedin.com")).toBe(USER_AGENT);
    expect(userAgentFor("x.com")).toBe(userAgentFor("www.sec.gov"));
    expect(userAgentFor("www.linkedin.com").toLowerCase()).not.toContain("chrome");
  });

  it("refreshes a missing or stale OFAC cache and leaves a fresh one", () => {
    expect(watchlistNeedsRefresh(null, 0)).toBe(true);
    expect(watchlistNeedsRefresh(new Date("2026-10-01T00:00:00.000Z"), 10, Date.parse("2026-10-26T00:00:00.000Z"))).toBe(true);
    expect(watchlistNeedsRefresh(new Date("2026-10-26T00:00:00.000Z"), 10, Date.parse("2026-10-26T12:00:00.000Z"))).toBe(false);
  });

  it("caps an OpenSanctions hard flag at F", () => {
    const graded = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({
          key: "opensanctions",
          status: "FAIL",
          hardFlag: true,
          finding: "OpenSanctions name match on Ada Lopez, and the location lines up.",
        }),
      ],
      facts(),
    );
    expect(graded.letter).toBe("F");
    expect(graded.recommendation).toBe("DECLINE");
    expect(graded.caps.some((line) => line.startsWith("Capped at F"))).toBe(true);
  });
});

describe("EDGAR exact company names", () => {
  const rows = [
    { title: "CBRE GROUP, INC.", ticker: "CBRE", cik: "1138118" },
    { title: "Unum Group", ticker: "UNM", cik: "5513" },
    { title: "Madison Air Solutions Corp", ticker: "MAIR", cik: "2098430" },
    { title: "Sachem Capital Corp.", ticker: "SCCF", cik: "1682220" },
    { title: "Sachem Capital Corp.", ticker: "SACH", cik: "1682220" },
    { title: "Sachem Capital Corp.", ticker: "SACH-PA", cik: "1682220" },
    { title: "PARKE BANCORP, INC.", ticker: "PKBK", cik: "1315399" },
    { title: "PARKERVISION INC", ticker: "PRKR", cik: "914139" },
    { title: "Toll Brothers, Inc.", ticker: "TOL", cik: "794170" },
    { title: "TOLL INC", ticker: "TOLLX", cik: "1" },
    { title: "GROUP INC", ticker: "GRUP", cik: "9" },
    { title: "HOLDINGS LLC", ticker: "HOLD", cik: "8" },
  ];

  it("does not match a different firm that shares only a generic word", () => {
    expect(matchEdgarCompany(rows, "CBRE Group")?.ticker).toBe("CBRE");
    expect(matchEdgarCompany(rows, "CBRE Group, Inc.")?.ticker).toBe("CBRE");
    expect(matchEdgarCompany(rows, "CBRE Group")?.title).not.toMatch(/unum/i);
    expect(matchEdgarCompany(rows, "QA-TEST CBRE Group, Inc.")).toBeNull();
    expect(matchEdgarCompany(rows, "Madison Realty Capital")).toBeNull();
    expect(matchEdgarCompany(rows, "Group")).toBeNull();
    expect(matchEdgarCompany(rows, "Capital")).toBeNull();
    expect(matchEdgarCompany(rows, "Holdings")).toBeNull();
    expect(matchEdgarCompany(rows, "Realty Partners")).toBeNull();
  });

  it("keeps Sachem, Parke Bancorp, and Toll Brothers on the exact name", () => {
    expect(matchEdgarCompany(rows, "Sachem Capital")?.ticker).toBe("SACH");
    expect(matchEdgarCompany(rows, "Parke Bancorp")?.ticker).toBe("PKBK");
    expect(matchEdgarCompany(rows, "Parke Bank")).toBeNull();
    expect(matchEdgarCompany(rows, "Toll Brothers, Inc.")?.ticker).toBe("TOL");
    expect(matchEdgarCompany(rows, "Toll")?.ticker).not.toBe("TOL");
    expect(matchEdgarCompany(rows, "Toll")?.title).toBe("TOLL INC");
  });

  it("finds Kennedy-Wilson by company name when the ticker file has no row, and still refuses Unum for CBRE", async () => {
    expect(companyFromDisplayName("Kennedy-Wilson Holdings, Inc.  (KW)  (CIK 0001408100)")).toEqual({
      title: "Kennedy-Wilson Holdings, Inc.",
      ticker: "KW",
      cik: "1408100",
    });
    expect(edgarCompanySearchPhrase("Kennedy-Wilson Holdings")).toBe("Kennedy-Wilson Holdings");
    expect(edgarCompanySearchPhrase("CBRE Group, Inc.")).toBe("CBRE Group");
    expect(edgarCompanySearchPhrase("Group")).toBe("");
    expect(edgarCompanySearchPhrase("Holdings")).toBe("");
    clearEdgarTickerCache();
    const filings = {
      hits: {
        hits: [
          { _source: { display_names: ["Unum Group  (UNM)  (CIK 0000005513)"] } },
          { _source: { display_names: ["Kennedy-Wilson Holdings, Inc.  (KW)  (CIK 0001408100)"] } },
          { _source: { display_names: ["CBRE GROUP, INC.  (CBRE)  (CIK 0001138118)"] } },
        ],
      },
    };
    const fetchText = async (url: string) => {
      if (url.includes("company_tickers")) {
        return { ok: true, status: 200, text: JSON.stringify({ "0": { title: "Unum Group", ticker: "UNM", cik_str: 5513 } }) };
      }
      if (url.includes("efts.sec.gov")) return { ok: true, status: 200, text: JSON.stringify(filings) };
      return { ok: false, status: 0, text: "" };
    };
    const kennedy = await lookupEdgar("Kennedy-Wilson Holdings", "William McMorrow", fetchText);
    expect(kennedy.status).toBe("PASS");
    expect(kennedy.corroborates).toBe(false);
    expect(kennedy.finding).toContain("Kennedy-Wilson Holdings");
    expect(kennedy.finding.toLowerCase()).not.toContain("unum");
    expect(kennedy.finding).toContain("does not tie the person");
    expect(kennedy.url).toContain("1408100");
    clearEdgarTickerCache();
    const cbre = await lookupEdgar("CBRE Group", "Bob Sulentic", fetchText);
    expect(cbre.status).toBe("PASS");
    expect(cbre.corroborates).toBe(false);
    expect(cbre.finding).toContain("CBRE GROUP, INC.");
    expect(cbre.finding.toLowerCase()).not.toContain("unum");
    expect(cbre.url).toContain("1138118");
    clearEdgarTickerCache();
    const generic = await lookupEdgar("Holdings", "William McMorrow", fetchText);
    expect(generic.status).not.toBe("PASS");
    expect(generic.finding.toLowerCase()).not.toContain("kennedy");
  });

  it("keeps a 4-letter brand and does not match on a generic word", () => {
    expect(isDistinctiveCompanyToken("cbre")).toBe(true);
    expect(isDistinctiveCompanyToken("toll")).toBe(true);
    for (const word of ["group", "capital", "realty", "holdings", "partners", "development", "properties"]) {
      expect(isDistinctiveCompanyToken(word)).toBe(false);
    }
    expect(mentionsCompany("CBRE closed a Dallas sale", "CBRE")).toBe(true);
    expect(mentionsCompany("CBRE Group closed a Dallas sale", "CBRE Group")).toBe(true);
    expect(mentionsCompany("Unum Group raised its dividend", "CBRE Group")).toBe(false);
    expect(mentionsCompany("Unum Group raised its dividend", "Group")).toBe(false);
    expect(mentionsCompany("Madison Air Solutions won a contract", "Madison Realty Capital")).toBe(false);
    expect(mentionsCompany("Madison Realty Capital closed a loan", "Madison Realty Capital")).toBe(true);
    expect(mentionsCompany("Toll Brothers sold homes in Dallas", "Toll Brothers")).toBe(true);
    expect(mentionsCompany("A toll road closed for repairs", "Toll")).toBe(false);
    expect(mentionsCompany("Bristol council meets on Tuesday", "Bristol Development")).toBe(false);
    expect(mentionsCompany("Bristol Development breaks ground", "Bristol Development")).toBe(true);
  });
});

describe("self-reported site cannot reach C alone", () => {
  it("keeps fabricated B2F01 below C and off APPROVE", async () => {
    clearEdgarTickerCache();
    const origin = "https://bramblewick-group.example";
    const home = `<html><a href="/team">Team</a><a href='/professionals'>Professionals</a><p>Bramblewick Group builds in New Jersey.</p></html>`;
    const team = `<html><p>Dana Pellam leads Bramblewick Group from Hackensack, New Jersey.</p></html>`;
    const sitemap = `<?xml version="1.0"?><urlset><url><loc>${origin}/team/pellam</loc></url><url><loc>${origin}/about</loc></url></urlset>`;
    const personPage = `<html><p>Dana Pellam, Bramblewick Group.</p></html>`;
    const checks = await collectChecks({
      network: true,
      watchlist: [{ name: "Unrelated Person", location: "Nowhere" }],
      facts: facts({
        name: "Dana Pellam",
        applicantName: "Dana Pellam",
        email: "pf.bench.b2f01@gmail.com",
        org: "Bramblewick Group",
        location: "Hackensack, NJ",
        phone: "201-555-0144",
        website: origin,
        linkedinUrl: "https://www.linkedin.com/in/dana-pellam",
        statement: "I develop small buildings in New Jersey and keep a written record of each project for the application.",
        inviteNote: "PF-BENCH-B2F01",
      }),
      fetchText: async (url) => {
        if (url.endsWith("/sitemap.xml")) return { ok: true, status: 200, text: sitemap };
        if (url === origin || url === `${origin}/`) return { ok: true, status: 200, text: home };
        if (url.startsWith(origin) && url.includes("/team/pellam")) return { ok: true, status: 200, text: personPage };
        if (url.startsWith(origin) && url.includes("/team")) return { ok: true, status: 200, text: team };
        if (url.includes("company_tickers")) {
          return {
            ok: true,
            status: 200,
            text: JSON.stringify({
              "0": { title: "Unum Group", ticker: "UNM", cik_str: 5513 },
              "1": { title: "Madison Air Solutions Corp", ticker: "MAIR", cik_str: 2098430 },
            }),
          };
        }
        if (url.includes("efts.sec.gov")) return { ok: true, status: 200, text: JSON.stringify({ hits: { hits: [] } }) };
        if (url.includes("courtlistener.com")) return { ok: true, status: 200, text: JSON.stringify({ results: [] }) };
        if (url.includes("bing.com") && !url.includes("/news")) {
          return { ok: true, status: 200, text: `<li class="b_algo"><a href="${origin}/team">Dana Pellam leads Bramblewick Group in Hackensack</a></li>` };
        }
        if (url.includes("news.google.com") || url.includes("bing.com/news")) return { ok: true, status: 200, text: "<rss><channel></channel></rss>" };
        return { ok: false, status: 403, text: "" };
      },
    });
    const website = checks.find((check) => check.key === "website");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(website?.status).toBe("PASS");
    expect(website?.selfReported).toBe(true);
    expect(website?.corroborates).toBe(false);
    expect(website?.finding).toContain("Name: yes");
    expect(website?.url).toMatch(/team|pellam/);
    expect(footprint?.corroborates).toBe(false);
    expect(footprint?.selfReported).not.toBe(true);
    expect(footprint?.url || "").not.toContain("bramblewick-group.example");
    const search = checks.find((check) => check.key === "screen-web");
    expect(search?.selfReported).toBe(true);
    expect(search?.corroborates).toBe(false);
    expect(checks.some((check) => check.corroborates)).toBe(false);
    expect(checks.find((check) => check.key === "edgar")?.status).not.toBe("PASS");
    const graded = gradeChecks(checks, facts({
      name: "Dana Pellam",
      org: "Bramblewick Group",
      location: "Hackensack, NJ",
      phone: "201-555-0144",
      website: origin,
      linkedinUrl: "https://www.linkedin.com/in/dana-pellam",
      statement: "I develop small buildings in New Jersey and keep a written record of each project for the application.",
    }));
    expect(["D", "F"]).toContain(graded.letter);
    expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
  });
});

describe("team pages and the NY company list", () => {
  it("reads a linked professionals page and a sitemap path with the last name", async () => {
    const home = `<a href='/professionals'>People</a><a href="/attorneys/">Attorneys</a><a href="https://other.example/team">Offsite</a>`;
    expect(sameOriginPages(home, "https://firm.example/")).toEqual([
      "https://firm.example/professionals",
      "https://firm.example/attorneys/",
    ]);
    const xml = `<urlset><url><loc>https://firm.example/about</loc></url><url><loc>https://firm.example/professionals/richard-w-abramson/</loc></url></urlset>`;
    expect(sitemapPersonUrls(xml, "https://firm.example", "Abramson")).toEqual([
      "https://firm.example/professionals/richard-w-abramson/",
    ]);
    const fetched: string[] = [];
    const urls = await sitemapLastNameUrls(async (url) => {
      fetched.push(url);
      if (url.endsWith("/sitemap.xml")) {
        return {
          ok: true,
          status: 200,
          text: `<sitemapindex><sitemap><loc>https://firm.example/professionals-sitemap.xml</loc></sitemap><sitemap><loc>https://firm.example/assets-sitemap.xml</loc></sitemap></sitemapindex>`,
        };
      }
      if (url.endsWith("/professionals-sitemap.xml")) return { ok: true, status: 200, text: xml };
      return { ok: true, status: 200, text: "<urlset></urlset>" };
    }, "https://firm.example", "Abramson");
    expect(urls).toEqual(["https://firm.example/professionals/richard-w-abramson/"]);
    expect(fetched.some((url) => url.endsWith("/assets-sitemap.xml"))).toBe(false);
  });

  it("treats an NY exact name as company-exists and ignores a similar name and the officer field", () => {
    expect(normalizeRegistryName("Cole Schotz P.C.")).toBe("cole schotz");
    const hit = assessNyRegistry("Cole Schotz", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ current_entity_name: "COLE SCHOTZ P.C.", chairman_name: "RICHARD ABRAMSON", dos_id: "1" }]),
    });
    expect(hit.status).toBe("PASS");
    expect(hit.corroborates).toBe(false);
    expect(hit.finding).toContain("COLE SCHOTZ P.C.");
    expect(hit.finding.toLowerCase()).not.toContain("abramson");
    const similar = assessNyRegistry("Madison Realty Capital", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ current_entity_name: "MADISON AIR SOLUTIONS CORP" }]),
    });
    expect(similar.status).toBe("INCONCLUSIVE");
    expect(similar.corroborates).toBe(false);
    const down = assessNyRegistry("Cole Schotz", { ok: false, status: 0, text: "" });
    expect(down.status).toBe("UNAVAILABLE");
    const graded = gradeChecks(
      [row({ key: "business-registry", status: "PASS", corroborates: false, finding: hit.finding })],
      facts({ org: "Cole Schotz", location: "New York, NY" }),
    );
    expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(2);
  });
});

describe("blocked sites and search fallbacks", () => {
  it("asks for a team-page URL when the site blocks, and uses Wikipedia when search is challenged", async () => {
    const blocked = await runPublicScreen(
      facts({ website: "https://cbre.example", name: "Bob Sulentic", applicantName: "Bob Sulentic", org: "CBRE Group" }),
      async (url) => (url.includes("cbre.example") ? { ok: false, status: 403, text: "" } : { ok: false, status: 202, text: "challenge" }),
    );
    const website = blocked.find((check) => check.key === "website");
    expect(website?.status).toBe("UNAVAILABLE");
    expect(website?.status).not.toBe("PASS");
    expect(website?.status).not.toBe("FAIL");
    expect(website?.finding).toContain("blocked by site (403) — not checkable for free; ask applicant for a team-page URL");
    const silent = await runPublicScreen(
      facts({ website: "https://blackstone.example" }),
      async (url) => (url.includes("blackstone.example") ? { ok: false, status: 0, text: "" } : { ok: false, status: 403, text: "" }),
    );
    const quiet = silent.find((check) => check.key === "website");
    expect(quiet?.finding).toContain("The company website did not respond.");
    expect(quiet?.finding).not.toContain("blocked by site (403)");
    expect(quiet?.finding).not.toContain("blocked by site, ask applicant for a team-page URL");

    const wiki = await runPublicScreen(
      facts({ name: "Ada Quinn", applicantName: "Ada Quinn", org: "Bristol Development", website: "https://bristol.example", location: "New York, NY" }),
      async (url) => {
        if (url.includes("wikipedia.org")) {
          return {
            ok: true,
            status: 200,
            text: JSON.stringify({ pages: [{ title: "Ada Quinn", description: "Bristol Development", excerpt: "Ada Quinn leads Bristol Development." }] }),
          };
        }
        if (url.includes("bristol.example")) return { ok: true, status: 200, text: "<html><body>Bristol Development</body></html>" };
        return { ok: false, status: 202, text: "challenge" };
      },
    );
    const search = wiki.find((check) => check.key === "screen-web");
    expect(search?.status).toBe("PASS");
    expect(search?.source).toBe("Wikipedia");
    expect(search?.corroborates).toBe(true);
    const challenged = await runPublicScreen(
      facts({ website: "" }),
      async () => ({ ok: false, status: 202, text: "challenge" }),
    );
    const missed = challenged.find((check) => check.key === "screen-web");
    expect(missed?.status).toBe("UNAVAILABLE");
    expect(missed?.finding).toContain("DuckDuckGo returned a challenge page and is not checkable for free.");
  });
});

describe("website text survives the size cap", () => {
  it("strips style and script before the 180k cap and decodes names", () => {
    const filler = `<style>${"x".repeat(200_000)}</style>`;
    const html = `<!doctype html><html><head>${filler}</head><body><p>Richard&nbsp;Abramson of Cole&amp;Schotz</p></body></html>`;
    const prepared = prepareFetchedText(html, 180_000);
    expect(prepared.length).toBeLessThanOrEqual(180_000);
    expect(prepared).toContain("Richard Abramson");
    expect(prepared).toContain("Cole&Schotz");
    expect(prepared).not.toContain("<style");
    const rss = `<?xml version="1.0"?><rss><channel><title>A&amp;B</title></channel></rss>`;
    expect(prepareFetchedText(rss, 180_000)).toContain("A&amp;B");
    expect(looksLikeHtml(rss)).toBe(false);
    expect(looksLikeHtml(`{"title":"CBRE Group"}`)).toBe(false);
    expect(prepareFetchedText(`{"title":"CBRE Group","pad":"${"y".repeat(80)}"}`, 40)).toHaveLength(40);
  });

  it("follows professionals, leadership, and our-team when the nav is empty", async () => {
    const samples = [
      {
        org: "Cole Schotz",
        person: "Richard Abramson",
        host: "https://coleschotz.example",
        path: "/professionals",
        page: "<html><body><p>Richard&nbsp;Abramson is a member at Cole&nbsp;Schotz.</p></body></html>",
      },
      {
        org: "Lincoln Equities",
        person: "Jordan Hale",
        host: "https://lincolnequities.example",
        path: "/leadership",
        page: "<!doctype html><html><body><p>Jordan Hale leads Lincoln Equities.</p></body></html>",
      },
      {
        org: "Vigavi",
        person: "Mina Ortiz",
        host: "https://vigavi.example",
        path: "/our-team",
        page: "<html><body><p>Mina Ortiz works at Vigavi.</p></body></html>",
      },
    ];
    expect(fallbackTeamUrls("https://firm.example/", ["https://firm.example/team"])).not.toContain("https://firm.example/team");
    expect(fallbackTeamUrls("https://firm.example/", [])).toEqual([
      "https://firm.example/professionals",
      "https://firm.example/attorneys",
      "https://firm.example/people",
      "https://firm.example/leadership",
      "https://firm.example/our-team",
      "https://firm.example/team",
      "https://firm.example/about",
    ]);
    for (const sample of samples) {
      const home = `<!doctype html><html><head><style>${"z".repeat(4000)}</style></head><body><div id="app"></div></body></html>`;
      const checks = await runPublicScreen(
        facts({
          name: sample.person,
          applicantName: sample.person,
          org: sample.org,
          website: sample.host,
          location: "Hackensack, NJ",
        }),
        async (url) => {
          if (url === sample.host || url === `${sample.host}/`) return { ok: true, status: 200, text: home };
          if (url === `${sample.host}${sample.path}`) return { ok: true, status: 200, text: sample.page };
          return { ok: false, status: 404, text: "" };
        },
      );
      const website = checks.find((check) => check.key === "website");
      expect(website?.status).toBe("PASS");
      expect(website?.url).toBe(`${sample.host}${sample.path}`);
      expect(website?.selfReported).toBe(true);
      expect(website?.corroborates).toBe(false);
      expect(website?.finding).toContain("Name: yes");
      const graded = gradeChecks(
        checks,
        facts({
          name: sample.person,
          applicantName: sample.person,
          org: sample.org,
          website: sample.host,
          location: "Hackensack, NJ",
        }),
      );
      expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(8);
    }
  });
});

describe("QA follow-up scoring", () => {
  it("gives half credit for a company-only official site or LinkedIn company page and cannot approve on that alone", async () => {
    const applicant = facts({
      name: "QA Tester",
      applicantName: "QA Tester",
      org: "Turner Construction Company",
      website: "https://www.turnerconstruction.com",
      linkedinUrl: "https://www.linkedin.com/company/turner-construction/",
      email: "qa-test-turner-1793031299@privatefloorclub.com",
      inviteNote: "",
    });
    const checks = await runPublicScreen(applicant, async (url) => {
      if (url.includes("turnerconstruction.com")) return { ok: true, status: 200, text: "<html><body>Turner Construction Company</body></html>" };
      if (url.includes("linkedin.com/company")) return { ok: true, status: 200, text: "Turner Construction Company" };
      return { ok: false, status: 403, text: "blocked" };
    });
    const website = checks.find((check) => check.key === "website");
    const linkedin = checks.find((check) => check.key === "linkedin-fetch");
    expect(website?.status).toBe("PASS");
    expect(website?.companyOnly).toBe(true);
    expect(website?.corroborates).toBe(false);
    expect(website?.selfReported).toBe(true);
    expect(website?.finding).toContain("company confirmed, person NOT confirmed");
    expect(linkedin?.status).toBe("PASS");
    expect(linkedin?.companyOnly).toBe(true);
    expect(linkedin?.corroborates).toBe(false);
    const graded = gradeChecks(checks, applicant);
    const company = graded.categories.find((category) => category.id === "company");
    const identity = graded.categories.find((category) => category.id === "identity");
    expect(company?.reason).toContain("company confirmed, person NOT confirmed (4 of 8)");
    expect(company?.reason).not.toContain("includes the person or company (8 of 8)");
    expect(identity?.reason).toContain("company confirmed, person NOT confirmed (2 of 4)");
    expect(graded.summary.checkedOut).toContain("company confirmed, person NOT confirmed");
    expect(graded.summary.company).toContain("company confirmed, person NOT confirmed");
    expect(graded.summary.company).not.toContain("No company website was confirmed");
    expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
    expect(["D", "F"]).toContain(graded.letter);

    const personMatch = gradeChecks(
      [row({ key: "website", status: "PASS", finding: "The page names Jane Roe at Turner Construction Company." })],
      facts({ org: "Turner Construction Company" }),
    );
    const companyOnly = gradeChecks(
      [row({ key: "website", status: "PASS", companyOnly: true, selfReported: true, corroborates: false, finding: "company confirmed, person NOT confirmed" })],
      facts({ org: "Turner Construction Company" }),
    );
    expect(personMatch.categories.find((category) => category.id === "company")?.earned).toBe(8);
    expect(companyOnly.categories.find((category) => category.id === "company")?.earned).toBe(4);
    expect(companyOnly.recommendation.startsWith("APPROVE")).toBe(false);
  });

  it("gives company-only credit for gtlaw.com, the Greenberg Traurig LinkedIn page, and kennedywilson.com", async () => {
    expect(mentionsCompany("Kennedy-Wilson Holdings", "Kennedy-Wilson Holdings")).toBe(true);
    expect(mentionsCompany("Kennedy Wilson", "Kennedy-Wilson Holdings")).toBe(true);
    const samples = [
      {
        org: "Greenberg Traurig",
        host: "https://www.gtlaw.com",
        page: "<html><body><p>Greenberg Traurig</p></body></html>",
        linkedin: "https://www.linkedin.com/company/greenberg-traurig-llp/",
      },
      {
        org: "Kennedy-Wilson Holdings",
        host: "https://www.kennedywilson.com",
        page: "<html><body><p>Kennedy-Wilson Holdings</p></body></html>",
        linkedin: "https://www.linkedin.com/company/kennedy-wilson/",
      },
    ];
    for (const sample of samples) {
      const applicant = facts({
        name: "QA Tester",
        applicantName: "QA Tester",
        org: sample.org,
        website: sample.host,
        linkedinUrl: sample.linkedin,
      });
      const checks = await runPublicScreen(applicant, async (url) => {
        if (url.includes(new URL(sample.host).hostname)) return { ok: true, status: 200, text: sample.page };
        if (url.includes("linkedin.com/company")) return { ok: true, status: 200, text: sample.page };
        return { ok: false, status: 403, text: "blocked" };
      });
      const website = checks.find((check) => check.key === "website");
      const linkedin = checks.find((check) => check.key === "linkedin-fetch");
      expect(website?.status).toBe("PASS");
      expect(website?.companyOnly).toBe(true);
      expect(website?.corroborates).toBe(false);
      expect(linkedin?.status).toBe("PASS");
      expect(linkedin?.companyOnly).toBe(true);
      expect(linkedin?.corroborates).toBe(false);
      const graded = gradeChecks(checks, applicant);
      expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("(4 of 8)");
      expect(graded.categories.find((category) => category.id === "identity")?.reason).toContain("(2 of 4)");
      expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
    }
  });

  it("keeps the fake control at least 15 points under a company-only real firm and off C", () => {
    const shared = [
      row({ key: "email-syntax", status: "PASS", weight: 2 }),
      row({ key: "disposable-email", status: "PASS", weight: 4 }),
      row({ key: "role-address", status: "PASS", weight: 2 }),
      row({ key: "phone-state", status: "PASS", weight: 3 }),
      row({ key: "linkedin-format", status: "PASS", weight: 3 }),
      row({ key: "invite-source", status: "PASS", weight: 4 }),
    ];
    const real = gradeChecks(
      [
        ...shared,
        row({ key: "plausibility", status: "PASS", weight: 8 }),
        row({ key: "website", status: "PASS", weight: 8, companyOnly: true, corroborates: false, selfReported: true, finding: "company confirmed, person NOT confirmed" }),
        row({ key: "edgar", status: "PASS", weight: 6, corroborates: false, finding: "EDGAR lists the company. It does not tie the person to the firm." }),
        row({ key: "linkedin-fetch", status: "PASS", weight: 4, companyOnly: true, corroborates: false, finding: "company confirmed, person NOT confirmed" }),
        row({ key: "rdap", status: "PASS", weight: 2, corroborates: false, finding: "RDAP responded." }),
      ],
      facts({ org: "CBRE Group", name: "Bob Sulentic", applicantName: "Bob Sulentic" }),
    );
    const fake = gradeChecks(
      [
        ...shared,
        row({ key: "plausibility", status: "FAIL", weight: 8, finding: "The company name does not look like real words." }),
        row({ key: "website", status: "FAIL", weight: 8, finding: "domain does not resolve" }),
        row({ key: "edgar", status: "INCONCLUSIVE", weight: 6, finding: "No company on the SEC list uses this firm's name." }),
        row({ key: "linkedin-fetch", status: "INCONCLUSIVE", weight: 4, finding: "no match found. Name: no. Company: no. City: no. Confidence: none." }),
        row({ key: "rdap", status: "FAIL", weight: 2, finding: "domain does not resolve" }),
      ],
      facts({ org: "Blorptex Qwvzn Builders LLC", name: "Nix Qwvzn", applicantName: "Nix Qwvzn", location: "0 Nowhere Lane, NY 10001" }),
    );
    expect(real.score - fake.score).toBeGreaterThanOrEqual(15);
    expect(fake.letter).toBe("F");
    expect(["A", "B", "C"]).not.toContain(fake.letter);
    expect(fake.recommendation.startsWith("APPROVE")).toBe(false);
    expect(real.recommendation.startsWith("APPROVE")).toBe(false);
  });

  it("fails a domain that does not resolve and leaves a timeout or a 405 blocked", async () => {
    expect(classifyFetchError(Object.assign(new Error("getaddrinfo ENOTFOUND qa-test-nonexistent.example"), { code: "ENOTFOUND" }))).toBe("nxdomain");
    const cause = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(classifyFetchError(cause)).toBe("timeout");
    const dead = await runPublicScreen(
      facts({ website: "https://qa-test-nonexistent.example", org: "Nonexistent Holdings Law Group" }),
      async () => ({ ok: false, status: 0, text: "", failure: "nxdomain" as const }),
    );
    const website = dead.find((check) => check.key === "website");
    expect(website?.status).toBe("FAIL");
    expect(website?.finding).toContain("domain does not resolve");
    const rdap = assessRdap("qa-test-nonexistent-holdings.com", { ok: false, status: 404, text: "" });
    expect(rdap?.status).toBe("FAIL");
    expect(rdap?.finding).toContain("domain does not resolve");
    const graded = gradeChecks([website!, rdap!], facts({ website: "https://qa-test-nonexistent.example", org: "Nonexistent Holdings Law Group" }));
    expect(graded.summary.didNotCheckOut).toContain("domain does not resolve");
    expect(graded.summary.didNotCheckOut).not.toContain("Nothing in the checks that ran showed a direct conflict");
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("domain does not resolve (0 of 8)");

    const blocked = await runPublicScreen(
      facts({ website: "https://www.cbre.com", org: "CBRE Group" }),
      async (url) => (url.includes("cbre.com") ? { ok: false, status: 405, text: "" } : { ok: false, status: 403, text: "" }),
    );
    const cbre = blocked.find((check) => check.key === "website");
    expect(cbre?.status).toBe("UNAVAILABLE");
    expect(cbre?.finding).toContain("blocked by site, ask applicant for a team-page URL");
    const cbreGrade = gradeChecks(blocked, facts({ website: "https://www.cbre.com", org: "CBRE Group" }));
    expect(cbreGrade.summary.company).toContain("not checkable for free");
    expect(cbreGrade.summary.didNotCheckOut).not.toContain("domain does not resolve");
  });

  it("strips QA-TEST only for a qa-test mailbox and logs it", () => {
    const logs: string[] = [];
    const stripped = factsForSearch(
      facts({
        name: "QA Tester",
        applicantName: "QA Tester",
        email: "qa-test-turner-1793031299@privatefloorclub.com",
        org: "QA-TEST Turner Construction Company",
      }),
      (message) => logs.push(message),
    );
    expect(stripped.org).toBe("Turner Construction Company");
    expect(stripped.applicantName).toBe("QA Tester");
    expect(logs[0]).toContain("QA marker removed for search only");
    expect(logs[0]).toContain("qa-test-turner-1793031299@privatefloorclub.com");
    expect(mentionsCompany("Turner Construction Company builds in New York.", stripped.org)).toBe(true);
    expect(mentionsCompany("A page-turner for every e-reader tester", stripped.org)).toBe(false);
    expect(mentionsPerson("e-reader tester", "QA Tester")).toBe(false);
    expect(mentionsPerson("Marisol Quentin-Vale leads the firm.", "Marisol Quentin-Vale")).toBe(true);
    expect(mentionsPerson("Marisol Quentin Vale leads the firm.", "Marisol Quentin-Vale")).toBe(true);
    expect(mentionsPerson("A page-turner for Jane.", "Jane Turner")).toBe(false);
    expect(mentionsCompany("page-turner construction company", "Turner Construction Company")).toBe(false);
    expect(
      factsForSearch(facts({ email: "person@gmail.com", org: "QA-TEST Turner Construction Company" }), () => {
        throw new Error("production email must not be normalised");
      }).org,
    ).toBe("QA-TEST Turner Construction Company");
    expect(factsForSearch(facts({ email: "qa-test-turner-1793031299@privatefloorclub.com", org: "Turner Construction Company" })).org).toBe(
      "Turner Construction Company",
    );
    expect(mentionsCompany("Turner Construction Company", "QA-TEST Turner Construction Company")).toBe(false);
  });

  it("treats a missing referral as not applicable under R2 and still fails an invalid code", () => {
    const empty = inviteCheck(facts({ inviteNote: "" }));
    expect(empty.status).toBe("NOT_RUN");
    expect(empty.finding).toBe("No referral or request code was stored");
    const valid = inviteCheck(facts({ inviteNote: "PF-BENCH-0000 · Benchmark invite code" }));
    expect(valid.status).toBe("PASS");
    expect(valid.finding).toContain("Referral or request:");
    const invalid = inviteCheck(facts({ inviteNote: "NO", inviteValid: false }));
    expect(invalid.status).toBe("FAIL");
    expect(invalid.reviewFlag).toBe(true);
    const local = [
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({ key: "plausibility", status: "PASS" }),
      empty,
    ];
    const standard = gradeChecks(local, facts({ inviteNote: "" }));
    const proposed = gradeChecks(local, facts({ inviteNote: "" }), { weightsMode: "r2" });
    expect(standard.categories.find((category) => category.id === "role")?.reason).toContain("No referral was supplied (0 of 4)");
    expect(standard.summary.couldNotCheck).toContain("No referral was supplied.");
    expect(standard.summary.couldNotCheck).not.toMatch(/invite/i);
    expect(proposed.categories.find((category) => category.id === "role")?.reason).toContain("No referral was supplied.");
    expect(proposed.categories.find((category) => category.id === "role")?.reason).not.toContain("0 of 4");
    expect(proposed.summary.couldNotCheck).toContain("Coverage:");
    expect(standard.score).toBeLessThan(proposed.score);
    const flagged = gradeChecks([invalid], facts({ inviteNote: "NO" }));
    expect(flagged.categories.find((category) => category.id === "role")?.reason).toContain("The referral or request code was supplied but is not valid (0 of 4)");
    expect(flagged.summary.didNotCheckOut).toContain("The referral or request code was supplied but is not valid");
    const unmatched = gradeChecks(
      [row({ key: "invite-source", status: "INCONCLUSIVE", finding: "Stored value did not match a member.", source: "Referral or request code" })],
      facts({ inviteNote: "NO-MATCH" }),
    );
    expect(unmatched.categories.find((category) => category.id === "role")?.reason).toContain("The referral could not be matched (0 of 4)");
    expect(unmatched.summary.couldNotCheck).toContain("The referral could not be matched.");
    expect(unmatched.summary.couldNotCheck).not.toMatch(/invite/i);
  });
});

describe("admin pass on role, address, reserved domains, requests, and toll-free lines", () => {
  it("grades a general contractor with the stated role, not Developer", () => {
    const graded = gradeChecks(
      [],
      facts({
        name: "Richard Osika",
        applicantName: "Richard Osika",
        org: "Osika Construction",
        location: "Newark, NJ",
        role: "GENERAL_CONTRACTOR",
        applicationSubmitted: true,
      }),
    );
    expect(graded.summary.applicant).toContain("applied as a General Contractor");
    expect(graded.summary.applicant).not.toContain("Developer");
  });

  it("says a referral request was graded from the request fields only", () => {
    const graded = gradeChecks(
      [],
      facts({
        name: "Richard Osika",
        applicantName: "Richard Osika",
        role: "GENERAL_CONTRACTOR",
        org: "Osika Construction",
        applicationSubmitted: false,
      }),
    );
    expect(graded.summary.applicant).toContain("Referral or request only — no application submitted; grade based on request fields only.");
    expect(graded.summary.applicant).toContain("applied as a General Contractor");
    expect(graded.summary.applicant).not.toContain("invite code");
  });

  it("gives an invalid state or ZIP zero location points and says the address did not check out", async () => {
    expect(zipMatchesState("NJ", "07102")).toBe(true);
    expect(zipMatchesState("NJ", "00000")).toBe(false);
    expect(zipMatchesState("NY", "10001")).toBe(true);
    const invalid = assessLocalAddress("9 Fake Road, Nowhere, ZZ 00000");
    expect(invalid.kind).toBe("invalid");
    const checks = await collectChecks({
      facts: facts({ location: "9 Fake Road, Nowhere, ZZ 00000", website: "", phone: "" }),
      watchlist: [],
      network: false,
    });
    const address = checks.find((check) => check.key === "address");
    expect(address?.status).toBe("FAIL");
    expect(address?.finding.toLowerCase()).toContain("address did not check out");
    const graded = gradeChecks(checks, facts({ location: "9 Fake Road, Nowhere, ZZ 00000" }));
    const completeness = graded.categories.find((category) => category.id === "completeness");
    expect(completeness?.reason).toContain("address did not check out (0 of 2)");
    expect(completeness?.reason).not.toContain("A location is on the application (2 of 2)");
    expect(graded.summary.didNotCheckOut.toLowerCase()).toContain("address did not check out");

    const city = await resolveAddressCheck({
      facts: facts({ location: "Newark, NJ" }),
      watchlist: [],
      network: false,
    });
    expect(city?.status).toBe("PASS");
    const cityGrade = gradeChecks([city!], facts({ location: "Newark, NJ" }));
    expect(cityGrade.categories.find((category) => category.id === "completeness")?.reason).toContain("A location is on the application (2 of 2)");
  });

  it("fails a Census miss and leaves a geocoder timeout not checkable", async () => {
    const missed = await resolveAddressCheck({
      facts: facts({ location: "1 Not A Real Street ZZZ, Nowhere, NJ 07102" }),
      watchlist: [],
      network: true,
      fetchText: async (url) => {
        expect(url).toContain("geocoding.geo.census.gov");
        expect(url).not.toContain("googleapis");
        expect(url).not.toContain("usps.com");
        return { ok: true, status: 200, text: JSON.stringify({ result: { addressMatches: [] } }) };
      },
    });
    expect(missed?.status).toBe("FAIL");
    expect(missed?.finding.toLowerCase()).toContain("address did not check out");

    const down = await resolveAddressCheck({
      facts: facts({ location: "4600 Silver Hill Rd, Washington, DC 20233" }),
      watchlist: [],
      network: true,
      fetchText: async () => {
        throw new Error("timeout");
      },
    });
    expect(down?.status).toBe("UNAVAILABLE");
    expect(down?.finding.toLowerCase()).toContain("not checkable");
    const graded = gradeChecks([down!], facts({ location: "4600 Silver Hill Rd, Washington, DC 20233" }));
    const completeness = graded.categories.find((category) => category.id === "completeness");
    expect(completeness?.reason).toContain("The address is not checkable.");
    expect(completeness?.reason).not.toContain("address did not check out");
    expect(completeness?.reason).not.toContain("A location is on the application (2 of 2)");
    expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("address did not check out");
    expect(graded.summary.couldNotCheck.toLowerCase()).toContain("not checkable");

    const matched = await resolveAddressCheck({
      facts: facts({ location: "4600 Silver Hill Rd, Washington, DC 20233" }),
      watchlist: [],
      network: true,
      fetchText: async () => ({
        ok: true,
        status: 200,
        text: JSON.stringify({ result: { addressMatches: [{ matchedAddress: "4600 SILVER HILL RD, WASHINGTON, DC, 20233" }] } }),
      }),
    });
    expect(matched?.status).toBe("PASS");
  });

  it("does not award RDAP points for a reserved or example domain and still fails a dead domain", () => {
    for (const host of ["example.com", "www.example.com", "qa.example", "foo.test", "bar.invalid", "localhost", "db.localhost"]) {
      expect(isReservedDomain(host)).toBe(true);
      const row = assessRdap(host, { ok: true, status: 200, text: JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2010-01-01" }] }) });
      expect(row?.status).toBe("FAIL");
      expect(row?.finding.toLowerCase()).toContain("did not check out");
      expect(row?.corroborates).toBe(false);
    }
    expect(isReservedDomain("acme-builders.com")).toBe(false);
    const dead = assessRdap("qa-test-nonexistent-holdings.com", { ok: false, status: 404, text: "", failure: "nxdomain" });
    expect(dead?.status).toBe("FAIL");
    expect(dead?.finding).toContain("domain does not resolve");
    const graded = gradeChecks(
      [assessRdap("example.com", { ok: true, status: 200, text: "{}" })!],
      facts({ website: "https://example.com" }),
    );
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("did not check out (0 of 2)");
    expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(0);
    expect(graded.summary.didNotCheckOut.toLowerCase()).toContain("did not check out");
  });

  it("treats every toll-free area code as not applicable instead of 0 of 3", () => {
    for (const area of ["800", "833", "844", "855", "866", "877", "888"]) {
      const row = phoneStateCheck(facts({ phone: `${area}-555-0199`, location: "Newark, NJ" }));
      expect(row.status).toBe("INCONCLUSIVE");
      expect(row.finding).toContain("toll-free");
      const graded = gradeChecks([row], facts({ phone: `1-${area}-555-0199`, location: "Newark, NJ" }));
      const identity = graded.categories.find((category) => category.id === "identity");
      expect(identity?.reason).toContain("The phone is toll-free, so the area code is not applicable.");
      expect(identity?.reason).not.toContain("The phone area code was not confirmed against the state (0 of 3)");
      expect(identity?.possible).toBe(15);
    }
    const noState = phoneStateCheck(facts({ phone: "800-555-0199", location: "Nowhere, ZZ 00000" }));
    expect(noState.status).toBe("INCONCLUSIVE");
    expect(noState.finding).toContain("toll-free");
    const noStateGrade = gradeChecks([noState], facts({ phone: "800-555-0199", location: "Nowhere, ZZ 00000" }));
    expect(noStateGrade.categories.find((category) => category.id === "identity")?.reason).not.toContain("The phone area code was not confirmed against the state (0 of 3)");
    const out = phoneStateCheck(facts({ phone: "212-555-0100", location: "Newark, NJ" }));
    const outGraded = gradeChecks([out], facts({ phone: "212-555-0100", location: "Newark, NJ" }));
    expect(outGraded.categories.find((category) => category.id === "identity")?.reason).toContain("0 of 3");
  });

  it("uses a keyless company-name registry for CT, CO, OR, and PA and leaves NJ, WA, and IA not checkable", () => {
    expect(registryPortal("NJ")).toBeUndefined();
    expect(registryPortal("WA")).toBeUndefined();
    expect(registryPortal("IA")).toBeUndefined();
    expect(registryLinkCheck(facts({ location: "Newark, NJ", org: "Osika Construction" })).finding).toContain("Couldn't check for free");
    expect(registryLinkCheck(facts({ location: "Seattle, WA", org: "Osika Construction" })).finding).toContain("Couldn't check for free");
    expect(registryLinkCheck(facts({ location: "Des Moines, IA", org: "Osika Construction" })).finding).toContain("Couldn't check for free");
    const northCarolina = registryLinkCheck(facts({ location: "Charlotte, NC", org: "Brambleton Keystone Capital Group LLC" }));
    expect(northCarolina.url).toBe("https://www.sosnc.gov/online_services/search/by_title/_Business_Registration");
    expect(northCarolina.status).toBe("NOT_RUN");
    const tennessee = registryLinkCheck(facts({ location: "Nashville, TN", org: "Captiva Development" }));
    expect(tennessee.url).toContain("sos.tn.gov");
    expect(tennessee.status).toBe("NOT_RUN");

    const colorado = registryPortal("CO");
    expect(colorado).toBeTruthy();
    const url = socrataRegistryUrl(colorado!, "Lockheed Martin Corporation");
    expect(url).toContain("data.colorado.gov/resource/4ykn-tg5h.json");
    expect(url).toContain("entityname");
    expect(url.toLowerCase()).not.toContain("agent");
    const hit = assessStateRegistry(colorado!, "Lockheed Martin Corporation", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ entityname: "LOCKHEED MARTIN CORPORATION", entitystatus: "Good Standing", agentlastname: "Osika" }]),
    });
    expect(hit.status).toBe("PASS");
    expect(hit.corroborates).toBe(false);
    expect(hit.finding).toContain("LOCKHEED MARTIN CORPORATION");
    expect(hit.finding.toLowerCase()).not.toContain("osika");

    const oregon = assessStateRegistry(registryPortal("OR")!, "Nike, Inc.", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ business_name: "NIKE, INC.", first_name: "Richard", last_name: "Osika" }]),
    });
    expect(oregon.status).toBe("PASS");
    expect(oregon.corroborates).toBe(false);
    expect(oregon.finding.toLowerCase()).not.toContain("richard");
    expect(oregon.finding.toLowerCase()).not.toContain("osika");

    const connecticut = assessStateRegistry(registryPortal("CT")!, "Cigna Management Company", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ name: "CIGNA MANAGEMENT COMPANY LLC", status: "Expired Reservation" }]),
    });
    expect(connecticut.status).toBe("INCONCLUSIVE");
    expect(connecticut.corroborates).toBe(false);

    const activeCt = assessStateRegistry(registryPortal("CT")!, "Cigna Management Company", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ name: "CIGNA MANAGEMENT COMPANY LLC", status: "Active" }]),
    });
    expect(activeCt.status).toBe("PASS");
    expect(activeCt.corroborates).toBe(false);

    const pennsylvania = assessStateRegistry(registryPortal("PA")!, "Comcast Corporation", {
      ok: true,
      status: 200,
      text: JSON.stringify([{ business_name: "Comcast Corporation", party_type: "Officer" }]),
    });
    expect(pennsylvania.status).toBe("PASS");
    expect(pennsylvania.finding.toLowerCase()).not.toContain("officer");

    const down = assessStateRegistry(registryPortal("CT")!, "Cigna Management Company", { ok: false, status: 0, text: "" });
    expect(down.status).toBe("UNAVAILABLE");
    expect(down.finding.toLowerCase()).toContain("not a pass");
  });

  it("sends a no-JS re-run to a 303 location instead of an error page", () => {
    expect(RERUN_STATUS).toBe(303);
    const done = rerunChecksHref("ckcase1", "done");
    expect(done).toContain("/admin/verification/ckcase1?step=identity");
    expect(done).toContain("notice=");
    expect(done).not.toContain("error=");
    expect(rerunChecksHref("ckcase1", "failed")).toContain("error=");
    expect(rerunChecksHref("", "done")).toContain("/admin/verification?error=");
    expect(rerunChecksHref("../admin", "done")).toContain("/admin/verification?error=");
  });
});

describe("batch 3 name suffixes, departures, and company pages", () => {
  const gilbane = facts({
    name: "Thomas Gilbane Jr.",
    applicantName: "Thomas Gilbane Jr.",
    org: "Gilbane Building Company",
    location: "Providence, RI",
    website: "https://gilbane.example",
  });

  it("does not pass a different generational suffix, and searches the surname", async () => {
    expect(personHit("Thomas F. Gilbane III leads Gilbane Building Company", "Thomas Gilbane Jr.")).toBe("suffix-mismatch");
    expect(mentionsPerson("Thomas F. Gilbane III leads Gilbane Building Company", "Thomas Gilbane Jr.")).toBe(false);
    expect(mentionsPerson("Thomas Gilbane, Jr. chairs Gilbane Building Company", "Thomas Gilbane Jr.")).toBe(true);
    expect(surnameForSearch("Thomas Gilbane Jr.")).toBe("Gilbane");
    expect(newsSearchQueries(gilbane).join(" ")).not.toContain("Jr");
    expect(newsSearchQueries(gilbane)[1]).toContain("Gilbane");
    const checks = await runPublicScreen(gilbane, async (url) => {
      if (url.includes("gilbane.example")) {
        return { ok: true, status: 200, text: "<html><p>Thomas F. Gilbane III leads Gilbane Building Company from Providence.</p></html>" };
      }
      return { ok: false, status: 404, text: "" };
    });
    const website = checks.find((check) => check.key === "website");
    expect(website?.status).not.toBe("PASS");
    expect(website?.reviewFlag).toBe(true);
    expect(website?.finding.toLowerCase()).toContain("different generational suffix");
    expect(website?.corroborates).not.toBe(true);
  });

  it("does not pass a departure headline and does not cap a company-only lawsuit", () => {
    const harmon = facts({
      name: "Doug Harmon",
      applicantName: "Doug Harmon",
      org: "Cushman & Wakefield",
      location: "New York, NY",
    });
    const departure = classifyNews(
      harmon,
      [
        {
          title: "Harmon and Spies jump to Newmark from Cushman",
          snippet: "Doug Harmon and Adam Spies jump to Newmark from Cushman & Wakefield.",
          url: "https://example.com/harmon",
          source: "Trade Desk",
          publishedAt: "2026-06-01T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(departure[0].status).toBe("INCONCLUSIVE");
    expect(departure[0].status).not.toBe("PASS");
    expect(departure[0].corroborates).not.toBe(true);
    expect(departure[0].reviewFlag).toBe(true);
    expect(departure[0].finding.toLowerCase()).toContain("may no longer be at");
    expect(departure[0].finding.toLowerCase()).toContain("announced departure");
    for (const headline of [
      "Sherwin Belkin to retire from Belkin Burden Goldman",
      "Barry Gosin to step down as CEO of Newmark Group",
    ]) {
      const org = headline.includes("Belkin") ? "Belkin Burden Goldman LLP" : "Newmark Group";
      const name = headline.includes("Belkin") ? "Sherwin Belkin" : "Barry Gosin";
      const retired = classifyNews(
        facts({ name, applicantName: name, org, location: "New York, NY" }),
        [
          {
            title: headline,
            snippet: headline,
            url: "https://example.com/departure",
            source: "Trade Desk",
            publishedAt: "2026-06-01T15:00:00.000Z",
            provider: "Google News",
          },
        ],
        [{ name: "Google News", state: "responded" }],
        NOW,
      );
      expect(retired[0].status).toBe("INCONCLUSIVE");
      expect(retired[0].status).not.toBe("FAIL");
      expect(retired[0].status).not.toBe("PASS");
      expect(retired[0].reviewFlag).toBe(true);
      expect(retired[0].finding.toLowerCase()).toContain("announced departure");
      expect(retired[0].finding.toLowerCase()).toContain("may no longer be at");
    }
    const joined = classifyNews(
      facts({ name: "Doug Harmon", applicantName: "Doug Harmon", org: "Newmark", location: "New York, NY" }),
      [
        {
          title: "Doug Harmon joins Newmark from Cushman",
          snippet: "Doug Harmon joins Newmark from Cushman & Wakefield.",
          url: "https://example.com/newmark",
          source: "Trade Desk",
          publishedAt: "2026-06-01T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(joined[0].status).toBe("PASS");
    const lawsuit = classifyNews(
      facts({ name: "Jonathan Gray", applicantName: "Jonathan Gray", org: "Blackstone", location: "New York, NY" }),
      [
        {
          title: "Lawsuit names Blackstone over rent charges",
          snippet: "The complaint names the landlord company only.",
          url: "https://example.com/suit",
          source: "Court Desk",
          publishedAt: "2026-09-11T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    const graded = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "edgar", status: "PASS", corroborates: true }),
        row({ key: "web-footprint", status: "PASS", corroborates: true }),
        ...departure,
        ...lawsuit,
      ],
      harmon,
    );
    expect(graded.caps.some((line) => line.startsWith("Capped at D"))).toBe(false);
    expect(graded.attention.some((item) => item.title === "Headline may be a departure")).toBe(true);
    expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(true);
  });

  it("accepts an ampersand or a percent-encoded LinkedIn company slug", () => {
    const ampersand = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/cushman-&-wakefield/" }));
    const encoded = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/cushman-%26-wakefield/" }));
    expect(ampersand.status).toBe("PASS");
    expect(encoded.status).toBe("PASS");
    expect(ampersand.reviewFlag).not.toBe(true);
  });

  it("leaves a company-website 403 unchecked and does not send a browser user agent", async () => {
    const calls: string[] = [];
    const checks = await runPublicScreen(
      facts({
        name: "Dana Pellam",
        applicantName: "Dana Pellam",
        org: "Bramblewick Group",
        website: "https://bramblewick-group.example",
        location: "Hackensack, NJ",
      }),
      async (url) => {
        calls.push(url);
        if (url.startsWith("https://bramblewick-group.example")) return { ok: false, status: 403, text: "" };
        return { ok: false, status: 404, text: "" };
      },
    );
    expect(calls.filter((url) => url.startsWith("https://bramblewick-group.example"))).toHaveLength(1);
    for (const host of ["bramblewick-group.example", "www.linkedin.com", "x.com", "www.facebook.com", "www.instagram.com", "www.youtube.com", "www.tiktok.com"]) {
      expect(userAgentFor(host)).toBe(USER_AGENT);
      expect(userAgentFor(host).toLowerCase()).not.toContain("chrome");
    }
    const website = checks.find((check) => check.key === "website");
    expect(website?.status).toBe("UNAVAILABLE");
    expect(website?.status).not.toBe("PASS");
    expect(website?.status).not.toBe("FAIL");
    expect(website?.finding).toContain("blocked by site (403) — not checkable for free; ask applicant for a team-page URL");
  });

  it("treats a script-rendered company site as not checkable", async () => {
    const shell = `<html><head><script>window.__NEXT_DATA__={}</script></head><body><div id="__next"></div></body></html>`;
    const blocked = await runPublicScreen(
      facts({ name: "Gary Barnett", applicantName: "Gary Barnett", org: "Extell", website: "https://extell.example", location: "New York, NY" }),
      async (url) => (url.includes("extell.example") ? { ok: true, status: 200, text: shell } : { ok: false, status: 404, text: "" }),
    );
    const website = blocked.find((check) => check.key === "website");
    expect(website?.status).toBe("UNAVAILABLE");
    expect(website?.status).not.toBe("PASS");
    expect(website?.status).not.toBe("FAIL");
    expect(website?.finding).toContain("site is script-rendered; nothing readable");
    expect(website?.finding.toLowerCase()).not.toContain("person not found");
    expect(website?.finding).not.toContain("No result found");

    const readable = await runPublicScreen(
      facts({ name: "Gary Barnett", applicantName: "Gary Barnett", org: "Extell", website: "https://extell.example", location: "New York, NY" }),
      async (url) => {
        if (url.includes("/team")) return { ok: true, status: 200, text: "<html><p>Gary Barnett leads Extell in New York.</p></html>" };
        if (url.includes("extell.example")) return { ok: true, status: 200, text: shell };
        return { ok: false, status: 404, text: "" };
      },
    );
    const team = readable.find((check) => check.key === "website");
    expect(team?.finding).not.toContain("site is script-rendered");
    expect(team?.finding).toContain("Name: yes");
  });

  it("searches Related Companies with and without the QA-TEST prefix", () => {
    const page = "Related Companies is based at 30 Hudson Yards in New York.";
    const prefixed = factsForSearch(
      facts({
        name: "Jeff Blau",
        applicantName: "Jeff Blau",
        email: "qa-test-related-1793031299@privatefloorclub.com",
        org: "QA-TEST Related Companies",
        location: "30 Hudson Yards, New York, NY 10001",
      }),
    );
    expect(prefixed.org).toBe("Related Companies");
    expect(prefixed.applicantName).toBe("Jeff Blau");
    expect(mentionsCompany(page, prefixed.org)).toBe(true);
    const kept = facts({
      name: "Jeff Blau",
      applicantName: "Jeff Blau",
      email: "person@gmail.com",
      org: "QA-TEST Related Companies",
      location: "30 Hudson Yards, New York, NY 10001",
    });
    expect(factsForSearch(kept).org).toBe("QA-TEST Related Companies");
    expect(mentionsCompany(page, kept.org)).toBe(false);
    expect(mentionsCompany(page, "Related Companies")).toBe(true);
  });

  it("keeps CBRE off Unum and keeps fake B2F01 and B3F01 off C", async () => {
    const rows = [
      { title: "Unum Group", ticker: "UNM", cik: "5513" },
      { title: "CBRE Group, Inc.", ticker: "CBRE", cik: "1138118" },
    ];
    expect(matchEdgarCompany(rows, "CBRE Group")?.ticker).toBe("CBRE");
    expect(matchEdgarCompany(rows, "CBRE Group")?.title).not.toMatch(/unum/i);
    clearEdgarTickerCache();
    const origin = "https://quellhaven.example";
    const checks = await collectChecks({
      network: true,
      watchlist: [{ name: "Unrelated Person", location: "Nowhere" }],
      facts: facts({
        name: "Nia Quell",
        applicantName: "Nia Quell",
        email: "pf.bench.b3f01@gmail.com",
        org: "Quellhaven Holdings",
        location: "Nowhere, ZZ",
        phone: "",
        website: origin,
        linkedinUrl: "",
        statement: "",
        inviteNote: "PF-BENCH-B3F01",
      }),
      fetchText: async (url) => {
        if (url.startsWith(origin)) return { ok: true, status: 200, text: "<html><p>Quellhaven Holdings lists no people.</p></html>" };
        if (url.includes("company_tickers")) {
          return { ok: true, status: 200, text: JSON.stringify({ "0": { title: "Unum Group", ticker: "UNM", cik_str: 5513 } }) };
        }
        return { ok: false, status: 404, text: "" };
      },
    });
    expect(checks.find((check) => check.key === "edgar")?.status).not.toBe("PASS");
    expect(checks.some((check) => check.status === "NOT_RUN" && check.corroborates)).toBe(false);
    const graded = gradeChecks(
      checks,
      facts({
        name: "Nia Quell",
        org: "Quellhaven Holdings",
        location: "Nowhere, ZZ",
        website: origin,
        statement: "",
      }),
    );
    expect(graded.letter).toBe("F");
    expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
  });
});

describe("batch 4 ordered person names", () => {
  it("requires the given name and surname in order and ignores a surname inside the company", () => {
    expect(mentionsPerson("Jason & Ashleigh Crabb ft. Corvin Brown", "Corvin Ashleigh")).toBe(false);
    expect(mentionsPerson("Ronald N. Tutor", "Ronald Tutor")).toBe(true);
    expect(mentionsPerson("Transition with Thomas M. Laird, Jr. Appointed Interim CEO of Gilbane Building Company", "Thomas Gilbane Jr.", "Gilbane Building Company")).toBe(false);
    expect(personHit("Thomas Gilbane Building Company announced a project", "Thomas Gilbane", "Gilbane Building Company")).toBe("none");
    expect(mentionsPerson("Thomas Gilbane chairs Gilbane Building Company", "Thomas Gilbane", "Gilbane Building Company")).toBe(true);
    expect(mentionsPerson("Gilbane, Thomas chairs the firm", "Thomas Gilbane")).toBe(true);
  });

  it("does not pass B3R02 news on the Laird headline or B4F01 on a split YouTube title", async () => {
    const gilbane = facts({
      name: "Thomas Gilbane Jr.",
      applicantName: "Thomas Gilbane Jr.",
      org: "Gilbane Building Company",
      location: "Providence, RI",
    });
    const news = classifyNews(
      gilbane,
      [
        {
          title: "Gilbane Building Company Announces CEO Transition with Thomas M. Laird, Jr. Appointed Interim CEO",
          snippet: "Gilbane Building Company named Thomas M. Laird, Jr. interim CEO.",
          url: "https://www.streetinsider.com/laird",
          source: "StreetInsider",
          publishedAt: "2022-01-07T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(news.some((check) => check.status === "PASS")).toBe(false);
    expect(news.some((check) => check.corroborates)).toBe(false);
    const youtube = await runPublicScreen(
      facts({
        name: "Corvin Ashleigh",
        applicantName: "Corvin Ashleigh",
        org: "Brambleton Keystone Capital Group LLC",
        location: "Charlotte, NC",
        website: "",
      }),
      async (url) =>
        url.includes("youtube.com")
          ? { ok: true, status: 200, text: '{"title":{"runs":[{"text":"Jason & Ashleigh Crabb ft. Corvin Brown | Daystar"}]}}' }
          : { ok: false, status: 404, text: "" },
    );
    const row = youtube.find((check) => check.key === "screen-youtube");
    expect(row?.finding).toContain("Name: no");
    expect(row?.status).not.toBe("PASS");
  });
});

describe("batch 4 ordered company names", () => {
  it("keeps a sibling firm from matching and still accepts the real phrase", () => {
    const sreit = "Billionaire investor Barry Sternlicht's Starwood Capital halts redemptions from Starwood Real Estate Income Trust";
    expect(mentionsCompany(sreit, "Starwood Property Trust")).toBe(false);
    expect(mentionsCompany("Inside Starwood's SREIT", "Starwood Property Trust")).toBe(false);
    expect(mentionsCompany("Starwood Property: Invest With The Best, Barry Sternlicht", "Starwood Property Trust")).toBe(true);
    expect(mentionsCompany("Douglas Durst leads the Durst Organization", "The Durst Organization")).toBe(true);
    expect(mentionsCompany("Ronald Tutor stays on at Tutor Perini's", "Tutor Perini Corporation")).toBe(true);
    expect(mentionsCompany("CBRE Group closed a Dallas sale", "CBRE Group")).toBe(true);
    expect(mentionsCompany("Unum Group raised its dividend", "CBRE Group")).toBe(false);
  });
});

describe("batch 4 bot challenges", () => {
  it("treats an HTTP 200 challenge page as not checkable and does not retry with a browser", async () => {
    const challenge = `<html><head><META NAME="robots" CONTENT="noindex,nofollow"><script src="/_Incapsula_Resource?SWUDNSAI=1"></script></head><body></body></html>`;
    expect(isBotChallenge(challenge)).toBe(true);
    const calls: string[] = [];
    const checks = await runPublicScreen(
      facts({
        name: "Barry Sternlicht",
        applicantName: "Barry Sternlicht",
        org: "Starwood Property Trust",
        website: "https://starwoodpropertytrust.example",
        location: "Miami Beach, FL",
      }),
      async (url) => {
        calls.push(url);
        if (url.includes("starwoodpropertytrust.example")) return { ok: true, status: 200, text: challenge };
        return { ok: false, status: 404, text: "" };
      },
    );
    const website = checks.find((check) => check.key === "website");
    expect(website?.status).toBe("UNAVAILABLE");
    expect(website?.status).not.toBe("PASS");
    expect(website?.status).not.toBe("FAIL");
    expect(website?.finding).toContain("The company website served a bot challenge.");
    expect(website?.finding).not.toContain("Company: no");
    expect(website?.finding).not.toContain("No result found");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(footprint?.url || "").not.toContain("starwoodpropertytrust.example");
    expect(calls.some((url) => /chrome|mozilla/i.test(url))).toBe(false);
  });

  it("still scores a readable team page when the homepage is only a challenge", async () => {
    const challenge = `<html><script src="/_Incapsula_Resource?SWUDNSAI=1"></script><body></body></html>`;
    const team = "<html><body><p>Barry Sternlicht leads Starwood Property Trust in Miami Beach.</p></body></html>";
    const checks = await runPublicScreen(
      facts({
        name: "Barry Sternlicht",
        applicantName: "Barry Sternlicht",
        org: "Starwood Property Trust",
        website: "https://starwoodpropertytrust.example",
        location: "Miami Beach, FL",
      }),
      async (url) => {
        if (url.includes("/team")) return { ok: true, status: 200, text: team };
        if (url.includes("starwoodpropertytrust.example")) return { ok: true, status: 200, text: challenge };
        return { ok: false, status: 404, text: "" };
      },
    );
    const website = checks.find((check) => check.key === "website");
    expect(website?.finding).not.toContain("bot challenge");
    expect(website?.finding).toContain("Name: yes");
    expect(website?.finding).toContain("Company: yes");
    expect(website?.status).not.toBe("UNAVAILABLE");
  });
});

describe("batch 4 company search terms", () => {
  function words(query: string): string[] {
    return query.toLowerCase().match(/[a-z0-9]+/g) || [];
  }

  function noRepeatedWord(queries: string[]) {
    for (const query of queries) {
      const tokens = words(query);
      expect(new Set(tokens).size).toBe(tokens.length);
    }
  }

  it("searches a firm word that is not the applicant's surname", async () => {
    expect(companySearchTerm("Tutor Perini Corporation", "Ronald Tutor")).toBe("perini");
    expect(companySearchTerm("Belkin Burden Goldman LLP", "Sherwin Belkin")).toBe("burden goldman");
    expect(companySearchTerm("The Durst Organization", "Douglas Durst")).toBe("organization");
    expect(companySearchTerm("Related Companies", "Stephen Ross")).toBe("related companies");

    const tutor = facts({
      name: "Ronald Tutor",
      applicantName: "Ronald Tutor",
      org: "Tutor Perini Corporation",
      location: "Sylmar, CA",
    });
    const belkin = facts({
      name: "Sherwin Belkin",
      applicantName: "Sherwin Belkin",
      org: "Belkin Burden Goldman LLP",
      location: "New York, NY",
    });
    const durst = facts({
      name: "Douglas Durst",
      applicantName: "Douglas Durst",
      org: "The Durst Organization",
      location: "New York, NY",
    });
    expect(newsSearchQueries(tutor)[0]).toBe(`"Ronald Tutor" "perini"`);
    expect(newsSearchQueries(belkin)[0]).toBe(`"Sherwin Belkin" "burden goldman"`);
    expect(newsSearchQueries(durst)[0]).toBe(`"Douglas Durst" "organization"`);
    expect(newsSearchQueries(facts({ name: "Stephen Ross", applicantName: "Stephen Ross", org: "Related Companies" }))[0]).toBe(
      `"Stephen Ross" "related companies"`,
    );
    noRepeatedWord([...newsSearchQueries(tutor), ...newsSearchQueries(belkin), ...newsSearchQueries(durst)]);

    const checks = await runPublicScreen(tutor, async () => ({ ok: false, status: 404, text: "" }));
    const youtube = checks.find((check) => check.key === "screen-youtube");
    const instagram = checks.find((check) => check.key === "screen-instagram");
    expect(decodeURIComponent(youtube?.url || "").toLowerCase()).toContain("perini");
    expect(decodeURIComponent(youtube?.url || "").toLowerCase()).not.toContain("tutor%20tutor");
    expect(youtube?.finding.toLowerCase()).toContain("perini");
    expect(decodeURIComponent(instagram?.url || "").toLowerCase()).toContain("/tags/perini");
    expect(decodeURIComponent(instagram?.url || "").toLowerCase()).not.toContain("/tags/tutor");
    expect(youtube?.finding).toContain(`"Ronald Tutor" "perini"`);
    expect(youtube?.finding.toLowerCase()).not.toContain(`"tutor" "tutor"`);
  });

  it("searches the full company phrase instead of one generic word", () => {
    expect(companySearchTerm("QA TestM Group", "QA TestM")).toBe("qa testm group");
    const queries = newsSearchQueries(
      facts({ name: "QA TestM", applicantName: "QA TestM", org: "QA TestM Group", location: "Austin, TX" }),
    );
    expect(queries.join(" ")).not.toMatch(/"group"/i);
    expect(queries[0]).toContain("qa testm group");
    const unrelated = scorePublicText("AI Test Group announces a product", {
      name: "QA TestM",
      org: "QA TestM Group",
      location: "Austin, TX",
    });
    expect(unrelated.name).toBe(false);
    expect(unrelated.company).toBe(false);
    expect(unrelated.city).toBe(false);
  });
});

describe("PaidK2 source wording", () => {
  it("names each source once and says no match found when nothing matched", () => {
    const score = "Name: no. Company: no. City: no. Confidence: none.";
    const graded = gradeChecks(
      [
        row({
          key: "screen-news",
          status: "INCONCLUSIVE",
          source: "Google News",
          finding: `News returned a public result. ${score}`,
        }),
        row({
          key: "news",
          status: "INCONCLUSIVE",
          source: "Google News, Bing News",
          finding: "The news search came back without a usable match.",
        }),
        row({
          key: "screen-youtube",
          status: "INCONCLUSIVE",
          source: "YouTube",
          finding: `YouTube returned a public result. ${score}`,
        }),
        row({
          key: "screen-tiktok",
          status: "INCONCLUSIVE",
          source: "TikTok",
          finding: `TikTok returned a public result. ${score}`,
        }),
      ],
      facts({ name: "Paid Kay", applicantName: "Paid Kay", org: "PaidK2 Holdings" }),
    );
    const text = graded.summary.couldNotCheck;
    expect(text).not.toContain("returned a public result");
    expect(text).not.toContain("came back without a usable match");
    expect(text.match(/News search/g)?.length).toBe(1);
    expect(text.match(/YouTube/g)?.length).toBe(1);
    expect(text.match(/TikTok/g)?.length).toBe(1);
    expect(text).toContain("no match found");
    expect(dedupeSourceLines(["News search: no match found. Name: no. Company: no. City: no. Confidence: none.", "News search came back without a usable match (Google News, Bing News)."])).toEqual([
      "News search: no match found. Name: no. Company: no. City: no. Confidence: none.",
    ]);
  });
});

describe("batch 4 LinkedIn directory pages", () => {
  it("does not treat a LinkedIn directory result as evidence", async () => {
    expect(isLinkedInDirectory("https://www.linkedin.com/pub/dir/Thomas/Gilbane+Jr")).toBe(true);
    expect(isLinkedInDirectory("linkedin.com › pub › dir › Thomas › Gilbane+Jr")).toBe(true);
    expect(isLinkedInDirectory("https://www.linkedin.com/in/thomas-gilbane")).toBe(false);
    const directory = `<html><body><a class="result__a" href="https://www.linkedin.com/pub/dir/Thomas/Gilbane+Jr">Thomas Gilbane Jr - Gilbane Building Company linkedin.com › pub › dir</a></body></html>`;
    const gilbane = facts({
      name: "Thomas Gilbane Jr.",
      applicantName: "Thomas Gilbane Jr.",
      org: "Gilbane Building Company",
      location: "Providence, RI",
    });
    const checks = await runPublicScreen(gilbane, async (url) => {
      if (url.includes("duckduckgo")) return { ok: true, status: 200, text: directory };
      return { ok: false, status: 404, text: "" };
    });
    const web = checks.find((check) => check.key === "screen-web");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(web?.status).not.toBe("PASS");
    expect(web?.corroborates).not.toBe(true);
    expect(footprint?.status).not.toBe("PASS");
    expect(footprint?.corroborates).not.toBe(true);

    const direct = await webFootprintCheck(gilbane, async (url) => {
      if (url.includes("duckduckgo")) return { ok: true, status: 200, text: directory };
      return { ok: false, status: 404, text: "" };
    });
    expect(direct.status).not.toBe("PASS");
    expect(direct.corroborates).not.toBe(true);
  });
});

describe("batch 4 address and company-name plausibility", () => {
  it("rejects street number 0 and a gibberish company name", async () => {
    const zero = assessLocalAddress("0 Nowhere Lane, NY 10001");
    expect(zero.kind).toBe("invalid");
    if (zero.kind === "invalid") expect(zero.finding).toContain("street number has to be 1 or higher");
    const realStreet = assessLocalAddress("1 Main Street, NY 10001");
    expect(realStreet.kind).not.toBe("invalid");
    const address = await resolveAddressCheck({
      facts: facts({ location: "0 Nowhere Lane, NY 10001" }),
      watchlist: [],
      network: false,
    });
    expect(address?.status).toBe("FAIL");
    const graded = gradeChecks(address ? [address] : [], facts({ location: "0 Nowhere Lane, NY 10001" }));
    expect(graded.categories.find((category) => category.id === "completeness")?.reason).toContain("address did not check out (0 of 2)");

    expect(companyNameLooksReal("Brambleton Keystone Capital Group")).toBe(true);
    expect(companyNameLooksReal("Keystone Construction")).toBe(true);
    expect(companyNameLooksReal("Blorptex Qwvzn Builders LLC")).toBe(false);
    const gibberish = plausibilityCheck(
      facts({ name: "Corvin Ashleigh", applicantName: "Corvin Ashleigh", org: "Blorptex Qwvzn Builders LLC" }),
    );
    expect(gibberish.status).toBe("FAIL");
    expect(gibberish.finding).toContain("does not look like real words");
    const readable = plausibilityCheck(
      facts({ name: "Corvin Ashleigh", applicantName: "Corvin Ashleigh", org: "Brambleton Keystone Capital Group" }),
    );
    expect(readable.status).toBe("PASS");

    const deadSite = {
      key: "website",
      status: "FAIL" as const,
      weight: 8,
      finding: "Searched: https://blorptex.example. domain does not resolve.",
      source: "Company website",
      url: "https://blorptex.example",
      ranAt: NOW.toISOString(),
    };
    const deadDomain = {
      key: "rdap",
      status: "FAIL" as const,
      weight: 2,
      finding: "domain does not resolve",
      source: "RDAP",
      url: "",
      ranAt: NOW.toISOString(),
    };
    const report = gradeChecks([gibberish, deadSite, deadDomain], facts({ org: "Blorptex Qwvzn Builders LLC" }));
    expect(report.summary.didNotCheckOut).not.toContain("Nothing in the checks that ran showed a direct conflict");
    expect(report.summary.didNotCheckOut.toLowerCase()).toContain("does not look like real words");
    expect(report.summary.didNotCheckOut.toLowerCase()).toContain("domain does not resolve");
    const role = report.categories.find((category) => category.id === "role");
    expect(role?.reason).toContain("0 of 8");
    expect(role?.reason).not.toContain("8 of 8");
    expect(report.summary.couldNotCheck.toLowerCase()).not.toContain("domain does not resolve");
  });
});
