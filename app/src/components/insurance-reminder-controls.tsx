"use client";

import { useActionState } from "react";
import Link from "next/link";
import { runInsuranceReminderAction } from "@/actions/insurance";
import { useTx } from "@/components/locale-context";
import { btn, btnOutline } from "@/components/ui";
import { insurancePolicyLabel } from "@/lib/insurance-compliance";

const resultLabels = {
  due: "Due",
  sent: "Sent to Outbox",
  claimed: "Already recorded",
  failed: "Delivery failed",
  suppressed: "Email suppressed",
};

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
                  <li key={JSON.stringify([item.userId, item.type, item.expiresKey])} className="py-2">
                    <Link href={`/admin/members/${item.userId}`} className="inline-flex min-h-11 items-center underline decoration-brass">{item.name}</Link>
                    {" · "}{insurancePolicyLabel(item.type, item.otherName, tx)}{" · "}{item.expiresKey}{" · "}{tx(resultLabels[item.result])}
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
