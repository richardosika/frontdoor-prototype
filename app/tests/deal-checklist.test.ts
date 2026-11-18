import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { STARTER_CHECKLIST, checklistProgress, daysOverdue, filterChecklist, isOverdue, parseDueDate, readChecklistFilter } from "@/lib/deal-checklist";
import { SEEK_CATEGORIES, categoryForRole, isSeekCategory } from "@/lib/project-contact";
import { ROLE_IDS } from "@/lib/roles";
import { PHRASES } from "@/lib/i18n/phrases";

const read = (path: string) => readFileSync(`src/${path}`, "utf8");

describe("#41 categories", () => {
  it("every member role answers a seek category, and surety is its own category", () => {
    for (const role of ROLE_IDS) if (role !== "DEVELOPER") expect(categoryForRole(role)).not.toBeNull();
    expect(categoryForRole("SURETY_BONDING")).toBe("SURETY_BONDING");
    expect(categoryForRole("INSURANCE")).toBe("INSURANCE");
  });
  it("new categories are translated", () => {
    for (const item of SEEK_CATEGORIES) expect(PHRASES[item.label], item.label).toBeTruthy();
  });
});

describe("#41 deal room checklist", () => {
  const now = new Date(Date.UTC(2026, 9, 30, 15));
  const day = (d: number) => new Date(Date.UTC(2026, 9, d, 12));
  it("maps every starter item to a real category", () => {
    for (const item of STARTER_CHECKLIST) expect(isSeekCategory(item.category), item.title).toBe(true);
  });
  it("flags overdue only when past due and not done", () => {
    expect(isOverdue({ status: "NEEDED", dueDate: day(26) }, now)).toBe(true);
    expect(daysOverdue({ dueDate: day(26) }, now)).toBe(4);
    expect(isOverdue({ status: "DONE", dueDate: day(26) }, now)).toBe(false);
    expect(isOverdue({ status: "NEEDED", dueDate: day(30) }, now)).toBe(false);
    expect(isOverdue({ status: "NEEDED", dueDate: null }, now)).toBe(false);
  });
  it("filters All, Mine and Overdue and counts progress", () => {
    const items = [
      { status: "DONE", dueDate: day(1), assigneeId: "a" },
      { status: "NEEDED", dueDate: day(20), assigneeId: "b" },
      { status: "IN_PROGRESS", dueDate: null, assigneeId: "a" },
    ];
    expect(filterChecklist(items, "all", "a", now)).toHaveLength(3);
    expect(filterChecklist(items, "mine", "a", now)).toHaveLength(2);
    expect(filterChecklist(items, "overdue", "a", now)).toHaveLength(1);
    expect(checklistProgress(items)).toEqual({ done: 1, total: 3, percent: 33 });
    expect(readChecklistFilter("x")).toBe("all");
    expect(parseDueDate("2026-11-06")?.toISOString()).toBe("2026-11-06T12:00:00.000Z");
    expect(parseDueDate("nope")).toBeNull();
  });
  it("only room members and staff see it; only the sponsor manages; files are guarded", () => {
    const db = read("lib/deal-checklist-db.ts");
    expect(db).toMatch(/if \(!member && !user\.isAdmin\) return null;/);
    expect(db).toMatch(/manage: deal\.sponsorId === user\.id \|\| user\.isAdmin/);
    expect(read("app/api/checklist-files/[id]/route.ts")).toMatch(/checklistRoom\(item\.dealId, viewer\)/);
    const actions = read("actions/checklist.ts");
    expect(actions).not.toMatch(/export async function (checklistRoom|ensureStarterChecklist)/);
    expect(actions).toMatch(/Only the sponsor can change the checklist\./);
  });
  it("Find a [category] adds the category to the project, then uses the normal contact rule", () => {
    const actions = read("actions/checklist.ts");
    const find = actions.slice(actions.indexOf("export async function reachOutForChecklist"));
    expect(find).toMatch(/reviewStatus !== "APPROVED"/);
    expect(find).toMatch(/serializeSeeking\(\[\.\.\.seeking, item\.category\]\)/);
    expect(find).toMatch(/await contactAboutProject\(forward\)/);
  });
});
