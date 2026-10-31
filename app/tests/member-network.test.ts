import { describe, expect, it } from "vitest";
import { documentVersion, readLegalMarkdown } from "@/lib/legal";
import {
  canMessageAfterIntro,
  checklistProgress,
  directoryMatch,
  documentListEntry,
  flagPostLanguage,
  intentsForRole,
  memberBadgeLabel,
  postIsPublic,
  postNeedsRulesAck,
} from "@/lib/member-network";

describe("seeking and raising rules", () => {
  it("holds securities language and percent returns", () => {
    expect(flagPostLanguage("Looking for a GC in Texas")).toBeNull();
    expect(flagPostLanguage("Target IRR is attractive")).toBe("IRR");
    expect(flagPostLanguage("We are offering an 18% return")).toBe("a percent return");
    expect(flagPostLanguage("Accredited investors only")).toBe("accredited");
    expect(flagPostLanguage("Past performance is not a guide")).toBe("past performance");
    expect(flagPostLanguage("See the offering memorandum")).toBe("offering memorandum");
  });

  it("requires an acknowledgement for seeking and raising posts", () => {
    expect(postNeedsRulesAck("DEAL")).toBe(true);
    expect(postNeedsRulesAck("SEEKING")).toBe(true);
    expect(postNeedsRulesAck("NORMAL")).toBe(false);
    expect(documentVersion(readLegalMarkdown("seeking-raising.md"))).toMatch(/draft/);
    expect(documentVersion(readLegalMarkdown("deal-room-nda.md"))).toMatch(/draft/);
  });

  it("matches a post to the author's role", () => {
    expect(intentsForRole("DEVELOPER").map((item) => item.id)).toContain("raising-equity");
    expect(intentsForRole("GENERAL_CONTRACTOR").every((item) => item.kind === "SEEKING")).toBe(true);
    expect(intentsForRole("LENDER").some((item) => item.id === "lender-offering-debt")).toBe(true);
  });
});

describe("member directory and checklist", () => {
  const member = {
    role: "DEVELOPER",
    location: "Austin, TX",
    markets: "TX, CO",
    dealTypes: "Equity, Development",
    assetClasses: "Multifamily",
    name: "Dana Testfloor",
    org: "TEST Floor Development",
    bio: "Ground-up work",
  };

  it("filters by role, state, deal type, and asset class without using contact fields", () => {
    expect(directoryMatch(member, { role: "DEVELOPER", state: "TX", dealType: "Equity", assetClass: "Multifamily" })).toBe(true);
    expect(directoryMatch(member, { state: "NJ" })).toBe(false);
    expect(directoryMatch(member, { q: "testfloor" })).toBe(true);
    expect(directoryMatch(member, { role: "LENDER" })).toBe(false);
  });

  it("completes profile, posts, and introductions from activity", () => {
    const open = checklistProgress({ markets: "", lookingFor: "", offering: "", postCount: 0, introCount: 0, manual: "" });
    expect(open.every((item) => !item.done)).toBe(true);
    const done = checklistProgress({
      markets: "TX",
      lookingFor: "Equity",
      offering: "",
      postCount: 1,
      introCount: 1,
      manual: "directory,guidelines",
    });
    expect(done.every((item) => item.done)).toBe(true);
  });

  it("shows only the two member-facing verification labels", () => {
    expect(memberBadgeLabel(true)).toBe("Verified");
    expect(memberBadgeLabel(false)).toBe("Verification in progress");
  });
});

describe("introductions, posts, and deal documents", () => {
  it("opens messaging only after an introduction or connection is accepted", () => {
    expect(canMessageAfterIntro({ intro: "PENDING", connection: null })).toBe(false);
    expect(canMessageAfterIntro({ intro: "ACCEPTED", connection: null })).toBe(true);
    expect(canMessageAfterIntro({ intro: null, connection: "ACCEPTED" })).toBe(true);
  });

  it("hides closed, expired, and unreviewed posts", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    expect(postIsPublic({ status: "PUBLISHED", now })).toBe(true);
    expect(postIsPublic({ status: "PENDING_REVIEW", now })).toBe(false);
    expect(postIsPublic({ status: "PUBLISHED", closedAt: now, now })).toBe(false);
    expect(postIsPublic({ status: "PUBLISHED", expiresAt: new Date("2026-10-01T00:00:00Z"), now })).toBe(false);
  });

  it("accepts a small PDF and refuses other files", () => {
    expect(documentListEntry({ fileName: "plan.pdf", contentType: "application/pdf", sizeBytes: 1000 }).ok).toBe(true);
    expect(documentListEntry({ fileName: "notes.txt", contentType: "text/plain", sizeBytes: 1000 }).ok).toBe(false);
    expect(documentListEntry({ fileName: "big.pdf", contentType: "application/pdf", sizeBytes: 9 * 1024 * 1024 }).ok).toBe(false);
  });
});
