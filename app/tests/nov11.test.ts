import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conversationListState } from "@/lib/conversations";
import { phrase } from "@/lib/i18n/phrases";
import { NOV11_PHRASES } from "@/lib/i18n/nov11-phrases";
import { isSubOnly, subCanReach } from "@/lib/sub-access";

const read = (f: string) => readFileSync(`src/${f}`, "utf8");
const emptyKey = "When a general contractor or architect posts a project seeking your category, it will appear here.";

describe("Nov 11: member feedback", () => {
  it("all three Opportunities empty states distinguish sub-only members and preserve filter copy", () => {
    const deals = read("app/(app)/deals/page.tsx");
    const ledger = read("components/ledger-projects.tsx");
    expect(deals).toContain(`isSubOnly(user) ? tx("${emptyKey}")`);
    expect(deals).toContain('tx("Projects here come from general contractors and architects.")');
    expect(ledger.split(`isSubOnly({ role, extraCategories }) ? tx("${emptyKey}")`)).toHaveLength(3);
    for (const source of [deals, ledger]) {
      expect(source).toContain('tx("No projects match these filters.")');
      expect(source).toContain('tx("New projects seeking your category will appear here as soon as they\'re approved.")');
    }
    for (const page of ["feed", "projects"]) expect(read(`app/(app)/${page}/page.tsx`)).toContain("extraCategories={user.extraCategories}");
    expect(isSubOnly({ role: "SUBCONTRACTOR", extraCategories: "" })).toBe(true);
    expect(isSubOnly({ role: "SUBCONTRACTOR", extraCategories: "GENERAL_CONTRACTOR" })).toBe(false);
  });

  it("six sent requests and no lastFromMe conversations show count 6 without contradictory empty copy", async () => {
    const sent = conversationListState([], "sent", "", 6);
    expect(sent.rows).toEqual([]);
    expect(sent.sentCount).toBe(6);
    expect(sent.showEmpty).toBe(false);
    expect(conversationListState([], "sent", "", 0).showEmpty).toBe(true);
    expect(conversationListState([], "sent", "missing", 6).showEmpty).toBe(true);
    const conversations = [{ name: "Elena", sub: "Company", lastFromMe: true }, { name: "Marcus", sub: "Company", lastFromMe: false }];
    expect(conversationListState(conversations, "sent", "", 6).sentCount).toBe(7);
    expect(conversationListState(conversations, "sent", "", 6).rows).toHaveLength(1);
    const component = read("components/conversation-list.tsx");
    expect(component).toContain("const { rows, sentCount, showEmpty } = conversationListState");
    expect(component).toContain("{showEmpty ? (");
    expect(component).toContain('q ? tx("No conversations match this search.") : tab === "sent" ? tx("No sent messages yet.")');
    const page = read("app/(app)/messages/page.tsx");
    expect(page).toMatch(/<ConversationList[\s\S]*<SentList[\s\S]*<\/ConversationList>/);
    expect(page).not.toContain("take: 100");
  });

  it("directory cards offer reachable members a circle request and show each connection state", () => {
    const page = read("app/(app)/directory/page.tsx");
    const control = read("components/circle-request-control.tsx");
    expect(page).toContain("CircleRequestControl viewer={viewer} member={row}");
    expect(control).toContain("subCanReach(viewer, member)");
    expect(control).toContain("<form action={requestConnection}");
    expect(control).toContain('name="toId" value={member.id}');
    expect(control).toContain('name="back" value={back}');
    expect(control).toContain('tx("Add to My Circle")');
    expect(control).toContain('state === "INCOMING"');
    expect(control).toContain('href="/network"');
    expect(page).toContain("<Banner error=");
    expect(page).toContain('const key of ["q", "category", "location"]');
    expect(page.match(/prisma.connection.findMany/g)).toHaveLength(1);
    expect(page.indexOf("prisma.connection.findMany")).toBeLessThan(page.indexOf("shown.map((row) => {"));
    expect(control).toContain("min-h-11 w-full whitespace-normal");
    const sub = { role: "SUBCONTRACTOR", extraCategories: "" };
    expect(subCanReach(sub, { role: "GENERAL_CONTRACTOR" })).toBe(true);
    expect(subCanReach(sub, { role: "DEVELOPER" })).toBe(false);
    expect(subCanReach(sub, { role: "RE_ATTORNEY" })).toBe(false);
  });

  it("circle requests allow new contacts while actual messaging keeps its gate and safe return paths", () => {
    const social = read("actions/social.ts");
    const body = social.split("export async function requestConnection")[1].split("export async function respondConnection")[0];
    expect(body).not.toContain("canMessagePair");
    for (const check of ["canConnect", "eligibleForDirectory", "isBlocked", "subCanReach", "withinRateLimit", "existing?.status"]) expect(body).toContain(check);
    expect(body).toContain('rawBack.startsWith("/") && !rawBack.startsWith("//")');
    expect(body).toContain('revalidatePath("/directory")');
    expect(body).toContain('dest("notice", "Request sent.", `/messages/${sent.conversationId}`)');
    expect(body).toContain('`/messages/${sent.conversationId}`');
    expect(social.split("export async function openConversation")[1]).toContain("canMessagePair");
  });

  it("every new phrase and reused action wording is translated into ES, DE and JA", () => {
    for (const key of [...Object.keys(NOV11_PHRASES), "Add to My Circle", "Request sent.", "Respond"]) {
      for (const locale of ["es", "de", "ja"] as const) {
        expect(phrase(locale, key).trim()).not.toBe("");
        expect(phrase(locale, key)).not.toBe(key);
      }
    }
    const source = read("lib/i18n/phrases.ts");
    expect(source.indexOf("Object.entries(NOV11_PHRASES)")).toBeGreaterThan(source.indexOf("Object.entries(NOV10_PHRASES)"));
  });
});
