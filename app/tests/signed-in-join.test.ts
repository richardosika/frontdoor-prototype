import { describe, expect, it } from "vitest";
import {
  alreadySignedInNotice,
  isSignedInJoinEntry,
  loggedInPublicRedirect,
  memberLoginHref,
  sessionCutoffReport,
  sessionIssuedAtAccepted,
} from "@/lib/session-gate";

describe("signed-in request to join", () => {
  it("names the account and tells them to sign out first", () => {
    expect(alreadySignedInNotice("Marcus Hale")).toBe(
      "You're already signed in as Marcus Hale. To request to join as someone else, sign out first.",
    );
    expect(alreadySignedInNotice("  ")).toBe(
      "You're already signed in as this account. To request to join as someone else, sign out first.",
    );
  });

  it("treats the request-to-join anchor and the apply page as join entries", () => {
    expect(isSignedInJoinEntry("/feed", "#request-invite")).toBe(true);
    expect(isSignedInJoinEntry("/", "#request-invite")).toBe(true);
    expect(isSignedInJoinEntry("/apply", "")).toBe(true);
    expect(isSignedInJoinEntry("/feed", "")).toBe(false);
    expect(isSignedInJoinEntry("/feed", "#ledger")).toBe(false);
    expect(isSignedInJoinEntry("/apply/status/token", "")).toBe(false);
  });

  it("sends member login to the feed when a session already exists", () => {
    expect(memberLoginHref(true)).toBe("/feed");
    expect(memberLoginHref(false)).toBe("/login");
    expect(loggedInPublicRedirect("/login")).toBe("/feed");
    expect(loggedInPublicRedirect("/")).toBe("/feed");
  });

  it("rejects sessions issued before the reset and still allows a fresh sign-in", () => {
    expect(sessionIssuedAtAccepted(100, undefined, false)).toBe(true);
    expect(sessionIssuedAtAccepted(100, "", false)).toBe(true);
    expect(sessionIssuedAtAccepted(100, "200", false)).toBe(false);
    expect(sessionIssuedAtAccepted(201, "200", false)).toBe(true);
    expect(sessionIssuedAtAccepted(200, "200", false)).toBe(false);
    expect(sessionIssuedAtAccepted(undefined, "200", true)).toBe(true);
    expect(sessionIssuedAtAccepted("nope", "200", false)).toBe(false);
    expect(sessionIssuedAtAccepted(1760000001, "1760000000000", false, 1760000002)).toBe(true);
    expect(sessionIssuedAtAccepted(1760000000, "1760000000000", false, 1760000002)).toBe(false);
    expect(sessionIssuedAtAccepted(1000, "5000", false, 1000)).toBe(true);
    expect(sessionCutoffReport(undefined, 1000)).toBe("SESSION_CUTOFF present=0");
    expect(sessionCutoffReport("1760000000000", 1760000002)).toBe("SESSION_CUTOFF present=1 digits=13 accepts_now=1");
  });
});
