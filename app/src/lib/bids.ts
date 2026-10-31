/** #51 Bids / proposals: pure rules (who may request, who may see, comparison). DB code lives in bids-db.ts. */
import type { BidField } from "@/lib/bid-templates";

export const BID_PDF_MAX = 25 * 1024 * 1024;
export const MAX_QUESTIONS = 3;
export const QUESTION_MAX = 500;
export const ANSWER_MAX = 500;

export function parseFields(json: string): BidField[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.key === "string" && typeof x.label === "string") : [];
  } catch {
    return [];
  }
}
export function parseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** Number from "$38,400,000", "4.0%", "22". Null when empty or not a number. */
export function numeric(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[$,%\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function isFilled(field: BidField, value: unknown): boolean {
  if (field.type === "profile") return true;
  if (Array.isArray(value)) return value.length > 0;
  return value != null && String(value).trim() !== "";
}

/** Which required fields are missing. Questions must all be answered too. */
export function missingFields(fields: BidField[], values: Record<string, unknown>, questions: string[], answers: string[]): string[] {
  const out = fields.filter((fl) => fl.required !== false && !isFilled(fl, values[fl.key])).map((fl) => fl.key);
  questions.forEach((_, i) => {
    if (!answers[i] || !answers[i].trim()) out.push(`q${i + 1}`);
  });
  return out;
}

/** Read the template's fields from a submitted form. Checklists come in as repeated values. */
export function readBidValues(fields: BidField[], form: { get(k: string): unknown; getAll(k: string): unknown[] }): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const fl of fields) {
    if (fl.type === "profile") continue;
    if (fl.type === "checks") {
      const allowed = new Set(fl.options ?? []);
      out[fl.key] = form.getAll(`f_${fl.key}`).map(String).filter((v) => allowed.has(v));
      continue;
    }
    const raw = String(form.get(`f_${fl.key}`) ?? "").trim().slice(0, fl.type === "long" ? 2000 : 300);
    if (["money", "percent", "number", "months"].includes(fl.type)) {
      const n = numeric(raw);
      out[fl.key] = n == null ? "" : String(n);
    } else if (fl.type === "yesno") out[fl.key] = raw === "yes" || raw === "no" ? raw : "";
    else if (fl.type === "date") out[fl.key] = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
    else out[fl.key] = raw;
  }
  return out;
}

/** Best bid id per field: lowest cost / shortest duration / highest capacity. Ties all win. Needs 2+ numbers. */
export function bestPerRow(fields: BidField[], bids: { id: string; values: Record<string, unknown> }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const fl of fields) {
    if (!fl.best) continue;
    const nums = bids.map((b) => ({ id: b.id, n: numeric(b.values[fl.key]) })).filter((x): x is { id: string; n: number } => x.n != null);
    if (nums.length < 2) continue;
    if (nums.every((x) => x.n === nums[0].n)) continue;
    const target = fl.best === "high" ? Math.max(...nums.map((x) => x.n)) : Math.min(...nums.map((x) => x.n));
    out[fl.key] = nums.filter((x) => x.n === target).map((x) => x.id);
  }
  return out;
}

/** Per unit / per SF, rounded to cents. */
export function perUnit(total: number | null, divisor: number | null | undefined): number | null {
  if (total == null || !divisor || divisor <= 0) return null;
  return Math.round((total / divisor) * 100) / 100;
}

/**
 * Rule 1: any member may request bids on a project they own or are Active on (accepted contact or approved deal room).
 * Admins are staff, not requesters.
 */
export function canRequestBids(input: { viewerId: string; ownerId: string; audience: string[] }): boolean {
  return input.viewerId === input.ownerId || input.audience.includes(input.viewerId);
}

/**
 * Rule 2: recipients must already be accepted on the project, or be the requester's accepted connections.
 * Never the requester. No cold outreach.
 */
export function allowedRecipients(input: { requesterId: string; ownerId: string; audience: string[]; connections: string[] }): Set<string> {
  const s = new Set([input.ownerId, ...input.audience, ...input.connections]);
  s.delete(input.requesterId);
  return s;
}

export type BidViewerRole = "requester" | "recipient" | "staff" | "none";
/** Outsiders see nothing. Bids stay private between each bidder and the requester. */
export function requestRole(req: { requesterId: string; recipientIds: string[] }, viewer: { id: string; isAdmin: boolean }): BidViewerRole {
  if (viewer.id === req.requesterId) return "requester";
  if (req.recipientIds.includes(viewer.id)) return "recipient";
  if (viewer.isAdmin) return "staff";
  return "none";
}

/** Requester decisions. Award closes the request; other submitted bids become Not selected. */
export const DECISIONS = ["SHORTLISTED", "DECLINED", "AWARDED"] as const;
export type Decision = (typeof DECISIONS)[number];
export function canDecide(bidStatus: string, requestStatus: string, decision: string): boolean {
  if (requestStatus !== "OPEN") return false;
  if (!(DECISIONS as readonly string[]).includes(decision)) return false;
  return ["SUBMITTED", "SHORTLISTED", "DECLINED"].includes(bidStatus) && bidStatus !== decision;
}

/** A bidder may edit until the due date and before a decision closes the request. */
export function canEditBid(input: { requestStatus: string; dueAt: Date; bidStatus?: string | null; now?: Date }): boolean {
  if (input.requestStatus !== "OPEN") return false;
  if ((input.now ?? new Date()) > input.dueAt) return false;
  return !input.bidStatus || ["DRAFT", "SUBMITTED"].includes(input.bidStatus);
}

export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export function cleanQuestions(raw: unknown[]): string[] {
  return raw.map((q) => String(q ?? "").trim().slice(0, QUESTION_MAX)).filter(Boolean).slice(0, MAX_QUESTIONS);
}
