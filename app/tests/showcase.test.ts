import { describe, expect, it } from "vitest";
import { PLATFORM_TEST_MEMBERS } from "@/lib/platform/roster";
import {
  findVendorLabel,
  inVendorShowcase,
  licencePublicLabel,
  licenceRecheckOn,
  publicCredentials,
  publicLicences,
  publicProjects,
  referenceDisplay,
  showcaseResults,
  vendorSearchHref,
  type ShowcaseVendor,
} from "@/lib/platform/showcase";
const now = new Date("2026-10-28T12:00:00Z");
const year = 365 * 24 * 60 * 60 * 1000;

function vendor(partial: Partial<ShowcaseVendor> & Pick<ShowcaseVendor, "id" | "name" | "role">): ShowcaseVendor {
  return {
    initials: "TV",
    org: "TEST Org",
    bio: "",
    location: "",
    markets: "",
    dealTypes: "",
    assetClasses: "",
    checkSize: "",
    lookingFor: "",
    offering: "",
    nationwide: false,
    homeCity: "",
    homeState: "",
    homeMetro: "",
    operateStates: [],
    operateMetros: [],
    operateCounties: [],
    assetSlugs: [],
    specialtySlugs: [],
    verified: true,
    createdAt: now,
    completeness: 1,
    showcaseStatus: "LISTED",
    availability: "OPEN",
    headline: "",
    ...partial,
  };
}

describe("vendor showcase eligibility", () => {
  it("lists a vendor only when the membership file is verified and the listing is approved", () => {
    expect(inVendorShowcase({ role: "GENERAL_CONTRACTOR", showcaseStatus: "LISTED", verified: true })).toBe(true);
    expect(inVendorShowcase({ role: "GENERAL_CONTRACTOR", showcaseStatus: "LISTED", verified: false })).toBe(false);
    expect(inVendorShowcase({ role: "GENERAL_CONTRACTOR", showcaseStatus: "PENDING", verified: true })).toBe(false);
    expect(inVendorShowcase({ role: "DEVELOPER", showcaseStatus: "LISTED", verified: true })).toBe(false);
    const rows = showcaseResults(
      [
        vendor({ id: "listed", name: "TEST Listed", role: "GENERAL_CONTRACTOR", homeState: "TX", homeMetro: "19100", verified: true }),
        vendor({ id: "progress", name: "TEST Progress", role: "GENERAL_CONTRACTOR", homeState: "AZ", verified: false }),
        vendor({ id: "waiting", name: "TEST Waiting", role: "GENERAL_CONTRACTOR", showcaseStatus: "PENDING", verified: true }),
      ],
      { role: "GENERAL_CONTRACTOR" },
    );
    expect(rows.map((row) => row.id)).toEqual(["listed"]);
  });

  it("labels self-reported licences and keeps the number off the public chip", () => {
    const self = {
      kind: "CONTRACTOR",
      stateCode: "AZ",
      scope: "General",
      status: "SELF_REPORTED",
      expiresOn: null,
      verifiedAt: null,
      recheckOn: null,
      showOnProfile: true,
      number: "TEST-SECRET",
    };
    expect(licencePublicLabel(self, now)).toBe("Listed by member");
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    const verified = { ...self, status: "VERIFIED", verifiedAt, recheckOn: licenceRecheckOn(verifiedAt), number: "TEST-SECRET" };
    expect(licencePublicLabel(verified, now)).toBe("Verified");
    expect(licenceRecheckOn(verifiedAt).getTime() - verifiedAt.getTime()).toBe(year);
    const expired = { ...verified, recheckOn: new Date("2026-02-01T00:00:00Z") };
    expect(licencePublicLabel(expired, now)).toBe("Listed by member");
    const chips = publicLicences([self, verified], now);
    expect(JSON.stringify(chips)).not.toContain("TEST-SECRET");
    expect(chips.find((chip) => chip.stateCode === "TX" || chip.label === "Verified")?.label).toBe("Verified");
  });

  it("hides credential evidence and names a reference only with consent", () => {
    const credentials = publicCredentials([
      { kind: "INSURANCE", label: "Liability", issuer: "TEST Carrier", verifiedAt: now, visible: true, evidenceUrl: "https://secret.example/file" },
    ]);
    expect(JSON.stringify(credentials)).not.toContain("secret.example");
    expect(referenceDisplay({ status: "CONFIRMED", reviewStatus: "APPROVED", showName: true, counterpartyName: "TEST Counterparty" }).named).toBe("TEST Counterparty");
    expect(referenceDisplay({ status: "CONFIRMED", reviewStatus: "APPROVED", showName: false, counterpartyName: "TEST Counterparty" })).toEqual({
      named: null,
      unnamed: true,
    });
    expect(referenceDisplay({ status: "CONFIRMED", reviewStatus: "OPEN", showName: true, counterpartyName: "TEST Counterparty" }).unnamed).toBe(false);
    const projects = publicProjects([
      {
        name: "TEST Yard",
        location: "Dallas, TX",
        year: 2024,
        asset: "Multifamily",
        inShowcase: true,
        confirmations: [
          { status: "CONFIRMED", reviewStatus: "APPROVED", showName: false, counterpartyName: "Hidden Name" },
        ],
      },
    ]);
    expect(projects[0]?.unnamedReferences).toBe(1);
    expect(JSON.stringify(projects)).not.toContain("Hidden Name");
    expect(JSON.stringify(projects)).not.toMatch(/grade|score|stars/);
  });

  it("pre-fills a deal search and keeps booked vendors in the list", () => {
    expect(vendorSearchHref({ role: "GENERAL_CONTRACTOR", state: "TX", asset: "Multifamily" })).toBe(
      "/vendors?role=GENERAL_CONTRACTOR&state=TX&assetClass=Multifamily",
    );
    expect(findVendorLabel("GENERAL_CONTRACTOR")).toBe("Find a GC");
    expect(findVendorLabel("RE_ATTORNEY")).toBe("Find an attorney");
    const rows = showcaseResults(
      [
        vendor({ id: "open", name: "TEST Open", role: "BROKER", availability: "OPEN", homeState: "FL", homeMetro: "33100" }),
        vendor({ id: "booked", name: "TEST Booked", role: "BROKER", availability: "BOOKED", homeState: "FL", homeMetro: "33100" }),
      ],
      { role: "BROKER", state: "FL" },
    );
    expect(rows.map((row) => row.id)).toContain("booked");
    expect(rows[0]?.id).toBe("open");
  });
});

describe("TEST vendor roster", () => {
  it("places TEST vendors in more than one market", () => {
    const vendors = PLATFORM_TEST_MEMBERS.filter((member) => member.vendor);
    expect(vendors.every((member) => member.name.startsWith("TEST ") && member.email.endsWith("@platform-test.example"))).toBe(true);
    expect(new Set(vendors.map((member) => member.homeState)).size).toBeGreaterThanOrEqual(3);
    expect(vendors.some((member) => member.vendor?.listed && member.vendor.verified)).toBe(true);
    expect(vendors.some((member) => member.vendor && !member.vendor.verified)).toBe(true);
    expect(vendors.some((member) => member.vendor?.verified && !member.vendor.listed)).toBe(true);
  });
});
