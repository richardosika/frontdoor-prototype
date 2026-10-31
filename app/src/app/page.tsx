import { auth } from "@/auth";
import { AdminEntryLink } from "@/components/admin-mark";
import { LandingStart } from "@/components/landing-start";
import { Logo } from "@/components/logo";
import { LANDING_INTRO } from "@/lib/applicant-copy";
import { BRAND } from "@/lib/brand";
import { serverTx } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, tx] = await Promise.all([auth(), serverTx()]);
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-6 md:py-12">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-paper md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 text-paper md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="flex flex-1 flex-col justify-center px-6 py-10">
          <h1 className="font-serif text-4xl font-normal leading-tight">{BRAND.tagline}</h1>
          <p className="mt-4 text-base leading-relaxed text-ink">{LANDING_INTRO}</p>
          <LandingStart signedIn={Boolean(session?.user)} />
          <section className="mt-8 border-t border-line pt-6" data-testid="landing-pricing" aria-labelledby="landing-pricing-h">
            <h2 id="landing-pricing-h" className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">{tx("Membership")}</h2>
            <p className="mt-2 font-serif text-xl leading-snug text-forest">{tx("Paid memberships are $199 per month, and the first month is $99.50.")}</p>
            <p className="mt-2 text-sm leading-relaxed text-mut">{tx("Membership is free for developers, lenders, family offices, and investors/LPs.")}</p>
          </section>
          <p className="mt-10 text-xs leading-relaxed text-mut">
            {BRAND.name} does not offer securities, take subscriptions, or process payments. Raising posts are member-only notes, not an offer to sell.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <AdminEntryLink />
            <a href="/help" className="underline decoration-brass">
              Help
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
