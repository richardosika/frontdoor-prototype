"use client";

import { useState } from "react";
import { sendReferral } from "@/actions/referral";
import { CopyCode } from "@/components/copy-code";
import { useTx } from "@/components/locale-context";
import { btn, btnOutline, field } from "@/components/ui";

/** "Refer a colleague": sends the referral email with a one-use code, then shows a confirmation. */
export function ColleagueInvite({ codes = [] }: { codes?: { code: string; note: string }[] }) {
  const tx = useTx();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ name: string; email: string; code: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await sendReferral({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      note: String(form.get("note") ?? ""),
    }).catch(() => ({ ok: false as const, error: "Could not send that referral." }));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent({ name: result.name, email: result.email, code: result.code });
  }

  return (
    <div className="rounded border border-line bg-paper p-4" data-testid="refer-colleague">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Refer a colleague")}</h2>
      {codes.length && !sent ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-ink">{tx("Unused referral codes you can pass along.")}</p>
          {codes.slice(0, 3).map((item) => (
            <CopyCode key={item.code} code={item.code} caption={tx("Referral code")} />
          ))}
        </div>
      ) : null}
      {sent ? (
        <div className="mt-3 rounded border border-brass bg-brass-soft px-3 py-3" data-testid="referral-sent">
          <p className="font-serif text-lg">{tx("Referral sent")}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {tx("We emailed {name} your referral with code {code}. Their application is still personally reviewed.")
              .replace("{name}", `${sent.name} (${sent.email})`)
              .replace("{code}", sent.code)}
          </p>
          <button type="button" className={`${btnOutline} mt-3`} onClick={() => setSent(null)}>
            {tx("Refer someone else")}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-2 grid gap-2">
          <p className="text-xs text-ink">{tx("We email your colleague a referral code and a link to apply. Every application is personally reviewed.")}</p>
          {error ? <p className="text-xs text-brass">{tx(error)}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="firstName" className={field} placeholder={tx("First name")} aria-label={tx("First name")} autoComplete="off" required />
            <input name="lastName" className={field} placeholder={tx("Last name")} aria-label={tx("Last name")} autoComplete="off" required />
          </div>
          <input name="email" type="email" className={field} placeholder={tx("Email")} aria-label={tx("Email")} autoComplete="off" required />
          <textarea name="note" className={field} rows={2} maxLength={600} placeholder={tx("Short note (optional)")} aria-label={tx("Short note (optional)")} />
          <button className={btn} type="submit" disabled={pending}>
            {pending ? tx("Sending…") : tx("Send referral")}
          </button>
        </form>
      )}
    </div>
  );
}
