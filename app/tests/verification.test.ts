import { describe, expect, it } from "vitest";
import {
  PUBLIC_VERIFICATION_KEYS,
  canMarkCaseVerified,
  canOpenProjectToCounterparties,
  canPromoteTierFromVouch,
  checklistComplete,
  effectiveVerificationStatus,
  gateVerificationRequest,
  isAwaitingVerification,
  referenceCheckForApplication,
  statusForDecision,
  toPublicVerification,
  verificationDenial,
  vouchEvidenceNote,
} from "@/lib/verification";

const passed = [{ result: "PASS" }, { result: "PASS" }];
const now = new Date("2026-10-24T12:00:00Z");

describe("verification access", () => {
  it("hides the module from anonymous callers", () => {
    expect(verificationDenial({ path: "/admin/verification", actor: null })).toBe(404);
    expect(verificationDenial({ path: "/admin/verification/case_1", actor: null })).toBe(404);
    expect(verificationDenial({ path: "/api/admin/verification", actor: null })).toBe(404);
    const response = gateVerificationRequest({ path: "/api/admin/verification", actor: null });
    expect(response?.status).toBe(404);
  });

  it("returns 403 for a signed-in member on the API and 404 on the page", () => {
    const member = { isAdmin: false };
    expect(verificationDenial({ path: "/api/admin/verification", actor: member })).toBe(403);
    expect(verificationDenial({ path: "/api/admin/verification/case_1", actor: member })).toBe(403);
    expect(verificationDenial({ path: "/admin/verification", actor: member })).toBe(404);
    expect(verificationDenial({ path: "/admin/verification/case_1", actor: member })).toBe(404);
    expect(gateVerificationRequest({ path: "/api/admin/verification", actor: member })?.status).toBe(403);
    expect(gateVerificationRequest({ path: "/admin/verification", actor: member })?.status).toBe(404);
  });

  it("allows an admin through and ignores other routes", () => {
    const admin = { isAdmin: true };
    expect(verificationDenial({ path: "/admin/verification", actor: admin })).toBeNull();
    expect(verificationDenial({ path: "/api/admin/verification/case_1", actor: admin })).toBeNull();
    expect(gateVerificationRequest({ path: "/api/admin/verification", actor: admin })).toBeNull();
    expect(verificationDenial({ path: "/admin", actor: { isAdmin: false } })).toBeNull();
    expect(verificationDenial({ path: "/feed", actor: null })).toBeNull();
  });
});

describe("verification badge", () => {
  it("shows the badge only when the full checklist is complete and current", () => {
    const view = toPublicVerification(
      {
        status: "VERIFIED",
        verifiedAt: new Date("2026-03-01T00:00:00Z"),
        expiresAt: new Date("2027-03-01T00:00:00Z"),
        checks: passed,
        internalNote: "OFAC clear. Do not show this note.",
      },
      now,
    );
    expect(view.showBadge).toBe(true);
    expect(view.verifiedOn).toBe("2026-03-01T00:00:00.000Z");
    expect(view.expiresOn).toBe("2027-03-01T00:00:00.000Z");
    expect(view.statusLine).toBeNull();
    expect(Object.keys(view).sort()).toEqual([...PUBLIC_VERIFICATION_KEYS].sort());
    expect(JSON.stringify(view)).not.toContain("OFAC");
    expect(canOpenProjectToCounterparties(view)).toBe(true);
  });

  it("keeps an incomplete, rejected, or expired file off the public badge", () => {
    const incomplete = toPublicVerification(
      { status: "VERIFIED", verifiedAt: now, expiresAt: null, checks: [{ result: "PASS" }, { result: "PENDING" }] },
      now,
    );
    expect(incomplete.showBadge).toBe(false);
    expect(incomplete.statusLine).toBe("Verification in progress");
    expect(canOpenProjectToCounterparties(incomplete)).toBe(false);

    const expired = toPublicVerification(
      {
        status: "VERIFIED",
        verifiedAt: new Date("2024-01-01T00:00:00Z"),
        expiresAt: new Date("2025-01-01T00:00:00Z"),
        checks: passed,
      },
      now,
    );
    expect(effectiveVerificationStatus({ status: "VERIFIED", expiresAt: new Date("2025-01-01T00:00:00Z") }, now)).toBe("EXPIRED");
    expect(expired.showBadge).toBe(false);
    expect(expired.statusLine).toBe("Verification in progress");
    expect(JSON.stringify(expired)).not.toContain("EXPIRED");

    const rejected = toPublicVerification(
      { status: "REJECTED", verifiedAt: null, expiresAt: null, checks: [{ result: "FAIL" }] },
      now,
    );
    expect(rejected).toEqual({
      showBadge: false,
      verifiedOn: null,
      expiresOn: null,
      statusLine: "Verification in progress",
    });
  });

  it("requires every item to pass before a case can be marked Verified", () => {
    expect(checklistComplete(passed)).toBe(true);
    expect(canMarkCaseVerified([{ result: "PASS" }, { result: "NEEDS_INFO" }]).ok).toBe(false);
    expect(canMarkCaseVerified([{ result: "PASS" }, { result: "NOT_PROVIDED" }]).ok).toBe(false);
    expect(canMarkCaseVerified(passed).ok).toBe(true);
    expect(canMarkCaseVerified([]).ok).toBe(false);
  });

  it("counts open and expired files as awaiting review", () => {
    expect(isAwaitingVerification({ status: "NOT_STARTED", expiresAt: null }, now)).toBe(true);
    expect(isAwaitingVerification({ status: "IN_REVIEW", expiresAt: null }, now)).toBe(true);
    expect(isAwaitingVerification({ status: "NEEDS_INFO", expiresAt: null }, now)).toBe(true);
    expect(isAwaitingVerification({ status: "VERIFIED", expiresAt: new Date("2020-01-01T00:00:00Z") }, now)).toBe(true);
    expect(isAwaitingVerification({ status: "VERIFIED", expiresAt: new Date("2027-01-01T00:00:00Z") }, now)).toBe(false);
    expect(isAwaitingVerification({ status: "REJECTED", expiresAt: null }, now)).toBe(false);
  });
});

describe("application references", () => {
  it("marks a file with no references as Not provided and leaves the case Not started", () => {
    const empty = referenceCheckForApplication({ referenceEmails: [], speaker: "" });
    expect(empty.result).toBe("NOT_PROVIDED");
    expect(empty.note).toContain("Not provided");
    const named = referenceCheckForApplication({ referenceEmails: ["ada@example.com"], speaker: "Dana Whitfield" });
    expect(named.result).toBe("PENDING");
    expect(named.note).toContain("Not started");
    expect(named.note).toContain("ada@example.com");
  });
});

describe("decision sets the file status", () => {
  it("maps approve, request more info, and decline", () => {
    expect(statusForDecision("APPROVED")).toBe("VERIFIED");
    expect(statusForDecision("NEEDS_INFO")).toBe("NEEDS_INFO");
    expect(statusForDecision("DECLINED")).toBe("REJECTED");
  });
});

describe("vouch evidence", () => {
  it("does not promote a tier until an admin has reviewed the vouch", () => {
    expect(canPromoteTierFromVouch({ adminReviewed: false })).toBe(false);
    expect(canPromoteTierFromVouch({ adminReviewed: true })).toBe(true);
    const note = vouchEvidenceNote({
      counterpartyName: "Elena Voss",
      projectName: "Halsey Commons",
      note: "We built it.",
    });
    expect(note).toContain("Awaiting admin review");
    expect(note).not.toContain("internal");
  });
});
