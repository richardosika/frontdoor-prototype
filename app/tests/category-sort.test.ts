import { describe, expect, it } from "vitest";
import { sortByShownLabel } from "@/lib/category-sort";
import { phrase } from "@/lib/i18n/phrases";
import { JOIN_ROLES } from "@/lib/join-form";
import type { Locale } from "@/lib/i18n/messages";

describe("Nov 6: category drop-down A–Z in the shown language", () => {
  for (const locale of ["en", "es", "de", "ja"] as Locale[]) {
    it(`${locale}: sorted, Other Deal Professionals last`, () => {
      const sorted = sortByShownLabel(JOIN_ROLES, (r) => phrase(locale, r.label), locale, (r) => r.id);
      expect(sorted.at(-1)!.id).toBe("OTHER_PROFESSIONAL");
      expect(sorted).toHaveLength(JOIN_ROLES.length);
      if (locale === "en") {
        const labels = sorted.slice(0, -1).map((r) => r.label);
        expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })));
        expect(labels.indexOf("Architects")).toBeLessThan(labels.indexOf("Developers"));
      }
    });
  }
  it("ja sorts kanji names by reading", () => {
    const sorted = sortByShownLabel(JOIN_ROLES, (r) => phrase("ja", r.label), "ja", (r) => r.id).map((r) => phrase("ja", r.label));
    expect(sorted.indexOf("建築家")).toBeLessThan(sorted.indexOf("ゼネコン"));
    expect(sorted.indexOf("ゼネコン")).toBeLessThan(sorted.indexOf("デベロッパー"));
  });
});
