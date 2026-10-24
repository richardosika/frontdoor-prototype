import { describe, expect, it } from "vitest";
import { BUSINESS_CARD_MAX_BYTES, sniffBusinessCard, validateBusinessCard } from "@/lib/business-card";
import { AUDIT_TIME_ZONE, formatAuditTime } from "@/lib/format";
import { isRenderedSystemNotice, isSystemNotice, systemNoticeLabel, systemNoticeLabelFor } from "@/lib/messaging";
import { MEMBER_CHECKS, committeeFileLabel, verificationDenial, verificationQueueLabel } from "@/lib/verification";

describe("business card files", () => {
  it("accepts jpg, png, and pdf only when the type matches the bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(sniffBusinessCard(jpeg)).toBe("image/jpeg");
    expect(validateBusinessCard({ contentType: "image/jpg", bytes: jpeg }).ok).toBe(true);
    expect(validateBusinessCard({ contentType: "image/png", bytes: png }).ok).toBe(true);
    expect(validateBusinessCard({ contentType: "application/pdf", bytes: pdf }).ok).toBe(true);
    expect(validateBusinessCard({ contentType: "image/png", bytes: jpeg }).ok).toBe(false);
    expect(validateBusinessCard({ contentType: "text/html", bytes: new Uint8Array([0x3c, 0x68, 0x74, 0x6d]) }).ok).toBe(false);
    const oversized = new Uint8Array(BUSINESS_CARD_MAX_BYTES + 1);
    oversized.set(jpeg);
    expect(validateBusinessCard({ contentType: "image/jpeg", bytes: oversized }).ok).toBe(false);
  });

  it("names the checklist step and keeps the card route admin-only", () => {
    expect(MEMBER_CHECKS.find((item) => item.key === "license")?.label).toBe("Match business card to public records");
    expect(verificationDenial({ path: "/api/admin/verification/cards/card_1", actor: null })).toBe(404);
    expect(verificationDenial({ path: "/api/admin/verification/cards/card_1", actor: { isAdmin: false } })).toBe(403);
  });
});

describe("queue labels and system notices", () => {
  it("disambiguates projects with the sponsor and city", () => {
    expect(
      verificationQueueLabel({
        subject: "PROJECT",
        user: null,
        project: { name: "Court Street Flats", location: "Newark, NJ", user: { name: "Nora Singh" } },
      }),
    ).toBe("Court Street Flats · Nora Singh · Newark, NJ");
    expect(
      verificationQueueLabel({
        subject: "PROJECT",
        user: null,
        project: { name: "Newark Ave Mixed-Use", location: "Newark, NJ", year: 2024, user: { name: "Elena Voss" } },
      }),
    ).toBe("Newark Ave Mixed-Use · Elena Voss · Newark, NJ · 2024");
    expect(committeeFileLabel(true)).toBe("Committee file · Verified");
    expect(committeeFileLabel(false)).toBe("Committee file · Verification in progress");
  });

  it("renders access, deal, connection, and vouch notices apart from chat", () => {
    expect(isSystemNotice("ACCESS")).toBe(true);
    expect(isSystemNotice("DEAL")).toBe(true);
    expect(isSystemNotice("CONNECTION")).toBe(true);
    expect(isSystemNotice("VOUCH")).toBe(true);
    expect(isSystemNotice("TEXT")).toBe(false);
    expect(isSystemNotice("INTRO")).toBe(false);
    expect(systemNoticeLabel("ACCESS")).toBe("Access");
    expect(isRenderedSystemNotice("TEXT", "Rachel Kim requested access to the deal.")).toBe(true);
    expect(isRenderedSystemNotice("TEXT", "Marcus Hale approved your request for the room.")).toBe(true);
    expect(isRenderedSystemNotice("TEXT", "Tara Nguyen asked a question in the deal room for Newark.")).toBe(true);
    expect(isRenderedSystemNotice("TEXT", "Happy to review the deck.")).toBe(false);
    expect(systemNoticeLabelFor("TEXT", "asked a question in the deal room")).toBe("Deal room");
  });

  it("labels audit times in America/New_York", () => {
    const label = formatAuditTime(new Date("2026-10-24T16:44:00Z"));
    expect(label).toContain(`(${AUDIT_TIME_ZONE})`);
    expect(label).toContain("2026");
  });
});
