"use client";

import { useState } from "react";
import { CopyCode } from "@/components/copy-code";
import { btn, field } from "@/components/ui";
import { applicationReceivedMessage, INVITE_REQUEST_THANKS_TITLE } from "@/lib/applicant-copy";
import { validateAddress, validatePersonName } from "@/lib/person-fields";
import { ROLES } from "@/lib/roles";

export function ColleagueInvite({ codes = [] }: { codes?: { code: string; note: string }[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [thanksName, setThanksName] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("firstName") ?? "");
    const lastName = String(form.get("lastName") ?? "");
    const nameError = validatePersonName(firstName, lastName)[0];
    const addressError = validateAddress({
      street: String(form.get("street") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      zip: String(form.get("zip") ?? ""),
    })[0];
    if (nameError || addressError) {
      setError(nameError || addressError || "Check the form and try again.");
      return;
    }
    setPending(true);
    const response = await fetch("/api/request-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email: form.get("email"),
        role: form.get("role"),
        company: form.get("company"),
        street: form.get("street"),
        city: form.get("city"),
        state: form.get("state"),
        zip: form.get("zip"),
        note: form.get("note"),
        website: form.get("website"),
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(payload?.error || "Could not send that request.");
      return;
    }
    setThanksName(firstName.trim());
    setDone(true);
  }

  return (
    <div className="rounded border border-line bg-paper p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Refer a colleague</h2>
      {codes.length ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-ink">Unused codes you can pass along. Private Floor does not email them.</p>
          {codes.map((item) => (
            <CopyCode key={item.code} code={item.code} caption={item.note || "Referral code"} />
          ))}
        </div>
      ) : null}
      {done ? (
        <div className="mt-3 rounded border border-brass bg-brass-soft px-3 py-3">
          <p className="font-serif text-lg">{INVITE_REQUEST_THANKS_TITLE}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink">{applicationReceivedMessage(thanksName)}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-2 grid gap-2">
          <p className="text-xs text-ink">
            Ask for a colleague to be reviewed. A referral code is optional. A Private Floor administrator reviews every application. They will hear from us by email.
          </p>
          <label className="absolute -left-[9999px]" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {error ? <p className="text-xs text-brass">{error}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="firstName" className={field} placeholder="First name" autoComplete="given-name" required />
            <input name="lastName" className={field} placeholder="Last name" autoComplete="family-name" required />
          </div>
          <input name="email" type="email" className={field} placeholder="Email" required />
          <select name="role" className={field} defaultValue="DEVELOPER" aria-label="Role">
            {ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
          <input name="company" className={field} placeholder="Company" required />
          <input name="street" className={field} placeholder="Street" autoComplete="address-line1" required />
          <div className="grid gap-2 sm:grid-cols-3">
            <input name="city" className={field} placeholder="City" autoComplete="address-level2" required />
            <input name="state" className={field} placeholder="ST" autoComplete="address-level1" maxLength={2} aria-label="State" required />
            <input name="zip" className={field} placeholder="ZIP" autoComplete="postal-code" inputMode="numeric" aria-label="ZIP" required />
          </div>
          <textarea name="note" className={field} rows={2} placeholder="Short note (optional)" aria-label="Note" />
          <button className={btn} type="submit" disabled={pending}>
            {pending ? "Sending…" : "Request a code"}
          </button>
        </form>
      )}
    </div>
  );
}
