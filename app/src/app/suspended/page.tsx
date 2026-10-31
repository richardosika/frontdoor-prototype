import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { btnOutline } from "@/components/ui";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function SuspendedPage() {
  return (
    <main className="min-h-dvh bg-cream text-forest md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <article className="mx-auto w-full max-w-lg bg-paper px-6 py-8 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.28)]">
        <Logo />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Account</p>
        <h1 className="mt-1 font-serif text-3xl font-normal">Account suspended</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          This account is suspended. You can sign out below. A Private Floor administrator can reinstate it. Write to{" "}
          <a className="underline decoration-brass" href={`mailto:${BRAND.contactEmail}`}>
            {BRAND.contactEmail}
          </a>{" "}
          if you need help.
        </p>
        <form action={logoutAction} className="mt-6">
          <button className={btnOutline} type="submit">
            Sign out
          </button>
        </form>
      </article>
    </main>
  );
}
