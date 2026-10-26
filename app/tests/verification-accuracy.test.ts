import { describe, expect, it } from "vitest";
import { cardConsistencyCheck, linkedinFormatCheck, phoneStateCheck, sanctionsCheck, TEST_WATCHLIST } from "@/lib/verify/checks";
import { assessCourts } from "@/lib/verify/courts";
import { assessEdgarMatch, clearEdgarTickerCache, lookupEdgar, matchEdgarCompany } from "@/lib/verify/edgar";
import { userAgentFor, USER_AGENT } from "@/lib/verify/fetch";
import { applyReviewSkips, gradeChecks, type GradeReport } from "@/lib/verify/grade";
import { classifyNews } from "@/lib/verify/news";
import { distinctiveCompanyTokens, mentionsCompany } from "@/lib/verify/public-match";
import { scoreOf } from "@/lib/verify/score";
import { serpUnusable } from "@/lib/verify/screen";
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
    ];
    const graded = gradeChecks(checks, facts({
      website: "http://127.0.0.1/F04b/",
      linkedinUrl: "https://www.linkedin.com/in/marisol-quentin-vale",
      socialLinks: "https://example.com/marisol",
      phone: "212-555-0147",
    }));
    expect(["D", "F"]).toContain(graded.letter);
    expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
    expect(graded.attention.some((item) => /one self-reported source/i.test(item.detail) && /cannot go above a B/i.test(item.detail))).toBe(true);
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
  it("treats an out-of-area phone as inconclusive and accepts a wider match", () => {
    const mismatch = phoneStateCheck(facts({ phone: "212-555-0100", location: "Newark, NJ" }));
    expect(mismatch.status).toBe("INCONCLUSIVE");
    expect(mismatch.reviewFlag).toBeUndefined();
    expect(mismatch.finding).toContain("usually maps to");
    const charleston = phoneStateCheck(facts({ phone: "843-555-0100", location: "Charleston, SC" }));
    expect(charleston.status).toBe("PASS");
    const graded = gradeChecks([mismatch], facts({ phone: "212-555-0100", location: "Newark, NJ" }));
    expect(graded.attention.some((item) => item.title === "Phone area code is outside the stated state")).toBe(true);
  });

  it("accepts a LinkedIn URL with a query string", () => {
    const shaped = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/in/marisol-quentin-vale?trk=public_profile" }));
    expect(shaped.status).toBe("PASS");
    const nested = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/toll-brothers/about/" }));
    expect(nested.status).toBe("PASS");
    const bare = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/feed/" }));
    expect(bare.status).toBe("FAIL");
  });

  it("reports a CourtListener no-hit without calling the person cleared", () => {
    const clean = assessCourts(JSON.stringify({ results: [] }), { ok: true, status: 200 }, facts());
    expect(clean.status).toBe("PASS");
    expect(clean.weight).toBeLessThanOrEqual(2);
    expect(clean.corroborates).toBe(false);
    expect(clean.finding).toContain("No record found in CourtListener federal data");
    expect(clean.finding.toLowerCase()).toContain("not a clearance of all litigation");
    expect(clean.finding.toLowerCase()).not.toContain("cleared of all");
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
