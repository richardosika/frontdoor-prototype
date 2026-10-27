import Link from "next/link";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <article className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-3xl font-normal">Help</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            A person answers questions about membership. Email{" "}
            <a className="underline decoration-brass" href={`mailto:${BRAND.contactEmail}`}>
              {BRAND.contactEmail}
            </a>{" "}
            or call{" "}
            <a className="underline decoration-brass" href="tel:+18003993745">
              {BRAND.contactPhone}
            </a>
            .
          </p>
          <h2 className="mt-6 font-serif text-xl font-normal">How it works</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
            <li>Request to join from the home page, or complete the application.</li>
            <li>A Private Floor administrator reviews every application. Automation does not approve anyone.</li>
            <li>The status link in your email is where you see the decision and reply if more information is needed.</li>
            <li>After approval, sign in. Paid roles are month to month. The first month is half price.</li>
          </ul>
          <p className="mt-6 text-sm">
            <Link href="/" className="underline decoration-brass">
              Back to the start
            </Link>
          </p>
        </div>
      </article>
    </main>
  );
}
