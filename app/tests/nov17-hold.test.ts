import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Nov 17 follow-up (Richard): while insurance-suspended, only the insurance submission works, enforced on the server.
const state = vi.hoisted(() => ({ phase: "render" as string | undefined, path: "/feed", nextAction: null as string | null, locale: "en" }));
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  insuranceCertificate: { findUnique: vi.fn(), upsert: vi.fn() },
  insurancePolicy: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  businessCard: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));
const session = vi.hoisted(() => ({ value: { user: { id: "u1" } } as { user: { id: string } } | null }));

vi.mock("next/dist/server/app-render/work-unit-async-storage.external", () => ({
  workUnitAsyncStorage: { getStore: () => (state.phase ? { phase: state.phase } : undefined) },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ ...(state.nextAction ? { "next-action": state.nextAction } : {}), "x-pf-path": state.path }),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw Object.assign(new Error(`REDIRECT ${to}`), { to }); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => session.value, signOut: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/i18n/server", () => ({
  currentLocale: async () => state.locale,
  serverTx: async () => (s: string) => s,
}));

import { holdDecision, insuranceHeld, insuranceHoldResponse, requestPhase } from "@/lib/insurance-hold";
import { requireAccount, requireUser } from "@/lib/current-user";
import { INSURANCE_HELD_MESSAGE, INSURANCE_HELD_PATH } from "@/lib/insurance-compliance";
import { phrase } from "@/lib/i18n/phrases";
import { NOV17_PHRASES } from "@/lib/i18n/nov17-phrases";

const SUSPENDED = { id: "u1", status: "ACTIVE", isAdmin: false, paymentStatus: "PAID", insuranceSuspendedAt: new Date("2026-11-01"), insuranceSuspensionLiftedAt: null, role: "GENERAL_CONTRACTOR", extraCategories: "" };
const redirectOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (error) {
    return (error as { to?: string }).to ?? String(error);
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  state.phase = "render";
  state.path = "/feed";
  state.nextAction = null;
  state.locale = "en";
  session.value = { user: { id: "u1" } };
  db.user.findUnique.mockResolvedValue(SUSPENDED);
});

describe("hold rules", () => {
  it("holds only suspended members who are not staff and not already blocked for payment", () => {
    expect(insuranceHeld(SUSPENDED)).toBe(true);
    expect(insuranceHeld({ ...SUSPENDED, isAdmin: true })).toBe(false);
    expect(insuranceHeld({ ...SUSPENDED, insuranceSuspendedAt: null })).toBe(false);
    expect(insuranceHeld({ ...SUSPENDED, paymentStatus: "DUE" })).toBe(false);
    expect(insuranceHeld(null)).toBe(false);
  });

  it("blocks every action except the insurance submission, and every page except Profile", () => {
    expect(holdDecision({ held: true, phase: "action", path: "/profile" })).toBe("block");
    expect(holdDecision({ held: true, phase: "action", path: "/profile", insuranceSubmission: true })).toBe("allow");
    for (const path of ["/settings", "/alerts", "/feed", "/messages/abc", "/bids/1", "/profiles-evil"]) {
      expect(holdDecision({ held: true, phase: "render", path })).toBe("block");
    }
    expect(holdDecision({ held: true, phase: "render", path: "/profile" })).toBe("allow");
    expect(holdDecision({ held: false, phase: "action", path: "/feed" })).toBe("allow");
  });

  it("tells a server action from the page render that follows it", () => {
    state.phase = "action";
    expect(requestPhase(null)).toBe("action");
    state.phase = "render";
    expect(requestPhase("abc")).toBe("render");
    state.phase = undefined;
    expect(requestPhase("abc")).toBe("action");
    expect(requestPhase(null)).toBe("render");
  });
});

describe("requireAccount enforces the hold on the server", () => {
  it("sends Settings, Alerts and other pages to Profile with the message", async () => {
    for (const path of ["/settings", "/alerts", "/feed"]) {
      state.path = path;
      expect(await redirectOf(() => requireUser())).toBe(INSURANCE_HELD_PATH);
    }
    state.path = "/profile";
    expect(await redirectOf(() => requireUser())).toBeNull();
  });

  it("refuses server actions, even ones posted from Profile, unless they are the insurance submission", async () => {
    state.phase = "action";
    state.path = "/profile";
    state.nextAction = "abc";
    expect(await redirectOf(() => requireUser())).toBe(INSURANCE_HELD_PATH);
    expect(await redirectOf(() => requireAccount())).toBe(INSURANCE_HELD_PATH);
    expect(await redirectOf(() => requireUser({ insuranceSubmission: true }))).toBeNull();
  });

  it("never holds staff or members who are not suspended", async () => {
    state.phase = "action";
    db.user.findUnique.mockResolvedValue({ ...SUSPENDED, isAdmin: true });
    expect(await redirectOf(() => requireUser())).toBeNull();
    db.user.findUnique.mockResolvedValue({ ...SUSPENDED, insuranceSuspendedAt: null });
    expect(await redirectOf(() => requireUser())).toBeNull();
  });
});

describe("API routes answer 403 with the message and Profile link", () => {
  it.each(["en", "es", "de", "ja"] as const)("in %s", async (locale) => {
    state.locale = locale;
    const json = await insuranceHoldResponse("json");
    expect(json?.status).toBe(403);
    const body = await json!.json();
    expect(body.error).toBe(phrase(locale, INSURANCE_HELD_MESSAGE));
    expect(body.href).toBe("/profile#insurance-compliance");
    const html = await insuranceHoldResponse("html");
    expect(html?.status).toBe(403);
    const text = await html!.text();
    expect(text).toContain('href="/profile#insurance-compliance"');
    expect(text).toContain(phrase(locale, "Update insurance on your Profile"));
  });

  it("lets everyone else through", async () => {
    db.user.findUnique.mockResolvedValue({ ...SUSPENDED, isAdmin: true });
    expect(await insuranceHoldResponse()).toBeNull();
    session.value = null;
    expect(await insuranceHoldResponse()).toBeNull();
  });

  it("guards every member API route that writes or serves member files", () => {
    const root = join(process.cwd(), "src/app/api");
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : name === "route.ts" ? [full] : [];
    });
    const exempt = ["/auth/", "/admin/", "/cron/", "/stripe/", "/health/", "/request-invite/", "/request-to-join/", "/member-images/", "/insurance-certificates/", "/members/", "/messages/route.ts"];
    const unguarded = walk(root)
      .filter((file) => !exempt.some((part) => file.includes(part)))
      .filter((file) => !readFileSync(file, "utf8").includes("insuranceHoldResponse("));
    expect(unguarded).toEqual([]);
  });

  it("lets only the Profile insurance save and the NDA acceptance pass the hold", () => {
    const dir = join(process.cwd(), "src");
    const walk = (d: string): string[] => readdirSync(d).flatMap((name) => {
      const full = join(d, name);
      return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(name) ? [full] : [];
    });
    const users = walk(dir).filter((file) => readFileSync(file, "utf8").includes("insuranceSubmission: true")).map((file) => file.slice(dir.length + 1)).sort();
    expect(users).toEqual(["actions/member-nda.ts", "actions/profile.ts"]);
  });
});

describe("the suspended Profile save writes insurance only", () => {
  it("ignores bio, website and the rest of the form, saves the policy and lifts the suspension", async () => {
    vi.resetModules();
    const tx = { user: { update: vi.fn() }, insuranceCertificate: { upsert: vi.fn() }, insurancePolicy: { deleteMany: vi.fn(), createMany: vi.fn() } };
    db.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
    db.insuranceCertificate.findUnique.mockResolvedValue({ id: "c1" });
    db.insurancePolicy.findMany.mockResolvedValue([{ type: "GL", expiresOn: new Date(Date.now() + 90 * 86_400_000) }]);
    state.phase = "action";
    state.path = "/profile";
    state.nextAction = "abc";
    const { saveProfile } = await import("@/actions/profile");
    const form = new FormData();
    form.set("bio", "should not be saved");
    form.set("website", "evil.example");
    form.set("insuranceAgentEmail", "agent@example.com");
    form.set("insuranceAgentPhone", "555-0100");
    form.append("policyType", "GL");
    const next = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    form.append("policyExpiration", next);
    form.append("policyLimit", "1000000");
    form.append("policyAggregate", "2000000");
    form.append("policyOtherName", "");
    const to = await redirectOf(() => saveProfile(form));
    expect(to).toContain("/profile?notice=");
    expect(decodeURIComponent(to!)).toContain("Insurance saved. Your account is active again.");
    const data = tx.user.update.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual(["insuranceAgentEmail", "insuranceAgentName", "insuranceAgentPhone"]);
    expect(tx.insurancePolicy.createMany).toHaveBeenCalledTimes(1);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { insuranceSuspendedAt: null } });
    expect(db.businessCard.create).not.toHaveBeenCalled();
  });
});

describe("follow-up copy", () => {
  it("has Spanish, German and Japanese for every new string, without banned words", () => {
    for (const key of [INSURANCE_HELD_MESSAGE, "Save insurance", "Insurance saved", "Insurance saved. Your account is active again."]) {
      const row = NOV17_PHRASES[key];
      expect(row, key).toBeTruthy();
      expect(row.every(Boolean)).toBe(true);
      for (const text of [key, ...row]) expect(text).not.toMatch(/\b(?:invite(?:d|-only)?|founding member|limited)\b/i);
    }
    expect(NOV17_PHRASES["This page is unavailable until your insurance is updated."]).toBeUndefined();
  });
});
