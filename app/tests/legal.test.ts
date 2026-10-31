import { describe, expect, it } from "vitest";
import { acceptanceVersions, documentVersion, signupConsentCopy } from "@/lib/legal";

describe("legal drafts", () => {
  it("reads the Version line from the top of a document", () => {
    expect(documentVersion("Version: 2026-10-26-draft-1\n\n# Title\n")).toBe("2026-10-26-draft-1");
  });

  it("uses the uploaded consent sentences and records each document version", () => {
    const copy = signupConsentCopy();
    expect(copy.termsLabel).toBe(
      "I agree to the Terms of Use, Privacy Policy, and Important Disclosures (version 2026-10-26-draft-1), and I confirm I am 18 or older and applying for business purposes.",
    );
    expect(copy.verificationLabel).toBe(
      "I consent to Private Floor running the automated public-data checks described above and in the Verification Policy, and to an administrator reviewing the results to decide my application.",
    );
    expect(copy.helper).toBe(
      "You can withdraw consent at any time by emailing connect@privatefloorclub.com, but we cannot review an application without it.",
    );
    expect(copy.beforeHtml).toContain("Before you submit");
    expect(copy.beforeHtml).toContain("A person decides.");
    const versions = acceptanceVersions();
    expect(versions.map((item) => item.document)).toEqual([
      "terms",
      "privacy",
      "disclosures",
      "applicant-consent",
      "verification-policy",
    ]);
    expect(versions.every((item) => item.version === "2026-10-26-draft-1")).toBe(true);
  });
});