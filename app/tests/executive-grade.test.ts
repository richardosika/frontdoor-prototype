import { describe, expect, it } from "vitest";
import {
  CAP_RULES,
  GRADE_WEIGHTS,
  GRADE_WEIGHTS_MODE,
  LETTER_FLOORS,
  LETTERS,
  capLetter,
  decisionNoticeText,
  gradeChangeNote,
  gradeChecks,
  letterFromScore,
  rubricSections,
  weightsFor,
  type GradeFacts,
  type GradeReport,
} from "@/lib/verify/grade";
import { buildSummary } from "@/lib/verify/score";
import type { CheckOutput, EvidenceStatus } from "@/lib/verify/types";

function row(partial: Partial<CheckOutput> & { key: string; status: EvidenceStatus }): CheckOutput {
  return {
    weight: 4,
    finding: partial.finding || partial.status,
    source: partial.source || "Test source",
    url: "",
    ranAt: "2026-10-25T16:00:00.000Z",
    ...partial,
  };
}

function pass(key: string, extra: Partial<CheckOutput> = {}): CheckOutput {
  return row({ key, status: "PASS", finding: extra.finding || `${key} passed`, ...extra });
}

const fullFacts: GradeFacts = {
  name: "Elena Voss",
  applicantName: "Elena Voss",
  email: "elena@vossandco.example",
  org: "Voss and Co",
  location: "Newark, NJ",
  role: "DEVELOPER",
  phone: "201-555-0142",
  website: "https://vossandco.example",
  linkedinUrl: "https://www.linkedin.com/in/elena-voss",
  socialLinks: "https://example.com/elena",
  statement: "I develop small multifamily buildings in northern New Jersey and keep a written record of each project.",
  inviteNote: "PF-7K2M-91QX · Founding demo code",
  cardUploaded: true,
  cardText: "Elena Voss, Voss and Co",
  referenceCount: 1,
};

function strongChecks(): CheckOutput[] {
  return [
    pass("email-syntax", { source: "Local syntax check" }),
    pass("email-provider", { source: "Bundled provider list", finding: "The email is not on the free-provider list." }),
    pass("disposable-email", { source: "Bundled disposable-domain list" }),
    pass("role-address", { source: "Local role-address list" }),
    pass("phone-state", { source: "Local area-code table" }),
    pass("text-risk", { source: "Local text heuristic" }),
    pass("duplicate", { source: "Private Floor member and application records" }),
    pass("sanctions", { source: "OFAC cache plus Private Floor test overlay" }),
    pass("linkedin-format", { source: "Local URL check" }),
    pass("linkedin-fetch", { source: "LinkedIn public page", corroborates: true, finding: "A public fetch included the name." }),
    pass("business-card", { source: "Card text compare", corroborates: true }),
    pass("invite-source", { source: "Referral or request code" }),
    pass("plausibility", { source: "Local plausibility heuristic" }),
    pass("velocity", { source: "Private Floor application records" }),
    pass("social-links", { source: "Local URL check" }),
    pass("website", { source: "Public website fetch", corroborates: true }),
    pass("rdap", { source: "RDAP" }),
    pass("edgar", { source: "SEC EDGAR", corroborates: true }),
    pass("web-footprint", { source: "DuckDuckGo", corroborates: true }),
    pass("news", { source: "Google News", corroborates: true }),
    row({ key: "business-registry", status: "NOT_RUN", finding: "Not run: manual link provided.", source: "State registry" }),
    row({ key: "courts", status: "INCONCLUSIVE", finding: "No data linking this person to a case.", source: "CourtListener" }),
  ];
}

function textOf(report: GradeReport): string {
  return [
    report.summary.applicant,
    report.summary.company,
    report.summary.checkedOut,
    report.summary.didNotCheckOut,
    report.summary.couldNotCheck,
    report.summary.reasoning,
    report.banner || "",
    report.plainText,
  ].join(" ");
}

describe("grade rubric", () => {
  it("adds the published weights to 100", () => {
    const groups = Object.values(GRADE_WEIGHTS).map((group) => Object.values(group).reduce((sum, value) => sum + value, 0));
    expect(groups).toEqual([18, 22, 18, 20, 12, 10]);
    expect(groups.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("caps a letter only downward", () => {
    expect(letterFromScore(90)).toBe("A");
    expect(letterFromScore(80)).toBe("B");
    expect(letterFromScore(70)).toBe("C");
    expect(letterFromScore(60)).toBe("D");
    expect(letterFromScore(59)).toBe("F");
    expect(capLetter("A", "B")).toBe("B");
    expect(capLetter("F", "B")).toBe("F");
    expect(CAP_RULES).toEqual({
      noCorroboration: "D",
      thinCorroboration: "C",
      ambiguousNews: "C",
      reviewRedFlag: "D",
      hardRedFlag: "F",
      twoConflicts: "C",
    });
  });

  it("keeps proposal R2 off unless a grade asks for it", () => {
    expect(GRADE_WEIGHTS_MODE).toBe("standard");
    expect(LETTER_FLOORS).toEqual({ A: 90, B: 80, C: 70, D: 60 });
    const r2 = weightsFor("r2");
    const groups = Object.values(r2).map((group) => Object.values(group).reduce((sum, value) => sum + value, 0));
    expect(groups).toEqual([14, 23, 21, 20, 12, 10]);
    expect(groups.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(r2.identity["linkedin-fetch"]).toBe(0);
    expect(r2.company["business-registry"]).toBe(0);
    expect(r2.company.website).toBe(11);
    expect(r2.footprint["web-footprint"]).toBe(11);
    expect(rubricSections().map((section) => section.body).join(" ")).not.toContain("R2 is on");
    expect(rubricSections("r2").map((section) => section.body).join(" ")).toContain("Letter floors are unchanged");

    const standard = gradeChecks(strongChecks(), fullFacts);
    const proposed = gradeChecks(strongChecks(), fullFacts, { weightsMode: "r2" });
    expect(standard.summary.couldNotCheck).not.toContain("Coverage:");
    expect(proposed.summary.couldNotCheck).toContain("Coverage:");
    expect(proposed.summary.couldNotCheck).toContain("100 of 100 rubric points were checkable");
    expect(proposed.plainText).toContain("Coverage:");
    expect(proposed.score).toBe(standard.score + 2);
    expect(proposed.letter).toBe(standard.letter);
    expect(proposed.recommendation).toBe(standard.recommendation);

    const noRegistrant = gradeChecks(
      [
        pass("website"),
        pass("web-footprint", { corroborates: true }),
        pass("news", { corroborates: true }),
        row({ key: "edgar", status: "INCONCLUSIVE", finding: "EDGAR responded. No company on the SEC list uses this firm's name." }),
      ],
      fullFacts,
      { weightsMode: "r2" },
    );
    const edgarDown = gradeChecks(
      [
        pass("website"),
        pass("web-footprint", { corroborates: true }),
        pass("news", { corroborates: true }),
        row({ key: "edgar", status: "UNAVAILABLE", finding: "EDGAR was blocked." }),
      ],
      fullFacts,
      { weightsMode: "r2" },
    );
    expect(noRegistrant.summary.couldNotCheck).toContain("100 of 100 rubric points were checkable");
    expect(noRegistrant.summary.couldNotCheck).toContain("no registrant stays in that denominator");
    expect(edgarDown.summary.couldNotCheck).toContain("94 of 100 rubric points were checkable");
    expect(edgarDown.score).toBeGreaterThan(noRegistrant.score);

    const blockedSite = gradeChecks(
      [
        row({ key: "website", status: "UNAVAILABLE", finding: "Blocked by site." }),
        row({ key: "edgar", status: "INCONCLUSIVE", finding: "EDGAR responded. No company on the SEC list uses this firm's name." }),
        row({ key: "linkedin-fetch", status: "UNAVAILABLE", finding: "LinkedIn blocked automated access." }),
        row({ key: "business-registry", status: "NOT_RUN", finding: "Not run." }),
      ],
      fullFacts,
      { weightsMode: "r2" },
    );
    expect(blockedSite.summary.couldNotCheck).toContain("89 of 100 rubric points were checkable");

    const thin = gradeChecks(
      [
        pass("website", { selfReported: true, corroborates: false }),
        pass("email-syntax"),
        pass("disposable-email"),
        pass("role-address"),
        pass("phone-state"),
        pass("sanctions"),
        pass("duplicate"),
        pass("text-risk"),
        pass("velocity"),
        pass("plausibility"),
        pass("invite-source"),
      ],
      fullFacts,
      { weightsMode: "r2" },
    );
    expect(thin.recommendation.startsWith("APPROVE")).toBe(false);
    expect(["D", "F"]).toContain(thin.letter);
  });
});

describe("executive grade profiles", () => {
  it("grades a strong developer with a public footprint as an approval", () => {
    const report = gradeChecks(strongChecks(), fullFacts);
    expect(report.letter).toBe("A");
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.recommendation).toBe("APPROVE");
    expect(report.confidence).toBe("High");
    expect(report.banner).toBeNull();
    expect(report.summary.applicant).toContain("Elena Voss");
    expect(report.summary.applicant).toContain("Developer");
    expect(report.summary.applicant).toContain("PF-7K2M-91QX");
    expect(report.summary.checkedOut).toContain("SEC EDGAR");
    expect(report.summary.couldNotCheck.toLowerCase()).toContain("state registr");
    expect(textOf(report).toLowerCase()).not.toContain("this person is legitimate");
  });

  it("keeps a thin file from looking strong", () => {
    const report = gradeChecks(
      [
        pass("email-syntax"),
        pass("disposable-email"),
        pass("role-address"),
        pass("duplicate"),
        pass("sanctions"),
        pass("velocity"),
        pass("plausibility"),
        row({ key: "phone-state", status: "INCONCLUSIVE", finding: "Phone area code and state could not both be read." }),
        row({ key: "text-risk", status: "INCONCLUSIVE", finding: "The track-record note is short." }),
        row({ key: "linkedin-format", status: "INCONCLUSIVE", finding: "No LinkedIn URL was provided." }),
        row({ key: "business-card", status: "NOT_RUN", finding: "No business card was uploaded." }),
        row({ key: "invite-source", status: "INCONCLUSIVE", finding: "No referral or request code was stored." }),
        row({ key: "website", status: "INCONCLUSIVE", finding: "No company website was given." }),
        row({ key: "edgar", status: "INCONCLUSIVE", finding: "No data found for this company name.", source: "SEC EDGAR" }),
        row({ key: "web-footprint", status: "UNAVAILABLE", finding: "Web search could not be checked.", source: "Web search" }),
        row({ key: "news", status: "INCONCLUSIVE", finding: "No data found.", source: "News" }),
        row({ key: "courts", status: "UNAVAILABLE", finding: "CourtListener was blocked.", source: "CourtListener" }),
        row({ key: "business-registry", status: "NOT_RUN", finding: "Not run.", source: "State registry" }),
      ],
      {
        name: "Sam Thinfile",
        applicantName: "Sam Thinfile",
        email: "sam.thinfile@gmail.com",
        org: "Thinfile",
        location: "Newark, NJ",
        role: "DEVELOPER",
        phone: "",
        website: "",
        linkedinUrl: "",
        statement: "Hi",
        cardUploaded: false,
        referenceCount: 0,
      },
    );
    expect(LETTERS.indexOf(report.letter)).toBeGreaterThanOrEqual(LETTERS.indexOf("B"));
    expect(report.letter).toBe("F");
    expect(report.recommendation).toBe("NEEDS MORE INFO");
    expect(report.confidence).toBe("Low");
    expect(report.attention.some((item) => item.title === "Thin public record")).toBe(true);
    expect(report.summary.checkedOut.toLowerCase()).not.toContain("edgar returned a hit");
    expect(report.summary.company).toContain("No EDGAR filing was confirmed.");
  });

  it("caps a disposable email with no footprint at F and recommends decline", () => {
    const report = gradeChecks(
      [
        ...strongChecks().filter((check) => check.key !== "disposable-email" && check.key !== "website" && check.key !== "linkedin-fetch"),
        row({
          key: "disposable-email",
          status: "FAIL",
          hardFlag: true,
          finding: "The email domain is disposable and there is no website or LinkedIn URL to corroborate the person.",
          source: "Bundled disposable-domain list",
        }),
      ],
      { ...fullFacts, email: "drop@mailinator.com", website: "", linkedinUrl: "", cardUploaded: false },
    );
    expect(report.letter).toBe("F");
    expect(report.recommendation).toBe("DECLINE");
    expect(report.banner).toMatch(/Red flag/);
    expect(report.caps.some((line) => line.startsWith("Capped at F"))).toBe(true);
    expect(report.attention.some((item) => item.severity === "High" && item.detail.toLowerCase().includes("disposable"))).toBe(true);
  });

  it("caps a corroborated sanctions match at F", () => {
    const report = gradeChecks(
      [
        ...strongChecks().filter((check) => check.key !== "sanctions"),
        row({
          key: "sanctions",
          status: "FAIL",
          hardFlag: true,
          finding: "Watchlist name match on Alexei Sanctionhit (name) and the application location lines up with Newark United States.",
          source: "OFAC cache plus Private Floor test overlay",
        }),
      ],
      { ...fullFacts, name: "Alexei Sanctionhit", applicantName: "Alexei Sanctionhit" },
    );
    expect(report.letter).toBe("F");
    expect(report.recommendation).toBe("DECLINE");
    expect(report.banner).toMatch(/sanctions/i);
    expect(textOf(report).toLowerCase()).not.toContain("is a criminal");
    expect(report.summary.didNotCheckOut).toContain("Confirm the entry");
  });

  it("does not treat an ambiguous headline as a fact about the person", () => {
    const report = gradeChecks(
      [
        ...strongChecks().filter((check) => check.key !== "news"),
        row({
          key: "news",
          status: "INCONCLUSIVE",
          reviewFlag: true,
          finding: "Possible match, needs review. A headline names this person near a negative term without the company or city. This is not a failure.",
          source: "Google News",
        }),
        row({
          key: "news-story",
          status: "INCONCLUSIVE",
          weight: 0,
          reviewFlag: true,
          finding: "Possible match, review · Oct 1, 2026 · John Smith indicted in another state",
          source: "City Desk via Google News",
        }),
      ],
      { ...fullFacts, name: "John Smith", applicantName: "John Smith", org: "Smith Holdings" },
    );
    expect(LETTERS.indexOf(report.letter)).toBeGreaterThanOrEqual(LETTERS.indexOf("C"));
    expect(report.letter).not.toBe("F");
    expect(report.recommendation).not.toBe("DECLINE");
    expect(report.recommendation).toBe("NEEDS MORE INFO");
    expect(report.attention.some((item) => /possible match, verify/i.test(item.detail))).toBe(true);
    expect(report.summary.checkedOut.toLowerCase()).not.toContain("indicted");
    expect(report.summary.didNotCheckOut.toLowerCase()).not.toContain("was indicted");
    expect(textOf(report).toLowerCase()).not.toContain("john smith was indicted");
    expect(textOf(report).toLowerCase()).not.toContain("this person was indicted");
  });

  it("caps a duplicate of a declined applicant at F", () => {
    const report = gradeChecks(
      [
        ...strongChecks().filter((check) => check.key !== "duplicate"),
        row({
          key: "duplicate",
          status: "FAIL",
          hardFlag: true,
          finding: "This email matches a person who was already declined or banned.",
          source: "Private Floor member and application records",
        }),
      ],
      fullFacts,
    );
    expect(report.letter).toBe("F");
    expect(report.recommendation).toBe("DECLINE");
    expect(report.banner).toMatch(/declined/i);
    expect(report.summary.didNotCheckOut.toLowerCase()).toContain("already declined");
  });

  it("does not treat a private email as a key signal when the site and LinkedIn check out", () => {
    const report = gradeChecks(
      strongChecks().map((check) =>
        check.key === "email-provider"
          ? { ...check, finding: "This is a private-email provider. That is allowed.", weight: 2 }
          : check,
      ),
      { ...fullFacts, email: "elena.voss@gmail.com" },
    );
    expect(["A", "B"]).toContain(report.letter);
    expect(report.recommendation === "APPROVE" || report.recommendation === "APPROVE WITH CONDITIONS").toBe(true);
    expect(report.categories.find((category) => category.id === "identity")?.reason).toContain("earn no points");
    expect(report.summary.checkedOut.toLowerCase()).not.toContain("gmail proves");
  });

  it("recommends approval with conditions for a paying role", () => {
    const report = gradeChecks(strongChecks(), { ...fullFacts, role: "GENERAL_CONTRACTOR" });
    expect(report.recommendation).toBe("APPROVE WITH CONDITIONS");
    expect(report.summary.reasoning.toLowerCase()).toContain("month to month");
    expect(report.summary.nextStep.toLowerCase()).toContain("membership-dues");
    expect(report.letter === "A" || report.letter === "B").toBe(true);
  });

  it("lists empty optional fields as attention items and does not award them", () => {
    const report = gradeChecks(
      [
        pass("email-syntax"),
        pass("disposable-email"),
        pass("role-address"),
        pass("duplicate"),
        pass("sanctions"),
        pass("velocity"),
        pass("plausibility"),
      ],
      {
        name: "Riley Blank",
        applicantName: "Riley Blank",
        org: "Blank Holdings",
        location: "",
        role: "DEVELOPER",
        phone: "",
        website: "",
        linkedinUrl: "",
        statement: "",
        cardUploaded: false,
        referenceCount: 0,
      },
    );
    const completeness = report.categories.find((category) => category.id === "completeness");
    expect(completeness?.earned).toBe(0);
    expect(completeness?.possible).toBe(10);
    for (const title of ["No company website on the application", "No LinkedIn URL", "No business card", "Short track record", "No references"]) {
      expect(report.attention.some((item) => item.title === title)).toBe(true);
    }
    expect(report.recommendation).toBe("NEEDS MORE INFO");
  });

  it("says a non-US location was not searched", () => {
    const report = gradeChecks(
      [
        ...strongChecks().filter((check) => check.key !== "phone-state" && check.key !== "business-registry"),
        row({ key: "phone-state", status: "INCONCLUSIVE", finding: "Phone area code and state could not both be read." }),
        row({ key: "business-registry", status: "NOT_RUN", finding: "Not run: no stable free registry API for this state.", source: "State registry" }),
      ],
      { ...fullFacts, location: "London, United Kingdom", phone: "+44 20 7946 0991" },
    );
    expect(report.attention.some((item) => item.title === "Location is outside the free US registry list")).toBe(true);
    expect(report.summary.couldNotCheck.toLowerCase()).toContain("not run");
    const identity = report.categories.find((category) => category.id === "identity");
    expect(identity?.reason).toContain("0 of 3");
    expect(report.score).toBeLessThan(gradeChecks(strongChecks(), fullFacts).score);
  });

  it("does not call a company real when it has no website", () => {
    const report = gradeChecks(
      [
        pass("email-syntax"),
        pass("disposable-email"),
        pass("duplicate"),
        pass("sanctions"),
        pass("plausibility"),
        row({
          key: "website",
          status: "INCONCLUSIVE",
          finding: "No company website was given, and the email domain is not a company domain.",
          source: "Public website fetch",
        }),
        row({ key: "edgar", status: "INCONCLUSIVE", finding: "No data found for this company name.", source: "SEC EDGAR" }),
        row({ key: "web-footprint", status: "INCONCLUSIVE", finding: "No data found.", source: "DuckDuckGo" }),
      ],
      { ...fullFacts, website: "", email: "pat@gmail.com", org: "No Site Partners", cardUploaded: false, cardText: "" },
    );
    expect(LETTERS.indexOf(report.letter)).toBeGreaterThanOrEqual(LETTERS.indexOf("B"));
    expect(report.summary.company).toContain("No company website was confirmed.");
    expect(report.summary.company).toContain("No EDGAR filing was confirmed.");
    expect(report.summary.checkedOut).not.toContain("SEC EDGAR returned a hit");
    expect(textOf(report).toLowerCase()).not.toContain("the company is legitimate");
    expect(report.recommendation).toBe("NEEDS MORE INFO");
  });

  it("surfaces conflicting phone, site, and card details", () => {
    const report = gradeChecks(
      [
        ...strongChecks().filter((check) => !["phone-state", "website", "business-card"].includes(check.key)),
        row({
          key: "phone-state",
          status: "FAIL",
          reviewFlag: true,
          finding: "The area code 212 usually maps to NY, while the application says NJ.",
          source: "Local area-code table",
        }),
        row({
          key: "website",
          status: "FAIL",
          reviewFlag: true,
          finding: "The site responded, but the person and company names were not on the homepage.",
          source: "Public website fetch",
        }),
        row({
          key: "business-card",
          status: "FAIL",
          reviewFlag: true,
          finding: "The card text does not line up with the name and company on the application.",
          source: "Card text compare",
        }),
      ],
      fullFacts,
    );
    expect(LETTERS.indexOf(report.letter)).toBeGreaterThanOrEqual(LETTERS.indexOf("C"));
    expect(report.recommendation).not.toBe("APPROVE");
    expect(report.summary.didNotCheckOut).toContain("area code");
    expect(report.summary.didNotCheckOut).toContain("business card");
    expect(report.attention.filter((item) => item.severity === "Medium").length).toBeGreaterThanOrEqual(2);
    expect(report.caps.some((line) => line.startsWith("Capped at C"))).toBe(true);
  });

  it("does not let missing data raise the grade", () => {
    const base = gradeChecks(
      [pass("website", { corroborates: true }), pass("sanctions"), pass("duplicate"), pass("plausibility")],
      fullFacts,
    );
    const withGap = gradeChecks(
      [
        pass("website", { corroborates: true }),
        pass("sanctions"),
        pass("duplicate"),
        pass("plausibility"),
        row({ key: "edgar", status: "INCONCLUSIVE", weight: 12, finding: "No data found.", source: "SEC EDGAR" }),
        row({ key: "courts", status: "UNAVAILABLE", weight: 8, finding: "CourtListener was blocked.", source: "CourtListener" }),
      ],
      fullFacts,
    );
    expect(withGap.score).toBeLessThanOrEqual(base.score);
    expect(withGap.summary.checkedOut).not.toContain("SEC EDGAR returned a hit");
  });

  it("records what changed when a file is graded again", () => {
    const first = gradeChecks(strongChecks(), fullFacts, { gradedAt: "2026-10-25T16:00:00.000Z" });
    const second = gradeChecks(
      strongChecks().filter((check) => check.key !== "news"),
      fullFacts,
      { gradedAt: "2026-10-25T18:00:00.000Z" },
    );
    const note = gradeChangeNote(first, second);
    expect(note).toContain("Grade moved from");
    expect(gradeChangeNote(first, first)).toContain("unchanged");
    expect(first.changeNote).toContain("First graded run");
  });

  it("puts the grade into the notice for Richard and not a claim the member can see", () => {
    const report = gradeChecks(strongChecks(), fullFacts);
    const notice = decisionNoticeText({ name: "Elena Voss", decision: "APPROVED", grade: report });
    expect(notice).toContain("Grade A");
    expect(notice).toContain("APPROVE");
    expect(notice).toContain("Members do not see this grade");
    const summary = buildSummary(strongChecks(), report.score, "LEGIT");
    expect(summary).toContain("Recommendation: LEGIT");
    expect(summary).toContain("What I could not check for free");
  });
});
