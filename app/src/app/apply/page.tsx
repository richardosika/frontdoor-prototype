import { ApplyWizard } from "@/components/apply-wizard";
import { signupConsentCopy } from "@/lib/legal";

export default function ApplyPage() {
  const consent = signupConsentCopy();
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <ApplyWizard consent={consent} />
    </main>
  );
}
