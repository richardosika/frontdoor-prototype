"use client";

import { PageRecover } from "@/components/page-recover";
import { useLocale } from "@/components/locale-context";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageRecover error={error} reset={reset} locale={useLocale()} />;
}
