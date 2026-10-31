import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyDetailsIssues, type ApplyDetailsInput } from "@/lib/apply-details";
import { validateApplication } from "@/lib/domain";
import { dealMatchReasons, pickLeadDeals } from "@/lib/ledger-match";
import { settleProjectQuery } from "@/lib/project-filter";
import { isWebUrl, normalizeWebUrl, webUrlIssue } from "@/lib/web-url";

const ROOT = path.join(__dirname, "..", "src");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe("web address fields", () => {
  it("accepts bare domains and LinkedIn paths", () => {
    for (const value of ["whatever.com", "www.whatever.com", "linkedin.com/in/name", "https://example.com", "http://a.co/x?y=1", ""]) {
      expect(isWebUrl(value), value).toBe(true);
    }
  });
  it("rejects things that are not web addresses", () => {
    for (const value of ["not a site", "hello", "ftp//x", "example"]) expect(isWebUrl(value), value).toBe(false);
    expect(webUrlIssue("Website", "hello")).toMatch(/web address/);
  });
  it("adds https:// before saving", () => {
    expect(normalizeWebUrl("whatever.com")).toBe("https://whatever.com");
    expect(normalizeWebUrl(" www.whatever.com ")).toBe("https://www.whatever.com");
    expect(normalizeWebUrl("linkedin.com/in/name")).toBe("https://linkedin.com/in/name");
    expect(normalizeWebUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeWebUrl("HTTPS://Example.com")).toBe("HTTPS://Example.com");
    expect(normalizeWebUrl("")).toBe("");
    expect(normalizeWebUrl(undefined)).toBe("");
  });
  it("application checks accept bare addresses on client and server", () => {
    const input: ApplyDetailsInput = {
      firstName: "Ann", lastName: "Lee", email: "ann@example.com", password: "password123", org: "Lee Capital",
      street: "1 Main St", city: "Newark", state: "NJ", zip: "07102", phone: "(201) 555-0100",
      linkedinUrl: "linkedin.com/in/ann", website: "www.example.com", socialLinks: "", referenceEmail: "", referenceEmail2: "", statement: "",
    };
    const ids = applyDetailsIssues(input).map((issue) => issue.id);
    expect(ids).not.toContain("apply-website");
    expect(ids).not.toContain("apply-linkedin");
    const server = validateApplication({ ...input, code: "", role: "SPONSOR", referenceEmails: [] } as never);
    expect(server.join(" ")).not.toMatch(/Website|LinkedIn/);
    expect(applyDetailsIssues({ ...input, website: "nope" }).map((issue) => issue.id)).toContain("apply-website");
  });
  it("no website or LinkedIn input uses type=url", () => {
    for (const file of ["components/join-application.tsx", "components/apply-wizard.tsx", "components/profile-editor.tsx", "components/create-test-applicant.tsx"]) {
      expect(read(file), file).not.toMatch(/type="url"/);
    }
    expect(read("components/profile-editor.tsx")).toContain('inputMode="url"');
    expect(read("components/apply-wizard.tsx")).toMatch(/label="Website" inputMode="url"/);
  });
});

describe("Ledger", () => {
  const prefs = { markets: "NJ,NY", dealTypes: "Debt", assetClasses: "Multifamily" };
  it("explains why a deal matches", () => {
    expect(dealMatchReasons(prefs, { market: "Newark, NJ", assetClass: "Multifamily", text: "Seeking debt" })).toEqual(["NJ", "Multifamily", "Debt"]);
    expect(dealMatchReasons(prefs, { market: "Austin, TX", assetClass: "Office", text: "equity raise" })).toEqual([]);
  });
  it("leads with matches and falls back to recent deals", () => {
    const deals = [
      { id: "old-match", createdAt: new Date("2026-01-01"), deal: { market: "Newark, NJ", assetClass: "Office", text: "" } },
      { id: "new-other", createdAt: new Date("2026-10-01"), deal: { market: "Austin, TX", assetClass: "Office", text: "" } },
    ];
    const lead = pickLeadDeals(prefs, deals);
    expect(lead.matched).toBe(true);
    expect(lead.items.map((item) => item.id)).toEqual(["old-match"]);
    const fallback = pickLeadDeals({ markets: "CA", dealTypes: "", assetClasses: "" }, deals);
    expect(fallback.matched).toBe(false);
    expect(fallback.items.map((item) => item.id)).toEqual(["new-other", "old-match"]);
  });
  it("the Ledger has no open feed tabs; old Seeking links still settle (batch 6 #26)", () => {
    const page = read("app/(app)/feed/page.tsx");
    expect(page).not.toContain('label: "Matched for you"');
    expect(page).not.toContain("Membership status");
    expect(settleProjectQuery("/feed", { tab: "seeking" }, "feed").filters.tab).toBe("requests");
  });
  it("sidebar says Ledger and keeps Settings and Sign out inside the member menu", () => {
    const shell = read("components/shell.tsx");
    expect(read("lib/member-reach.ts")).toContain('label: "Ledger"');
    expect(shell).toContain("<LanguagePicker");
    expect(shell).toContain('data-testid="member-menu"');
    expect(shell).toContain('data-testid="sidebar-membership"');
    const aside = shell.slice(shell.indexOf("<aside"), shell.indexOf("</aside>"));
    expect(aside.indexOf('data-testid="member-menu"')).toBeLessThan(aside.indexOf("<nav"));
    expect(aside.match(/menu\.signOut/g)).toHaveLength(1);
    expect(aside.match(/href="\/settings"/g)).toHaveLength(1);
  });
});

import { LOCALES, isLocale, messagesFor, translate } from "@/lib/i18n/messages";
describe("member platform languages", () => {
  it("offers the same four languages as the application", () => {
    expect(LOCALES.map((item) => item.id)).toEqual(["en", "es", "de", "ja"]);
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
  it("every language has every key, and keeps the wording rules", () => {
    const keys = Object.keys(messagesFor("en")).sort();
    for (const { id } of LOCALES) {
      const dict = messagesFor(id);
      expect(Object.keys(dict).sort()).toEqual(keys);
      for (const value of Object.values(dict)) {
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value).not.toMatch(/invite|invited|founding member|limited|invitación|einladung|招待|限定/i);
      }
    }
  });
  it("fills placeholders", () => {
    expect(translate("es", "ledger.raising", { amount: "$2M", title: "X" })).toBe("Captando $2M — X");
    expect(translate("ja", "nav.ledger")).toBe("レジャー");
  });
});

import { PHRASES, phrase } from "@/lib/i18n/phrases";
import { portalMessageEmail } from "@/lib/messaging";
describe("member platform phrases", () => {
  it("every phrase has Spanish, German and Japanese text, without banned words", () => {
    const banned = /invite|invited|invite-only|founding member|limited|invitación|invitado|einladung|eingeladen|招待|限定|limitad|begrenzt/i;
    for (const [en, values] of Object.entries(PHRASES)) {
      expect(banned.test(en), en).toBe(false);
      expect(values).toHaveLength(3);
      for (const value of values) {
        expect(value.trim().length, en).toBeGreaterThan(0);
        expect(banned.test(value), value).toBe(false);
      }
    }
  });
  it("falls back to English for unknown text and for English", () => {
    expect(phrase("ja", "Some member wrote this")).toBe("Some member wrote this");
    expect(phrase("en", "Deals")).toBe("Deals");
    expect(phrase("de", "Deals")).toBe("Deals");
    expect(phrase("es", "Settings")).toBe("Ajustes");
  });
  it("sends the portal message email in the member's language", () => {
    expect(portalMessageEmail("https://x/messages", "es").subject).toBe("Tiene un mensaje nuevo en Private Floor");
    expect(portalMessageEmail("https://x/messages", "ja").text).toContain("メッセージを開く");
    expect(portalMessageEmail("https://x/messages").subject).toBe("You have a new message on Private Floor");
  });
  it("every member page uses the translator, and the language is saved on the account", () => {
    for (const file of ["deals/page.tsx", "deals/[id]/page.tsx", "deals/[id]/room/page.tsx", "network/page.tsx", "messages/[conversationId]/page.tsx", "alerts/page.tsx", "settings/page.tsx"]) {
      expect(read(`app/(app)/${file}`), file).toMatch(/serverTx\(\)/);
    }
    expect(read("actions/language.ts")).toMatch(/data: \{ locale: value \}/);
    expect(readFileSync(path.join(ROOT, "..", "prisma", "schema.prisma"), "utf8")).toMatch(/locale\s+String\s+@default\("en"\)/);
  });
});
