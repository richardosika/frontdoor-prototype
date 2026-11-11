import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCESS_MODES, DEAL_ROOM_DOC_MAX_BYTES, DOC_KINDS, accessModeOf, canCreateDealRoom, choosesAccessMode } from "@/lib/deal-room-access";
import { phrase } from "@/lib/i18n/phrases";

const read = (f: string) => readFileSync(`src/${f}`, "utf8");

describe("Nov 10: Deal Rooms", () => {
  it("developers, GCs, architects and engineers can create one; other vendors cannot", () => {
    for (const r of ["DEVELOPER", "GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER", "CIVIL_ENGINEER", "STRUCTURAL_ENGINEER", "MEP_ENGINEER", "GEOTECH_ENGINEER"]) expect(canCreateDealRoom(r)).toBe(true);
    for (const r of ["SUBCONTRACTOR", "LENDER", "INSURANCE", "BROKER", "APPRAISER"]) expect(canCreateDealRoom(r)).toBe(false);
  });
  it("developers and GCs choose Open to Bid or Approval Required (default Approval Required)", () => {
    expect(ACCESS_MODES.map((m) => m.label)).toEqual(["Open to Bid", "Approval Required"]);
    expect(choosesAccessMode("DEVELOPER")).toBe(true);
    expect(choosesAccessMode("GENERAL_CONTRACTOR")).toBe(true);
    expect(choosesAccessMode("ARCHITECT_ENGINEER")).toBe(false);
    expect(accessModeOf({ role: "DEVELOPER", projectAccessMode: "OPEN" })).toBe("OPEN");
    expect(accessModeOf({ role: "DEVELOPER", projectAccessMode: "APPROVAL" })).toBe("APPROVAL");
    expect(accessModeOf({ role: "DEVELOPER" })).toBe("APPROVAL");
    expect(accessModeOf({ role: "ARCHITECT_ENGINEER", projectAccessMode: "OPEN" })).toBe("APPROVAL");
  });
  it("Open to Bid lets qualifying members in at once; Approval Required keeps the owner's approval", () => {
    const deals = read("actions/deals.ts");
    expect(deals).toMatch(/const settled = open \? \{ status: "APPROVED"/);
    expect(deals).toContain("const room = await dealRoomRule(deal, user);");
    const projects = read("actions/projects.ts");
    expect(projects).toMatch(/accessModeOf\(to\) === "OPEN"/);
    expect(projects.indexOf("canContactAboutProject({ project, from")).toBeLessThan(projects.indexOf('accessModeOf(to) === "OPEN"'));
  });
  it("stores the files (construction documents, specs, renderings) and serves them only to the room", () => {
    expect(DEAL_ROOM_DOC_MAX_BYTES).toBe(25 * 1024 * 1024);
    expect(DOC_KINDS.map((k) => k.id)).toEqual(["CONSTRUCTION", "SPECS", "RENDERING", "OTHER"]);
    expect(read("actions/deals.ts")).toMatch(/bytes,\n\s+\},\n\s+\}\);/);
    const route = read("app/api/deal-documents/[id]/route.ts");
    expect(route).toContain("viewer.isAdmin || doc.deal.sponsorId === viewer.id || doc.deal.access.length > 0");
  });
  it("is a section of each project", () => {
    const page = read("app/(app)/projects/[id]/page.tsx");
    expect(page).toContain('data-testid="project-deal-room"');
    expect(page).toContain("canCreateDealRoom(viewer.role)");
  });
  it("migrations only add", () => {
    for (const dir of ["20261110200000_bid_revisions", "20261110210000_opportunity_dismissals", "20261110220000_deal_rooms"]) {
      const sql = readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8").replace(/--.*$/gm, "").replace(/ON (DELETE|UPDATE) CASCADE/g, "");
      expect(sql).not.toMatch(/\b(DROP|RENAME|DELETE|TRUNCATE)\b/i);
      expect(sql).not.toMatch(/ALTER COLUMN/i);
    }
  });
  it("new wording is translated", () => {
    for (const key of ["Deal Room", "Create Deal Room", "Open to Bid", "Approval Required", "Construction documents", "Renderings"]) expect(phrase("ja", key)).not.toBe(key);
  });
});
