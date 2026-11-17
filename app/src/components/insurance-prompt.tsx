import Link from "next/link";
import { INSURANCE_DATES, INSURANCE_PATH, INSURANCE_REQUIRED, requiresInsurance } from "@/lib/insurance-compliance";
import { memberInsuranceComplete } from "@/lib/insurance-member";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function InsurancePrompt({ user }: { user: { id: string; role: string; insuranceAgentEmail: string; insuranceAgentPhone: string } }) {
  if (!requiresInsurance(user.role)) return null;
  const insurance = await prisma.user.findUnique({
    where: { id: user.id },
    select: { insuranceCertificate: { select: { id: true } }, _count: { select: { insurancePolicies: true } } },
  });
  if (!insurance) return null;
  const complete = memberInsuranceComplete({ ...user, ...insurance });
  if (complete && insurance._count.insurancePolicies) return null;
  const tx = await serverTx();
  return (
    <aside data-testid="insurance-prompt" className={`my-3 rounded border px-4 text-sm [overflow-wrap:anywhere] ${complete ? "border-line bg-paper" : "border-brass bg-cream"}`}>
      <Link href={INSURANCE_PATH} className="flex min-h-11 items-center py-2 font-semibold text-forest underline decoration-brass">
        {tx(complete ? INSURANCE_DATES : INSURANCE_REQUIRED)}
      </Link>
    </aside>
  );
}
