import { describe, expect, it } from "vitest";
import {
  canAutofill,
  confirmedNote,
  emptyPrefillFacts,
  keepExistingMark,
  suggestChecklist,
  suggestOne,
} from "@/lib/guided-prefill";
import { MEMBER_CHECKS, canMarkCaseVerified, checklistComplete } from "@/lib/verification";
import { assessOpenCorporates, assessOpenSanctions, openCorporatesCompanies, openSanctionsHits } from "@/lib/verify/free-sources";

const OFAC = "https://ofac.treasury.gov/sanctions-list-service";
const STORY = "https://news.example/track";

function row(partial: {
  checkKey: string;
  status: string;
  finding: string;
  url?: string;
  source?: string;
  hardFlag?: boolean;
  reviewFlag?: boolean;
  corroborates?: boolean;
}) {
  return {
    source: partial.source || "Source",
    url: partial.url || "",
    hardFlag: partial.hardFlag,
    reviewFlag: partial.reviewFlag,
    corroborates: partial.corroborates,
    ...partial,
  };
}

describe("guided review prefill", () => {
  it("writes an auto-suggested mark for every member step, including track record", () => {
    const facts = emptyPrefillFacts({ name: "Ada Lopez", org: "Lopez Homes", statement: "Built 40 houses in Newark." });
    const suggestions = suggestChecklist(MEMBER_CHECKS.map((item) => item.key), facts, []);
    expect(suggestions.map((item) => item.key)).toEqual(["identity", "license", "references", "sanctions", "track"]);
    for (const suggestion of suggestions) {
      expect(suggestion.autoSuggested).toBe(true);
      expect(suggestion.note.startsWith("Auto-suggested.")).toBe(true);
      expect(suggestion.mark).not.toBe("PASS");
      expect(suggestion.note.toLowerCase()).toContain("couldn't verify for free");
      expect(suggestion.result).not.toBe("PASS");
    }
    expect(suggestions.find((item) => item.key === "track")?.note).toContain("track-record");
  });

  it("does not pass identity from an email domain", () => {
    const suggestion = suggestOne(
      "identity",
      emptyPrefillFacts({ name: "Ada Lopez", org: "Lopez Homes" }),
      [
        row({ checkKey: "email-provider", status: "PASS", finding: "Company domain.", url: "" }),
        row({ checkKey: "mx", status: "PASS", finding: "MX records exist.", url: "" }),
      ],
    );
    expect(suggestion.mark).toBe("COULDNT_VERIFY");
    expect(suggestion.note).toContain("Email domain was not used as proof.");
    expect(suggestion.note.toLowerCase()).not.toContain("verified");
  });

  it("passes track record only when a public story has a link", () => {
    const facts = emptyPrefillFacts({ name: "Ada Lopez", org: "Lopez Homes", statement: "Built 40 houses in Newark." });
    const localOnly = suggestOne("track", facts, [
      row({ checkKey: "text-risk", status: "PASS", finding: "The track-record note is long enough to read.", url: "" }),
    ]);
    expect(localOnly.mark).toBe("COULDNT_VERIFY");
    expect(localOnly.result).toBe("NOT_PROVIDED");

    const sourced = suggestOne("track", facts, [
      row({ checkKey: "news-story", status: "PASS", finding: "Neutral · 2024 · Ada Lopez at Lopez Homes", url: STORY, source: "City Desk" }),
    ]);
    expect(sourced.mark).toBe("PASS");
    expect(sourced.evidenceUrl).toBe(STORY);
    expect(sourced.note).toContain(STORY);
    expect(sourced.note.toLowerCase()).not.toContain("couldn't verify for free");
  });

  it("keeps an OFAC clear as a pass when litigation could not be checked", () => {
    const suggestion = suggestOne("sanctions", emptyPrefillFacts({ name: "Ada Lopez", org: "Lopez Homes" }), [
      row({ checkKey: "sanctions", status: "PASS", finding: "No name matched the OFAC list loaded 2026-10-27.", url: OFAC, source: "OFAC" }),
      row({ checkKey: "courts", status: "UNAVAILABLE", finding: "CourtListener was blocked.", url: "https://www.courtlistener.com/", source: "CourtListener" }),
    ]);
    expect(suggestion.mark).toBe("PASS");
    expect(suggestion.result).toBe("PASS");
    expect(suggestion.note).toContain(OFAC);
    expect(suggestion.note).toContain("2026-10-27");
    expect(suggestion.note.toLowerCase()).not.toContain("not a pass");
  });

  it("says OFAC was not checked and does not call that a pass", () => {
    const suggestion = suggestOne("sanctions", emptyPrefillFacts({ name: "Ada Lopez", org: "Lopez Homes" }), [
      row({ checkKey: "sanctions", status: "NOT_RUN", finding: "OFAC was not checked. No list was loaded. This is not a pass.", url: OFAC, source: "OFAC" }),
    ]);
    expect(suggestion.mark).not.toBe("PASS");
    expect(suggestion.result).not.toBe("PASS");
    expect(suggestion.note.toLowerCase()).toContain("not checked");
    expect(suggestion.note.toLowerCase()).toContain("not a pass");
  });

  it("fails a corroborated sanctions hit and never calls it a pass", () => {
    const suggestion = suggestOne("sanctions", emptyPrefillFacts({ name: "Ada Lopez" }), [
      row({
        checkKey: "sanctions",
        status: "FAIL",
        finding: "Watchlist name match on Ada Lopez and the location lines up.",
        url: OFAC,
        hardFlag: true,
      }),
    ]);
    expect(suggestion.mark).toBe("FAIL");
    expect(suggestion.result).toBe("FAIL");
    expect(suggestion.evidenceUrl).toBe(OFAC);
  });

  it("does not treat named references as a pass", () => {
    const suggestion = suggestOne(
      "references",
      emptyPrefillFacts({ referenceEmails: ["ada@example.com"] }),
      [],
    );
    expect(suggestion.mark).toBe("COULDNT_VERIFY");
    expect(suggestion.note).toContain("ada@example.com");
    expect(suggestion.note).toContain("not a completed reference");
  });

  it("leaves a skip and a confirmed mark alone", () => {
    const skipped = { note: "Skipped: no card on file", result: "NOT_PROVIDED", reviewerId: "admin", autoSuggested: false };
    const confirmed = { note: "I opened the filing.", result: "PASS", reviewerId: "admin", autoSuggested: false };
    const suggested = { note: "Auto-suggested. Suggested mark: Couldn't verify.", result: "NOT_PROVIDED", reviewerId: null, autoSuggested: true };
    expect(keepExistingMark(skipped)).toBe(true);
    expect(keepExistingMark(confirmed)).toBe(true);
    expect(canAutofill(suggested, "refresh")).toBe(true);
    expect(canAutofill({ note: "", result: "PENDING", reviewerId: null, autoSuggested: false }, "fill-empty")).toBe(true);
    expect(canAutofill(confirmed, "refresh")).toBe(false);
    expect(confirmedNote("Auto-suggested. Looked at the filing.")).toBe("Looked at the filing.");
  });

  it("does not let an auto-suggested pass mark the file verified", () => {
    const checks = [
      { result: "PASS", note: "Auto-suggested. Suggested mark: Pass.", autoSuggested: true },
      { result: "PASS", note: "Confirmed against the filing.", autoSuggested: false },
    ];
    expect(checklistComplete(checks)).toBe(false);
    expect(canMarkCaseVerified(checks).ok).toBe(false);
    expect(canMarkCaseVerified([{ result: "NOT_PROVIDED", note: "couldn't verify for free", autoSuggested: false }]).ok).toBe(false);
  });
});

describe("free company and sanctions sources", () => {
  it("reads an OpenCorporates hit and treats a blocked API as not a pass", () => {
    const payload = JSON.stringify({
      results: { companies: [{ company: { name: "Lopez Homes LLC", opencorporates_url: "https://opencorporates.com/companies/us_nj/1" } }] },
    });
    expect(openCorporatesCompanies(payload)[0]?.url).toContain("opencorporates.com");
    const hit = assessOpenCorporates("Lopez Homes", { ok: true, status: 200, text: payload });
    expect(hit.status).toBe("PASS");
    expect(hit.weight).toBe(0);
    expect(hit.finding).toContain("Not checkable for free.");
    expect(hit.url).toContain("https://opencorporates.com/companies/");
    const blocked = assessOpenCorporates("Lopez Homes", { ok: false, status: 401, text: "" });
    expect(blocked.status).toBe("UNAVAILABLE");
    expect(blocked.finding.toLowerCase()).toContain("couldn't verify for free");
  });

  it("reads an OpenSanctions miss and a blocked search", () => {
    expect(openSanctionsHits(JSON.stringify({ results: [] }))).toEqual([]);
    const clear = assessOpenSanctions({ name: "Ada Lopez", org: "Lopez Homes", location: "Newark, NJ" }, { ok: true, status: 200, text: "{\"results\":[]}" });
    expect(clear.status).toBe("PASS");
    expect(clear.weight).toBe(0);
    expect(clear.finding).toContain("Not checkable for free.");
    expect(clear.url).toContain("opensanctions.org");
    const blocked = assessOpenSanctions({ name: "Ada Lopez", org: "", location: "" }, { ok: false, status: 401, text: "" });
    expect(blocked.status).toBe("UNAVAILABLE");
    expect(blocked.finding.toLowerCase()).toContain("couldn't verify for free");
  });
});
