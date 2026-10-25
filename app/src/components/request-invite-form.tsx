"use client";

import { useState } from "react";
import { btn, field, labelCls } from "@/components/ui";
import { validateAddress, validatePersonName } from "@/lib/person-fields";
import { ROLES } from "@/lib/roles";

export function RequestInviteForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
    onSubmitted();
  }

  return (
    <form id="request-invite" onSubmit={onSubmit} className="mt-6 scroll-mt-6 grid gap-2 rounded border border-brass bg-cream p-4">
      <h2 className="font-serif text-2xl font-normal">Request an invite</h2>
      <p className="text-sm text-ink">No code yet. A Private Floor administrator reviews every application. You will hear from us by email.</p>
      <label className="absolute -left-[9999px]" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={labelCls}>First name</label>
          <input name="firstName" className={field} autoComplete="given-name" required />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input name="lastName" className={field} autoComplete="family-name" required />
        </div>
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" className={field} autoComplete="email" required />
      </div>
      <div>
        <label className={labelCls}>Role</label>
        <select name="role" className={field} defaultValue="DEVELOPER">
          {ROLES.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Company</label>
        <input name="company" className={field} autoComplete="organization" required />
      </div>
      <div>
        <label className={labelCls}>Street</label>
        <input name="street" className={field} autoComplete="address-line1" required />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className={labelCls}>City</label>
          <input name="city" className={field} autoComplete="address-level2" required />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input name="state" className={field} autoComplete="address-level1" maxLength={2} placeholder="NJ" required />
        </div>
        <div>
          <label className={labelCls}>ZIP</label>
          <input name="zip" className={field} autoComplete="postal-code" inputMode="numeric" placeholder="07663" required />
        </div>
      </div>
      <div>
        <label className={labelCls}>Short note (optional)</label>
        <textarea name="note" className={field} rows={2} />
      </div>
      <button className={btn} type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request an invite"}
      </button>
    </form>
  );
}
