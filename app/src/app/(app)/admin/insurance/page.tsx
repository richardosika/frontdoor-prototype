import Link from "next/link";
import { InsuranceReminderControls } from "@/components/insurance-reminder-controls";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { INSURANCE_ROLES, insuranceDaysUntil, INSURANCE_TIME_ZONE } from "@/lib/insurance-compliance";
import { insuranceMemberSelect, memberInsuranceComplete } from "@/lib/insurance-member";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export default async function AdminInsurancePage() {
  await requireAdmin();
  const [locale, tx, members] = await Promise.all([
    currentLocale(),
    serverTx(),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: [...INSURANCE_ROLES] } },
      select: { ...insuranceMemberSelect, _count: { select: { insuranceReminders: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  ]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: INSURANCE_TIME_ZONE });
  const now = new Date();
  return (
    <div>
      <MobileTitle href="/admin/members" label={tx("Members")} title={tx("Insurance")} />
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-4 md:px-8 md:py-6">
        <PageHeader title={tx("Insurance")} />
        <InsuranceReminderControls />
        <ul className="grid min-w-0 gap-2 [overflow-wrap:anywhere]">
          {members.map((member) => {
            const next = member.insurancePolicies.find(({ expiresOn }) => insuranceDaysUntil(expiresOn, now) >= 0);
            return (
              <li className={`${card} grid min-w-0 gap-2 p-4 sm:grid-cols-4 sm:items-center`} key={member.id}>
                <Link className="flex min-h-11 items-center font-semibold underline decoration-brass" href={`/admin/members/${member.id}`}>{member.name}</Link>
                <span>{tx(memberInsuranceComplete(member) ? "Complete" : "Missing")}</span>
                <span>{tx("Next expiration")}{next ? ` · ${date.format(next.expiresOn)}` : " · —"}</span>
                <span>{tx("Reminders recorded")} · {new Intl.NumberFormat(locale).format(member._count.insuranceReminders)}</span>
              </li>
            );
          })}
        </ul>
        {!members.length ? <p>{tx("No active members require insurance.")}</p> : null}
      </div>
    </div>
  );
}
