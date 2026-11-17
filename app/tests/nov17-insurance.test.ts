import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  insurancePolicy: { findMany: vi.fn() },
  insuranceReminder: { findMany: vi.fn(), create: vi.fn() },
  insuranceExpiredReminder: { create: vi.fn() },
  user: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
}));
const sendNotice = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/notices", () => ({ sendNotice }));
vi.mock("@/lib/notify", () => ({ notify }));

import {
  INSURANCE_DATES, INSURANCE_REQUIRED, MAX_POLICIES, POLICY_COUNT_ERROR, POLICY_ERROR, POLICY_LIMIT_ERROR, POLICY_REQUIRED, POLICY_TYPES,
  expiredWeekDue, insuranceStatus, insuranceSuspensionAllows, parseAmount, policyLimitLine, requiresInsuranceFor, suspensionDate, suspensionDue, unresolvedExpired,
  insuranceComplete, insuranceDateKey, insuranceDaysUntil, insuranceNoon, insurancePolicyLabel, insuranceReminderDue,
  insuranceReminderKey, requiresInsurance, validatePolicies,
} from "@/lib/insurance-compliance";
import { insuranceExpiredEmail, insuranceExpiringEmail, insuranceSuspendedEmail, INSURANCE_TEMPLATE_KEY } from "@/lib/insurance-email";
import { insuranceFromJoin, readCertificate, readInsurance } from "@/lib/insurance-input";
import { remindersDue, runInsuranceReminders } from "@/lib/insurance-reminders";
import { phrase } from "@/lib/i18n/phrases";
import { NOV17_PHRASES } from "@/lib/i18n/nov17-phrases";

const NOW = new Date("2026-11-17T14:00:00Z"); // 9 AM ET

describe("who must provide insurance", () => {
  it("covers subs, GCs, architects and engineers only", () => {
    for (const role of ["SUBCONTRACTOR", "GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER", "CIVIL_ENGINEER", "STRUCTURAL_ENGINEER", "MEP_ENGINEER", "GEOTECH_ENGINEER"]) {
      expect(requiresInsurance(role)).toBe(true);
    }
    for (const role of ["DEVELOPER", "LENDER", "INSURER", "BROKER", ""]) expect(requiresInsurance(role)).toBe(false);
  });

  it("accepts a COI or an agent email plus phone", () => {
    expect(insuranceComplete({ hasCoi: true })).toBe(true);
    expect(insuranceComplete({ hasCoi: false, agentEmail: "agent@example.com", agentPhone: "(555) 123-4567" })).toBe(true);
    expect(insuranceComplete({ hasCoi: false, agentEmail: "agent@example.com", agentPhone: "" })).toBe(false);
    expect(insuranceComplete({ hasCoi: false, agentEmail: "", agentPhone: "5551234567" })).toBe(false);
    expect(insuranceComplete({ hasCoi: false, agentEmail: "not-an-email", agentPhone: "5551234567" })).toBe(false);
    expect(insuranceComplete({ hasCoi: false, agentEmail: "agent@example.com", agentPhone: "12345" })).toBe(false);
  });
});

describe("policies", () => {
  it("offers the six policy types and not surety", () => {
    expect(POLICY_TYPES.map(({ id }) => id)).not.toContain("SURETY");
    expect(POLICY_TYPES.map(({ id }) => id)).toEqual(expect.arrayContaining(["GL", "WORKERS_COMP", "PROFESSIONAL", "AUTO", "UMBRELLA", "OTHER"]));
  });

  it("stores expiration at noon Eastern so the date never shifts", () => {
    const noon = insuranceNoon("2026-12-17")!;
    expect(noon.toISOString()).toBe("2026-12-17T17:00:00.000Z");
    expect(insuranceDateKey(noon)).toBe("2026-12-17");
    expect(insuranceNoon("2026-07-04")!.toISOString()).toBe("2026-07-04T16:00:00.000Z");
    expect(insuranceNoon("2026-02-30")).toBeNull();
    expect(insuranceNoon("12/17/2026")).toBeNull();
  });

  it("validates rows, skips blank ones and caps the count", () => {
    const ok = validatePolicies([
      { type: "GL", expiresKey: "2027-01-01", limit: "$1,000,000", aggregate: "2000000" },
      { type: "", expiresKey: "", otherName: "" },
      { type: "OTHER", expiresKey: "2027-02-01", otherName: "  Inland marine  ", limit: 500000 },
    ]);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.policies).toHaveLength(2);
      expect(ok.policies[1].otherName).toBe("Inland marine");
      expect([ok.policies[0].limitAmount, ok.policies[0].aggregateAmount]).toEqual([1_000_000, 2_000_000]);
    }
    expect(validatePolicies([{ type: "GL", expiresKey: "", limit: "1000000" }])).toEqual({ ok: false, error: POLICY_ERROR });
    expect(validatePolicies([{ type: "GL", expiresKey: "2027-01-01" }])).toEqual({ ok: false, error: POLICY_LIMIT_ERROR });
    expect(validatePolicies([{ type: "GL", expiresKey: "2027-01-01" }], { requireLimit: false }).ok).toBe(true);
    expect(validatePolicies([{ type: "", expiresKey: "2027-01-01" }])).toEqual({ ok: false, error: POLICY_ERROR });
    expect(validatePolicies([{ type: "SURETY", expiresKey: "2027-01-01" }])).toEqual({ ok: false, error: POLICY_ERROR });
    const many = Array.from({ length: MAX_POLICIES + 1 }, () => ({ type: "AUTO", expiresKey: "2027-01-01", limit: "1" }));
    expect(validatePolicies(many)).toEqual({ ok: false, error: POLICY_COUNT_ERROR });
  });

  it("reads the form fields", () => {
    const form = new FormData();
    form.append("insuranceAgentName", " Pat Agent ");
    form.append("insuranceAgentEmail", "pat@example.com");
    form.append("insuranceAgentPhone", "555-123-4567");
    form.append("policyType", "WORKERS_COMP"); form.append("policyExpiration", "2027-03-01"); form.append("policyOtherName", ""); form.append("policyLimit", "1000000"); form.append("policyAggregate", "");
    form.append("policyType", "OTHER"); form.append("policyExpiration", "2027-04-01"); form.append("policyOtherName", "Pollution"); form.append("policyLimit", "250000"); form.append("policyAggregate", "500000");
    const read = readInsurance(form);
    expect(read.agent).toEqual({ insuranceAgentName: "Pat Agent", insuranceAgentEmail: "pat@example.com", insuranceAgentPhone: "555-123-4567" });
    expect(read.result.ok && read.result.policies.map((p) => [p.type, insuranceDateKey(p.expiresOn), p.otherName, p.limitAmount, p.aggregateAmount])).toEqual([
      ["WORKERS_COMP", "2027-03-01", "", 1_000_000, 0], ["OTHER", "2027-04-01", "Pollution", 250_000, 500_000],
    ]);
  });

  it("carries application answers to the approved member", () => {
    const parsed = insuranceFromJoin({ insuranceProfile: { insuranceAgentEmail: "a@b.co", insuranceAgentPhone: "5551234567", policies: [{ type: "UMBRELLA", expiresKey: "2027-05-05" }] } });
    expect(parsed?.agent.insuranceAgentEmail).toBe("a@b.co");
    expect(parsed?.policies.map((p) => p.type)).toEqual(["UMBRELLA"]);
    expect(insuranceFromJoin({})).toBeNull();
  });

  it("accepts a PDF certificate and rejects other files", async () => {
    const none = await readCertificate(new FormData());
    expect(none).toEqual({ ok: true, file: null });
    const pdf = new FormData();
    pdf.append("coi", new File([Buffer.from("%PDF-1.4\n%test")], "coi.pdf", { type: "application/pdf" }));
    const ok = await readCertificate(pdf);
    expect(ok.ok && ok.file?.contentType).toBe("application/pdf");
    const bad = new FormData();
    bad.append("coi", new File([Buffer.from("hello")], "coi.pdf", { type: "application/pdf" }));
    expect((await readCertificate(bad)).ok).toBe(false);
  });
});

describe("30 day reminder window", () => {
  const at = (key: string) => insuranceNoon(key)!;
  it("is due from 30 days out through the expiration day", () => {
    expect(insuranceDaysUntil(at("2026-12-17"), NOW)).toBe(30);
    expect(insuranceReminderDue({ userId: "u", type: "AUTO", expiresOn: at("2026-12-17") }, new Set(), NOW)).toBe(true);
    expect(insuranceReminderDue({ userId: "u", type: "AUTO", expiresOn: at("2026-12-18") }, new Set(), NOW)).toBe(false);
    expect(insuranceReminderDue({ userId: "u", type: "AUTO", expiresOn: at("2026-11-17") }, new Set(), NOW)).toBe(true);
    expect(insuranceReminderDue({ userId: "u", type: "AUTO", expiresOn: at("2026-11-16") }, new Set(), NOW)).toBe(false);
  });

  it("sends once per policy per expiration date", () => {
    const sent = new Set([insuranceReminderKey("u", "AUTO", "2026-12-01")]);
    const policies = [
      { userId: "u", type: "AUTO", expiresOn: at("2026-12-01") },
      { userId: "u", type: "UMBRELLA", expiresOn: at("2026-12-01") },
      { userId: "u", type: "UMBRELLA", expiresOn: at("2026-12-01") },
      { userId: "v", type: "AUTO", expiresOn: at("2026-12-01") },
    ];
    expect(remindersDue(policies, sent, NOW).map((p) => `${p.userId}:${p.type}`)).toEqual(["u:UMBRELLA", "v:AUTO"]);
    // A renewed policy with a new date is a new reminder.
    expect(remindersDue([{ userId: "u", type: "AUTO", expiresOn: at("2026-12-10") }], sent, NOW)).toHaveLength(1);
  });
});

describe("runInsuranceReminders", () => {
  const policy = (userId: string, type: string, key: string) => ({
    id: `${userId}-${type}`, userId, type, otherName: "", expiresOn: insuranceNoon(key)!,
    user: { name: "Sam Builder", email: `${userId}@example.test`, locale: "es", role: "GENERAL_CONTRACTOR", extraCategories: "" },
  });
  beforeEach(() => {
    vi.clearAllMocks();
    db.insurancePolicy.findMany.mockResolvedValue([policy("u1", "GL", "2026-12-10"), policy("u2", "AUTO", "2026-12-12")]);
    db.insuranceReminder.findMany.mockResolvedValue([]);
    db.insuranceReminder.create.mockResolvedValue({});
    db.user.findMany.mockResolvedValue([]);
    sendNotice.mockResolvedValue({ id: "n", deliveredTo: "test@example.test" });
    notify.mockResolvedValue(undefined);
  });

  it("only looks at active members in the covered roles", async () => {
    await runInsuranceReminders({ dryRun: true, now: NOW });
    const where = db.insurancePolicy.findMany.mock.calls[0][0].where;
    expect(where.user.status).toBe("ACTIVE");
    expect(where.user.OR[0].role.in).toContain("GENERAL_CONTRACTOR");
    expect(where.user.OR[0].role.in).not.toContain("DEVELOPER");
    expect(where.user.OR).toContainEqual({ extraCategories: { contains: "SUBCONTRACTOR" } });
  });

  it("dry run lists what is due and sends nothing", async () => {
    const out = await runInsuranceReminders({ dryRun: true, now: NOW });
    expect(out.map((r) => r.result)).toEqual(["due", "due"]);
    expect(out.every((r) => r.kind === "before")).toBe(true);
    expect(db.insuranceReminder.create).not.toHaveBeenCalled();
    expect(sendNotice).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("claims, emails and adds an in-app notice", async () => {
    const out = await runInsuranceReminders({ dryRun: false, now: NOW });
    expect(out.map((r) => r.result)).toEqual(["sent", "sent"]);
    expect(db.insuranceReminder.create).toHaveBeenCalledWith({ data: { userId: "u1", policyType: "GL", expiresKey: "2026-12-10" } });
    expect(sendNotice).toHaveBeenCalledWith(expect.objectContaining({ intendedTo: "u1@example.test", templateKey: INSURANCE_TEMPLATE_KEY }));
    expect(sendNotice.mock.calls[0][0].subject).toContain("Private Floor");
    expect(notify).toHaveBeenCalledWith("u1", expect.objectContaining({ href: "/profile#insurance-compliance" }));
  });

  it("skips reminders already recorded and never sends twice in a race", async () => {
    db.insuranceReminder.findMany.mockResolvedValue([{ userId: "u1", policyType: "GL", expiresKey: "2026-12-10" }]);
    db.insuranceReminder.create.mockRejectedValueOnce(Object.assign(new Error("dupe"), { code: "P2002" }));
    const out = await runInsuranceReminders({ dryRun: false, now: NOW });
    expect(out).toEqual([expect.objectContaining({ userId: "u2", result: "claimed" })]);
    expect(sendNotice).not.toHaveBeenCalled();
  });
});

describe("reminder email", () => {
  it("is branded and localized", () => {
    const base = { type: "GL", otherName: "", expiresOn: insuranceNoon("2026-12-17")!, link: "https://example.test/profile#insurance-compliance", name: "Sam Builder" };
    const en = insuranceExpiringEmail({ ...base, locale: "en" });
    expect(en.subject).toBe("Private Floor · Insurance policy expiration reminder");
    expect(en.text).toContain("Hi Sam,");
    expect(en.text).toContain("General liability policy expires on December 17, 2026");
    expect(en.text).toContain("The Private Floor team");
    for (const locale of ["es", "de", "ja"]) {
      const mail = insuranceExpiringEmail({ ...base, locale });
      expect(mail.subject).not.toBe(en.subject);
      expect(mail.text).toContain(base.link);
      expect(mail.text).not.toContain("expires on");
    }
    expect(insurancePolicyLabel("OTHER", "Pollution", (s) => s)).toBe("Pollution");
  });
});

describe("copy", () => {
  it("translates every new string in Spanish, German and Japanese", () => {
    for (const key of [...Object.keys(NOV17_PHRASES), INSURANCE_REQUIRED, INSURANCE_DATES, POLICY_ERROR, POLICY_COUNT_ERROR, POLICY_REQUIRED, POLICY_LIMIT_ERROR]) {
      for (const locale of ["es", "de", "ja"] as const) expect(phrase(locale, key), `${locale}: ${key}`).not.toBe(key);
    }
  });

  it("avoids banned words in the new files", () => {
    const files = [
      "src/lib/i18n/nov17-phrases.ts", "src/lib/insurance-compliance.ts", "src/lib/insurance-email.ts", "src/lib/insurance-reminders.ts",
      "src/components/insurance-fields.tsx", "src/components/insurance-prompt.tsx", "src/components/admin-insurance-card.tsx",
      "src/components/insurance-reminder-controls.tsx", "src/app/(app)/admin/insurance/page.tsx", "src/components/insurance-suspended.tsx",
    ];
    for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/\binvit|founding member|\blimited\b/i);
  });

  it("migration only adds", () => {
    for (const dir of ["20261117090000_insurance_compliance", "20261117233000_insurance_limits_followups"]) {
      const sql = readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8");
      expect(sql.replace(/ON DELETE CASCADE/g, ""), dir).not.toMatch(/\b(DROP|RENAME|ALTER COLUMN|DELETE|TRUNCATE)\b/i);
    }
  });
});

describe("Nov 17 decisions: extra categories, status, limits", () => {
  it("covers a member whose extra category is sub, GC, architect or engineer", () => {
    expect(requiresInsuranceFor({ role: "INSURER", extraCategories: "GENERAL_CONTRACTOR" })).toBe(true);
    expect(requiresInsuranceFor({ role: "DEVELOPER", extraCategories: "FINANCING,MEP_ENGINEER" })).toBe(true);
    expect(requiresInsuranceFor({ role: "DEVELOPER", extraCategories: ["SUBCONTRACTOR"] })).toBe(true);
    expect(requiresInsuranceFor({ role: "DEVELOPER", extraCategories: "FINANCING,EQUITY" })).toBe(false);
    expect(requiresInsuranceFor({ role: "LENDER" })).toBe(false);
  });

  it("requires dates for a complete status and shows suspension first", () => {
    expect(insuranceStatus({ complete: false, policyCount: 2 })).toBe("Missing");
    expect(insuranceStatus({ complete: true, policyCount: 0 })).toBe("Expiration dates missing");
    expect(insuranceStatus({ complete: true, policyCount: 1 })).toBe("Complete");
    expect(insuranceStatus({ complete: true, policyCount: 1, suspended: true })).toBe("Suspended");
  });

  it("reads dollar amounts and shows members limits, never the COI or agent", () => {
    expect(parseAmount("$1,000,000.00")).toBe(1_000_000);
    expect(parseAmount("")).toBe(0);
    const line = policyLimitLine({ type: "GL", otherName: "", expiresOn: insuranceNoon("2027-01-01")!, limitAmount: 1_000_000, aggregateAmount: 2_000_000 }, NOW, (s) => s, (n) => `$${n / 1_000_000}M`);
    expect(line).toBe("General liability · $1M / $2M · Current");
    expect(policyLimitLine({ type: "AUTO", otherName: "", expiresOn: insuranceNoon("2026-11-01")!, limitAmount: 500_000, aggregateAmount: 0 }, NOW, (s) => s, String)).toBe("Commercial auto · 500000 · Expired");
  });

  it("keeps Profile, Settings and Alerts open during a suspension", () => {
    expect(insuranceSuspensionAllows("/profile")).toBe(true);
    expect(insuranceSuspensionAllows("/settings")).toBe(true);
    expect(insuranceSuspensionAllows("/alerts")).toBe(true);
    expect(insuranceSuspensionAllows("/feed")).toBe(false);
    expect(insuranceSuspensionAllows("/profiles-evil")).toBe(false);
  });
});

describe("Nov 17 decision 4: weekly reminders after expiry, then suspension", () => {
  const at = (key: string) => insuranceNoon(key)!;
  const day = (key: string) => new Date(`${key}T14:00:00Z`);
  it("treats an expired policy as open until a current policy of the same type exists", () => {
    const old = { type: "GL", expiresOn: at("2026-11-01") };
    expect(unresolvedExpired([old], NOW)).toEqual([old]);
    expect(unresolvedExpired([old, { type: "GL", expiresOn: at("2027-11-01") }], NOW)).toEqual([]);
    expect(unresolvedExpired([old, { type: "AUTO", expiresOn: at("2027-11-01") }], NOW)).toEqual([old]);
    expect(unresolvedExpired([old], NOW, at("2026-11-10"))).toEqual([]);
  });

  it("sends week 1 the day after expiry, then one a week, four in all", () => {
    const expires = at("2026-11-10");
    expect(expiredWeekDue(expires, [], day("2026-11-10"))).toBeNull();
    expect(expiredWeekDue(expires, [], day("2026-11-11"))).toBe(1);
    const w1 = [{ week: 1, sentAt: day("2026-11-11") }];
    expect(expiredWeekDue(expires, w1, day("2026-11-17"))).toBeNull();
    expect(expiredWeekDue(expires, w1, day("2026-11-18"))).toBe(2);
    const all = [1, 2, 3, 4].map((week) => ({ week, sentAt: day(["2026-11-11", "2026-11-18", "2026-11-25", "2026-12-02"][week - 1]) }));
    expect(expiredWeekDue(expires, all, day("2026-12-20"))).toBeNull();
    // A policy entered long after it expired still gets four reminders a week apart before any suspension.
    expect(expiredWeekDue(at("2025-01-01"), [], NOW)).toBe(1);
  });

  it("names the suspension date and suspends only a week after the 4th reminder", () => {
    expect(insuranceDateKey(suspensionDate(1, day("2026-11-11")))).toBe("2026-12-09");
    expect(insuranceDateKey(suspensionDate(4, day("2026-12-02")))).toBe("2026-12-09");
    const three = [1, 2, 3].map((week) => ({ week, sentAt: day("2026-11-11") }));
    expect(suspensionDue(three, day("2027-01-01"))).toBe(false);
    const four = [...three, { week: 4, sentAt: day("2026-12-02") }];
    expect(suspensionDue(four, day("2026-12-08"))).toBe(false);
    expect(suspensionDue(four, day("2026-12-09"))).toBe(true);
  });
});

describe("runInsuranceReminders after expiry", () => {
  const member = (over: Record<string, unknown> = {}) => ({
    id: "d1", name: "Demo Builder", email: "demo@builder.example", locale: "de", role: "DEVELOPER", extraCategories: "GENERAL_CONTRACTOR",
    insuranceSuspendedAt: null, insuranceSuspensionLiftedAt: null,
    insurancePolicies: [{ type: "GL", otherName: "", expiresOn: insuranceNoon("2026-11-01")! }],
    insuranceExpiredReminders: [] as { policyType: string; expiresKey: string; week: number; sentAt: Date }[],
    ...over,
  });
  beforeEach(() => {
    vi.clearAllMocks();
    db.insurancePolicy.findMany.mockResolvedValue([]);
    db.insuranceExpiredReminder.create.mockResolvedValue({});
    db.user.updateMany.mockResolvedValue({ count: 1 });
    db.user.update.mockResolvedValue({});
    sendNotice.mockResolvedValue({ id: "n", deliveredTo: "test@example.test" });
    notify.mockResolvedValue(undefined);
  });

  it("dry run lists the weekly reminder and a pending suspension without writing", async () => {
    const sent = [1, 2, 3, 4].map((week) => ({ policyType: "GL", expiresKey: "2026-11-01", week, sentAt: new Date("2026-11-02T14:00:00Z") }));
    db.user.findMany.mockResolvedValue([member(), member({ id: "d2", insuranceExpiredReminders: sent })]);
    const out = await runInsuranceReminders({ dryRun: true, now: NOW });
    expect(out.map((r) => [r.userId, r.kind, r.week ?? null, r.result])).toEqual([["d1", "expired", 1, "due"], ["d2", "suspend", null, "due"]]);
    expect(db.insuranceExpiredReminder.create).not.toHaveBeenCalled();
    expect(db.user.updateMany).not.toHaveBeenCalled();
    expect(sendNotice).not.toHaveBeenCalled();
  });

  it("claims the week, emails the suspension date and suspends after the 4th", async () => {
    const sent = [1, 2, 3, 4].map((week) => ({ policyType: "GL", expiresKey: "2026-11-01", week, sentAt: new Date("2026-11-02T14:00:00Z") }));
    db.user.findMany.mockResolvedValue([member(), member({ id: "d2", insuranceExpiredReminders: sent })]);
    const out = await runInsuranceReminders({ dryRun: false, now: NOW });
    expect(out.map((r) => r.result)).toEqual(["sent", "suspended"]);
    expect(db.insuranceExpiredReminder.create).toHaveBeenCalledWith({ data: { userId: "d1", policyType: "GL", expiresKey: "2026-11-01", week: 1 } });
    expect(sendNotice.mock.calls[0][0].text).toContain("2026");
    expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: "d2", insuranceSuspendedAt: null }, data: { insuranceSuspendedAt: NOW } });
  });

  it("lifts a suspension once a current policy is on file, and ignores members outside the rule", async () => {
    db.user.findMany.mockResolvedValue([
      member({ insuranceSuspendedAt: new Date("2026-11-10T14:00:00Z"), insurancePolicies: [{ type: "GL", otherName: "", expiresOn: insuranceNoon("2027-11-01")! }] }),
      member({ id: "x1", role: "LENDER", extraCategories: "" }),
    ]);
    const out = await runInsuranceReminders({ dryRun: false, now: NOW });
    expect(out).toEqual([expect.objectContaining({ userId: "d1", kind: "lift", result: "lifted" })]);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { insuranceSuspendedAt: null } });
  });
});

describe("expired and suspension emails", () => {
  const base = { type: "GL", otherName: "", expiresOn: insuranceNoon("2026-11-01")!, link: "https://example.test/profile#insurance-compliance", name: "Sam Builder" };
  it("states the suspension date in all four languages", () => {
    const suspendOn = insuranceNoon("2026-11-30")!;
    const en = insuranceExpiredEmail({ ...base, locale: "en", week: 4, suspendOn });
    expect(en.subject).toBe("Private Floor · Insurance policy expired: reminder 4 of 4");
    expect(en.text).toContain("This is the final reminder");
    expect(en.text).toContain("suspended on November 30, 2026");
    expect(insuranceExpiredEmail({ ...base, locale: "en", week: 1, suspendOn }).text).not.toContain("final reminder");
    for (const [locale, month] of [["es", "noviembre"], ["de", "November"], ["ja", "11月30日"]] as const) {
      const mail = insuranceExpiredEmail({ ...base, locale, week: 2, suspendOn });
      expect(mail.text).toContain(month);
      expect(mail.subject).not.toBe(en.subject);
    }
    expect(insuranceSuspendedEmail({ ...base, locale: "en" }).text).toContain("You can still sign in");
  });
});
