"use client";

import { SubmitButton } from "@/components/submit-button";
import { setLanguage } from "@/actions/language";
import { LOCALES, type Locale } from "@/lib/i18n/messages";

/** Nov 5: one picker (English, Español, Deutsch, 日本語) for the sidebar menu and the sign-in page. */
export function LanguagePicker({ locale, label, className = "border-t border-line px-3 py-2" }: { locale: Locale; label: string; className?: string }) {
  return (
    <form action={setLanguage} className={className} data-testid="language-picker" translate="no">
      <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-mut">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {LOCALES.map((item) => (
          <SubmitButton
            key={item.id}
            name="locale"
            value={item.id}
            lang={item.id}
            aria-pressed={item.id === locale}
            className={`min-h-11 rounded-sm border px-2 text-left font-sans text-[14px] ${item.id === locale ? "border-brass bg-forest text-paper" : "border-line bg-paper text-forest hover:bg-cream"}`}
          >
            {item.label}
          </SubmitButton>
        ))}
      </div>
    </form>
  );
}
