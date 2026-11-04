import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { setLanguage } from "@/actions/language";
import { Logo } from "@/components/logo";
import { LOCALES, type Locale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";

/** /join header: logo, a four-language switch that wraps on small screens, and sign in. */
export function JoinHeader({ locale }: { locale: Locale }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-forest px-4 py-4 text-paper sm:px-8">
      <Logo tone="paper" />
      <div className="flex flex-wrap items-center gap-3">
        <form action={setLanguage} className="flex flex-wrap gap-1" data-testid="join-language-picker" aria-label={phrase(locale, "Language")}>
          {LOCALES.map((item) => (
            <SubmitButton
              key={item.id}
              name="locale"
              value={item.id}
             
              lang={item.id}
              aria-pressed={item.id === locale}
              className={`min-h-9 rounded-sm border px-2 text-[12px] font-semibold ${item.id === locale ? "border-brass bg-brass text-forest" : "border-paper/40 text-paper hover:border-brass"}`}
            >
              {item.label}
            </SubmitButton>
          ))}
        </form>
        <Link href="/login" className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">{phrase(locale, "Sign in")}</Link>
      </div>
    </header>
  );
}
