import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  credits: [] as any[],
  notifications: [] as any[],
  suggestion: {
    id: "s1",
    vendorUserId: "v1",
    suggestedById: "m1",
    vendorName: "Dana Whitfield",
    company: "",
    suggestedBy: { id: "m1", role: "GENERAL_CONTRACTOR", duesCents: 19_900, stripeCustomerId: "" },
  } as any,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vendorSuggestion: { findUnique: vi.fn(async () => db.suggestion) },
    duesCredit: {
      findUnique: vi.fn(async ({ where }: any) => db.credits.find((c) => c.suggestionId === where.suggestionId) ?? null),
      create: vi.fn(async ({ data }: any) => {
        if (db.credits.some((c) => c.suggestionId === data.suggestionId)) throw new Error("unique");
        const row = { id: `c${db.credits.length + 1}`, ...data };
        db.credits.push(row);
        return row;
      }),
    },
    user: { findUnique: vi.fn(async () => ({ locale: "en" })) },
    notification: { create: vi.fn(async ({ data }: any) => db.notifications.push(data)) },
  },
}));
vi.mock("@/lib/notices", () => ({ sendNotice: vi.fn(async () => ({ id: "o1", deliveredTo: "x" })) }));
vi.mock("@/lib/url", () => ({ appBaseUrl: vi.fn(async () => "https://example.test") }));
vi.mock("@/lib/i18n/server", () => ({ memberLocale: vi.fn(async () => "en") }));

import { vendorSuggestionAdminNotice } from "@/lib/admin-alerts";
import { PHRASES } from "@/lib/i18n/phrases";
import { VENDOR_PHRASES } from "@/lib/i18n/vendor-phrases";
import {
  RELATION_LABEL,
  STATUS_LABEL,
  creditFor,
  demandArea,
  demandByCategory,
  deriveSuggestionStatus,
  nextChargeAfterCredits,
  validateSuggestion,
  vendorIsPaying,
} from "@/lib/vendor-suggestions";
import { grantSuggestionCredit } from "@/lib/vendor-suggestions-db";

const BANNED_WORDS = new RegExp(["inv" + "ite", "inv" + "ited", "inv" + "ite-only", "founding " + "member", "lim" + "ited"].map((w) => `\\b${w}\\b`).join("|"), "i");
const base = { vendorName: "Dana", company: "Whitfield", category: "MEP_ENGINEER", location: "Austin, TX", website: "", contact: "", relation: "WORKED", note: "", nameOk: true };

describe("suggestion validation", () => {
  it("accepts a full suggestion and trims", () => {
    const r = validateSuggestion({ ...base, vendorName: "  Dana  Whitfield " });
    expect(r.ok && r.value.vendorName).toBe("Dana Whitfield");
  });
  it("requires an existing category, a location, and a name unless looking for one", () => {
    expect(validateSuggestion({ ...base, category: "PLUMBER" }).ok).toBe(false);
    expect(validateSuggestion({ ...base, location: "" }).ok).toBe(false);
    expect(validateSuggestion({ ...base, vendorName: "", company: "" }).ok).toBe(false);
    expect(validateSuggestion({ ...base, vendorName: "", company: "", relation: "LOOKING" }).ok).toBe(true);
    expect(validateSuggestion({ ...base, relation: "FRIEND" }).ok).toBe(false);
    expect(validateSuggestion({ ...base, website: "not a site" }).ok).toBe(false);
  });
});

describe("status", () => {
  it("moves with the referral code and the application", () => {
    expect(deriveSuggestionStatus({ status: "IN_REVIEW", inviteCodeId: null, application: null })).toBe("IN_REVIEW");
    expect(deriveSuggestionStatus({ status: "IN_REVIEW", inviteCodeId: "c", application: null })).toBe("LINK_SENT");
    expect(deriveSuggestionStatus({ status: "LINK_SENT", inviteCodeId: "c", application: { status: "IN_REVIEW" } })).toBe("APPLIED");
    expect(deriveSuggestionStatus({ status: "APPLIED", inviteCodeId: "c", application: { status: "PAYMENT_DUE" } })).toBe("APPLIED");
    expect(deriveSuggestionStatus({ status: "APPLIED", inviteCodeId: "c", application: { status: "APPROVED" } })).toBe("VERIFIED");
    expect(deriveSuggestionStatus({ status: "DECLINED", inviteCodeId: "c", application: { status: "APPROVED" } })).toBe("DECLINED");
  });
  it("only counts a recorded paid payment", () => {
    expect(vendorIsPaying({ paymentStatus: "PAID", paidAt: new Date() })).toBe(true);
    expect(vendorIsPaying({ paymentStatus: "WAIVED", paidAt: null })).toBe(false);
    expect(vendorIsPaying(null)).toBe(false);
  });
});

describe("dues credit", () => {
  it("is one month for dues-paying roles and recognition for $0 roles", () => {
    expect(creditFor({ role: "GENERAL_CONTRACTOR", duesCents: 19_900 })).toEqual({ cents: 19_900, status: "AVAILABLE" });
    for (const role of ["DEVELOPER", "LENDER", "INVESTOR_PE", "FAMILY_OFFICE"]) expect(creditFor({ role, duesCents: 0 })).toEqual({ cents: 0, status: "RECOGNITION" });
  });
  it("takes the next charge to zero", () => {
    expect(nextChargeAfterCredits(19_900, [{ status: "AVAILABLE", cents: 19_900 }])).toEqual({ cents: 0, creditCents: 19_900 });
    expect(nextChargeAfterCredits(19_900, [{ status: "APPLIED", cents: 19_900 }])).toEqual({ cents: 19_900, creditCents: 0 });
  });
  beforeEach(() => {
    db.credits = [];
    db.notifications = [];
  });
  it("is granted once per suggestion (idempotent)", async () => {
    expect(await grantSuggestionCredit("s1")).toBe("granted");
    expect(await grantSuggestionCredit("s1")).toBe("exists");
    expect(await grantSuggestionCredit("s1")).toBe("exists");
    expect(db.credits).toHaveLength(1);
    expect(db.credits[0]).toMatchObject({ userId: "m1", cents: 19_900, status: "AVAILABLE" });
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].body).toContain("$199");
  });
});

describe("demand by category", () => {
  it("groups category and state, skipping declined", () => {
    expect(demandArea("Austin, TX")).toBe("Texas");
    expect(demandArea("Denver, Colorado")).toBe("Colorado");
    const rows = demandByCategory([
      { category: "MEP_ENGINEER", location: "Austin, TX", status: "IN_REVIEW" },
      { category: "MEP_ENGINEER", location: "Dallas, tx", status: "LINK_SENT" },
      { category: "MEP_ENGINEER", location: "Houston, TX", status: "DECLINED" },
      { category: "TITLE_COMPANY", location: "Denver, CO", status: "IN_REVIEW" },
    ]);
    expect(rows[0]).toMatchObject({ label: "MEP engineer", area: "Texas", count: 2 });
    expect(rows).toHaveLength(2);
  });
});

describe("copy", () => {
  it("translates every member-facing label in ES, DE and JA", () => {
    for (const key of [...Object.values(STATUS_LABEL), ...Object.values(RELATION_LABEL), "Suggest a vendor", "Your suggestions"]) {
      const v = PHRASES[key];
      expect(v, key).toBeDefined();
      expect(v.every((x) => x.trim().length > 0)).toBe(true);
    }
  });
  it("never uses banned words", () => {
    const files = [
      "src/app/(app)/suggest/page.tsx",
      "src/app/(app)/admin/vendor-suggestions/page.tsx",
      "src/components/suggest-vendor-form.tsx",
      "src/components/vendor-suggestion-actions.tsx",
      "src/components/dues-credits.tsx",
      "src/components/referral-recognition.tsx",
    ];
    for (const file of files) {
      const visible = readFileSync(file, "utf8").replace(/inviteCode\w*/g, "");
      expect(BANNED_WORDS.test(visible), file).toBe(false);
    }
    for (const [k, v] of Object.entries(VENDOR_PHRASES)) for (const s of [k, ...v]) expect(BANNED_WORDS.test(s), s).toBe(false);
    const n = vendorSuggestionAdminNotice({ base: "https://x", suggestionId: "s", memberName: "M", vendor: "V", company: "C", category: "MEP engineer", location: "Austin, TX", relation: "Worked with them", nameOk: true });
    expect(BANNED_WORDS.test(n.subject + n.text + n.alert.body)).toBe(false);
    expect(n.alert.href).toBe("/admin/vendor-suggestions");
  });
});
