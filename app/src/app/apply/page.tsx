import { AlreadySignedInNotice } from "@/components/already-signed-in";
import { ApplyWizard } from "@/components/apply-wizard";
import { Logo } from "@/components/logo";
import { currentUser } from "@/lib/current-user";
import { signupConsentCopy } from "@/lib/legal";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const user = await currentUser();
  if (user) {
    return (
      <main className="min-h-dvh bg-cream text-forest md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
        <article className="mx-auto w-full max-w-lg bg-paper px-6 py-8 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.28)]">
          <Logo />
          <div className="mt-6">
            <AlreadySignedInNotice name={user.name} />
          </div>
        </article>
      </main>
    );
  }
  const consent = signupConsentCopy();
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <ApplyWizard consent={consent} />
    </main>
  );
}
