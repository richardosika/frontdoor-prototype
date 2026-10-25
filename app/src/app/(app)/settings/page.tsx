import Link from "next/link";
import { openBillingPortal } from "@/actions/payments";
import { changePassword, requestAccountDeletion, saveNotificationPrefs } from "@/actions/profile";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { duesLabel } from "@/lib/dues";
import { formatAuditTime, formatEtDate } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Settings" />
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <section className={`${card} mt-4 p-4 text-sm`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Billing</h2>
        {user.paymentStatus === "NOT_REQUIRED" ? (
          <p className="mt-2 text-ink">No annual dues are due on this membership. Private Floor does not charge a fee on a deal.</p>
        ) : (
          <div className="mt-2 space-y-1 text-ink">
            <p>
              <b>Receipt.</b> {paymentStatusLabel(user.paymentStatus)} · {duesLabel(user.duesCents)}
            </p>
            <p>{receiptLine(user.paymentMode)}</p>
            <p>Paid {user.paidAt ? formatAuditTime(user.paidAt) : "—"}.</p>
            <p>Renewal date {user.renewalAt ? formatEtDate(user.renewalAt) : "not set"}.</p>
            {user.waiverReason ? <p>Waiver: {user.waiverReason}</p> : null}
            {user.refundNote ? <p>Refund note: {user.refundNote}</p> : null}
            <p>No card on file. Private Floor does not store a card number.</p>
          </div>
        )}
        <p className="mt-3">
          <Link href="/legal/membership-dues" className="underline decoration-brass">
            Membership Dues and Refund Terms
          </Link>
        </p>
        {user.stripeCustomerId && process.env.STRIPE_SECRET_KEY ? (
          <form action={openBillingPortal} className="mt-3">
            <button className={btnOutline} type="submit">
              Open billing portal
            </button>
          </form>
        ) : (
          <p className="mt-3 text-mut">A Stripe billing portal link appears after a Stripe test checkout. This test does not store a card.</p>
        )}
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Notifications</h2>
        <p className="mt-1 text-sm text-ink">The bell always records an alert. Email copies go only to the test recipient, and only when the box is on.</p>
        <form action={saveNotificationPrefs} className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyMessages" defaultChecked={user.notifyMessages} />
            Messages
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyIntros" defaultChecked={user.notifyIntros} />
            Introductions
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyDeals" defaultChecked={user.notifyDeals} />
            Deals and deal rooms
          </label>
          <button className={btn} type="submit">
            Save notification settings
          </button>
        </form>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Password</h2>
        <form action={changePassword} className="mt-3 grid gap-2">
          <label>
            <span className={labelCls}>Current password</span>
            <input name="current" type="password" className={field} required autoComplete="current-password" />
          </label>
          <label>
            <span className={labelCls}>New password</span>
            <input name="next" type="password" className={field} required minLength={8} maxLength={72} autoComplete="new-password" />
          </label>
          <button className={btn} type="submit">
            Change password
          </button>
        </form>
      </section>
      <section className={`${card} mt-4 p-4 text-sm`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Your data</h2>
        <p className="mt-2 text-ink">The export is your profile, posts, and messages you sent. It does not include another member’s email or phone.</p>
        <Link href="/api/me/export" className={`${btnOutline} mt-3`}>
          Export my data
        </Link>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Delete this account</h2>
        <p className="mt-2 text-sm text-ink">
          {user.deletionRequestedAt
            ? "A Private Floor administrator already has this request."
            : "This asks a Private Floor administrator to remove the account. It does not delete it immediately."}
        </p>
        <form action={requestAccountDeletion} className="mt-3 grid gap-2">
          <textarea name="note" className={field} rows={2} placeholder="Optional note" />
          <button className={btnOutline} type="submit">
            Request account deletion
          </button>
        </form>
      </section>
    </div>
  );
}

function receiptLine(mode: string): string {
  if (mode === "simulated") return "Recorded as a simulated TEST payment. No card was charged.";
  if (mode === "stripe") return "Recorded from Stripe test mode. The card number stays at Stripe.";
  if (mode === "manual") return "Marked paid by a Private Floor administrator. No card is stored.";
  if (mode === "waived") return "Dues waived by a Private Floor administrator.";
  return "No card is stored.";
}
