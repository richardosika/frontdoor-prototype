import { formatMoney } from "@/lib/dues";
import { memberLocale } from "@/lib/i18n/server";
import { phrase } from "@/lib/i18n/phrases";
import { givenNameFrom } from "@/lib/person-fields";
import { notify } from "@/lib/notify";
import { sendNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";
import { creditFor, deriveSuggestionStatus, statusLabel, vendorIsPaying, type SuggestionStatus } from "@/lib/vendor-suggestions";

/** Note prefix on referral codes made from a suggestion, so "Refer a colleague" never reuses them. */
export const SUGGESTION_CODE_NOTE = "Vendor suggestion";

function vendorLine(row: { vendorName: string; company: string }): string {
  return row.vendorName || row.company || "—";
}

/** In-app alert and email to the member when a suggestion changes status. Never throws. */
export async function notifySuggestionStatus(suggestionId: string, status: SuggestionStatus) {
  try {
    const row = await prisma.vendorSuggestion.findUnique({ where: { id: suggestionId }, include: { suggestedBy: { select: { id: true, name: true, email: true } } } });
    if (!row) return;
    const locale = await memberLocale(row.suggestedBy.id);
    const t = (text: string) => phrase(locale, text);
    const title = `${t("Your vendor suggestion")}: ${t(statusLabel(status))}`;
    const body = `${vendorLine(row)} · ${t(statusLabel(status))}`;
    await notify(row.suggestedBy.id, { title, body, href: "/suggest" });
    const base = await appBaseUrl();
    await sendNotice({
      intendedTo: row.suggestedBy.email,
      subject: title,
      text: `${t("Hello")} ${givenNameFrom("", row.suggestedBy.name)},\n\n${body}\n\n${t("Your suggestions")}: ${base}/suggest\n`,
      templateKey: "vendor_suggestion_status",
    });
  } catch (error) {
    console.error("Suggestion status notice failed", error);
  }
}

/** Grants the one free month (or recognition) once per suggestion. Safe to call repeatedly. */
export async function grantSuggestionCredit(suggestionId: string): Promise<"granted" | "exists" | "skipped"> {
  const row = await prisma.vendorSuggestion.findUnique({ where: { id: suggestionId }, include: { suggestedBy: true } });
  if (!row?.vendorUserId) return "skipped";
  const existing = await prisma.duesCredit.findUnique({ where: { suggestionId } });
  if (existing) return "exists";
  const credit = creditFor(row.suggestedBy);
  try {
    const created = await prisma.duesCredit.create({
      data: {
        userId: row.suggestedById,
        suggestionId,
        cents: credit.cents,
        status: credit.status,
        reason: `${vendorLine(row)} became a verified member`,
      },
    });
    if (credit.status === "AVAILABLE") await pushStripeCredit(created.id).catch(() => null);
  } catch {
    return "exists"; // unique suggestionId: another request granted it first
  }
  const locale = await memberLocale(row.suggestedById);
  const t = (text: string) => phrase(locale, text);
  await notify(row.suggestedById, {
    title: credit.status === "AVAILABLE" ? t("One free month of dues") : t("Thank you for your referral"),
    body:
      credit.status === "AVAILABLE"
        ? `${vendorLine(row)} · ${formatMoney(credit.cents, locale)} ${t("credit applies to your next dues charge.")}`
        : `${vendorLine(row)} · ${t("is now a verified member. Your referral is recorded on your profile.")}`,
    href: credit.status === "AVAILABLE" ? "/settings#billing" : "/profile",
  }).catch(() => null);
  return "granted";
}

/** Stripe test mode: put the credit on the customer balance so Stripe takes it off the next invoice. Idempotent per credit. */
async function pushStripeCredit(creditId: string) {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret.startsWith("sk_test")) return;
  const credit = await prisma.duesCredit.findUnique({ where: { id: creditId }, include: { user: { select: { stripeCustomerId: true } } } });
  if (!credit || credit.stripeBalanceTxnId || !credit.user.stripeCustomerId || credit.cents <= 0) return;
  const body = new URLSearchParams({ amount: String(-credit.cents), currency: "usd", description: "Private Floor: one free month for a vendor referral" });
  const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(credit.user.stripeCustomerId)}/balance_transactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `pf-dues-credit-${credit.id}` },
    body,
  });
  if (!response.ok) return;
  const payload = (await response.json()) as { id?: string };
  if (payload.id) await prisma.duesCredit.update({ where: { id: credit.id }, data: { stripeBalanceTxnId: payload.id } });
}

/** A renewal charge was recorded: the oldest available credit covered it. Returns the credit used, if any. */
export async function consumeDuesCredit(userId: string) {
  const credit = await prisma.duesCredit.findFirst({ where: { userId, status: "AVAILABLE" }, orderBy: { createdAt: "asc" } });
  if (!credit) return null;
  const updated = await prisma.duesCredit.updateMany({ where: { id: credit.id, status: "AVAILABLE" }, data: { status: "APPLIED", appliedAt: new Date() } });
  return updated.count ? credit : null;
}

/**
 * Brings suggestions in line with their referral code and application: links a new application, moves status,
 * notifies the member on each change, and grants the dues credit when the vendor's first dues payment is recorded.
 */
export async function syncSuggestions(where: { suggestedById?: string; vendorUserId?: string; inviteCodeId?: string } = {}) {
  const rows = await prisma.vendorSuggestion.findMany({
    where: { ...where, inviteCodeId: where.inviteCodeId ?? { not: null }, NOT: { status: "DECLINED" } },
    take: 500,
  });
  let changed = 0;
  for (const row of rows) {
    let applicationId = row.applicationId;
    if (!applicationId && row.inviteCodeId) {
      const app = await prisma.application.findFirst({ where: { inviteCodeId: row.inviteCodeId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      applicationId = app?.id ?? null;
    }
    const application = applicationId
      ? await prisma.application.findUnique({ where: { id: applicationId }, select: { status: true, userId: true } })
      : null;
    const status = deriveSuggestionStatus({ status: row.status, inviteCodeId: row.inviteCodeId, application });
    const vendorUserId = application?.userId ?? row.vendorUserId;
    if (status !== row.status || applicationId !== row.applicationId || vendorUserId !== row.vendorUserId) {
      const moved = await prisma.vendorSuggestion.updateMany({
        where: { id: row.id, status: row.status },
        data: { status, applicationId, vendorUserId, ...(status !== row.status ? { statusChangedAt: new Date() } : {}) },
      }).catch(() => ({ count: 0 }));
      if (moved.count && status !== row.status) {
        changed += 1;
        await notifySuggestionStatus(row.id, status);
      }
    }
    if (status === "VERIFIED" && vendorUserId) {
      const vendor = await prisma.user.findUnique({ where: { id: vendorUserId }, select: { paymentStatus: true, paidAt: true } });
      if (vendorIsPaying(vendor)) await grantSuggestionCredit(row.id);
    }
  }
  return changed;
}

/** Never throws: used from application and payment paths. */
export async function syncSuggestionsQuietly(where: Parameters<typeof syncSuggestions>[0]) {
  try {
    return await syncSuggestions(where);
  } catch (error) {
    console.error("Suggestion sync failed", error);
    return 0;
  }
}
