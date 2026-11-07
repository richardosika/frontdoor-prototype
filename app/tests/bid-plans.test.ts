import { describe, expect, it } from "vitest";
import { canOpenRequest, isVerifiedGc, planType } from "@/lib/bid-plans";

const gc = { id: "g", role: "GENERAL_CONTRACTOR", status: "ACTIVE", paymentStatus: "PAID" };

describe("bid plans", () => {
  it("detects plan file types from bytes", () => {
    expect(planType("a.pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
    expect(planType("a.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]))).toBe("image/png");
    expect(planType("a.dwg", new TextEncoder().encode("AC1032xxxx"))).toBe("application/acad");
    expect(planType("a.exe", new TextEncoder().encode("MZ......"))).toBeNull();
  });
  it("lets any verified GC open a GC request without being picked", () => {
    expect(canOpenRequest({ viewer: gc, requesterId: "d", recipientIds: [], templateCategory: "GENERAL_CONTRACTOR" })).toBe("open");
    expect(canOpenRequest({ viewer: { ...gc, paymentStatus: "DUE" }, requesterId: "d", recipientIds: [], templateCategory: "GENERAL_CONTRACTOR" })).toBeNull();
    expect(canOpenRequest({ viewer: gc, requesterId: "d", recipientIds: [], templateCategory: "INSURANCE" })).toBeNull();
    expect(canOpenRequest({ viewer: { ...gc, role: "BROKER" }, requesterId: "d", recipientIds: ["g"], templateCategory: "INSURANCE" })).toBe("recipient");
    expect(isVerifiedGc({ ...gc, status: "SUSPENDED" })).toBe(false);
  });
});
