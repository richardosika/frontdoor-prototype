import { describe, expect, it } from "vitest";
import { assessLocalAddress, zipMatchesState } from "@/lib/verify/address";
import { isReservedDomain } from "@/lib/verify/host";
import { assessRdap, cardConsistencyCheck, collectChecks, companyNameLooksReal, inviteCheck, linkedinFormatCheck, phoneStateCheck, plausibilityCheck, registryLinkCheck, resolveAddressCheck, sanctionsCheck, settleWithin, settleWithinRetry, TEST_WATCHLIST } from "@/lib/verify/checks";
import { RERUN_STATUS, rerunChecksHref } from "@/lib/rerun-checks";
import { assessStateRegistry, registryPortal, socrataRegistryUrl } from "@/lib/verify/state-registries";
import { assessCourts } from "@/lib/verify/courts";
import { assessEdgarMatch, clearEdgarTickerCache, companyFromDisplayName, edgarCompanySearchPhrase, lookupEdgar, matchEdgarCompany } from "@/lib/verify/edgar";
import { classifyFetchError, fetchLimits, looksLikeHtml, nextTimeoutMs, prepareFetchedText, userAgentFor, USER_AGENT } from "@/lib/verify/fetch";
import { applyReviewSkips, corroboratingPasses, dedupeSourceLines, gradeChecks, gradeComparisonLine, neutralScreenNewsPass, rerunAuditSummary, type GradeReport } from "@/lib/verify/grade";
import { civilDocket, classifyNews, newsSearchQueries, ordinaryResults } from "@/lib/verify/news";
import { assessNyRegistry, normalizeRegistryName } from "@/lib/verify/ny-registry";
import { factsForSearch } from "@/lib/verify/qa-marker";
import { companySearchTerm, distinctiveCompanyTokens, isDistinctiveCompanyToken, leftTheCompany, mentionsCompany, mentionsPerson, personHit, surnameForSearch } from "@/lib/verify/public-match";
import { formatRunScores, scoreOf } from "@/lib/verify/score";
import { fallbackTeamUrls, hostIsApplicant, isBotChallenge, runPublicScreen, sameOriginPages, scorePublicText, serpUnusable, sitemapLastNameUrls, sitemapPersonUrls, socialLinksFrom, surnamePageUrls, youtubeTitles } from "@/lib/verify/screen";
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
    expect(graded.score).toBeLessThan(70);
    expect(["D", "F"]).toContain(graded.letter);
    expect(graded.letter).not.toBe("C");
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
    expect(companyOnly.status).toBe("INCONCLUSIVE");
    expect(companyOnly.corroborates).toBe(false);
    expect(companyOnly.companyOnly).toBe(true);
    expect(companyOnly.finding.toLowerCase()).toContain("does not tie the person");
    const alone = gradeChecks([row({ key: "edgar", status: companyOnly.status, companyOnly: true, corroborates: false, reviewFlag: companyOnly.reviewFlag, finding: companyOnly.finding })], facts({ org: "Toll Brothers, Inc." }));
    expect(alone.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    const backed = gradeChecks(
      [
        row({ key: "edgar", status: "INCONCLUSIVE", companyOnly: true, corroborates: false, finding: companyOnly.finding }),
        row({ key: "news", status: "PASS", corroborates: true, finding: "A headline names the person and the company." }),
      ],
      facts({ org: "Toll Brothers, Inc." }),
    );
    expect(backed.categories.find((category) => category.id === "company")?.reason).toContain("EDGAR lists this exact company name");
    expect(backed.categories.find((category) => category.id === "company")?.reason).toContain("3 of 6");
    expect(backed.score - alone.score).toBe(3 + 8);
    const differentFirm = assessEdgarMatch({
      org: "Terra Group",
      person: "David Martin",
      tickersOk: true,
      companies: [{ title: "Terra Property Trust, Inc.", ticker: "TPTA", cik: "1674356" }],
      filingNames: [],
    });
    expect(differentFirm.companyOnly).not.toBe(true);
    expect(differentFirm.corroborates).toBe(false);
    const impersonation = gradeChecks(
      [
        row({ key: "edgar", status: "INCONCLUSIVE", companyOnly: true, corroborates: false, finding: "EDGAR lists Prologis, Inc. (PLD). A name-only company match is inconclusive and does not corroborate." }),
      ],
      facts({ org: "Prologis", name: "Tobias Wrenfield" }),
    );
    expect(impersonation.categories.find((category) => category.id === "company")?.earned).toBe(0);
    expect(impersonation.recommendation.startsWith("APPROVE")).toBe(false);
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

describe("a neutral screen-news pass fills an inconclusive news check", () => {
  const litigation = row({
    key: "news",
    status: "INCONCLUSIVE",
    corroborates: false,
    finding: "Company-level litigation headline. Name: no. Company: yes. City: no. Confidence: medium.",
  });
  const neutral = row({
    key: "screen-news",
    status: "PASS",
    corroborates: false,
    finding: "Starwood's Barry Sternlicht on U.S. tariff policy. Name: yes. Company: yes. City: no. Confidence: high.",
  });

  function footprintEarned(checks: CheckOutput[]): number {
    return gradeChecks(checks, facts()).categories.find((category) => category.id === "footprint")?.earned ?? -1;
  }

  it("awards the news points and does not create a second independent source", () => {
    expect(neutralScreenNewsPass([litigation, neutral])).toBe(true);
    expect(footprintEarned([litigation, neutral]) - footprintEarned([litigation])).toBe(8);
    expect(corroboratingPasses([litigation, neutral])).toHaveLength(0);
  });

  it("withholds self-reported website, card, and phone points until an independent source exists", () => {
    const selfReported = [
      row({ key: "website", status: "PASS", selfReported: true, corroborates: false, finding: "The applicant's own page names the person and the company." }),
      row({ key: "business-card", status: "PASS", selfReported: true, corroborates: false, finding: "The card names the person and the company." }),
      row({ key: "phone-state", status: "PASS", finding: "The area code fits the state." }),
      row({ key: "social-links", status: "PASS", finding: "The social links are full web addresses." }),
    ];
    const alone = gradeChecks(selfReported, facts({ phone: "212-555-0147", cardUploaded: true }));
    const company = alone.categories.find((category) => category.id === "company");
    const identity = alone.categories.find((category) => category.id === "identity");
    const footprint = alone.categories.find((category) => category.id === "footprint");
    expect(company?.reason).toContain("self-reported and no independent source");
    expect(company?.reason).toContain("0 of 8");
    expect(company?.reason).toContain("0 of 4");
    expect(identity?.reason).toContain("The phone area code is self-reported");
    expect(identity?.reason).toContain("(0 of 3)");
    expect(footprint?.reason).toContain("0 of 2");
    const backed = gradeChecks(
      [...selfReported, row({ key: "news", status: "PASS", corroborates: true, finding: "A headline names the person and the company." })],
      facts({ phone: "212-555-0147", cardUploaded: true }),
    );
    expect(backed.score - alone.score).toBe(8 + 4 + 3 + 2 + 8);
    expect(backed.categories.find((category) => category.id === "company")?.reason).toContain("8 of 8");
    expect(backed.categories.find((category) => category.id === "company")?.reason).toContain("4 of 4");
    const companyOnly = gradeChecks(
      [row({ key: "website", status: "PASS", companyOnly: true, selfReported: true, corroborates: false, finding: "company confirmed, person NOT confirmed" })],
      facts(),
    );
    expect(companyOnly.categories.find((category) => category.id === "company")?.earned).toBe(0);
    const dead = gradeChecks(
      [row({ key: "website", status: "FAIL", selfReported: true, finding: "domain does not resolve" })],
      facts(),
    );
    expect(dead.categories.find((category) => category.id === "company")?.reason).toContain("domain does not resolve");
    expect(alone.recommendation).toBe("NEEDS MORE INFO");
    expect(alone.summary.nextStep.toLowerCase()).toContain("request more info");
    expect(alone.attention.some((item) => /request more info/i.test(item.detail) && /team-page/i.test(item.detail))).toBe(true);
  });

  it("ignores a company-level or same-source screen-news row, and does not override a failed news check", () => {
    const companyLevel = row({
      key: "screen-news",
      status: "PASS",
      finding: "Company-level litigation headline. Name: yes. Company: yes.",
    });
    const sameSource = row({
      key: "screen-news",
      status: "PASS",
      finding: "same source as the company site. Name: yes. Company: yes.",
    });
    expect(footprintEarned([litigation, companyLevel])).toBe(footprintEarned([litigation]));
    expect(footprintEarned([litigation, sameSource])).toBe(footprintEarned([litigation]));
    const failed = row({ key: "news", status: "FAIL", finding: "A negative headline names the person and the company." });
    expect(footprintEarned([failed, neutral])).toBe(0);
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
    expect(result.status).toBe("INCONCLUSIVE");
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

  it("matches SL Green Realty to its own filer and not the shortest title", () => {
    const listed = [
      { title: "GREEN DOT CORP", ticker: "GDOT", cik: "1386278" },
      { title: "SL GREEN REALTY CORP", ticker: "SLG", cik: "1040971" },
      { title: "CBRE GROUP, INC.", ticker: "CBRE", cik: "1138118" },
      { title: "ARBOR REALTY TRUST, INC.", ticker: "ABR", cik: "1253986" },
      { title: "STARWOOD PROPERTY TRUST, INC.", ticker: "STWD", cik: "1465128" },
      { title: "LADDER CAPITAL CORP", ticker: "LADR", cik: "1577670" },
      { title: "TUTOR PERINI CORP", ticker: "TPC", cik: "77543" },
      { title: "NEWMARK GROUP, INC.", ticker: "NMRK", cik: "1690680" },
      { title: "Madison Air Solutions Corp", ticker: "MAIR", cik: "2098430" },
    ];
    expect(matchEdgarCompany(listed, "SL Green Realty Corp")?.cik).toBe("1040971");
    expect(matchEdgarCompany(listed, "SL Green")?.cik).toBe("1040971");
    expect(matchEdgarCompany(listed, "SL Green Realty Corp")?.ticker).not.toBe("GDOT");
    expect(matchEdgarCompany(listed, "SL Green")?.ticker).not.toBe("GDOT");
    expect(matchEdgarCompany(listed, "CBRE Group, Inc.")?.cik).toBe("1138118");
    expect(matchEdgarCompany(listed, "Arbor Realty Trust")?.cik).toBe("1253986");
    expect(matchEdgarCompany(listed, "Starwood Property Trust")?.cik).toBe("1465128");
    expect(matchEdgarCompany(listed, "Ladder Capital")?.cik).toBe("1577670");
    expect(matchEdgarCompany(listed, "Tutor Perini")?.cik).toBe("77543");
    expect(matchEdgarCompany(listed, "Newmark Group")?.cik).toBe("1690680");
    expect(matchEdgarCompany(listed, "Madison Realty Capital")).toBeNull();
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
    expect(kennedy.status).toBe("INCONCLUSIVE");
    expect(kennedy.corroborates).toBe(false);
    expect(kennedy.finding).toContain("Kennedy-Wilson Holdings");
    expect(kennedy.finding.toLowerCase()).not.toContain("unum");
    expect(kennedy.finding).toContain("does not tie the person");
    expect(kennedy.url).toContain("1408100");
    clearEdgarTickerCache();
    const cbre = await lookupEdgar("CBRE Group", "Bob Sulentic", fetchText);
    expect(cbre.status).toBe("INCONCLUSIVE");
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

describe("a third-party page that mentions the domain stays third-party", () => {
  it("does not mark a LinkedIn result self-reported because the snippet names the company domain", async () => {
    expect(hostIsApplicant("https://www.linkedin.com/in/harris-freidus", "paulweiss.com")).toBe(false);
    expect(hostIsApplicant("https://www.paulweiss.com/professionals/harris-b-freidus", "paulweiss.com")).toBe(true);
    const checks = await runPublicScreen(
      facts({
        name: "Harris Freidus",
        applicantName: "Harris Freidus",
        org: "Paul Weiss",
        website: "https://www.paulweiss.com",
        location: "New York, NY",
      }),
      async (url) => {
        if (url.includes("duckduckgo.com")) {
          return {
            ok: true,
            status: 200,
            text: `<a class="result__a" href="https://www.linkedin.com/in/harris-freidus">Harris Freidus of Paul Weiss, paulweiss.com, New York</a>`,
          };
        }
        if (url.includes("paulweiss.com")) return { ok: true, status: 200, text: "<html><p>Paul Weiss is a law firm in New York.</p></html>" };
        return { ok: false, status: 403, text: "" };
      },
    );
    const search = checks.find((check) => check.key === "screen-web");
    expect(search?.status).toBe("PASS");
    expect(search?.selfReported).not.toBe(true);
    expect(search?.corroborates).toBe(true);
    expect(search?.finding).toContain("paulweiss.com");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(footprint?.selfReported).not.toBe(true);
    expect(footprint?.corroborates).toBe(true);
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

  it("reads an attorney bio from a sitemap surname URL and from a nested our-people link", async () => {
    const bio = "<html><body><p>Stephen Meister is a co-founder of Meister Seelig & Schuster in New York.</p></body></html>";
    const xml = `<urlset><url><loc>https://meisterseelig.example/associated_attorney/stephen-b-meister/</loc></url><url><loc>https://meisterseelig.example/our-people/partners/stephen-b-meister/</loc></url></urlset>`;
    expect(sitemapPersonUrls(xml, "https://meisterseelig.example", "Meister")).toEqual([
      "https://meisterseelig.example/associated_attorney/stephen-b-meister/",
      "https://meisterseelig.example/our-people/partners/stephen-b-meister/",
    ]);
    const directory = `<html><body><a href="/our-people/partners/stephen-b-meister/">Stephen B. Meister</a></html>`;
    expect(surnamePageUrls(directory, "https://meisterseelig.example/our-people/", "Meister")).toEqual([
      "https://meisterseelig.example/our-people/partners/stephen-b-meister/",
    ]);
    const home = `<html><body><p>Meister Seelig & Schuster is a New York law firm.</p></body></html>`;
    const checks = await runPublicScreen(
      facts({
        name: "Stephen Meister",
        applicantName: "Stephen Meister",
        org: "Meister Seelig & Schuster PLLC",
        website: "https://meisterseelig.example",
        location: "New York, NY",
      }),
      async (url) => {
        if (url === "https://meisterseelig.example/sitemap.xml") {
          return {
            ok: true,
            status: 200,
            text: `<sitemapindex><sitemap><loc>https://meisterseelig.example/page-sitemap.xml</loc></sitemap></sitemapindex>`,
          };
        }
        if (url.endsWith("/page-sitemap.xml")) return { ok: true, status: 200, text: xml };
        if (url.includes("/associated_attorney/stephen-b-meister")) return { ok: true, status: 200, text: bio };
        if (url === "https://meisterseelig.example" || url === "https://meisterseelig.example/") return { ok: true, status: 200, text: home };
        if (url.includes("/our-people") && !url.includes("stephen-b-meister")) return { ok: true, status: 200, text: directory };
        return { ok: false, status: 404, text: "" };
      },
    );
    const website = checks.find((check) => check.key === "website");
    expect(website?.status).toBe("PASS");
    expect(website?.finding).toContain("Name: yes");
    expect(website?.url).toMatch(/stephen-b-meister/);
    expect(website?.corroborates).toBe(false);
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

  it("keeps a team link when the head is longer than the cap", async () => {
    const html = `<!doctype html><html><head>${"m".repeat(200_001)}</head><body><a href="/about/leadership">Leadership</a></body></html>`;
    const prepared = prepareFetchedText(html, 180_000);
    expect(prepared.length).toBeLessThanOrEqual(180_000);
    expect(prepared).toContain("/about/leadership");
    expect(prepared.includes("m".repeat(1000))).toBe(false);
    const checks = await runPublicScreen(
      facts({
        name: "Jane Roe",
        applicantName: "Jane Roe",
        org: "Zorblax Holdings",
        website: "https://zorblax.example",
        location: "Austin, TX",
      }),
      async (url) => {
        if (url === "https://zorblax.example" || url === "https://zorblax.example/") return { ok: true, status: 200, text: prepared };
        if (url === "https://zorblax.example/about/leadership") {
          return { ok: true, status: 200, text: "<html><body><p>Jane Roe leads Zorblax Holdings.</p></body></html>" };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const website = checks.find((check) => check.key === "website");
    expect(website?.finding).toContain("Name: yes");
    expect(website?.url).toBe("https://zorblax.example/about/leadership");
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
      "https://firm.example/attorney",
      "https://firm.example/lawyers",
      "https://firm.example/our-people",
      "https://firm.example/associated_attorney",
      "https://firm.example/people",
      "https://firm.example/leadership",
      "https://firm.example/our-team",
      "https://firm.example/team",
      "https://firm.example/about",
      "https://firm.example/about/leadership",
      "https://firm.example/about/executive-management",
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
      expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(0);
      expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("self-reported and no independent source");
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
    expect(company?.reason).toContain("self-reported and no independent source");
    expect(company?.reason).toContain("0 of 8");
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
    expect(companyOnly.categories.find((category) => category.id === "company")?.earned).toBe(0);
    const companyOnlyWithNews = gradeChecks(
      [
        row({ key: "website", status: "PASS", companyOnly: true, selfReported: true, corroborates: false, finding: "company confirmed, person NOT confirmed" }),
        row({ key: "news", status: "PASS", corroborates: true, finding: "One headline names the person and the company." }),
      ],
      facts({ org: "Turner Construction Company" }),
    );
    expect(companyOnlyWithNews.categories.find((category) => category.id === "company")?.earned).toBe(4);
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
      expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("0 of 8");
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
    expect(rdap?.reviewFlag).toBe(true);
    expect(rdap?.finding.toLowerCase()).toContain("not registered");
    expect(rdap?.finding).not.toContain("domain does not resolve");
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
    expect(dead?.reviewFlag).toBe(true);
    expect(dead?.finding).toContain("domain is not registered");
    expect(dead?.finding).not.toContain("domain does not resolve");
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

  it("does not cap a company-only civil docket or an ordinary results headline, and still flags fraud and sanctions", () => {
    const providers = [{ name: "Google News", state: "responded" as const }];
    const sciame = classifyNews(
      facts({ name: "Frank Sciame", applicantName: "Frank Sciame", org: "Sciame Construction", location: "New York, NY" }),
      [
        {
          title: "Marco Antonio Zumba v. Sciame Construction, LLC",
          snippet: "A law.com Radar civil docket names the company.",
          url: "https://www.law.com/radar/zumba",
          source: "Law.com",
          publishedAt: "2025-08-04T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(sciame[0].status).not.toBe("FAIL");
    expect(sciame[0].reviewFlag).toBeUndefined();
    expect(sciame[0].finding).toContain("Company-level litigation");
    expect(sciame[1].finding).toContain("Company litigation");
    const sciameGrade = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "edgar", status: "PASS", corroborates: true }),
        row({ key: "web-footprint", status: "PASS", corroborates: true }),
        ...sciame,
      ],
      facts({ name: "Frank Sciame", applicantName: "Frank Sciame", org: "Sciame Construction", location: "New York, NY" }),
    );
    expect(sciameGrade.caps.some((line) => /doubtful hit/i.test(line))).toBe(false);
    expect(sciameGrade.attention.some((item) => item.title === "Company litigation headline")).toBe(true);

    const arbor = classifyNews(
      facts({ name: "Ivan Kaufman", applicantName: "Ivan Kaufman", org: "Arbor Realty Trust", location: "Uniondale, NY" }),
      [
        {
          title: "Arbor Realty Trust targets $250M-$300M REO by end of 2026 as it resets quarterly dividend to $0.17",
          snippet: "The lender reset its dividend and discussed REO, a loss, and a downgrade.",
          url: "https://seekingalpha.com/news/4590064",
          source: "Seeking Alpha",
          publishedAt: "2026-05-08T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(arbor[0].status).not.toBe("FAIL");
    expect(arbor[0].reviewFlag).toBeUndefined();
    expect(arbor[0].finding).not.toContain("Negative coverage");
    expect(arbor[0].finding).not.toContain("Company-level litigation");
    const arborGrade = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "news", status: "PASS", corroborates: true }),
        ...arbor,
      ],
      facts({ name: "Ivan Kaufman", applicantName: "Ivan Kaufman", org: "Arbor Realty Trust", location: "Uniondale, NY" }),
    );
    expect(arborGrade.caps.some((line) => /doubtful hit/i.test(line))).toBe(false);

    const named = classifyNews(
      facts({ name: "Frank Sciame", applicantName: "Frank Sciame", org: "Sciame Construction", location: "New York, NY" }),
      [
        {
          title: "Frank Sciame sued over a Sciame Construction job site",
          snippet: "The civil complaint names Frank Sciame.",
          url: "https://example.com/sciame-named",
          source: "Law.com",
          publishedAt: "2026-05-08T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(named[0].status).toBe("FAIL");
    expect(named[0].reviewFlag).toBe(true);
    const namedGrade = gradeChecks(
      [
        row({ key: "email-syntax", status: "PASS" }),
        row({ key: "disposable-email", status: "PASS" }),
        row({ key: "role-address", status: "PASS" }),
        row({ key: "phone-state", status: "PASS" }),
        row({ key: "linkedin-format", status: "PASS" }),
        row({ key: "linkedin-fetch", status: "PASS", corroborates: true }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "edgar", status: "PASS", corroborates: true }),
        row({ key: "web-footprint", status: "PASS", corroborates: true }),
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "text-risk", status: "PASS" }),
        row({ key: "velocity", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "invite-source", status: "PASS" }),
        ...named,
      ],
      facts({
        name: "Frank Sciame",
        applicantName: "Frank Sciame",
        org: "Sciame Construction",
        location: "New York, NY",
        phone: "212-555-0148",
        website: "https://sciame.com",
        linkedinUrl: "https://www.linkedin.com/company/f.j.-sciame-construction-inc./",
      }),
    );
    expect(namedGrade.score).toBeGreaterThanOrEqual(60);
    expect(namedGrade.letter).toBe("D");
    expect(namedGrade.caps.some((line) => /doubtful hit/i.test(line))).toBe(true);

    const fraud = classifyNews(
      facts({ name: "Ivan Kaufman", applicantName: "Ivan Kaufman", org: "Arbor Realty Trust", location: "Uniondale, NY" }),
      [
        {
          title: "SEC charges Ivan Kaufman and Arbor Realty Trust",
          snippet: "A criminal charge was described with the fraud allegation.",
          url: "https://example.com/arbor-fraud",
          source: "Court Desk",
          publishedAt: "2026-05-09T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(fraud[0].status).toBe("FAIL");
    expect(fraud[0].reviewFlag).toBe(true);
    expect(fraud[0].finding).toContain("fraud, sanctions, or a criminal charge");

    const ofac = gradeChecks(
      [
        row({
          key: "sanctions",
          status: "FAIL",
          hardFlag: true,
          finding: "Watchlist name match on Ivan Kaufman and the application location lines up with New York.",
        }),
      ],
      facts({ name: "Ivan Kaufman", org: "Arbor Realty Trust", location: "Uniondale, NY" }),
    );
    expect(ofac.letter).toBe("F");
    expect(ofac.caps.some((line) => line.startsWith("Capped at F"))).toBe(true);
  });

  it("accepts an ampersand, a percent-encoded slug, or a dot in a LinkedIn company slug", () => {
    const ampersand = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/cushman-&-wakefield/" }));
    const encoded = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/cushman-%26-wakefield/" }));
    const dotted = linkedinFormatCheck(facts({ linkedinUrl: "https://www.linkedin.com/company/f.j.-sciame-construction-inc./" }));
    expect(ampersand.status).toBe("PASS");
    expect(encoded.status).toBe("PASS");
    expect(dotted.status).toBe("PASS");
    expect(dotted.reviewFlag).not.toBe(true);
    expect(dotted.finding).toContain("public profile shape");
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

describe("batch 6 name, redirect, and departure", () => {
  it("does not corroborate a name and city when the company is absent", async () => {
    const checks = await runPublicScreen(
      facts({
        name: "Jane Roe",
        applicantName: "Jane Roe",
        org: "Zorblax Holdings",
        location: "New York, NY",
        website: "https://zorblax.example",
      }),
      async (url) => {
        if (url.startsWith("https://zorblax.example")) {
          return { ok: true, status: 200, text: "<html><body><p>Jane Roe works in New York.</p></body></html>" };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const website = checks.find((check) => check.key === "website");
    expect(website?.status).toBe("INCONCLUSIVE");
    expect(website?.status).not.toBe("PASS");
    expect(website?.corroborates).not.toBe(true);
    expect(website?.reviewFlag).toBe(true);
    expect(website?.finding).toContain("name found, company not named");
  });

  it("records a renamed firm as a review-only alias and leaves a 403 unchanged", async () => {
    const renamed = await runPublicScreen(
      facts({
        name: "Jane Roe",
        applicantName: "Jane Roe",
        org: "Kramer Levin",
        website: "https://kramerlevin.example",
        location: "New York, NY",
      }),
      async (url) => {
        if (url.startsWith("https://kramerlevin.example")) {
          return {
            ok: true,
            status: 200,
            url: "https://www.hsfkramer.example/",
            text: "<html><body><p>HSF Kramer is a law firm.</p></body></html>",
          };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const website = renamed.find((check) => check.key === "website");
    expect(website?.status).toBe("INCONCLUSIVE");
    expect(website?.status).not.toBe("PASS");
    expect(website?.corroborates).not.toBe(true);
    expect(website?.reviewFlag).toBe(true);
    expect(website?.finding).toContain("https://www.hsfkramer.example/");
    expect(website?.finding.toLowerCase()).toContain("review-only alias");
    expect(website?.finding.toLowerCase()).not.toContain("possible match");

    const stillNamed = await runPublicScreen(
      facts({
        name: "Jane Roe",
        applicantName: "Jane Roe",
        org: "Kramer Levin",
        website: "https://kramerlevin.example",
        location: "New York, NY",
      }),
      async (url) => {
        if (url.startsWith("https://kramerlevin.example")) {
          return {
            ok: true,
            status: 200,
            url: "https://www.hsfkramer.example/",
            text: "<html><body><p>Jane Roe is a partner at Kramer Levin.</p></body></html>",
          };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const kept = stillNamed.find((check) => check.key === "website");
    expect(kept?.status).toBe("PASS");
    expect(kept?.corroborates).not.toBe(true);
    expect(kept?.finding).toContain("https://www.hsfkramer.example/");
    expect(kept?.finding).toContain("Name: yes");
    expect(kept?.finding.toLowerCase()).not.toContain("review-only alias");

    const blocked = await runPublicScreen(
      facts({ org: "Kramer Levin", website: "https://kramerlevin.example" }),
      async () => ({ ok: false, status: 403, url: "https://www.hsfkramer.example/", text: "denied" }),
    );
    const denied = blocked.find((check) => check.key === "website");
    expect(denied?.status).toBe("UNAVAILABLE");
    expect(denied?.finding).toContain("blocked by site (403) — not checkable for free; ask applicant for a team-page URL");
    expect(denied?.finding).toContain("https://www.hsfkramer.example/");
    expect(denied?.finding).toContain("The new domain is hsfkramer.example");
    expect(denied?.url).toContain("hsfkramer.example");
    expect(denied?.finding.toLowerCase()).toContain("review-only alias");
  });

  it("treats taking a step back as a departure and not current employment", () => {
    expect(leftTheCompany("Richard LeFrak is taking a step back at LeFrak", "LeFrak")).toBe(true);
    const news = classifyNews(
      facts({ name: "Richard LeFrak", applicantName: "Richard LeFrak", org: "LeFrak", location: "New York, NY" }),
      [
        {
          title: "Richard LeFrak is taking a step back at LeFrak",
          snippet: "Richard LeFrak is taking a step back at LeFrak.",
          url: "https://example.com/lefrak",
          source: "Trade Desk",
          publishedAt: "2026-06-01T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(news[0].status).toBe("INCONCLUSIVE");
    expect(news[0].status).not.toBe("PASS");
    expect(news[0].corroborates).not.toBe(true);
    expect(news[0].reviewFlag).toBe(true);
    expect(news[0].finding.toLowerCase()).toContain("may no longer be at");
    expect(news[0].finding.toLowerCase()).not.toContain("possible match");
  });
});

describe("batch 7 firm names, news links, and crawl budget", () => {
  const providers = [{ name: "Google News", state: "responded" as const }];

  it("keeps Mack as the brand and does not match LEAD REAL ESTATE or a brother's estate", () => {
    expect(isDistinctiveCompanyToken("mack")).toBe(true);
    for (const word of ["real", "estate", "trust", "usa"]) expect(isDistinctiveCompanyToken(word)).toBe(false);
    expect(distinctiveCompanyTokens("Mack Real Estate Group")).toEqual(["mack"]);
    expect(companySearchTerm("Mack Real Estate Group", "Richard Mack")).toBe("mack real estate group");
    const queries = newsSearchQueries(
      facts({ name: "Richard Mack", applicantName: "Richard Mack", org: "Mack Real Estate Group", location: "New York, NY" }),
    );
    expect(queries[0]).toContain("mack real estate group");
    expect(queries.join(" ")).not.toMatch(/"estate"/);
    expect(companySearchTerm("BK Real Estate Advisors", "Bob Knakal")).toBe("bk real estate");
    expect(companySearchTerm("SL Green Realty Corp", "Marc Holliday")).toBe("sl green realty");
    expect(companySearchTerm("SL Green", "Marc Holliday")).toBe("sl green");
    expect(companySearchTerm("CBRE Group", "Bob Sulentic")).toBe("cbre");
    expect(companySearchTerm("Starwood Property Trust", "Barry Sternlicht")).toBe("starwood");
    expect(
      newsSearchQueries(facts({ name: "Bob Knakal", applicantName: "Bob Knakal", org: "BK Real Estate Advisors", location: "New York, NY" }))[0],
    ).toBe(`"Bob Knakal" "bk real estate"`);
    expect(
      newsSearchQueries(facts({ name: "Marc Holliday", applicantName: "Marc Holliday", org: "SL Green Realty Corp" }))[0],
    ).toBe(`"Marc Holliday" "sl green realty"`);
    expect(mentionsCompany("BK Real Estate Advisors hired a broker in New York", "BK Real Estate Advisors")).toBe(true);
    expect(mentionsCompany("SL Green Realty sold a tower", "SL Green Realty Corp")).toBe(true);
    expect(mentionsCompany("advisors met in New York", "BK Real Estate Advisors")).toBe(false);

    expect(mentionsCompany("Mack Real Estate Group bought a site", "Mack Real Estate Group")).toBe(true);
    expect(mentionsCompany("Mack Real Estate Group names Priyanka Garg president", "Mack Real Estate Group")).toBe(true);
    expect(mentionsCompany("Richard Mack founded Mack Real Estate Group", "Mack Real Estate Group", "Richard Mack")).toBe(true);
    expect(mentionsCompany("Richard Mack's brother's estate is tied to fraud", "Mack Real Estate Group", "Richard Mack")).toBe(false);
    expect(mentionsCompany("debt to brother's estate reeks of fraud", "Mack Real Estate Group")).toBe(false);

    const founders = "The firm was founded by William, Richard and Stephen Mack.";
    expect(mentionsPerson(founders, "William Mack")).toBe(true);
    expect(mentionsPerson(founders, "Richard Mack")).toBe(true);
    expect(mentionsPerson(founders, "Stephen Mack")).toBe(true);
    expect(mentionsPerson("Jason & Ashleigh Crabb ft. Corvin Brown", "Corvin Ashleigh")).toBe(false);
    expect(mentionsPerson("A page-turner for Jane.", "Jane Turner")).toBe(false);

    const rows = [
      { title: "LEAD REAL ESTATE CO", ticker: "LRE", cik: "1888980" },
      { title: "ARBOR REALTY TRUST INC", ticker: "ABR", cik: "1253986" },
      { title: "STARWOOD PROPERTY TRUST, INC.", ticker: "STWD", cik: "1465128" },
    ];
    expect(matchEdgarCompany(rows, "Mack Real Estate Group")).toBeNull();
    expect(matchEdgarCompany(rows, "Arbor Realty Trust")?.cik).toBe("1253986");
    expect(matchEdgarCompany(rows, "Starwood Property Trust")?.cik).toBe("1465128");

    const brother = classifyNews(
      facts({ name: "Richard Mack", applicantName: "Richard Mack", org: "Mack Real Estate Group", location: "New York, NY" }),
      [
        {
          title: "A brother's estate and a fraud case",
          snippet: "The dispute is about a relative's estate, not this firm.",
          url: "https://example.com/brother-estate",
          source: "Local",
          publishedAt: "2024-03-01T15:00:00.000Z",
          provider: "Google News",
        },
        {
          title: "The Real Deal: Mack Real Estate Group foreclosure in 2024",
          snippet: "A foreclosure names Mack Real Estate Group. The applicant is not in the story.",
          url: "https://therealdeal.com/2024/mack-foreclosure",
          source: "The Real Deal",
          publishedAt: "2024-06-01T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(brother[0].status).toBe("INCONCLUSIVE");
    expect(brother[0].status).not.toBe("FAIL");
    expect(brother[0].reviewFlag).toBeUndefined();
    expect(brother[0].url).toBe("https://therealdeal.com/2024/mack-foreclosure");
    expect(brother[0].finding).toContain("Company-level litigation");
    const graded = gradeChecks(
      [
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "website", status: "PASS", corroborates: true }),
        row({ key: "edgar", status: "PASS", corroborates: true }),
        row({ key: "web-footprint", status: "PASS", corroborates: true }),
        row({ key: "news", status: "PASS", corroborates: true }),
        ...brother,
      ],
      facts({ name: "Richard Mack", applicantName: "Richard Mack", org: "Mack Real Estate Group", location: "New York, NY" }),
    );
    expect(graded.caps.some((line) => /doubtful hit/i.test(line))).toBe(false);
    expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(true);
  });

  it("points a failing news check at the negative headline", () => {
    const news = classifyNews(
      facts({ name: "Frank Sciame", applicantName: "Frank Sciame", org: "Sciame Construction", location: "New York, NY" }),
      [
        {
          title: "Frank Sciame leads Sciame Construction",
          snippet: "Frank Sciame leads Sciame Construction in New York.",
          url: "https://example.com/neutral",
          source: "Desk",
          publishedAt: "2026-01-01T15:00:00.000Z",
          provider: "Google News",
        },
        {
          title: "Frank Sciame sued over a Sciame Construction job site",
          snippet: "The civil complaint names Frank Sciame.",
          url: "https://example.com/negative",
          source: "Law.com",
          publishedAt: "2026-05-01T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(news[0].status).toBe("FAIL");
    expect(news[0].url).toBe("https://example.com/negative");
  });

  it("judges the same Vornado and Avison Young headlines in news and screen-news", async () => {
    const vornado = facts({
      name: "Steven Roth",
      applicantName: "Steven Roth",
      org: "Vornado Realty Trust",
      location: "New York, NY",
      website: "",
      linkedinUrl: "",
    });
    expect(mentionsCompany("The family trust opened a fund", "Vornado Realty Trust")).toBe(false);
    expect(mentionsCompany("Vornado Realty Trust leased a tower", "Vornado Realty Trust")).toBe(true);
    expect(mentionsCompany("A young broker changed firms", "Avison Young")).toBe(false);
    expect(mentionsCompany("Avison Young hired a broker", "Avison Young")).toBe(true);

    const foreclosure = "Vornado Realty Trust faces foreclosure, The Real Deal";
    const neutral = "Steven Roth leads Vornado Realty Trust";
    const rss = `<rss><channel><title>News</title><item><title>${neutral}</title><link>https://example.com/vornado-neutral</link></item><item><title>${foreclosure}</title><link>https://therealdeal.com/vornado-foreclosure</link></item></channel></rss>`;
    const judged = classifyNews(
      vornado,
      [
        { title: neutral, snippet: neutral, url: "https://example.com/vornado-neutral", source: "Desk", publishedAt: "2026-02-01T15:00:00.000Z", provider: "Google News" },
        { title: foreclosure, snippet: foreclosure, url: "https://therealdeal.com/vornado-foreclosure", source: "The Real Deal", publishedAt: "2024-06-01T15:00:00.000Z", provider: "Google News" },
      ],
      providers,
      NOW,
    );
    const checks = await runPublicScreen(vornado, async (url) => {
      if (url.includes("news.google.com")) return { ok: true, status: 200, text: rss };
      return { ok: false, status: 404, text: "" };
    });
    const screen = checks.find((check) => check.key === "screen-news");
    expect(judged[0].status).toBe("INCONCLUSIVE");
    expect(judged[0].finding).toContain("Company-level litigation");
    expect(judged[0].url).toBe("https://therealdeal.com/vornado-foreclosure");
    expect(screen?.status).toBe(judged[0].status);
    expect(screen?.corroborates).not.toBe(true);
    expect(judged[0].corroborates).not.toBe(true);
    expect(screen?.finding).toContain("Company-level litigation");
    expect(screen?.url).toBe("https://therealdeal.com/vornado-foreclosure");
  });

  it("treats a TLD with no RDAP service as unavailable and an unregistered domain as a company finding", () => {
    const unsupported = assessRdap("mackreg.us", { ok: false, status: 404, text: '{"description":["No RDAP servers found for us"]}' });
    expect(unsupported?.status).toBe("UNAVAILABLE");
    expect(unsupported?.finding.toLowerCase()).toContain("couldn't check for free");
    expect(unsupported?.finding).not.toContain("domain does not resolve");

    const unregistered = assessRdap("not-a-real-firm.com", {
      ok: false,
      status: 404,
      text: '{"errorCode":404,"description":["The requested domain was not found"]}',
    });
    expect(unregistered?.status).toBe("FAIL");
    expect(unregistered?.reviewFlag).toBe(true);
    expect(unregistered?.finding.toLowerCase()).toContain("not registered");
    expect(unregistered?.finding).not.toContain("domain does not resolve");
    const graded = gradeChecks([unregistered!], facts({ website: "https://not-a-real-firm.com", org: "Not A Real Firm" }));
    expect(graded.summary.didNotCheckOut.toLowerCase()).toContain("not registered");
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("domain is not registered (0 of 2)");
  });

  it("does not re-credit a LinkedIn URL the fetch check already passed", async () => {
    const linkedin = "https://www.linkedin.com/company/f.j.-sciame-construction-inc./";
    const checks = await runPublicScreen(
      facts({
        name: "Frank Sciame",
        applicantName: "Frank Sciame",
        org: "Sciame Construction",
        location: "New York, NY",
        website: "",
        linkedinUrl: linkedin,
      }),
      async (url) => {
        if (url.includes("linkedin.com/company")) return { ok: true, status: 200, text: "Frank Sciame leads Sciame Construction in New York" };
        if (url.includes("duckduckgo")) {
          return {
            ok: true,
            status: 200,
            text: `<a class="result__a" href="${linkedin}">Frank Sciame leads Sciame Construction in New York</a><a class="result__a" href="https://community.solutions/about-us/the-team/frank-sciame/">Frank Sciame leads Sciame Construction in New York</a>`,
          };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const fetched = checks.find((check) => check.key === "linkedin-fetch");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(fetched?.status).toBe("PASS");
    expect(fetched?.corroborates).toBe(true);
    expect(footprint?.url || "").not.toContain("linkedin.com/company/f.j.-sciame");
    expect(footprint?.url).toContain("community.solutions");
    expect(footprint?.corroborates).toBe(true);

    const repeated = await runPublicScreen(
      facts({
        name: "Frank Sciame",
        applicantName: "Frank Sciame",
        org: "Sciame Construction",
        location: "New York, NY",
        website: "",
        linkedinUrl: linkedin,
      }),
      async (url) => {
        if (url.includes("linkedin.com/company")) return { ok: true, status: 200, text: "Frank Sciame leads Sciame Construction in New York" };
        if (url.includes("duckduckgo")) {
          return { ok: true, status: 200, text: `<a class="result__a" href="${linkedin}">Frank Sciame leads Sciame Construction in New York</a>` };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const again = repeated.find((check) => check.key === "web-footprint");
    expect(again?.status).toBe("INCONCLUSIVE");
    expect(again?.corroborates).not.toBe(true);
    expect(again?.finding).toContain("same source as linkedin-fetch");
  });

  it("spends the crawl budget on leadership pages and reads escaped JSON paths", () => {
    const home = [
      `<a href="/asset-management">Assets</a>`,
      `<a href="/property-management">Property</a>`,
      `<a href="/investment-management">Investments</a>`,
      `<a href="/facility-management">Facilities</a>`,
      `<a href="/leadership">Leaders</a>`,
      `<a href="/about">About</a>`,
      `<script>{"url":"https:\\/\\/firm.example\\/about\\/leadership"}</script>`,
    ].join("");
    expect(sameOriginPages(home, "https://firm.example/")).toEqual([
      "https://firm.example/leadership",
      "https://firm.example/about/leadership",
      "https://firm.example/about",
    ]);
    expect(fetchLimits("https://firm.example/sitemap.xml").maxChars).toBeGreaterThan(180_000);
    expect(fetchLimits("https://firm.example/about").maxChars).toBe(180_000);
  });

  it("keeps the id on a Facebook people URL", () => {
    const html = `<a href="https://www.facebook.com/people/Richard-Mack/100063921/">Mack</a><a href="https://www.facebook.com/mackrealestate/">Page</a>`;
    const links = socialLinksFrom(html);
    expect(links.find((link) => link.url.includes("/people/"))?.url).toBe("https://www.facebook.com/people/Richard-Mack/100063921/");
    expect(links.some((link) => link.url === "https://www.facebook.com/mackrealestate/")).toBe(true);
  });
});

describe("thirteenth follow-up", () => {
  it("keeps YouTube titles and JSON paths that used to be stripped with the script", () => {
    const youtube = `<html><body><script>var ytInitialData = {"title":{"runs":[{"text":"Steven Roth at Vornado Realty Trust"}]}};</script><p>Search filters</p></body></html>`;
    const prepared = prepareFetchedText(youtube, 1_200_000);
    expect(prepared).not.toContain("<script");
    expect(youtubeTitles(prepared)).toContain("Steven Roth at Vornado Realty Trust");
    expect(youtubeTitles(youtube.replace(/<script[\s\S]*?<\/script>/gi, ""))).toEqual([]);

    const nav = `<html><script>{"url":"https:\\/\\/www.avisonyoung.us\\/w\\/james-nelson","href":"\\/about\\/leadership"}</script><p>Avison Young</p></html>`;
    const page = prepareFetchedText(nav, 180_000);
    expect(page).toContain("/w/james-nelson");
    expect(page).toContain("/about/leadership");
    expect(sameOriginPages(page, "https://www.avisonyoung.us/")).toContain("https://www.avisonyoung.us/about/leadership");
    expect(surnamePageUrls(page, "https://www.avisonyoung.us/", "Nelson")).toContain("https://www.avisonyoung.us/w/james-nelson");
  });

  it("treats a legal suffix as the company on an unpunctuated card and accepts PLLC", () => {
    expect(mentionsCompany("Torcon Inc builds in Red Bank", "Torcon Inc")).toBe(true);
    expect(mentionsCompany("Joseph Torcivia, Torcon Inc, Red Bank", "Torcon Inc")).toBe(true);
    expect(mentionsCompany("Joseph Torcivia Torcon Inc Red Bank, NJ", "Torcon Inc")).toBe(true);
    const card = cardConsistencyCheck(facts({
      name: "Joseph Torcivia",
      org: "Torcon Inc",
      cardText: "Joseph Torcivia Torcon Inc Red Bank, NJ",
    }));
    expect(card.status).toBe("PASS");
    expect(card.reviewFlag).not.toBe(true);
    expect(companyNameLooksReal("Meister Seelig & Schuster PLLC")).toBe(true);
    expect(plausibilityCheck(facts({ name: "Stephen Meister", org: "Meister Seelig & Schuster PLLC" })).status).toBe("PASS");
    expect(companyNameLooksReal("Northbridge Meridian Holdings LLC")).toBe(true);
    expect(plausibilityCheck(facts({ name: "Oleg Logunov", org: "Northbridge Meridian Holdings LLC" })).status).toBe("PASS");
    expect(companyNameLooksReal("Blorptex Qwvzn")).toBe(false);
  });

  it("matches Vornado without requiring trust, and still rejects a different Starwood firm", () => {
    const headline = "Steven Roth vows aggressive action as Vornado stock slumps";
    expect(mentionsCompany(headline, "Vornado Realty Trust")).toBe(true);
    expect(mentionsCompany("Starwood Capital halts redemptions", "Starwood Property Trust")).toBe(false);
    expect(mentionsCompany("Starwood Property sold a loan", "Starwood Property Trust")).toBe(true);
    expect(mentionsCompany("Inside Starwood's SREIT", "Starwood Property Trust", "Barry Sternlicht")).toBe(false);
    expect(mentionsCompany("Starwood's Barry Sternlicht on U.S. tariff policy", "Starwood Property Trust", "Barry Sternlicht")).toBe(true);
    expect(mentionsCompany("Vornado's Steve Roth BREAKS SILENCE on Mamdani vs. Ken Griffin", "Vornado Realty Trust", "Steven Roth")).toBe(true);
    expect(civilDocket("Marco Antonio Zumba v. Sciame Construction")).toBe(true);
    expect(civilDocket("Vornado's Steve Roth BREAKS SILENCE on Mamdani vs. Ken Griffin")).toBe(false);
    const news = classifyNews(
      facts({ name: "Steven Roth", applicantName: "Steven Roth", org: "Vornado Realty Trust", location: "New York, NY" }),
      [{
        title: headline,
        snippet: headline,
        url: "https://www.crainsnewyork.com/vornado-roth",
        source: "Crain's",
        publishedAt: "2026-06-01T15:00:00.000Z",
        provider: "Google News",
      }],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(news[0].status).toBe("PASS");
    expect(news[0].corroborates).toBe(true);
    expect(news[0].finding.toLowerCase()).not.toContain("without the company");
    expect(news[0].finding.toLowerCase()).not.toContain("different person");
  });

  it("does not label an REO or dividend headline as litigation", () => {
    const title = "Arbor Realty Trust: REO Balances And A Dividend Reset";
    expect(ordinaryResults(title)).toBe(true);
    expect(ordinaryResults("Zumba v. Sciame Construction files a civil docket")).toBe(false);
    const news = classifyNews(
      facts({ name: "Ivan Kaufman", applicantName: "Ivan Kaufman", org: "Arbor Realty Trust", location: "New York, NY" }),
      [{
        title,
        snippet: "The quarter covered REO and the dividend. A later paragraph mentions a lawsuit.",
        url: "https://seekingalpha.com/arbor-reo",
        source: "Seeking Alpha",
        publishedAt: "2026-06-01T15:00:00.000Z",
        provider: "Google News",
      }],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(news[0].finding).not.toMatch(/litigation/i);
    expect(news[0].url).toBe("https://seekingalpha.com/arbor-reo");
    expect(news.some((item) => /Company litigation/i.test(item.finding))).toBe(false);
  });

  it("rejects a loose EDGAR filer and does not corroborate a name-only company hit", () => {
    const rows = [
      { title: "TERRA PROPERTY TRUST, INC.", ticker: "TPT", cik: "1674356" },
      { title: "EXTELL ROCK LLC", ticker: "", cik: "1648107" },
      { title: "AVISON YOUNG (CANADA) INC.", ticker: "", cik: "1682683" },
      { title: "SL GREEN REALTY CORP", ticker: "SLG", cik: "1040971" },
      { title: "CBRE GROUP, INC.", ticker: "CBRE", cik: "1138118" },
      { title: "GREEN DOT CORP", ticker: "GDOT", cik: "1386278" },
    ];
    expect(matchEdgarCompany(rows, "Terra Group")).toBeNull();
    expect(matchEdgarCompany(rows, "Extell Development Company")).toBeNull();
    expect(matchEdgarCompany(rows, "Avison Young")).toBeNull();
    const partial = assessEdgarMatch({
      org: "Terra Group",
      person: "Pat Example",
      tickersOk: true,
      companies: rows,
      filingNames: [],
    });
    expect(partial.status).toBe("INCONCLUSIVE");
    expect(partial.corroborates).toBe(false);
    expect(partial.reviewFlag).toBe(true);
    expect(partial.finding).toContain("TERRA PROPERTY TRUST");
    const loose = assessEdgarMatch({
      org: "The LeFrak Organization",
      person: "Richard LeFrak",
      tickersOk: true,
      companies: [{ title: "PACIFIC HEALTH CARE ORGANIZATION INC", ticker: "PFHO", cik: "1041657" }],
      filingNames: [],
    });
    expect(loose.finding).not.toContain("PACIFIC");
    expect(loose.reviewFlag).not.toBe(true);
    const ridge = assessEdgarMatch({
      org: "Quillfeather Ridge Holdings LLC",
      person: "Marisol Quentin-Vale",
      tickersOk: true,
      companies: [{ title: "GRANITE RIDGE RESOURCES, INC.", ticker: "GRNT", cik: "1928446" }],
      filingNames: [],
    });
    expect(ridge.finding).not.toContain("GRANITE");
    expect(ridge.reviewFlag).not.toBe(true);
    expect(partial.finding.toLowerCase()).toContain("does not corroborate");
    const partialGrade = gradeChecks(
      [row({ key: "edgar", status: partial.status, weight: 6, corroborates: false, reviewFlag: true, finding: partial.finding })],
      facts({ org: "Terra Group", name: "Pat Example" }),
    );
    expect(partialGrade.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    expect(partialGrade.letter).not.toBe("C");
    expect(partialGrade.recommendation.startsWith("APPROVE")).toBe(false);
    expect(matchEdgarCompany(rows, "SL Green")?.cik).toBe("1040971");
    expect(matchEdgarCompany(rows, "SL Green")?.ticker).not.toBe("GDOT");
    expect(matchEdgarCompany(rows, "CBRE Group")?.cik).toBe("1138118");
    const nameOnly = assessEdgarMatch({
      org: "SL Green",
      person: "Marc Holliday",
      tickersOk: true,
      companies: [{ title: "SL GREEN REALTY CORP", ticker: "SLG", cik: "1040971" }],
      filingNames: ["SL Green (SLG) (CIK 0001040971)"],
    });
    expect(nameOnly.status).toBe("INCONCLUSIVE");
    expect(nameOnly.corroborates).toBe(false);
    expect(nameOnly.finding.toLowerCase()).toContain("does not tie the person");
    const graded = gradeChecks(
      [row({ key: "edgar", status: nameOnly.status, weight: 6, corroborates: false, finding: nameOnly.finding, url: nameOnly.url })],
      facts({ org: "SL Green", name: "Marc Holliday" }),
    );
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    const tied = assessEdgarMatch({
      org: "SL Green",
      person: "Marc Holliday",
      tickersOk: true,
      companies: [{ title: "SL GREEN REALTY CORP", ticker: "SLG", cik: "1040971" }],
      filingNames: ["SL GREEN REALTY CORP (SLG) (CIK 0001040971)", "HOLLIDAY MARC"],
    });
    expect(tied.status).toBe("PASS");
    expect(tied.corroborates).toBe(true);
  });

  it("shows snippet text and drops an unresolved Bing redirect", async () => {
    const target = "https://news.example/vornado-roth";
    const packed = `a1${Buffer.from(target).toString("base64")}`;
    const ddg = `<html><body><a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(target)}">Steven Roth leads Vornado Realty Trust in New York</a></body></html>`;
    const bing = `<html><body><li class="b_algo"><a href="https://www.bing.com/ck/a?u=${packed}">Steven Roth leads Vornado Realty Trust in New York</a></li></body></html>`;
    const screened = await runPublicScreen(
      facts({ name: "Steven Roth", applicantName: "Steven Roth", org: "Vornado Realty Trust", website: "", location: "New York, NY" }),
      async (url) => {
        if (url.includes("duckduckgo")) return { ok: true, status: 200, text: ddg };
        if (url.includes("bing.com/search")) return { ok: true, status: 200, text: bing };
        return { ok: false, status: 404, text: "" };
      },
    );
    const web = screened.find((check) => check.key === "screen-web");
    expect(web?.finding).not.toContain("class=");
    expect(web?.finding).not.toContain("result__a");
    expect(web?.finding).toContain("Steven Roth");
    const footprint = screened.find((check) => check.key === "web-footprint");
    expect(footprint?.url || web?.url || "").not.toContain("bing.com/ck/");
    expect(`${web?.finding} ${footprint?.url || ""}`).toContain("news.example/vornado-roth");
  });

  it("keeps a bio path that sits after a long list of service URLs", () => {
    const fillers = Array.from({ length: 70 }, (_, index) => `{"url":"/markets/office-${index}"}`).join("");
    const html = `<html><script>${fillers}{"url":"/w/james-nelson"}</script><p>Avison Young</p></html>`;
    const page = prepareFetchedText(html, 180_000);
    expect(surnamePageUrls(page, "https://www.avisonyoung.us/", "Nelson")).toContain("https://www.avisonyoung.us/w/james-nelson");
  });

  it("does not treat a debate headline as a different person", () => {
    const silence = classifyNews(
      facts({ name: "Steven Roth", applicantName: "Steven Roth", org: "Vornado Realty Trust", location: "New York, NY" }),
      [{
        title: "Vornado's Steve Roth BREAKS SILENCE on Mamdani vs. Ken Griffin",
        snippet: "",
        url: "https://news.example/roth-silence",
        source: "Example",
        publishedAt: "2026-05-05T15:00:00.000Z",
        provider: "Google News",
      }],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(silence[0].status).toBe("PASS");
    expect(silence[0].reviewFlag).not.toBe(true);
    expect(silence[0].finding.toLowerCase()).not.toContain("without the company");
  });

  it("does not treat a law-firm investigations practice as a lawsuit", () => {
    const title = "Jordan Estes Joins Kramer Levin's White Collar and Government Investigations Practice as Partner";
    const news = classifyNews(
      facts({ name: "Jay Neveloff", applicantName: "Jay Neveloff", org: "Kramer Levin Naftalis & Frankel LLP", location: "New York, NY" }),
      [{
        title,
        snippet: title,
        url: "https://news.example/kramer-join",
        source: "Example",
        publishedAt: "2023-05-02T15:00:00.000Z",
        provider: "Google News",
      }],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    expect(news[0].finding).not.toMatch(/litigation/i);
    expect(news.some((item) => /Company litigation/i.test(item.finding))).toBe(false);
  });

  it("does not join a person in one YouTube title with the company in another", async () => {
    const html = `<html><script>{"title":{"runs":[{"text":"Larry Silverstein and CBRE"}]}}{"title":{"runs":[{"text":"Cramer's lightning round: I like Toll Brothers"}]}}</script></html>`;
    const checks = await runPublicScreen(
      facts({ name: "Larry Silverstein", applicantName: "Larry Silverstein", org: "Toll Brothers", location: "New York, NY", website: "" }),
      async (url) => (url.includes("youtube.com") ? { ok: true, status: 200, text: html } : { ok: false, status: 404, text: "" }),
    );
    const youtube = checks.find((check) => check.key === "screen-youtube");
    expect(youtube?.status).not.toBe("PASS");
    expect(youtube?.corroborates).not.toBe(true);
    expect(youtube?.finding).not.toContain(" — ");
  });

  it("abandons one slow check instead of holding the case", async () => {
    const result = await settleWithin(new Promise<string>(() => undefined), 30, "timed out");
    expect(result).toBe("timed out");
    expect(nextTimeoutMs({ failure: "timeout" }, 8000)).toBe(16000);
    expect(nextTimeoutMs({ failure: "nxdomain" }, 8000)).toBeNull();
    expect(nextTimeoutMs({}, 8000)).toBeNull();
    let calls = 0;
    const retried = await settleWithinRetry(async () => {
      calls += 1;
      if (calls === 1) return new Promise<string>(() => undefined);
      return "ok";
    }, 20, "timed out");
    expect(retried).toBe("ok");
    expect(calls).toBe(2);
    let once = 0;
    const ready = await settleWithinRetry(async () => {
      once += 1;
      return "ready";
    }, 50, "timed out");
    expect(ready).toBe("ready");
    expect(once).toBe(1);
    const graded = gradeChecks(
      [
        row({ key: "news", status: "UNAVAILABLE", finding: "This check timed out. The source could not be checked." }),
        row({ key: "courts", status: "UNAVAILABLE", weight: 0, finding: "CourtListener was blocked, timed out, or did not respond. This source could not be checked." }),
      ],
      facts(),
    );
    expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("timed out");
    expect(graded.summary.couldNotCheck.toLowerCase()).toContain("timed out");
    expect(graded.summary.couldNotCheck.toLowerCase()).not.toContain("did not check out");
  });
});
