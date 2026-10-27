import { describe, expect, it, vi } from "vitest";
import { noticeTestRecipient } from "@/lib/brand";
import { DUES_WAIVED, annualDuesCents } from "@/lib/dues";
import { applicationStatusAfterVerification, matchesApplicationFilter } from "@/lib/application-status";
import { resolvePublicBase } from "@/lib/url";
import { cardConsistencyCheck, collectChecks, emailChecks, sanctionsCheck } from "@/lib/verify/checks";
import { assessCourts } from "@/lib/verify/courts";
import { limitText, politeFetch, shouldRetryStatus } from "@/lib/verify/fetch";
import { locationsCorroborate, nameMatchScore } from "@/lib/verify/fuzzy";
import { registrableHost } from "@/lib/verify/host";
import { decideVerdict, scoreOf, scoreReport } from "@/lib/verify/score";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";
import { parseSdnCsv, parseWatchlists } from "@/lib/verify/watchlist";
import { webFootprintCheck } from "@/lib/verify/web-search";

function facts(overrides: Partial<ApplicantFacts> = {}): ApplicantFacts {
  return {
    name: "Priya Testlegit",
    applicantName: "Priya Testlegit",
    email: "priya.testlegit@halerow-test.example",
    org: "Hale Row Test Partners",
    location: "Newark, NJ",
    role: "DEVELOPER",
    phone: "201-555-0142",
    website: "",
    linkedinUrl: "https://www.linkedin.com/in/priya-testlegit",
    socialLinks: "",
    statement: "I sponsor small multifamily projects in northern New Jersey and keep a written track record for each one.",
    inviteNote: "PF-7K2M-91QX · Founding demo code",
    testProfile: "",
    cardText: "",
    cardUploaded: false,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
    ...overrides,
  };
}

describe("verification scoring", () => {
  it("does not call a common name a hard sanctions hit", () => {
    const result = sanctionsCheck(facts({ name: "John Smith", location: "Newark, NJ" }), [
      { name: "John Smith", location: "Syria" },
    ]);
    expect(result.hardFlag).toBe(false);
    expect(result.reviewFlag).toBe(true);
    expect(nameMatchScore("John Smith", "John Smith")).toBeGreaterThan(0.9);
    expect(locationsCorroborate("Newark, NJ", "Syria")).toBe(false);
  });

  it("flags a corroborated sanctions name as not legit", () => {
    const checks = [
      sanctionsCheck(facts({ name: "Alexei Sanctionhit", location: "Newark, NJ" }), []),
      ...emailChecks(facts({ email: "alexei@example.com" })),
    ];
    expect(checks[0]?.hardFlag).toBe(true);
    expect(decideVerdict(checks, scoreOf(checks))).toBe("NOT_LEGIT");
  });

  it("treats a disposable email with no footprint as not legit", () => {
    const report = scoreReport(
      emailChecks(facts({ email: "drop@mailinator.com", website: "", linkedinUrl: "" })).concat([
        { key: "placeholder", status: "PASS", weight: 4, finding: "Name is readable.", source: "Local", url: "", ranAt: "" },
      ]),
    );
    expect(report.verdict).toBe("NOT_LEGIT");
  });

  it("recommends legit only with several corroborating passes and no conflict", async () => {
    const checks = await collectChecks({
      facts: facts({ testProfile: "strong" }),
      watchlist: [],
      network: false,
    });
    const report = scoreReport(checks);
    expect(report.verdict).toBe("LEGIT");
    expect(report.score).toBeGreaterThanOrEqual(72);
    expect(report.summary).toContain("Recommendation: LEGIT");
    expect(report.summary).toContain("What I could not check for free");
  });

  it("sends a thin private-email file to the owner", async () => {
    const checks = await collectChecks({
      facts: facts({
        name: "Sam Thinfile",
        email: "sam.thinfile@gmail.com",
        org: "Thinfile",
        phone: "",
        linkedinUrl: "",
        statement: "Hi",
        inviteNote: "",
        testProfile: "thin",
      }),
      watchlist: [],
      network: false,
    });
    const report = scoreReport(checks);
    expect(report.verdict).toBe("NEEDS_OWNER_DECISION");
  });

  it("keeps a phone mismatch from becoming legit", async () => {
    const checks = await collectChecks({
      facts: facts({ phone: "212-555-0100", location: "Newark, NJ", testProfile: "ambiguous" }),
      watchlist: [],
      network: false,
    });
    expect(decideVerdict(checks, 90)).toBe("NEEDS_OWNER_DECISION");
  });
});

describe("dues and notices", () => {
  it("shows the published dues and waives them in copy", () => {
    expect(annualDuesCents("DEVELOPER")).toBe(0);
    expect(annualDuesCents("INVESTOR_PE")).toBe(0);
    expect(annualDuesCents("GENERAL_CONTRACTOR")).toBe(14900);
    expect(annualDuesCents("BROKER")).toBe(12900);
    expect(annualDuesCents("MORTGAGE_BROKER")).toBe(12900);
    expect(annualDuesCents("RE_ATTORNEY")).toBe(12900);
    expect(DUES_WAIVED).toBe("Dues waived by an administrator.");
  });

  it("defaults outbound notices to the test recipient", () => {
    const previous = process.env.NOTICE_TEST_RECIPIENT;
    delete process.env.NOTICE_TEST_RECIPIENT;
    expect(noticeTestRecipient()).toBe("rich@privatefloorclub.com");
    if (previous) process.env.NOTICE_TEST_RECIPIENT = previous;
  });

  it("keeps recommendation filters off approved rows", () => {
    expect(matchesApplicationFilter("legit", "IN_REVIEW", "LEGIT")).toBe(true);
    expect(matchesApplicationFilter("legit", "APPROVED", "LEGIT")).toBe(false);
    expect(matchesApplicationFilter("new", "SUBMITTED", null)).toBe(true);
    expect(matchesApplicationFilter("declined", "DECLINED", "NOT_LEGIT")).toBe(true);
  });

  it("shows every open application in the needs-action filter, including ones with a verdict", () => {
    expect(matchesApplicationFilter("action", "IN_REVIEW", "LEGIT")).toBe(true);
    expect(matchesApplicationFilter("action", "SUBMITTED", "NOT_LEGIT")).toBe(true);
    expect(matchesApplicationFilter("action", "APPROVED", "LEGIT")).toBe(false);
    expect(matchesApplicationFilter("action", "DECLINED", "NOT_LEGIT")).toBe(false);
  });

  it("lets a finished verification run move only a still-open submission into review", () => {
    expect(applicationStatusAfterVerification("SUBMITTED")).toBe("IN_REVIEW");
    expect(applicationStatusAfterVerification("PENDING")).toBe("IN_REVIEW");
    expect(applicationStatusAfterVerification("NEEDS_INFO")).toBeNull();
    expect(applicationStatusAfterVerification("IN_REVIEW")).toBeNull();
    expect(applicationStatusAfterVerification("APPROVED")).toBeNull();
    expect(applicationStatusAfterVerification("PAYMENT_DUE")).toBeNull();
    expect(applicationStatusAfterVerification("DECLINED")).toBeNull();
    expect(applicationStatusAfterVerification("REJECTED")).toBeNull();
  });
});

function sdnRow(ent: string, name: string, remarks: string): string {
  const columns = Array.from({ length: 12 }, () => "");
  columns[0] = ent;
  columns[1] = name;
  columns[11] = remarks;
  return columns.map((column) => `"${column}"`).join(",");
}

describe("OFAC list", () => {
  it("keeps a name past the old 180,000 character slice and still requires corroboration", () => {
    const filler = Array.from({ length: 4000 }, (_, index) =>
      sdnRow(String(index + 1), `EARLY PERSON${index}`, "Iran"),
    ).join("\n");
    const maduro = sdnRow("36170", "MADURO MOROS, Nicolas", "DOB 23 Nov 1962; Venezuela");
    const alt = `"36170","1","aka","NICOLAS MADURO"`;
    const csv = `${filler}\n${maduro}\n`;
    expect(csv.length).toBeGreaterThan(180_000);
    expect(limitText(csv, 180_000)).not.toContain("MADURO MOROS");

    const parsed = parseSdnCsv(csv);
    const hit = parsed.find((entry) => entry.name.includes("MADURO"));
    expect(hit?.location).toBe("Venezuela");
    expect(hit?.dob).toContain("1962");
    expect(parsed.length).toBeGreaterThan(2500);

    const withAlias = parseWatchlists(csv, alt);
    const alias = withAlias.find((entry) => entry.aliasOf === "36170");
    expect(alias?.name).toBe("NICOLAS MADURO");
    expect(alias?.location).toBe("Venezuela");
    expect(alias?.dob).toContain("1962");

    const corroborated = sanctionsCheck(
      facts({ name: "Nicolas Maduro Moros", location: "Caracas, Venezuela", statement: "" }),
      parsed,
    );
    expect(corroborated.hardFlag).toBe(true);
    expect(decideVerdict([corroborated], 90)).toBe("NOT_LEGIT");

    const nameOnly = sanctionsCheck(
      facts({ name: "Nicolas Maduro Moros", location: "Newark, NJ", statement: "I build in New Jersey." }),
      parsed,
    );
    expect(nameOnly.hardFlag).toBe(false);
    expect(nameOnly.reviewFlag).toBe(true);
    expect(decideVerdict([nameOnly], 90)).not.toBe("NOT_LEGIT");

    const byDob = sanctionsCheck(
      facts({
        name: "Nicolas Maduro Moros",
        location: "Newark, NJ",
        statement: "The file lists DOB 1962.",
      }),
      parsed,
    );
    expect(byDob.hardFlag).toBe(true);
    expect(decideVerdict([byDob], 40)).toBe("NOT_LEGIT");
  });
});

describe("web search", () => {
  it("ignores a page title that only echoes the query", async () => {
    const query = `"Zorblax Quimperton" "Nowhere Holdings"`;
    const html = `<html><head><title>${query} at DuckDuckGo</title></head><body><form><input value="${query}"></form><a class="result__a" href="https://html.duckduckgo.com/">${query}</a></body></html>`;
    const result = await webFootprintCheck(
      facts({ name: "Zorblax Quimperton", org: "Nowhere Holdings" }),
      async (url) => (url.includes("duckduckgo") ? { ok: true, status: 200, text: html } : { ok: false, status: 403, text: "" }),
    );
    expect(result.status).toBe("INCONCLUSIVE");
    expect(result.status).not.toBe("PASS");
    expect(result.status).not.toBe("FAIL");
    expect(result.finding).toContain("Unavailable:");
    const summary = scoreReport([result]).summary;
    expect(summary).toContain("What I could not check for free");
    expect(summary).toContain("Wikipedia");
    expect(summary).not.toContain("none of the free sources were blocked");
  });

  it("counts a real snippet that names the person and the company", async () => {
    const html = `<html><head><title>"Stephen Ross" "Related Companies" at DuckDuckGo</title></head><body><a class="result__snippet" href="https://www.related.com/">Stephen Ross leads Related Companies in New York.</a></body></html>`;
    const result = await webFootprintCheck(
      facts({ name: "Stephen Ross", org: "Related Companies" }),
      async () => ({ ok: true, status: 200, text: html }),
    );
    expect(result.status).toBe("PASS");
    expect(result.corroborates).toBe(true);
    expect(result.finding).toContain("DuckDuckGo");
  });
});

describe("courts", () => {
  it("does not fail a common name when bankruptcy sits in a different result", () => {
    const payload = JSON.stringify({
      results: [
        { caseName: "In re Unrelated Landlord", snippet: "Chapter 11 bankruptcy of a property owner." },
        { caseName: "Ross v. City of New York", snippet: "Stephen Ross spoke about a development project." },
      ],
    });
    const result = assessCourts(payload, { ok: true, status: 200 }, facts({ name: "Stephen Ross", org: "Related Companies" }));
    expect(result.status).not.toBe("FAIL");
    expect(result.reviewFlag).toBeUndefined();
    expect(result.finding.toLowerCase()).not.toContain("possible match");
  });

  it("downgrades an ambiguous name hit to possible match without a failure", () => {
    const payload = JSON.stringify({
      results: [{ caseName: "In re Stephen Ross", snippet: "A bankruptcy footnote mentions Stephen Ross." }],
    });
    const result = assessCourts(payload, { ok: true, status: 200 }, facts({ name: "Stephen Ross", org: "Related Companies" }));
    expect(result.status).toBe("INCONCLUSIVE");
    expect(result.status).not.toBe("FAIL");
    expect(result.reviewFlag).toBeUndefined();
    expect(result.finding).toContain("Possible match, needs review");
  });

  it("flags a result that names the person, the company, and a severe term", () => {
    const payload = JSON.stringify({
      results: [
        {
          caseName: "Related Companies v. Stephen Ross",
          snippet: "Bankruptcy allegations involving Stephen Ross and Related Companies.",
        },
      ],
    });
    const result = assessCourts(payload, { ok: true, status: 200 }, facts({ name: "Stephen Ross", org: "Related Companies" }));
    expect(result.status).toBe("INCONCLUSIVE");
    expect(result.status).not.toBe("FAIL");
    expect(result.reviewFlag).toBe(true);
    expect(result.finding).toContain("Possible match, needs review");
  });

  it("does not count separate name words as a court hit", () => {
    const scattered = assessCourts(
      JSON.stringify({
        results: [
          { caseName: "Jeff v. State", snippet: "Hines was the judge. Jeff filed a motion in another matter." },
          { caseName: "Kennedy v. Richard", snippet: "Richard testified. Kennedy was counsel." },
        ],
      }),
      { ok: true, status: 200 },
      facts({ name: "Jeff Hines", org: "Skanska USA" }),
    );
    expect(scattered.status).toBe("PASS");
    expect(scattered.finding).toContain("No record found");
    expect(scattered.finding.toLowerCase()).not.toContain("mention the full name");
    const companyWord = assessCourts(
      JSON.stringify({
        results: [{ caseName: "Campbell v. Hines", snippet: "Jeff filed a motion in another matter." }],
      }),
      { ok: true, status: 200 },
      facts({ name: "Jeff Hines", org: "Hines" }),
    );
    expect(companyWord.status).toBe("INCONCLUSIVE");
    expect(companyWord.finding).toContain("name the company");
    expect(companyWord.finding.toLowerCase()).not.toContain("mention the full name");
    const phrase = assessCourts(
      JSON.stringify({
        results: [{ caseName: "Gilley's Antique Mall and Jeff Hines v. Doug Sarver", snippet: "" }],
      }),
      { ok: true, status: 200 },
      facts({ name: "Jeff Hines", org: "Hines" }),
    );
    expect(phrase.status).toBe("INCONCLUSIVE");
    expect(phrase.finding).toContain("mention the full name");
    const reversed = assessCourts(
      JSON.stringify({ results: [{ caseName: "Hines, Jeff v. Sarver", snippet: "" }] }),
      { ok: true, status: 200 },
      facts({ name: "Jeff Hines", org: "Hines" }),
    );
    expect(reversed.finding).toContain("mention the full name");
    const middle = assessCourts(
      JSON.stringify({ results: [{ caseNameFull: "Richard T. Kennedy v. State", caseName: "", snippet: "" }] }),
      { ok: true, status: 200 },
      facts({ name: "Richard Kennedy", org: "Skanska USA" }),
    );
    expect(middle.finding).toContain("mention the full name");
    const otherGiven = assessCourts(
      JSON.stringify({ results: [{ caseNameFull: "Douglas Richard Kennedy, Appellee", caseName: "Commonwealth v. Kennedy", snippet: "" }] }),
      { ok: true, status: 200 },
      facts({ name: "Richard Kennedy", org: "Skanska USA" }),
    );
    expect(otherGiven.status).toBe("PASS");
    expect(otherGiven.finding).toContain("No record found");
    const company = assessCourts(
      JSON.stringify({
        results: [{ caseName: "Skanska USA v. Owner", snippet: "Richard testified. Kennedy was counsel." }],
      }),
      { ok: true, status: 200 },
      facts({ name: "Richard Kennedy", org: "Skanska USA" }),
    );
    expect(company.status).toBe("INCONCLUSIVE");
    expect(company.finding).toContain("name the company");
    expect(company.finding.toLowerCase()).not.toContain("mention the full name");
  });
});

describe("hosts, urls, and source status", () => {
  it("strips www and keeps a multi-part public suffix", () => {
    expect(registrableHost("www.related.com")).toBe("related.com");
    expect(registrableHost("WWW.Example.CO.UK.")).toBe("example.co.uk");
  });

  it("builds invite links from the public host, not the bind address", () => {
    const base = resolvePublicBase({
      appUrl: "https://0.0.0.0:10000",
      forwardedHost: "cornicio-mvp.onrender.com",
      proto: "https",
    });
    expect(base).toBe("https://cornicio-mvp.onrender.com");
    expect(base).not.toContain("0.0.0.0");
  });

  it("retries server failures once and leaves a normal 404 alone", () => {
    expect(shouldRetryStatus(0)).toBe(true);
    expect(shouldRetryStatus(429)).toBe(true);
    expect(shouldRetryStatus(503)).toBe(true);
    expect(shouldRetryStatus(404)).toBe(false);
    expect(shouldRetryStatus(200)).toBe(false);
  });

  it("retries a 503 once", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return new Response(calls === 1 ? "no" : "yes", { status: calls === 1 ? 503 : 200 });
      }),
    );
    const result = await politeFetch("https://retry-once.example/sdn.csv", 1000);
    expect(calls).toBe(2);
    expect(result.status).toBe(200);
    expect(result.text).toBe("yes");
    vi.unstubAllGlobals();
  });

  it("marks an uploaded card with no extracted text as could not be checked", () => {
    const row = cardConsistencyCheck(facts({ cardUploaded: true, cardText: "" }));
    expect(row.status).toBe("UNAVAILABLE");
    const summary = scoreReport([row]).summary;
    expect(summary).toContain("What I could not check for free");
    expect(summary.toLowerCase()).toContain("could not be checked");
    expect(cardConsistencyCheck(facts({ cardUploaded: false, cardText: "" })).status).toBe("NOT_RUN");
  });
});

describe("check shape", () => {
  it("returns the evidence fields the admin table renders", () => {
    const row: CheckOutput = emailChecks(facts())[0]!;
    expect(row).toEqual(
      expect.objectContaining({
        status: "PASS",
        weight: expect.any(Number),
        finding: expect.any(String),
        source: expect.any(String),
      }),
    );
  });
});
