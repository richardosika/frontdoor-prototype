import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPLICATION_CODE_LENGTH,
  emailProviderConfigured,
  newApplicationCode,
  normalizeApplicationCode,
  testModeCodeMessage,
  showTestCodeRequested,
  verificationCodeForScreen,
} from "@/lib/application-code";
import { applicationReceivedMessage, APPLY_ENCOURAGEMENT, INVITE_STATUS_COPY, LANDING_INTRO, requestReceivedMessage } from "@/lib/applicant-copy";
import { validateApplication } from "@/lib/domain";
import { duplicateJoinMessage, validateInviteRequest } from "@/lib/invite-request";
import { formatAddress, validatePhone } from "@/lib/person-fields";

const ADDRESS = {
  street: "299 Market Street",
  city: "Saddle Brook",
  state: "nj",
  zip: "07663",
};

describe("applicant details", () => {
  it("keeps the landing line short and leaves the business card out", () => {
    expect(LANDING_INTRO).toContain("A private network where every member is personally reviewed");
    expect(LANDING_INTRO).toContain("Anyone can request to join");
    expect(LANDING_INTRO.toLowerCase()).not.toContain("invite-only");
    expect(LANDING_INTRO.toLowerCase()).not.toContain("business card");
    expect(APPLY_ENCOURAGEMENT).toBe(
      "The more detail you share, the better we can match you with the right members and deals.",
    );
  });

  it("requires a full name, a full address, and a contact phone", () => {
    expect(formatAddress(ADDRESS)).toBe("299 Market Street, Saddle Brook, NJ 07663");
    expect(validatePhone("")).toMatch(/contact phone/i);
    expect(validatePhone("201-555-0148")).toBeNull();
    const missing = validateApplication({
      code: "PF-7K2M-91QX",
      role: "DEVELOPER",
      firstName: "Richard",
      lastName: "",
      email: "rich@buildpro-cs.com",
      password: "long-enough",
      org: "Buildpro",
      street: "299 Market Street",
      city: "Saddle Brook",
      state: "NJ",
      zip: "07663",
      phone: "",
    });
    expect(missing).toContain("Enter your last name.");
    expect(missing.some((error) => /contact phone/i.test(error))).toBe(true);
    expect(
      validateInviteRequest({
        firstName: "Richard",
        lastName: "Osika",
        email: "rich@buildpro-cs.com",
        role: "DEVELOPER",
        company: "Buildpro",
        street: "Market",
        city: "Saddle Brook",
        state: "New Jersey",
        zip: "7663",
      })[0],
    ).toBe("Enter a two-letter state.");
  });

  it("uses warm invite status wording", () => {
    expect(INVITE_STATUS_COPY.PENDING.title).toBe("Request received");
    expect(INVITE_STATUS_COPY.PENDING.body).toContain("We've got your request to join");
    expect(INVITE_STATUS_COPY.PENDING.body).toContain("A private network where every member is personally reviewed");
    expect(INVITE_STATUS_COPY.PENDING.body).not.toMatch(/invite|founding|limited|\$|dues|price/i);
    expect(requestReceivedMessage("Ada Lovelace")).toContain("Thank you, Ada. We've got your request to join.");
    expect(applicationReceivedMessage("Ada Lovelace")).toBe(
      "Thank you, Ada. We've got your application. A member of the Private Floor team will personally review it, usually within a few days. We'll email you as soon as there's news. We're glad you want to be part of this.",
    );
    expect(INVITE_STATUS_COPY.PENDING.body).not.toContain("has not issued a code");
    expect(INVITE_STATUS_COPY.ISSUED.body).not.toMatch(/invite/i);
    expect(INVITE_STATUS_COPY.ISSUED.body).toContain("email you about the next step");
    expect(INVITE_STATUS_COPY.DECLINED.title).toBe("Thank you for your request to join");
    expect(INVITE_STATUS_COPY.DECLINED.body).not.toMatch(/application|invite|\$|dues|price/i);
    const statusPage = readFileSync(path.resolve(__dirname, "../src/app/request-status/view/[token]/page.tsx"), "utf8");
    expect(statusPage).toContain("requestReceivedMessage");
    expect(statusPage).not.toContain("statusMembershipLine");
    expect(statusPage).not.toContain("Application received");
  });

  it("blocks a second request to join while an account, application, or open request exists", () => {
    expect(
      duplicateJoinMessage({ hasAccount: true, hasOpenApplication: false, hasOpenRequest: false }),
    ).toBe("An account with that email already exists. Sign in instead.");
    expect(
      duplicateJoinMessage({ hasAccount: false, hasOpenApplication: true, hasOpenRequest: false }),
    ).toBe("An application for that email is already under review.");
    expect(
      duplicateJoinMessage({ hasAccount: false, hasOpenApplication: false, hasOpenRequest: true }),
    ).toBe("A request to join for that email is already waiting.");
    expect(
      duplicateJoinMessage({ hasAccount: false, hasOpenApplication: false, hasOpenRequest: false }),
    ).toBeNull();
  });
});

describe("application email code", () => {
  it("is four digits and appears on screen only in test mode", () => {
    expect(APPLICATION_CODE_LENGTH).toBe(4);
    expect(newApplicationCode(() => 7)).toBe("0007");
    expect(newApplicationCode(() => 10000)).toBe("0000");
    expect(normalizeApplicationCode("12-34")).toBe("1234");
    expect(verificationCodeForScreen({ providerConfigured: false, code: "1234" })).toBe("1234");
    expect(verificationCodeForScreen({ providerConfigured: true, code: "1234" })).toBeNull();
    expect(verificationCodeForScreen({ providerConfigured: true, showTestCode: true, code: "1234" })).toBe("1234");
    expect(verificationCodeForScreen({ providerConfigured: true, showTestCode: false, code: "1234" })).toBeNull();
    expect(showTestCodeRequested({})).toBe(false);
    expect(showTestCodeRequested({ SHOW_TEST_CODE: "1" })).toBe(true);
    expect(showTestCodeRequested({ SHOW_TEST_CODE: "true" })).toBe(false);
    expect(testModeCodeMessage("1234")).toContain("TEST MODE");
    expect(testModeCodeMessage("1234")).toContain("No email provider is configured");
    expect(testModeCodeMessage("1234")).toContain("1234");
    expect(testModeCodeMessage("1234")).toContain("admin Outbox");
    expect(testModeCodeMessage("1234", { providerConfigured: true })).toContain("SHOW_TEST_CODE is on");
    expect(emailProviderConfigured({})).toBe(false);
    expect(emailProviderConfigured({ EMAIL_PROVIDER: "resend" })).toBe(true);
    expect(emailProviderConfigured({ RESEND_API_KEY: " " })).toBe(false);
    expect(emailProviderConfigured({ SMTP_URL: "smtp://mail.example" })).toBe(true);
  });
});
