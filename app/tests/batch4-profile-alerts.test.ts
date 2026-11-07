import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PHRASES } from "@/lib/i18n/phrases";
import { NEW_MEMBER_ALERT_TITLE, matchNewMember, memberAlertWhere } from "@/lib/member-alerts";
import { centerCrop, cropRect, parseCrop, processImage, sniffImage } from "@/lib/member-images";

const ROOT = path.join(__dirname, "..", "src");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const BANNED = /\b(invite|invited|invite-only|founding member|limited)\b/i;

describe("member alerts", () => {
  it("never include staff or applicant notices", () => {
    expect(memberAlertWhere("u1")).toEqual({ userId: "u1", audience: "member", NOT: { href: { startsWith: "/admin" } } });
    expect(read("app/(app)/alerts/page.tsx")).toContain("memberAlertWhere(");
    expect(read("app/(app)/layout.tsx")).toContain("memberAlertWhere(");
    expect(read("lib/notify.ts")).toMatch(/audience: "admin"/);
  });
  it("matches new members to approved projects seeking their category", () => {
    const projects = [
      { userId: "owner", name: "Ironbound Lofts", seeking: "FINANCING", reviewStatus: "APPROVED" },
      { userId: "owner", name: "Pending one", seeking: "FINANCING", reviewStatus: "PENDING" },
      { userId: "other", name: "Builders wanted", seeking: "GENERAL_CONTRACTOR", reviewStatus: "APPROVED" },
      { userId: "lender", name: "Own project", seeking: "FINANCING", reviewStatus: "APPROVED" },
    ];
    const matches = matchNewMember({ id: "lender", role: "LENDER" }, projects);
    expect([...matches.entries()]).toEqual([["owner", ["Ironbound Lofts"]]]);
    expect(PHRASES[NEW_MEMBER_ALERT_TITLE]).toHaveLength(3);
  });
});

describe("member images", () => {
  it("recognises accepted formats by their bytes", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).png().toBuffer();
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).gif().toBuffer();
    const jpg = await sharp(png).jpeg().toBuffer();
    const webp = await sharp(png).webp().toBuffer();
    expect([png, gif, jpg, webp].map((b) => sniffImage(new Uint8Array(b)))).toEqual(["png", "gif", "jpeg", "webp"]);
    const heic = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0]);
    expect(sniffImage(heic)).toBe("heic");
    expect(sniffImage(new TextEncoder().encode("%PDF-1.7 not an image"))).toBeNull();
  });
  it("parses and clamps crops", () => {
    expect(parseCrop("nonsense")).toBeNull();
    expect(parseCrop(JSON.stringify({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 }))).toEqual({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 });
    const rect = cropRect({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, 1000, 800);
    expect(rect.left + rect.width).toBeLessThanOrEqual(1000);
    expect(rect.top + rect.height).toBeLessThanOrEqual(800);
    const c = centerCrop(1000, 1000, 3.2);
    expect(c.w).toBe(1);
    expect(c.h).toBeCloseTo(1 / 3.2);
  });
  it("resizes avatars, covers and gallery photos to WebP on the server", async () => {
    const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#2a4a3b" } }).png().toBuffer();
    const avatar = await processImage(new Uint8Array(big), "AVATAR", { x: 0.2, y: 0.1, w: 0.4, h: 0.6 });
    expect([avatar.contentType, avatar.width, avatar.height]).toEqual(["image/webp", 512, 512]);
    const cover = await processImage(new Uint8Array(big), "COVER", null);
    expect([cover.width, cover.height]).toEqual([1600, 500]);
    const gif = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#fff" } }).gif().toBuffer();
    const gallery = await processImage(new Uint8Array(gif), "GALLERY", null);
    expect(gallery.width).toBe(1600);
    expect(gallery.height).toBe(800);
  });
});

describe("profile photos and messages empty state", () => {
  it("uses the photo instead of initials and the cover instead of the green banner", () => {
    expect(read("components/avatar.tsx")).toContain("/api/member-images/");
    expect(read("components/profile-view.tsx")).toContain("member.coverId");
    expect(read("app/api/member-images/[id]/route.ts")).toContain('status !== "ACTIVE"');
  });
  it("shows a full-width helpful empty state with the three next steps", () => {
    const page = read("app/(app)/messages/page.tsx");
    expect(page).toContain('data-testid="messages-empty"');
    for (const href of ["/profile#add-project", "/deals", "/network"]) expect(page).toContain(href);
    expect(read("components/ledger-projects.tsx")).toContain('id="ledger-seeking"');
  });
  it("every new phrase is translated and avoids banned words", () => {
    const strings = new Set<string>();
    for (const file of ["components/profile-photos.tsx", "app/(app)/messages/page.tsx", "app/(app)/alerts/page.tsx"]) {
      for (const match of read(file).matchAll(/\btx\("((?:[^"\\]|\\.)+)"\)/g)) strings.add(match[1]);
    }
    for (const match of read("actions/images.ts").matchAll(/go\("(?:error|notice)", "([^"]+)"\)/g)) strings.add(match[1]);
    for (const match of read("actions/images.ts").matchAll(/"([A-Z][^"]+\.)"/g)) strings.add(match[1]);
    expect([...strings].filter((text) => !PHRASES[text])).toEqual([]);
    for (const text of strings) {
      expect(text).not.toMatch(BANNED);
      for (const t of PHRASES[text]) expect(t).not.toMatch(/limitad|begrenzt|限定|招待/);
    }
  });
});
