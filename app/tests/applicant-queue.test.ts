import { describe, expect, it } from "vitest";
import { applicantQueue, standingForInvite } from "@/lib/applicant-queue";
import { assertCensusLine, emailDomainClass } from "@/lib/live-census";
import { isDemoRecord } from "@/lib/person-standing";

const request = {
  id: "request_richard",
  email: "rich@buildpro-cs.com",
  status: "PENDING",
  createdAt: 200,
};

describe("a new request to join", () => {
  it("appears in Needs action and New, and in People Pending", () => {
    const standing = standingForInvite("PENDING");
    expect(standing).toEqual({ status: "PENDING", stage: "REQUESTED" });
    expect(isDemoRecord({ email: request.email })).toBe(false);
    expect(emailDomainClass(request.email)).toBe("buildpro");
    expect(emailDomainClass("ada@firm.example")).toBe("example");

    for (const filter of ["action", "new"] as const) {
      expect(applicantQueue(filter, true, [], [request])).toEqual([{ kind: "invite", id: request.id }]);
    }
    expect(applicantQueue("review", false, [], [request])).toEqual([]);
    expect(applicantQueue("action", true, [], [{ ...request, email: "ada@firm.example" }])).toEqual([]);
    expect(applicantQueue("action", false, [], [{ ...request, email: "ada@firm.example" }])).toEqual([
      { kind: "invite", id: request.id },
    ]);
  });

  it("keeps a submitted application in Needs action and does not list the same email twice", () => {
    const application = {
      id: "app_richard",
      email: "rich@buildpro-cs.com",
      status: "PENDING",
      isTest: false,
      createdAt: 300,
      verdict: null,
    };
    expect(applicantQueue("action", true, [application], [request])).toEqual([{ kind: "application", id: application.id }]);
    expect(applicantQueue("new", true, [application], [request])).toEqual([{ kind: "application", id: application.id }]);
  });

  it("counts the live database without writing an address", () => {
    const line =
      "APPLICANT_CENSUS admins=1 initials=MH seed=1 demo=1 domain=example application=0 invite_pending=1 invite_domain example=0 buildpro=1 owner=0 other=0 people_invite_only=1";
    expect(assertCensusLine(line)).toBe(line);
    expect(() => assertCensusLine("APPLICANT_CENSUS rich@buildpro-cs.com")).toThrow(/address/);
  });
});
