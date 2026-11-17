import Link from "next/link";
import { INSURANCE_PATH, SUSPENDED_NOTICE } from "@/lib/insurance-compliance";
import { serverTx } from "@/lib/i18n/server";

/** Nov 17 (Richard, decision 4): shown on every page while a member is suspended for an expired policy. */
export async function InsuranceSuspendedNotice({ held }: { held: boolean }) {
  const tx = await serverTx();
  return (
    <section role="alert" data-testid="insurance-suspended" className="mx-4 my-3 grid gap-2 rounded border border-brass bg-brass-soft p-4 text-forest [overflow-wrap:anywhere] md:mx-auto md:max-w-3xl">
      <h2 className="font-serif text-xl">{tx("Account suspended")}</h2>
      <p className="text-sm">{tx(SUSPENDED_NOTICE)}</p>
      {held ? <p className="text-sm">{tx("This page is unavailable until your insurance is updated.")}</p> : null}
      <Link href={INSURANCE_PATH} className="inline-flex min-h-11 items-center justify-self-start font-semibold underline decoration-brass">{tx("Update insurance on your Profile")}</Link>
    </section>
  );
}
