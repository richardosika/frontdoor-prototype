import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { ALERT_DIGESTS, ALERT_EMAIL_TYPES, readAlertPrefs } from "@/lib/alert-prefs";
import { PHRASES } from "@/lib/i18n/phrases";
import { DEAL_SIZE_BANDS, gettingStarted, matchesSlimFilters, memberNav, parseDollars, projectAccessible, readSlimFilters } from "@/lib/member-reach";

const BANNED = /\b(invite|invited|invite-only|founding member|limited)\b|invitad|einlad|招待|limitad|begrenzt/i;
const read = (p: string) => readFileSync(p, "utf8");
const project = { userId: "o", reviewStatus: "APPROVED", seeking: "GENERAL_CONTRACTOR,FINANCING" };

describe("#25 project access", () => {
  it("sought categories and the owner's circle see it; others do not", () => {
    expect(projectAccessible(project, { id: "g", isAdmin: false, role: "GENERAL_CONTRACTOR", inOwnerCircle: false })).toBe(true);
    expect(projectAccessible(project, { id: "l", isAdmin: false, role: "LENDER", inOwnerCircle: false })).toBe(true);
    expect(projectAccessible(project, { id: "i", isAdmin: false, role: "INSURANCE", inOwnerCircle: false })).toBe(false);
    expect(projectAccessible(project, { id: "i", isAdmin: false, role: "INSURANCE", inOwnerCircle: true })).toBe(true);
    expect(projectAccessible({ ...project, reviewStatus: "PENDING_REVIEW" }, { id: "g", isAdmin: false, role: "GENERAL_CONTRACTOR", inOwnerCircle: true })).toBe(false);
    expect(projectAccessible({ ...project, seeking: "" }, { id: "a", isAdmin: true, role: "INSURANCE", inOwnerCircle: false })).toBe(true);
  });
  it("the project page renders Project not available instead of anything about the project", () => {
    const page = read("src/app/(app)/projects/[id]/page.tsx");
    expect(page).toContain('if (view === "hidden") return <ProjectNotAvailable');
    expect(read("src/lib/member-profile.ts")).toContain("projectAccessible(");
  });
});

describe("#26 no open feed", () => {
  it("the Ledger and Deals pages never load posts", () => {
    for (const file of ["src/app/(app)/feed/page.tsx", "src/app/(app)/deals/page.tsx", "src/app/(app)/network/page.tsx"]) {
      const source = read(file);
      expect(source).not.toContain("prisma.post.");
      expect(source).not.toContain("toggleLike");
      expect(source).not.toContain("reportPost");
    }
    expect(read("src/app/(app)/feed/page.tsx")).not.toContain("ledger.recentTitle");
  });
  it("a deal page is closed to members it is not seeking", () => {
    expect(read("src/app/(app)/deals/[id]/page.tsx")).toContain('data-testid="deal-not-available"');
  });
});

describe("#27 / #28 navigation", () => {
  it("developers get Find your team and no Network; others get Opportunities and My Circle", () => {
    expect(memberNav("DEVELOPER").map((t) => t.label)).toEqual(["Ledger", "Find your team", "Messages", "Profile"]);
    expect(memberNav("GENERAL_CONTRACTOR").map((t) => t.label)).toEqual(["Ledger", "Opportunities", "My Circle", "Messages", "Profile"]);
  });
  it("nobody lists the whole membership on Network; the full directory stays in admin", () => {
    const network = read("src/app/(app)/network/page.tsx");
    expect(network).not.toContain("prisma.user.findMany");
    expect(network).toContain('redirect("/deals#my-circle")');
    expect(read("src/app/(app)/deals/page.tsx")).not.toContain("All roles");
    expect(read("src/app/(app)/deals/page.tsx")).not.toContain("Post a deal");
  });
  it("Messages empty state points developers to Find your team", () => {
    const messages = read("src/app/(app)/messages/page.tsx");
    expect(messages).toContain('tx("Find your team")');
    expect(messages).not.toContain('tx("Projects seeking your category")');
  });
});

describe("#21 slim filters", () => {
  it("parses deal sizes", () => {
    expect(parseDollars("$24M")).toBe(24_000_000);
    expect(parseDollars("$2.5 million")).toBe(2_500_000);
    expect(parseDollars("24,000,000")).toBe(24_000_000);
    expect(parseDollars("$850K")).toBe(850_000);
    expect(parseDollars("TBD")).toBeNull();
  });
  it("filters by asset class, state and size only", () => {
    const f = readSlimFilters({ asset: "Multifamily", state: "nj", size: "5to25", role: "LENDER" });
    expect(f).toEqual({ asset: "Multifamily", state: "NJ", size: "5to25" });
    const p = { asset: "Multifamily", state: "NJ", location: "Newark, NJ", valueLabel: "$18M" };
    expect(matchesSlimFilters(p, f)).toBe(true);
    expect(matchesSlimFilters({ ...p, valueLabel: "$40M" }, f)).toBe(false);
    expect(matchesSlimFilters({ ...p, state: "", location: "Austin, TX" }, f)).toBe(false);
    expect(DEAL_SIZE_BANDS).toHaveLength(4);
  });
});

describe("#24 getting started", () => {
  const base = { profileDone: false, ndaAccepted: true, projectCount: 0, seekingSet: false, approvedProject: false, outreachSent: 0, hasPhoto: false };
  it("is tailored for developers and completes itself", () => {
    const items = gettingStarted({ role: "DEVELOPER", ...base });
    expect(items.map((i) => i.id)).toEqual(["nda", "profile", "project", "seeking", "approved", "reach"]);
    expect(items.find((i) => i.id === "nda")?.done).toBe(true);
    // Richard's case: NDA, project and approval true but profile not: only NDA counts; profile is current; rest locked.
    const richard = gettingStarted({ role: "DEVELOPER", ...base, projectCount: 1, approvedProject: true });
    expect(richard.map((i) => i.state)).toEqual(["done", "current", "locked", "locked", "locked", "locked"]);
    expect(richard.filter((i) => i.done)).toHaveLength(1);
    const later = gettingStarted({ role: "DEVELOPER", ...base, profileDone: true, projectCount: 1, approvedProject: true });
    expect(later.map((i) => i.state)).toEqual(["done", "done", "done", "current", "locked", "locked"]);
    const all = gettingStarted({ role: "DEVELOPER", profileDone: true, ndaAccepted: true, projectCount: 1, seekingSet: true, approvedProject: true, outreachSent: 1, hasPhoto: true });
    expect(all.every((i) => i.done)).toBe(true);
  });
  it("other members get their own list, and the box hides when all done", () => {
    expect(gettingStarted({ role: "INSURANCE", ...base }).map((i) => i.id)).toEqual(["nda", "profile", "photo", "work", "reach"]);
    expect(read("src/components/getting-started.tsx")).toContain("if (items.every((item) => item.done)) return null;");
    expect(read("src/app/(app)/feed/page.tsx")).not.toContain("markChecklist");
  });
});

describe("#29 alert emails", () => {
  it("reads the new checkboxes and the digest choice", () => {
    const form = new Map<string, string>([["notifyMatches", "on"], ["notifyDealRoom", "on"], ["alertDigest", "DAILY"]]);
    expect(readAlertPrefs(form)).toEqual({ notifyMatches: true, notifyProjectDecisions: false, notifyDocuments: false, notifyDealRoom: true, alertDigest: "DAILY" });
    expect(readAlertPrefs(new Map()).alertDigest).toBe("INSTANT");
  });
  it("has a migration and the settings section", () => {
    expect(read("prisma/migrations/20261031000000_alert_email_prefs/migration.sql")).toContain('"alertDigest"');
    expect(read("src/app/(app)/settings/page.tsx")).toContain('data-testid="alert-email-settings"');
  });
});

describe("#19 / #20 / referral", () => {
  it("legal pages go back to home", () => {
    const legal = read("src/app/legal/[slug]/page.tsx");
    expect(legal).toContain('tx("Back to home")');
    expect(legal).toContain('"/feed" : "/"');
    expect(legal).not.toContain("Back to apply");
  });
  it("the membership card shows the member type", () => {
    expect(read("src/components/membership-card.tsx")).toContain('data-testid="membership-type"');
    expect(read("src/components/shell.tsx")).toContain("typeLabel={typeLabel}");
  });
  it("Refer a colleague sends the approved referral email", () => {
    expect(read("src/components/colleague-invite.tsx")).toContain("sendReferral");
    expect(read("src/actions/referral.ts")).toContain("referralEmail(");
  });
});

describe("copy", () => {
  const keys = [
    ...ALERT_EMAIL_TYPES.map((a) => a.label),
    ...ALERT_DIGESTS.map((a) => a.label),
    ...gettingStarted({ role: "DEVELOPER", profileDone: false, ndaAccepted: false, projectCount: 0, seekingSet: false, approvedProject: false, outreachSent: 0, hasPhoto: false }).map((i) => i.label),
    ...gettingStarted({ role: "LENDER", profileDone: false, ndaAccepted: false, projectCount: 0, seekingSet: false, approvedProject: false, outreachSent: 0, hasPhoto: false }).map((i) => i.label),
    ...memberNav("DEVELOPER").map((t) => t.label),
    ...memberNav("LENDER").map((t) => t.label),
    ...DEAL_SIZE_BANDS.map((b) => b.label),
    "Opportunities for you", "Start", "Locked until the earlier steps are done", "Complete each step in order. The next step opens when the one before it is done.", "Project not available", "Back to home", "Referral sent", "Alert emails", "Past work", "Shared projects",
  ];
  it("is in all four languages and never uses banned words", () => {
    for (const key of keys) {
      const row = PHRASES[key];
      expect(row, key).toBeDefined();
      for (const value of [key, ...row]) {
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toMatch(BANNED);
      }
    }
  });
});

describe("#30 profile fields", () => {
  it("drops What I am looking for, hides services for developers, keeps saved data", () => {
    const editor = read("src/components/profile-editor.tsx");
    expect(editor).not.toContain('name="lookingFor"');
    expect(editor).toContain('member.role !== "DEVELOPER"');
    expect(editor).toContain('"About my services"');
    const action = read("src/actions/profile.ts");
    expect(action).not.toMatch(/lookingFor[,:]/);
    expect(action).toContain('formData.has("offering")');
    for (const key of ["About my services", "A short bio shown on your card when developers look for their team."]) expect(PHRASES[key]).toHaveLength(3);
  });
});

describe("#31 photo hints", () => {
  it("each upload says what to upload and where it shows, in all languages", async () => {
    const { PHOTO_HINTS } = await import("@/lib/photo-hints");
    for (const key of [...Object.values(PHOTO_HINTS), "Where it shows"]) {
      expect(PHRASES[key], key).toHaveLength(3);
      for (const v of [key, ...PHRASES[key]]) expect(v).not.toMatch(BANNED);
    }
    const src = read("src/components/profile-photos.tsx");
    for (const k of ["avatar", "cover", "gallery"]) expect(src).toContain(`<PlacementHint kind="${k}"`);
  });
});

describe("#32 track record", () => {
  it("renames the section per role, shows compact linked rows, fixes Devloper", async () => {
    const { fixRoleTypos } = await import("@/lib/project-contact");
    expect(fixRoleTypos("Devloper")).toBe("Developer");
    expect(fixRoleTypos("Lead devloper")).toBe("Lead developer");
    const view = read("src/components/profile-view.tsx");
    expect(view).toContain('tx("My Projects") : tx("Past Projects")');
    expect(view).not.toContain("<ProjectDocuments");
    expect(view).not.toContain("setProjectSharing");
    expect(view).toContain('data-testid="track-project-row"');
    for (const k of ["My Projects", "Past Projects"]) expect(PHRASES[k]).toHaveLength(3);
  });
});

describe("#33 money inputs", () => {
  it("formats as you type per language and stores digits", async () => {
    const { formatMoneyDigits, moneyDigits } = await import("@/lib/money");
    expect(formatMoneyDigits("15000000", "en")).toBe("15,000,000");
    expect(formatMoneyDigits("15000000", "de")).toBe("15.000.000");
    expect(formatMoneyDigits("15000000", "es")).toBe("15.000.000");
    expect(formatMoneyDigits("15000000", "ja")).toBe("15,000,000");
    expect(moneyDigits("$15,000,000")).toBe("15000000");
    expect(moneyDigits("$24M")).toBe("24000000");
    expect(moneyDigits("15.000.000")).toBe("15000000");
    expect(read("src/components/project-form.tsx")).toContain('<MoneyInput name="valueLabel"');
  });
});

describe("#36 pending project in Getting started", () => {
  it("shows step 5 waiting and keeps step 6 locked while a project is pending", () => {
    const items = gettingStarted({ role: "DEVELOPER", profileDone: true, ndaAccepted: true, projectCount: 2, seekingSet: true, approvedProject: true, projectPending: true, outreachSent: 1, hasPhoto: true });
    expect(items.map((i) => i.state)).toEqual(["done", "done", "done", "done", "waiting", "locked"]);
    expect(items[4].done).toBe(false);
    expect(read("src/app/(app)/feed/page.tsx")).toContain('project.reviewStatus === "APPROVED" && parseSeeking(project.seeking).length > 0');
    expect(PHRASES["Waiting for staff approval"]).toHaveLength(3);
  });
  it("Find your team offers outreach only for approved projects", () => {
    expect(read("src/lib/ledger-projects.ts")).toContain('project.reviewStatus === "APPROVED" && parseSeeking(project.seeking).length > 0');
  });
});
