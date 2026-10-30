import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const tx = await serverTx();
  const user = await requireUser();
  const alerts = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  if (alerts.some((alert) => !alert.readAt)) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title={tx("Alerts")} />
      <p className="mt-1 text-sm text-ink">{tx("Introductions, messages, deal rooms, and account notices. Accept or decline an introduction from Network.")}</p>
      {alerts.length === 0 ? <p className="mt-6 text-sm text-mut">{tx("You are caught up.")}</p> : null}
      <ul className="mt-4 space-y-2">
        {alerts.map((alert) => {
          const body = (
            <>
              <b className="block text-sm">{tx(alert.title)}</b>
              <span className="mt-1 block text-sm text-ink">{tx(alert.body)}</span>
              <span className="mt-1 block text-xs text-mut">{timeAgo(alert.createdAt)}</span>
            </>
          );
          return (
            <li key={alert.id} className={`${card} p-3`}>
              {alert.href ? (
                <Link href={alert.href} className="block min-h-11">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
