import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { cancelMembership, simulateFailedPayment, simulatePayment, startStripeCheckout } from "@/actions/payments";
import { DuesLanguages } from "@/components/dues-languages";
import { Logo } from "@/components/logo";
import { btn, btnOutline } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { DUES_BILLING_NOTE, DUES_WAIVED, firstMonthCents, formatMoney, payPageState } from "@/lib/dues";
import { formatEtDate } from "@/lib/format";
import { DUES_COVERS, paymentRenewalLabel } from "@/lib/payments";
import { roleLabel } from "@/lib/roles";

export function PayDues({
  name,
  role,
  cents,
  token,
  mode,
  status,
  renewalAt,
  signedIn,
  cancelled,
  error,
  notice,
}: {
  name: string;
  role: string;
  cents: number;
  token: string;
  mode: "stripe" | "simulated";
  status: string;
  renewalAt: Date | null;
  signedIn?: boolean;
  cancelled?: boolean;
  error?: string;
  notice?: string;
}) {
  const active = payPageState(status) === "active";
  const first = firstMonthCents(cents);
  const full = formatMoney(cents);
  return (
    <main className="min-h-dvh bg-cream text-forest md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <article className="mx-auto w-full max-w-lg bg-paper px-6 py-8 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.28)]">
        <Logo />
        {active ? (
          <>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Membership</p>
            <h1 className="mt-1 font-serif text-3xl font-normal">This membership is active</h1>
            <p className="mt-2 text-sm text-ink">
              {name} · {roleLabel(role)}
            </p>
            {error ? <p className="mt-3 text-sm text-brass">{error}</p> : null}
            {notice ? <p className="mt-3 text-sm text-forest">{notice}</p> : null}
            <p className="mt-4 text-sm text-forest">
              This membership is active{renewalAt ? `. Next charge date ${formatEtDate(renewalAt)}` : ""}.
              {status === "WAIVED" ? ` ${DUES_WAIVED}` : ""}
            </p>
            {cancelled ? (
              <p className="mt-2 text-sm text-forest">
                Cancellation is recorded.
                {renewalAt && status === "PAID" ? ` Access continues through ${formatEtDate(renewalAt)}.` : " Nothing further is scheduled."}
              </p>
            ) : null}
            <Link href={signedIn ? "/feed" : "/login"} className={`${btn} mt-4`}>
              {signedIn ? "Open the floor" : "Sign in"}
            </Link>
            {signedIn ? (
              <form action={logoutAction} className="mt-6">
                <button className="text-sm underline decoration-brass" type="submit">
                  Sign out
                </button>
              </form>
            ) : null}
          </>
        ) : (
          <>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Membership dues</p>
        <h1 className="mt-1 font-serif text-3xl font-normal">Pay membership dues</h1>
        <p className="mt-3 rounded border border-[#7A2E2E] bg-brass-soft px-3 py-2 text-sm font-semibold text-forest" role="status">
          Test mode: no real charge
        </p>
        <p className="mt-2 text-sm text-ink">
          {name} · {roleLabel(role)}
        </p>
        {error ? <p className="mt-3 text-sm text-brass">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-forest">{notice}</p> : null}
        <div className="mt-4 rounded border border-brass bg-brass-soft p-4">
          {status === "WAIVED" ? (
            <p className="font-serif text-3xl font-normal">{DUES_WAIVED}</p>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">First month, 50% off</p>
              <p className="mt-1 font-serif text-4xl font-normal">{formatMoney(first)}</p>
              <p className="mt-2 text-sm text-ink">Then {full} per month.</p>
            </>
          )}
          <p className="mt-2 text-sm text-ink">{DUES_BILLING_NOTE}</p>
          <p className="mt-2 text-sm text-ink">{DUES_COVERS}</p>
          {status === "WAIVED" ? null : (
            <p className="mt-2 text-sm text-forest">
              {renewalAt
                ? `Your next full-price payment is on ${paymentRenewalLabel(renewalAt)}.`
                : `Your first full-price payment would be on ${paymentRenewalLabel(renewalAt)}.`}
            </p>
          )}
          {cancelled ? (
            <p className="mt-2 text-sm text-forest">
              Cancellation is recorded.
              {renewalAt && status === "PAID" ? ` Access continues through ${formatEtDate(renewalAt)}.` : " Nothing further is scheduled."}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-ink">Until the first month is recorded, the rest of the floor stays closed.</p>
        </div>
        <p className="mt-3 text-sm">
          <Link href="/legal/membership-dues" className="underline decoration-brass">
            Membership Dues and Refund Terms
          </Link>
        </p>
        <DuesLanguages />
        {mode === "simulated" ? (
          <p className="mt-3 rounded border border-brass px-3 py-2 text-sm text-forest">
            TEST. Simulated payment. {BRAND.name} does not store a card number, and this button does not charge one.
          </p>
        ) : (
          <p className="mt-3 rounded border border-line px-3 py-2 text-sm text-ink">
            Stripe test mode. The first invoice is 50% off. No live charge. {BRAND.name} does not store your card number.
          </p>
        )}
        {mode === "stripe" ? (
          <form action={startStripeCheckout} className="mt-4">
            <input type="hidden" name="token" value={token} />
            <button className={btn} type="submit">
              Continue to Stripe test checkout
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={simulatePayment}>
              <input type="hidden" name="token" value={token} />
              <button className={btn} type="submit">
                Pay first month {formatMoney(first)} (test)
              </button>
            </form>
            <form action={simulateFailedPayment}>
              <input type="hidden" name="token" value={token} />
              <button className={btnOutline} type="submit">
                Simulate a failed payment
              </button>
            </form>
          </div>
        )}
        {cancelled ? null : (
          <form action={cancelMembership} className="mt-4">
            <input type="hidden" name="token" value={token} />
            <button className={btnOutline} type="submit">
              Cancel anytime
            </button>
            <p className="mt-2 text-sm text-ink">Month to month. No long-term contract. Cancellation stops the next charge.</p>
          </form>
        )}
        {signedIn ? (
          <form action={logoutAction} className="mt-6">
            <button className="text-sm underline decoration-brass" type="submit">
              Sign out
            </button>
          </form>
        ) : null}
          </>
        )}
      </article>
    </main>
  );
}
