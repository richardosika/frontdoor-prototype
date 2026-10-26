import { describe, expect, it } from "vitest";
import { applicationStatusLabel } from "@/lib/application-status";
import { needsStrongApprovalWarning, strongApprovalWarning, unverifiedApprovalItems } from "@/lib/approval-warning";
import { applicantDuesSentence, FREE_MEMBERSHIP_LINE } from "@/lib/dues";
import { publicEvidenceHref } from "@/lib/evidence-link";
import { inviteRequestAddress } from "@/lib/invite-request";
import { DUES_LOCALES } from "@/lib/dues";
import { RECEIPT_FOOTER_NOTE, RECEIPT_SUBJECT, footerNoteFor } from "@/lib/email-layout";
import { renderTemplate, repairDoubledTerminalPeriod, templateDef } from "@/lib/email-templates";
import { paymentReceiptText } from "@/lib/payment-record";
import { noticeHtml } from "@/lib/resend-mail";
import { expiredDocument, missingPageDocument } from "@/lib/http-document";
import { publicAbsoluteUrl, withRequestSearch } from "@/lib/public-origin";
import { outboxTiedToEmails } from "@/lib/remove-member";
import { reviewCheckKey, reviewCopy } from "@/lib/review-copy";
import { payPageState } from "@/lib/dues";
import { guidedGradeApplicant } from "@/lib/guided-prefill-db";
import { emptyPrefillFacts } from "@/lib/guided-prefill";
import { isSignedInJoinEntry } from "@/lib/session-gate";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../src");

describe("QA fixes that stay outside grading", () => {
  it("keeps an internal note off the applicant-facing strings and rewords referral copy", () => {
    const source = "No invite code was stored on this file. An invite code is on the file (PF-1). Invite source came back without a usable match (Invite code). They came in through invite ABC. No invite source was confirmed (0 of 4). invite-source No invite note was stored, so the sponsoring member is not named here. Ada applied as a Developer at Build Co.";
    const shown = reviewCopy(source, "GENERAL_CONTRACTOR");
    expect(shown).toContain("No referral code was stored on this request.");
    expect(shown).toContain("A referral code is on the file");
    expect(shown).not.toContain("An invite code is on the file");
    expect(shown).toContain("The request source came back without a usable match (Referral code).");
    expect(shown).not.toContain("(Invite code)");
    expect(shown).toContain("They came in through referral ABC.");
    expect(shown).toContain("No referral source was confirmed (0 of 4).");
    expect(shown).not.toContain("No invite source was confirmed");
    expect(shown).toContain("referral No referral note was stored, so the sponsoring member is not named here.");
    expect(shown).not.toContain("invite-source");
    expect(shown).not.toContain("invite note");
    expect(reviewCheckKey("invite-source")).toBe("referral");
    expect(shown).toContain("applied as a General Contractor");
    expect(shown).not.toContain("applied as a Developer");
    expect(reviewCopy("Ada applied as a Developer at Build Co.", "DEVELOPER")).toContain("applied as a Developer");
    const decision = readFileSync(path.join(ROOT, "components/decision-form.tsx"), "utf8");
    expect(decision).toContain("Internal note");
    expect(decision).toContain("Never emailed and never shown to the applicant.");
    expect(decision).toContain('name="applicantMessage"');
  });

  it("builds status and pay redirects from the public origin", () => {
    const forwarded = new Headers({
      host: "0.0.0.0:10000",
      "x-forwarded-host": "cornicio-mvp.onrender.com",
      "x-forwarded-proto": "https",
    });
    const location = publicAbsoluteUrl("/pay/view/token", forwarded, {});
    expect(location).toBe("https://cornicio-mvp.onrender.com/pay/view/token");
    expect(location).not.toContain("0.0.0.0");
    const noticed = publicAbsoluteUrl(
      withRequestSearch("/pay/view/token", "http://0.0.0.0:10000/pay/token?notice=Test+payment+recorded.+Sign+in+to+open+the+floor"),
      forwarded,
      {},
    );
    expect(noticed).toBe(
      "https://cornicio-mvp.onrender.com/pay/view/token?notice=Test+payment+recorded.+Sign+in+to+open+the+floor",
    );
    expect(noticed).not.toContain("0.0.0.0");
    expect(publicAbsoluteUrl("/apply/status/view/abc", new Headers({ host: "0.0.0.0:10000" }), { APP_URL: "https://cornicio-mvp.onrender.com" })).toBe(
      "https://cornicio-mvp.onrender.com/apply/status/view/abc",
    );
    expect(
      publicAbsoluteUrl("/request-status/view/abc", new Headers({ host: "0.0.0.0:10000" }), { NEXTAUTH_URL: "https://cornicio-mvp.onrender.com/" }),
    ).toBe("https://cornicio-mvp.onrender.com/request-status/view/abc");
    for (const file of ["app/pay/[token]/route.ts", "app/apply/status/[token]/route.ts", "app/request-status/[token]/route.ts"]) {
      const route = readFileSync(path.join(ROOT, file), "utf8");
      expect(route).toContain("publicAbsoluteUrl");
      expect(route).toContain("withRequestSearch");
      expect(route).not.toMatch(/NextResponse\.redirect\(\s*(?:request\.url|new URL\(request\.url\))/);
    }
    const middleware = readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
    expect(middleware).toContain("publicAbsoluteUrl");
    expect(middleware).not.toMatch(/NextResponse\.redirect\(\s*(?:request\.url|new URL\(request\.url\))/);
  });

  it("shows only the active membership after payment and keeps the real role on a request", () => {
    expect(payPageState("PAID")).toBe("active");
    expect(payPageState("DUE")).toBe("due");
    const pay = readFileSync(path.join(ROOT, "components/pay-dues.tsx"), "utf8");
    expect(pay).toContain('payPageState(status) === "active"');
    expect(pay).toContain("This membership is active");
    const payments = readFileSync(path.join(ROOT, "app/(app)/admin/payments/page.tsx"), "utf8");
    expect(payments).toContain("First month");
    expect(payments).toContain("firstMonthCents");
    const decision = readFileSync(path.join(ROOT, "components/decision-form.tsx"), "utf8");
    expect(decision).not.toContain("window.confirm");
    expect(decision).toContain("Approval was not recorded. Nothing was sent.");
    expect(decision).toContain('role="dialog"');
    const confirm = readFileSync(path.join(ROOT, "components/run-and-reload.tsx"), "utf8");
    expect(confirm).not.toContain("window.confirm");
    expect(confirm).toContain('role="dialog"');
    expect(confirm).toContain("Cancelled. Nothing was changed.");
    const member = readFileSync(path.join(ROOT, "app/(app)/admin/members/[id]/page.tsx"), "utf8");
    expect(member).toContain("ConfirmSubmitButton");
    expect(member).toContain("Remove member");
    const where = outboxTiedToEmails(["Ada@Example.com"], { applicationIds: ["app_1"], tokens: ["status-token"] });
    expect(JSON.stringify(where)).toContain("insensitive");
    expect(JSON.stringify(where)).toContain("Intended recipient: Ada@Example.com");
    expect(JSON.stringify(where)).toContain("status-token");
    expect(JSON.stringify(where)).not.toContain('"applicationId":null');
    const applicant = guidedGradeApplicant(emptyPrefillFacts({ name: "Ada", org: "Build Co" }), { role: "GENERAL_CONTRACTOR" });
    expect(applicant.role).toBe("GENERAL_CONTRACTOR");
    const removal = readFileSync(path.join(ROOT, "lib/remove-member.ts"), "utf8");
    expect(removal).toContain("application.deleteMany");
    expect(removal).toContain("crmPerson.deleteMany");
    const requestDelete = readFileSync(path.join(ROOT, "actions/admin.ts"), "utf8");
    expect(requestDelete).toContain("verificationCase.deleteMany");
    expect(requestDelete).toContain("deleteOutboxTied");
    expect(requestDelete).toContain("crmPerson.deleteMany");
    expect(removal).toContain("deleteOutboxTied");
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
    const money = /\$|dues|price|charge|fee|primer mes|erster Monat|初月/i;
    for (const key of ["application_thanks", "invite_received"] as const) {
      const body = templateDef(key)?.body || "";
      expect(body).toContain("personally review");
      expect(body).toContain("{status_link}");
      expect(body).not.toMatch(money);
      for (const row of DUES_LOCALES) {
        expect(body).not.toContain(row.text.slice(0, 48));
      }
    }
    const receipt = paymentReceiptText({
      firstName: "Ada",
      role: "General Contractor",
      firstCharge: "$74.50",
      monthly: "$149",
      renewal: "November 26, 2026",
      modeLine: "Recorded as a simulated TEST payment. No card was charged.",
      loginLink: "https://cornicio-mvp.onrender.com/login",
    });
    expect(receipt).toContain("First month $74.50");
    expect(receipt).toContain("Full price $149 per month starts");
    expect(receipt).not.toContain("per month per month");
    expect(receipt).toContain("Sign in\nhttps://cornicio-mvp.onrender.com/login");
    expect(receipt.trimEnd().endsWith("Richard Osika, Founder")).toBe(true);
    const html = noticeHtml(receipt, { headline: RECEIPT_SUBJECT });
    expect(html).toContain(">SIGN IN</a>");
    expect(html).toContain(RECEIPT_FOOTER_NOTE);
    expect(html).not.toContain("process payments through the platform");
    expect(footerNoteFor("We have your Private Floor application")).toContain("process payments through the platform");
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
