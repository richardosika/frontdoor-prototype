import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { profileFacts } from "@/lib/bids-db";
import { MEMBER_TOPICS } from "@/lib/help/member-knowledge";
import { PHRASES } from "@/lib/i18n/phrases";

const legacyInsurance = {
  insuranceCoverage: [{ type: "GL", limit: 2_000_000 }],
  insuranceInfo: "Legacy insurance note",
  credentialNote: "License on file",
};

describe("bidder insurance facts", () => {
  it.each([
    { role: "GENERAL_CONTRACTOR" },
    { role: "DEVELOPER", extraCategories: "BROKER,SUBCONTRACTOR" },
  ])("uses only dated policies for a covered member with %o", (member) => {
    const user = { ...legacyInsurance, ...member };

    expect(profileFacts({
      ...user,
      insurancePolicies: [
        { type: "GL", otherName: "", expiresOn: new Date("2099-01-01"), limitAmount: 1_000_000, aggregateAmount: 3_000_000 },
        { type: "OTHER", otherName: "Cyber", expiresOn: new Date("2000-01-01"), limitAmount: 500_000, aggregateAmount: 0 },
      ],
    })).toEqual({
      insurance: "General liability · $1M / $3M · Current; Cyber · $500K · Expired",
      license: "License on file",
    });

    expect(profileFacts({ ...user, insurancePolicies: [] }).insurance).toBe("");
  });

  it("keeps coverage and the insurance note fallback for a non-covered member", () => {
    const user = { ...legacyInsurance, role: "DEVELOPER", extraCategories: "BROKER" };

    expect(profileFacts(user).insurance).toBe("General liability $2M");
    expect(profileFacts({ ...user, insuranceCoverage: [] }).insurance).toBe(legacyInsurance.insuranceInfo);
  });
});

describe("insurance help and translations", () => {
  const article = MEMBER_TOPICS.find(({ id }) => id === "insurance")!;

  it.each([
    ["en", "Only you and Private Floor staff", /developers? see/i],
    ["es", "Solo usted y el personal de Private Floor", /desarrolladores ven/i],
    ["de", "Nur Sie und das Private-Floor-Team", /Entwickler sehen/i],
    ["ja", "ご本人とPrivate Floorのスタッフだけ", /デベロッパーには/],
  ] as const)("describes who can see private insurance details in %s", (locale, visibility, oldSummary) => {
    const body = article.body[locale];
    expect(body).toContain(visibility);
    expect(body).toContain("](/profile)");
    expect(body).not.toMatch(oldSummary);
    expect(body).not.toMatch(/\b(?:invite(?:d|-only)?|founding member|limited)\b/i);
  });

  it("drops obsolete certificate phrases and keeps the insurance role specialty label", () => {
    expect(PHRASES).not.toHaveProperty([
      "PDF, JPG or PNG up to 10 MB. Only you, Private Floor staff and general contractor members can open it; other members see that it is on file.",
    ]);
    expect(PHRASES).not.toHaveProperty("View insurance certificate");
    expect(PHRASES).toHaveProperty("Coverage lines");
  });
});
