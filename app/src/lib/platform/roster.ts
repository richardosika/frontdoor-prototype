import type { MemberRole } from "@prisma/client";
import { PLATFORM_TEST_EMAIL_DOMAIN } from "@/lib/platform/catalog";

export type PlatformTestMember = {
  email: string;
  name: string;
  initials: string;
  role: MemberRole;
  org: string;
  location: string;
  homeCity: string;
  homeState: string;
  homeMetro: string;
  operateStates: string[];
  nationwide: boolean;
  assetSlug: string;
  specialtySlug?: string;
  checkSize: string;
  bio: string;
  vendor?: {
    listed: boolean;
    verified: boolean;
    headline: string;
    availability: "OPEN" | "SELECTIVE" | "BOOKED";
    licenceStatus: "SELF_REPORTED" | "VERIFIED";
    licenceKind: "CONTRACTOR" | "BAR_ADMISSION" | "BROKER" | "FACILITY_OPERATOR";
  };
};

/** QA members for the directory. Names and companies start with TEST so cleanup can remove them. */
export const PLATFORM_TEST_MEMBERS: PlatformTestMember[] = [
  {
    email: `gc.phoenix@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Phoenix GC",
    initials: "TP",
    role: "GENERAL_CONTRACTOR",
    org: "TEST Platform Storage Build",
    location: "Phoenix, AZ",
    homeCity: "Phoenix",
    homeState: "AZ",
    homeMetro: "38060",
    operateStates: ["AZ"],
    nationwide: false,
    assetSlug: "self-storage",
    specialtySlug: "storage-builder",
    checkSize: "1-5",
    bio: "TEST member. Storage builder based in Phoenix.",
    vendor: {
      listed: false,
      verified: false,
      headline: "TEST storage builder in Phoenix",
      availability: "OPEN",
      licenceStatus: "SELF_REPORTED",
      licenceKind: "CONTRACTOR",
    },
  },
  {
    email: `dev.austin@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Austin Dev",
    initials: "TA",
    role: "DEVELOPER",
    org: "TEST Platform Hotels",
    location: "Austin, TX",
    homeCity: "Austin",
    homeState: "TX",
    homeMetro: "12420",
    operateStates: ["TX"],
    nationwide: false,
    assetSlug: "select-service-hotel",
    checkSize: "5+",
    bio: "TEST member. Hotel developer based in Austin.",
  },
  ...[1, 2, 3, 4, 5].map((index) => ({
    email: `dev.dallas.${index}@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: `TEST Platform Dallas ${index}`,
    initials: "TD",
    role: "DEVELOPER" as const,
    org: "TEST Platform Multifamily",
    location: "Dallas, TX",
    homeCity: "Dallas",
    homeState: "TX",
    homeMetro: "19100",
    operateStates: [],
    nationwide: false,
    assetSlug: "multifamily",
    checkSize: "1-5",
    bio: "TEST member. Multifamily developer based in Dallas.",
  })),
  {
    email: `lender.national@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform National Lender",
    initials: "TL",
    role: "LENDER",
    org: "TEST Platform Credit",
    location: "Chicago, IL",
    homeCity: "Chicago",
    homeState: "IL",
    homeMetro: "16980",
    operateStates: [],
    nationwide: true,
    assetSlug: "multifamily",
    checkSize: "5+",
    bio: "TEST member. Lender who works nationwide.",
  },
  {
    email: `operator.senior@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Senior Operator",
    initials: "TS",
    role: "PROPERTY_MANAGER",
    org: "TEST Platform Senior Living",
    location: "Phoenix, AZ",
    homeCity: "Phoenix",
    homeState: "AZ",
    homeMetro: "38060",
    operateStates: ["AZ"],
    nationwide: false,
    assetSlug: "memory-care",
    specialtySlug: "senior-living-operator",
    checkSize: "1-5",
    bio: "TEST member. Senior-living operator. Listed by the member until a file is checked.",
    vendor: {
      listed: true,
      verified: true,
      headline: "TEST senior-living operator in Phoenix",
      availability: "SELECTIVE",
      licenceStatus: "SELF_REPORTED",
      licenceKind: "FACILITY_OPERATOR",
    },
  },
  {
    email: `gc.dallas@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Dallas GC",
    initials: "TG",
    role: "GENERAL_CONTRACTOR",
    org: "TEST Platform Dallas Build",
    location: "Dallas, TX",
    homeCity: "Dallas",
    homeState: "TX",
    homeMetro: "19100",
    operateStates: ["TX"],
    nationwide: false,
    assetSlug: "multifamily",
    specialtySlug: "multifamily-gc",
    checkSize: "5+",
    bio: "TEST member. General contractor based in Dallas.",
    vendor: {
      listed: true,
      verified: true,
      headline: "TEST multifamily builder in Dallas",
      availability: "OPEN",
      licenceStatus: "VERIFIED",
      licenceKind: "CONTRACTOR",
    },
  },
  {
    email: `attorney.austin@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Austin Attorney",
    initials: "TT",
    role: "RE_ATTORNEY",
    org: "TEST Platform Austin Law",
    location: "Austin, TX",
    homeCity: "Austin",
    homeState: "TX",
    homeMetro: "12420",
    operateStates: ["TX"],
    nationwide: false,
    assetSlug: "hospitality",
    specialtySlug: "hospitality-attorney",
    checkSize: "1-5",
    bio: "TEST member. Attorney based in Austin.",
    vendor: {
      listed: true,
      verified: true,
      headline: "TEST hospitality attorney in Austin",
      availability: "OPEN",
      licenceStatus: "VERIFIED",
      licenceKind: "BAR_ADMISSION",
    },
  },
  {
    email: `gc.chicago@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Chicago GC",
    initials: "TC",
    role: "GENERAL_CONTRACTOR",
    org: "TEST Platform Chicago Build",
    location: "Chicago, IL",
    homeCity: "Chicago",
    homeState: "IL",
    homeMetro: "16980",
    operateStates: [],
    nationwide: false,
    assetSlug: "industrial",
    checkSize: "5+",
    bio: "TEST member. General contractor based in Chicago. Showcase waiting for review.",
    vendor: {
      listed: false,
      verified: true,
      headline: "TEST industrial builder in Chicago",
      availability: "BOOKED",
      licenceStatus: "SELF_REPORTED",
      licenceKind: "CONTRACTOR",
    },
  },
  {
    email: `broker.miami@${PLATFORM_TEST_EMAIL_DOMAIN}`,
    name: "TEST Platform Miami Broker",
    initials: "TM",
    role: "BROKER",
    org: "TEST Platform Miami Brokerage",
    location: "Miami, FL",
    homeCity: "Miami",
    homeState: "FL",
    homeMetro: "33100",
    operateStates: ["FL"],
    nationwide: false,
    assetSlug: "self-storage",
    specialtySlug: "storage-broker",
    checkSize: "1-5",
    bio: "TEST member. Broker based in Miami.",
    vendor: {
      listed: true,
      verified: true,
      headline: "TEST storage broker in Miami",
      availability: "OPEN",
      licenceStatus: "VERIFIED",
      licenceKind: "BROKER",
    },
  },
];

export function rosterIsClearlyTest(member: PlatformTestMember): boolean {
  return (
    member.name.startsWith("TEST ") &&
    member.org.startsWith("TEST ") &&
    member.email.endsWith(`@${PLATFORM_TEST_EMAIL_DOMAIN}`) &&
    member.bio.startsWith("TEST ")
  );
}
