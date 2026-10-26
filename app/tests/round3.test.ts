import { describe, expect, it } from "vitest";
import { memberStatusCopy } from "@/lib/application-status";
import { adminDuesLine } from "@/lib/dues";
import { memberFacingLegal, readLegalMarkdown } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";
import { STUCK_RUN_MS, stuckRunDecision } from "@/lib/verify/watchdog";

const NOW = new Date("2026-10-25T02:00:00.000Z");

describe("verification watchdog", () => {
  it("waits while a run is still inside the window", () => {
    expect(
      stuckRunDecision(
        { status: "RUNNING", startedAt: new Date(NOW.getTime() - 60_000), createdAt: NOW, error: "" },
        NOW,
      ),
    ).toBe("wait");
  });

  it("retries once after the window, then fails the next time", () => {
    const startedAt = new Date(NOW.getTime() - STUCK_RUN_MS - 1000);
    expect(stuckRunDecision({ status: "RUNNING", startedAt, createdAt: startedAt, error: "" }, NOW)).toBe("retry");
    expect(
      stuckRunDecision({ status: "RUNNING", startedAt, createdAt: startedAt, error: "watchdog-retry:1" }, NOW),
    ).toBe("fail");
    expect(stuckRunDecision({ status: "DONE", startedAt, createdAt: startedAt, error: "" }, NOW)).toBe("wait");
  });
});

describe("round 3 copy", () => {
  it("calls a free role free instead of waived", () => {
    expect(adminDuesLine(0, true)).toBe("Free role - no dues");
    expect(adminDuesLine(14_900, true)).toContain("Dues waived by an administrator.");
    expect(adminDuesLine(14_900, false)).toContain("$149 per month");
    expect(adminDuesLine(14_900, false)).toContain("$74.50");
    expect(adminDuesLine(14_900, false)).toContain("Month to month");
    expect(adminDuesLine(240_000, false)).not.toContain("waived");
  });

  it("uses administrator on the member status page", () => {
    expect(memberStatusCopy("SUBMITTED").title).toBe("Application received");
    expect(memberStatusCopy("SUBMITTED").body).toContain("We've got your application");
    expect(memberStatusCopy("SUBMITTED").body).not.toContain("Richard Osika");
  });

  it("drops authoring notes and marks a real placeholder", () => {
    const source = [
      "Private Floor Club LLC, a New Jersey limited liability company [to be formed].",
      "[PLACEHOLDER — billing is not yet built and nothing is charged during testing.]",
      "[ Submit application ]",
      "**Short helper text under the button:** You can withdraw consent.",
    ].join("\n");
    const shown = memberFacingLegal(source);
    expect(shown).not.toContain("PLACEHOLDER");
    expect(shown).not.toContain("Submit application");
    expect(shown).not.toContain("Short helper text");
    expect(shown).toContain("[to be formed]");
    expect(shown).toContain("You can withdraw consent.");
    const html = renderMarkdown(shown);
    expect(html).toContain("border-brass");
    expect(html).toContain("[to be formed]");
    expect(html).not.toContain("PLACEHOLDER");
  });

  it("removes billing authoring notes from the published drafts", () => {
    const privacy = memberFacingLegal(readLegalMarkdown("privacy.md"));
    const terms = memberFacingLegal(readLegalMarkdown("terms.md"));
    const consent = memberFacingLegal(readLegalMarkdown("applicant-consent.md"));
    for (const shown of [privacy, terms, consent]) {
      expect(shown).not.toMatch(/PLACEHOLDER/i);
      expect(shown).not.toMatch(/short helper text/i);
    }
    expect(privacy).not.toContain("billing is not yet built");
    expect(privacy).not.toContain("categories ;");
    expect(privacy).toContain("[to be formed]");
    expect(terms).toContain("[to be formed]");
    expect(terms).toContain("[confirm with counsel]");
    expect(terms).toContain("[membership is currently limited to professionals doing business in the United States]");
    expect(consent).toContain("You can withdraw consent");
    expect(consent).not.toContain("[ Submit application ]");
    const html = renderMarkdown(terms);
    expect(html).toContain("border-brass");
    expect(html).toContain("[to be formed]");
  });
});
