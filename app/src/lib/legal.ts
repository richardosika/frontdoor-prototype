import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const LEGAL_VERSION = "2026-10-24-draft";

export const LEGAL_DOCS = [
  { slug: "terms", title: "Terms of Use", file: "terms.md" },
  { slug: "privacy", title: "Privacy Policy", file: "privacy.md" },
  { slug: "disclosures", title: "Disclosures", file: "disclosures.md" },
  { slug: "guidelines", title: "Community Guidelines", file: "guidelines.md" },
] as const;

export type LegalSlug = (typeof LEGAL_DOCS)[number]["slug"];

export function legalDoc(slug: string) {
  return LEGAL_DOCS.find((doc) => doc.slug === slug) ?? null;
}

export function readLegalMarkdown(file: string): string {
  return readFileSync(path.join(process.cwd(), "src/content/legal", file), "utf8");
}

export function hashClientIp(ip: string): string {
  const secret = process.env.AUTH_SECRET || "private-floor";
  return createHash("sha256").update(`${ip}|${secret}`).digest("hex");
}
