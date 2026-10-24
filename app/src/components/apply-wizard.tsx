"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { checkInvite, submitApplication } from "@/actions/apply";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { GROUPS, ROLES } from "@/lib/roles";
import type { RoleId } from "@/lib/roles";
import { BRAND } from "@/lib/brand";

export function ApplyWizard() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [statusToken, setStatusToken] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<RoleId>("DEVELOPER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [location, setLocation] = useState("");
  const cardRef = useRef<HTMLInputElement>(null);
  const [referenceEmail, setReferenceEmail] = useState("");
  const [referenceEmail2, setReferenceEmail2] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [statement, setStatement] = useState("");

  const selected = ROLES.find((item) => item.id === role) ?? ROLES[0];

  async function nextFromCode() {
    setPending(true);
    setError("");
    const result = await checkInvite(code);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep(2);
  }

  async function submit() {
    setPending(true);
    setError("");
    const data = new FormData();
    data.set("code", code);
    data.set("role", role);
    data.set("name", name);
    data.set("email", email);
    data.set("password", password);
    data.set("org", org);
    data.set("location", location);
    data.set("referenceEmail", referenceEmail);
    data.set("referenceEmail2", referenceEmail2);
    data.set("phone", phone);
    data.set("linkedinUrl", linkedinUrl);
    data.set("statement", statement);
    const file = cardRef.current?.files?.[0];
    if (file) data.set("businessCard", file);
    const result = await submitApplication(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatusToken(result.statusToken);
    setDone(true);
    setStep(4);
  }

  return (
    <div className="safe-bottom mx-auto min-h-dvh w-full max-w-[520px] overflow-hidden bg-paper md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
      <div className="safe-top flex items-center justify-between bg-forest px-5 pb-4 text-paper md:py-4">
        <span className="font-serif text-lg tracking-[0.18em] uppercase">Apply</span>
        <span className="text-xs text-sand">Step {Math.min(step, 4)} of 4</span>
      </div>
      <div className="flex gap-1.5 px-5 pt-4">
        {[1, 2, 3, 4].map((item) => (
          <i key={item} className={`h-1 flex-1 rounded ${item <= step ? "bg-brass" : "bg-line"}`} />
        ))}
      </div>
      <div className="px-5 py-5">
        {error ? <p className="mb-3 text-sm text-brass">{error}</p> : null}
        {step === 1 ? (
          <div>
            <h1 className="font-serif text-xl">Welcome to the {BRAND.club}</h1>
            <p className="mt-1 text-sm text-ink">{BRAND.tagline} Enter the code a member shared with you.</p>
            <label className={`${labelCls} mt-4`}>Invite code</label>
            <input className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder="PF-XXXX-XXXX" />
            <button className={`${btn} mt-4 w-full`} type="button" disabled={pending} onClick={nextFromCode}>
              Continue
            </button>
          </div>
        ) : null}
        {step === 2 ? (
          <div>
            <h1 className="font-serif text-xl">I am a…</h1>
            <p className="mt-1 text-sm text-ink">Pick the role that best describes you. You can verify one role now.</p>
            <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
              {GROUPS.map((group) => (
                <div key={group}>
                  <div className="mb-1.5 mt-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-mut">{group}</div>
                  {ROLES.filter((item) => item.group === group).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                      className={`mb-2 flex w-full items-center gap-2.5 rounded border px-3 py-2.5 text-left text-sm ${
                        role === item.id ? "border-brass bg-brass-soft" : "border-line bg-paper"
                      }`}
                    >
                      <i
                        className={`h-4 w-4 shrink-0 rounded-full border ${
                          role === item.id ? "border-brass bg-brass shadow-[inset_0_0_0_3px_#FFFDF8]" : "border-line"
                        }`}
                      />
                      <span>
                        {item.label}
                        <small className="block text-[11px] text-mut">{item.blurb}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className={`${btn} flex-1`} type="button" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </div>
        ) : null}
        {step === 3 && !done ? (
          <div className="space-y-3">
            <h1 className="font-serif text-xl">Your details</h1>
            <p className="text-sm text-ink">
              Name, email, password, company, and city. A business card is optional and encouraged. References are optional. The committee checks the file internally.
            </p>
            <div className="rounded-sm border border-brass px-3 py-2 text-sm">
              {code.toUpperCase()} <span className="float-right text-brass">Accepted</span>
            </div>
            <div className="rounded border border-brass bg-brass-soft px-3 py-2 text-sm">
              {selected.label}
              <small className="block text-[11px] text-mut">{selected.group}</small>
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input className={field} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={field} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input className={field} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input className={field} value={org} onChange={(event) => setOrg(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City, state</label>
              <input className={field} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Newark, NJ" />
            </div>
            <div>
              <label className={labelCls}>Business card (optional, encouraged)</label>
              <input ref={cardRef} className={field} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" />
              <p className="mt-1 text-[11px] text-mut">
                JPG, PNG, or PDF, up to 5 MB. The committee matches it to public records. Other members never see the file.
              </p>
            </div>
            <div>
              <label className={labelCls}>Phone (committee only)</label>
              <input className={field} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>LinkedIn URL (committee only)</label>
              <input className={field} value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://" />
              <p className="mt-1 text-[11px] text-mut">Other members never see your email, phone, or LinkedIn URL.</p>
            </div>
            <div>
              <label className={labelCls}>Reference email (optional)</label>
              <input className={field} type="email" value={referenceEmail} onChange={(event) => setReferenceEmail(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Second reference email (optional)</label>
              <input className={field} type="email" value={referenceEmail2} onChange={(event) => setReferenceEmail2(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Anyone who can speak for you? (optional)</label>
              <textarea className={field} rows={3} value={statement} onChange={(event) => setStatement(event.target.value)} />
            </div>
            {pending ? (
              <p role="status" className="text-sm font-semibold text-forest">
                Submitting your application…
              </p>
            ) : null}
            <div className="flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(2)} disabled={pending}>
                Back
              </button>
              <button className={`${btn} flex-1`} type="button" disabled={pending} aria-busy={pending} onClick={submit}>
                {pending ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 grid h-[88px] w-[88px] place-items-center rounded-full border-2 border-brass font-serif text-3xl text-brass">
              ⏳
            </div>
            <h1 className="font-serif text-xl">Application under review</h1>
            <p className="mt-2 text-sm text-ink">
              The committee reviews applications within a few business days. Keep the status link. The note from the committee appears there when they decide.
            </p>
            <div className="mt-4 rounded border border-brass bg-brass-soft p-3 text-left text-sm">
              <b>What happens next</b>
              <p className="mt-1 text-ink">
                1. The committee matches a business card to public records when one was uploaded
                <br />
                2. Reference emails are optional. The committee keeps them only if you filled them in.
                <br />
                3. If approved, you sign in as an Invited member
              </p>
            </div>
            {statusToken ? (
              <Link href={`/apply/status/${statusToken}`} className={`${btn} mt-4 w-full`}>
                View application status
              </Link>
            ) : null}
            <Link href="/login" className={`${btnOutline} mt-2 w-full`}>
              Back to sign in
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
