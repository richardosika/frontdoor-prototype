import { describe, expect, it } from "vitest";
import { assessRdap, cardConsistencyCheck, collectChecks, inviteCheck, linkedinFormatCheck, phoneStateCheck, sanctionsCheck, TEST_WATCHLIST } from "@/lib/verify/checks";
import { assessCourts } from "@/lib/verify/courts";
import { assessEdgarMatch, clearEdgarTickerCache, lookupEdgar, matchEdgarCompany } from "@/lib/verify/edgar";
import { classifyFetchError, fetchLimits, looksLikeHtml, prepareFetchedText, userAgentFor, USER_AGENT } from "@/lib/verify/fetch";
import { applyReviewSkips, gradeChecks, type GradeReport } from "@/lib/verify/grade";
import { classifyNews } from "@/lib/verify/news";
import { assessNyRegistry, normalizeRegistryName } from "@/lib/verify/ny-registry";
import { factsForSearch } from "@/lib/verify/qa-marker";
import { distinctiveCompanyTokens, isDistinctiveCompanyToken, mentionsCompany, mentionsPerson } from "@/lib/verify/public-match";
import { scoreOf } from "@/lib/verify/score";
import { fallbackTeamUrls, runPublicScreen, sameOriginPages, serpUnusable, sitemapLastNameUrls, sitemapPersonUrls } from "@/lib/verify/screen";
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
      "example.com",
      { ok: true, status: 200, text: JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2026-06-01T00:00:00.000Z" }] }) },
      now,
    );
    expect(young?.status).toBe("INCONCLUSIVE");
    expect(young?.corroborates).toBe(false);
    expect(young?.finding).toContain("not corroboration");
    const older = assessRdap(
      "example.com",
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
    expect(website?.finding).toContain("blocked by site, ask applicant for a team-page URL");
    const silent = await runPublicScreen(
      facts({ website: "https://blackstone.example" }),
      async (url) => (url.includes("blackstone.example") ? { ok: false, status: 0, text: "" } : { ok: false, status: 403, text: "" }),
    );
    const quiet = silent.find((check) => check.key === "website");
    expect(quiet?.finding).toContain("The company website did not respond.");
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
    const rdap = assessRdap("qa-test-nonexistent.example", { ok: false, status: 404, text: "" });
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
    expect(empty.finding).toBe("no referral supplied");
    const valid = inviteCheck(facts({ inviteNote: "PF-BENCH-0000 · Benchmark invite code" }));
    expect(valid.status).toBe("PASS");
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
    expect(standard.categories.find((category) => category.id === "role")?.reason).toContain("no referral supplied (0 of 4)");
    expect(proposed.categories.find((category) => category.id === "role")?.reason).toContain("no referral supplied.");
    expect(proposed.categories.find((category) => category.id === "role")?.reason).not.toContain("0 of 4");
    expect(proposed.summary.couldNotCheck).toContain("Coverage:");
    expect(standard.score).toBeLessThan(proposed.score);
    const flagged = gradeChecks([invalid], facts({ inviteNote: "NO" }));
    expect(flagged.categories.find((category) => category.id === "role")?.reason).toContain("The invite code was supplied but is not valid (0 of 4)");
    expect(flagged.summary.didNotCheckOut).toContain("The invite code was supplied but is not valid");
  });
});
