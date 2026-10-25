import { describe, expect, it } from "vitest";
import {
  APPLICATION_CODE_LENGTH,
  emailProviderConfigured,
  newApplicationCode,
  normalizeApplicationCode,
  testModeCodeMessage,
  verificationCodeForScreen,
} from "@/lib/application-code";
import { APPLY_ENCOURAGEMENT, INVITE_STATUS_COPY, LANDING_INTRO } from "@/lib/applicant-copy";
import { validateApplication } from "@/lib/domain";
import { validateInviteRequest } from "@/lib/invite-request";
import { formatAddress, validatePhone } from "@/lib/person-fields";

const ADDRESS = {
  street: "299 Market Street",
  city: "Saddle Brook",
  state: "nj",
  zip: "07663",
};

describe("applicant details", () => {
  it("keeps the landing line short and leaves the business card out", () => {
    expect(LANDING_INTRO).toContain("A Private Floor administrator reviews every application.");
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
    expect(INVITE_STATUS_COPY.PENDING.title).toBe("Application received");
    expect(INVITE_STATUS_COPY.PENDING.body).toContain("You will hear from us by email.");
    expect(INVITE_STATUS_COPY.PENDING.body).not.toContain("has not issued a code");
    expect(INVITE_STATUS_COPY.ISSUED.body).toContain("invite code");
    expect(INVITE_STATUS_COPY.DECLINED.title).toBe("Thank you for applying");
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
    expect(testModeCodeMessage("1234")).toContain("TEST MODE");
    expect(testModeCodeMessage("1234")).toContain("1234");
    expect(testModeCodeMessage("1234")).toContain("admin Outbox");
    expect(emailProviderConfigured({})).toBe(false);
    expect(emailProviderConfigured({ EMAIL_PROVIDER: "resend" })).toBe(true);
    expect(emailProviderConfigured({ RESEND_API_KEY: " " })).toBe(false);
    expect(emailProviderConfigured({ SMTP_URL: "smtp://mail.example" })).toBe(true);
  });
});
