import { describe, expect, it } from "vitest";
import { noticeTestRecipient } from "@/lib/brand";
import { DUES_WAIVED, annualDuesCents } from "@/lib/dues";
import { matchesApplicationFilter } from "@/lib/application-status";
import { collectChecks, emailChecks, sanctionsCheck } from "@/lib/verify/checks";
import { locationsCorroborate, nameMatchScore } from "@/lib/verify/fuzzy";
import { decideVerdict, scoreOf, scoreReport } from "@/lib/verify/score";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";

function facts(overrides: Partial<ApplicantFacts> = {}): ApplicantFacts {
  return {
    name: "Priya Testlegit",
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
    expect(annualDuesCents("GENERAL_CONTRACTOR")).toBe(240000);
    expect(annualDuesCents("BROKER")).toBe(180000);
    expect(annualDuesCents("MORTGAGE_BROKER")).toBe(180000);
    expect(annualDuesCents("RE_ATTORNEY")).toBe(120000);
    expect(DUES_WAIVED).toBe("Founding member: dues waived during testing");
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
