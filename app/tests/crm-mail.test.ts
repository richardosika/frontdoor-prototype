import { describe, expect, it } from "vitest";
import { crmStage, csvCell, followUpDue } from "@/lib/crm-stage";
import {
  SIGN_OFF,
  TEMPLATE_DEFS,
  deliveryTarget,
  firstName,
  renderTemplate,
  shouldSuppressSend,
  templateDef,
} from "@/lib/email-templates";

const DAY = 24 * 60 * 60 * 1000;

describe("email templates", () => {
  it("fills variables once and keeps the founder sign-off", () => {
    const body = renderTemplate("Hello {first_name},\n\nCode {invite_code}.\n\nRichard Osika, Founder", {
      first_name: "Alex",
      invite_code: "PF-1",
    });
    expect(body).toBe("Hello Alex,\n\nCode PF-1.\n\nRichard Osika, Founder");
    expect(body.match(/Richard Osika, Founder/g)).toHaveLength(1);
    expect(renderTemplate("Hello {first_name}.", { first_name: "Alex" })).toContain(SIGN_OFF);
    expect(renderTemplate("Hello {unknown_token}.", {})).toContain("{unknown_token}");
    expect(firstName("Alex Rivera")).toBe("Alex");
  });

  it("keeps the declined letter free of a reason variable", () => {
    const declined = templateDef("declined");
    expect(declined?.body).not.toContain("{note}");
    expect(declined?.body).toContain("don't share the reasons");
    expect(declined?.body).toContain("Private Floor administrator");
    expect(declined?.body).toContain(SIGN_OFF);
  });

  it("ships the nine letters in a warm administrator voice", () => {
    expect(TEMPLATE_DEFS.map((item) => item.key)).toEqual([
      "info",
      "application_thanks",
      "welcome",
      "needs_info",
      "approved",
      "declined",
      "payment_due",
      "dues_reminder",
      "renewal",
    ]);
    const joined = TEMPLATE_DEFS.map((item) => `${item.subject}\n${item.body}`).join("\n");
    expect(joined).toContain("Private Floor administrator");
    expect(joined.toLowerCase()).not.toContain("sent from my");
    expect(joined).not.toContain("299 Market Street");
    expect(TEMPLATE_DEFS.every((item) => item.body.includes(SIGN_OFF))).toBe(true);
  });

  it("keeps live mode on the test outbox", () => {
    expect(deliveryTarget("outbox", "rich@privatefloorclub.com")).toEqual({
      to: "rich@privatefloorclub.com",
      via: "outbox",
      mode: "outbox",
    });
    expect(deliveryTarget("live", "rich@privatefloorclub.com").via).toBe("outbox");
    expect(deliveryTarget("live", "rich@privatefloorclub.com").to).toBe("rich@privatefloorclub.com");
    expect(shouldSuppressSend({ doNotContact: true })).toBe(true);
    expect(shouldSuppressSend({ doNotContact: false })).toBe(false);
    expect(shouldSuppressSend(null)).toBe(false);
  });
});

describe("crm stage", () => {
  it("follows invite, application, payment, and membership", () => {
    expect(crmStage({})).toBe("INVITED");
    expect(crmStage({ inviteStatus: "DECLINED" })).toBe("DECLINED");
    expect(crmStage({ applicationStatus: "SUBMITTED" })).toBe("APPLIED");
    expect(crmStage({ applicationStatus: "NEEDS_INFO" })).toBe("IN_REVIEW");
    expect(crmStage({ applicationStatus: "PAYMENT_DUE" })).toBe("APPROVED");
    expect(crmStage({ applicationStatus: "APPROVED" })).toBe("ACTIVE");
    expect(crmStage({ applicationStatus: "DECLINED" })).toBe("DECLINED");
    expect(crmStage({ memberActive: true, paymentStatus: "NOT_REQUIRED" })).toBe("ACTIVE");
    expect(crmStage({ memberActive: true, paymentStatus: "DUE" })).toBe("APPROVED");
    expect(crmStage({ memberActive: true, paymentStatus: "PAID" })).toBe("ACTIVE");
    expect(crmStage({ applicationStatus: "DECLINED", manualStage: "INVITED" })).toBe("INVITED");
  });

  it("marks a follow-up due and escapes csv cells", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    expect(followUpDue(null, now)).toBe(false);
    expect(followUpDue(new Date(now.getTime() - DAY), now)).toBe(true);
    expect(followUpDue(new Date(now.getTime() + DAY), now)).toBe(false);
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", friend')).toBe('"say ""hi"", friend"');
  });
});
