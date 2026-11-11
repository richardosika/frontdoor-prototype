import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canSeekOnProject } from "@/lib/project-seeking";
import { isStaffAccount, NOT_STAFF_WHERE, STAFF_EMAILS, recommend } from "@/lib/recommendations";
import { gettingStarted } from "@/lib/member-reach";
import { filterDirectory } from "@/lib/member-directory";
import { PHRASES } from "@/lib/i18n/phrases";
import { topicsFor, topicText } from "@/lib/help/member-knowledge";
import { composeMemberAnswer, knowledgeText } from "@/lib/help/member-chat";

const source = (path: string) => readFileSync(path, "utf8");
const setup = { profileDone: true, ndaAccepted: true, projectCount: 1, seekingSet: false, approvedProject: false, outreachSent: 0, hasPhoto: true, hasCredential: true, noMatches: true };
const reach = (role: string, extraCategories = "") => gettingStarted({ ...setup, role, extraCategories }).find((s) => s.id === "reach")!;
const locales = ["en", "es", "de", "ja"] as const;

describe("November 11 product fixes", () => {
  it("allows seeking for the three project owner roles", () => {
    for (const role of ["DEVELOPER", "GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER"]) expect(canSeekOnProject(role)).toBe(true);
    for (const role of ["SUBCONTRACTOR", "LENDER", "INVESTOR_PE", "BROKER", null, undefined]) expect(canSeekOnProject(role)).toBe(false);
  });

  it("uses the same seeking policy for creation, resubmission and profile forms", () => {
    const actions = source("src/actions/projects.ts");
    for (const action of ["addProject", "resubmitProject"]) {
      const body = actions.split(`export async function ${action}(`)[1]?.split("export async function ")[0];
      expect(body).toContain("canSeekOnProject(user.role) ? read.value");
      expect(body).not.toContain('user.role === "DEVELOPER" ? read.value');
    }
    expect(source("src/components/profile-view.tsx").match(/pastWork=\{!canSeekOnProject\(member.role\)\}/g)).toHaveLength(2);
    expect(source("src/components/profile-view.tsx")).toContain('canSeekOnProject(member.role) ? tx("Add a project") : tx("Add past work")');
    expect(source("src/lib/start-gate.ts")).toContain("extraCategories: user.extraCategories");
  });

  it("keeps staff hidden while allowing other mailboxes and tester recommendations", () => {
    for (const email of STAFF_EMAILS) expect(isStaffAccount({ email: `  ${email.toUpperCase()}  ` })).toBe(true);
    expect(isStaffAccount({ isAdmin: true, email: "person@company.com" })).toBe(true);
    expect(isStaffAccount({ name: "Richard Osika" }, new Set(["richard osika"]))).toBe(true);
    for (const email of ["rich+pf-architect1@privatefloorclub.com", "rich+pf-lender1@privatefloorclub.com", "other@privatefloorclub.com", "person@company.com"]) expect(isStaffAccount({ email })).toBe(false);
    expect(NOT_STAFF_WHERE).toEqual({ isAdmin: false, email: { notIn: STAFF_EMAILS, mode: "insensitive" } });
    const viewer = { id: "d", role: "DEVELOPER", location: "Austin, TX", markets: "", assetClasses: "", seeking: ["ARCHITECT_ENGINEER"] };
    expect(recommend(viewer, [{ ...viewer, id: "a", role: "ARCHITECT_ENGINEER", email: "rich+pf-architect1@privatefloorclub.com" }], new Set()).map((r) => r.id)).toEqual(["a"]);
    const rows = ["rich+pf-architect1@privatefloorclub.com", ...STAFF_EMAILS].map((email, i) => ({
      id: String(i), name: "Test Person", initials: "TP", org: "Test Company", role: "ARCHITECT_ENGINEER",
      location: "Austin, TX", email, status: "ACTIVE", paymentStatus: "PAID",
    }));
    expect(filterDirectory(rows, viewer, {}).map((r) => r.email)).toEqual(["rich+pf-architect1@privatefloorclub.com"]);
    const db = source("src/lib/project-contact-db.ts").split("export async function staffNameSet")[1];
    expect(db).toContain("in: STAFF_EMAILS");
    expect(db).not.toContain('endsWith: "@privatefloorclub.com"');
  });

  it("uses GC and architect wording only for sub-only setup and translates it", () => {
    const note = reach("SUBCONTRACTOR").note!;
    expect(note).toContain("a general contractor or architect");
    expect(reach("GENERAL_CONTRACTOR").note).toContain("a developer");
    expect(reach("SUBCONTRACTOR", "GENERAL_CONTRACTOR").note).toContain("a developer");
    expect(note.length).toBeGreaterThan(0);
    expect(PHRASES[note]).toHaveLength(3);
    for (const text of PHRASES[note]) {
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).toContain("{category}");
    }
    const words = ["general contractor or architect", "contratista general o arquitecto", "Generalunternehmer oder Architekt", "ゼネコンまたは建築家"];
    const oldWords = ["a developer", "un desarrollador", "ein Entwickler", "デベロッパー"];
    locales.forEach((locale, index) => {
      const sub = topicsFor(false, true).find((t) => t.id === "getting-started-member")!;
      const other = topicsFor(false).find((t) => t.id === "getting-started-member")!;
      expect(topicText(sub, locale).body).toContain(words[index]);
      expect(topicText(other, locale).body).toContain(oldWords[index]);
    });
  });

  it("uses sub wording in both Help response paths", async () => {
    const ctx = { firstName: "Sam", type: "Subcontractor", isDeveloper: false, subOnly: true, credential: "license", categories: "", nextStep: "", done: "" };
    expect(knowledgeText(ctx, [])).toContain("a general contractor or architect posts one");
    for (const locale of locales) {
      const reply = await composeMemberAnswer({ question: "Getting started", ctx, locale, faq: [] });
      expect(reply.answer).toBe(topicText(topicsFor(false, true).find((t) => t.id === "getting-started-member")!, locale, { credential: "license" }).body);
    }
    expect(source("src/lib/help/member-store.ts")).toContain("subOnly: isSubOnly(user)");
    expect(source("src/app/(app)/feed/page.tsx")).toContain("extraCategories: user.extraCategories");
  });

  it("explains referrals without a quota and retains daily rules and statuses in four languages", () => {
    const topic = topicsFor(false).find((t) => t.id === "refer")!;
    const daily = ["daily send rules", "reglas de envío diario", "täglichen Versandregeln", "1日ごとの送信ルール"];
    const statuses = [["Sent", "Applied", "Approved"], ["Enviada", "Solicitó", "Aprobada"], ["Gesendet", "Beworben", "Zugelassen"], ["送信済み", "申請済み", "承認済み"]];
    const stale = ["set number", "número fijo", "feste Anzahl", "残り数"];
    locales.forEach((locale, index) => {
      const body = topicText(topic, locale).body;
      expect(body).toContain("(/refer)");
      expect(body).toContain(daily[index]);
      expect(body).not.toContain(stale[index]);
      for (const status of statuses[index]) expect(body).toContain(status);
    });
  });

  it("documents the member directory in the My Circle comment", () => {
    const page = source("src/app/(app)/network/page.tsx");
    expect(page).not.toContain("The full directory stays in admin");
    expect(page).not.toContain("no member browses the full member list");
    expect(page).toContain("Member Directory is at /directory");
  });
});
