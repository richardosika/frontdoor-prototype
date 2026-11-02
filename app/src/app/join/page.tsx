import { AlreadySignedInNotice } from "@/components/already-signed-in";
import { JoinApplication } from "@/components/join-application";
import { JoinHeader } from "@/components/join-header";
import { LocaleProvider } from "@/components/locale-context";
import { currentLocale } from "@/lib/i18n/server";
import { currentUser } from "@/lib/current-user";
import { signupConsentCopy } from "@/lib/legal";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; step?: string; role?: string }>;
}) {
  const query = await searchParams;
  const user = await currentUser();
  if (user) {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-cream px-4 py-10">
        <AlreadySignedInNotice name={user.name} />
      </main>
    );
  }
  const consent = signupConsentCopy();
  const locale = await currentLocale();
  return (
    <main lang={locale} className="min-h-dvh overflow-x-hidden bg-cream">
      <JoinHeader locale={locale} />
      <LocaleProvider locale={locale}>
      <JoinApplication
        initialCode={query.code || ""}
        initialStep={query.step === "2" ? 2 : 1}
        initialRole={query.role || "DEVELOPER"}
        termsLabel={consent.termsLabel}
        verificationLabel={consent.verificationLabel}
      />
      </LocaleProvider>
    </main>
  );
}
