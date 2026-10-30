import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PHRASES } from "@/lib/i18n/phrases";
import { DEAL_ROOM_REASON, canRequestDealRoom, dealSeekingCategories, projectAudienceIds } from "@/lib/project-contact";
import { projectDocumentEmail } from "@/lib/project-review-email";

const ROOT = path.join(__dirname, "..", "src");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe("deal-room access follows the contact rule", () => {
  it("derives what a deal room seeks from its need, role and linked project", () => {
    expect(dealSeekingCategories({ need: "equity", roleNeeded: null })).toEqual(["EQUITY"]);
    expect(dealSeekingCategories({ need: "debt", roleNeeded: null })).toEqual(["FINANCING"]);
    expect(dealSeekingCategories({ need: "", roleNeeded: "GENERAL_CONTRACTOR" })).toEqual(["GENERAL_CONTRACTOR"]);
    expect(dealSeekingCategories({ need: "equity", roleNeeded: null, projectSeeking: "ARCHITECT_ENGINEER" })).toEqual(["EQUITY", "ARCHITECT_ENGINEER"]);
    expect(dealSeekingCategories({ need: "", roleNeeded: null })).toEqual([]);
  });
  it("members in a sought category can request; others cannot unless already related", () => {
    const categories = ["EQUITY"];
    expect(canRequestDealRoom({ categories, requesterRole: "FAMILY_OFFICE", related: false }).ok).toBe(true);
    expect(canRequestDealRoom({ categories, requesterRole: "INVESTOR_PE", related: false }).ok).toBe(true);
    expect(canRequestDealRoom({ categories, requesterRole: "LENDER", related: false })).toEqual({ ok: false, reason: DEAL_ROOM_REASON });
    expect(canRequestDealRoom({ categories, requesterRole: "LENDER", related: true }).ok).toBe(true);
    expect(canRequestDealRoom({ categories: [], requesterRole: "LENDER", related: false }).ok).toBe(false);
  });
  it("is enforced in the server action and shown on the deal page", () => {
    const action = read("actions/deals.ts");
    expect(action).toMatch(/const room = await dealRoomRule\(deal, user\);\n\s+if \(!room\.ok\) redirect/);
    expect(read("lib/deal-room-rule.ts")).toMatch(/canMessagePair\(user\.id, deal\.sponsorId\)/);
    expect(read("app/(app)/deals/[id]/page.tsx")).toContain("deal-room-rule");
    expect(PHRASES[DEAL_ROOM_REASON]).toHaveLength(3);
  });
});

describe("project documents", () => {
  it("everyone involved: accepted contacts, circle when shared, deal-room members; never the owner, each once", () => {
    const base = { ownerId: "o", acceptedContacts: [{ fromId: "a", toId: "o" }, { fromId: "o", toId: "b" }], circle: ["c", "a"], dealMembers: ["d", "o"] };
    expect(projectAudienceIds({ ...base, shareWithCircle: true })).toEqual(["a", "b", "c", "d"]);
    expect(projectAudienceIds({ ...base, shareWithCircle: false })).toEqual(["a", "b", "d"]);
  });
  it("changing documents never touches review status or the locked project fields", () => {
    const actions = read("actions/projects.ts");
    const docs = actions.slice(actions.indexOf("export async function addProjectDocument"), actions.indexOf("export async function linkProjectDeal"));
    expect(docs).not.toMatch(/reviewStatus:/);
    expect(docs).not.toMatch(/trackProject\.update/);
    expect(docs.match(/announceDocumentChange\(/g)?.length).toBe(3);
    expect(actions).toMatch(/if \(project\.reviewStatus !== "APPROVED"\) return 0;/);
    expect(actions).toMatch(/await notify\(person\.id/);
    expect(actions).toMatch(/await sendEmail\(\{ to: person\.email/);
  });
  it("the download checks access", () => {
    expect(read("app/api/project-documents/[id]/route.ts")).toMatch(/canViewProjectDocuments\(doc\.projectId, viewer\)/);
  });
  it("emails the update in the member's language", () => {
    const base = { ownerName: "Marcus Hale", projectName: "Ironbound Lofts", documentTitle: "Rent roll", link: "https://x/p" };
    const en = projectDocumentEmail({ ...base, locale: "en", change: "replaced" });
    expect(en.subject).toBe("Project update: Ironbound Lofts");
    expect(en.text).toContain("Marcus Hale replaced a document: “Rent roll”.");
    expect(projectDocumentEmail({ ...base, locale: "es", change: "added" }).subject).toBe("Actualización del proyecto: Ironbound Lofts");
    expect(projectDocumentEmail({ ...base, locale: "de", change: "removed" }).text).toContain("hat ein Dokument entfernt");
    expect(projectDocumentEmail({ ...base, locale: "ja", change: "added" }).text).toContain("書類を追加しました");
  });
  it("every new phrase is translated", () => {
    const strings = new Set<string>();
    for (const file of ["components/project-documents.tsx", "lib/project-review-email.ts"]) {
      for (const match of read(file).matchAll(/\b(?:tx|p)\("((?:[^"\\]|\\.)+)"\)/g)) strings.add(match[1]);
    }
    for (const match of read("actions/projects.ts").matchAll(/go\(back, "(?:error|notice)", "([^"]+)"\)/g)) strings.add(match[1]);
    expect([...strings].filter((text) => !PHRASES[text])).toEqual([]);
  });
});
