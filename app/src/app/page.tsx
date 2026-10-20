import Link from "next/link";
import { Logo } from "@/components/logo";
import { btn, btnOutline } from "@/components/ui";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_80%_10%,#2A4272,transparent_55%),#14213D] text-white">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
        <Logo light />
        <h1 className="mt-8 max-w-xl font-serif text-4xl font-normal leading-tight sm:text-5xl">
          A vetted network for real estate deal teams.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-[#C4CCDD]">
          {BRAND.name} is invite-only. Members apply with a role and references, a committee reviews them, and deal rooms open only after the sponsor approves an NDA acknowledgement.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={`${btn} bg-white text-navy`}>
            Sign in
          </Link>
          <Link href="/apply" className={`${btnOutline} border-white text-white`}>
            Apply with an invite
          </Link>
        </div>
        <p className="mt-10 max-w-lg text-xs leading-relaxed text-[#C4CCDD]">
          {BRAND.name} does not offer securities, take subscriptions, or process payments. Raising posts are member-only notes, not an offer to sell.
        </p>
      </div>
    </main>
  );
}
