import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROJECT_OWNER_ROLES, canSeekOnProject } from "../src/lib/project-seeking";
import { opportunityOwnerRoles, subCanSee } from "../src/lib/sub-access";
import { canRequestBids } from "../src/lib/bids";
import { canCreateDealRoom } from "../src/lib/deal-room-access";
import { NOV16_PHRASES } from "../src/lib/i18n/nov16-phrases";

const owners = ["DEVELOPER", "GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER", "INVESTOR_PE", "FAMILY_OFFICE"];
const sub = { role: "SUBCONTRACTOR" };
const phrase = "Staff review each project. Once it is approved, open it from Your projects to request bids from members on it.";

describe("Nov 16 project owners", () => {
  it("allows exactly the five project owner roles to seek members", () => {
    expect(PROJECT_OWNER_ROLES).toEqual(owners);
    for (const role of owners) expect(canSeekOnProject(role), role).toBe(true);
    for (const role of ["LENDER", "SUBCONTRACTOR", "INSURANCE", null, undefined]) {
      expect(canSeekOnProject(role), String(role)).toBe(false);
    }
  });

  it("shows investor and family office opportunities to non-subs while preserving sub access", () => {
    expect(opportunityOwnerRoles({ role: "GENERAL_CONTRACTOR" })).toEqual(["DEVELOPER", "INVESTOR_PE", "FAMILY_OFFICE"]);
    expect(opportunityOwnerRoles(sub)).toEqual(["GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER"]);
    for (const role of ["DEVELOPER", "INVESTOR_PE", "FAMILY_OFFICE"]) {
      expect(subCanSee(sub, { role }), role).toBe(false);
    }
  });

  it("allows every owner to request bids without expanding Deal Room creation", () => {
    for (const role of owners) {
      expect(canRequestBids({ viewerId: role, ownerId: role, audience: [] }), role).toBe(true);
    }
    expect(canCreateDealRoom("INVESTOR_PE")).toBe(false);
    expect(canCreateDealRoom("FAMILY_OFFICE")).toBe(false);
    const page = readFileSync("src/app/(app)/projects/[id]/page.tsx", "utf8");
    expect(page).toContain('project.reviewStatus === "APPROVED" && !viewer.isAdmin && canRequestBids(');
    expect(page).toContain('isGc={isGeneralContractor(viewer)}');
    expect(page).toContain('{isGc ? <Link href={`/bids/trade/new?project=${projectId}`}');
  });

  it("renders the new hint through tx with Spanish, German and Japanese translations", () => {
    expect(readFileSync("src/components/ledger-projects.tsx", "utf8")).toContain(`tx("${phrase}")`);
    expect(NOV16_PHRASES[phrase]).toHaveLength(3);
    for (const translation of NOV16_PHRASES[phrase]) {
      expect(translation.trim().length).toBeGreaterThan(0);
      expect(translation).not.toBe(phrase);
    }
  });
});
