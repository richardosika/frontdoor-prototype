import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTACT_NOTE_MIN, contactNoteOk } from "@/lib/project-contact";
import { filterConversations } from "@/lib/conversations";
import { phrase } from "@/lib/i18n/phrases";

const read = (f: string) => readFileSync(`src/${f}`, "utf8");

describe("Nov 10: Opportunities and Messages", () => {
  it("a contact request needs a note of at least 10 characters", () => {
    expect(CONTACT_NOTE_MIN).toBe(10);
    expect(contactNoteOk("too short")).toBe(false);
    expect(contactNoteOk("   1234567890  ")).toBe(true);
    expect(read("actions/projects.ts")).toMatch(/if \(!contactNoteOk\(note\)\) go\(back, "error", CONTACT_NOTE_ERROR\)/);
    expect(read("components/reach-out.tsx")).toContain("minLength={CONTACT_NOTE_MIN}");
  });
  it("Opportunities cards have the X with an are-you-sure pop-up, and it also leaves the Ledger", () => {
    expect(read("app/(app)/deals/page.tsx")).toContain("dismissAction={dismissOpportunity} confirmDismiss");
    expect(read("lib/ledger-projects.ts")).toContain("prisma.opportunityDismissal.findMany");
  });
  it("Inbox lists every conversation, Sent the ones where you wrote last, both searchable", () => {
    const rows = [
      { name: "Elena Voss", sub: "Voss & Reed", lastFromMe: true },
      { name: "Marcus Hale", sub: "Hale Row", lastFromMe: false },
    ];
    expect(filterConversations(rows, "inbox").map((r) => r.name)).toEqual(["Elena Voss", "Marcus Hale"]);
    expect(filterConversations(rows, "sent").map((r) => r.name)).toEqual(["Elena Voss"]);
    expect(filterConversations(rows, "inbox", "hale").map((r) => r.name)).toEqual(["Marcus Hale"]);
  });
  it("the Messages page has no buttons", () => {
    const page = read("app/(app)/messages/page.tsx");
    expect(page).not.toMatch(/className=\{btn/);
    expect(page).not.toContain("btnOutline");
  });
  it("new wording is translated", () => {
    for (const key of ["Write a note of at least 10 characters.", "Search messages", "Requests you sent", "Add a short note (at least 10 characters)"]) {
      for (const l of ["es", "de", "ja"] as const) expect(phrase(l, key)).not.toBe(key);
    }
  });
});
