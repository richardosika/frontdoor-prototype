import { MEMBER_HIDDEN_KEYS } from "@/lib/platform/visibility";
import { PUBLIC_VERIFICATION_KEYS } from "@/lib/verification";

const HIDDEN = new Set(MEMBER_HIDDEN_KEYS.map((key) => key.toLowerCase()));

export function payloadProblems(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => payloadProblems(item, `${path}[${index}]`));
  const problems: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key;
    if (HIDDEN.has(key.toLowerCase())) problems.push(here);
    problems.push(...payloadProblems(child, here));
  }
  return problems;
}

export function scrubMemberPayload<T>(value: T): T {
  return scrub(value) as T;
}

function scrub(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item));
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (HIDDEN.has(key.toLowerCase())) continue;
    out[key] = scrub(child);
  }
  return out;
}

export function verificationKeysArePublic(value: Record<string, unknown>): boolean {
  const allowed = new Set<string>(PUBLIC_VERIFICATION_KEYS);
  return Object.keys(value).every((key) => allowed.has(key));
}
