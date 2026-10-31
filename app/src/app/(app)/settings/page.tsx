import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { cancelMembership } from "@/actions/payments";
import { addSimulatedCard, pauseMembership, removeBackupCard, resumeMembershipNow, swapPaymentMethods } from "@/actions/billing";
import { CardSetup } from "@/components/card-setup";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { PAUSE_MONTH_OPTIONS, isPaused, methodLabel, showsBillingControls, stripePublishableTestKey } from "@/lib/billing";
import { isStripeTestSecret } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { changePassword, requestAccountDeletion, saveNotificationPrefs } from "@/actions/profile";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { DUES_BILLING_NOTE, currentMonthlyCents, firstMonthCents, formatMoney } from "@/lib/dues";
import { formatAuditTime, formatLongEtDate } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/payments";
import { ALERT_DIGESTS, ALERT_EMAIL_TYPES } from "@/lib/alert-prefs";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const tx = await serverTx();
  const user = await requireUser();
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title={tx("Settings")} />
      <div className="mt-3">
        <Banner error={params.error ? tx(params.error) : undefined} notice={params.notice ? tx(params.notice) : undefined} />
      </div>
      <BillingSection user={user} tx={tx} />
      <section id="alert-emails" className={`${card} mt-4 scroll-mt-20 p-4`} data-testid="alert-email-settings">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Alert emails")}</h2>
        <p className="mt-1 text-sm text-ink">{tx("The bell always records an alert. Choose which alerts also come by email.")}</p>
        <p className="mt-1 text-[13px] text-mut">{tx("During testing, alert emails go only to the Private Floor test inbox. At launch they go to your own email address.")}</p>
        <form action={saveNotificationPrefs} className="mt-3 grid gap-4 text-[15px]">
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-[13px] font-semibold text-forest">{tx("Email me about")}</legend>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[#1f3a2c]" name="notifyMessages" defaultChecked={user.notifyMessages} />
              {tx("Messages")}
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[#1f3a2c]" name="notifyIntros" defaultChecked={user.notifyIntros} />
              {tx("Introductions and project contact requests")}
            </label>
            {ALERT_EMAIL_TYPES.map((item) => (
              <label key={item.field} className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-[#1f3a2c]" name={item.field} defaultChecked={user[item.field]} />
                {tx(user.role !== "DEVELOPER" && "otherLabel" in item ? item.otherLabel : item.label)}
              </label>
            ))}
            <input type="hidden" name="notifyDeals" value={user.notifyDeals ? "on" : ""} />
          </fieldset>
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-[13px] font-semibold text-forest">{tx("How often")}</legend>
            {ALERT_DIGESTS.map((item) => (
              <label key={item.id} className="flex min-h-11 items-center gap-3">
                <input type="radio" className="h-5 w-5 accent-[#1f3a2c]" name="alertDigest" value={item.id} defaultChecked={(user.alertDigest || "INSTANT") === item.id} />
                {tx(item.label)}
              </label>
            ))}
          </fieldset>
          <button className={btn} type="submit">
            {tx("Save notification settings")}
          </button>
        </form>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Password")}</h2>
        <form action={changePassword} className="mt-3 grid gap-2">
          <label>
            <span className={labelCls}>{tx("Current password")}</span>
            <input name="current" type="password" className={field} required autoComplete="current-password" />
          </label>
          <label>
            <span className={labelCls}>{tx("New password")}</span>
            <input name="next" type="password" className={field} required minLength={8} maxLength={72} autoComplete="new-password" />
          </label>
          <button className={btn} type="submit">
            {tx("Change password")}
          </button>
        </form>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Delete this account")}</h2>
        <p className="mt-2 text-sm text-ink">
          {user.deletionRequestedAt
            ? tx("A Private Floor administrator already has this request.")
            : tx("This asks a Private Floor administrator to remove the account. It does not delete it immediately.")}
        </p>
        <form action={requestAccountDeletion} className="mt-3 grid gap-2">
          <textarea name="note" className={field} rows={2} placeholder={tx("Optional note")} />
          <button className={btnOutline} type="submit">
            {tx("Request account deletion")}
          </button>
        </form>
      </section>
    </div>
  );
}

async function Receipt({
  user,
}: {
  user: {
    paymentStatus: string;
    paymentMode: string;
    duesCents: number;
    role: string;
    paidAt: Date | null;
    renewalAt: Date | null;
  };
}) {
  const tx = await serverTx();
  const monthly = currentMonthlyCents(user.role, user.duesCents);
  const first = formatMoney(firstMonthCents(monthly));
  const full = formatMoney(monthly);
  return (
    <>
      <p>
        <b>{tx("Membership dues.")}</b> {tx(paymentStatusLabel(user.paymentStatus))}. {tx("First month")} {first}. {tx("Full price")} {full} {tx("per month")}.
      </p>
      <p>{tx(receiptLine(user.paymentMode))}</p>
      <p>{tx("Paid")} {user.paidAt ? formatAuditTime(user.paidAt) : "—"}.</p>
      <p>
        {tx("Next full-price charge")} {user.renewalAt ? formatLongEtDate(user.renewalAt) : "—"}. {tx("A reminder goes out before that charge.")}
      </p>
    </>
  );
}

function receiptLine(mode: string): string {
  if (mode === "simulated") return "Recorded as a simulated TEST payment. No card was charged.";
  if (mode === "stripe") return "Recorded from Stripe test mode. The card number stays at Stripe.";
  if (mode === "manual") return "Marked paid by a Private Floor administrator. No card is stored.";
  if (mode === "waived") return "Dues waived by a Private Floor administrator.";
  return "No card is stored.";
}

async function BillingSection({ user, tx }: { user: Awaited<ReturnType<typeof requireUser>>; tx: (text: string) => string }) {
  const h2 = "text-[11px] font-semibold uppercase tracking-[0.16em] text-brass";
  if (!showsBillingControls(user)) {
    return (
      <section id="billing" className={`${card} mt-4 p-4 text-sm`} data-testid="billing-free">
        <h2 className={h2}>{tx("Membership")}</h2>
        <p className="mt-2 text-[15px] text-ink">{tx("Membership is free for your role. There is nothing to pay.")}</p>
        <p className="mt-3">
          <Link href="/legal/membership-dues" className="underline decoration-brass">
            {tx("Membership Dues and Refund Terms")}
          </Link>
        </p>
      </section>
    );
  }
  const methods = await prisma.paymentMethod.findMany({ where: { userId: user.id } });
  const primary = methods.find((method) => method.role === "PRIMARY");
  const backup = methods.find((method) => method.role === "BACKUP");
  const stripeReady = isStripeTestSecret(process.env.STRIPE_SECRET_KEY) && Boolean(stripePublishableTestKey());
  const paused = isPaused(user);
  const setupLabels = (add: string) => ({ add, save: tx("Save card"), cancel: tx("Cancel"), working: tx("Working…"), saved: tx("Card saved.") });
  return (
    <section id="billing" className={`${card} mt-4 scroll-mt-20 p-4 text-[15px]`} data-testid="billing">
      <h2 className={h2}>{tx("Billing")}</h2>
      <div className="mt-2 space-y-1 text-ink">
        <Receipt user={user} />
        {user.waiverReason ? <p>Waiver: {user.waiverReason}</p> : null}
      </div>

      <h3 className="mt-5 font-serif text-lg text-forest">{tx("Payment methods")}</h3>
      <p className="mt-1 text-[14px] text-mut">{tx("If a charge on the primary card fails, the backup card is charged. Card numbers stay at Stripe.")}</p>
      {stripeReady ? null : (
        <p className="mt-2 rounded border border-brass bg-brass-soft px-3 py-2 text-[14px] text-forest" data-testid="billing-test-banner">
          {tx("TEST: Stripe test keys are not configured, so these buttons save a labelled test card. No card is entered or charged.")}
        </p>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["PRIMARY", "BACKUP"] as const).map((role) => {
          const method = role === "PRIMARY" ? primary : backup;
          return (
            <li key={role} className="min-w-0 rounded border border-line bg-cream p-3" data-testid={`card-${role.toLowerCase()}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{role === "PRIMARY" ? tx("Primary card") : tx("Backup card")}</p>
              <p className="mt-1 font-serif text-[17px] text-forest">
                {method ? methodLabel(method) : tx("None saved")}
                {method?.mode === "simulated" ? <span className="ml-2 rounded-sm bg-brass px-1.5 py-0.5 font-sans text-[10px] font-bold text-paper">TEST</span> : null}
              </p>
              {method ? <p className="text-[13px] text-mut">{tx("Expires")} {String(method.expMonth).padStart(2, "0")}/{method.expYear}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {stripeReady ? (
                  <CardSetup role={role} labels={setupLabels(method ? tx("Update card") : tx("Add card, Apple Pay, or Google Pay"))} />
                ) : (
                  <>
                    <form action={addSimulatedCard}>
                      <input type="hidden" name="role" value={role} />
                      <button className={btnOutline} type="submit">{method ? tx("Update card") : tx("Add test card")}</button>
                    </form>
                    {role === "PRIMARY" ? (
                      <form action={addSimulatedCard}>
                        <input type="hidden" name="role" value={role} />
                        <input type="hidden" name="wallet" value="apple_pay" />
                        <button className={btnOutline} type="submit">{tx("Use Apple Pay (test)")}</button>
                      </form>
                    ) : null}
                  </>
                )}
                {role === "BACKUP" && method ? (
                  <form action={removeBackupCard}>
                    <button className={btnOutline} type="submit">{tx("Remove")}</button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {primary && backup ? (
        <form action={swapPaymentMethods} className="mt-3">
          <button className={btnOutline} type="submit">{tx("Make backup the primary card")}</button>
        </form>
      ) : null}

      <h3 className="mt-6 font-serif text-lg text-forest">{tx("Pause membership")}</h3>
      {paused && user.pausedUntil ? (
        <div className="mt-2 rounded border border-line bg-cream p-3" data-testid="billing-paused">
          <p>
            <b>{tx("Paused until")} {formatLongEtDate(user.pausedUntil)}.</b> {tx("Nothing is charged while paused.")}
          </p>
          <p className="mt-1 text-[14px] text-mut">{tx("We email you one week before it resumes. If you take no action, dues resume automatically at the full price of $199 per month.")}</p>
          <form action={resumeMembershipNow} className="mt-2">
            <button className={btnOutline} type="submit">{tx("Resume now")}</button>
          </form>
        </div>
      ) : user.cancelRequestedAt ? null : (
        <form action={pauseMembership} className="mt-2 flex flex-wrap items-end gap-2" data-testid="billing-pause-form">
          <label className="min-w-0">
            <span className={labelCls}>{tx("Pause for")}</span>
            <select name="months" className={`${field} min-w-[10rem]`} defaultValue="1">
              {PAUSE_MONTH_OPTIONS.map((months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? tx("month") : tx("months")}
                </option>
              ))}
            </select>
          </label>
          <button className={btnOutline} type="submit">{tx("Pause membership")}</button>
          <p className="basis-full text-[14px] text-mut">{tx("No charges while paused. It resumes automatically at $199 per month; we email you a week before.")}</p>
        </form>
      )}

      <h3 className="mt-6 font-serif text-lg text-forest">{tx("Cancel membership")}</h3>
      {user.cancelRequestedAt ? (
        <p className="mt-2" data-testid="billing-cancelled">
          {tx("Cancellation recorded.")}{" "}
          {user.renewalAt ? `${tx("Access continues until")} ${formatLongEtDate(user.renewalAt)}.` : null} {tx("No further charge is scheduled.")}
        </p>
      ) : (
        <div className="mt-2">
          <form id="cancel-membership" action={cancelMembership} />
          <ConfirmSubmitButton
            form="cancel-membership"
            className={btnOutline}
            keepLabel={tx("Keep membership")}
            cancelledText={tx("Nothing was changed.")}
            message={`${tx("Cancel your membership?")} ${user.renewalAt ? `${tx("Access continues until")} ${formatLongEtDate(user.renewalAt)}.` : ""} ${tx("No further charge after that.")}`}
          >
            {tx("Cancel membership")}
          </ConfirmSubmitButton>
          <p className="mt-2 text-[14px] text-mut">{tx("Month to month. Access continues to the end of the period already paid.")}</p>
        </div>
      )}
      <p className="mt-4">
        <Link href="/legal/membership-dues" className="underline decoration-brass">
          {tx("Membership Dues and Refund Terms")}
        </Link>
      </p>
    </section>
  );
}
