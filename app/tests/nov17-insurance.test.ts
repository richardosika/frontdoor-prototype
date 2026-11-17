import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  insurancePolicy: { findMany: vi.fn() },
  insuranceReminder: { findMany: vi.fn(), create: vi.fn() },
}));
const sendNotice = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/notices", () => ({ sendNotice }));
vi.mock("@/lib/notify", () => ({ notify }));

import {
  INSURANCE_DATES, INSURANCE_REQUIRED, MAX_POLICIES, POLICY_COUNT_ERROR, POLICY_ERROR, POLICY_TYPES,
  insuranceComplete, insuranceDateKey, insuranceDaysUntil, insuranceNoon, insurancePolicyLabel, insuranceReminderDue,
  insuranceReminderKey, requiresInsurance, validatePolicies,
} from "@/lib/insurance-compliance";
import { insuranceExpiringEmail, INSURANCE_TEMPLATE_KEY } from "@/lib/insurance-email";
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
      { type: "GL", expiresKey: "2027-01-01" },
      { type: "", expiresKey: "", otherName: "" },
      { type: "OTHER", expiresKey: "2027-02-01", otherName: "  Inland marine  " },
    ]);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.policies).toHaveLength(2);
      expect(ok.policies[1].otherName).toBe("Inland marine");
    }
    expect(validatePolicies([{ type: "GL", expiresKey: "" }])).toEqual({ ok: false, error: POLICY_ERROR });
    expect(validatePolicies([{ type: "", expiresKey: "2027-01-01" }])).toEqual({ ok: false, error: POLICY_ERROR });
    expect(validatePolicies([{ type: "SURETY", expiresKey: "2027-01-01" }])).toEqual({ ok: false, error: POLICY_ERROR });
    const many = Array.from({ length: MAX_POLICIES + 1 }, () => ({ type: "AUTO", expiresKey: "2027-01-01" }));
    expect(validatePolicies(many)).toEqual({ ok: false, error: POLICY_COUNT_ERROR });
  });

  it("reads the form fields", () => {
    const form = new FormData();
    form.append("insuranceAgentName", " Pat Agent ");
    form.append("insuranceAgentEmail", "pat@example.com");
    form.append("insuranceAgentPhone", "555-123-4567");
    form.append("policyType", "WORKERS_COMP"); form.append("policyExpiration", "2027-03-01"); form.append("policyOtherName", "");
    form.append("policyType", "OTHER"); form.append("policyExpiration", "2027-04-01"); form.append("policyOtherName", "Pollution");
    const read = readInsurance(form);
    expect(read.agent).toEqual({ insuranceAgentName: "Pat Agent", insuranceAgentEmail: "pat@example.com", insuranceAgentPhone: "555-123-4567" });
    expect(read.result.ok && read.result.policies.map((p) => [p.type, insuranceDateKey(p.expiresOn), p.otherName])).toEqual([
      ["WORKERS_COMP", "2027-03-01", ""], ["OTHER", "2027-04-01", "Pollution"],
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
    user: { name: "Sam Builder", email: `${userId}@example.test`, locale: "es" },
  });
  beforeEach(() => {
    vi.clearAllMocks();
    db.insurancePolicy.findMany.mockResolvedValue([policy("u1", "GL", "2026-12-10"), policy("u2", "AUTO", "2026-12-12")]);
    db.insuranceReminder.findMany.mockResolvedValue([]);
    db.insuranceReminder.create.mockResolvedValue({});
    sendNotice.mockResolvedValue({ id: "n", deliveredTo: "test@example.test" });
    notify.mockResolvedValue(undefined);
  });

  it("only looks at active members in the covered roles", async () => {
    await runInsuranceReminders({ dryRun: true, now: NOW });
    const where = db.insurancePolicy.findMany.mock.calls[0][0].where;
    expect(where.user.status).toBe("ACTIVE");
    expect(where.user.role.in).toContain("GENERAL_CONTRACTOR");
    expect(where.user.role.in).not.toContain("DEVELOPER");
  });

  it("dry run lists what is due and sends nothing", async () => {
    const out = await runInsuranceReminders({ dryRun: true, now: NOW });
    expect(out.map((r) => r.result)).toEqual(["due", "due"]);
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
    for (const key of [...Object.keys(NOV17_PHRASES), INSURANCE_REQUIRED, INSURANCE_DATES, POLICY_ERROR, POLICY_COUNT_ERROR]) {
      for (const locale of ["es", "de", "ja"] as const) expect(phrase(locale, key), `${locale}: ${key}`).not.toBe(key);
    }
  });

  it("avoids banned words in the new files", () => {
    const files = [
      "src/lib/i18n/nov17-phrases.ts", "src/lib/insurance-compliance.ts", "src/lib/insurance-email.ts", "src/lib/insurance-reminders.ts",
      "src/components/insurance-fields.tsx", "src/components/insurance-prompt.tsx", "src/components/admin-insurance-card.tsx",
      "src/components/insurance-reminder-controls.tsx", "src/app/(app)/admin/insurance/page.tsx",
    ];
    for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/\binvit|founding member|\blimited\b/i);
  });

  it("migration only adds", () => {
    const sql = readFileSync("prisma/migrations/20261117090000_insurance_compliance/migration.sql", "utf8");
    expect(sql.replace(/ON DELETE CASCADE/g, "")).not.toMatch(/\b(DROP|RENAME|ALTER COLUMN|DELETE|TRUNCATE)\b/i);
  });
});
