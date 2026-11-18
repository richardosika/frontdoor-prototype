import { describe, expect, it } from "vitest";
import { duesEmailStillNeeded } from "@/lib/payments";
import { applicationLinkLine } from "@/lib/admin-links";

describe("dues email guard", () => {
  it("sends only while dues are owed", () => {
    expect(duesEmailStillNeeded("DUE")).toBe(true);
    expect(duesEmailStillNeeded("FAILED")).toBe(true);
    expect(duesEmailStillNeeded("PAID")).toBe(false);
    expect(duesEmailStillNeeded("WAIVED")).toBe(false);
    expect(duesEmailStillNeeded("NOT_REQUIRED")).toBe(false);
    expect(duesEmailStillNeeded(undefined)).toBe(false);
  });
});

describe("admin decision email link", () => {
  it("links straight to the application", () => {
    expect(applicationLinkLine("https://x.test/", "abc")).toBe("Open the application: https://x.test/admin/applications/abc");
  });
});
