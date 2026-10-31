import { describe, expect, it } from "vitest";
import { referralEmail, referralJoinLink, referrerPublicName } from "@/lib/referral-email";

const BANNED = /\b(invite|invited|invite-only|founding member|limited)\b|invitad|einlad|招待|limitad|begrenzt/i;
const base = { recipientFirstName: "Jordan", referrerName: "Richard Osika", referrerRole: "DEVELOPER", code: "PF-7K3Q9M", base: "https://x.example" };

describe("referral email", () => {
  it("names the referrer and role, explains review, and links to /join with the code", () => {
    const m = referralEmail({ ...base, locale: "en" });
    expect(m.subject).toBe("Richard Osika referred you to Private Floor");
    expect(m.text).toContain("Richard Osika (Developer) referred you to Private Floor.");
    expect(m.text).toContain("A referral does not skip review");
    expect(m.html).toContain(referralJoinLink("https://x.example", "PF-7K3Q9M"));
    expect(m.html).toContain(">PF-7K3Q9M<");
    expect(m.text).not.toContain("A note from");
    expect(referralEmail({ ...base, locale: "en", note: "Great fit." }).text).toContain("A note from Richard Osika: “Great fit.”");
    expect(referrerPublicName("Rich O", true)).toBe("Richard Osika");
  });
  it("is translated and never uses banned words, footer included", () => {
    const subjects = new Set<string>();
    for (const locale of ["en", "es", "de", "ja"] as const) {
      const m = referralEmail({ ...base, locale, note: "x" });
      subjects.add(m.subject);
      expect(m.subject).toContain("Richard Osika");
      expect(m.html).toContain(`lang="${locale}"`);
      expect(`${m.subject}\n${m.text}\n${m.html}`).not.toMatch(BANNED);
      expect(m.text).not.toMatch(/\{name\}|\{role\}/);
    }
    expect(subjects.size).toBe(4);
  });
});
