import Link from "next/link";
import { AdminEntryLink } from "@/components/admin-mark";
import { LanguagePicker } from "@/components/language-picker";
import { LocaleProvider } from "@/components/locale-context";
import { cookies } from "next/headers";
import { currentLocale } from "@/lib/i18n/server";
import { LOCALE_COOKIE } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";
import { signInErrorFromCode } from "@/lib/sign-in-fallback";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const locale = await currentLocale();
  const tx = (text: string) => phrase(locale, text);
  // Nov 6: a device with no language chosen yet (first sign-in on a new laptop or phone) gets the picker first,
  // highlighted, with the heading in all four languages. Once chosen, it stays at the top as a smaller switch.
  const firstVisit = !(await cookies()).get(LOCALE_COOKIE)?.value;
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
        <LocaleProvider locale={locale}>
          <LanguagePicker
            locale={locale}
            label={firstVisit ? "Choose your language · Elija su idioma · Sprache wählen · 言語を選択" : tx("Language")}
            className={firstVisit ? "mb-5 rounded border-2 border-brass bg-brass-soft p-3" : "mb-5 rounded border border-line p-2"}
            columns={4}
            prominent={firstVisit}
            testId={firstVisit ? "login-language-first" : "login-language"}
          />
        </LocaleProvider>
        <h1 className="font-serif text-2xl font-normal">{tx("Sign in to {name}").replace("{name}", BRAND.name)}</h1>
        <p className="mb-4 mt-1 text-sm text-ink">{tx("Approved members only. Applications under review cannot sign in yet.")}</p>
        {process.env.SITE_GATE_PASSWORD ? (
          <p className="mb-4 rounded border border-line bg-cream px-3 py-2 text-sm text-ink" data-testid="login-gate-done">
            {tx("Test site: the tester gate is already open on this device. Sign in here with your member email and password, not the gate login.")}
          </p>
        ) : null}
        <LocaleProvider locale={locale}>
          <LoginForm next={params.next} initialError={signInErrorFromCode(params.error)} />
        </LocaleProvider>
        <p className="mt-4 text-center text-sm text-mut">
          <Link className="inline-flex min-h-11 items-center font-semibold text-brass" href="/#request-to-join">{tx("Request to join")}</Link>
        </p>
        <p className="mt-2 text-xs text-mut">{tx("The English version governs if a translation differs.")}</p>
        <p className="mt-2 text-center">
          <AdminEntryLink />
        </p>
        </div>
      </div>
    </main>
  );
}
