import { describe, expect, it } from "vitest";
import { isApprovedMember, isDemoRecord, isWaitingToBeChecked, personStanding } from "@/lib/person-standing";

describe("one status for applications, members, and people", () => {
  it("maps the same facts to the same status", () => {
    const waiting = personStanding({ applicationStatus: "SUBMITTED" });
    const review = personStanding({ applicationStatus: "NEEDS_INFO" });
    const approved = personStanding({ applicationStatus: "APPROVED", hasMember: true, accountStatus: "ACTIVE" });
    const dues = personStanding({ applicationStatus: "PAYMENT_DUE", paymentStatus: "DUE", hasMember: true, accountStatus: "ACTIVE" });
    const declined = personStanding({ applicationStatus: "DECLINED", hasMember: true, accountStatus: "ACTIVE" });
    const requested = personStanding({ inviteStatus: "PENDING" });
    const seed = personStanding({ hasMember: true, accountStatus: "ACTIVE" });

    expect(waiting).toEqual({ status: "PENDING", stage: "APPLIED" });
    expect(review).toEqual({ status: "PENDING", stage: "IN_REVIEW" });
    expect(approved).toEqual({ status: "APPROVED", stage: "ACTIVE" });
    expect(dues).toEqual({ status: "APPROVED", stage: "PAYMENT_DUE" });
    expect(declined).toEqual({ status: "DECLINED", stage: "DECLINED" });
    expect(requested).toEqual({ status: "PENDING", stage: "REQUESTED" });
    expect(seed).toEqual({ status: "APPROVED", stage: "ACTIVE" });

    expect(isWaitingToBeChecked(waiting)).toBe(true);
    expect(isWaitingToBeChecked(requested)).toBe(false);
    expect(isApprovedMember(approved)).toBe(true);
    expect(isApprovedMember(dues)).toBe(true);
    expect(isApprovedMember(waiting)).toBe(false);
    expect(isApprovedMember(declined)).toBe(false);
    expect(personStanding({ applicationStatus: "SUBMITTED", accountStatus: "SUSPENDED", hasMember: true })).toEqual({
      status: "DECLINED",
      stage: "DECLINED",
    });
    expect(personStanding({ applicationStatus: "IN_REVIEW", hasMember: true, accountStatus: "ACTIVE" })).toEqual({
      status: "APPROVED",
      stage: "ACTIVE",
    });
  });

  it("marks demo and sample rows without marking a real address", () => {
    expect(isDemoRecord({ isTest: true, email: "ada@realfirm.com" })).toBe(true);
    expect(isDemoRecord({ email: "marcus.hale@halerow.example" })).toBe(true);
    expect(isDemoRecord({ email: "ada@realfirm.com" })).toBe(false);
  });
});
