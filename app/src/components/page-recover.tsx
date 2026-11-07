"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";

/**
 * A page could not finish loading in the browser. The usual cause is a page left open across a site update:
 * the button's action already ran on the server, but the old page cannot load the new page's scripts.
 * Reload once by itself; if that does not help, show a short note and a reload button instead of a blank error.
 */
const RELOAD_KEY = "pf-recover-reload";

export function PageRecover({ error, reset, locale }: { error: Error & { digest?: string }; reset?: () => void; locale: Locale }) {
  const tx = (text: string) => phrase(locale, text);
  useEffect(() => {
    console.error(error);
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert" data-testid="page-recover">
      <p className="font-serif text-[22px] text-ink">{tx("Something went wrong loading this page.")}</p>
      <p className="mt-2 text-[15px] text-mut">{tx("Your last action may already have gone through. Reload to see the latest.")}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="min-h-11 rounded-sm bg-forest px-4 text-[15px] font-semibold text-paper"
          onClick={() => {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
          }}
        >
          {tx("Reload page")}
        </button>
        {reset ? (
          <button type="button" className="min-h-11 rounded-sm border border-forest px-4 text-[15px] font-semibold text-forest" onClick={() => reset()}>
            {tx("Try again")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
