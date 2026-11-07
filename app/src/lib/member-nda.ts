import { documentVersion, readLegalMarkdown } from "@/lib/legal";
import { MEMBER_NDA_GATE } from "@/lib/member-nda-copy";

export * from "@/lib/member-nda-copy";


/** The English text governs, so its Version line is what acceptance stores. */
export function memberNdaVersion(): string {
  return documentVersion(readLegalMarkdown("member-nda.md"));
}

/** Members must accept the current Member NDA before using the app. Administrators are staff and are not gated. */
export function needsMemberNda(user: { isAdmin: boolean; ndaVersion: string; ndaAcceptedAt: Date | null }, currentVersion: string): boolean {
  if (user.isAdmin) return false;
  return !user.ndaAcceptedAt || user.ndaVersion !== currentVersion;
}

/** Only same-site paths are allowed as the place to continue to after accepting. */
export function safeNext(value: unknown): string {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.startsWith(MEMBER_NDA_GATE)) return "/feed";
  return next;
}
