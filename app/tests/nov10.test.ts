import { describe, expect, it } from "vitest";
import { MISSING_PASSWORD_ERROR, NO_ACCOUNT_ERROR, STAFF_ACCOUNT_ERROR, WRONG_PASSWORD_ERROR, signInFailureCopy } from "@/lib/sign-in";
import { signInErrorCode, signInErrorFromCode } from "@/lib/sign-in-fallback";
import { referralsLeft } from "@/lib/referrals";
import { isNewOpportunity } from "@/lib/opportunities";
import { sortByShownLabel } from "@/lib/category-sort";
import { PROJECT_ROLE_LABELS } from "@/lib/project-roles";
import { PROJECT_ASSET_CLASSES } from "@/lib/project-contact";
import { NOV10_PHRASES } from "@/lib/i18n/nov10-phrases";
import { phrase } from "@/lib/i18n/phrases";
import { BRAND } from "@/lib/brand";

const base = { memberFound: false, memberPasswordMatches: false, memberActive: false, pendingApplicationPasswordMatches: false };

describe("Nov 10 batch A: sign-in says why", () => {
  it("separates a wrong password from an unknown email", () => {
    expect(signInFailureCopy({ ...base, memberFound: true, memberActive: true })).toBe(WRONG_PASSWORD_ERROR);
    expect(signInFailureCopy({ ...base })).toBe(NO_ACCOUNT_ERROR);
    expect(signInFailureCopy({ ...base, applicationFound: true })).toBe(WRONG_PASSWORD_ERROR);
    expect(signInFailureCopy({ ...base, memberFound: true, memberActive: true, passwordEmpty: true })).toBe(MISSING_PASSWORD_ERROR);
    expect(signInFailureCopy({ ...base, memberFound: true, memberPasswordMatches: true, memberActive: true })).toBeNull();
  });
  it("round-trips the new reasons through the build-independent sign-in post", () => {
    for (const message of [WRONG_PASSWORD_ERROR, NO_ACCOUNT_ERROR, STAFF_ACCOUNT_ERROR, MISSING_PASSWORD_ERROR]) {
      expect(signInErrorFromCode(signInErrorCode(message))).toBe(message);
    }
  });
});

describe("Nov 10 batch A: removals, referrals, New tag, dropdowns", () => {
  it("has no referral cap", () => {
    expect(referralsLeft(0)).toBeGreaterThan(1000);
    expect(referralsLeft(999)).toBeGreaterThan(1000);
  });
  it("tags a project New for 7 days after approval", () => {
    const now = Date.UTC(2026, 10, 10);
    expect(isNewOpportunity({ reviewedAt: new Date(now - 2 * 86400000), submittedAt: new Date(now - 9 * 86400000) }, now)).toBe(true);
    expect(isNewOpportunity({ reviewedAt: new Date(now - 8 * 86400000), submittedAt: new Date(now - 9 * 86400000) }, now)).toBe(false);
    expect(isNewOpportunity({ reviewedAt: null, submittedAt: new Date(now - 86400000) }, now)).toBe(true);
  });
  it("sorts Asset class and Your role on the project A-Z, with Other last", () => {
    const assets = sortByShownLabel(PROJECT_ASSET_CLASSES, (x) => x, "en");
    expect([...assets.filter((a) => a !== "Other")]).toEqual([...assets.filter((a) => a !== "Other")].sort((a, b) => a.localeCompare(b)));
    const roles = sortByShownLabel(PROJECT_ROLE_LABELS, (x) => x, "en");
    expect(roles[roles.length - 1]).toBe("Other");
    expect(roles.slice(0, -1)).toEqual(roles.slice(0, -1).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true })));
    const es = sortByShownLabel(PROJECT_ASSET_CLASSES, (x) => phrase("es", x), "es").map((x) => phrase("es", x)).filter((x) => x !== phrase("es", "Other"));
    expect(es).toEqual([...es].sort(new Intl.Collator("es", { sensitivity: "base", numeric: true }).compare));
  });
});

describe("Nov 10 copy rules", () => {
  it("translates every new phrase into ES, DE and JA", () => {
    for (const [en, [es, de, ja]] of Object.entries(NOV10_PHRASES)) {
      expect(es && de && ja, en).toBeTruthy();
      expect(phrase("ja", en)).toBe(ja);
    }
  });
  it("never uses the forbidden words", () => {
    const all = [BRAND.tagline, ...Object.keys(NOV10_PHRASES), ...Object.values(NOV10_PHRASES).flat()].join("\n");
    expect(all).not.toMatch(/\binvit(e|ed|e-only)\b|founding member|\blimited\b/i);
  });
});
