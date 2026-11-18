"use client";

import "./globals.css";
import { PageRecover } from "@/components/page-recover";
import type { Locale } from "@/lib/i18n/messages";

function browserLocale(): Locale {
  const code = typeof navigator === "undefined" ? "en" : navigator.language.slice(0, 2).toLowerCase();
  return code === "es" || code === "de" || code === "ja" ? code : "en";
}

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body className="bg-paper">
        <PageRecover error={error} locale={browserLocale()} />
      </body>
    </html>
  );
}
