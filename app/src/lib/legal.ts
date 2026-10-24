import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderMarkdown } from "@/lib/markdown";

export const LEGAL_DOCS = [
  { slug: "terms", title: "Terms of Use", file: "terms.md" },
  { slug: "privacy", title: "Privacy Policy", file: "privacy.md" },
  { slug: "disclosures", title: "Important Disclosures", file: "disclosures.md" },
  { slug: "guidelines", title: "Community Guidelines", file: "guidelines.md" },
  { slug: "applicant-consent", title: "Applicant Consent", file: "applicant-consent.md" },
  { slug: "verification-policy", title: "Verification Policy", file: "verification-policy.md" },
  { slug: "seeking-raising", title: "Seeking and Raising Post Rules", file: "seeking-raising.md" },
  { slug: "deal-room-nda", title: "Deal Room NDA Acknowledgement", file: "deal-room-nda.md" },
] as const;

/** Documents recorded when both signup boxes are checked. */
export const ACCEPTANCE_SLUGS = ["terms", "privacy", "disclosures", "applicant-consent", "verification-policy"] as const;

export type LegalSlug = (typeof LEGAL_DOCS)[number]["slug"];

export type SignupConsentCopy = {
  beforeHtml: string;
  termsLabel: string;
  verificationLabel: string;
  helper: string;
};

export function legalDoc(slug: string) {
  return LEGAL_DOCS.find((doc) => doc.slug === slug) ?? null;
}

export function readLegalMarkdown(file: string): string {
  return readFileSync(path.join(process.cwd(), "src/content/legal", file), "utf8");
}

/** The first line of each draft is `Version: <id>`. That id is what acceptance stores. */
export function documentVersion(markdown: string): string {
  const line = markdown.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const match = /^Version:\s*(\S+)/.exec(line.trim());
  if (!match) throw new Error("Legal document is missing a Version line.");
  return match[1];
}

export function stripVersionLine(markdown: string): string {
  return markdown.replace(/^\uFEFF?Version:[^\n]*\n+/, "");
}

export function legalVersion(slug: (typeof ACCEPTANCE_SLUGS)[number]): string {
  const doc = legalDoc(slug);
  if (!doc) throw new Error(`Unknown legal document: ${slug}`);
  return documentVersion(readLegalMarkdown(doc.file));
}

export function acceptanceVersions(): { document: string; version: string }[] {
  return ACCEPTANCE_SLUGS.map((slug) => ({ document: slug, version: legalVersion(slug) }));
}

export function signupConsentCopy(): SignupConsentCopy {
  const source = readLegalMarkdown("applicant-consent.md");
  const beforeStart = source.indexOf("**Before you submit**");
  const beforeEnd = source.indexOf("**Checkbox labels**");
  if (beforeStart < 0 || beforeEnd < beforeStart) {
    throw new Error("Applicant consent is missing the signup text.");
  }
  const labels = [...source.matchAll(/^☐\s+\*\*(.+?)\*\*\s*$/gm)].map((match) => match[1].trim());
  if (labels.length !== 2) throw new Error("Applicant consent must contain two checkbox labels.");
  const helperMatch = source.match(/\*\*Short helper text under the button:\*\*\s*(.+)/);
  if (!helperMatch) throw new Error("Applicant consent is missing the helper sentence.");
  return {
    beforeHtml: renderMarkdown(source.slice(beforeStart, beforeEnd).trim()),
    termsLabel: labels[0],
    verificationLabel: labels[1],
    helper: helperMatch[1].trim(),
  };
}

export function hashClientIp(ip: string): string {
  const secret = process.env.AUTH_SECRET || "private-floor";
  return createHash("sha256").update(`${ip}|${secret}`).digest("hex");
}
