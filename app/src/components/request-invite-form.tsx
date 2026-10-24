"use client";

import { useState } from "react";
import { btn, field, labelCls } from "@/components/ui";
import { ROLES } from "@/lib/roles";

export function RequestInviteForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [statusUrl, setStatusUrl] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/request-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
        company: form.get("company"),
        city: form.get("city"),
        note: form.get("note"),
        website: form.get("website"),
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; statusUrl?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(payload?.error || "Could not send that request.");
      return;
    }
    setStatusUrl(payload?.statusUrl || "received");
  }

  if (statusUrl) {
    return (
      <div className="mt-4 text-sm text-ink">
        <p>Request received. Keep this private status link. It shows pending, issued, or declined, and it does not include an invite code. Private Floor does not email codes.</p>
        {statusUrl.startsWith("http") ? (
          <a className="mt-2 block break-all text-forest underline" href={statusUrl}>
            {statusUrl}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-2 border-t border-line pt-6">
      <h2 className="font-serif text-xl font-normal">Request an invite</h2>
      <p className="text-sm text-ink">No code yet. The committee can issue one and pass it along. This form does not email you.</p>
      <label className="absolute -left-[9999px]" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      <div>
        <label className={labelCls}>Name</label>
        <input name="name" className={field} required />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" className={field} required />
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
        <input name="company" className={field} required />
      </div>
      <div>
        <label className={labelCls}>City</label>
        <input name="city" className={field} placeholder="Newark, NJ" required />
      </div>
      <div>
        <label className={labelCls}>Short note (optional)</label>
        <textarea name="note" className={field} rows={2} />
      </div>
      <button className={btn} type="submit" disabled={pending}>
        Request invite
      </button>
    </form>
  );
}
