import Link from "next/link";
import { INSURANCE_DATES, INSURANCE_PATH, INSURANCE_REQUIRED, POLICY_EXPIRED, requiresInsuranceFor, unresolvedExpired } from "@/lib/insurance-compliance";
import { memberInsuranceComplete } from "@/lib/insurance-member";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

/** Nov 17: a prompt for covered members (primary role or extra category) whose insurance is missing, undated or expired. Never a lockout by itself. */
export async function InsurancePrompt({ user }: {
  user: { id: string; role: string; extraCategories?: string | null; insuranceAgentEmail: string; insuranceAgentPhone: string; insuranceSuspensionLiftedAt?: Date | null };
}) {
  if (!requiresInsuranceFor(user)) return null;
  const insurance = await prisma.user.findUnique({
    where: { id: user.id },
    select: { insuranceCertificate: { select: { id: true } }, insurancePolicies: { select: { type: true, expiresOn: true } } },
  });
  if (!insurance) return null;
  const complete = memberInsuranceComplete({ ...user, ...insurance });
  const expired = unresolvedExpired(insurance.insurancePolicies, new Date(), user.insuranceSuspensionLiftedAt).length > 0;
  const message = !complete ? INSURANCE_REQUIRED : !insurance.insurancePolicies.length ? INSURANCE_DATES : expired ? POLICY_EXPIRED : null;
  if (!message) return null;
  const tx = await serverTx();
  return (
    <aside data-testid="insurance-prompt" className={`my-3 rounded border px-4 text-sm [overflow-wrap:anywhere] ${message === INSURANCE_DATES ? "border-line bg-paper" : "border-brass bg-cream"}`}>
      <Link href={INSURANCE_PATH} className="flex min-h-11 items-center py-2 font-semibold text-forest underline decoration-brass">
        {tx(message)}
      </Link>
    </aside>
  );
}
