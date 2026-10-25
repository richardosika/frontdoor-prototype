import Link from "next/link";
import type { ReactNode } from "react";
import { btn, btnOutline } from "@/components/ui";
import { BEFORE_SUBMIT_INTRO, CONSENT_LEGAL_LINKS, CONSENT_SECTIONS, DUES_TABLE } from "@/lib/apply-consent";
import type { SignupConsentCopy } from "@/lib/legal";

export function BeforeSubmit({
  consent,
  acceptTerms,
  acceptVerification,
  onTerms,
  onVerification,
  onBack,
  onContinue,
}: {
  consent: SignupConsentCopy;
  acceptTerms: boolean;
  acceptVerification: boolean;
  onTerms: (value: boolean) => void;
  onVerification: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-2xl font-normal">Before you submit</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">{BEFORE_SUBMIT_INTRO}</p>
      </header>
      <div className="space-y-4">
        {CONSENT_SECTIONS.map((section) => (
          <section key={section.id} className="rounded border border-line bg-cream px-4 py-4 md:px-5 md:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{section.label}</p>
            <h2 className="mt-1 font-serif text-lg font-normal">{section.title}</h2>
            {section.dues ? <DuesTable /> : <p className="mt-2 text-sm leading-relaxed text-ink">{section.body}</p>}
            {section.dues ? <p className="mt-3 text-sm leading-relaxed text-ink">{section.body}</p> : null}
          </section>
        ))}
      </div>
      <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
        {CONSENT_LEGAL_LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            target="_blank"
            className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-3 text-sm text-forest underline decoration-brass underline-offset-4"
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="rounded border border-brass bg-paper px-4 py-5 md:px-5">
        <h2 className="font-serif text-xl font-normal">Your agreement</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink">Both boxes start unchecked. Both are required.</p>
        <AgreementBoxes
          consent={consent}
          acceptTerms={acceptTerms}
          acceptVerification={acceptVerification}
          onTerms={onTerms}
          onVerification={onVerification}
        />
        <button className={`${btn} mt-5 w-full`} type="button" disabled={!acceptTerms || !acceptVerification} onClick={onContinue}>
          Continue
        </button>
        <button className={`${btnOutline} mt-2 w-full`} type="button" onClick={onBack}>
          Back
        </button>
        <p className="mt-3 text-xs leading-relaxed text-ink">{consent.helper}</p>
      </section>
    </div>
  );
}

function DuesTable() {
  return (
    <table className="mt-3 w-full border-collapse text-left text-sm">
      <caption className="sr-only">Annual dues by role</caption>
      <thead>
        <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-mut">
          <th className="py-2 pr-3 font-semibold" scope="col">
            Role
          </th>
          <th className="py-2 text-right font-semibold" scope="col">
            Annual dues
          </th>
        </tr>
      </thead>
      <tbody>
        {DUES_TABLE.map((row) => (
          <tr key={row.role} className="border-b border-line last:border-b-0">
            <th className="py-2.5 pr-3 font-normal text-ink" scope="row">
              {row.role}
            </th>
            <td className="py-2.5 text-right font-serif text-base text-forest">{row.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AgreementBoxes({
  consent,
  acceptTerms,
  acceptVerification,
  onTerms,
  onVerification,
}: {
  consent: SignupConsentCopy;
  acceptTerms: boolean;
  acceptVerification: boolean;
  onTerms: (value: boolean) => void;
  onVerification: (value: boolean) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <Check label={consent.termsLabel} checked={acceptTerms} onChange={onTerms} />
      <Check label={consent.verificationLabel} checked={acceptVerification} onChange={onVerification} />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded border border-line bg-cream px-3 py-3 text-sm leading-relaxed">
      <input className="mt-1 shrink-0" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function StepIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="font-serif text-2xl font-normal">{title}</h1>
      {children ? <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink">{children}</div> : null}
    </header>
  );
}
