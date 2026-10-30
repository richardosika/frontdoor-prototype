import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PHRASES, phrase } from "@/lib/i18n/phrases";
import {
  CONTACT_REASONS,
  COLD_MESSAGE_REASON,
  PROJECT_ASSET_CLASSES,
  SEEK_CATEGORIES,
  US_STATES,
  canContactAboutProject,
  canDirectMessage,
  canEditProject,
  categoryForRole,
  formatProjectValue,
  parseSeeking,
  projectDetailsVisible,
  projectSeeksRole,
  projectVisibleTo,
  readProjectForm,
  reviewLabel,
  reviewOutcome,
  serializeSeeking,
} from "@/lib/project-contact";
import { projectContactEmail, projectReviewEmail } from "@/lib/project-review-email";
import { PROJECT_ROLE_LABELS } from "@/lib/project-roles";
import { ROLE_IDS } from "@/lib/roles";

const ROOT = path.join(__dirname, "..", "src");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

const owner = { id: "dev", role: "DEVELOPER" };
const lender = { id: "lender", role: "LENDER" };
const lp = { id: "lp", role: "FAMILY_OFFICE" };
const architect = { id: "arch", role: "ARCHITECT_ENGINEER" };
const gc = { id: "gc", role: "GENERAL_CONTRACTOR" };
const project = { userId: "dev", seeking: "FINANCING,ARCHITECT_ENGINEER", reviewStatus: "APPROVED" };

describe("contact rule", () => {
  it("every platform role answers exactly one category", () => {
    for (const role of ROLE_IDS) expect(categoryForRole(role), role).not.toBeNull();
    expect(categoryForRole("LENDER")).toBe("FINANCING");
    expect(categoryForRole("MORTGAGE_BROKER")).toBe("FINANCING");
    expect(categoryForRole("FAMILY_OFFICE")).toBe("EQUITY");
    expect(categoryForRole("INVESTOR_PE")).toBe("EQUITY");
    expect(categoryForRole("ARCHITECT_ENGINEER")).toBe("ARCHITECT_ENGINEER");
    expect(categoryForRole("RE_ATTORNEY")).toBe("RE_ATTORNEY");
    expect(categoryForRole(null)).toBeNull();
  });

  it("a member in a sought category can contact the owner", () => {
    expect(canContactAboutProject({ project, from: lender, to: owner })).toEqual({ ok: true, category: "FINANCING" });
    expect(canContactAboutProject({ project, from: architect, to: owner })).toEqual({ ok: true, category: "ARCHITECT_ENGINEER" });
  });

  it("a member outside the sought categories cannot (no cold solicitation)", () => {
    expect(canContactAboutProject({ project, from: lp, to: owner })).toEqual({ ok: false, reason: CONTACT_REASONS.wrongCategory });
    expect(canContactAboutProject({ project, from: gc, to: owner }).ok).toBe(false);
  });

  it("a project seeking nothing cannot be contacted by anyone", () => {
    const none = { ...project, seeking: "" };
    for (const from of [lender, lp, architect, gc]) {
      expect(canContactAboutProject({ project: none, from, to: owner })).toEqual({ ok: false, reason: CONTACT_REASONS.seeksNothing });
    }
  });

  it("pending, sent-back and declined projects cannot be contacted", () => {
    for (const reviewStatus of ["PENDING_REVIEW", "NEEDS_INFO", "DECLINED"]) {
      expect(canContactAboutProject({ project: { ...project, reviewStatus }, from: lender, to: owner })).toEqual({ ok: false, reason: CONTACT_REASONS.notApproved });
    }
  });

  it("the owner can reach out only to sought categories", () => {
    expect(canContactAboutProject({ project, from: owner, to: lender }).ok).toBe(true);
    expect(canContactAboutProject({ project, from: owner, to: lp })).toEqual({ ok: false, reason: CONTACT_REASONS.recipientCategory });
  });

  it("third parties cannot use someone else's project to reach a member", () => {
    expect(canContactAboutProject({ project, from: lender, to: architect })).toEqual({ ok: false, reason: CONTACT_REASONS.notOwner });
    expect(canContactAboutProject({ project, from: owner, to: owner })).toEqual({ ok: false, reason: CONTACT_REASONS.self });
  });

  it("applies the same way when a GC posts a project", () => {
    const gcProject = { userId: "gc", seeking: "ARCHITECT_ENGINEER,FINANCING", reviewStatus: "APPROVED" };
    expect(canContactAboutProject({ project: gcProject, from: architect, to: gc }).ok).toBe(true);
    expect(canContactAboutProject({ project: gcProject, from: lender, to: gc }).ok).toBe(true);
    expect(canContactAboutProject({ project: gcProject, from: owner, to: gc }).ok).toBe(false);
    expect(projectSeeksRole(gcProject, "MORTGAGE_BROKER")).toBe(true);
    expect(projectSeeksRole(gcProject, "FAMILY_OFFICE")).toBe(false);
  });

  it("direct messages need a circle, an accepted introduction or project contact, or an administrator", () => {
    const base = { blocked: false, inCircle: false, introAccepted: false, contactAccepted: false, adminInvolved: false };
    expect(canDirectMessage(base)).toBe(false);
    expect(canDirectMessage({ ...base, inCircle: true })).toBe(true);
    expect(canDirectMessage({ ...base, introAccepted: true })).toBe(true);
    expect(canDirectMessage({ ...base, contactAccepted: true })).toBe(true);
    expect(canDirectMessage({ ...base, adminInvolved: true })).toBe(true);
    expect(canDirectMessage({ ...base, inCircle: true, blocked: true })).toBe(false);
  });

  it("is enforced on the server: typed messages, circle requests, introductions and project contact", () => {
    const portal = read("lib/portal-message.ts");
    expect(portal).toMatch(/=== "TEXT" && !\(await canMessagePair\(/);
    expect(portal).toContain("COLD_MESSAGE_REASON");
    const social = read("actions/social.ts");
    expect(social.match(/canMessagePair\(/g)?.length).toBeGreaterThanOrEqual(3);
    const projects = read("actions/projects.ts");
    expect(projects).toMatch(/const decision = canContactAboutProject\(/);
    expect(projects).toMatch(/if \(!decision\.ok\) go\(back, "error", decision\.reason\)/);
    expect(projects).toMatch(/contact\.project\.userId !== user\.id/);
    expect(COLD_MESSAGE_REASON).toMatch(/cold outreach/);
  });

  it("the profile and Network no longer offer a generic introduction to strangers", () => {
    expect(read("components/profile-view.tsx")).not.toContain("introduceMember");
    expect(read("app/(app)/network/page.tsx")).not.toContain("introduceMember");
    expect(read("components/profile-view.tsx")).toContain("contactAboutProject");
  });

  it("stores seeking as a clean list", () => {
    expect(parseSeeking("EQUITY, FINANCING,bogus,EQUITY")).toEqual(["FINANCING", "EQUITY"]);
    expect(serializeSeeking(["ARCHITECT_ENGINEER", "FINANCING"])).toBe("FINANCING,ARCHITECT_ENGINEER");
    expect(parseSeeking("")).toEqual([]);
  });
});

describe("circle sharing and visibility", () => {
  const viewer = { id: "lender", isAdmin: false };
  it("only approved projects are visible to other members", () => {
    expect(projectVisibleTo({ userId: "dev", reviewStatus: "PENDING_REVIEW" }, viewer)).toBe(false);
    expect(projectVisibleTo({ userId: "dev", reviewStatus: "NEEDS_INFO" }, viewer)).toBe(false);
    expect(projectVisibleTo({ userId: "dev", reviewStatus: "APPROVED" }, viewer)).toBe(true);
    expect(projectVisibleTo({ userId: "dev", reviewStatus: "PENDING_REVIEW" }, { id: "dev", isAdmin: false })).toBe(true);
    expect(projectVisibleTo({ userId: "dev", reviewStatus: "PENDING_REVIEW" }, { id: "x", isAdmin: true })).toBe(true);
  });
  it("circle members see details only for projects shared with My Circle", () => {
    const shared = { userId: "dev", shareWithCircle: true, reviewStatus: "APPROVED" };
    expect(projectDetailsVisible(shared, { ...viewer, inOwnerCircle: true })).toBe(true);
    expect(projectDetailsVisible(shared, { ...viewer, inOwnerCircle: false })).toBe(false);
    expect(projectDetailsVisible({ ...shared, shareWithCircle: false }, { ...viewer, inOwnerCircle: true })).toBe(false);
    expect(projectDetailsVisible({ ...shared, reviewStatus: "PENDING_REVIEW" }, { ...viewer, inOwnerCircle: true })).toBe(false);
  });
});

describe("project review workflow", () => {
  it("has three outcomes; More info needed requires a note; Decline reason is optional", () => {
    expect(reviewOutcome("APPROVE", "")).toEqual({ ok: true, status: "APPROVED", note: "" });
    expect(reviewOutcome("NEEDS_INFO", "")).toMatchObject({ ok: false });
    expect(reviewOutcome("NEEDS_INFO", "Add the address")).toEqual({ ok: true, status: "NEEDS_INFO", note: "Add the address" });
    expect(reviewOutcome("DECLINE", "")).toEqual({ ok: true, status: "DECLINED", note: "" });
    expect(reviewOutcome("DECLINE", "Out of scope")).toMatchObject({ ok: true, status: "DECLINED", note: "Out of scope" });
    expect(reviewOutcome("DELETE", "")).toMatchObject({ ok: false });
  });
  it("the member can edit and resubmit while pending or after More info needed", () => {
    expect(canEditProject("NEEDS_INFO")).toBe(true);
    expect(canEditProject("PENDING_REVIEW")).toBe(true);
    expect(canEditProject("APPROVED")).toBe(false);
    expect(canEditProject("DECLINED")).toBe(false);
    expect(reviewLabel("PENDING_REVIEW")).toBe("Pending review");
    expect(reviewLabel("NEEDS_INFO")).toBe("More info needed");
  });
  it("new and resubmitted projects go to Pending review; staff decisions email the member", () => {
    const actions = read("actions/projects.ts");
    expect(actions.match(/reviewStatus: "PENDING_REVIEW"/g)?.length).toBe(2);
    expect(actions).toMatch(/requireAdmin\(\)/);
    expect(actions).toMatch(/projectReviewEmail\(/);
    expect(actions).toMatch(/sendEmail\(\{ to: project\.user\.email/);
    const page = read("app/(app)/admin/projects/page.tsx");
    for (const value of ['value="APPROVE"', 'value="NEEDS_INFO"', 'value="DECLINE"']) expect(page).toContain(value);
  });
  it("emails each outcome in the member's language", () => {
    const base = { firstName: "Marcus", projectName: "Ironbound", note: "Add the address", link: "https://x/profile" };
    const en = projectReviewEmail({ ...base, locale: "en", status: "NEEDS_INFO" });
    expect(en.subject).toBe("More information needed for your project");
    expect(en.text).toContain("Add the address");
    expect(en.text).toContain("https://x/profile");
    expect(projectReviewEmail({ ...base, locale: "es", status: "APPROVED" }).subject).toBe("Su proyecto está aprobado");
    expect(projectReviewEmail({ ...base, locale: "de", status: "DECLINED" }).subject).toBe("Ihr Projekt wurde nicht genehmigt");
    expect(projectReviewEmail({ ...base, locale: "ja", status: "APPROVED" }).text).toContain("こんにちは");
    expect(projectContactEmail("ja", "https://x/feed").subject).toBe(phrase("ja", "A member contacted you about a project"));
  });
});

describe("project form", () => {
  const form = (values: Record<string, string | string[]>) => ({
    get: (key: string) => (Array.isArray(values[key]) ? values[key][0] : values[key]) ?? null,
    getAll: (key: string) => (Array.isArray(values[key]) ? values[key] : values[key] ? [values[key]] : []),
  });
  const good = {
    name: "Broad Street", asset: "Multifamily", street: "1 Broad St", city: "Newark", state: "NJ", year: "2027",
    valueLabel: "14500000", role: "Developer", seeking: ["EQUITY", "FINANCING"], shareWithCircle: "on",
  };
  it("reads dropdowns, split address and seeking", () => {
    const result = readProjectForm(form(good), PROJECT_ROLE_LABELS);
    expect(result).toMatchObject({ ok: true, value: { state: "NJ", city: "Newark", seeking: ["FINANCING", "EQUITY"], shareWithCircle: true } });
  });
  it("rejects values outside the dropdowns", () => {
    expect(readProjectForm(form({ ...good, asset: "Castle" }), PROJECT_ROLE_LABELS)).toMatchObject({ ok: false });
    expect(readProjectForm(form({ ...good, state: "ZZ" }), PROJECT_ROLE_LABELS)).toMatchObject({ ok: false });
    expect(readProjectForm(form({ ...good, role: "Wizard" }), PROJECT_ROLE_LABELS)).toMatchObject({ ok: false });
    expect(readProjectForm(form({ ...good, year: "1900" }), PROJECT_ROLE_LABELS)).toMatchObject({ ok: false });
  });
  it("lists asset classes, states and roles", () => {
    for (const item of ["Multifamily", "Single family / townhome", "Mixed-use", "Office", "Retail", "Industrial", "Hospitality", "Self-storage", "Land", "Other"]) {
      expect(PROJECT_ASSET_CLASSES as readonly string[]).toContain(item);
    }
    expect(US_STATES.length).toBe(52);
    expect(PROJECT_ROLE_LABELS).toContain("General Contractor");
    expect(PROJECT_ROLE_LABELS).toContain("Lender / Debt Fund");
    expect(formatProjectValue("24000000")).toBe("$24,000,000");
    expect(formatProjectValue("$24M")).toBe("$24M");
  });
  it("labels the year and dollar fields clearly", () => {
    const text = read("components/project-form.tsx");
    expect(text).toContain('tx("Year completed / expected")');
    expect(text).toContain('tx("Total project value ($)")');
    expect(text).toMatch(/<select name="asset"/);
    expect(text).toMatch(/<select name="state"/);
    expect(text).toMatch(/<select name="role"/);
    expect(text).toMatch(/name="seeking"/);
    expect(text).toMatch(/name="shareWithCircle"/);
  });
});

describe("one status: Approved", () => {
  it("the profile shows Approved only, without the brass badge or verification explainer", () => {
    const view = read("components/profile-view.tsx");
    expect(view).not.toContain("VerifiedMark");
    expect(view).not.toContain("The brass badge is separate from membership.");
    expect(view).not.toContain("How verification works");
    expect(view).toContain('tx("Approved")');
    expect(read("app/(app)/network/page.tsx")).not.toContain("VerifiedMark");
  });
});

describe("translations for the new screens", () => {
  it("every new phrase has Spanish, German and Japanese text", () => {
    const strings = new Set<string>();
    for (const file of ["components/project-form.tsx", "components/ledger-projects.tsx", "components/profile-view.tsx", "lib/project-review-email.ts"]) {
      for (const match of read(file).matchAll(/\b(?:tx|p)\("((?:[^"\\]|\\.)+)"\)/g)) strings.add(match[1]);
    }
    for (const item of SEEK_CATEGORIES) strings.add(item.label);
    for (const item of PROJECT_ASSET_CLASSES) strings.add(item);
    for (const item of PROJECT_ROLE_LABELS) strings.add(item);
    for (const item of Object.values(CONTACT_REASONS)) strings.add(item);
    strings.add(COLD_MESSAGE_REASON);
    const missing = [...strings].filter((text) => !PHRASES[text]);
    expect(missing).toEqual([]);
  });
});
