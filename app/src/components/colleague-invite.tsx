"use client";

import { useState } from "react";
import { sendReferral } from "@/actions/referral";
import { useRouter } from "next/navigation";
import { useTx } from "@/components/locale-context";
import { btn, btnOutline, field } from "@/components/ui";

/** #43 "Refer a colleague": sends the referral email (code embedded in the apply link, never shown here), then a confirmation. */
export function ColleagueInvite({ left }: { left: number }) {
  const tx = useTx();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);

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
    setSent({ name: result.name, email: result.email });
    router.refresh();
  }

  return (
    <div className="rounded border border-line bg-paper p-4" data-testid="refer-colleague">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Refer a colleague")}</h2>
      {sent ? (
        <div className="mt-3 rounded border border-brass bg-brass-soft px-3 py-3" data-testid="referral-sent">
          <p className="font-serif text-lg">{tx("Referral sent")}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">
            {tx("We emailed {name} your referral with a link to apply. Their application is still personally reviewed.").replace("{name}", `${sent.name} (${sent.email})`)}
          </p>
          {left > 0 ? <button type="button" className={`${btnOutline} mt-3`} onClick={() => setSent(null)}>
            {tx("Refer someone else")}
          </button> : null}
        </div>
      ) : left <= 0 ? (
        <p className="mt-2 text-[15px] text-ink" data-testid="referrals-none-left">{tx("You have no referrals left.")}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-2 grid gap-2">
          <p className="text-[15px] text-ink">{tx("We email your colleague a link to apply with your referral already filled in. Every application is personally reviewed.")}</p>
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
