import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { simulateFailedPayment, simulatePayment, startStripeCheckout } from "@/actions/payments";
import { Logo } from "@/components/logo";
import { btn, btnOutline } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { DUES_ANNUAL_NOTE, DUES_WAIVED, duesLabel } from "@/lib/dues";
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
  error?: string;
  notice?: string;
}) {
  const open = status === "PAID" || status === "WAIVED" || status === "NOT_REQUIRED";
  return (
    <main className="min-h-dvh bg-cream text-forest md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <article className="mx-auto w-full max-w-lg bg-paper px-6 py-8 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.28)]">
        <Logo />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Annual dues</p>
        <h1 className="mt-1 font-serif text-3xl font-normal">Pay annual dues</h1>
        <p className="mt-2 text-sm text-ink">
          {name} · {roleLabel(role)}
        </p>
        {error ? <p className="mt-3 text-sm text-brass">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-forest">{notice}</p> : null}
        <div className="mt-4 rounded border border-brass bg-brass-soft p-4">
          <p className="font-serif text-4xl font-normal">{duesLabel(cents)}</p>
          <p className="mt-2 text-sm text-ink">{DUES_ANNUAL_NOTE}</p>
          <p className="mt-2 text-sm text-ink">{DUES_COVERS}</p>
          {status === "WAIVED" ? <p className="mt-2 text-sm text-forest">{DUES_WAIVED}</p> : null}
          {status === "WAIVED" ? null : (
            <p className="mt-2 text-sm text-forest">Renewal date {paymentRenewalLabel(renewalAt)}.</p>
          )}
          <p className="mt-2 text-sm text-ink">Until this is recorded, the rest of the floor stays closed.</p>
        </div>
        <p className="mt-3 text-sm">
          <Link href="/legal/membership-dues" className="underline decoration-brass">
            Membership Dues and Refund Terms
          </Link>
        </p>
        {mode === "simulated" ? (
          <p className="mt-3 rounded border border-brass px-3 py-2 text-sm text-forest">
            TEST. Simulated payment. {BRAND.name} does not store a card number, and this button does not charge one.
          </p>
        ) : (
          <p className="mt-3 rounded border border-line px-3 py-2 text-sm text-ink">
            Stripe test mode. No live charge. {BRAND.name} does not store your card number.
          </p>
        )}
        {open ? (
          <div className="mt-4 text-sm">
            <p>This membership is active{renewalAt ? `. Renewal date ${formatEtDate(renewalAt)}` : ""}.</p>
            <Link href={signedIn ? "/feed" : "/login"} className={`${btn} mt-3`}>
              {signedIn ? "Open the floor" : "Sign in"}
            </Link>
          </div>
        ) : mode === "stripe" ? (
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
                Pay annual dues (test)
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
        {signedIn ? (
          <form action={logoutAction} className="mt-6">
            <button className="text-sm underline decoration-brass" type="submit">
              Sign out
            </button>
          </form>
        ) : null}
      </article>
    </main>
  );
}
