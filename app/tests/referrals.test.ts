import { describe, expect, it } from "vitest";
import { referralStatus, referralsLeft } from "@/lib/referrals";
import { PHRASES } from "@/lib/i18n/phrases";

describe("#43 referrals", () => {
  it("counts referrals left and never goes below zero", () => {
    expect(referralsLeft(0)).toBe(3);
    expect(referralsLeft(2)).toBe(1);
    expect(referralsLeft(5)).toBe(0);
  });
  it("status follows the application on the code", () => {
    expect(referralStatus([])).toBe("Sent");
    expect(referralStatus([{ status: "IN_REVIEW" }])).toBe("Applied");
    expect(referralStatus([{ status: "DECLINED" }])).toBe("Applied");
    expect(referralStatus([{ status: "APPROVED" }])).toBe("Approved");
    expect(referralStatus([{ status: "PAYMENT_DUE" }])).toBe("Approved");
  });
  it("member-facing referral text is translated and avoids banned words", () => {
    const keys = ["Refer a colleague", "Referrals left", "Your referrals", "Sent", "Applied", "Approved", "No referrals yet.", "You have no referrals left."];
    for (const key of keys) expect(PHRASES[key], key).toBeDefined();
    for (const key of keys) for (const text of [key, ...(PHRASES[key] ?? [])]) expect(/\b(invite|invited|invite-only|founding member|limited)\b/i.test(text)).toBe(false);
  });
});
