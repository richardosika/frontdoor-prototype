import { describe, expect, it } from "vitest";
import { applicationStatusLabel } from "@/lib/application-status";
import { needsStrongApprovalWarning, strongApprovalWarning, unverifiedApprovalItems } from "@/lib/approval-warning";
import { applicantDuesSentence, FREE_MEMBERSHIP_LINE } from "@/lib/dues";
import { publicEvidenceHref } from "@/lib/evidence-link";
import { inviteRequestAddress } from "@/lib/invite-request";
import { renderTemplate, repairDoubledTerminalPeriod, templateDef } from "@/lib/email-templates";
import { expiredDocument, missingPageDocument } from "@/lib/http-document";
import { reviewCopy } from "@/lib/review-copy";
import { isSignedInJoinEntry } from "@/lib/session-gate";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("QA fixes that stay outside grading", () => {
  it("keeps an internal note off the applicant-facing strings and rewords referral copy", () => {
    const source = "No invite code was stored on this file. Invite source came back without a usable match (none). They came in through invite ABC. No invite source was confirmed (0 of 4).";
    const shown = reviewCopy(source);
    expect(shown).toContain("No referral code was stored on this request.");
    expect(shown).toContain("The request source came back without a usable match");
    expect(shown).toContain("They came in through referral ABC.");
    expect(shown).toContain("No invite source was confirmed (0 of 4).");
  });

  it("opens CourtListener on the public search page", () => {
    const api = 'https://www.courtlistener.com/api/rest/v4/search/?q=%22Ada%20Lovelace%22&type=o';
    const human = publicEvidenceHref(api);
    expect(human.startsWith("https://www.courtlistener.com/?")).toBe(true);
    expect(human).not.toContain("/api/");
    expect(human).toContain("Ada");
    expect(publicEvidenceHref("https://rdap.org/domain/example.com")).toBe("https://rdap.org/domain/example.com");
  });

  it("requires a second confirmation for an F or a not-legit file", () => {
    expect(needsStrongApprovalWarning({ letter: "F", recommendation: "NEEDS MORE INFO", verdict: "" })).toBe(true);
    expect(needsStrongApprovalWarning({ letter: "A", recommendation: "APPROVE", verdict: "LEGIT" })).toBe(false);
    expect(needsStrongApprovalWarning({ letter: "C", verdict: "NOT_LEGIT" })).toBe(true);
    const text = strongApprovalWarning({
      letter: "F",
      verdict: "Recommended not legit",
      items: unverifiedApprovalItems({
        steps: [{ id: "news", title: "News", status: "COULDNT_VERIFY" }],
        attention: [{ title: "Court search" }],
      }),
    });
    expect(text).toContain("Grade F");
    expect(text).toContain("Recommended not legit");
    expect(text).toContain("News");
    expect(text).toContain("Court search");
    expect(text).toContain("second confirmation");
  });

  it("uses one status label and a free-membership sentence", () => {
    expect(applicationStatusLabel("SUBMITTED")).toBe("In review");
    expect(applicationStatusLabel("PENDING")).toBe("In review");
    expect(applicationStatusLabel("IN_REVIEW")).toBe("In review");
    expect(applicantDuesSentence(0, true)).toBe(FREE_MEMBERSHIP_LINE);
    expect(applicantDuesSentence(0, true)).toBe("Free membership. No dues.");
    expect(applicantDuesSentence(14_900, true)).toContain("Dues waived by an administrator.");
    expect(applicantDuesSentence(14_900, false)).not.toContain("Dues waived");
  });

  it("stores a lower-case state as uppercase and keeps the old join anchor", () => {
    expect(inviteRequestAddress({ street: "1 Main", city: "New York", state: "ny", zip: "10001" })).toContain("NY");
    expect(inviteRequestAddress({ street: "1 Main", city: "New York", state: "ny", zip: "10001" })).not.toContain(" ny ");
    expect(isSignedInJoinEntry("/", "#request-to-join")).toBe(true);
    expect(isSignedInJoinEntry("/", "#request-invite")).toBe(true);
  });

  it("skips a second period when the company name already ends with one", () => {
    const org = "CBRE Group, Inc.";
    const thanks = renderTemplate("Your request is for the {role} role at {org}.", { role: "Mortgage Broker", org }, { signOff: false });
    expect(thanks).toBe("Your request is for the Mortgage Broker role at CBRE Group, Inc.");
    const legacy = renderTemplate("It is for {role} at {org}.", { role: "Mortgage Broker", org }, { signOff: false });
    expect(legacy).toBe("It is for Mortgage Broker at CBRE Group, Inc.");
    const admin = repairDoubledTerminalPeriod(`Open the state search and look up ${org}.`);
    expect(admin).toBe("Open the state search and look up CBRE Group, Inc.");
    expect(renderTemplate("Your request is for the {role} role at {org}.", { role: "Mortgage Broker", org: "Northline Builders" }, { signOff: false })).toBe(
      "Your request is for the Mortgage Broker role at Northline Builders.",
    );
    expect(repairDoubledTerminalPeriod("Three headlines were saved for review...")).toBe("Three headlines were saved for review...");
  });

  it("uses a human date and a grammatical thank-you line", () => {
    expect(templateDef("payment_due")?.body).toContain("Your first full-price payment would be on {renewal_date}.");
    expect(templateDef("payment_due")?.body).not.toContain("if recorded today");
    expect(templateDef("application_thanks")?.body).toContain("Your request is for the {role} role at {org}.");
    expect(templateDef("application_thanks")?.body).not.toContain("It is for {role}");
  });

  it("does not name the demo member on the administrator sign-in page", () => {
    const page = readFileSync(path.resolve(__dirname, "../src/app/admin/login/page.tsx"), "utf8");
    expect(page).not.toContain("Marcus Hale");
    const missing = missingPageDocument(false);
    expect(missing).toContain("<h1>");
    expect(missing).toContain("Back to home");
    expect(missing).not.toContain("Back to the feed");
    expect(missingPageDocument(true)).toContain("Back to the feed");
    expect(expiredDocument("status")).toContain("<h1>Status link</h1>");
    expect(expiredDocument("payment")).toContain("<h1>Payment link</h1>");
  });
});
