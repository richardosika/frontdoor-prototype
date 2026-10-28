import { describe, expect, it } from "vitest";
import { assessLocalAddress, assessNominatimBody, expandStreetSuffix, geocoderSaysAddressInvalid, parseApplicationLocation, statedUsState, streetGeocodeForms, zipMatchesState } from "@/lib/verify/address";
import { isReservedDomain } from "@/lib/verify/host";
import { assessRdap, cardConsistencyCheck, collectChecks, companyNameLooksReal, inviteCheck, linkedinFormatCheck, noteIncorporationRegistry, personNameTokensLookMadeUp, phoneStateCheck, plausibilityCheck, registryLinkCheck, resolveAddressCheck, sanctionsCheck, settleWithin, settleWithinRetry, TEST_WATCHLIST, tokenLooksGibberish } from "@/lib/verify/checks";
import { RERUN_STATUS, rerunChecksHref } from "@/lib/rerun-checks";
import { assessStateRegistry, registryPortal, socrataRegistryUrl } from "@/lib/verify/state-registries";
import { assessCourts, courtSearchQuery } from "@/lib/verify/courts";
import { assessEdgarMatch, clearEdgarTickerCache, companyFromDisplayName, edgarCompanySearchPhrase, edgarTickerDomainMatch, insiderSearchUrl, lookupEdgar, matchEdgarCompany, matchedNameIsFormer, parseSubmissionsIdentity, submissionsUrl } from "@/lib/verify/edgar";
import { classifyFetchError, fetchLimits, looksLikeHtml, nextRedirectUrl, nextTimeoutMs, prepareFetchedText, userAgentFor, USER_AGENT } from "@/lib/verify/fetch";
import { applyReviewSkips, companyCouldNotBeFound, companyExistsEvidence, companyFileBesideApplication, corroboratingPasses, dedupeSourceLines, gradeChecks, gradeComparisonLine, namesPersonAndCompany, neutralScreenNewsPass, noteAfterRerun, outsideSourceConfirmsCompany, rerunAuditSummary, type GradeReport } from "@/lib/verify/grade";
import { alignNewsRows, civilDocket, classifyNews, companyForeclosure, gdeltQuery, instagramCompanyTag, judgeHeadline, newsSearchQueries, ordinaryResults, queryCity, socialSearchQuery } from "@/lib/verify/news";
import { assessNyRegistry, normalizeRegistryName } from "@/lib/verify/ny-registry";
import { factsForSearch } from "@/lib/verify/qa-marker";
import { brandAliases, companySearchTerm, distinctiveCompanyTokens, domainBrand, domainMatchesOrgStem, firmContainsApplicantName, formalGivenName, isDistinctiveCompanyToken, leftTheCompany, linkedinCompanyMatchesOrg, linkedinProfileMatchesPerson, mentionsBrandAlias, mentionsCompany, mentionsPerson, pageBrandNames, personHit, personWithoutSuffix, surnameForSearch } from "@/lib/verify/public-match";
import { formatRunScores, scoreOf } from "@/lib/verify/score";
import { completeScreenRows, fallbackTeamUrls, hostIsApplicant, isBotChallenge, linkedinCompanyFollow, runPublicScreen, sameOriginPages, scorePublicText, serpUnusable, sitemapLastNameUrls, sitemapPersonUrls, socialLinksFrom, surnamePageUrls, youtubeTitles } from "@/lib/verify/screen";
import { emptyPrefillFacts, suggestCompany } from "@/lib/guided-prefill";
import { approveConfirmMessage, displayedCheckFinding, unverifiedPersonItems } from "@/lib/review-steps";
import { evidenceRowsForRun } from "@/lib/guided-prefill-db";
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
    expect(graded.attention.some((item) => /company confirmed, person not confirmed/i.test(item.detail) && /request more info/i.test(item.detail))).toBe(true);
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
    expect(backed.score - alone.score).toBe(3 + 8 + 2 + 2);
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
    expect(backed.score - alone.score).toBe(8 + 4 + 3 + 2 + 8 + 2 + 2 + 2 + 1);
    expect(backed.categories.find((category) => category.id === "company")?.reason).toContain("8 of 8");
    expect(backed.categories.find((category) => category.id === "company")?.reason).toContain("4 of 4");
    const companyOnly = gradeChecks(
      [row({ key: "website", status: "PASS", companyOnly: true, selfReported: true, corroborates: false, finding: "company confirmed, person NOT confirmed" })],
      facts(),
    );
    expect(companyOnly.categories.find((category) => category.id === "company")?.earned).toBe(0);
    expect(companyOnly.categories.find((category) => category.id === "company")?.reason).toContain("No outside source confirmed the company");
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
    expect(phoneStateCheck(facts({ phone: "312-555-0100", location: "Chicago, IL" })).status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "415-555-0100", location: "San Francisco, CA" })).status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "713-555-0100", location: "Houston, TX" })).status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "401-555-0100", location: "Providence, RI" })).status).toBe("PASS");
    expect(phoneStateCheck(facts({ phone: "305-555-0100", location: "Miami, FL" })).status).toBe("PASS");
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
    expect(clean.status).toBe("INCONCLUSIVE");
    expect(clean.status).not.toBe("PASS");
    expect(clean.weight).toBe(0);
    expect(clean.finding).toContain("Not checkable for free.");
    expect(clean.corroborates).toBe(false);
    expect(clean.finding).toContain("None found");
    expect(clean.finding.toLowerCase()).toContain("not a risk flag and not credit");
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
    expect(mentionsCompany("CBRE CEO Bob Sulentic leads the firm", "CBRE Group", "Bob Sulentic")).toBe(true);
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

  it("decides self-reported from the credited hit's own host", async () => {
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
            text: [
              `<a class="result__a" href="https://www.linkedin.com/in/harris-freidus">Harris Freidus of Paul Weiss in New York</a>`,
              `<a class="result__a" href="https://www.paulweiss.com/professionals/harris-b-freidus">Harris Freidus of Paul Weiss</a>`,
            ].join(""),
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
    const thirdPartyFootprint = checks.find((check) => check.key === "web-footprint");
    expect(thirdPartyFootprint?.url).toContain("linkedin.com/in/harris-freidus");
    expect(thirdPartyFootprint?.selfReported).not.toBe(true);
    const ownOnly = await runPublicScreen(
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
            text: `<a class="result__a" href="https://www.paulweiss.com/professionals/harris-b-freidus">Harris Freidus of Paul Weiss in New York</a>`,
          };
        }
        if (url.includes("paulweiss.com")) return { ok: true, status: 200, text: "<html><p>Paul Weiss is a law firm in New York.</p></html>" };
        return { ok: false, status: 403, text: "" };
      },
    );
    const own = ownOnly.find((check) => check.key === "screen-web");
    expect(own?.selfReported).toBe(true);
    expect(own?.corroborates).not.toBe(true);
  });
});

describe("a dropped screen check stays on the file", () => {
  it("keeps a finished pass and marks the rows that never finished as unavailable", async () => {
    const website = row({
      key: "website",
      status: "PASS",
      corroborates: true,
      finding: "Found: Jane Roe leads Zorblax Holdings in New York. Name: yes. Company: yes. City: yes. Confidence: high.",
    });
    let finish: (value: CheckOutput[] | null) => void = () => undefined;
    const work = new Promise<CheckOutput[] | null>((resolve) => {
      finish = resolve;
    });
    const dropped = await settleWithin(work, 30, null);
    finish(null);
    expect(dropped).toBeNull();
    const filled = completeScreenRows([website]);
    expect(filled.find((check) => check.key === "website")?.status).toBe("PASS");
    for (const key of ["linkedin-fetch", "screen-web", "web-footprint", "screen-news", "screen-youtube"]) {
      const missing = filled.find((check) => check.key === key);
      expect(missing?.status).toBe("UNAVAILABLE");
      expect(missing?.weight).toBe(0);
      expect(missing?.finding.toLowerCase()).toContain("couldn't check");
    }
    const kept = gradeChecks(filled, facts());
    const alone = gradeChecks([website], facts());
    expect(kept.score).toBe(alone.score);
    expect(scoreOf(filled)).toBe(scoreOf([website]));
  });
});

describe("completeness and a company-only LinkedIn page need an independent source", () => {
  it("withholds the application points and the company-only LinkedIn points until a source names the person", () => {
    const filledIn = facts({ phone: "212-555-0147", website: "https://zorblax.example", cardUploaded: true, referenceCount: 1 });
    const alone = gradeChecks([], filledIn);
    const completeness = alone.categories.find((category) => category.id === "completeness");
    expect(completeness?.earned).toBe(0);
    expect(completeness?.reason).toContain("No independent source");
    expect(completeness?.reason).not.toContain("(2 of 2)");
    const linkedinOnly = gradeChecks(
      [row({ key: "linkedin-fetch", status: "PASS", companyOnly: true, corroborates: false, finding: "company confirmed, person NOT confirmed. Name: no. Company: yes." })],
      filledIn,
    );
    expect(linkedinOnly.categories.find((category) => category.id === "identity")?.reason).toContain("Company confirmed, person not confirmed (2 of 4)");
    expect(linkedinOnly.categories.find((category) => category.id === "completeness")?.earned).toBe(0);
    const news = row({ key: "news", status: "PASS", corroborates: true, finding: "Neutral coverage names this person and company." });
    const backed = gradeChecks([news], filledIn);
    expect(backed.categories.find((category) => category.id === "completeness")?.earned).toBe(10);
    const linkedinBacked = gradeChecks(
      [
        news,
        row({ key: "linkedin-fetch", status: "PASS", companyOnly: true, corroborates: false, finding: "company confirmed, person NOT confirmed. Name: no. Company: yes." }),
      ],
      filledIn,
    );
    expect(linkedinBacked.categories.find((category) => category.id === "identity")?.reason).toContain("Company confirmed, person not confirmed (2 of 4)");
    expect(linkedinBacked.score).toBeGreaterThan(linkedinOnly.score);
  });
});

describe("an independent hit that does not name both still asks for a team page", () => {
  const person = facts({ name: "Jay Neveloff", applicantName: "Jay Neveloff", org: "Kramer Levin Naftalis & Frankel LLP", location: "New York, NY" });

  it("keeps the credit and shows the request when the cited text does not name both", () => {
    const directory = row({
      key: "screen-web",
      status: "PASS",
      corroborates: true,
      finding: 'Searched: "Jay Neveloff" "Kramer Levin". Found: Jay Neveloff spoke on a panel. Name: yes. Company: no. City: yes. Confidence: medium.',
    });
    const youtube = row({
      key: "screen-youtube",
      status: "PASS",
      corroborates: true,
      finding: 'Searched: "Jay Neveloff" "Kramer Levin". Found: Jay Neveloff interview. Name: yes. Company: no. City: no. Confidence: low.',
    });
    const deal = row({
      key: "news",
      status: "PASS",
      corroborates: true,
      finding: 'Searched: "Jay Neveloff" "Kramer Levin". Found: Kramer Levin expands - The Real Deal Name: no. Company: yes. City: no. Confidence: low.',
    });
    expect(corroboratingPasses([directory, youtube, deal])).toHaveLength(3);
    expect(namesPersonAndCompany(directory, person)).toBe(false);
    expect(namesPersonAndCompany(youtube, person)).toBe(false);
    expect(namesPersonAndCompany(deal, person)).toBe(false);
    const graded = gradeChecks([directory, youtube, deal], person);
    expect(graded.categories.find((category) => category.id === "footprint")?.reason).toContain("8 of 8");
    expect(graded.attention.some((item) => item.title === "Thin public record" && /team-page/i.test(item.detail) && /company confirmed, person not confirmed|does not name both/i.test(item.detail))).toBe(true);
    expect(graded.summary.nextStep.toLowerCase()).toContain("team-page");
    const named = row({
      key: "screen-web",
      status: "PASS",
      corroborates: true,
      finding: 'Searched: "Jay Neveloff" "Kramer Levin". Found: Jay A. Neveloff, Kramer Levin Naftalis & Frankel LLP, New York. Name: yes. Company: yes. City: yes. Confidence: high.',
    });
    expect(namesPersonAndCompany(named, person)).toBe(true);
    const namedGrade = gradeChecks([named], person);
    expect(namedGrade.attention.some((item) => /does not name both/i.test(item.detail))).toBe(false);
    expect(namedGrade.attention.some((item) => item.title === "Only one independent source")).toBe(true);
    const coverage = row({ key: "news", status: "PASS", corroborates: true, finding: "Neutral coverage names this person and company." });
    expect(namesPersonAndCompany(coverage, person)).toBe(true);
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

  it("reads a surname bio from a sitemap index whose children are not named people pages", async () => {
    const fetched: string[] = [];
    const urls = await sitemapLastNameUrls(async (url) => {
      fetched.push(url);
      if (url.endsWith("/sitemap.xml")) {
        return {
          ok: true,
          status: 200,
          text: `<sitemapindex><sitemap><loc>https://www.avisonyoung.us/sitemap.xml?p_l_id=1&amp;layoutUuid=abc</loc></sitemap><sitemap><loc>https://www.avisonyoung.us/sitemap.xml?p_l_id=2&amp;layoutUuid=def</loc></sitemap></sitemapindex>`,
        };
      }
      if (url.includes("p_l_id=1")) return { ok: true, status: 200, text: "<urlset><url><loc>https://www.avisonyoung.us/about</loc></url></urlset>" };
      if (url.includes("p_l_id=2")) {
        return { ok: true, status: 200, text: "<urlset><url><loc>https://www.avisonyoung.us/w/james-nelson</loc></url></urlset>" };
      }
      return { ok: false, status: 404, text: "" };
    }, "https://www.avisonyoung.us", "Nelson");
    expect(urls).toEqual(["https://www.avisonyoung.us/w/james-nelson"]);
    expect(fetched.some((url) => url.includes("p_l_id=2"))).toBe(true);
  });

  it("names James Nelson from the Avison Young bio and does not call a blocked Skanska page Name: no", async () => {
    const avison = await runPublicScreen(
      facts({
        name: "James Nelson",
        applicantName: "James Nelson",
        org: "Avison Young",
        website: "https://www.avisonyoung.us",
        location: "New York, NY",
      }),
      async (url) => {
        if (url === "https://www.avisonyoung.us/sitemap.xml") {
          return {
            ok: true,
            status: 200,
            text: `<sitemapindex><sitemap><loc>https://www.avisonyoung.us/sitemap.xml?p_l_id=9&amp;layoutUuid=bio</loc></sitemap></sitemapindex>`,
          };
        }
        if (url.includes("p_l_id=9")) {
          return { ok: true, status: 200, text: "<urlset><url><loc>https://www.avisonyoung.us/w/james-nelson</loc></url></urlset>" };
        }
        if (url.includes("/w/james-nelson")) {
          return { ok: true, status: 200, text: "<html><body><p>James Nelson is a Principal at Avison Young in New York.</p></body></html>" };
        }
        if (url.includes("avisonyoung.us")) return { ok: true, status: 200, text: "<html><body><p>Avison Young</p><a href=\"/leadership\">Leadership</a></body></html>" };
        return { ok: false, status: 403, text: "" };
      },
    );
    const avisonSite = avison.find((check) => check.key === "website");
    expect(avisonSite?.url).toContain("/w/james-nelson");
    expect(avisonSite?.finding).toContain("Name: yes");
    expect(avisonSite?.companyOnly).not.toBe(true);
    expect(avisonSite?.selfReported).toBe(true);

    const skanska = await runPublicScreen(
      facts({
        name: "Richard Kennedy",
        applicantName: "Richard Kennedy",
        org: "Skanska USA",
        website: "https://www.skanska.com/us/en/",
        location: "New York, NY",
      }),
      async () => ({ ok: false, status: 403, text: "<html><title>Just a moment...</title><p>Skanska</p></html>" }),
    );
    const skanskaSite = skanska.find((check) => check.key === "website");
    expect(skanskaSite?.status).toBe("UNAVAILABLE");
    expect(skanskaSite?.finding).toContain("blocked by site (403)");
    expect(skanskaSite?.finding).toContain("team-page");
    expect(skanskaSite?.finding).not.toContain("Name: no");
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
      expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("No outside source confirmed the company");
      expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("0 of 8");
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
    expect(company?.reason).toContain("Company confirmed, person not confirmed (4 of 8)");
    expect(company?.reason).not.toContain("includes the person or company (8 of 8)");
    expect(identity?.reason).toContain("Company confirmed, person not confirmed (2 of 4)");
    expect(graded.summary.checkedOut).toContain("Company confirmed, person not confirmed");
    expect(graded.summary.company).toContain("Company confirmed, person not confirmed");
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
      expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("Company confirmed, person not confirmed (4 of 8)");
      expect(graded.categories.find((category) => category.id === "identity")?.reason).toContain("Company confirmed, person not confirmed (2 of 4)");
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
    expect(cityGrade.categories.find((category) => category.id === "completeness")?.reason).toContain("No independent source");
    expect(cityGrade.categories.find((category) => category.id === "completeness")?.reason).not.toContain("A location is on the application (2 of 2)");
    const backedCity = gradeChecks(
      [city!, row({ key: "news", status: "PASS", corroborates: true, finding: "Neutral coverage names this person and company." })],
      facts({ location: "Newark, NJ" }),
    );
    expect(backedCity.categories.find((category) => category.id === "completeness")?.reason).toContain("A location is on the application (2 of 2)");
  });

  it("leaves a geocoder miss and a geocoder timeout as could not check", async () => {
    const seen: string[] = [];
    const missed = await resolveAddressCheck({
      facts: facts({ location: "1 Not A Real Street ZZZ, Nowhere, NJ 07102" }),
      watchlist: [],
      network: true,
      fetchText: async (url) => {
        seen.push(url);
        expect(url).not.toContain("googleapis");
        expect(url).not.toContain("usps.com");
        if (url.includes("nominatim.openstreetmap.org")) return { ok: true, status: 200, text: "[]" };
        expect(url).toContain("geocoding.geo.census.gov");
        return { ok: true, status: 200, text: JSON.stringify({ result: { addressMatches: [] } }) };
      },
    });
    expect(seen.some((url) => url.includes("geocoding.geo.census.gov"))).toBe(true);
    expect(seen.some((url) => url.includes("nominatim.openstreetmap.org"))).toBe(true);
    expect(missed?.status).toBe("INCONCLUSIVE");
    expect(missed?.reviewFlag).not.toBe(true);
    expect(missed?.finding.toLowerCase()).toContain("could not check");
    expect(missed?.finding.toLowerCase()).toContain("inconclusive");
    expect(missed?.finding.toLowerCase()).not.toContain("address did not check out");
    const missedGrade = gradeChecks([missed!], facts({ location: "1 Not A Real Street ZZZ, Nowhere, NJ 07102" }));
    expect(missedGrade.summary.didNotCheckOut.toLowerCase()).not.toContain("address did not check out");
    expect(missedGrade.summary.couldNotCheck.toLowerCase()).toContain("could not check");
    expect(missedGrade.attention.some((item) => item.title === "Address")).toBe(false);

    const down = await resolveAddressCheck({
      facts: facts({ location: "4600 Silver Hill Rd, Washington, DC 20233" }),
      watchlist: [],
      network: true,
      fetchText: async () => {
        throw new Error("timeout");
      },
    });
    expect(down?.status).toBe("INCONCLUSIVE");
    expect(down?.finding.toLowerCase()).toContain("could not check");
    expect(down?.finding.toLowerCase()).toContain("inconclusive");
    expect(down?.finding.toLowerCase()).not.toContain("did not check out");
    const graded = gradeChecks([down!], facts({ location: "4600 Silver Hill Rd, Washington, DC 20233" }));
    const completeness = graded.categories.find((category) => category.id === "completeness");
    expect(completeness?.reason.toLowerCase()).toContain("could not check");
    expect(completeness?.reason).not.toContain("address did not check out");
    expect(completeness?.reason).not.toContain("A location is on the application (2 of 2)");
    expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("address did not check out");
    expect(graded.summary.couldNotCheck.toLowerCase()).toContain("could not check");

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
    expect(calls.filter((url) => url.startsWith("https://bramblewick-group.example"))).toEqual([
      "https://bramblewick-group.example",
      "https://bramblewick-group.example",
      "https://bramblewick-group.example/sitemap.xml",
    ]);
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
    expect(mentionsCompany("CBRE CEO Bob Sulentic leads the firm", "CBRE Group", "Bob Sulentic")).toBe(true);
    expect(mentionsCompany("The chairman of CBRE, Bob Sulentic, spoke", "CBRE Group", "Bob Sulentic")).toBe(true);
    expect(mentionsCompany("Starwood Capital halts redemptions", "Starwood Property Trust", "Barry Sternlicht")).toBe(false);
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
    expect(companySearchTerm("The Durst Organization", "Douglas Durst")).toBe("durst organization");
    expect(companySearchTerm("The Brodsky Organization", "Daniel Brodsky")).toBe("brodsky organization");
    expect(companySearchTerm("LeFrak Organization", "Richard LeFrak")).toBe("lefrak organization");
    expect(companySearchTerm("Plaza Construction", "David Wang")).toBe("plaza construction");
    expect(companySearchTerm("Rockrose Development Corp.", "Justin Elghanayan")).toBe("rockrose");
    expect(socialSearchQuery("David Wang", "Plaza Construction")).toBe(`"David Wang" "plaza construction"`);
    expect(socialSearchQuery("David Wang", "Plaza Construction")).not.toBe(`"David Wang" "plaza"`);
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
    expect(newsSearchQueries(durst)[0]).toBe(`"Douglas Durst" "durst organization"`);
    expect(newsSearchQueries(facts({ name: "Daniel Brodsky", applicantName: "Daniel Brodsky", org: "The Brodsky Organization", location: "New York, NY" }))[0]).toBe(
      `"Daniel Brodsky" "brodsky organization"`,
    );
    expect(socialSearchQuery("Daniel Brodsky", "The Brodsky Organization")).toBe(`"Daniel Brodsky" "brodsky organization"`);
    expect(socialSearchQuery("Richard LeFrak", "LeFrak Organization")).toBe(`"Richard LeFrak" "lefrak organization"`);
    expect(newsSearchQueries(facts({ name: "Stephen Ross", applicantName: "Stephen Ross", org: "Related Companies" }))[0]).toBe(
      `"Stephen Ross" "related companies"`,
    );
    noRepeatedWord([...newsSearchQueries(tutor), ...newsSearchQueries(belkin)]);

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
    expect(judged[0].status).toBe("PASS");
    expect(judged[0].corroborates).toBe(true);
    expect(judged[0].finding).toContain("Neutral coverage");
    expect(judged[0].finding).toContain("Company-level litigation");
    expect(judged[0].url).toBe("https://example.com/vornado-neutral");
    expect(screen?.status).not.toBe("FAIL");
    expect(screen?.corroborates).not.toBe(true);
    expect(screen?.url).toBe("https://example.com/vornado-neutral");
    const graded = gradeChecks(judged, vornado);
    expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(true);
    expect(graded.summary.company).toContain("A headline names the person and the company");
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
    expect(partial.finding.toLowerCase()).toContain("parent match, needs review");
    expect(partialGrade.categories.find((category) => category.id === "company")?.reason).toContain("Parent match, needs review");
    expect(partialGrade.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    expect(partialGrade.categories.find((category) => category.id === "company")?.reason).not.toContain("6 of 6");
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
    expect(nameOnly.status).not.toBe("PASS");
    expect(nameOnly.corroborates).toBe(false);
    expect(nameOnly.companyOnly).not.toBe(true);
    expect(nameOnly.finding.toLowerCase()).toContain("not an exact match");
    expect(nameOnly.finding.toLowerCase()).toContain("not a pass");
    const graded = gradeChecks(
      [row({ key: "edgar", status: nameOnly.status, weight: 6, corroborates: false, reviewFlag: true, finding: nameOnly.finding, url: nameOnly.url })],
      facts({ org: "SL Green", name: "Marc Holliday" }),
    );
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    const shortName = assessEdgarMatch({
      org: "SL Green",
      person: "Marc Holliday",
      tickersOk: true,
      companies: [{ title: "SL GREEN REALTY CORP", ticker: "SLG", cik: "1040971" }],
      filingNames: ["SL GREEN REALTY CORP (SLG) (CIK 0001040971)", "HOLLIDAY MARC"],
    });
    expect(shortName.status).not.toBe("PASS");
    expect(shortName.corroborates).toBe(false);
    const tied = assessEdgarMatch({
      org: "SL Green Realty Corp",
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

describe("qa october 27", () => {
  it("treats a site brand as a review alias and still matches the legal name", () => {
    const html = `<html><title>JLL | Commercial Real Estate</title><meta property="og:site_name" content="JLL"><script type="application/ld+json">{"@type":"Organization","name":"JLL"}</script><body><p>JLL advises owners.</p></body></html>`;
    expect(domainBrand("https://www.jll.com")).toBe("jll");
    expect(pageBrandNames(html)).toContain("JLL");
    const aliases = brandAliases("Jones Lang LaSalle", "https://www.jll.com", html);
    expect(aliases).toContain("jll");
    expect(mentionsBrandAlias("JLL advises owners.", aliases)).toBe("jll");
    expect(mentionsBrandAlias("a jolly page", aliases)).toBe("");
    expect(mentionsCompany("JLL advises owners.", "Jones Lang LaSalle")).toBe(false);
    expect(mentionsCompany("Jones Lang LaSalle advises owners.", "Jones Lang LaSalle")).toBe(true);
    expect(mentionsCompany("Starwood Capital", "Starwood Property Trust")).toBe(false);
    const alias = scorePublicText("JLL advises owners.", { name: "Christian Ulbrich", org: "Jones Lang LaSalle", location: "Chicago, IL", aliases });
    expect(alias.company).toBe(false);
    expect(alias.alias).toBe("jll");
  });

  it("searches the full company name and the brand alias, not one leftover word", () => {
    const jll = facts({
      name: "Christian Ulbrich",
      applicantName: "Christian Ulbrich",
      org: "Jones Lang LaSalle",
      website: "https://www.jll.com",
      location: "Chicago, IL",
    });
    const queries = newsSearchQueries(jll);
    expect(queries[0]).toContain("jones lang lasalle");
    expect(queries.join(" ")).toContain('"jll"');
    expect(queries.some((query) => /"real"$|"estate"$/.test(query))).toBe(false);
    expect(socialSearchQuery("Hessam Nadji", "Marcus & Millichap")).toContain("marcus millichap");
    expect(socialSearchQuery("Hessam Nadji", "Marcus & Millichap")).not.toBe('"Hessam Nadji" "marcus"');
    expect(socialSearchQuery("Hamid Moghadam", "Prologis")).toContain("prologis");
    expect(companySearchTerm("Hines", "Jeff Hines")).toBe("hines");
    const hinesFirm = companySearchTerm("Hines Interests Limited Partnership", "Jeff Hines");
    expect(hinesFirm.split(" ").length).toBeGreaterThan(1);
    expect(hinesFirm).not.toBe("interests");
  });

  it("accepts a one-word company and does not score the company file below the application without a reason", () => {
    expect(plausibilityCheck(facts({ name: "Prologis", org: "Prologis" })).status).toBe("PASS");
    expect(plausibilityCheck(facts({ name: "Hines", org: "Hines" })).status).toBe("PASS");
    expect(plausibilityCheck(facts({ name: "Hines", org: "Hines" })).finding).not.toContain("looks incomplete");
    const gibberish = plausibilityCheck(facts({ name: "Qwvzn", org: "Qwvzn" }));
    expect(gibberish.status).toBe("FAIL");
    expect(gibberish.finding).toContain("does not look like real words");
    const application = gradeChecks(
      [row({ key: "plausibility", status: "PASS", weight: 8, finding: "The name, company, and role are filled in and readable." })],
      facts({ name: "Hamid Moghadam", org: "Prologis" }),
    );
    const company = gradeChecks(
      [row({ key: "plausibility", status: "FAIL", weight: 8, finding: "The name or company looks incomplete. Read the application before you decide." })],
      facts({ name: "Prologis", org: "Prologis" }),
    );
    expect(company.score).toBeLessThan(application.score);
    const held = companyFileBesideApplication(company, application);
    expect(held?.score).toBe(application.score);
    expect(held?.letter).toBe(application.letter);
    expect(held?.changeNote).toContain("same inputs do not lower the company file");
    const conflict = gradeChecks(
      [row({ key: "sanctions", status: "FAIL", weight: 20, finding: "Watchlist name match on Prologis." })],
      facts({ name: "Prologis", org: "Prologis" }),
    );
    const stated = companyFileBesideApplication(conflict, application);
    expect(stated?.score).toBe(conflict.score);
    expect(stated?.score).toBeLessThan(application.score);
    expect(stated?.changeNote).toContain("Watchlist name match on Prologis");
  });

  it("shows the same headline on the news row and the news screen", () => {
    const matched = alignNewsRows([
      row({ key: "news", status: "INCONCLUSIVE", finding: "A headline names the person or the company. Prologis expands in Houston." }),
      row({ key: "screen-news", status: "INCONCLUSIVE", finding: "Searched: news. No result found that names this person and this company. Company: no." }),
    ]);
    const screen = matched.find((check) => check.key === "screen-news");
    expect(screen?.finding).toContain("Prologis expands in Houston");
    expect(screen?.finding).not.toContain("Company: no");
    expect(screen?.corroborates).not.toBe(true);
    const scored = alignNewsRows([
      row({ key: "news", status: "INCONCLUSIVE", finding: "No data found. None of the headlines named this person or company." }),
      row({
        key: "screen-news",
        status: "INCONCLUSIVE",
        url: "https://news.example/hines",
        finding: "Searched: news. Found: Jeff Hines leads Hines. Name: yes. Company: yes. City: no. Confidence: high.",
      }),
    ]);
    const news = scored.find((check) => check.key === "news");
    expect(news?.status).toBe("PASS");
    expect(news?.corroborates).toBe(true);
    expect(news?.finding).toContain("Jeff Hines leads Hines");
    const alias = classifyNews(
      facts({
        name: "Christian Ulbrich",
        applicantName: "Christian Ulbrich",
        org: "Jones Lang LaSalle",
        website: "https://www.jll.com",
        location: "Chicago, IL",
      }),
      [
        {
          title: "JLL names Christian Ulbrich",
          snippet: "JLL",
          url: "https://news.example/jll",
          source: "Example",
          publishedAt: "2026-07-18T00:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }],
      NOW,
    );
    const summary = alias.find((check) => check.key === "news");
    expect(summary?.status).not.toBe("PASS");
    expect(summary?.corroborates).not.toBe(true);
    expect(summary?.reviewFlag).toBe(true);
    expect(summary?.finding).toContain("JLL names Christian Ulbrich");
    expect(summary?.finding.toLowerCase()).toContain("not corroboration");
    const judged = judgeHeadline("JLL names Christian Ulbrich", {
      name: "Christian Ulbrich",
      org: "Jones Lang LaSalle",
      location: "Chicago, IL",
      website: "https://www.jll.com",
    });
    expect(judged.aliasOnly).toBe(true);
    expect(judged.company).toBe(false);
  });

  it("follows a cross-host redirect, names a blocked check, and opens a LinkedIn company id over https", async () => {
    expect(nextRedirectUrl("https://www.usa.skanska.com/", 301, "https://www.skanska.com/us/en/")).toBe("https://www.skanska.com/us/en/");
    expect(nextRedirectUrl("http://www.linkedin.com/company/6346", 302, "http://www.linkedin.com/company/prologis")).toBe(
      "https://www.linkedin.com/company/prologis",
    );
    const redirected = await runPublicScreen(
      facts({
        name: "Richard Kennedy",
        applicantName: "Richard Kennedy",
        org: "Skanska USA",
        website: "https://www.usa.skanska.com",
        location: "New York, NY",
      }),
      async (url) => {
        if (url.includes("skanska.com")) {
          return {
            ok: true,
            status: 200,
            text: "<html><title>Skanska</title><body><p>Skanska USA builds in New York. Richard Kennedy leads the company.</p></body></html>",
            url: "https://www.skanska.com/us/en/",
          };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const landed = redirected.find((check) => check.key === "website");
    expect(landed?.finding).toContain("https://www.skanska.com/us/en/");
    expect(landed?.finding).not.toContain("did not respond");
    expect(landed?.finding).toContain("Name: yes");
    expect(landed?.finding).toContain("Company: yes");
    const blockedAfterRedirect = await runPublicScreen(
      facts({
        name: "Richard Kennedy",
        applicantName: "Richard Kennedy",
        org: "Skanska USA",
        website: "https://www.usa.skanska.com",
        location: "New York, NY",
      }),
      async (url) =>
        url.includes("usa.skanska.com")
          ? { ok: false, status: 403, text: "", url: "https://www.skanska.com/us/en/" }
          : { ok: false, status: 404, text: "" },
    );
    const afterRedirect = blockedAfterRedirect.find((check) => check.key === "website");
    expect(afterRedirect?.status).toBe("UNAVAILABLE");
    expect(afterRedirect?.finding).toContain("blocked the check (403)");
    expect(afterRedirect?.finding).toContain("https://www.skanska.com/us/en/");
    expect(afterRedirect?.finding).not.toContain("did not respond");

    const blocked = await runPublicScreen(
      facts({ website: "https://www.prologis.com", org: "Prologis", name: "Hamid Moghadam", applicantName: "Hamid Moghadam" }),
      async (url) => (url.includes("prologis.com") ? { ok: false, status: 405, text: "" } : { ok: false, status: 404, text: "" }),
    );
    const denied = blocked.find((check) => check.key === "website");
    expect(denied?.status).toBe("UNAVAILABLE");
    expect(denied?.finding).toContain("blocked the check");
    expect(denied?.finding).not.toContain("did not respond");

    const seen: string[] = [];
    const linked = await runPublicScreen(
      facts({
        org: "Prologis",
        name: "Hamid Moghadam",
        applicantName: "Hamid Moghadam",
        website: "https://www.prologis.com",
        location: "San Francisco, CA",
      }),
      async (url) => {
        seen.push(url);
        if (url.includes("prologis.com")) {
          return { ok: true, status: 200, text: '<html><body>Prologis <a href="http://www.linkedin.com/company/6346">LinkedIn</a></body></html>' };
        }
        if (url.includes("/company/6346")) {
          return { ok: true, status: 200, text: '<html><link rel="canonical" href="https://www.linkedin.com/company/prologis"><body>Prologis</body></html>' };
        }
        if (url.includes("/company/prologis")) return { ok: true, status: 200, text: "<html><body>Prologis</body></html>" };
        return { ok: false, status: 404, text: "" };
      },
    );
    expect(linkedinCompanyFollow("http://www.linkedin.com/company/6346", '<a href="https://www.linkedin.com/company/prologis">Prologis</a>')).toBe(
      "https://www.linkedin.com/company/prologis",
    );
    expect(seen.some((url) => url.startsWith("http://"))).toBe(false);
    expect(seen.some((url) => url.includes("https://www.linkedin.com/company/prologis"))).toBe(true);
    const page = linked.find((check) => check.key === "linkedin-fetch");
    expect(page?.url).toContain("/company/prologis");
    expect(page?.finding).not.toContain("blocked automated access");
  });

  it("passes a loaded OFAC clear with the list date and replaces stored checks on a re-run", () => {
    const clear = sanctionsCheck(facts(), [{ name: "Other Person", location: "" }], "2026-10-27T12:00:00.000Z");
    expect(clear.status).toBe("PASS");
    expect(clear.finding).toContain("OFAC list loaded 2026-10-27");
    const missing = sanctionsCheck(facts(), []);
    expect(missing.status).toBe("NOT_RUN");
    expect(missing.finding.toLowerCase()).toContain("not checked");
    expect(missing.finding.toLowerCase()).toContain("not a pass");
    const next = gradeChecks([row({ key: "edgar", status: "INCONCLUSIVE", finding: "EDGAR lists Prologis, Inc. (PLD), CIK 1045609." })], facts());
    const note = noteAfterRerun(null, { letter: "F", score: 44 }, next);
    expect(note).not.toContain("First graded run");
    expect(note).toContain("stored checks were replaced");
    const rows = evidenceRowsForRun("run-1", [row({ key: "edgar", status: "INCONCLUSIVE", finding: "EDGAR lists Prologis, Inc. (PLD), CIK 1045609." })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].runId).toBe("run-1");
    expect(rows[0].finding).toContain("Prologis, Inc. (PLD)");
    expect(rows[0].finding).toContain("CIK 1045609");
    const listed = assessEdgarMatch({
      org: "Prologis, Inc.",
      person: "Hamid Moghadam",
      tickersOk: true,
      companies: [{ title: "PROLOGIS INC", ticker: "PLD", cik: "1045609" }],
      filingNames: ["Hamid Moghadam"],
    });
    expect(listed.finding).toContain("PROLOGIS INC");
    expect(listed.finding).toContain("CIK 1045609");
  });

  it("keeps the earlier live-app failures from reading as a pass", async () => {
    const zero = await resolveAddressCheck({ facts: facts({ location: "0 Nowhere Lane, NY 10001" }), watchlist: [], network: false });
    expect(zero?.status).toBe("FAIL");
    const graded = gradeChecks(
      [
        zero!,
        plausibilityCheck(facts({ name: "Nix Qwvzn", applicantName: "Nix Qwvzn", org: "Blorptex Qwvzn Builders LLC" })),
        row({ key: "website", status: "FAIL", weight: 8, finding: "domain does not resolve" }),
        row({ key: "rdap", status: "FAIL", weight: 2, reviewFlag: true, finding: "The domain is not registered." }),
      ],
      facts({ name: "Nix Qwvzn", applicantName: "Nix Qwvzn", org: "Blorptex Qwvzn Builders LLC", location: "0 Nowhere Lane, NY 10001" }),
    );
    expect(graded.summary.didNotCheckOut).not.toMatch(/^Nothing/);
    expect(graded.summary.didNotCheckOut.toLowerCase()).toContain("not registered");
    expect(graded.categories.find((category) => category.id === "completeness")?.reason).toContain("0 of 2");
    const ownSite = gradeChecks(
      [row({ key: "website", status: "PASS", weight: 8, companyOnly: true, selfReported: true, corroborates: false, finding: "Company: yes" })],
      facts(),
    );
    expect(ownSite.categories.find((category) => category.id === "company")?.reason).toContain("0 of");
    expect(socialLinksFrom('<a href="http://www.linkedin.com/company/6346">in</a>')[0].url).toBe("https://www.linkedin.com/company/6346");
  });

  it("does not pass a parent, affiliate, or the wrong company on EDGAR", () => {
    const unumOnly = assessEdgarMatch({
      org: "CBRE Group",
      person: "Robert Sulentic",
      tickersOk: true,
      companies: [{ title: "Unum Group", ticker: "UNM", cik: "5513" }],
      filingNames: [["Unum Group (UNM) (CIK 0000005513)", "SULENTIC ROBERT E"]],
    });
    expect(unumOnly.status).not.toBe("PASS");
    expect(unumOnly.corroborates).toBe(false);
    expect(unumOnly.finding.toLowerCase()).not.toContain("unum group");
    const wrongFiling = assessEdgarMatch({
      org: "CBRE Group",
      person: "Robert Sulentic",
      tickersOk: true,
      companies: [
        { title: "CBRE GROUP, INC.", ticker: "CBRE", cik: "1138118" },
        { title: "Unum Group", ticker: "UNM", cik: "5513" },
      ],
      filingNames: [["Unum Group (UNM) (CIK 0000005513)", "SULENTIC ROBERT E"]],
    });
    expect(wrongFiling.status).not.toBe("PASS");
    expect(wrongFiling.corroborates).toBe(false);
    expect(wrongFiling.companyOnly).toBe(true);
    expect(wrongFiling.finding).toContain("CBRE GROUP, INC.");
    expect(wrongFiling.finding.toLowerCase()).toContain("does not tie the person");
    expect(wrongFiling.finding.toLowerCase()).not.toContain("unum");
    const exact = assessEdgarMatch({
      org: "CBRE Group",
      person: "Robert Sulentic",
      tickersOk: true,
      companies: [
        { title: "CBRE GROUP, INC.", ticker: "CBRE", cik: "1138118" },
        { title: "Unum Group", ticker: "UNM", cik: "5513" },
      ],
      filingNames: [
        ["Unum Group (UNM) (CIK 0000005513)", "SULENTIC ROBERT E"],
        ["CBRE GROUP, INC. (CBRE) (CIK 0001138118)", "SULENTIC ROBERT E"],
      ],
    });
    expect(exact.status).toBe("PASS");
    expect(exact.corroborates).toBe(true);
    expect(exact.finding).toContain("CBRE GROUP, INC.");
    expect(exact.finding.toLowerCase()).not.toContain("unum");
    const affiliate = assessEdgarMatch({
      org: "Hines",
      person: "Jeff Hines",
      tickersOk: true,
      companies: [{ title: "HINES GLOBAL INCOME TRUST, INC.", ticker: "HGIT", cik: "1585101" }],
      filingNames: [["HINES GLOBAL INCOME TRUST, INC. (HGIT) (CIK 0001585101)", "HINES JEFF"]],
    });
    expect(affiliate.status).toBe("INCONCLUSIVE");
    expect(affiliate.status).not.toBe("PASS");
    expect(affiliate.corroborates).toBe(false);
    expect(affiliate.reviewFlag).not.toBe(true);
    expect(affiliate.finding).toContain("HINES GLOBAL INCOME TRUST");
    expect(affiliate.finding).toContain("EDGAR matched a different or related company; not credited");
    expect(affiliate.finding.toLowerCase()).not.toContain("parent match, needs review");
    expect(affiliate.finding.toLowerCase()).toContain("not credited");
    const affiliateGrade = gradeChecks(
      [row({ key: "edgar", status: affiliate.status, weight: 6, corroborates: false, reviewFlag: affiliate.reviewFlag, finding: affiliate.finding })],
      facts({ org: "Hines", name: "Jeff Hines" }),
    );
    expect(affiliateGrade.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    expect(affiliateGrade.categories.find((category) => category.id === "company")?.reason).not.toContain("6 of 6");
    expect(affiliateGrade.recommendation.startsWith("APPROVE")).toBe(false);
    expect(affiliateGrade.letter).not.toBe("C");
  });

  it("labels Brookfield and AECOM parent filers the same way and covers Arizona", () => {
    const companies = [
      { title: "Brookfield Property Partners L.P.", ticker: "BPYPN", cik: "1545772" },
      { title: "BROOKFIELD Corp /ON/", ticker: "BNH", cik: "1001085" },
      { title: "BROOKFIELD Corp /ON/", ticker: "BN", cik: "1001085" },
      { title: "AECOM", ticker: "ACM", cik: "868857" },
      { title: "Unum Group", ticker: "UNM", cik: "5513" },
    ];
    const brookfield = assessEdgarMatch({
      org: "Brookfield Properties",
      person: "Brian Kingston",
      tickersOk: true,
      companies,
      filingNames: [["BROOKFIELD Corp /ON/ (BN) (CIK 0001001085)"]],
    });
    const aecom = assessEdgarMatch({
      org: "AECOM Tishman",
      person: "Troy Rudd",
      tickersOk: true,
      companies,
      filingNames: [["AECOM (ACM) (CIK 0000868857)", "RUDD TROY"]],
    });
    for (const result of [brookfield, aecom]) {
      expect(result.status).toBe("INCONCLUSIVE");
      expect(result.status).not.toBe("PASS");
      expect(result.corroborates).toBe(false);
      expect(result.reviewFlag).toBe(true);
      expect(result.finding.toLowerCase()).toContain("parent match, needs review");
      expect(result.finding.toLowerCase()).toContain("not a pass");
      expect(result.finding.toLowerCase()).toContain("not credited");
      const graded = gradeChecks(
        [row({ key: "edgar", status: result.status, weight: 6, corroborates: false, reviewFlag: true, finding: result.finding })],
        facts({ org: "Brookfield Properties" }),
      );
      const reason = graded.categories.find((category) => category.id === "company")?.reason || "";
      expect(reason).toContain("Parent match, needs review");
      expect(reason).toContain("0 of 6");
      expect(reason).not.toContain("6 of 6");
      expect(graded.recommendation.startsWith("APPROVE")).toBe(false);
      expect(graded.letter).not.toBe("C");
    }
    expect(brookfield.finding).toContain("BROOKFIELD Corp /ON/");
    expect(brookfield.finding).toContain("(BN)");
    expect(brookfield.finding).not.toContain("Property Partners");
    expect(brookfield.finding.toLowerCase()).toContain("not named");
    expect(aecom.finding).toContain("AECOM");
    expect(aecom.finding).toContain("ACM");
    expect(aecom.finding.toLowerCase()).toContain("still not credited");
    expect(brookfield.finding.toLowerCase()).not.toContain("unum");
    expect(aecom.finding.toLowerCase()).not.toContain("unum");

    expect(statedUsState("Phoenix, Arizona")).toBe("AZ");
    expect(statedUsState("Phoenix, AZ")).toBe("AZ");
    expect(statedUsState("New York, New York")).toBe("NY");
    const phoenix = phoneStateCheck(facts({ phone: "602-555-0100", location: "Phoenix, Arizona" }));
    expect(phoenix.status).toBe("PASS");
    expect(phoenix.finding).toContain("602");
    expect(phoenix.finding).toContain("AZ");
    expect(phoneStateCheck(facts({ phone: "602-555-0100", location: "Scottsdale, AZ" })).status).toBe("PASS");
    const arizona = registryLinkCheck(facts({ location: "Phoenix, Arizona", org: "Desert Builders" }));
    expect(arizona.status).not.toBe("FAIL");
    expect(arizona.url).toBe("https://ecorp.azcc.gov/EntitySearch/Index");
    const ny = registryLinkCheck(facts({ location: "New York, New York", org: "Related Companies" }));
    expect(ny.status).not.toBe("FAIL");
    expect(ny.finding.toLowerCase()).not.toContain("outside the free us registry list");
    for (const location of ["Phoenix, Arizona", "Phoenix, AZ", "New York, New York", "Hartford, Connecticut", "Columbus, Ohio"]) {
      const graded = gradeChecks(
        [registryLinkCheck(facts({ location, org: "Desert Builders" })), phoneStateCheck(facts({ phone: "602-555-0100", location }))],
        facts({ location, phone: "602-555-0100", org: "Desert Builders" }),
      );
      const text = `${graded.plainText} ${graded.attention.map((item) => `${item.title} ${item.detail}`).join(" ")} ${graded.summary.didNotCheckOut}`;
      expect(text.toLowerCase()).not.toContain("outside the free us registry list");
      expect(graded.attention.some((item) => item.title === "No manual registry link for this state")).toBe(false);
      expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("registry");
    }
  });
});

describe("batch 9 fixtures", () => {
  const stein = { name: "Joshua Stein", org: "Joshua Stein PLLC", location: "New York, NY" };

  it("counts the applicant's name on a self-named firm's own site and own LinkedIn profile", () => {
    expect(firmContainsApplicantName("Joshua Stein PLLC", "Joshua Stein")).toBe(true);
    expect(firmContainsApplicantName("Rudin Management Company", "William Rudin")).toBe(false);
    expect(personHit("Joshua Stein PLLC", "Joshua Stein", "Joshua Stein PLLC")).toBe("none");
    expect(personHit("Joshua Stein PLLC", "Joshua Stein", "Joshua Stein PLLC", { ownFirm: true })).toBe("match");
    expect(personHit("Attorney Joshua Stein, Principal", "Joshua Stein", "Joshua Stein PLLC", { ownFirm: true })).toBe("match");
    expect(personHit("Attorney Mark Joshua Stein", "Joshua Stein", "Joshua Stein PLLC", { ownFirm: true })).toBe("none");
    expect(personHit("Joshua Stein, director of the Kansas City Jewish Chronicle", "Joshua Stein", "Joshua Stein PLLC")).toBe("none");
    expect(scorePublicText("Joshua Stein, director of the Kansas City Jewish Chronicle", stein).name).toBe(false);
    expect(scorePublicText("Attorney Mark Joshua Stein", stein).name).toBe(false);
    const ownSite = scorePublicText("Joshua Stein is principal of Joshua Stein PLLC in New York", stein, { ownFirm: true });
    expect(ownSite.name).toBe(true);
    expect(ownSite.company).toBe(true);
  });

  it("treats the self-named firm site and the person's LinkedIn profile as self-reported", async () => {
    const checks = await runPublicScreen(
      facts({
        name: "Joshua Stein",
        applicantName: "Joshua Stein",
        org: "Joshua Stein PLLC",
        website: "https://www.joshuastein.com",
        linkedinUrl: "https://www.linkedin.com/in/joshuasteinnyc",
        location: "New York, NY",
        role: "RE_ATTORNEY",
      }),
      async (url) => {
        if (url.includes("joshuastein.com")) {
          return { ok: true, status: 200, text: "<html><body>Joshua Stein PLLC. Joshua Stein is the principal in New York.</body></html>" };
        }
        if (url.includes("linkedin.com/in/joshuasteinnyc")) return { ok: true, status: 200, text: "Joshua Stein PLLC Principal New York" };
        return { ok: false, status: 403, text: "blocked" };
      },
    );
    const website = checks.find((check) => check.key === "website");
    const linkedin = checks.find((check) => check.key === "linkedin-fetch");
    expect(website?.finding).toContain("Name: yes");
    expect(website?.finding).toContain("Company: yes");
    expect(website?.selfReported).toBe(true);
    expect(website?.corroborates).toBe(false);
    expect(linkedin?.finding).toContain("Name: yes");
    expect(linkedin?.selfReported).toBe(true);
    expect(linkedin?.corroborates).toBe(false);
  });

  it("keeps a typed ticker that matches the website, and does not treat that brand as an alias", () => {
    expect(mentionsCompany("Christian Ulbrich is CEO of JLL", "JLL", "Christian Ulbrich")).toBe(true);
    expect(brandAliases("JLL", "https://www.jll.com")).not.toContain("jll");
    const headline = judgeHeadline("JLL names Christian Ulbrich CEO in Chicago", {
      name: "Christian Ulbrich",
      org: "JLL",
      location: "Chicago, IL",
      website: "https://www.jll.com",
    });
    expect(headline.company).toBe(true);
    expect(headline.aliasOnly).toBe(false);
    const rows = [
      { title: "JONES LANG LASALLE INC", ticker: "JLL", cik: "1037976" },
      { title: "ABC INC", ticker: "ABC", cik: "9" },
    ];
    expect(edgarTickerDomainMatch(rows, "JLL", "https://www.jll.com")?.cik).toBe("1037976");
    expect(edgarTickerDomainMatch(rows, "ABC LLC", "https://www.ormsleyvantage.com")).toBeNull();
    expect(edgarTickerDomainMatch(rows, "ABC LLC", "")).toBeNull();
    expect(edgarTickerDomainMatch(rows, "JLL", "https://www.example.com")).toBeNull();
    const named = assessEdgarMatch({
      org: "JLL",
      person: "Christian Ulbrich",
      website: "https://www.jll.com",
      tickersOk: true,
      companies: rows,
      filingNames: [],
      insiderNames: [["JONES LANG LASALLE INC (JLL) (CIK 0001037976)", "Ulbrich Christian (CIK 0001452692)"]],
    });
    expect(named.status).toBe("PASS");
    expect(named.corroborates).toBe(true);
    expect(named.finding).toContain("JONES LANG LASALLE INC");
    expect(named.finding).toContain("1037976");
    expect(named.finding).toContain("Ulbrich Christian");
    const bare = assessEdgarMatch({
      org: "JLL",
      person: "Christian Ulbrich",
      tickersOk: true,
      companies: rows,
      filingNames: [],
    });
    expect(bare.finding).toContain("No company on the SEC list uses this firm's name");
    expect(bare.corroborates).toBe(false);
    const brookfield = assessEdgarMatch({
      org: "Brookfield Properties",
      person: "QA TestAF",
      website: "https://www.brookfieldproperties.com",
      tickersOk: true,
      companies: [
        { title: "BROOKFIELD Corp /ON/", ticker: "BN", cik: "1001085" },
        { title: "Brookfield Properties, Inc.", ticker: "", cik: "1680277" },
      ],
      filingNames: [],
    });
    expect(brookfield.status).toBe("INCONCLUSIVE");
    expect(brookfield.companyOnly).toBe(true);
    expect(brookfield.corroborates).toBe(false);
    expect(brookfield.finding).toContain("1680277");
    expect(brookfield.finding.toLowerCase()).not.toContain("parent match");
  });

  it("corroborates a Form 4 reporting owner on the company CIK", async () => {
    expect(insiderSearchUrl("Capasse", "1527590", "4")).toBe(
      "https://efts.sec.gov/LATEST/search-index?q=%22Capasse%22&forms=4&ciks=0001527590",
    );
    const ready = assessEdgarMatch({
      org: "Ready Capital Corporation",
      person: "Thomas Capasse",
      tickersOk: true,
      companies: [{ title: "READY CAPITAL CORP", ticker: "RC", cik: "1527590" }],
      filingNames: [],
      insiderNames: [["READY CAPITAL CORP (RC) (CIK 0001527590)", "Capasse Thomas E (CIK 0001469065)"]],
    });
    expect(ready.status).toBe("PASS");
    expect(ready.corroborates).toBe(true);
    expect(ready.finding).toContain("Capasse Thomas E");
    expect(ready.finding).toContain("1527590");
    expect(ready.finding.toLowerCase()).toContain("reporting owner");
    const nameOnly = assessEdgarMatch({
      org: "Ready Capital Corporation",
      person: "Thomas Capasse",
      tickersOk: true,
      companies: [{ title: "READY CAPITAL CORP", ticker: "RC", cik: "1527590" }],
      filingNames: [],
    });
    expect(nameOnly.status).toBe("INCONCLUSIVE");
    expect(nameOnly.companyOnly).toBe(true);
    expect(nameOnly.corroborates).toBe(false);
    clearEdgarTickerCache();
    const urls: string[] = [];
    const looked = await lookupEdgar("Ready Capital Corporation", "Thomas Capasse", async (url) => {
      urls.push(url);
      if (url.includes("company_tickers")) {
        return { ok: true, status: 200, text: JSON.stringify({ "0": { title: "READY CAPITAL CORP", ticker: "RC", cik_str: 1527590 } }) };
      }
      if (url.includes("forms=4") && url.includes("ciks=0001527590") && url.includes("Capasse")) {
        return {
          ok: true,
          status: 200,
          text: JSON.stringify({
            hits: { hits: [{ _source: { display_names: ["READY CAPITAL CORP (RC) (CIK 0001527590)", "Capasse Thomas E (CIK 0001469065)"] } }] },
          }),
        };
      }
      return { ok: true, status: 200, text: JSON.stringify({ hits: { hits: [] } }) };
    });
    clearEdgarTickerCache();
    expect(urls.some((url) => url.includes("forms=3") && url.includes("ciks=0001527590"))).toBe(true);
    expect(urls.some((url) => url.includes("forms=4") && url.includes("ciks=0001527590"))).toBe(true);
    expect(urls.some((url) => url.includes("forms=5") && url.includes("ciks=0001527590"))).toBe(true);
    expect(looked.status).toBe("PASS");
    expect(looked.corroborates).toBe(true);
    expect(looked.finding).toContain("Capasse Thomas E");
  });

  it("gives a few company-exists points a dead domain cannot get, and does not approve", () => {
    const live = gradeChecks(
      [
        row({ key: "website", status: "PASS", companyOnly: true, selfReported: true, corroborates: false, finding: "company confirmed, person NOT confirmed" }),
        row({ key: "linkedin-fetch", status: "PASS", companyOnly: true, corroborates: false, finding: "company confirmed, person NOT confirmed" }),
        row({ key: "business-registry", status: "PASS", corroborates: false, finding: "New York lists Brookfield Properties." }),
      ],
      facts({ name: "QA TestAF", applicantName: "QA TestAF", org: "Brookfield Properties", website: "https://www.brookfieldproperties.com", role: "DEVELOPER" }),
    );
    const fake = gradeChecks(
      [row({ key: "website", status: "FAIL", finding: "domain does not resolve" })],
      facts({
        name: "Thaddeus Brinkwell",
        applicantName: "Thaddeus Brinkwell",
        org: "Ormsley Vantage Lending Partners LLC",
        website: "https://www.ormsleyvantage.com",
        role: "LENDER",
      }),
    );
    expect(live.letter).toBe("F");
    expect(fake.letter).toBe("F");
    expect(live.score).toBeGreaterThan(fake.score);
    expect(live.recommendation).toBe("NEEDS MORE INFO");
    expect(live.recommendation).not.toBe("DECLINE");
    expect(fake.recommendation.startsWith("APPROVE")).toBe(false);
    expect(live.summary.reasoning.toLowerCase()).toContain("company confirmed, person not confirmed");
    expect(live.summary.reasoning.toLowerCase()).toContain("not a rejection");
    expect(fake.summary.reasoning.toLowerCase()).not.toContain("company confirmed");
    expect(live.attention.some((item) => item.detail.toLowerCase().includes("company confirmed, person not confirmed"))).toBe(true);
  });

  it("shows a court no-record as inconclusive, never a pass", () => {
    const none = assessCourts(JSON.stringify({ results: [] }), { ok: true, status: 200 }, facts({ name: "QA TestAB", org: "Skanska USA Building" }));
    expect(none.status).toBe("INCONCLUSIVE");
    expect(none.status).not.toBe("PASS");
    expect(none.weight).toBe(0);
    expect(none.corroborates).toBe(false);
    expect(none.finding).toContain("None found");
    expect(none.finding).toContain("Not checkable for free.");
    const graded = gradeChecks([row(none)], facts({ name: "QA TestAB", org: "Skanska USA Building" }));
    expect(graded.summary.checkedOut.toLowerCase()).not.toContain("courtlistener");
    expect(graded.summary.company.toLowerCase()).toContain("not a risk flag");
  });
});

describe("batch 10 fixtures", () => {
  const ibp = { title: "Installed Building Products, Inc.", ticker: "IBP", cik: "1580905" };

  it("counts RXR on rxr.com, including a headline that says RXR CEO", () => {
    expect(mentionsCompany("RXR CEO says", "RXR")).toBe(true);
    const headline = judgeHeadline("RXR CEO Scott Rechler says the tower is open", {
      name: "Scott Rechler",
      applicantName: "Scott Rechler",
      org: "RXR",
      location: "New York, NY",
      website: "https://www.rxr.com",
    });
    expect(headline.person).toBe(true);
    expect(headline.company).toBe(true);
    expect(headline.aliasOnly).toBe(false);
    expect(socialSearchQuery("Scott Rechler", "RXR")).toContain("rxr");
  });

  it("does not treat Installed Building Products as the parent of STO Building Group", () => {
    const sto = assessEdgarMatch({
      org: "STO Building Group",
      person: "Robert Mullen",
      tickersOk: true,
      companies: [ibp, { title: "BUILDING SYSTEMS INC", ticker: "", cik: "1" }],
      filingNames: [],
    });
    expect(sto.finding).not.toContain("Installed Building");
    expect(sto.finding).not.toContain("1580905");
    expect(sto.finding.toLowerCase()).not.toContain("parent match");
    expect(sto.reviewFlag).not.toBe(true);
    expect(sto.corroborates).toBe(false);
    const invented = assessEdgarMatch({
      org: "ZZZ Building LLC",
      person: "Pat Example",
      tickersOk: true,
      companies: [ibp],
      filingNames: [],
    });
    expect(invented.finding).not.toContain("Installed Building");
    expect(invented.finding.toLowerCase()).not.toContain("parent match");
    expect(companySearchTerm("STO Building Group", "Robert Mullen")).toBe("sto building group");
    expect(socialSearchQuery("Robert Mullen", "STO Building Group")).toBe('"Robert Mullen" "sto building group"');
    expect(instagramCompanyTag("STO Building Group", "Robert Mullen")).not.toBe("building");
  });

  it("does not treat Meridian Corp as the parent of Meridian Capital Group", () => {
    const meridian = assessEdgarMatch({
      org: "Meridian Capital Group",
      person: "Ralph Herzka",
      tickersOk: true,
      companies: [{ title: "Meridian Corp", ticker: "MRBK", cik: "1750735" }],
      filingNames: [["Meridian Corp (MRBK) (CIK 0001750735)"]],
    });
    expect(meridian.finding.toLowerCase()).not.toContain("parent match");
    expect(meridian.finding).not.toContain("1750735");
    expect(meridian.finding).not.toContain("MRBK");
    expect(meridian.corroborates).toBe(false);
    const brookfield = assessEdgarMatch({
      org: "Brookfield Properties",
      person: "Brian Kingston",
      tickersOk: true,
      companies: [
        { title: "Meridian Corp", ticker: "MRBK", cik: "1750735" },
        { title: "BROOKFIELD Corp /ON/", ticker: "BN", cik: "1001085" },
      ],
      filingNames: [],
    });
    expect(brookfield.finding.toLowerCase()).toContain("parent match, needs review");
    expect(brookfield.finding).toContain("BN");
  });

  it("keeps Brookfield and AECOM as parent matches and awards points only when a page links the parent", () => {
    const companies = [
      { title: "BROOKFIELD Corp /ON/", ticker: "BN", cik: "1001085" },
      { title: "AECOM", ticker: "ACM", cik: "868857" },
      ibp,
    ];
    const brookfield = assessEdgarMatch({
      org: "Brookfield Properties",
      person: "Brian Kingston",
      tickersOk: true,
      companies,
      filingNames: [],
    });
    const aecom = assessEdgarMatch({
      org: "AECOM Tishman",
      person: "Troy Rudd",
      tickersOk: true,
      companies,
      filingNames: [],
    });
    for (const result of [brookfield, aecom]) {
      expect(result.finding.toLowerCase()).toContain("parent match, needs review");
      expect(result.status).not.toBe("PASS");
      expect(result.corroborates).toBe(false);
    }
    expect(brookfield.finding).not.toContain("Installed Building");
    const edgar = row({ key: "edgar", status: "INCONCLUSIVE", corroborates: false, reviewFlag: true, finding: brookfield.finding });
    const unlinked = gradeChecks([edgar], facts({ org: "Brookfield Properties", name: "Brian Kingston" }));
    expect(unlinked.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    const linked = gradeChecks(
      [edgar, row({ key: "news", status: "PASS", corroborates: true, finding: "Brookfield Properties is a subsidiary of Brookfield Corp." })],
      facts({ org: "Brookfield Properties", name: "Brian Kingston" }),
    );
    expect(linked.categories.find((category) => category.id === "company")?.reason).toContain("3 of 6");
    const sameNameOnly = gradeChecks(
      [edgar, row({ key: "news", status: "PASS", corroborates: true, finding: "Brian Kingston leads Brookfield Properties." })],
      facts({ org: "Brookfield Properties", name: "Brian Kingston" }),
    );
    expect(sameNameOnly.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
  });

  it("counts a Lawdragon piece about Adam Leitman Bailey and does not search his name twice", () => {
    const org = "Adam Leitman Bailey, P.C.";
    const person = "Adam Leitman Bailey";
    expect(firmContainsApplicantName(org, person)).toBe(true);
    expect(personHit("Adam Leitman Bailey, P.C. represents owners", person, org, { ownFirm: true })).toBe("match");
    expect(personHit("Lawdragon honors Adam Leitman Bailey", person, org)).toBe("match");
    expect(personHit("Attorney Mark Adam Leitman Bailey", person, org)).toBe("none");
    const lawdragon = judgeHeadline("Lawdragon honors Adam Leitman Bailey", {
      name: person,
      applicantName: person,
      org,
      location: "New York, NY",
      website: "https://www.alblawfirm.com",
    });
    expect(lawdragon.person).toBe(true);
    expect(lawdragon.company).toBe(true);
    expect(lawdragon.aliasOnly).toBe(false);
    expect(socialSearchQuery(person, org)).toBe('"Adam Leitman Bailey"');
    expect(socialSearchQuery(person, org).match(/Adam Leitman Bailey/gi)).toHaveLength(1);
    expect(instagramCompanyTag(org, person)).not.toBe("adamleitmanbailey");
    expect(personHit("Joshua Stein, director of the Kansas City Jewish Chronicle", "Joshua Stein", "Joshua Stein PLLC")).toBe("none");
  });

  it("quotes Gilbane Building Company instead of the word building, and keeps Jr. in the court query", () => {
    expect(companySearchTerm("Gilbane Building Company", "Thomas Gilbane Jr.")).toBe("gilbane building company");
    expect(companySearchTerm("Gilbane Building Company", "Thomas Gilbane Jr.")).not.toBe("building");
    expect(socialSearchQuery("Thomas Gilbane Jr.", "Gilbane Building Company")).toBe('"Thomas Gilbane" "gilbane building company"');
    expect(instagramCompanyTag("Gilbane Building Company", "Thomas Gilbane Jr.")).not.toBe("building");
    expect(courtSearchQuery("Thomas Gilbane Jr.")).toBe('"Thomas Gilbane Jr."');
    expect(courtSearchQuery("Thomas Gilbane Junior")).toBe('"Thomas Gilbane Jr."');
    expect(courtSearchQuery("Thomas Gilbane III")).toBe('"Thomas Gilbane III"');
  });

  it("does not list criminal captions when no opinion names the company", () => {
    const courts = assessCourts(
      JSON.stringify({
        results: [
          { caseName: "United States v. Robert Mullen", snippet: "The indictment names Robert Mullen." },
          { caseName: "STATE of Louisiana v. Robert MULLEN", snippet: "" },
        ],
      }),
      { ok: true, status: 200 },
      facts({ name: "Robert Mullen", org: "STO Building Group" }),
    );
    expect(courts.status).toBe("INCONCLUSIVE");
    expect(courts.weight).toBe(0);
    expect(courts.corroborates).not.toBe(true);
    expect(courts.finding).toMatch(/2 opinions name a person with this name; none name the company/);
    expect(courts.finding).not.toContain("United States v");
    expect(courts.finding).not.toContain("Louisiana");
    expect(courts.finding.toLowerCase()).not.toContain("possible match");
  });

  it("matches Willy Walker to William on a Form 4 and skips Walker Harris's LinkedIn slug", async () => {
    expect(mentionsPerson("Walker William M (CIK 0001503841)", "Willy Walker")).toBe(true);
    expect(insiderSearchUrl("Walker", "1497770", "4")).toContain("ciks=0001497770");
    expect(insiderSearchUrl("Walker", "1497770", "4")).toContain("%22Walker%22");
    const edgar = assessEdgarMatch({
      org: "Walker & Dunlop",
      person: "Willy Walker",
      website: "https://www.walkerdunlop.com",
      tickersOk: true,
      companies: [{ title: "WALKER & DUNLOP, INC.", ticker: "WD", cik: "1497770" }],
      filingNames: [],
      insiderNames: [["Walker William M (CIK 0001503841)"]],
    });
    expect(edgar.status).toBe("PASS");
    expect(edgar.corroborates).toBe(true);
    expect(edgar.finding).toContain("Walker William M");
    expect(edgar.finding).toContain("1497770");
    expect(linkedinProfileMatchesPerson("https://www.linkedin.com/in/walkerharris/", "Willy Walker")).toBe(false);
    expect(linkedinProfileMatchesPerson("https://www.linkedin.com/in/william-walker/", "Willy Walker")).toBe(true);
    expect(linkedinProfileMatchesPerson("https://www.linkedin.com/in/willywalker/", "Willy Walker")).toBe(true);
    expect(linkedinProfileMatchesPerson("https://www.linkedin.com/in/walker-william/", "Willy Walker")).toBe(false);
    expect(linkedinProfileMatchesPerson("https://www.linkedin.com/company/walker-dunlop/", "Willy Walker")).toBe(true);
    const fetched: string[] = [];
    const checks = await runPublicScreen(
      facts({
        name: "Willy Walker",
        applicantName: "Willy Walker",
        org: "Walker & Dunlop",
        website: "https://www.walkerdunlop.com",
        linkedinUrl: "",
        location: "Bethesda, MD",
      }),
      async (url) => {
        fetched.push(url);
        if (url.includes("walkerdunlop.com")) {
          return {
            ok: true,
            status: 200,
            text: `<html><body><p>Willy Walker is chief executive of Walker & Dunlop.</p><a href="https://www.linkedin.com/in/walkerharris/">Walker Harris</a><a href="https://www.linkedin.com/in/william-walker/">William Walker</a></body></html>`,
          };
        }
        if (url.includes("william-walker")) {
          return { ok: true, status: 200, text: "William Walker chief executive of Walker & Dunlop" };
        }
        if (url.includes("walkerharris")) {
          return { ok: true, status: 200, text: "Walker Harris SVP Co-Head of Multifamily at Walker & Dunlop" };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    expect(fetched.some((url) => url.includes("walkerharris"))).toBe(false);
    const linkedin = checks.find((check) => check.key === "linkedin-fetch");
    expect(linkedin?.url || "").toContain("william-walker");
    expect(linkedin?.url || "").not.toContain("walkerharris");
    expect(linkedin?.corroborates).toBe(true);
  });

  it("keeps an unregistered fake at least 15 points under a corroborated short-brand file", () => {
    const shared = ["email-syntax", "disposable-email", "role-address", "text-risk", "duplicate", "sanctions", "invite-source", "plausibility", "velocity"].map((key) =>
      row({ key, status: "PASS", corroborates: false, finding: "pass" }),
    );
    const fake = gradeChecks(
      [
        ...shared,
        row({ key: "website", status: "FAIL", reviewFlag: true, finding: "Searched: https://www.ormsleyvantage.com. domain does not resolve." }),
        row({ key: "rdap", status: "FAIL", reviewFlag: true, finding: "domain is not registered." }),
      ],
      facts({
        name: "Thaddeus Brinkwell",
        applicantName: "Thaddeus Brinkwell",
        org: "Ormsley Vantage Lending Partners LLC",
        website: "https://www.ormsleyvantage.com",
        role: "LENDER",
      }),
    );
    const real = gradeChecks(
      [
        ...shared,
        row({ key: "website", status: "PASS", selfReported: true, corroborates: false, finding: "Name: yes. Company: yes." }),
        row({ key: "rdap", status: "PASS", finding: "A domain record responded." }),
        row({
          key: "news",
          status: "PASS",
          corroborates: true,
          finding: "A headline names the person and the company. RXR CEO Scott Rechler says the tower is open.",
        }),
        row({
          key: "web-footprint",
          status: "PASS",
          corroborates: true,
          finding: "A public web result names the person and the company. RXR CEO Scott Rechler says the tower is open.",
        }),
      ],
      facts({
        name: "Scott Rechler",
        applicantName: "Scott Rechler",
        org: "RXR",
        website: "https://www.rxr.com",
        role: "DEVELOPER",
      }),
    );
    const company = fake.categories.find((category) => category.id === "company")?.reason || "";
    expect(company).toContain("domain does not resolve");
    expect(company).toContain("domain is not registered");
    expect(fake.letter).toBe("F");
    expect(fake.recommendation.startsWith("APPROVE")).toBe(false);
    expect(real.score - fake.score).toBeGreaterThanOrEqual(15);
    const companyOnlySite = gradeChecks(
      [row({ key: "website", status: "PASS", selfReported: true, corroborates: false, finding: "Name: yes. Company: yes." })],
      facts({ name: "Scott Rechler", applicantName: "Scott Rechler", org: "RXR", website: "https://www.rxr.com" }),
    );
    expect(companyOnlySite.categories.find((category) => category.id === "company")?.reason).toContain("No outside source confirmed the company");
    expect(companyOnlySite.categories.find((category) => category.id === "company")?.reason).toContain("0 of 8");
    expect(companyOnlySite.letter).toBe("F");
    expect(companyOnlySite.recommendation.startsWith("APPROVE")).toBe(false);
  });

  it("treats a self-named firm's LinkedIn company page as self-reported", async () => {
    const checks = await runPublicScreen(
      facts({
        name: "Adam Leitman Bailey",
        applicantName: "Adam Leitman Bailey",
        org: "Adam Leitman Bailey, P.C.",
        website: "https://www.alblawfirm.com",
        linkedinUrl: "",
        location: "New York, NY",
      }),
      async (url) => {
        if (url.includes("alblawfirm.com")) {
          return {
            ok: true,
            status: 200,
            text: `<html><body><a href="https://www.linkedin.com/company/adam-leitman-bailey-p.c./">Adam Leitman Bailey, P.C.</a></body></html>`,
          };
        }
        if (url.includes("linkedin.com/company/")) {
          return { ok: true, status: 200, text: "Adam Leitman Bailey, P.C. New York real estate attorneys" };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    const linkedin = checks.find((check) => check.key === "linkedin-fetch");
    expect(linkedin?.url || "").toContain("/company/");
    expect(linkedin?.corroborates).not.toBe(true);
    expect(linkedin?.selfReported).toBe(true);
  });
});

describe("batch 11 report wording and Vesey Street", () => {
  const brookfieldFinding =
    "EDGAR lists Brookfield Properties, Inc., CIK 1680277. A name-only company match is inconclusive and does not corroborate. It does not tie the person to the firm.";

  it("says one thing about a name-only EDGAR hit and a discovered LinkedIn company page", () => {
    const graded = gradeChecks(
      [
        row({
          key: "edgar",
          status: "INCONCLUSIVE",
          companyOnly: true,
          corroborates: false,
          source: "SEC EDGAR",
          finding: brookfieldFinding,
        }),
        row({
          key: "linkedin-format",
          status: "INCONCLUSIVE",
          finding: "No LinkedIn URL was provided.",
          source: "Local URL check",
        }),
        row({
          key: "linkedin-fetch",
          status: "PASS",
          companyOnly: true,
          corroborates: false,
          source: "LinkedIn",
          url: "https://www.linkedin.com/company/brookfield-properties/",
          finding: "The LinkedIn company page names Brookfield Properties. Company: yes. Name: no.",
        }),
      ],
      facts({
        name: "QA-TEST Bravo",
        applicantName: "QA-TEST Bravo",
        org: "Brookfield Properties",
        location: "250 Vesey St, New York, NY 10281",
        linkedinUrl: "",
        website: "https://www.brookfieldproperties.com",
      }),
    );
    const text = graded.plainText;
    expect(graded.summary.company).toContain("Brookfield Properties, Inc.");
    expect(graded.summary.company).toContain("CIK 1680277");
    expect(graded.summary.company.toLowerCase()).toContain("name-only company match is inconclusive");
    expect(graded.summary.couldNotCheck).not.toContain("SEC EDGAR came back without a usable match");
    expect(text).not.toContain("came back without a usable match");
    expect(graded.summary.checkedOut).toContain("The LinkedIn company page confirms the company.");
    expect(graded.summary.checkedOut).toContain("Company confirmed, person not confirmed");
    expect(text).not.toContain("LinkedIn link came back without a usable match");
    expect(graded.attention.some((item) => item.title === "No LinkedIn URL")).toBe(false);
    expect(graded.summary.couldNotCheck).toContain("No LinkedIn URL was on the application.");
    expect(graded.summary.couldNotCheck).toContain("A LinkedIn company page was still found");
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain(
      "EDGAR lists this exact company name. A name-only match is inconclusive",
    );
    expect(text).not.toMatch(/(?:^|[.!?]\s+)(?:company confirmed|address did not|domain does not|did not check out)/);
  });

  it("passes 250 Vesey Street when Nominatim matches and Census does not", async () => {
    expect(streetGeocodeForms("250 Vesey St")).toEqual(["250 Vesey Street", "250 Vesey St"]);
    expect(expandStreetSuffix("4600 Silver Hill Rd.")).toBe("4600 Silver Hill Road");
    const nominatim = JSON.stringify([
      {
        address: {
          house_number: "250",
          road: "Vesey Street",
          city: "New York",
          state: "New York",
          postcode: "10281",
        },
      },
    ]);
    expect(assessNominatimBody(nominatim, { street: "250 Vesey St", city: "New York", state: "NY", zip: "10281" })).toBe("match");
    const urls: string[] = [];
    const address = await resolveAddressCheck({
      facts: facts({ location: "250 Vesey St, New York, NY 10281" }),
      watchlist: [],
      network: true,
      fetchText: async (url) => {
        urls.push(url);
        if (url.includes("nominatim.openstreetmap.org")) {
          expect(decodeURIComponent(url).replace(/\+/g, " ")).toContain("250 Vesey Street");
          expect(url).toContain("postalcode=10281");
          return { ok: true, status: 200, text: nominatim };
        }
        expect(url).toContain("geocoding.geo.census.gov");
        return { ok: true, status: 200, text: JSON.stringify({ result: { addressMatches: [] } }) };
      },
    });
    expect(urls.filter((url) => url.includes("geocoding.geo.census.gov")).length).toBeGreaterThan(0);
    expect(address?.status).toBe("PASS");
    expect(address?.finding).toContain("OpenStreetMap Nominatim matched this street address");
    expect(address?.finding).toContain("The Census geocoder returned no match");
    const graded = gradeChecks([address!], facts({ location: "250 Vesey St, New York, NY 10281" }));
    expect(graded.summary.checkedOut).toContain("OpenStreetMap Nominatim matched this street address");
    expect(graded.summary.couldNotCheck.toLowerCase()).not.toContain("nominatim matched");
    expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("address did not check out");
    expect(graded.attention.some((item) => /address did not check out/i.test(item.detail))).toBe(false);
  });
});

describe("batch 12 former names, registry links, geocoder misses, and missing companies", () => {
  const brookfieldIdentity = {
    currentName: "BPI Property Inc.",
    formerNames: ["BP US REIT LLC", "Brookfield Properties, Inc."],
  };
  const brookfieldCompanies = [{ title: "Brookfield Properties, Inc.", ticker: "", cik: "1680277" }];

  it("treats a former EDGAR name as needs review, shows both names, and does not suggest Pass", () => {
    const payload = JSON.stringify({
      name: "BPI Property Inc.",
      formerNames: [
        { name: "BP US REIT LLC" },
        { name: "Brookfield Properties, Inc." },
      ],
    });
    expect(parseSubmissionsIdentity(payload)?.currentName).toBe("BPI Property Inc.");
    expect(submissionsUrl("1680277")).toBe("https://data.sec.gov/submissions/CIK0001680277.json");
    expect(matchedNameIsFormer("Brookfield Properties", "Brookfield Properties, Inc.", brookfieldIdentity)).toBe(true);
    expect(matchedNameIsFormer("CBRE Group", "CBRE GROUP INC", { currentName: "CBRE GROUP INC", formerNames: [] })).toBe(false);
    expect(matchedNameIsFormer("BPI Property Inc.", "BPI Property Inc.", brookfieldIdentity)).toBe(false);

    const former = assessEdgarMatch({
      org: "Brookfield Properties",
      person: "QA Test Person",
      tickersOk: true,
      companies: brookfieldCompanies,
      filingNames: [],
      identity: brookfieldIdentity,
    });
    expect(former.status).toBe("INCONCLUSIVE");
    expect(former.reviewFlag).toBe(true);
    expect(former.companyOnly).not.toBe(true);
    expect(former.corroborates).toBe(false);
    expect(former.finding).toContain("BPI Property Inc.");
    expect(former.finding).toContain("Brookfield Properties, Inc.");
    expect(former.finding).toContain("1680277");
    expect(former.finding.toLowerCase()).toContain("former name");
    expect(former.finding.toLowerCase()).toContain("needs review");

    const graded = gradeChecks(
      [
        row({ key: "edgar", status: former.status, reviewFlag: true, finding: former.finding, url: former.url, source: "SEC EDGAR" }),
        row({
          key: "website",
          status: "PASS",
          companyOnly: true,
          selfReported: true,
          url: "https://www.brookfieldproperties.com/",
          finding: "Company: yes. The company's own site names the company.",
          source: "Company website",
        }),
        plausibilityCheck(facts({ name: "Alex Morgan", applicantName: "Alex Morgan", org: "Brookfield Properties" })),
      ],
      facts({ name: "Alex Morgan", applicantName: "Alex Morgan", org: "Brookfield Properties", website: "https://www.brookfieldproperties.com/" }),
    );
    expect(graded.summary.company).toContain("BPI Property Inc.");
    expect(graded.summary.company).toContain("former name");
    expect(graded.summary.company).not.toContain("No EDGAR filing was confirmed");
    const company = graded.categories.find((category) => category.id === "company");
    expect(company?.reason).toContain("0 of 6");
    expect(company?.reason.toLowerCase()).toContain("former");
    expect(companyCouldNotBeFound(graded ? [
      row({ key: "website", status: "PASS", companyOnly: true, finding: "Company: yes", url: "https://www.brookfieldproperties.com/" }),
      row({ key: "edgar", status: "INCONCLUSIVE", reviewFlag: true, finding: former.finding }),
    ] : [])).toBe(false);

    const current = assessEdgarMatch({
      org: "CBRE Group",
      person: "QA Test Person",
      tickersOk: true,
      companies: [{ title: "CBRE GROUP INC", ticker: "CBRE", cik: "1138118" }],
      filingNames: [],
      identity: { currentName: "CBRE GROUP INC", formerNames: ["CBRE CORP"] },
    });
    expect(current.finding).toContain("CBRE GROUP INC");
    expect(current.finding).toContain("1138118");
    expect(current.finding.toLowerCase()).not.toContain("former name");
    expect(current.companyOnly).toBe(true);
  });

  it("uses the Arizona registry sentence and a state link for Rhode Island", () => {
    const rhodeIsland = registryLinkCheck(facts({ location: "Providence, RI", org: "Gilbane Building Company" }));
    expect(rhodeIsland.status).toBe("NOT_RUN");
    expect(rhodeIsland.url).toBe("https://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx");
    expect(rhodeIsland.finding).toContain("Couldn't check for free. No free RI registry API. Open the state search and look up Gilbane Building Company.");
    expect(rhodeIsland.finding).not.toContain("No stable free registry API");
    expect(rhodeIsland.finding).not.toContain("Search the secretary of state manually");
    const arizona = registryLinkCheck(facts({ location: "Phoenix, Arizona", org: "Desert Builders" }));
    expect(arizona.finding).toContain("No free AZ registry API. Open the state search and look up Desert Builders.");
    expect(arizona.url).toBe("https://ecorp.azcc.gov/EntitySearch/Index");
    for (const state of ["AL", "OH", "WY", "RI"]) {
      const link = registryLinkCheck(facts({ location: `Capital City, ${state}`, org: "Sample Builders" }));
      expect(link.url).toMatch(/^https:\/\//);
      expect(link.finding).toContain(`No free ${state} registry API`);
    }
  });

  it("does not list a geocoder miss as a failure, and still fails a placeholder or an explicit invalid address", async () => {
    const plaza = JSON.stringify([
      {
        address: {
          building: "One New York Plaza",
          house_number: "1",
          road: "Water Street",
          city: "New York",
          state: "New York",
          postcode: "10004",
        },
      },
    ]);
    expect(assessNominatimBody(plaza, { street: "One New York Plaza", city: "New York", state: "NY", zip: "10004" })).toBe("match");
    const wrongPlaza = JSON.stringify([
      {
        address: {
          house_number: "1",
          road: "Kingsbridge Plaza",
          city: "City of Mount Vernon",
          state: "New York",
          postcode: "10550",
        },
      },
    ]);
    expect(assessNominatimBody(wrongPlaza, { street: "1 New York Plaza", city: "New York", state: "NY", zip: "10004" })).toBe("none");
    expect(geocoderSaysAddressInvalid(JSON.stringify({ result: { addressMatches: [] } }))).toBe(false);
    expect(geocoderSaysAddressInvalid("The address is invalid.")).toBe(true);

    const missed = await resolveAddressCheck({
      facts: facts({ location: "1 New York Plaza, New York, NY 10004" }),
      watchlist: [],
      network: true,
      fetchText: async (url) => {
        if (url.includes("nominatim")) return { ok: true, status: 200, text: wrongPlaza };
        return { ok: true, status: 200, text: JSON.stringify({ result: { addressMatches: [] } }) };
      },
    });
    expect(missed?.status).toBe("INCONCLUSIVE");
    expect(missed?.finding.toLowerCase()).toContain("could not check");
    expect(missed?.finding.toLowerCase()).toContain("inconclusive");
    const missedGrade = gradeChecks([missed!], facts({ location: "1 New York Plaza, New York, NY 10004" }));
    expect(missedGrade.summary.couldNotCheck.toLowerCase()).toContain("could not check");
    expect(missedGrade.summary.didNotCheckOut.toLowerCase()).not.toContain("address");

    const box = assessLocalAddress("P.O. Box 12, Phoenix, AZ 85001");
    expect(box.kind).toBe("invalid");
    if (box.kind === "invalid") expect(box.finding.toLowerCase()).toContain("p.o. box");
    const nowhere = await resolveAddressCheck({
      facts: facts({ location: "0 Nowhere Lane, New York, NY 10001" }),
      watchlist: [],
      network: false,
    });
    expect(nowhere?.status).toBe("FAIL");
    expect(nowhere?.finding.toLowerCase()).toContain("did not check out");

    const invalid = await resolveAddressCheck({
      facts: facts({ location: "9 Main Street, Newark, NJ 07102" }),
      watchlist: [],
      network: true,
      fetchText: async () => ({ ok: true, status: 200, text: "This address is invalid." }),
    });
    expect(invalid?.status).toBe("FAIL");
    expect(invalid?.finding.toLowerCase()).toContain("did not check out");
    expect(invalid?.finding.toLowerCase()).toContain("invalid");
  });

  it("flags an unregistered domain with no company evidence and scores it below a company-confirmed file", () => {
    expect(tokenLooksGibberish("Throvnik")).toBe(false);
    expect(tokenLooksGibberish("Qwvzn")).toBe(true);
    expect(tokenLooksGibberish("Blorptex")).toBe(false);
    expect(tokenLooksGibberish("Prologis")).toBe(false);
    expect(tokenLooksGibberish("Gilbane")).toBe(false);
    expect(tokenLooksGibberish("Brookfield")).toBe(false);
    expect(tokenLooksGibberish("Tishman")).toBe(false);
    expect(tokenLooksGibberish("Brambleton")).toBe(false);
    expect(tokenLooksGibberish("Keystone")).toBe(false);
    expect(companyNameLooksReal("Throvnik Pellusar Capital LLC")).toBe(true);
    expect(companyNameLooksReal("Prologis")).toBe(true);
    expect(companyNameLooksReal("Gilbane Building Company")).toBe(true);
    expect(companyNameLooksReal("Fried Frank")).toBe(true);
    const readableSurname = plausibilityCheck(facts({ name: "Throvnik Pellusar", applicantName: "Throvnik Pellusar", org: "CBRE Group" }));
    expect(readableSurname.status).toBe("PASS");
    expect(readableSurname.finding.toLowerCase()).not.toContain("does not look like real words");
    const readablePerson = plausibilityCheck(facts({ name: "Alex Morgan", applicantName: "Alex Morgan", org: "CBRE Group" }));
    expect(readablePerson.status).toBe("PASS");

    const fakeFacts = facts({
      name: "Throvnik Pellusar",
      applicantName: "Throvnik Pellusar",
      org: "Throvnik Pellusar Capital LLC",
      location: "Phoenix, AZ",
      website: "https://throvnik-pellusar.example",
    });
    const fakeChecks = [
      plausibilityCheck(fakeFacts),
      row({ key: "rdap", status: "FAIL", reviewFlag: true, finding: "RDAP has no registration for throvnik-pellusar.example. domain is not registered. This counts against the company.", source: "RDAP" }),
      row({ key: "website", status: "FAIL", finding: "Searched: https://throvnik-pellusar.example. domain does not resolve.", source: "Company website" }),
      row({ key: "edgar", status: "INCONCLUSIVE", finding: "EDGAR responded. No company on the SEC list uses this firm's name.", source: "SEC EDGAR" }),
      registryLinkCheck(fakeFacts),
    ];
    expect(companyCouldNotBeFound(fakeChecks)).toBe(true);
    expect(companyExistsEvidence(fakeChecks)).toBe(false);
    const fake = gradeChecks(fakeChecks, fakeFacts);
    expect(fake.attention[0]?.title).toBe("Company could not be found");
    expect(fake.attention[0]?.severity).toBe("High");
    expect(fake.banner || "").toContain("Company could not be found");
    expect(fake.summary.company).toContain("Company could not be found");
    const fakeRole = fake.categories.find((category) => category.id === "role");
    expect(fakeRole?.reason).toContain("Company could not be found (0 of 8)");
    expect(fakeRole?.reason).not.toContain("8 of 8");
    expect(fake.summary.checkedOut.toLowerCase()).not.toContain("filled in and can be read");

    const realFacts = facts({
      name: "Alex Morgan",
      applicantName: "Alex Morgan",
      org: "CBRE Group",
      website: "https://www.cbre.com/",
    });
    const realChecks = [
      plausibilityCheck(realFacts),
      row({
        key: "website",
        status: "PASS",
        companyOnly: true,
        selfReported: true,
        url: "https://www.cbre.com/",
        finding: "Company: yes. The company's own site names the company.",
        source: "Company website",
      }),
      row({
        key: "edgar",
        status: "INCONCLUSIVE",
        companyOnly: true,
        finding: "EDGAR lists CBRE GROUP INC (CBRE), CIK 1138118. A name-only company match is inconclusive and does not corroborate. It does not tie the person to the firm.",
        source: "SEC EDGAR",
        url: "https://www.sec.gov/edgar/browse/?CIK=1138118",
      }),
    ];
    expect(companyExistsEvidence(realChecks)).toBe(true);
    expect(companyCouldNotBeFound(realChecks)).toBe(false);
    const real = gradeChecks(realChecks, realFacts);
    expect(real.attention.some((item) => item.title === "Company could not be found")).toBe(false);
    expect(real.banner || "").not.toContain("Company could not be found");
    expect(real.recommendation).toBe("NEEDS MORE INFO");
    expect(fake.score).toBeLessThan(real.score);
    expect(real.categories.find((category) => category.id === "role")?.reason).toContain("8 of 8");
    expect(real.categories.find((category) => category.id === "company")?.reason).toContain("Company confirmed, person");
  });
});

describe("company-only live QA fixtures", () => {
  // Live grades on mvp bbd1072, company-only applicants: CBRE F38, Brookfield F44,
  // AECOM Tishman F38, Prologis F38, Gilbane F44, Fried Frank F38, fake F36.
  const liveBefore = {
    cbre: 38,
    brookfield: 44,
    aecom: 38,
    prologis: 38,
    gilbane: 44,
    fried: 38,
    fake: 36,
  };

  function localPasses(): CheckOutput[] {
    return [
      row({ key: "email-syntax", status: "PASS", finding: "The email is well formed." }),
      row({ key: "disposable-email", status: "PASS", finding: "The email domain is not disposable." }),
      row({ key: "role-address", status: "PASS", finding: "The email is not a shared inbox." }),
      row({ key: "sanctions", status: "PASS", finding: "No sanctions-list name matched." }),
      row({ key: "duplicate", status: "PASS", finding: "The email is not a member or a declined applicant." }),
      row({ key: "text-risk", status: "PASS", finding: "The write-up has no fraud-pattern phrasing." }),
      row({ key: "velocity", status: "PASS", finding: "No burst of applications." }),
    ];
  }

  function registeredDomain(): CheckOutput {
    return row({ key: "rdap", status: "PASS", finding: "A domain registration record responded.", source: "RDAP", url: "https://rdap.org/" });
  }

  function censusMiss(): CheckOutput {
    return row({
      key: "address",
      status: "UNAVAILABLE",
      finding: "Could not check. The Census geocoder and OpenStreetMap Nominatim returned no match. This is inconclusive. It is not a pass and not a failure.",
      source: "US Census Geocoder",
    });
  }

  function companySite(url: string): CheckOutput {
    return row({
      key: "website",
      status: "PASS",
      companyOnly: true,
      selfReported: true,
      corroborates: false,
      url,
      finding: "Company: yes. The company's own site names the company.",
      source: "Company website",
    });
  }

  function linkedinCompany(url: string): CheckOutput {
    return row({
      key: "linkedin-fetch",
      status: "PASS",
      companyOnly: true,
      selfReported: true,
      corroborates: false,
      url,
      finding: "The LinkedIn company page confirms the company. Company confirmed, person not confirmed.",
      source: "LinkedIn",
    });
  }

  it("grades the six company-only firms and the fake without raising the fake", () => {
    const person = "Alex Morgan";
    const cbre = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(facts({ name: person, applicantName: person, org: "CBRE Group" })),
        registeredDomain(),
        censusMiss(),
        row({
          key: "website",
          status: "UNAVAILABLE",
          finding: "The company website could not be checked. The site blocked this agent.",
          source: "Company website",
        }),
        row({
          key: "edgar",
          status: "INCONCLUSIVE",
          companyOnly: true,
          finding: "EDGAR's current name for CIK 1138118 is CBRE GROUP INC. That is an exact current-name match. It does not tie the person to the firm.",
          url: "https://www.sec.gov/edgar/browse/?CIK=1138118",
          source: "SEC EDGAR",
        }),
      ],
      facts({ name: person, applicantName: person, org: "CBRE Group", website: "https://www.cbre.com/", location: "250 Vesey St, New York, NY 10281" }),
    );
    const brookfield = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(facts({ name: person, applicantName: person, org: "Brookfield Properties" })),
        registeredDomain(),
        companySite("https://www.brookfieldproperties.com/"),
        linkedinCompany("https://www.linkedin.com/company/brookfield-properties/"),
        censusMiss(),
        row({
          key: "edgar",
          status: "INCONCLUSIVE",
          reviewFlag: true,
          finding: "EDGAR's current name for CIK 1680277 is BPI Property Inc. Brookfield Properties, Inc. is a former name. Needs review. A former name is not an exact match and does not corroborate.",
          url: "https://www.sec.gov/edgar/browse/?CIK=1680277",
          source: "SEC EDGAR",
        }),
      ],
      facts({ name: person, applicantName: person, org: "Brookfield Properties", website: "https://www.brookfieldproperties.com/", location: "250 Vesey St, New York, NY 10281" }),
    );
    const aecom = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(facts({ name: person, applicantName: person, org: "AECOM Tishman" })),
        registeredDomain(),
        censusMiss(),
        row({
          key: "edgar",
          status: "INCONCLUSIVE",
          reviewFlag: true,
          finding: "Parent match, needs review. EDGAR lists AECOM (ACM), CIK 868857. A parent or affiliate is not an exact match and is not a pass.",
          url: "https://www.sec.gov/edgar/browse/?CIK=868857",
          source: "SEC EDGAR",
        }),
      ],
      facts({ name: person, applicantName: person, org: "AECOM Tishman", location: "One New York Plaza, New York, NY 10004" }),
    );
    const prologis = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(facts({ name: person, applicantName: person, org: "Prologis" })),
        registeredDomain(),
        row({
          key: "edgar",
          status: "INCONCLUSIVE",
          companyOnly: true,
          finding: "EDGAR's current name for CIK 1045609 is PROLOGIS INC. That is an exact current-name match. It does not tie the person to the firm.",
          url: "https://www.sec.gov/edgar/browse/?CIK=1045609",
          source: "SEC EDGAR",
        }),
      ],
      facts({ name: person, applicantName: person, org: "Prologis", website: "https://www.prologis.com/" }),
    );
    const gilbane = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(facts({ name: person, applicantName: person, org: "Gilbane Building Company" })),
        registeredDomain(),
        companySite("https://www.gilbaneco.com/"),
        linkedinCompany("https://www.linkedin.com/company/gilbane-building-company/"),
        registryLinkCheck(facts({ location: "Providence, RI", org: "Gilbane Building Company" })),
      ],
      facts({ name: person, applicantName: person, org: "Gilbane Building Company", website: "https://www.gilbaneco.com/", location: "Providence, RI" }),
    );
    const fried = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(facts({ name: person, applicantName: person, org: "Fried Frank" })),
        registeredDomain(),
      ],
      facts({ name: person, applicantName: person, org: "Fried Frank", website: "https://www.friedfrank.com/" }),
    );
    const fakeFacts = facts({
      name: "Throvnik Pellusar",
      applicantName: "Throvnik Pellusar",
      org: "Throvnik Pellusar Capital LLC",
      location: "Phoenix, AZ",
      website: "https://throvnik-pellusar.example",
    });
    const fake = gradeChecks(
      [
        ...localPasses(),
        plausibilityCheck(fakeFacts),
        row({ key: "rdap", status: "FAIL", reviewFlag: true, finding: "RDAP has no registration for throvnik-pellusar.example. domain is not registered.", source: "RDAP" }),
        row({ key: "website", status: "FAIL", finding: "Searched: https://throvnik-pellusar.example. domain does not resolve.", source: "Company website" }),
        row({ key: "edgar", status: "INCONCLUSIVE", finding: "EDGAR responded. No company on the SEC list uses this firm's name.", source: "SEC EDGAR" }),
        registryLinkCheck(fakeFacts),
      ],
      fakeFacts,
    );

    const after = {
      cbre: cbre.score,
      brookfield: brookfield.score,
      aecom: aecom.score,
      prologis: prologis.score,
      gilbane: gilbane.score,
      fried: fried.score,
      fake: fake.score,
    };
    expect(after).toEqual({ cbre: 41, brookfield: 44, aecom: 38, prologis: 41, gilbane: 44, fried: 38, fake: 28 });
    expect(after.fake).toBeLessThan(liveBefore.fake);
    for (const score of [after.cbre, after.brookfield, after.aecom, after.prologis, after.gilbane, after.fried]) {
      expect(after.fake).toBeLessThan(score);
      expect(score).toBeGreaterThanOrEqual(liveBefore.fake);
    }
    for (const report of [cbre, brookfield, aecom, prologis, gilbane, fried, fake]) {
      expect(report.letter).toBe("F");
      expect(report.recommendation).toBe("NEEDS MORE INFO");
    }
    expect(cbre.summary.couldNotCheck.toLowerCase()).toContain("could not check");
    expect(cbre.summary.didNotCheckOut.toLowerCase()).not.toContain("address");
    expect(brookfield.summary.didNotCheckOut.toLowerCase()).not.toContain("vesey");
    expect(aecom.summary.didNotCheckOut.toLowerCase()).not.toContain("plaza");
    expect(brookfield.summary.company).toContain("BPI Property Inc.");
    expect(brookfield.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    expect(cbre.categories.find((category) => category.id === "company")?.reason).toContain("exact company name");
    expect(fake.attention[0]?.title).toBe("Company could not be found");
    expect(fake.categories.find((category) => category.id === "role")?.earned).toBe(0);
    expect(cbre.categories.find((category) => category.id === "role")?.earned).toBe(8);

    const prefill = emptyPrefillFacts({ name: person, org: "Brookfield Properties", website: "https://www.brookfieldproperties.com/" });
    const brookfieldStep = suggestCompany(prefill, [
      { checkKey: "website", status: "PASS", finding: "The company's own site names the company.", url: "https://www.brookfieldproperties.com/", source: "Company website" },
      { checkKey: "edgar", status: "INCONCLUSIVE", finding: "EDGAR's current name for CIK 1680277 is BPI Property Inc. Brookfield Properties, Inc. is a former name. Needs review.", url: "https://www.sec.gov/edgar/browse/?CIK=1680277", source: "SEC EDGAR", reviewFlag: true },
    ]);
    expect(brookfieldStep.mark).toBe("CONCERN");
    expect(brookfieldStep.note).toContain("Could not confirm");
    expect(brookfieldStep.note).toContain("Needs review");
    const cbreStep = suggestCompany(emptyPrefillFacts({ name: person, org: "CBRE Group" }), [
      { checkKey: "edgar", status: "INCONCLUSIVE", finding: "EDGAR's current name for CIK 1138118 is CBRE GROUP INC. That is an exact current-name match. It does not tie the person to the firm.", url: "https://www.sec.gov/edgar/browse/?CIK=1138118", source: "SEC EDGAR" },
    ]);
    expect(cbreStep.mark).toBe("PASS");
    const aecomStep = suggestCompany(emptyPrefillFacts({ name: person, org: "AECOM Tishman", website: "https://www.aecom.com/" }), [
      { checkKey: "website", status: "PASS", finding: "The company's own site names the company.", url: "https://www.aecom.com/", source: "Company website" },
      { checkKey: "edgar", status: "INCONCLUSIVE", finding: "Parent match, needs review. EDGAR lists AECOM (ACM). A parent or affiliate is not an exact match.", url: "https://www.sec.gov/edgar/browse/?CIK=868857", source: "SEC EDGAR", reviewFlag: true },
    ]);
    expect(aecomStep.mark).toBe("CONCERN");
    const ownerStep = suggestCompany(emptyPrefillFacts({ name: person, org: "CBRE Group" }), [
      { checkKey: "edgar", status: "PASS", corroborates: true, finding: "A Form 4 for this CIK names Sulentic Robert E as a reporting owner.", url: "https://www.sec.gov/edgar/browse/?CIK=1138118", source: "SEC EDGAR" },
    ]);
    expect(ownerStep.mark).toBe("PASS");
  });
});

describe("self-reported website credit needs an outside source", () => {
  // Local floor is 36. A registered domain is +2. Full social links are +2. Together that is 40.
  // The ungated half credit added 4 and was how a fake reached F 44.
  function floor(extra: CheckOutput[] = []): CheckOutput[] {
    return [
      row({ key: "email-syntax", status: "PASS", finding: "The email is well formed." }),
      row({ key: "disposable-email", status: "PASS", finding: "The email domain is not disposable." }),
      row({ key: "role-address", status: "PASS", finding: "The email is not a shared inbox." }),
      row({ key: "sanctions", status: "PASS", finding: "No sanctions-list name matched." }),
      row({ key: "duplicate", status: "PASS", finding: "The email is not a member or a declined applicant." }),
      row({ key: "text-risk", status: "PASS", finding: "The write-up has no fraud-pattern phrasing." }),
      row({ key: "velocity", status: "PASS", finding: "No burst of applications." }),
      row({ key: "plausibility", status: "PASS", finding: "The name, company, and role are filled in and readable." }),
      row({ key: "rdap", status: "PASS", finding: "A domain registration record responded.", source: "RDAP" }),
      row({ key: "social-links", status: "PASS", finding: "The other social links are full web addresses." }),
      ...extra,
    ];
  }

  function ownSite(host: string): CheckOutput {
    return row({
      key: "website",
      status: "PASS",
      companyOnly: true,
      selfReported: true,
      corroborates: false,
      url: host,
      finding: "Company: yes. The company's own site names the company.",
      source: "Company website",
    });
  }

  it("drops the F 44 website credit when nothing outside the applicant confirms the company", () => {
    const fakeFacts = facts({
      name: "Jordan Hale",
      applicantName: "Jordan Hale",
      org: "Northbridge Meridian Holdings LLC",
      website: "https://www.northbridgemeridian.example",
      role: "DEVELOPER",
    });
    const checks = floor([ownSite("https://www.northbridgemeridian.example")]);
    expect(outsideSourceConfirmsCompany(checks)).toBe(false);
    const graded = gradeChecks(checks, fakeFacts);
    // 38 is the local floor (36) plus a registered domain (2). The ungated half credit would make this 42.
    // Richard's live read of this pattern was F 44; the same 4-point gate takes that file to F 40.
    expect(graded.score).toBe(38);
    expect(graded.letter).toBe("F");
    expect(graded.recommendation).toBe("NEEDS MORE INFO");
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("No outside source confirmed the company (0 of 8)");
    expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("website");
    expect(graded.summary.checkedOut.toLowerCase()).not.toContain("own site confirms the company");
    expect(companyCouldNotBeFound(checks)).toBe(false);
    expect(graded.score + 4).toBe(42);
    expect(graded.score).toBeLessThan(44);
  });

  it("keeps the half credit for Gilbane, Joshua Stein, Skanska, RXR, and Ulbrich when an outside source confirms the company", () => {
    const gilbane = gradeChecks(
      floor([
        ownSite("https://www.gilbaneco.com/"),
        row({ key: "linkedin-fetch", status: "PASS", companyOnly: true, corroborates: false, finding: "The LinkedIn company page confirms the company.", url: "https://www.linkedin.com/company/gilbane-building-company/", source: "LinkedIn" }),
      ]),
      facts({ name: "Alex Morgan", applicantName: "Alex Morgan", org: "Gilbane Building Company", website: "https://www.gilbaneco.com/", location: "Providence, RI" }),
    );
    const stein = gradeChecks(
      floor([
        ownSite("https://www.joshuastein.com/"),
        row({ key: "business-registry", status: "PASS", corroborates: false, finding: "NY Active Corporations lists JOSHUA STEIN PLLC.", url: "https://data.ny.gov/", source: "NY registry" }),
      ]),
      facts({ name: "Joshua Stein", applicantName: "Joshua Stein", org: "Joshua Stein PLLC", website: "https://www.joshuastein.com/", location: "New York, NY" }),
    );
    const skanska = gradeChecks(
      floor([
        ownSite("https://www.skanska.com/"),
        row({ key: "business-registry", status: "PASS", corroborates: false, finding: "NY Active Corporations lists SKANSKA USA BUILDING INC.", url: "https://data.ny.gov/", source: "NY registry" }),
      ]),
      facts({ name: "QA TestAB", applicantName: "QA TestAB", org: "Skanska USA", website: "https://www.usa.skanska.com/", location: "New York, NY" }),
    );
    const rxr = gradeChecks(
      floor([
        row({ key: "website", status: "PASS", selfReported: true, corroborates: false, finding: "Name: yes. Company: yes. The page names Scott Rechler at RXR.", url: "https://www.rxr.com/", source: "Company website" }),
        row({ key: "news", status: "PASS", corroborates: true, finding: "A headline names the person and the company. RXR CEO Scott Rechler says the tower is open.", source: "News" }),
      ]),
      facts({ name: "Scott Rechler", applicantName: "Scott Rechler", org: "RXR", website: "https://www.rxr.com/", location: "New York, NY" }),
    );
    const ulbrich = gradeChecks(
      floor([
        ownSite("https://www.jll.com/"),
        row({ key: "edgar", status: "PASS", corroborates: true, finding: "EDGAR lists JONES LANG LASALLE INC (JLL), CIK 1037976. A Form 4 names Ulbrich Christian as a reporting owner.", url: "https://www.sec.gov/edgar/browse/?CIK=1037976", source: "SEC EDGAR" }),
      ]),
      facts({ name: "Christian Ulbrich", applicantName: "Christian Ulbrich", org: "Jones Lang LaSalle", website: "https://www.jll.com/", location: "Chicago, IL" }),
    );

    expect(gilbane.score).toBe(44);
    expect(stein.score).toBe(44);
    expect(skanska.score).toBe(44);
    expect(rxr.score).toBe(62);
    expect(ulbrich.score).toBe(56);
    for (const report of [gilbane, stein, skanska, rxr, ulbrich]) {
      expect(report.recommendation).not.toBe("DECLINE");
      expect(report.summary.didNotCheckOut.toLowerCase()).not.toContain("website");
    }
    expect(gilbane.categories.find((category) => category.id === "company")?.reason).toContain("Company confirmed, person not confirmed (4 of 8)");
    expect(stein.categories.find((category) => category.id === "company")?.reason).toContain("4 of 8");
    expect(rxr.categories.find((category) => category.id === "company")?.reason).toContain("8 of 8");
    expect(ulbrich.categories.find((category) => category.id === "company")?.reason).toContain("4 of 8");
    expect(rxr.letter).toBe("D");
    expect(rxr.recommendation).toBe("NEEDS MORE INFO");
    expect(ulbrich.letter).toBe("F");
  });

  it("does not treat a former name or a parent match as the outside confirmation", () => {
    const brookfield = gradeChecks(
      floor([
        ownSite("https://www.brookfieldproperties.com/"),
        row({ key: "edgar", status: "INCONCLUSIVE", reviewFlag: true, finding: "EDGAR's current name for CIK 1680277 is BPI Property Inc. Brookfield Properties, Inc. is a former name. Needs review.", source: "SEC EDGAR" }),
      ]),
      facts({ name: "QA TestAF", applicantName: "QA TestAF", org: "Brookfield Properties", website: "https://www.brookfieldproperties.com/" }),
    );
    const aecom = gradeChecks(
      floor([
        ownSite("https://www.aecom.com/"),
        row({ key: "edgar", status: "INCONCLUSIVE", reviewFlag: true, finding: "Parent match, needs review. EDGAR lists AECOM (ACM). A parent or affiliate is not an exact match.", source: "SEC EDGAR" }),
      ]),
      facts({ name: "QA Test", applicantName: "QA Test", org: "AECOM Tishman", website: "https://www.aecom.com/" }),
    );
    expect(outsideSourceConfirmsCompany([
      ownSite("https://www.brookfieldproperties.com/"),
      row({ key: "edgar", status: "INCONCLUSIVE", reviewFlag: true, finding: "Brookfield Properties, Inc. is a former name.", source: "SEC EDGAR" }),
    ])).toBe(false);
    expect(outsideSourceConfirmsCompany([
      ownSite("https://www.aecom.com/"),
      row({ key: "edgar", status: "INCONCLUSIVE", reviewFlag: true, finding: "Parent match, needs review. EDGAR lists AECOM (ACM).", source: "SEC EDGAR" }),
    ])).toBe(false);
    expect(brookfield.score).toBe(38);
    expect(aecom.score).toBe(38);
    expect(brookfield.categories.find((category) => category.id === "company")?.reason).toContain("0 of 8");
    expect(aecom.categories.find((category) => category.id === "company")?.reason).toContain("0 of 8");
    expect(brookfield.summary.didNotCheckOut.toLowerCase()).not.toContain("website");
    expect(aecom.recommendation).not.toBe("DECLINE");
  });

  it("leaves Brinkwell on the dead-domain score and keeps the fake under the outside-confirmed reals", () => {
    const brinkwellFacts = facts({
      name: "Thaddeus Brinkwell",
      applicantName: "Thaddeus Brinkwell",
      org: "Ormsley Vantage Lending Partners LLC",
      website: "https://www.ormsleyvantage.com",
      role: "LENDER",
    });
    const brinkwellChecks = [
      row({ key: "email-syntax", status: "PASS", finding: "The email is well formed." }),
      row({ key: "disposable-email", status: "PASS", finding: "The email domain is not disposable." }),
      row({ key: "role-address", status: "PASS", finding: "The email is not a shared inbox." }),
      row({ key: "sanctions", status: "PASS", finding: "No sanctions-list name matched." }),
      row({ key: "duplicate", status: "PASS", finding: "The email is not a member." }),
      row({ key: "text-risk", status: "PASS", finding: "The write-up is clear." }),
      row({ key: "velocity", status: "PASS", finding: "No burst." }),
      plausibilityCheck(brinkwellFacts),
      row({ key: "social-links", status: "PASS", finding: "The other social links are full web addresses." }),
      row({ key: "website", status: "FAIL", finding: "Searched: https://www.ormsleyvantage.com. domain does not resolve.", source: "Company website" }),
      row({ key: "rdap", status: "FAIL", reviewFlag: true, finding: "domain is not registered.", source: "RDAP" }),
    ];
    const brinkwell = gradeChecks(brinkwellChecks, brinkwellFacts);
    const fake = gradeChecks(
      floor([ownSite("https://www.northbridgemeridian.example")]),
      facts({ name: "Jordan Hale", applicantName: "Jordan Hale", org: "Northbridge Meridian Holdings LLC", website: "https://www.northbridgemeridian.example" }),
    );
    const gilbane = gradeChecks(
      floor([
        ownSite("https://www.gilbaneco.com/"),
        row({ key: "linkedin-fetch", status: "PASS", companyOnly: true, finding: "The LinkedIn company page confirms the company.", source: "LinkedIn" }),
      ]),
      facts({ name: "Alex Morgan", applicantName: "Alex Morgan", org: "Gilbane Building Company" }),
    );
    expect(brinkwell.letter).toBe("F");
    expect(brinkwell.recommendation.startsWith("APPROVE")).toBe(false);
    expect(brinkwell.score).toBe(28);
    expect(brinkwell.score).toBeLessThan(40);
    expect(fake.score).toBe(38);
    expect(fake.score).toBeLessThan(44);
    // Fixture gap is 6 (Gilbane 44, gated fake 38). Richard's live pair was Gilbane and Joshua Stein at F 48
    // against a fake at F 44. Removing the 4 points makes that live gap 8. Both are short of the 15-point target.
    expect(gilbane.score - fake.score).toBe(6);
    expect(gilbane.score - fake.score).toBeLessThan(15);
    expect(brinkwell.score).toBeLessThan(fake.score);
    expect(brinkwell.score).toBeLessThanOrEqual(40);
  });
});

describe("batch 12 surnames, aliases, and company pages", () => {
  function rolePoints(name: string, org: string): number {
    const applicant = facts({ name, applicantName: name, org });
    return gradeChecks([plausibilityCheck(applicant)], applicant).categories.find((category) => category.id === "role")?.earned ?? -1;
  }

  it("passes real surnames and still fails a no-vowel company token", () => {
    for (const [name, org] of [
      ["Belinda Schwartz", "Herrick, Feinstein LLP"],
      ["Ralph Herzka", "Meridian Capital Group"],
      ["Chaim Katzman", "Gazit Group"],
      ["Ara Hovnanian", "Hovnanian Enterprises"],
      ["Moshe Schwartz", "Schwartz Realty LLC"],
      ["Andrzej Duda", "Example Partners"],
      ["Ilya Kravchenko", "Example Partners"],
      ["Richard Osika", "Osika Construction"],
      ["Zbigniew Example", "Example Partners"],
      ["Yitzchak Example", "Example Partners"],
    ] as const) {
      const row = plausibilityCheck(facts({ name, applicantName: name, org }));
      expect(row.status, `${name} / ${org}`).toBe("PASS");
      expect(row.finding.toLowerCase()).not.toContain("does not look like real words");
    }
    expect(rolePoints("Belinda Schwartz", "Herrick, Feinstein LLP")).toBe(8);
    expect(rolePoints("Ralph Herzka", "Meridian Capital Group")).toBe(8);
    expect(rolePoints("Ara Hovnanian", "Hovnanian Enterprises")).toBe(8);
    expect(companyNameLooksReal("Hovnanian Enterprises")).toBe(true);
    expect(companyNameLooksReal("Schwartz Realty LLC")).toBe(true);

    const companyMash = plausibilityCheck(facts({ name: "Nix Qwvzn", applicantName: "Nix Qwvzn", org: "Blorptex Qwvzn Builders LLC" }));
    expect(companyMash.status).toBe("FAIL");
    expect(companyMash.finding.toLowerCase()).toContain("company name");
    expect(plausibilityCheck(facts({ name: "Jane Roe", applicantName: "Jane Roe", org: "asdf" })).status).toBe("FAIL");
    expect(tokenLooksGibberish("bcdf")).toBe(true);
    expect(tokenLooksGibberish("Schwartz")).toBe(false);
    expect(tokenLooksGibberish("Hovnanian")).toBe(false);

    const personMash = plausibilityCheck(facts({ name: "Nix Qwvzn", applicantName: "Nix Qwvzn", org: "CBRE Group" }));
    expect(personMash.status).toBe("PASS");
    expect(personNameTokensLookMadeUp("Nix Qwvzn")).toBe(true);
    const noted = gradeChecks([personMash], facts({ name: "Nix Qwvzn", applicantName: "Nix Qwvzn", org: "CBRE Group" }));
    expect(noted.categories.find((category) => category.id === "role")?.earned).toBe(8);
    expect(noted.attention.some((item) => item.title === "Person name may not be real words")).toBe(true);
    expect(noted.letter).not.toBe("A");
  });

  it("does not treat twotreesny as a second brand, and keeps a street out of the person and company query", () => {
    expect(domainMatchesOrgStem("twotreesny", "Two Trees Management")).toBe(true);
    expect(domainMatchesOrgStem("twotreesnyc", "Two Trees Management")).toBe(true);
    expect(brandAliases("Two Trees Management", "https://www.twotreesny.com")).not.toContain("twotreesny");
    expect(queryCity("7 Jackson Walkway, Providence, RI 02903")).toBe("Providence");
    expect(queryCity("250 Vesey St, New York, NY 10281")).toBe("New York");
    expect(newsSearchQueries(facts({ name: "Alex Morgan", applicantName: "Alex Morgan", org: "Gilbane Building Company", location: "7 Jackson Walkway, Providence, RI 02903" })).join(" ")).not.toMatch(/jackson|walkway/i);
  });

  it("treats a plaintiff-firm class-action solicitation as company-level attention", () => {
    const headline = "Deadline Alert: Compass, Inc. Stockholders Face December 8, 2026 Lead Plaintiff Deadline in Securities Fraud Class Action";
    const judged = judgeHeadline(headline, {
      name: "Robert Reffkin",
      applicantName: "Robert Reffkin",
      org: "Compass",
      location: "New York, NY",
    });
    expect(judged.person).toBe(false);
    expect(judged.company).toBe(true);
    expect(judged.kind).toBe("civil");
    const rows = classifyNews(
      facts({ name: "Robert Reffkin", applicantName: "Robert Reffkin", org: "Compass", location: "New York, NY" }),
      [{ title: headline, snippet: headline, url: "https://news.example/compass", source: "Example", provider: "Google News", publishedAt: null }],
      [{ name: "Google News", state: "responded" }],
    );
    const news = rows.find((row) => row.key === "news");
    expect(news?.status).not.toBe("FAIL");
    expect(news?.finding).toContain("Company-level litigation");
    const story = rows.find((row) => row.key === "news-story");
    expect(story?.finding.startsWith("Company litigation")).toBe(true);
    expect(story?.status).not.toBe("FAIL");
    const graded = gradeChecks(rows, facts({ name: "Robert Reffkin", applicantName: "Robert Reffkin", org: "Compass" }));
    expect(graded.caps.join(" ")).not.toMatch(/capped at F|capped at D/i);
    expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(true);
  });

  it("does not accept a sister LinkedIn company page from one shared token", async () => {
    expect(linkedinCompanyMatchesOrg("https://www.linkedin.com/company/gilbane-building-company/", "Gilbane Building Company")).toBe(true);
    expect(linkedinCompanyMatchesOrg("https://www.linkedin.com/company/gilbane-development-company/", "Gilbane Building Company")).toBe(false);
    expect(linkedinCompanyMatchesOrg("https://www.linkedin.com/company/walker-dunlop/", "Walker & Dunlop")).toBe(true);
    let webQuery = "";
    const checks = await runPublicScreen(
      facts({
        name: "Alex Morgan",
        applicantName: "Alex Morgan",
        org: "Gilbane Building Company",
        website: "https://www.gilbaneco.com/",
        location: "7 Jackson Walkway, Providence, RI 02903",
      }),
      async (url) => {
        if (url.includes("duckduckgo.com") || url.includes("bing.com")) {
          webQuery = decodeURIComponent(url);
          return { ok: false, status: 403, text: "" };
        }
        if (url.includes("gilbaneco.com")) {
          return {
            ok: true,
            status: 200,
            text: '<html><p>Gilbane Building Company</p><a href="https://www.linkedin.com/company/gilbane-development-company/">LinkedIn</a></html>',
          };
        }
        if (url.includes("gilbane-development-company")) {
          return { ok: true, status: 200, text: "<html><title>Gilbane Development Company | LinkedIn</title><p>Gilbane Development Company</p></html>" };
        }
        return { ok: false, status: 403, text: "" };
      },
    );
    expect(webQuery.toLowerCase()).not.toContain("jackson");
    expect(webQuery.toLowerCase()).toContain("gilbane");
    const linkedin = checks.find((check) => check.key === "linkedin-fetch");
    expect(linkedin?.status).not.toBe("PASS");
    expect(linkedin?.companyOnly).not.toBe(true);
  });
});

describe("Willy Walker live inputs", () => {
  const walkerLocation = "One Vanderbilt Ave, Suite 3300, New York NY 10017";
  const walker = facts({
    name: "Willy Walker",
    applicantName: "Willy Walker",
    org: "Walker & Dunlop",
    role: "MORTGAGE_BROKER",
    location: walkerLocation,
    phone: "212-555-0100",
    website: "https://www.walkerdunlop.com",
  });

  it("treats a Census and Nominatim miss for One Vanderbilt as inconclusive, not a failure", async () => {
    const parsed = parseApplicationLocation(walkerLocation);
    expect(parsed?.state).toBe("NY");
    expect(parsed?.zip).toBe("10017");
    expect(parsed?.city.toLowerCase()).toBe("new york");
    expect(parsed?.street.toLowerCase()).toContain("vanderbilt");
    expect(parsed?.street.toLowerCase()).not.toContain("suite");
    expect(parsed?.city.toLowerCase()).not.toContain("suite");

    const address = await resolveAddressCheck({
      facts: walker,
      watchlist: [],
      network: true,
      fetchText: async (url) => {
        const decoded = decodeURIComponent(url).replace(/\+/g, " ");
        expect(decoded.toLowerCase()).toContain("new york");
        expect(decoded.toLowerCase()).not.toContain("suite 3300");
        if (url.includes("nominatim.openstreetmap.org")) return { ok: false, status: 0, text: "" };
        return { ok: true, status: 200, text: JSON.stringify({ result: { addressMatches: [] } }) };
      },
    });
    expect(address?.status).toBe("INCONCLUSIVE");
    expect(address?.finding.toLowerCase()).toContain("could not check");
    expect(address?.finding.toLowerCase()).not.toContain("did not check out");
    const graded = gradeChecks(
      [
        address!,
        row({
          key: "news",
          status: "PASS",
          corroborates: true,
          finding: "A headline names the person and the company. Willy Walker, Walker & Dunlop. Name: yes. Company: yes. Confidence: high.",
        }),
        row({
          key: "web-footprint",
          status: "INCONCLUSIVE",
          corroborates: false,
          finding: "No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: none.",
        }),
      ],
      walker,
    );
    expect(graded.summary.didNotCheckOut.toLowerCase()).not.toContain("address did not check out");
    expect(graded.summary.couldNotCheck.toLowerCase()).toContain("could not check");
    expect(graded.attention.some((item) => item.title === "Address" && item.severity === "Medium")).toBe(false);
    expect(graded.summary.company).toContain("The public web search did not return a page naming both; a news story did.");
    expect(graded.summary.company).not.toContain("No public web result confirmed the person and the company together.");
    expect(graded.categories.find((category) => category.id === "footprint")?.reason).toContain(
      "The public web search did not return a page naming both; a news story did",
    );
    const dialog = approveConfirmMessage({
      dues: "Approve this person?",
      unverified: unverifiedPersonItems([
        { checkKey: "address", status: "INCONCLUSIVE" },
        { checkKey: "news", status: "PASS", corroborates: true },
      ]),
    });
    expect(dialog).toContain("Unverified: Address");
    expect(dialog).not.toContain("Failed: Address");
  });

  it("points Walker & Dunlop at the Maryland registry when EDGAR says it is incorporated there", () => {
    const identity = parseSubmissionsIdentity(JSON.stringify({ name: "WALKER & DUNLOP, INC.", stateOfIncorporation: "MD", formerNames: [] }));
    expect(identity?.stateOfIncorporation).toBe("MD");
    const edgar = assessEdgarMatch({
      org: "Walker & Dunlop",
      person: "Willy Walker",
      tickersOk: true,
      companies: [{ title: "WALKER & DUNLOP, INC.", ticker: "WD", cik: "1497770" }],
      filingNames: [],
      insiderNames: [["Walker William M (CIK 0001503841)"]],
      identity,
    });
    expect(edgar.finding).toContain("1497770");
    expect(edgar.finding).toContain("State of incorporation: MD");
    const nyMiss = row({
      key: "business-registry",
      status: "INCONCLUSIVE",
      finding: "NY Active Corporations responded. No active entity uses this exact name. A similar name is not a match, and this is not a pass.",
      url: "https://data.ny.gov/d/n9v6-gdp6",
      source: "NY Active Corporations",
    });
    const noted = noteIncorporationRegistry(nyMiss, edgar.finding, "NY");
    expect(noted.finding.toLowerCase()).toContain("does not count against");
    expect(noted.finding).toContain("MD");
    expect(noted.url).toContain("maryland.gov");
    const graded = gradeChecks([noted, row({ key: "edgar", status: edgar.status, corroborates: edgar.corroborates, companyOnly: edgar.companyOnly, finding: edgar.finding })], walker);
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("does not count against the company");
    expect(graded.categories.find((category) => category.id === "company")?.reason).not.toContain("did not confirm this exact company name");
  });

  it("reads a request-only file as incomplete and does not raise the fake", () => {
    const local = [
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({ key: "sanctions", status: "PASS" }),
      row({ key: "duplicate", status: "PASS" }),
      row({ key: "text-risk", status: "PASS" }),
      row({ key: "velocity", status: "PASS" }),
      row({ key: "plausibility", status: "PASS", finding: "The name, company, and role are readable." }),
    ];
    const request = gradeChecks(
      local,
      facts({
        name: "Ada Request",
        applicantName: "Ada Request",
        org: "Request Realty",
        website: "",
        phone: "",
        applicationSubmitted: false,
        statement: "I work in commercial real estate and would like to meet other owners.",
      }),
    );
    const fake = gradeChecks(
      [
        ...local,
        row({ key: "rdap", status: "FAIL", finding: "The domain is not registered." }),
        row({ key: "website", status: "FAIL", finding: "The domain does not resolve." }),
      ],
      facts({
        name: "Zuplantor Vexmire",
        applicantName: "Zuplantor Vexmire",
        org: "Zuplantor Vexmire Builders LLC",
        website: "https://zuplantorvexmire.example",
        phone: "212-555-0199",
        applicationSubmitted: true,
      }),
    );
    expect(request.summary.reasoning).toContain("Incomplete application. Request a website, phone, or business card. Send to review: incomplete.");
    expect(request.summary.nextStep.startsWith("Ask for the website and phone first.")).toBe(true);
    expect(request.summary.nextStep).toContain("Send to review: incomplete.");
    expect(request.attention.some((item) => item.title === "Incomplete application: no website and no phone")).toBe(true);
    expect(request.summary.applicant).toContain("fewer checks were available");
    expect(fake.summary.reasoning).not.toContain("Incomplete application");
    expect(request.score).toBe(36);
    expect(fake.score).toBe(28);
    expect(request.score - fake.score).toBeGreaterThanOrEqual(8);
    expect(fake.letter).toBe("F");
    expect(request.letter).toBe("F");
  });
});

describe("a DuckDuckGo challenge does not erase a public record", () => {
  const mullen = facts({
    name: "Robert Mullen",
    applicantName: "Robert Mullen",
    org: "STO Building Group",
    website: "https://www.stobuildinggroup.com",
    location: "New York, NY",
    role: "GENERAL_CONTRACTOR",
    statement: "I lead a construction company and would like to meet owners and developers.",
    inviteNote: "PF-BENCH-0000 · Benchmark invite code",
  });
  const mojeekHtml = `<ul class="results-standard"><li class="result"><a class="title" href="https://www.linkedin.com/in/robert-mullen-04796524">Robert Mullen - CEO at STO Building Group | LinkedIn</a><p class="s">Robert Mullen is CEO at STO Building Group.</p></li></ul>`;

  function restOfFile(web: CheckOutput[]): CheckOutput[] {
    return [
      ...web,
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({
        key: "linkedin-fetch",
        status: "PASS",
        companyOnly: true,
        corroborates: false,
        finding: "The public LinkedIn page company confirmed, person NOT confirmed. Name: no. Company: yes.",
      }),
      row({
        key: "website",
        status: "PASS",
        selfReported: true,
        corroborates: false,
        finding: "Found: a page on the company site. Name: yes. Company: yes. City: yes. Confidence: high.",
      }),
      row({ key: "rdap", status: "PASS", finding: "RDAP responded for stobuildinggroup.com." }),
      row({
        key: "business-registry",
        status: "PASS",
        corroborates: false,
        finding: "NY Active Corporations lists STO BUILDING GROUP INC. It does not tie a person to the firm.",
      }),
      row({ key: "sanctions", status: "PASS" }),
      row({ key: "duplicate", status: "PASS" }),
      row({ key: "text-risk", status: "PASS" }),
      row({ key: "velocity", status: "PASS" }),
      row({ key: "plausibility", status: "PASS" }),
      row({ key: "invite-source", status: "PASS", finding: "A referral or request code is on the file." }),
    ];
  }

  it("keeps B10R02 at D68 when DuckDuckGo is challenged and Mojeek has the public page", async () => {
    const checks = await runPublicScreen(mullen, async (url) => {
      if (url.includes("mojeek.com")) return { ok: true, status: 200, text: mojeekHtml };
      if (url.includes("stobuildinggroup.com")) return { ok: true, status: 200, text: "<html><p>STO Building Group</p></html>" };
      if (url.includes("duckduckgo.com")) return { ok: false, status: 202, text: "challenge" };
      if (url.includes("bing.com")) return { ok: false, status: 403, text: "" };
      if (url.includes("search.brave.com")) return { ok: true, status: 200, text: "<html></html>" };
      return { ok: false, status: 403, text: "" };
    });
    const web = checks.filter((check) => check.key === "screen-web" || check.key === "web-footprint");
    for (const check of web) {
      expect(check.status).toBe("PASS");
      expect(check.corroborates).toBe(true);
      expect(check.status).not.toBe("UNAVAILABLE");
    }
    expect(web.find((check) => check.key === "screen-web")?.source).toBe("Mojeek");
    const graded = gradeChecks(restOfFile(web), mullen);
    expect(graded.categories.find((category) => category.id === "completeness")?.earned).toBe(6);
    expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(12);
    expect(graded.categories.find((category) => category.id === "footprint")?.earned).toBe(8);
    expect(graded.score).toBe(68);
    expect(graded.letter).toBe("D");
  });

  it("does not award completeness for a blocked search when the person is not tied, and does not score that block as a pass", async () => {
    const checks = await runPublicScreen(mullen, async (url) => {
      if (url.includes("stobuildinggroup.com")) return { ok: true, status: 200, text: "<html><p>STO Building Group leadership Robert Mullen</p></html>" };
      return { ok: false, status: 202, text: "challenge" };
    });
    const web = checks.filter((check) => check.key === "screen-web" || check.key === "web-footprint");
    for (const check of web) {
      expect(check.status).toBe("UNAVAILABLE");
      expect(check.corroborates).not.toBe(true);
      expect(check.finding).toContain("DuckDuckGo returned a challenge page");
      expect(check.finding).toContain("All free search sources blocked");
      expect(check.finding).toContain("Bing");
      expect(check.finding).toContain("Brave");
      expect(check.finding).toContain("Mojeek");
      expect(check.finding).toContain("GDELT");
    }
    const graded = gradeChecks(restOfFile(web), mullen);
    const completeness = graded.categories.find((category) => category.id === "completeness");
    const company = graded.categories.find((category) => category.id === "company");
    const footprint = graded.categories.find((category) => category.id === "footprint");
    expect(completeness?.earned).toBe(0);
    expect(completeness?.reason).toContain("No independent source");
    expect(footprint?.earned).toBe(0);
    expect(footprint?.reason.toLowerCase()).toContain("could not check");
    expect(footprint?.reason.toLowerCase()).toContain("search blocked");
    expect(company?.reason.toLowerCase()).toContain("could not check, search blocked");
    expect(company?.earned).toBe(8);
    expect(graded.score).toBe(50);
    expect(graded.letter).toBe("F");
    const fake = gradeChecks(web, facts({ location: "New York, NY", statement: "I develop small buildings and keep a written record of each project for the application." }));
    expect(fake.categories.find((category) => category.id === "completeness")?.earned).toBe(0);
    expect(fake.score).toBeLessThanOrEqual(40);
  });
});

describe("batch 13 search, particles, foreclosure topic, and affiliate filings", () => {
  const ripka = facts({
    name: "Peter Ripka",
    applicantName: "Peter Ripka",
    org: "RIPCO Real Estate",
    website: "https://www.ripcony.com",
    location: "New York, NY",
    role: "BROKER",
  });
  const bingHtml = `<ol><li class="b_algo"><h2><a href="https://www.bisnow.com/new-york/news/peter-ripka-ripco">Peter Ripka | RIPCO Real Estate</a></h2><p>Peter Ripka is a broker at RIPCO Real Estate in New York.</p></li></ol>`;

  it("uses Bing after a DuckDuckGo challenge and names every source when all of them are blocked", async () => {
    const checks = await runPublicScreen(ripka, async (url) => {
      if (url.includes("bing.com")) return { ok: true, status: 200, text: bingHtml };
      if (url.includes("ripcony.com")) return { ok: true, status: 200, text: "<html><p>RIPCO Real Estate</p></html>" };
      if (url.includes("duckduckgo.com")) return { ok: false, status: 202, text: "challenge" };
      return { ok: false, status: 403, text: "" };
    });
    const web = checks.find((check) => check.key === "screen-web");
    expect(web?.status).toBe("PASS");
    expect(web?.source).toBe("Bing");
    expect(web?.finding).toContain("Tried DuckDuckGo (challenge page), Bing (result)");
    expect(web?.finding).not.toContain("All free search sources blocked");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(footprint?.status).not.toBe("UNAVAILABLE");
    const recovered = gradeChecks(
      [
        ...checks.filter((check) => check.key === "screen-web" || check.key === "web-footprint"),
        row({ key: "email-syntax", status: "PASS" }),
        row({ key: "disposable-email", status: "PASS" }),
        row({ key: "role-address", status: "PASS" }),
        row({
          key: "linkedin-fetch",
          status: "PASS",
          companyOnly: true,
          corroborates: false,
          finding: "The public LinkedIn page company confirmed, person NOT confirmed. Name: no. Company: yes.",
        }),
        row({
          key: "website",
          status: "PASS",
          selfReported: true,
          corroborates: false,
          finding: "Found: a page on the company site. Name: yes. Company: yes. City: yes. Confidence: high.",
        }),
        row({ key: "rdap", status: "PASS", finding: "RDAP responded for ripcony.com." }),
        row({ key: "business-registry", status: "PASS", corroborates: false, finding: "NY Active Corporations lists RIPCO. It does not tie a person to the firm." }),
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "text-risk", status: "PASS" }),
        row({ key: "velocity", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "invite-source", status: "PASS", finding: "A referral or request code is on the file." }),
      ],
      facts({ ...ripka, statement: "I lead a brokerage and would like to meet owners and developers.", inviteNote: "PF-BENCH-0000 · Benchmark invite code" }),
    );
    expect(footprint?.status).toBe("PASS");
    expect(recovered.categories.find((category) => category.id === "footprint")?.earned).toBe(8);
    expect(recovered.letter).toBe("D");
    expect(recovered.score).toBe(68);
    expect(recovered.recommendation).not.toBe("APPROVE");

    const blocked = await runPublicScreen(ripka, async (url) => {
      if (url.includes("ripcony.com")) return { ok: true, status: 200, text: "<html><p>RIPCO Real Estate</p></html>" };
      return { ok: false, status: 202, text: "challenge" };
    });
    const missed = blocked.find((check) => check.key === "screen-web");
    expect(missed?.status).toBe("UNAVAILABLE");
    expect(missed?.corroborates).not.toBe(true);
    expect(missed?.finding).toContain("All free search sources blocked");
    expect(missed?.finding).toContain("DuckDuckGo (challenge page)");
    expect(missed?.finding).toContain("Bing (challenge page)");
    expect(missed?.finding).toContain("Brave (challenge page)");
    expect(missed?.finding).toContain("Mojeek (challenge page)");
    expect(missed?.finding).toContain("GDELT (challenge page)");
  });

  it("keeps de in the Warren de Haan search queries", () => {
    expect(personWithoutSuffix("Warren de Haan")).toBe("Warren de Haan");
    expect(surnameForSearch("Warren de Haan")).toBe("de Haan");
    expect(surnameForSearch("Thomas Gilbane Jr.")).toBe("Gilbane");
    const queries = newsSearchQueries(facts({ name: "Warren de Haan", applicantName: "Warren de Haan", org: "ACORE Capital", location: "New York, NY" }));
    expect(queries.join(" ")).toContain("de Haan");
    expect(queries.join(" ")).not.toMatch(/"Haan"/);
    expect(queries.join(" ")).not.toContain("Warren Haan");
    const youtube = socialSearchQuery("Warren de Haan", "ACORE Capital");
    expect(youtube).toContain("de Haan");
    expect(youtube).not.toContain("Warren Haan");
  });

  it("does not treat a foreclosure topic headline as litigation against the company", () => {
    const podcast = "PODCAST: ACORE Capital Co-CEO Warren De Haan On Foreclosure Danger Zones, Inflation Impacts";
    const cnbc = "Warren de Haan of ACORE Capital on commercial real estate lending";
    expect(companyForeclosure(podcast)).toBe(false);
    expect(companyForeclosure("Vornado Realty Trust faces foreclosure, The Real Deal")).toBe(true);
    expect(companyForeclosure("The Real Deal: Mack Real Estate Group foreclosure in 2024")).toBe(true);
    const judged = judgeHeadline(podcast, {
      name: "Warren de Haan",
      applicantName: "Warren de Haan",
      org: "ACORE Capital",
      location: "New York, NY",
    });
    expect(judged.person).toBe(true);
    expect(judged.company).toBe(true);
    expect(judged.kind).toBe("none");
    expect(judged.foreclosureOnly).toBe(false);
    const rows = classifyNews(
      facts({ name: "Warren de Haan", applicantName: "Warren de Haan", org: "ACORE Capital", location: "New York, NY" }),
      [
        { title: podcast, snippet: podcast, url: "https://www.bisnow.com/acore-podcast", source: "Bisnow", provider: "Google News", publishedAt: null },
        { title: cnbc, snippet: cnbc, url: "https://www.cnbc.com/acore-de-haan", source: "CNBC", provider: "Google News", publishedAt: null },
      ],
      [{ name: "Google News", state: "responded" }],
    );
    const news = rows.find((row) => row.key === "news");
    expect(news?.status).toBe("PASS");
    expect(news?.corroborates).toBe(true);
    expect(news?.finding).not.toContain("Company-level litigation");
    const graded = gradeChecks(rows, facts({ name: "Warren de Haan", applicantName: "Warren de Haan", org: "ACORE Capital" }));
    expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(false);
  });

  it("shows an affiliate filing that names the person and does not add company points", () => {
    const edgar = assessEdgarMatch({
      org: "The Lightstone Group",
      person: "David Lichtenstein",
      tickersOk: true,
      companies: [{ title: "Lightstone Value Plus REIT IV", ticker: "", cik: "1619312" }],
      filingNames: [],
      textHits: [
        {
          names: ["Lightstone Value Plus REIT III  (CIK 0001563756)", "David Lichtenstein"],
          form: "EX-32",
          fileDate: "2026-03-30",
          personMatched: true,
        },
      ],
    });
    expect(edgar.status).not.toBe("PASS");
    expect(edgar.companyOnly).not.toBe(true);
    expect(edgar.corroborates).not.toBe(true);
    expect(edgar.reviewFlag).not.toBe(true);
    expect(edgar.finding).toContain("EDGAR matched a different or related company; not credited");
    expect(edgar.finding).not.toContain("Parent match, needs review");
    expect(edgar.finding).toContain("1619312");
    expect(edgar.finding).toContain("EX-32");
    expect(edgar.finding).toContain("1563756");
    expect(edgar.finding).toContain("2026-03-30");
    expect(edgar.finding).toContain("does not add points");
    const graded = gradeChecks(
      [row({ key: "edgar", status: edgar.status, corroborates: false, companyOnly: false, finding: edgar.finding, reviewFlag: edgar.reviewFlag })],
      facts({ name: "David Lichtenstein", applicantName: "David Lichtenstein", org: "The Lightstone Group" }),
    );
    expect(graded.categories.find((category) => category.id === "company")?.earned).toBe(0);
    expect(graded.letter).not.toBe("A");
    expect(graded.letter).not.toBe("B");
    expect(graded.letter).not.toBe("C");
    expect(graded.recommendation).not.toBe("APPROVE");
  });

  it("does not let the Danvorth fake rise above F or read as an approval", () => {
    const local = [
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({ key: "sanctions", status: "PASS" }),
      row({ key: "duplicate", status: "PASS" }),
      row({ key: "text-risk", status: "PASS" }),
      row({ key: "velocity", status: "PASS" }),
      row({ key: "plausibility", status: "PASS", finding: "The name, company, and role are readable." }),
      row({ key: "rdap", status: "FAIL", finding: "The domain is not registered." }),
      row({ key: "website", status: "FAIL", finding: "The domain does not resolve." }),
      row({
        key: "screen-web",
        status: "UNAVAILABLE",
        finding: "All free search sources blocked. Tried DuckDuckGo (challenge page). Search blocked.",
      }),
      row({
        key: "web-footprint",
        status: "UNAVAILABLE",
        finding: "All free search sources blocked. Tried DuckDuckGo (challenge page). Search blocked.",
      }),
    ];
    const fake = gradeChecks(
      local,
      facts({
        name: "Ambrose Tellwright",
        applicantName: "Ambrose Tellwright",
        org: "Danvorth Kestrel Holdings LLC",
        website: "https://danvorthkestrel.com",
        phone: "212-555-0199",
        applicationSubmitted: true,
      }),
    );
    expect(fake.letter).toBe("F");
    expect(fake.score).toBe(28);
    expect(fake.score).toBeLessThanOrEqual(48);
    expect(fake.recommendation).not.toBe("APPROVE");
    expect(fake.summary.reasoning).not.toContain("Incomplete application");
  });
});

describe("batch 13 wording and own-site search", () => {
  const both = (person: string, org: string) => `${person} leads ${org} in New York.`;

  it("keeps searching when Bing's first hit is the applicant's own site", async () => {
    const cases = [
      { domain: "ripcony.com", person: "Peter Ripka", org: "RIPCO Real Estate" },
      { domain: "lightstonegroup.com", person: "David Lichtenstein", org: "The Lightstone Group" },
      { domain: "acorecapital.com", person: "Warren de Haan", org: "ACORE Capital" },
      { domain: "walkerdunlop.com", person: "Willy Walker", org: "Walker & Dunlop" },
    ];
    for (const { domain, person, org } of cases) {
      const applicant = facts({
        name: person,
        applicantName: person,
        org,
        website: `https://www.${domain}`,
        location: "New York, NY",
      });
      const own = `https://www.${domain}/team`;
      const independent = "https://www.bisnow.com/news/independent-page";
      const checks = await runPublicScreen(applicant, async (url) => {
        if (url.includes("duckduckgo.com")) return { ok: false, status: 202, text: "challenge" };
        if (url.includes("bing.com")) {
          return { ok: true, status: 200, text: `<ol><li class="b_algo"><a href="${own}">${both(person, org)}</a></li></ol>` };
        }
        if (url.includes("mojeek.com")) {
          return { ok: true, status: 200, text: `<a class="title" href="${independent}">${both(person, org)}</a>` };
        }
        if (url.includes(domain)) return { ok: true, status: 200, text: `<html><p>${org}</p></html>` };
        return { ok: false, status: 403, text: "" };
      });
      const web = checks.find((check) => check.key === "screen-web");
      expect(web?.source).toBe("Mojeek");
      expect(web?.corroborates).toBe(true);
      expect(web?.selfReported).not.toBe(true);
      expect(web?.url).not.toContain(domain);
      const footprint = checks.find((check) => check.key === "web-footprint");
      expect(footprint?.status).toBe("PASS");
      expect(footprint?.selfReported).not.toBe(true);
      expect(footprint?.url).toContain("bisnow.com");
    }
  });

  it("uses one own-site sentence in the company line, what checked out, and what could not be checked", async () => {
    const applicant = facts({
      name: "Peter Ripka",
      applicantName: "Peter Ripka",
      org: "RIPCO Real Estate",
      website: "https://www.ripcony.com",
      location: "New York, NY",
    });
    const checks = await runPublicScreen(applicant, async (url) => {
      if (url.includes("duckduckgo.com")) return { ok: false, status: 202, text: "challenge" };
      if (url.includes("bing.com")) {
        return {
          ok: true,
          status: 200,
          text: `<ol><li class="b_algo"><a href="https://www.ripcony.com/team">${both("Peter Ripka", "RIPCO Real Estate")}</a></li></ol>`,
        };
      }
      if (url.includes("ripcony.com")) return { ok: true, status: 200, text: "<html><p>RIPCO Real Estate</p></html>" };
      return { ok: false, status: 403, text: "" };
    });
    const web = checks.find((check) => check.key === "screen-web");
    expect(web?.selfReported).toBe(true);
    expect(web?.corroborates).not.toBe(true);
    const graded = gradeChecks(
      [
        ...checks.filter((check) => check.key === "screen-web" || check.key === "web-footprint"),
        row({
          key: "linkedin-fetch",
          status: "PASS",
          companyOnly: true,
          corroborates: false,
          source: "LinkedIn",
          finding: "The public LinkedIn page company confirmed, person NOT confirmed. Name: no. Company: yes.",
        }),
      ],
      applicant,
    );
    const own = "The only web search hit was the applicant's own site. That is not an independent confirmation.";
    expect(graded.summary.company).toContain(own);
    expect(graded.summary.checkedOut).toContain(own);
    expect(graded.summary.couldNotCheck).toContain(own);
    expect(graded.summary.company).not.toContain("No public web result confirmed the person and the company together");
    expect(graded.summary.couldNotCheck).not.toContain("(LinkedIn)");
    expect(graded.summary.couldNotCheck).not.toMatch(/Name:|Company:|Confidence:/);
    expect(graded.categories.find((category) => category.id === "footprint")?.reason).not.toContain("No public web result confirmed");
  });

  it("says headlines named the company but not this person, without the raw score", () => {
    const graded = gradeChecks(
      [
        row({
          key: "news",
          status: "INCONCLUSIVE",
          finding: "News search: no match found. Name: no. Company: yes. City: no. Confidence: low.",
          source: "Google News",
        }),
        row({
          key: "screen-news",
          status: "INCONCLUSIVE",
          finding: "Searched: news. No result found. Name: no. Company: yes. City: yes. Confidence: low.",
          source: "Google News",
        }),
      ],
      facts({ name: "Robert Mullen", applicantName: "Robert Mullen", org: "STO Building Group" }),
    );
    expect(graded.summary.company).toContain("Headlines named the company but not this person.");
    expect(graded.summary.company).not.toContain("No news item was confirmed");
    expect(graded.summary.couldNotCheck).toContain("Headlines named the company but not this person.");
    expect(graded.summary.couldNotCheck).not.toMatch(/Name:|Company:|City:|Confidence:/);
    expect(graded.summary.company).not.toMatch(/Confidence:/);
  });

  it("does not parent-match Madison Realty Capital to Madison Air Solutions", () => {
    const edgar = assessEdgarMatch({
      org: "Madison Realty Capital",
      person: "Josh Zegen",
      tickersOk: true,
      companies: [{ title: "Madison Air Solutions Corp", ticker: "MAIR", cik: "2098430" }],
      filingNames: [],
    });
    expect(edgar.reviewFlag).not.toBe(true);
    expect(edgar.companyOnly).not.toBe(true);
    expect(edgar.corroborates).not.toBe(true);
    expect(edgar.finding).toContain("EDGAR matched a different or related company; not credited");
    expect(edgar.finding).toContain("2098430");
    const graded = gradeChecks(
      [row({ key: "edgar", status: edgar.status, corroborates: false, companyOnly: false, reviewFlag: edgar.reviewFlag, finding: edgar.finding, source: "SEC EDGAR" })],
      facts({ org: "Madison Realty Capital", name: "Josh Zegen", applicantName: "Josh Zegen" }),
    );
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("0 of 6");
    expect(graded.summary.company).toContain("EDGAR matched a different or related company; not credited");
    expect(graded.summary.couldNotCheck).toContain("EDGAR matched a different or related company; not credited");
    expect(graded.summary.couldNotCheck).not.toContain("came back without a usable match");
  });

  it("keeps a neutral person-and-company story as a pass when another headline is a company lawsuit", () => {
    const blackstone = "Jonathan Gray leads Blackstone through a new fund";
    const lawsuit = "Deadline Alert: Blackstone, Inc. Stockholders Face December 8, 2026 Lead Plaintiff Deadline in Securities Fraud Class Action";
    const compass = "Robert Reffkin leads Compass in New York";
    const compassSuit = "Deadline Alert: Compass, Inc. Stockholders Face December 8, 2026 Lead Plaintiff Deadline in Securities Fraud Class Action";
    const madison = "Josh Zegen leads Madison Realty Capital";
    const madisonSuit = "Madison Realty Capital faces a lawsuit over a New York loan";
    for (const [person, org, neutral, suit] of [
      ["Jonathan Gray", "Blackstone", blackstone, lawsuit],
      ["Robert Reffkin", "Compass", compass, compassSuit],
      ["Josh Zegen", "Madison Realty Capital", madison, madisonSuit],
    ] as const) {
      const rows = classifyNews(
        facts({ name: person, applicantName: person, org, location: "New York, NY" }),
        [
          { title: suit, snippet: suit, url: "https://example.com/suit", source: "Wire", provider: "Google News", publishedAt: null },
          { title: neutral, snippet: neutral, url: "https://example.com/neutral", source: "Desk", provider: "Google News", publishedAt: null },
        ],
        [{ name: "Google News", state: "responded" }],
      );
      const news = rows.find((item) => item.key === "news");
      expect(news?.status).toBe("PASS");
      expect(news?.corroborates).toBe(true);
      expect(news?.url).toBe("https://example.com/neutral");
      expect(news?.finding).toContain("Company-level litigation");
      const graded = gradeChecks(rows, facts({ name: person, applicantName: person, org }));
      expect(graded.attention.some((item) => item.title === "Company litigation headline")).toBe(true);
    }
  });

  it("describes an exact current-name EDGAR row as the outside source for own-site credit", () => {
    const finding = "EDGAR's current name for CIK 1497770 is WALKER & DUNLOP, INC. That is an exact current-name match. It does not tie the person to the firm.";
    const graded = gradeChecks(
      [
        row({ key: "edgar", status: "INCONCLUSIVE", companyOnly: true, corroborates: false, finding, source: "SEC EDGAR" }),
        row({
          key: "website",
          status: "PASS",
          companyOnly: true,
          selfReported: true,
          corroborates: false,
          finding: "Found: a page on the company site. Name: no. Company: yes. City: no. Confidence: high.",
          source: "Company website",
        }),
      ],
      facts({ name: "Willy Walker", applicantName: "Willy Walker", org: "Walker & Dunlop", website: "https://www.walkerdunlop.com" }),
    );
    expect(graded.summary.company).toContain("EDGAR's exact current-name match is an outside source, so the company's own site counts as company credit. It does not tie the person.");
    expect(graded.summary.company).not.toContain("No EDGAR filing was confirmed");
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("4 of 8");
    expect(graded.categories.find((category) => category.id === "company")?.reason).toContain("3 of 6");
  });

  it("strips a leading QA-TEST prefix before the EDGAR and website-alias checks", () => {
    expect(domainMatchesOrgStem("walkerdunlop", "QA-TEST Walker & Dunlop")).toBe(true);
    expect(factsForSearch(facts({ email: "person@gmail.com", org: "QA-TEST Walker & Dunlop" })).org).toBe("QA-TEST Walker & Dunlop");
    const edgar = assessEdgarMatch({
      org: "QA-TEST Walker & Dunlop",
      person: "Willy Walker",
      tickersOk: true,
      companies: [{ title: "WALKER & DUNLOP, INC.", ticker: "WD", cik: "1497770" }],
      filingNames: [],
    });
    expect(edgar.finding).toContain("1497770");
    expect(edgar.companyOnly).toBe(true);
    expect(edgar.status).toBe("INCONCLUSIVE");
    expect(matchEdgarCompany([{ title: "CBRE GROUP, INC.", ticker: "CBRE", cik: "1138118" }], "QA-TEST CBRE Group, Inc.")).toBeNull();
  });
});

describe("corroboration, social prose, lawsuit headlines, and QA query prefix", () => {
  it("counts screen-web and web-footprint once when they name the same page", () => {
    const page = "https://startupfundraising.com/investors/willy-walker";
    const shared = `Found: Willy Walker is CEO of Walker & Dunlop. ${page} Name: yes. Company: yes. City: no. Confidence: high.`;
    const pair = [
      row({ key: "screen-web", status: "PASS", corroborates: true, url: "https://www.bing.com/search?q=willy", finding: shared, source: "Bing" }),
      row({ key: "web-footprint", status: "PASS", corroborates: true, url: page, finding: shared, source: "Bing" }),
    ];
    expect(corroboratingPasses(pair)).toHaveLength(1);
    const separate = [
      row({ key: "screen-web", status: "PASS", corroborates: true, url: "https://www.bisnow.com/walker", finding: "Found: Willy Walker at Walker & Dunlop. https://www.bisnow.com/walker Name: yes. Company: yes.", source: "Bing" }),
      row({ key: "web-footprint", status: "PASS", corroborates: true, url: "https://www.cnbc.com/walker", finding: "Found: Willy Walker at Walker & Dunlop. https://www.cnbc.com/walker Name: yes. Company: yes.", source: "CNBC" }),
    ];
    expect(corroboratingPasses(separate)).toHaveLength(2);
    const graded = gradeChecks(
      [
        ...pair,
        row({ key: "email-syntax", status: "PASS" }),
        row({ key: "disposable-email", status: "PASS" }),
        row({ key: "role-address", status: "PASS" }),
        row({ key: "phone-state", status: "PASS", corroborates: false }),
        row({ key: "linkedin-format", status: "PASS", corroborates: false }),
        row({ key: "linkedin-fetch", status: "PASS", corroborates: false, finding: "A public LinkedIn page included the person's name." }),
        row({ key: "website", status: "PASS", corroborates: false, finding: "A public web page included the person or the company name." }),
        row({ key: "rdap", status: "PASS", finding: "RDAP responded." }),
        row({ key: "business-registry", status: "PASS", corroborates: false, finding: "A registry lists the company. It does not tie the person." }),
        row({ key: "news", status: "PASS", corroborates: false, finding: "A headline names the person and the company." }),
        row({ key: "social-links", status: "PASS", corroborates: false }),
        row({ key: "sanctions", status: "PASS" }),
        row({ key: "duplicate", status: "PASS" }),
        row({ key: "text-risk", status: "PASS" }),
        row({ key: "velocity", status: "PASS" }),
        row({ key: "plausibility", status: "PASS" }),
        row({ key: "invite-source", status: "PASS", finding: "A referral or request code is on the file." }),
        row({ key: "business-card", status: "PASS", corroborates: false, finding: "The card includes the name and company." }),
      ],
      facts({
        name: "Willy Walker",
        applicantName: "Willy Walker",
        org: "Walker & Dunlop",
        website: "https://www.walkerdunlop.com",
        phone: "212-555-0100",
        linkedinUrl: "https://www.linkedin.com/in/willy-walker",
        cardUploaded: true,
        referenceCount: 1,
        statement: "I lead a commercial real estate finance firm and want to meet other owners.",
      }),
    );
    expect(graded.caps.some((line) => line.startsWith("Capped at C"))).toBe(true);
    expect(graded.letter).not.toBe("A");
    expect(graded.letter).not.toBe("B");
    expect(graded.categories.find((category) => category.id === "footprint")?.earned).toBeGreaterThan(0);
  });

  it("does not print the raw YouTube or TikTok score under what could not be checked", () => {
    const graded = gradeChecks(
      [
        row({
          key: "screen-youtube",
          status: "INCONCLUSIVE",
          finding: "Searched: Willy Walker on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.",
          source: "YouTube",
        }),
        row({
          key: "screen-tiktok",
          status: "INCONCLUSIVE",
          finding: "Searched: Willy Walker on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.",
          source: "TikTok",
        }),
        row({
          key: "screen-youtube",
          status: "UNAVAILABLE",
          finding: "Searched: Willy Walker on YouTube. Name: no. Company: no. City: no. Confidence: none.",
          source: "YouTube",
        }),
      ],
      facts({ name: "Willy Walker", applicantName: "Willy Walker", org: "Walker & Dunlop" }),
    );
    expect(graded.summary.couldNotCheck).toContain("YouTube: no match found.");
    expect(graded.summary.couldNotCheck).toContain("TikTok: no match found.");
    expect(graded.summary.couldNotCheck).toContain("YouTube could not be checked");
    expect(graded.summary.couldNotCheck).not.toMatch(/Name:|Company:|City:|Confidence:/);
  });

  it("keeps a company lawsuit that names a title, not the applicant, from failing news or reading as a departure", () => {
    const compassTitle = "OneKey Joins CRMLS's Lawsuit Against Compass, Citing Months of Emailed Litigation Threats From CEO";
    const compassFacts = facts({ name: "Robert Reffkin", applicantName: "Robert Reffkin", org: "Compass", location: "New York, NY" });
    const compass = classifyNews(
      compassFacts,
      [
        { title: compassTitle, snippet: "The filing cites the Compass CEO.", url: "https://www.rismedia.com/onekey", source: "RISMedia", publishedAt: "2026-10-27T15:00:00.000Z", provider: "Google News" },
        { title: "Robert Reffkin leads Compass in New York", snippet: "Robert Reffkin leads Compass in New York.", url: "https://example.com/reffkin", source: "Desk", publishedAt: "2026-02-01T15:00:00.000Z", provider: "Google News" },
      ],
      [{ name: "Google News", state: "responded" }],
    );
    const compassNews = compass.find((item) => item.key === "news");
    expect(compassNews?.status).toBe("PASS");
    expect(compassNews?.corroborates).toBe(true);
    expect(compass.some((item) => item.finding.startsWith("Departure"))).toBe(false);
    expect(compass.some((item) => item.finding.includes(compassTitle) && item.finding.startsWith("Company litigation"))).toBe(true);
    const compassGrade = gradeChecks(compass, compassFacts);
    expect(compassGrade.categories.find((category) => category.id === "footprint")?.reason).toContain("8 of 8");
    expect(compassGrade.attention.some((item) => item.severity === "High" && item.title.startsWith("News"))).toBe(false);

    const terraTitle = "David Martin’s Terra Had A Good Year, Despite Lawsuit Over Deadly Condo Collapse";
    const terraFacts = facts({ name: "David Martin", applicantName: "David Martin", org: "Terra Group", location: "Miami, FL" });
    const terra = classifyNews(
      terraFacts,
      [
        { title: terraTitle, snippet: "Surviving victims sued Terra. Commercial Observer, 2022.", url: "https://commercialobserver.com/2022/05/terra", source: "Commercial Observer", publishedAt: "2022-05-24T15:00:00.000Z", provider: "Google News" },
        { title: "David Martin leads Terra Group in Miami", snippet: "David Martin leads Terra Group in Miami.", url: "https://example.com/martin", source: "Desk", publishedAt: "2026-02-01T15:00:00.000Z", provider: "Google News" },
      ],
      [{ name: "Google News", state: "responded" }],
    );
    const terraNews = terra.find((item) => item.key === "news");
    expect(terraNews?.status).toBe("PASS");
    expect(terra.some((item) => item.finding.startsWith("Departure"))).toBe(false);
    expect(terra.some((item) => item.status === "FAIL")).toBe(false);
    const terraGrade = gradeChecks(terra, terraFacts);
    expect(terraGrade.categories.find((category) => category.id === "footprint")?.reason).toContain("8 of 8");
    expect(terraGrade.attention.some((item) => item.severity === "High" && item.title.startsWith("News"))).toBe(false);

    const named = classifyNews(
      terraFacts,
      [
        { title: "David Martin was sued over a Terra Group project", snippet: "The civil complaint names David Martin.", url: "https://example.com/sued", source: "Law.com", publishedAt: "2026-03-01T15:00:00.000Z", provider: "Google News" },
        { title: "David Martin leads Terra Group in Miami", snippet: "David Martin leads Terra Group in Miami.", url: "https://example.com/martin", source: "Desk", publishedAt: "2026-02-01T15:00:00.000Z", provider: "Google News" },
      ],
      [{ name: "Google News", state: "responded" }],
    );
    expect(named.find((item) => item.key === "news")?.status).toBe("FAIL");
    expect(named.find((item) => item.key === "news")?.reviewFlag).toBe(true);
  });

  it("strips a leading QA-TEST prefix in every search query for a non-marker email", async () => {
    const applicant = facts({
      name: "Willy Walker",
      applicantName: "Willy Walker",
      email: "person@gmail.com",
      org: "QA-TEST Walker & Dunlop",
      location: "New York, NY",
      website: "https://www.walkerdunlop.com",
    });
    expect(factsForSearch(applicant).org).toBe("QA-TEST Walker & Dunlop");
    expect(newsSearchQueries(applicant).join(" ")).not.toContain("QA-TEST");
    expect(newsSearchQueries(applicant).join(" ")).toContain("Dunlop");
    expect(socialSearchQuery(applicant.applicantName, applicant.org)).not.toContain("QA-TEST");
    expect(gdeltQuery(applicant)).not.toContain("QA-TEST");
    expect(instagramCompanyTag(applicant.org, applicant.applicantName).toLowerCase()).not.toContain("qatest");
    expect(edgarCompanySearchPhrase(applicant.org)).not.toContain("QA-TEST");
    expect(edgarCompanySearchPhrase(applicant.org)).toContain("Walker");
    const seen: string[] = [];
    await runPublicScreen(applicant, async (url) => {
      seen.push(url);
      return { ok: false, status: 404, text: "" };
    });
    expect(seen.some((url) => /QA-TEST|QA%2DTEST|QA-TEST/i.test(decodeURIComponent(url)))).toBe(false);
    expect(seen.some((url) => decodeURIComponent(url).includes("Walker"))).toBe(true);
  });
});

describe("live search budget, exact EDGAR credit, and company-file YouTube", () => {
  it("keeps searching when DuckDuckGo hangs and records which source answered", async () => {
    const applicant = facts({
      name: "Ada West",
      applicantName: "Ada West",
      org: "Western Alliance Bancorporation",
      location: "Phoenix, AZ",
      website: "",
    });
    const checks = await runPublicScreen(applicant, async (url) => {
      if (url.includes("duckduckgo.com")) return new Promise(() => undefined);
      if (url.includes("bing.com")) {
        return {
          ok: true,
          status: 200,
          text: `<ol><li class="b_algo"><a href="https://www.reuters.com/western-alliance">Ada West leads Western Alliance Bancorporation in Phoenix</a></li></ol>`,
        };
      }
      return { ok: false, status: 404, text: "" };
    });
    const web = checks.find((check) => check.key === "screen-web");
    expect(web?.status).toBe("PASS");
    expect(web?.corroborates).toBe(true);
    expect(web?.finding).toContain("DuckDuckGo (timed out)");
    expect(web?.finding).toContain("Bing (result)");
    expect(web?.finding).not.toContain("timed out or was dropped");
    const footprint = checks.find((check) => check.key === "web-footprint");
    expect(footprint?.status).not.toBe("UNAVAILABLE");
    const graded = gradeChecks([web!, footprint!], applicant);
    expect(graded.categories.find((category) => category.id === "footprint")?.earned).toBe(8);
  }, 20000);

  it("does not score a search where every free source times out", async () => {
    const applicant = facts({ name: "Ada West", applicantName: "Ada West", org: "Western Alliance Bancorporation", website: "" });
    const checks = await runPublicScreen(applicant, async (url) => {
      if (/duckduckgo|bing\.com|brave\.com|mojeek|wikipedia|wikidata|gdeltproject/.test(url)) return { ok: false, status: 0, text: "" };
      return { ok: false, status: 404, text: "" };
    });
    const web = checks.find((check) => check.key === "screen-web");
    expect(web?.status).toBe("UNAVAILABLE");
    expect(web?.corroborates).not.toBe(true);
    expect(web?.finding).toContain("DuckDuckGo (timed out)");
    expect(web?.finding).toContain("Bing (timed out)");
    expect(web?.finding).toContain("Not checked");
    expect(web?.finding).toContain("Not a pass");
    const graded = gradeChecks(checks, applicant);
    expect(graded.categories.find((category) => category.id === "footprint")?.earned).toBe(0);
    expect(graded.summary.couldNotCheck).toContain("DuckDuckGo (timed out)");
    expect(graded.summary.checkedOut).not.toContain("public web result names");
  });

  it("names the CourtListener failure and does not award points", () => {
    const applicant = facts({ name: "Ada West", applicantName: "Ada West", org: "Western Alliance Bancorporation" });
    const denied = assessCourts("", { ok: false, status: 401 }, applicant);
    expect(denied.status).toBe("UNAVAILABLE");
    expect(denied.finding).toContain("HTTP 401");
    expect(denied.finding).toContain("Not a pass");
    const blocked = assessCourts("", { ok: false, status: 403 }, applicant);
    expect(blocked.finding).toContain("HTTP 403");
    const timed = assessCourts("", { ok: false, status: 0, failure: "timeout" }, applicant);
    expect(timed.finding).toContain("timed out");
    expect(timed.finding).toContain("/api/rest/v4/search/?type=o");
    const graded = gradeChecks(
      [row({ key: "courts", status: timed.status, weight: 0, finding: timed.finding, source: "CourtListener" })],
      applicant,
    );
    expect(graded.score).toBeLessThan(70);
    expect(graded.summary.couldNotCheck).toContain("timed out");
    expect(graded.summary.checkedOut).not.toContain("CourtListener");
  });

  it("gives an exact current-name EDGAR row company credit without tying the person or lifting a fake to C", () => {
    const exact = "EDGAR's current name for CIK 1212545 is WESTERN ALLIANCE BANCORPORATION. That is an exact current-name match. It does not tie the person to the firm.";
    const local = [
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({ key: "sanctions", status: "PASS" }),
      row({ key: "duplicate", status: "PASS" }),
      row({ key: "text-risk", status: "PASS" }),
      row({ key: "velocity", status: "PASS" }),
      row({ key: "plausibility", status: "PASS" }),
      row({ key: "rdap", status: "PASS", finding: "RDAP responded." }),
    ];
    const real = gradeChecks(
      [...local, row({ key: "edgar", status: "INCONCLUSIVE", companyOnly: true, corroborates: false, finding: exact, source: "SEC EDGAR" })],
      facts({ name: "Ada West", applicantName: "Ada West", org: "Western Alliance Bancorporation", website: "https://www.westernalliancebancorporation.com" }),
    );
    expect(real.categories.find((category) => category.id === "company")?.reason).toContain("3 of 6");
    expect(real.summary.company).toContain("does not tie the person");
    expect(real.letter).not.toBe("A");
    expect(real.letter).not.toBe("B");
    expect(real.letter).not.toBe("C");
    expect(real.recommendation.startsWith("APPROVE")).toBe(false);
    const before = gradeChecks(local, facts({ name: "Ada West", applicantName: "Ada West", org: "Western Alliance Bancorporation" }));
    expect(real.score - before.score).toBe(3);

    const fake = gradeChecks(
      [
        ...local,
        row({ key: "website", status: "PASS", companyOnly: true, selfReported: true, corroborates: false, finding: "Found: a page on the company site. Name: no. Company: yes. City: no. Confidence: high." }),
        row({ key: "edgar", status: "INCONCLUSIVE", companyOnly: true, corroborates: false, finding: exact, source: "SEC EDGAR" }),
      ],
      facts({
        name: "Nix Qwvzn",
        applicantName: "Nix Qwvzn",
        org: "Western Alliance Bancorporation",
        website: "https://www.westernalliancebancorporation.com",
        statement: "I run a made-up desk and this file should stay below a C.",
      }),
    );
    expect(fake.categories.find((category) => category.id === "company")?.reason).toContain("3 of 6");
    expect(fake.letter).toBe("F");
    expect(fake.score).toBeLessThan(70);
    expect(fake.recommendation).not.toBe("APPROVE");
    expect(fake.recommendation).not.toBe("APPROVE WITH CONDITIONS");
  });

  it("does not say Company: yes on a YouTube miss for the company file or the application", async () => {
    const page = '{"title":{"runs":[{"text":"Walker & Dunlop earnings call"}]}}';
    const fetchText = async (url: string) => (url.includes("youtube.com") ? { ok: true, status: 200, text: page } : { ok: false, status: 404, text: "" });
    const application = await runPublicScreen(
      facts({ name: "Willy Walker", applicantName: "Willy Walker", org: "Walker & Dunlop", website: "" }),
      fetchText,
    );
    const companyFile = await runPublicScreen(
      facts({ name: "Walker & Dunlop", applicantName: "Willy Walker", org: "Walker & Dunlop", website: "" }),
      fetchText,
    );
    const appRow = application.find((check) => check.key === "screen-youtube");
    const companyRow = companyFile.find((check) => check.key === "screen-youtube");
    expect(appRow?.finding).toContain("Name: no");
    expect(appRow?.finding).toContain("Company: no");
    expect(companyRow?.finding).toContain("Company: no");
    expect(companyRow?.finding).not.toContain("Company: yes");
    expect(displayedCheckFinding(companyRow?.finding || "")).toContain("Company: no");
    expect(displayedCheckFinding("No result found that names this person and this company. Name: no. Company: yes. City: no. Confidence: low.")).toContain(
      "Company: no",
    );
  });

  it("says one independent source tied the person, and names an EDGAR reporting-owner filing", () => {
    const tied = gradeChecks(
      [
        row({
          key: "screen-web",
          status: "PASS",
          corroborates: true,
          finding: "A public web result names the person and the company. Name: yes. Company: yes. City: yes. Confidence: high.",
          source: "Bing",
          url: "https://www.bisnow.com/daniel-brodsky",
        }),
      ],
      facts({ name: "Daniel Brodsky", applicantName: "Daniel Brodsky", org: "The Brodsky Organization", website: "https://www.brodsky.com" }),
    );
    expect(tied.summary.reasoning).toContain("One independent source tied this person to this company.");
    expect(tied.summary.reasoning).toContain("Approval needs two.");
    expect(tied.summary.reasoning).not.toContain("Nothing tied this person to that company");
    const edgar = gradeChecks(
      [
        row({
          key: "edgar",
          status: "PASS",
          corroborates: true,
          finding: "EDGAR lists Brodsky Organization. A Form 3, 4, or 5 for this CIK names Brodsky Daniel as a reporting owner.",
          source: "SEC EDGAR",
        }),
      ],
      facts({ name: "Daniel Brodsky", applicantName: "Daniel Brodsky", org: "The Brodsky Organization" }),
    );
    expect(edgar.summary.company).toContain("reporting-owner filing (Form 3, 4, or 5)");
    expect(edgar.summary.checkedOut).toContain("reporting-owner filing (Form 3, 4, or 5)");
    const samePoints = gradeChecks(
      [row({ key: "edgar", status: "PASS", corroborates: true, finding: "EDGAR lists the company.", source: "SEC EDGAR" })],
      facts({ name: "Daniel Brodsky", applicantName: "Daniel Brodsky", org: "The Brodsky Organization" }),
    );
    expect(edgar.score).toBe(samePoints.score);

    const missed = gradeChecks(
      [
        row({
          key: "screen-web",
          status: "UNAVAILABLE",
          finding: "Tried DuckDuckGo (timed out), Bing (timed out). Not checked. Not a pass.",
          source: "Web search",
        }),
        row({
          key: "web-footprint",
          status: "UNAVAILABLE",
          finding: "Tried DuckDuckGo (timed out), Bing (timed out). Not checked. Not a pass.",
          source: "Web search",
        }),
        row({ key: "news", status: "PASS", corroborates: true, finding: "A headline names the person and the company.", source: "News" }),
      ],
      facts({ name: "Daniel Brodsky", applicantName: "Daniel Brodsky", org: "The Brodsky Organization" }),
    );
    expect(missed.summary.company.toLowerCase()).toContain("unavailable");
    expect(missed.summary.company).not.toContain("did not return a page");
    expect(missed.categories.find((category) => category.id === "footprint")?.reason.toLowerCase()).toContain("unavailable");
    expect(missed.categories.find((category) => category.id === "footprint")?.reason).not.toContain("did not return a page");
  });

  it("retries a failed Bing page and does not call that a miss", async () => {
    const applicant = facts({
      name: "Justin Elghanayan",
      applicantName: "Justin Elghanayan",
      org: "Rockrose Development Corp.",
      location: "New York, NY",
      website: "",
    });
    let bingCalls = 0;
    const recovered = await runPublicScreen(applicant, async (url) => {
      if (url.includes("duckduckgo.com")) return { ok: false, status: 0, text: "" };
      if (url.includes("bing.com")) {
        bingCalls += 1;
        if (bingCalls === 1) return { ok: true, status: 200, text: "<html><body></body></html>" };
        return {
          ok: true,
          status: 200,
          text: `<ol><li class="b_algo"><a href="https://www.loopnet.com/justin-elghanayan">Justin Elghanayan | Rockrose Development Corp.</a></li></ol>`,
        };
      }
      return { ok: false, status: 404, text: "" };
    });
    const web = recovered.find((check) => check.key === "screen-web");
    expect(web?.status).toBe("PASS");
    expect(web?.finding).toContain("Tried");
    expect(web?.finding).toContain("Bing (result)");
    expect(web?.finding).toContain("loopnet.com");

    const stillDown = await runPublicScreen(applicant, async (url) => {
      if (url.includes("duckduckgo.com") || url.includes("bing.com")) return { ok: true, status: 200, text: "<html><body></body></html>" };
      return { ok: false, status: 404, text: "" };
    });
    const missed = stillDown.find((check) => check.key === "screen-web");
    expect(missed?.status).toBe("UNAVAILABLE");
    expect(missed?.corroborates).not.toBe(true);
    expect(missed?.finding).toContain("Search did not complete");
    expect(missed?.finding).toContain("Not checked");
    expect(missed?.finding).toContain("Not a pass");
    expect(missed?.finding).toContain("Tried");
    const missedGrade = gradeChecks([missed!], applicant);
    expect(missedGrade.categories.find((category) => category.id === "footprint")?.earned).toBe(0);

    const unrelated = `<ol><li class="b_algo"><a href="https://example.com/other">Justin Elghanayan announced a project for a different firm in New York</a></li></ol>`;
    const realMiss = await runPublicScreen(applicant, async (url) => {
      if (url.includes("bing.com") || url.includes("duckduckgo.com")) return { ok: true, status: 200, text: unrelated };
      return { ok: false, status: 404, text: "" };
    });
    const emptyHit = realMiss.find((check) => check.key === "screen-web");
    expect(emptyHit?.status).toBe("INCONCLUSIVE");
    expect(emptyHit?.finding).toContain("Tried");
    expect(emptyHit?.finding).not.toContain("Search did not complete");
    expect(gradeChecks([emptyHit!], applicant).categories.find((category) => category.id === "footprint")?.earned).toBe(0);
  });

  it("does not treat a lowercase plaza as Plaza Construction", () => {
    const factsForHeadline = {
      name: "David Wang",
      applicantName: "David Wang",
      org: "Plaza Construction",
      location: "New York, NY",
    };
    expect(judgeHeadline("Cochecton Planning Board moves Fosterdale plaza construction forward", factsForHeadline).company).toBe(false);
    expect(judgeHeadline("Grand Army Plaza Construction Site opens downtown", factsForHeadline).company).toBe(false);
    expect(judgeHeadline("David Wang leads Plaza Construction in New York", factsForHeadline).company).toBe(true);
    const rows = classifyNews(
      facts(factsForHeadline),
      [
        {
          title: "Cochecton Planning Board moves Fosterdale plaza construction forward",
          snippet: "The board discussed plaza construction.",
          url: "https://example.com/fosterdale",
          source: "Local",
          provider: "Google News",
          publishedAt: null,
        },
        {
          title: "Grand Army Plaza Construction Site opens downtown",
          snippet: "Work continues at Grand Army Plaza.",
          url: "https://example.com/army",
          source: "Local",
          provider: "Google News",
          publishedAt: null,
        },
      ],
      [{ name: "Google News", state: "responded" }],
    );
    const news = rows.find((item) => item.key === "news");
    expect(news?.finding).not.toContain("names the person or the company");
    expect(news?.finding.toLowerCase()).not.toContain("plaza construction");
  });

  it("does not treat a Bing page of unrelated first names as an answer", async () => {
    const applicant = facts({
      name: "Todd Rolapp",
      applicantName: "Todd Rolapp",
      org: "Bass, Berry & Sims",
      location: "Nashville, TN",
      website: "",
    });
    const todd = [
      "Todd Smith joined a Chicago firm",
      "Todd Allen spoke at a conference",
      "Todd Harris bought a house",
      "Todd Nguyen opened a cafe",
      "Todd Patel ran a marathon",
      "Todd Brooks published a novel",
      "Todd Bennett coaches youth sports",
      "Todd Carter visited Denver",
      "Todd Edwards teaches chemistry",
      "Todd Foster listed a car for sale",
    ];
    const page = `<ol>${todd.map((title, index) => `<li class="b_algo"><a href="https://example.com/todd-${index}">${title}</a></li>`).join("")}</ol>`;
    let bingCalls = 0;
    const rows = await runPublicScreen(applicant, async (url) => {
      if (url.includes("bing.com")) {
        bingCalls += 1;
        return { ok: true, status: 200, text: page };
      }
      if (url.includes("duckduckgo.com")) return { ok: true, status: 200, text: "<html><body></body></html>" };
      return { ok: false, status: 404, text: "" };
    });
    const web = rows.find((check) => check.key === "screen-web");
    const footprint = rows.find((check) => check.key === "web-footprint");
    expect(bingCalls).toBe(1);
    expect(web?.status).toBe("INCONCLUSIVE");
    expect(web?.corroborates).not.toBe(true);
    expect(web?.finding).toContain("Not found");
    expect(web?.finding).not.toContain("Not checked");
    expect(web?.finding).toContain("Tried");
    expect(web?.finding).toContain("Bing (no name and company)");
    expect(footprint?.status).toBe("INCONCLUSIVE");
    expect(footprint?.finding).toContain("Tried");
    expect(footprint?.corroborates).not.toBe(true);
    const graded = gradeChecks([web!, footprint!], applicant);
    expect(graded.categories.find((category) => category.id === "footprint")?.earned).toBe(0);
    expect(graded.score).toBeLessThanOrEqual(49);
    expect(graded.letter).toBe("F");
  });

  it("keeps an ordinary dictionary word with the rest of the brand", () => {
    expect(companySearchTerm("Ocean Bank", "Carlos Alfonso")).toBe("ocean bank");
    expect(companySearchTerm("Ocean Bank", "Carlos Alfonso")).not.toBe("ocean");
    expect(socialSearchQuery("Carlos Alfonso", "Ocean Bank")).toBe(`"Carlos Alfonso" "ocean bank"`);
    expect(companySearchTerm("Related Group", "Jorge Perez")).toBe("related group");
    expect(companySearchTerm("Plaza Construction", "David Wang")).toBe("plaza construction");
    expect(companySearchTerm("Rockrose Development Corp.", "Justin Elghanayan")).toBe("rockrose");
    const falseLines = [
      ["related group of burglaries", "Related Group"],
      ["ocean waters flood bank parking lot", "Ocean Bank"],
      ["ocean bank reports record quarter", "Ocean Bank"],
      ["related group breaks ground in brickell", "Related Group"],
    ] as const;
    for (const [line, org] of falseLines) {
      expect(mentionsCompany(line, org)).toBe(false);
      expect(judgeHeadline(line, { name: "Alex Example", org, location: "Miami, FL" }).company).toBe(false);
    }
    expect(mentionsCompany("Ocean Bank reports record quarter", "Ocean Bank")).toBe(true);
    expect(mentionsCompany("Related Group breaks ground in Brickell", "Related Group")).toBe(true);
    expect(judgeHeadline("Ocean Bank reports record quarter", { name: "Carlos Alfonso", org: "Ocean Bank", location: "Miami, FL" }).company).toBe(true);
    expect(judgeHeadline("Related Group breaks ground in Brickell", { name: "Jorge Perez", org: "Related Group", location: "Miami, FL" }).company).toBe(true);
  });

  it("keeps the search engine notes on the web footprint row", async () => {
    const applicant = facts({
      name: "Todd Rolapp",
      applicantName: "Todd Rolapp",
      org: "Bass, Berry & Sims",
      location: "Nashville, TN",
      website: "https://www.bassberry.com",
    });
    const hit = `<ol><li class="b_algo"><a href="https://www.bassberry.com/people/todd-rolapp">Todd Rolapp is a partner at Bass, Berry &amp; Sims</a></li></ol>`;
    const rows = await runPublicScreen(applicant, async (url) => {
      if (url.includes("bassberry.com") && !url.includes("bing") && !url.includes("duckduckgo")) {
        return { ok: true, status: 200, text: "<html><p>Todd Rolapp is a partner at Bass, Berry & Sims in Nashville.</p></html>" };
      }
      if (url.includes("bing.com")) return { ok: true, status: 200, text: hit };
      if (url.includes("duckduckgo.com")) return { ok: false, status: 0, text: "" };
      return { ok: false, status: 404, text: "" };
    });
    const web = rows.find((check) => check.key === "screen-web");
    const footprint = rows.find((check) => check.key === "web-footprint");
    expect(web?.finding).toContain("Tried");
    expect(footprint?.finding).toContain("Tried");
    expect(footprint?.finding).toContain("applicant's own site");
    expect(footprint?.finding).not.toContain("No result found that names this person and this company");
    expect(footprint?.corroborates).not.toBe(true);
  });

  it("retries one company-site 403 and leaves a second 403 unchecked", async () => {
    const applicant = facts({
      name: "Todd Rolapp",
      applicantName: "Todd Rolapp",
      org: "Bass, Berry & Sims",
      location: "Nashville, TN",
      website: "https://www.bassberry.com",
    });
    let calls = 0;
    const recovered = await runPublicScreen(applicant, async (url) => {
      if (url.startsWith("https://www.bassberry.com")) {
        calls += 1;
        if (calls === 1) return { ok: false, status: 403, text: "" };
        return { ok: true, status: 200, text: "<html><p>Todd Rolapp is a partner at Bass, Berry & Sims in Nashville.</p></html>" };
      }
      return { ok: false, status: 404, text: "" };
    });
    const website = recovered.find((check) => check.key === "website");
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(website?.status).toBe("PASS");
    expect(website?.corroborates).not.toBe(true);

    const blocked = await runPublicScreen(applicant, async (url) => {
      if (url.startsWith("https://www.bassberry.com")) return { ok: false, status: 403, text: "" };
      return { ok: false, status: 404, text: "" };
    });
    const denied = blocked.find((check) => check.key === "website");
    expect(denied?.status).toBe("UNAVAILABLE");
    expect(denied?.corroborates).not.toBe(true);
    expect(denied?.finding).toContain("403");
    expect(gradeChecks([denied!], applicant).categories.find((category) => category.id === "company")?.earned || 0).toBe(0);
  });

  it("does not restore completeness when web search failed and EDGAR only shows the company", () => {
    const applicant = facts({
      name: "Pat Notreal",
      applicantName: "Pat Notreal",
      org: "Western Alliance Bancorporation",
      phone: "212-555-0199",
      website: "https://westernalliance.example",
      location: "Phoenix, AZ",
      statement: "I develop small buildings and keep a written record of each project for the application.",
    });
    const blocked = "All free search sources blocked. Tried Bing (challenge page). Search blocked. Not checked. Not a pass.";
    const companyOnly = [
      row({ key: "screen-web", status: "UNAVAILABLE", corroborates: false, finding: blocked }),
      row({ key: "web-footprint", status: "UNAVAILABLE", corroborates: false, finding: blocked }),
      row({
        key: "edgar",
        status: "INCONCLUSIVE",
        companyOnly: true,
        corroborates: false,
        finding: "EDGAR exact current-name match. Name: no. Company: yes.",
      }),
      row({ key: "email-syntax", status: "PASS" }),
      row({ key: "disposable-email", status: "PASS" }),
      row({ key: "role-address", status: "PASS" }),
      row({ key: "plausibility", status: "PASS" }),
      row({ key: "sanctions", status: "PASS" }),
      row({ key: "duplicate", status: "PASS" }),
      row({ key: "text-risk", status: "PASS" }),
      row({ key: "velocity", status: "PASS" }),
    ];
    const fake = gradeChecks(companyOnly, applicant);
    expect(fake.categories.find((category) => category.id === "completeness")?.earned).toBe(0);
    expect(fake.categories.find((category) => category.id === "completeness")?.reason).toContain("No independent source");
    expect(fake.letter).toBe("F");
    expect(fake.score).toBeLessThanOrEqual(49);
    const tied = gradeChecks(
      [
        row({
          key: "screen-web",
          status: "PASS",
          corroborates: true,
          finding: "Tried Bing (result). Pat Notreal at Western Alliance Bancorporation. Name: yes. Company: yes.",
          url: "https://www.reuters.com/pat-notreal",
        }),
        ...companyOnly.filter((check) => check.key !== "screen-web"),
      ],
      applicant,
    );
    expect(tied.categories.find((category) => category.id === "completeness")?.earned).toBeGreaterThan(0);
  });

  it("says not found when search engines return pages that do not name the person", async () => {
    const applicant = facts({
      name: "Nina Quell",
      applicantName: "Nina Quell",
      org: "Quell Holdings",
      location: "New York, NY",
      website: "",
    });
    const page = `<ol><li class="b_algo"><a href="https://example.com/other">A downtown project was announced in New York</a></li></ol>`;
    const ddg = `<a class="result__a" href="https://example.com/two">Another firm published a market note</a>`;
    const rows = await runPublicScreen(applicant, async (url) => {
      if (url.includes("bing.com")) return { ok: true, status: 200, text: page };
      if (url.includes("duckduckgo.com")) return { ok: true, status: 200, text: ddg };
      if (url.includes("brave.com") || url.includes("mojeek.com")) return { ok: true, status: 200, text: page };
      return { ok: false, status: 404, text: "" };
    });
    const web = rows.find((check) => check.key === "screen-web");
    expect(web?.status).toBe("INCONCLUSIVE");
    expect(web?.finding).toContain("Not found");
    expect(web?.finding).toContain("Tried");
    expect(web?.finding).not.toContain("Not checked");
    expect(web?.corroborates).not.toBe(true);
  });

  it("matches a brand that uses of", () => {
    expect(companySearchTerm("Banc of California")).toBe("banc of california");
    expect(companySearchTerm("Bank of America")).toBe("bank of america");
    expect(mentionsCompany("Banc of California reported earnings", "Banc of California")).toBe(true);
    expect(mentionsCompany("Bank of America reported earnings", "Bank of America")).toBe(true);
    expect(mentionsCompany("the bank of america river flooded the lot", "Bank of America")).toBe(false);
    expect(socialSearchQuery("Jared Wolff", "Banc of California")).toContain("banc of california");
  });

  it("retries a nickname search with the formal first name when the quotes are ignored", async () => {
    expect(formalGivenName("Bill Dillon")).toBe("William");
    expect(formalGivenName("Rob Blalock")).toBe("Robert");
    expect(formalGivenName("William Dillon")).toBeNull();
    const bill = facts({
      name: "Bill Dillon",
      applicantName: "Bill Dillon",
      org: "Northmarq",
      location: "Dallas, TX",
      website: "",
    });
    const queries: string[] = [];
    const rows = await runPublicScreen(bill, async (url) => {
      const decoded = decodeURIComponent(url);
      queries.push(decoded);
      if (url.includes("bing.com") && decoded.includes("William Dillon")) {
        return {
          ok: true,
          status: 200,
          text: `<ol><li class="b_algo"><a href="https://www.northmarq.com/william">William Dillon leads Northmarq in Dallas</a></li></ol>`,
        };
      }
      if (url.includes("bing.com")) {
        return { ok: true, status: 200, text: `<ol><li class="b_algo"><a href="https://www.bill.com/">Bill.com expense software</a></li></ol>` };
      }
      return { ok: false, status: 404, text: "" };
    });
    const web = rows.find((check) => check.key === "screen-web");
    expect(queries.some((query) => query.includes("William Dillon"))).toBe(true);
    expect(web?.status).toBe("PASS");
    expect(web?.finding).toContain("Northmarq");
    expect(web?.corroborates).toBe(true);

    const robQueries: string[] = [];
    const rob = await runPublicScreen(
      facts({ name: "Rob Blalock", applicantName: "Rob Blalock", org: "Harbert Realty", location: "Birmingham, AL", website: "" }),
      async (url) => {
        const decoded = decodeURIComponent(url);
        robQueries.push(decoded);
        if (decoded.includes("Robert Blalock") && url.includes("bing.com")) {
          return {
            ok: true,
            status: 200,
            text: `<ol><li class="b_algo"><a href="https://www.harbertrealty.com/robert">Robert Blalock at Harbert Realty</a></li></ol>`,
          };
        }
        if (url.includes("bing.com")) {
          return { ok: true, status: 200, text: `<ol><li class="b_algo"><a href="https://www.roblox.com/">Roblox games</a></li></ol>` };
        }
        return { ok: false, status: 404, text: "" };
      },
    );
    expect(robQueries.some((query) => query.includes("Robert Blalock"))).toBe(true);
    expect(rob.find((check) => check.key === "screen-web")?.status).toBe("PASS");
  });

  it("keeps Sterling Bay as the full brand", () => {
    expect(companySearchTerm("Sterling Bay", "Andy Gloor")).toBe("sterling bay");
    expect(companySearchTerm("Sterling Bay", "Andy Gloor")).not.toBe("bay");
    expect(socialSearchQuery("Andy Gloor", "Sterling Bay")).toBe(`"Andy Gloor" "sterling bay"`);
    expect(mentionsCompany("Sterling Bay broke ground in Chicago", "Sterling Bay")).toBe(true);
    expect(mentionsCompany("the bay was closed for repairs", "Sterling Bay")).toBe(false);
  });
});
