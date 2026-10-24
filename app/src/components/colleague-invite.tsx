"use client";

import { useState } from "react";
import { CopyCode } from "@/components/copy-code";
import { btn, field } from "@/components/ui";
import { ROLES } from "@/lib/roles";

export function ColleagueInvite({ codes = [] }: { codes?: { code: string; note: string }[] }) {
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
    setStatusUrl(payload?.statusUrl || "");
  }

  return (
    <div className="rounded border border-line bg-paper p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Invite a colleague</h2>
      {codes.length ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-ink">Unused codes you can pass along. Private Floor does not email them.</p>
          {codes.map((item) => (
            <CopyCode key={item.code} code={item.code} caption={item.note || "Invite code"} />
          ))}
        </div>
      ) : null}
      {statusUrl ? (
        <div className="mt-2 text-xs leading-relaxed text-ink">
          <p>Request sent. Share this private status link. It shows pending, issued, or declined, and it does not include an invite code.</p>
          <a className="mt-2 block break-all text-forest underline" href={statusUrl}>
            {statusUrl}
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-2 grid gap-2">
          <p className="text-xs text-ink">
            Request a code. You get a private status link that never includes the code. A Private Floor administrator issues it on Admin, copies it there, and passes it along.
          </p>
          <label className="absolute -left-[9999px]" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {error ? <p className="text-xs text-brass">{error}</p> : null}
          <input name="name" className={field} placeholder="Colleague name" required />
          <input name="email" type="email" className={field} placeholder="Email" required />
          <select name="role" className={field} defaultValue="DEVELOPER" aria-label="Role">
            {ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
          <input name="company" className={field} placeholder="Company" required />
          <input name="city" className={field} placeholder="City" required />
          <textarea name="note" className={field} rows={2} placeholder="Short note (optional)" aria-label="Note" />
          <button className={btn} type="submit" disabled={pending}>
            {pending ? "Sending…" : "Request a code"}
          </button>
        </form>
      )}
    </div>
  );
}
