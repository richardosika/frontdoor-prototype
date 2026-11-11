import { describe, expect, it } from "vitest";
import { looksLikeGateUsername, NOT_AN_EMAIL_SIGN_IN_ERROR } from "@/lib/sign-in";
import { signInErrorCode, signInErrorFromCode } from "@/lib/sign-in-fallback";
import { phrase } from "@/lib/i18n/phrases";

describe("member sign-in with a gate username (Nov 6, Julia)", () => {
  it("flags values that cannot be an email", () => {
    expect(looksLikeGateUsername("julia")).toBe(true);
    expect(looksLikeGateUsername(" Julia ")).toBe(true);
    expect(looksLikeGateUsername("julia@buildpro")).toBe(true);
    expect(looksLikeGateUsername("julia@buildpro-cs.com")).toBe(false);
    expect(looksLikeGateUsername(" julia@buildpro-cs.com ")).toBe(false);
    expect(looksLikeGateUsername("")).toBe(false);
  });
  it("round-trips through the fallback code and is translated", () => {
    expect(signInErrorFromCode(signInErrorCode(NOT_AN_EMAIL_SIGN_IN_ERROR))).toBe(NOT_AN_EMAIL_SIGN_IN_ERROR);
    for (const loc of ["es", "de", "ja"] as const) expect(phrase(loc, NOT_AN_EMAIL_SIGN_IN_ERROR)).not.toBe(NOT_AN_EMAIL_SIGN_IN_ERROR);
  });
});
