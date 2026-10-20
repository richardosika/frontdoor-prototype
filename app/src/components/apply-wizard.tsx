"use client";

import { useState } from "react";
import Link from "next/link";
import { checkInvite, submitApplication } from "@/actions/apply";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { GROUPS, ROLES } from "@/lib/roles";
import type { RoleId } from "@/lib/roles";

export function ApplyWizard() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("FD-7K2M-91QX");
  const [role, setRole] = useState<RoleId>("DEVELOPER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [location, setLocation] = useState("");
  const [credentialValue, setCredentialValue] = useState("");
  const [referenceEmail, setReferenceEmail] = useState("");
  const [referenceEmail2, setReferenceEmail2] = useState("");
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
    const result = await submitApplication({
      code,
      role,
      name,
      email,
      password,
      org,
      location,
      credentialValue,
      referenceEmails: [referenceEmail, referenceEmail2],
      statement,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    setStep(4);
  }

  return (
    <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_rgba(0,0,0,.35)]">
      <div className="flex items-center justify-between bg-navy px-5 py-4 text-white">
        <span className="font-serif text-lg tracking-[0.18em] uppercase">Apply</span>
        <span className="text-xs text-[#C4CCDD]">Step {Math.min(step, 4)} of 4</span>
      </div>
      <div className="flex gap-1.5 px-5 pt-4">
        {[1, 2, 3, 4].map((item) => (
          <i key={item} className={`h-1 flex-1 rounded ${item <= step ? "bg-terra" : "bg-line"}`} />
        ))}
      </div>
      <div className="px-5 py-5">
        {error ? <p className="mb-3 text-sm text-terra">{error}</p> : null}
        {step === 1 ? (
          <div>
            <h1 className="font-serif text-xl">Welcome to FrontDoor</h1>
            <p className="mt-1 text-sm text-ink">FrontDoor is invite-only. Enter the code a member shared with you.</p>
            <label className={`${labelCls} mt-4`}>Invite code</label>
            <input className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder="FD-XXXX-XXXX" />
            <button className={`${btn} mt-4 w-full`} type="button" disabled={pending} onClick={nextFromCode}>
              Continue
            </button>
            <p className="mt-3 text-center text-xs text-mut">
              Demo code <b>FD-7K2M-91QX</b>
            </p>
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
                      className={`mb-2 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm ${
                        role === item.id ? "border-terra bg-terraSoft" : "border-line bg-white"
                      }`}
                    >
                      <i
                        className={`h-4 w-4 shrink-0 rounded-full border ${
                          role === item.id ? "border-terra bg-terra shadow-[inset_0_0_0_3px_#fff]" : "border-line"
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
            <h1 className="font-serif text-xl">Credentials and references</h1>
            <p className="text-sm text-ink">Light checks now. Deeper checks happen when you request a deal room.</p>
            <div className="rounded-[10px] border border-terra px-3 py-2 text-sm">
              {code.toUpperCase()} <span className="float-right text-terra">Accepted</span>
            </div>
            <div className="rounded-xl border border-terra bg-terraSoft px-3 py-2 text-sm">
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
              <label className={labelCls}>{selected.credentialLabel}</label>
              <input
                className={field}
                value={credentialValue}
                onChange={(event) => setCredentialValue(event.target.value)}
                placeholder={selected.credentialPlaceholder}
              />
              <p className="mt-1 text-[11px] text-mut">We check: {selected.check}.</p>
            </div>
            <div>
              <label className={labelCls}>Reference email</label>
              <input className={field} type="email" value={referenceEmail} onChange={(event) => setReferenceEmail(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Second reference (optional)</label>
              <input className={field} type="email" value={referenceEmail2} onChange={(event) => setReferenceEmail2(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Short statement</label>
              <textarea className={field} rows={3} value={statement} onChange={(event) => setStatement(event.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className={`${btn} flex-1`} type="button" disabled={pending} onClick={submit}>
                Submit application
              </button>
            </div>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 grid h-[88px] w-[88px] place-items-center rounded-full border-2 border-terra font-serif text-3xl text-terra">
              ⏳
            </div>
            <h1 className="font-serif text-xl">Application under review</h1>
            <p className="mt-2 text-sm text-ink">
              The committee reviews applications within a few business days. Reference notes are written to the server log by the console email adapter.
            </p>
            <div className="mt-4 rounded-2xl border border-terra bg-terraSoft p-3 text-left text-sm">
              <b>What happens next</b>
              <p className="mt-1 text-ink">
                1. Credential check: {selected.check}
                <br />
                2. Reference emails logged
                <br />
                3. Badge issued: Invited, then Verified or Confirmed after review
              </p>
            </div>
            <Link href="/login" className={`${btn} mt-4 w-full`}>
              Back to sign in
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
