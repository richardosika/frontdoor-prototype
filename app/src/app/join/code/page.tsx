import { JoinHeader } from "@/components/join-header";
import { ReferralCodePage } from "@/components/join-application";
import { LocaleProvider } from "@/components/locale-context";
import { currentLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ReferralCodeRoute() {
  const locale = await currentLocale();
  return (
    <main lang={locale} className="min-h-dvh overflow-x-hidden bg-cream">
      <JoinHeader locale={locale} />
      <LocaleProvider locale={locale}>
        <ReferralCodePage />
      </LocaleProvider>
    </main>
  );
}
