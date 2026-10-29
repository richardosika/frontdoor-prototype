import Link from "next/link";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { currentMonthlyCents, duesLabel, firstMonthCents, formatMoney } from "@/lib/dues";
import { formatLongEtDate } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

function needsMoney(status: string) {
  return status === "DUE" || status === "FAILED";
}

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const rows = await prisma.user.findMany({
    where: { isAdmin: false, paymentStatus: { not: "NOT_REQUIRED" } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      org: true,
      role: true,
      paymentStatus: true,
      duesCents: true,
      renewalAt: true,
    },
  });
  rows.sort((a, b) => Number(needsMoney(b.paymentStatus)) - Number(needsMoney(a.paymentStatus)) || a.name.localeCompare(b.name));

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Payments" />
      <div className="mx-auto max-w-4xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Payments" />
        <p className="mt-1 text-sm text-ink">
          Month to month. The first month is 50% off, then the full monthly price. Due only after approval. Due and failed payments are marked. No card number is stored. Mark paid, waive, or note a refund from the member.
        </p>
        {rows.length === 0 ? <p className="mt-6 text-sm text-mut">No payment records yet.</p> : null}
        <ul className="mt-4 space-y-3">
          {rows.map((member) => {
            const monthly = currentMonthlyCents(member.role, member.duesCents);
            return (
            <li key={member.id} className={`${card} p-4 text-sm ${needsMoney(member.paymentStatus) ? "border-brass" : ""}`}>
              <Link href={`/admin/members/${member.id}`} className="font-serif text-xl font-normal underline decoration-brass/40">
                {member.name}
              </Link>
              <p className="mt-1 text-ink">
                {roleShort(roleLabel(member.role))} · {member.org}
              </p>
              <p className="mt-1 text-ink">
                {paymentStatusLabel(member.paymentStatus)} · First month {formatMoney(firstMonthCents(monthly))} · {duesLabel(monthly)}
                {member.renewalAt ? ` · renews ${formatLongEtDate(member.renewalAt)}` : ""}
              </p>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
