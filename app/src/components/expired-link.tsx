import Link from "next/link";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { expiredLinkCopy } from "@/lib/expired-link";

export function ExpiredLink({ kind }: { kind: "payment" | "status" }) {
  const copy = expiredLinkCopy(kind);
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-2xl font-normal">{copy.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink">{copy.body}</p>
          <Link href="/login" className={`${btn} mt-5 w-full`}>
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
