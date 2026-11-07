import { subMatchesPackage } from "@/lib/trades";
/** Bid plans: construction drawings on a bid request, and who may open a general-contractor request without being picked. */
export const PLAN_MAX_BYTES = 25 * 1024 * 1024;
export const PLAN_MAX_FILES = 5;
export const PLAN_ACCEPT = ".pdf,.dwg,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";

/** Content type from the file's own bytes (and the .dwg name, which has no single magic number we trust alone). */
export function planType(name: string, bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  // AutoCAD DWG files start with "AC10".
  if (/\.dwg$/i.test(name) && b.length > 6 && b[0] === 0x41 && b[1] === 0x43 && b[2] === 0x31 && b[3] === 0x30) return "application/acad";
  return null;
}

export function safePlanName(name: string): string {
  return name.replace(/[^\w .()-]/g, "_").slice(0, 160) || "plans";
}

/** A verified general contractor: an active, approved member whose dues are settled. */
export function isVerifiedGc(user: { role: string; status: string; paymentStatus: string }): boolean {
  return user.role === "GENERAL_CONTRACTOR" && user.status === "ACTIVE" && ["PAID", "WAIVED", "NOT_REQUIRED"].includes(user.paymentStatus);
}

/** General-contractor requests are open: any verified GC can view the plans and bid, no developer approval needed. */
export function isOpenToGcs(templateCategory: string): boolean {
  return templateCategory === "GENERAL_CONTRACTOR";
}

export type OpenViewer = { id: string; role: string; status: string; paymentStatus: string; extraCategories?: string | null; trades?: string; markets?: string; location?: string };

/**
 * Who may open a bid request.
 * Nov 6: subcontractors never bid on a full general-contractor request (the GC template), even if picked.
 * A GC's trade bid package is open to any active, paid-up subcontractor with that trade who serves one of its states.
 */
export function canOpenRequest(input: {
  viewer: OpenViewer;
  requesterId: string;
  recipientIds: string[];
  templateCategory: string;
  trade?: string;
  serviceStates?: string;
}): "requester" | "recipient" | "open" | null {
  if (input.requesterId === input.viewer.id) return "requester";
  if (isOpenToGcs(input.templateCategory) && input.viewer.role === "SUBCONTRACTOR") return null;
  if (input.recipientIds.includes(input.viewer.id)) return "recipient";
  if (isOpenToGcs(input.templateCategory) && isVerifiedGc(input.viewer)) return "open";
  if (input.trade && isActivePaid(input.viewer) && subMatchesPackage({ role: input.viewer.role, extraCategories: input.viewer.extraCategories, trades: input.viewer.trades ?? "", markets: input.viewer.markets ?? "", location: input.viewer.location ?? "" }, { trade: input.trade, serviceStates: input.serviceStates ?? "" })) return "open";
  return null;
}

function isActivePaid(user: { status: string; paymentStatus: string }): boolean {
  return user.status === "ACTIVE" && ["PAID", "WAIVED", "NOT_REQUIRED"].includes(user.paymentStatus);
}
