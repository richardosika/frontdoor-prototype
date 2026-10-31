import Link from "next/link";
import { AlreadySignedInNotice } from "@/components/already-signed-in";
import { JoinApplication } from "@/components/join-application";
import { Logo } from "@/components/logo";
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
  return (
    <main className="min-h-dvh overflow-x-hidden bg-cream">
      <header className="flex items-center justify-between bg-forest px-4 py-4 text-paper sm:px-8">
        <Logo tone="paper" />
        <Link href="/login" className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">Sign in</Link>
      </header>
      <JoinApplication
        initialCode={query.code || ""}
        initialStep={query.step === "2" ? 2 : 1}
        initialRole={query.role || "DEVELOPER"}
        termsLabel={consent.termsLabel}
        verificationLabel={consent.verificationLabel}
      />
    </main>
  );
}
