import Link from "next/link";
import { respondConnection } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { btn, btnOutline } from "@/components/ui";
import { blockedIds, withoutBlocked } from "@/lib/circle-requests";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

/** Nov 16 (Julia): circle requests other members sent you, with Accept and Decline. Blocked members are left out. */
export async function CircleRequests({ userId, back }: { userId: string; back: string }) {
  const tx = await serverTx();
  const locale = await currentLocale();
  const [rows, blocks] = await Promise.all([
    prisma.connection.findMany({
      where: { toId: userId, status: "PENDING" },
      include: { from: { select: { id: true, name: true, initials: true, photoId: true, role: true, org: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } }),
  ]);
  const blocked = blockedIds(userId, blocks);
  const incoming = withoutBlocked(rows.map((row) => ({ ...row, id: row.fromId, connectionId: row.id })), blocked).filter((row) => row.from.status === "ACTIVE");
  if (!incoming.length) return null;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/New_York" });
  return (
    <section id="circle-requests" className="mt-4 scroll-mt-20 rounded border border-brass bg-brass-soft p-4" data-testid="circle-requests">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Circle requests")} <span className="text-mut">({incoming.length})</span></h2>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {incoming.map((row) => (
          <li key={row.connectionId} className="flex min-w-0 gap-3 rounded border border-line bg-paper p-3" data-testid="circle-request-row">
            <Avatar initials={row.from.initials} photoId={row.from.photoId ?? undefined} size="md" />
            <div className="min-w-0 flex-1">
              <Link href={`/members/${row.from.id}`} className="font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{row.from.name}</Link>
              <p className="text-[13px] text-mut [overflow-wrap:anywhere]">{[tx(roleShort(roleLabel(row.from.role))), row.from.org, dateFmt.format(row.createdAt)].filter(Boolean).join(" · ")}</p>
              <p className="mt-1 text-[14px] text-ink">{tx("{name} asked to join your circle.").replace("{name}", row.from.name)}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <form action={respondConnection} className="min-w-0">
                  <input type="hidden" name="connectionId" value={row.connectionId} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton className={`${btnOutline} min-h-11 w-full whitespace-normal`} name="decision" value="DECLINED" data-testid="circle-request-decline">{tx("Decline")}</SubmitButton>
                </form>
                <form action={respondConnection} className="min-w-0">
                  <input type="hidden" name="connectionId" value={row.connectionId} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton className={`${btn} min-h-11 w-full whitespace-normal`} name="decision" value="ACCEPTED" data-testid="circle-request-accept">{tx("Accept")}</SubmitButton>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
