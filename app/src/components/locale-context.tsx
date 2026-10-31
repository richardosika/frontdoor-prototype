"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Translate an English UI phrase into the member's language. Unknown phrases stay English. */
export function useTx(): (text: string) => string {
  const locale = useContext(LocaleContext);
  return (text) => phrase(locale, text);
}
