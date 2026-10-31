import Link from "next/link";
import { ReferralCodePage } from "@/components/join-application";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default function ReferralCodeRoute() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-cream">
      <header className="flex items-center justify-between bg-forest px-4 py-4 text-paper sm:px-8">
        <Logo tone="paper" />
        <Link href="/login" className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">Sign in</Link>
      </header>
      <ReferralCodePage />
    </main>
  );
}
