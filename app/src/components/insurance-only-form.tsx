import { InsuranceFields } from "@/components/insurance-fields";
import { SubmitButton } from "@/components/submit-button";
import { btn } from "@/components/ui";
import { saveProfile } from "@/actions/profile";
import { insuranceDateKey } from "@/lib/insurance-compliance";
import { loadMemberInsurance } from "@/lib/insurance-member";
import { serverTx } from "@/lib/i18n/server";

/** Nov 17 follow-up (Richard): the whole Profile while insurance-suspended. Only the insurance block is shown and saved. */
export async function InsuranceOnlyForm({ userId }: { userId: string }) {
  const tx = await serverTx();
  const compliance = await loadMemberInsurance(userId);
  return (
    <form action={saveProfile} data-testid="insurance-only-form" className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded border border-line bg-cream p-4 sm:p-6">
      <InsuranceFields
        certificate={compliance?.insuranceCertificate ?? null}
        agent={compliance ?? undefined}
        policies={(compliance?.insurancePolicies ?? []).map(({ type, otherName, expiresOn, limitAmount, aggregateAmount }) => ({ type, otherName, expiresKey: insuranceDateKey(expiresOn), limit: limitAmount || "", aggregate: aggregateAmount || "" }))}
      />
      <SubmitButton className={`${btn} justify-self-start`}>{tx("Save insurance")}</SubmitButton>
    </form>
  );
}
