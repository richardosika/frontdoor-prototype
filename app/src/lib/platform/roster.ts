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
