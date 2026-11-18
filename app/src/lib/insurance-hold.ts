import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { auth } from "@/auth";
import { INSURANCE_HELD_MESSAGE, INSURANCE_HELD_PATH, INSURANCE_PATH, insuranceSuspensionAllows } from "@/lib/insurance-compliance";
import { currentLocale } from "@/lib/i18n/server";
import { phrase } from "@/lib/i18n/phrases";
import { blocksMembership } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * Nov 17 follow-up (Richard): an insurance-suspended member can only submit insurance. Every other page, server action
 * and API call is refused on the server. Staff and administrators are never held.
 */
type Holdable = { insuranceSuspendedAt?: Date | null; isAdmin?: boolean; paymentStatus?: string | null };

export function insuranceHeld(user: Holdable | null | undefined) {
  if (!user || user.isAdmin || !user.insuranceSuspendedAt) return false;
  // A membership blocked for payment already goes to /pay for everything; holding it too would loop between gates.
  return !blocksMembership(String(user.paymentStatus ?? ""));
}

/** "action" while a server action or route handler body runs; "render" while a page or layout renders. */
export function requestPhase(nextAction: string | null): "action" | "render" {
  const store = workUnitAsyncStorage.getStore() as { phase?: string } | undefined;
  if (store?.phase === "action") return "action";
  if (store?.phase) return "render";
  return nextAction ? "action" : "render";
}

/** Decides what a held member's request may do. Pure, so it is unit-tested. */
export function holdDecision(input: { held: boolean; phase: "action" | "render"; path: string; insuranceSubmission?: boolean }) {
  if (!input.held) return "allow" as const;
  if (input.phase === "action") return input.insuranceSubmission ? ("allow" as const) : ("block" as const);
  return insuranceSuspensionAllows(input.path) ? ("allow" as const) : ("block" as const);
}

/** Called by requireAccount: blocked pages and actions land on Profile with the suspension message. */
export async function enforceInsuranceHold(user: Holdable, opts: { insuranceSubmission?: boolean } = {}) {
  if (!insuranceHeld(user)) return;
  const h = await headers();
  const decision = holdDecision({ held: true, phase: requestPhase(h.get("next-action")), path: h.get("x-pf-path") ?? "", insuranceSubmission: opts.insuranceSubmission });
  if (decision === "block") redirect(INSURANCE_HELD_PATH);
}

/** For route handlers: a 403 with the message and the Profile link when the signed-in member is held, otherwise null. */
export async function insuranceHoldResponse(format: "json" | "html" = "json"): Promise<Response | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, select: { insuranceSuspendedAt: true, isAdmin: true, paymentStatus: true } });
  if (!insuranceHeld(user)) return null;
  const locale = await currentLocale();
  const message = phrase(locale, INSURANCE_HELD_MESSAGE);
  const link = phrase(locale, "Update insurance on your Profile");
  if (format === "json") {
    return Response.json({ error: message, held: true, href: INSURANCE_PATH, link }, { status: 403, headers: { "cache-control": "no-store" } });
  }
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escape(phrase(locale, "Account suspended"))}</title></head><body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5"><h1 style="font-size:1.4rem">${escape(phrase(locale, "Account suspended"))}</h1><p data-testid="insurance-held">${escape(message)}</p><p><a href="${INSURANCE_PATH}" style="display:inline-block;min-height:44px">${escape(link)}</a></p></body></html>`;
  return new Response(html, { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function escape(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
