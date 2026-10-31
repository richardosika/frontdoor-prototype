import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyProfile, pageTwoErrors } from "@/lib/join-form";
import { renderMarkdown } from "@/lib/markdown";
import { MEMBER_RISK_ERROR, MEMBER_RISK_HREF, MEMBER_RISK_LABEL } from "@/lib/member-risk";

const ROOT = path.join(__dirname, "..");
const terms = readFileSync(path.join(ROOT, "src/content/legal/terms.md"), "utf8");
const section = terms.slice(terms.indexOf("## 7A."), terms.indexOf("## 8."));
const BANNED = /\b(invite|invited|invite-only|founding member|limited)\b/i;

describe("member risk terms", () => {
  it("has a 7A section, and the checkbox links to the Terms without an anchor", () => {
    expect(section).toMatch(/\{#member-risk\}/);
    expect(MEMBER_RISK_HREF).toBe("/legal/terms");
    expect(renderMarkdown(section)).toContain('<h2 id="member-risk"');
    expect(renderMarkdown(section)).not.toContain("{#member-risk}");
  });
  it("covers review, hidden information, performance, due diligence and release", () => {
    expect(section).toMatch(/not a guarantee/);
    expect(section).toMatch(/background check/);
    expect(section).toMatch(/hides, withholds, omits, falsifies, or misrepresents/);
    expect(section).toMatch(/did not surface/);
    expect(section).toMatch(/performance or non-performance/);
    expect(section).toMatch(/solely between the members/);
    expect(section).toMatch(/assume all risk/);
    expect(section).toMatch(/release and forever discharge/);
    expect(terms).toMatch(/12\.2 \*\*WITHOUT RESTRICTING/);
    expect(terms).toMatch(/13\.2A \*\*WITHOUT RESTRICTING/);
    expect(terms).toMatch(/\(f\) any information you hid/);
  });
  it("new text keeps the wording rules", () => {
    const added = [section, MEMBER_RISK_LABEL, MEMBER_RISK_ERROR, terms.match(/12\.2 .*$/m)![0], terms.match(/13\.2A .*$/m)![0], terms.match(/\(f\) any information.*?member\./)![0]];
    for (const text of added) expect(BANNED.test(text), text.slice(0, 60)).toBe(false);
  });
});

describe("member risk checkbox", () => {
  it("is unchecked by default and blocks submit", () => {
    const profile = emptyProfile();
    expect(profile.acceptMemberRisk).toBe(false);
    expect(pageTwoErrors(profile)).toContain(MEMBER_RISK_ERROR);
    expect(pageTwoErrors({ ...profile, acceptMemberRisk: true })).not.toContain(MEMBER_RISK_ERROR);
  });
  it("is required on the server and stored with a timestamp and version", () => {
    const action = readFileSync(path.join(ROOT, "src/actions/join.ts"), "utf8");
    expect(action).toMatch(/pageTwoErrors\(profile\)/);
    expect(action).toMatch(/memberRiskAcceptedAt: acceptedAt/);
    expect(action).toMatch(/memberRiskTermsVersion:/);
    const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/memberRiskAcceptedAt\s+DateTime\?/);
  });
  it("shows the label, the link and an inline error on the form", () => {
    const form = readFileSync(path.join(ROOT, "src/components/join-application.tsx"), "utf8");
    expect(form).toContain("{MEMBER_RISK_LABEL}");
    expect(form).toContain("href={MEMBER_RISK_HREF}");
    expect(form).toContain('id="member-risk-error"');
    expect(MEMBER_RISK_LABEL).toBe(
      "I understand that Private Floor's review is not a guarantee of any member, and that Private Floor is not responsible for information members withhold or for any member's performance. I agree to the Member Terms.",
    );
  });
});

describe("join form does not name a section", () => {
  it("links to the Member Terms and never mentions 7A", () => {
    const form = readFileSync(path.join(ROOT, "src/components/join-application.tsx"), "utf8");
    const page = readFileSync(path.join(ROOT, "src/app/join/page.tsx"), "utf8");
    expect(form).toContain("Read the Member Terms");
    for (const text of [form, page, MEMBER_RISK_LABEL, MEMBER_RISK_ERROR, MEMBER_RISK_HREF]) {
      expect(text).not.toMatch(/7A|#member-risk/);
    }
  });
});
