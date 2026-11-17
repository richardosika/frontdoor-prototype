"use client";

import { useActionState } from "react";
import Link from "next/link";
import { runInsuranceReminderAction } from "@/actions/insurance";
import { useTx } from "@/components/locale-context";
import { btn, btnOutline } from "@/components/ui";
import { insurancePolicyLabel } from "@/lib/insurance-compliance";

const resultLabels = {
  due: "Due to send",
  sent: "Sent to Outbox",
  claimed: "Already recorded",
  failed: "Delivery failed",
  suppressed: "Email suppressed",
  suspended: "Account suspended",
  lifted: "Suspension lifted",
};

function kindLabel(item: { kind: string; week?: number; suspendKey?: string }, tx: (text: string) => string) {
  if (item.kind === "expired") {
    return [tx("Expired: reminder {week} of 4").replace("{week}", String(item.week ?? 1)), tx("Suspension on {date}").replace("{date}", item.suspendKey ?? "")].join(" · ");
  }
  if (item.kind === "suspend") return tx("Account suspension");
  if (item.kind === "lift") return tx("Suspension lifted");
  return tx("30-day reminder");
}

export function InsuranceReminderControls() {
  const tx = useTx();
  const [state, run, pending] = useActionState(
    (_previous: Awaited<ReturnType<typeof runInsuranceReminderAction>> | null, form: FormData) =>
      runInsuranceReminderAction(form.get("mode") !== "send"),
    null,
  );
  return (
    <section className="space-y-3 [overflow-wrap:anywhere]">
      <form action={run} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button className={`${btnOutline} min-h-11 whitespace-normal`} name="mode" value="preview" disabled={pending}>{tx("Preview reminders due (dry run)")}</button>
        <button className={`${btn} min-h-11 whitespace-normal`} name="mode" value="send" disabled={pending}>{tx("Send reminders due now")}</button>
      </form>
      <div aria-live="polite" aria-busy={pending}>
        {state?.ok ? (
          <>
            <h2 className="font-serif text-xl">{tx(state.dryRun ? "Reminder preview" : "Reminder results")}</h2>
            {state.reminders.length ? (
              <ul className="divide-y divide-line">
                {state.reminders.map((item) => (
                  <li key={JSON.stringify([item.userId, item.type, item.expiresKey, item.kind, item.week])} className="py-2" data-testid={`insurance-run-${item.kind}`}>
                    <Link href={`/admin/members/${item.userId}`} className="inline-flex min-h-11 items-center underline decoration-brass">{item.name}</Link>
                    {item.type ? <>{" · "}{insurancePolicyLabel(item.type, item.otherName, tx)}{" · "}{item.expiresKey}</> : null}{" · "}{kindLabel(item, tx)}{" · "}{tx(resultLabels[item.result])}
                  </li>
                ))}
              </ul>
            ) : <p>{tx("No reminders are due.")}</p>}
          </>
        ) : state ? <p role="alert">{tx("Insurance reminders could not be checked.")}</p> : null}
      </div>
    </section>
  );
}
