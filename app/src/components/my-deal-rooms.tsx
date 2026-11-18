import Link from "next/link";
import { serverTx } from "@/lib/i18n/server";
import type { DealRoomRow } from "@/lib/my-deal-rooms";

export async function MyDealRooms({ rows }: { rows: readonly DealRoomRow[] }) {
  if (!rows.length) return null;
  const tx = await serverTx();
  return (
    <section id="my-deal-rooms" data-testid="my-deal-rooms" className="mb-6 rounded border border-line bg-paper p-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("My Deal Rooms")}</h2>
      <ul className="mt-3">
        {rows.map((row) => (
          <li key={row.id} data-testid="deal-room-row" className="flex min-w-0 flex-col gap-3 border-t border-line py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <p className="text-[16px] font-semibold text-forest">{row.name}</p>
              {row.owner ? <p className="mt-1 text-[14px] text-mut">{tx("Owner: {name}").replace("{name}", row.owner.name)}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                <span className="rounded-full bg-brass-soft px-2 py-1 text-forest">{tx(row.state === "OWNER" ? "You own this room" : row.state === "APPROVED" ? "Access approved" : "Access requested")}</span>
                {row.state === "OWNER" && row.pendingRequests > 0 ? (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-red-800">{tx(row.pendingRequests === 1 ? "1 access request waiting" : "{n} access requests waiting").replace("{n}", String(row.pendingRequests))}</span>
                ) : null}
              </div>
            </div>
            <Link href={row.href} className="inline-flex min-h-11 shrink-0 items-center text-[14px] font-semibold text-forest underline decoration-brass">{tx(row.state === "PENDING" ? "View request" : "Open Deal Room")}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
