import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { phrase } from "../src/lib/i18n/phrases";
const source = (path: string) => readFileSync(path, "utf8");
const control = source("src/components/circle-request-control.tsx");
const social = source("src/actions/social.ts");
const messages = source("src/app/(app)/messages/page.tsx");
const detail = source("src/app/(app)/messages/sent/[kind]/[id]/page.tsx");

describe("Nov 11 circle controls and sent receipts", () => {
  it("shares guarded circle states across all member entry points", () => {
    expect(control).toContain("!subCanReach(viewer, member)");
    expect(control).toContain("action={requestConnection}");
    for (const text of ["Add to My Circle", "Request sent", "In your circle", "Respond"]) expect(control).toContain(`tx("${text}")`);
    expect(control).toContain('href="/network"');
    expect(control).toContain("min-h-11 w-full whitespace-normal");
    for (const path of ["src/components/recommended-connections.tsx", "src/components/vendor-profile.tsx", "src/app/(app)/directory/page.tsx"]) expect(source(path)).toContain("<CircleRequestControl");
    expect(source("src/components/recommended-connections.tsx")).toContain("prisma.connection.findMany");
    const page = source("src/app/(app)/members/[id]/page.tsx");
    expect(page).toContain("viewer={user}");
    expect(page).toContain("connection={loaded.connection}");
  });
  it("lists and counts all outbound request kinds with receipt links", () => {
    for (const model of ["connection", "projectContact", "introduction"]) {
      expect(messages).toContain(`prisma.${model}.findMany`);
      expect(messages).toContain(`prisma.${model}.count`);
    }
    expect(messages).toContain("/messages/sent/${row.route}/${row.id}");
    expect(messages).not.toContain("/members/${row.to.id}");
  });
  it("shows owned request receipts without profile eligibility checks", () => {
    expect(detail).toContain("{ id, fromId: user.id }");
    for (const text of ["request.to.name", "request.to.org", "request.createdAt", "America/New_York", "Waiting for a reply", "Accepted", "Declined", 'request.status === "PENDING"', "action={withdrawConnection}"]) expect(detail).toContain(text);
    expect(detail).not.toContain("loadMemberProfile");
    expect(detail).not.toContain("paymentStatus");
    const thread = source("src/app/(app)/messages/[conversationId]/page.tsx");
    expect(thread).toContain("conversation.userAId !== user.id && conversation.userBId !== user.id");
  });
  it("keeps creation reach checks and atomic sender and recipient state scopes", () => {
    expect(social).toContain("!subCanReach(user, target)");
    const withdraw = social.slice(social.indexOf("export async function withdrawConnection"), social.indexOf("export async function respondConnection"));
    expect(withdraw).toContain("await requireUser()");
    expect(withdraw).toContain('where: { id: connectionId, fromId: user.id, status: "PENDING" }');
    expect(withdraw).toContain('data: { status: "DECLINED" }');
    expect(social).toContain('where: { id: connection.id, toId: user.id, status: "PENDING" }');
  });
  it("translates new labels in four languages", () => {
    for (const key of ["Request sent", "In your circle", "Circle request", "Withdraw request", "Withdrawing…"]) {
      expect(phrase("en", key)).toBe(key);
      for (const locale of ["es", "de", "ja"] as const) {
        expect(phrase(locale, key)).not.toBe(key);
        expect(phrase(locale, key).length).toBeGreaterThan(0);
      }
    }
  });
  it("keeps changed sources free of excluded terminology", () => {
    const words = [String.fromCharCode(105,110,118,105,116,101), String.fromCharCode(108,105,109,105,116,101,100), String.fromCharCode(102,111,117,110,100,105,110,103,32,109,101,109,98,101,114)];
    const pattern = new RegExp(`\\b(?:${words[0]}(?:d|-only)?|${words[1]}|${words[2]})\\b`, "i");
    for (const path of ["src/components/circle-request-control.tsx", "src/components/recommended-connections.tsx", "src/components/vendor-profile.tsx", "src/app/(app)/directory/page.tsx", "src/app/(app)/members/[id]/page.tsx", "src/app/(app)/messages/page.tsx", "src/app/(app)/messages/sent/[kind]/[id]/page.tsx", "src/actions/social.ts", "src/lib/i18n/phrases.ts", "tests/nov11.test.ts", "tests/nov11c.test.ts"]) expect(source(path), path).not.toMatch(pattern);
  });
});
