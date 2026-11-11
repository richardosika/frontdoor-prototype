import { describe, expect, it } from "vitest";
import { signInErrorCode, signInErrorFromCode } from "@/lib/sign-in-fallback";
import { GENERIC_SIGN_IN_ERROR, PENDING_APPROVAL_ERROR } from "@/lib/sign-in";

describe("sign-in fallback error codes", () => {
  it("round-trips known messages and ignores anything else", () => {
    expect(signInErrorFromCode(signInErrorCode(PENDING_APPROVAL_ERROR))).toBe(PENDING_APPROVAL_ERROR);
    expect(signInErrorFromCode(signInErrorCode("unexpected"))).toBe(GENERIC_SIGN_IN_ERROR);
    expect(signInErrorFromCode("<script>")).toBe("");
    expect(signInErrorFromCode(undefined)).toBe("");
  });
});
