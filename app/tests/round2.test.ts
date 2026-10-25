import { describe, expect, it } from "vitest";
import { applicantRemovalList, cleanupWindowHours, duplicateExampleIds } from "@/lib/demo-cleanup";
import { dropEmptyLabelLines, renderTemplate, SIGN_OFF } from "@/lib/email-templates";
import { formatEtDate } from "@/lib/format";
import { cleanHelpText } from "@/lib/help/answer";
import { memberFacingLegal, signupConsentCopy } from "@/lib/legal";
import { eligibleForDirectory, renewalInOneYear } from "@/lib/payments";
import { inactiveAccountPath, loggedInPublicRedirect } from "@/lib/session-gate";
import { appendMemberReply, splitMemberReply } from "@/lib/statement";
import { websiteNamesMatch } from "@/lib/verify/checks";
import { minHostGapMs } from "@/lib/verify/fetch";
import { readCardImage } from "@/lib/verify/ocr";
import { buildSummary, unavailableLabels } from "@/lib/verify/score";
import type { CheckOutput } from "@/lib/verify/types";
import { providerAttemptState, wikipediaRestResultTexts } from "@/lib/verify/web-search";

function check(partial: Partial<CheckOutput> & Pick<CheckOutput, "key" | "status" | "finding">): CheckOutput {
  return {
    weight: 1,
    source: partial.key,
    url: "",
    ranAt: "2026-10-24T00:00:00.000Z",
    ...partial,
  };
}

describe("suspended sessions", () => {
  it("sends a signed-in inactive account to the suspended page and leaves that page alone", () => {
    expect(inactiveAccountPath(null)).toBe("/login");
    expect(inactiveAccountPath({ status: "ACTIVE" })).toBeNull();
    expect(inactiveAccountPath({ status: "DISABLED" })).toBe("/suspended");
    expect(loggedInPublicRedirect("/login")).toBe("/feed");
    expect(loggedInPublicRedirect("/")).toBe("/feed");
    expect(loggedInPublicRedirect("/suspended")).toBeNull();
    expect(loggedInPublicRedirect("/feed")).toBeNull();
  });
});

describe("shared website result", () => {
  const example = "example domain this domain is for use in illustrative examples in documents";

  it("does not pass a made-up name on example.com for either report shape", () => {
    expect(websiteNamesMatch(example, "Quillon Vaspertine", "Example Holdings LLC")).toBe(false);
    expect(websiteNamesMatch(example, "Example Holdings LLC", "Example Holdings LLC")).toBe(false);
  });

  it("passes when the person and a distinctive company token are on the page", () => {
    const page = "Stephen Ross leads Related Companies in New York.";
    expect(websiteNamesMatch(page, "Stephen Ross", "Related Companies")).toBe(true);
  });
});

describe("verification summary", () => {
  it("lists providers named as unavailable inside a finding", () => {
    const checks = [
      check({
        key: "web-footprint",
        status: "INCONCLUSIVE",
        finding: "No data found. Bing responded. Unavailable: DuckDuckGo, Wikipedia, Wikidata, GDELT.",
      }),
    ];
    expect(unavailableLabels(checks)).toEqual(["DuckDuckGo", "Wikipedia", "Wikidata", "GDELT"]);
    const summary = buildSummary(checks, 10, "NEEDS_OWNER_DECISION");
    expect(summary).toContain("Unavailable sources: DuckDuckGo, Wikipedia, Wikidata, GDELT.");
    expect(summary).not.toContain("none of the free sources were blocked");
  });
});

describe("web providers", () => {
  it("treats an empty HTTP 200 as no data and a 429 as unavailable", () => {
    expect(providerAttemptState(200, 0)).toBe("no-data");
    expect(providerAttemptState(200, 2)).toBe("ready");
    expect(providerAttemptState(429, 0)).toBe("unavailable");
    expect(providerAttemptState(403, 3)).toBe("unavailable");
    expect(providerAttemptState(0, 0)).toBe("unavailable");
    expect(wikipediaRestResultTexts(JSON.stringify({ pages: [{ title: "Ada", description: "Builder", excerpt: "Ada builds." }] }))).toEqual([
      "Ada Builder Ada builds.",
    ]);
  });

  it("waits five seconds between GDELT calls", () => {
    expect(minHostGapMs("api.gdeltproject.org")).toBe(5000);
    expect(minHostGapMs("en.wikipedia.org")).toBe(1000);
  });
});

describe("mail subjects and renewal dates", () => {
  it("keeps the founder sign-off off subjects and drops an empty decision line", () => {
    const subject = renderTemplate("Welcome to Private Floor", {}, { signOff: false });
    expect(subject).toBe("Welcome to Private Floor");
    expect(subject).not.toContain(SIGN_OFF);
    const body = renderTemplate("The decision is here: {status_link}\n\nPay here: {payment_link}", {
      status_link: "",
      payment_link: "https://example.com/pay",
    });
    expect(body).not.toContain("The decision is here");
    expect(body).toContain("Pay here: https://example.com/pay");
    expect(body).toContain(SIGN_OFF);
    expect(dropEmptyLabelLines("The decision is here: \n")).not.toContain("decision");
  });

  it("uses the New York calendar date for a renewal one year later", () => {
    const paid = new Date("2026-10-25T00:11:00.000Z");
    expect(formatEtDate(paid)).toBe("2026-10-24");
    expect(formatEtDate(renewalInOneYear(paid))).toBe("2027-10-24");
  });
});

describe("member-facing copy", () => {
  it("shows real dues on signup and strips draft markers from member legal text", () => {
    const html = signupConsentCopy().beforeHtml;
    expect(html).toContain("$2,400");
    expect(html).toContain("$1,800");
    expect(html).toContain("$1,200");
    expect(html).not.toContain("[amounts");
    expect(html).not.toContain("[DATE]");
    const shown = memberFacingLegal(
      "DRAFT - for attorney review. Bracketed items are placeholders still to be confirmed.\n\n**Last updated:** [DATE]\n",
    );
    expect(shown).toContain("October 24, 2026");
    expect(shown).not.toContain("[DATE]");
    expect(shown).not.toContain("Bracketed items");
    expect(shown).not.toContain("DRAFT");
    expect(cleanHelpText("**Held.** Last updated [DATE]. Bracketed items are placeholders.")).not.toContain("**");
    expect(cleanHelpText("**Held.** Last updated [DATE].")).toContain("October 24, 2026");
    expect(cleanHelpText("**Held.** Last updated [DATE].")).not.toContain("[DATE]");
  });
});

describe("directory, replies, and cleanup", () => {
  it("hides payment-due members and keeps paid members", () => {
    expect(eligibleForDirectory({ status: "ACTIVE", paymentStatus: "DUE" })).toBe(false);
    expect(eligibleForDirectory({ status: "ACTIVE", paymentStatus: "FAILED" })).toBe(false);
    expect(eligibleForDirectory({ status: "ACTIVE", paymentStatus: "REFUNDED" })).toBe(false);
    expect(eligibleForDirectory({ status: "ACTIVE", paymentStatus: "PAID" })).toBe(true);
    expect(eligibleForDirectory({ status: "ACTIVE", paymentStatus: "NOT_REQUIRED" })).toBe(true);
    expect(eligibleForDirectory({ status: "DISABLED", paymentStatus: "PAID" })).toBe(false);
  });

  it("shows a member reply apart from the track record with a New York time", () => {
    const statement = appendMemberReply("Built three houses.", "Here is the extra card.", new Date("2026-10-25T00:22:15.534Z"));
    const parts = splitMemberReply(statement);
    expect(parts.track).toBe("Built three houses.");
    expect(parts.replies).toHaveLength(1);
    expect(parts.replies[0]?.text).toBe("Here is the extra card.");
    expect(parts.replies[0]?.label).toContain("2026");
    expect(parts.replies[0]?.label).toContain("America/New_York");
    expect(parts.replies[0]?.label).not.toContain("T00:22");
    expect(statement).toContain("Member reply");
  });

  it("lists what delete applicant removes and caps the recent-hours window", () => {
    expect(applicantRemovalList({ member: true, crm: true })).toEqual([
      "the application",
      "verification runs",
      "outbox notices for that email",
      "the business card",
      "the linked member account",
      "that member's posts and messages",
      "the CRM person record",
    ]);
    expect(cleanupWindowHours("24")).toBe(24);
    expect(cleanupWindowHours("0")).toBeNull();
    expect(cleanupWindowHours("200")).toBeNull();
  });

  it("drops a newer example Daniel Reyes and keeps a real address", () => {
    const older = new Date("2026-01-01T00:00:00.000Z");
    const newer = new Date("2026-02-01T00:00:00.000Z");
    expect(
      duplicateExampleIds([
        { id: "new", email: "daniel.reyes.2@firm.example", isTest: false, isAdmin: false, createdAt: newer },
        { id: "old", email: "daniel.reyes@firm.example", isTest: true, isAdmin: false, createdAt: older },
        { id: "real", email: "daniel@real-firm.com", isTest: false, isAdmin: false, createdAt: newer },
        { id: "admin", email: "admin@firm.example", isTest: true, isAdmin: true, createdAt: older },
      ]),
    ).toEqual(["new"]);
    expect(
      duplicateExampleIds([{ id: "only", email: "daniel.reyes@firm.example", isTest: true, isAdmin: false, createdAt: older }]),
    ).toEqual([]);
  });
});

describe("business card OCR", () => {
  it("does not claim it read a PDF", async () => {
    expect(await readCardImage("application/pdf", new Uint8Array([1, 2, 3]))).toBe("");
    expect(await readCardImage("image/png", new Uint8Array())).toBe("");
  });
});
