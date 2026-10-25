import Link from "next/link";
import { AdminEntryLink } from "@/components/admin-mark";
import { Logo } from "@/components/logo";
import { RequestInviteForm } from "@/components/request-invite-form";
import { btn, btnOutline } from "@/components/ui";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-6 md:py-12">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-paper md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 text-paper md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="flex flex-1 flex-col justify-center px-6 py-10">
          <h1 className="font-serif text-4xl font-normal leading-tight">{BRAND.tagline}</h1>
          <p className="mt-4 text-base leading-relaxed text-ink">
            The {BRAND.club} is nationwide and invite-only. A Private Floor administrator reviews every application. A business card is optional. Deal rooms open only after the sponsor approves an NDA acknowledgement. Nothing is charged during this test.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className={btn}>
              Sign in
            </Link>
            <Link href="/apply" className={btnOutline}>
              Apply with an invite
            </Link>
          </div>
          <RequestInviteForm />
          <p className="mt-10 text-xs leading-relaxed text-mut">
            {BRAND.name} does not offer securities, take subscriptions, or process payments. Raising posts are member-only notes, not an offer to sell.
          </p>
          <div className="mt-4">
            <AdminEntryLink />
          </div>
        </div>
      </div>
    </main>
  );
}
