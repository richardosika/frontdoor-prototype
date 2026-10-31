import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serverTx } from "@/lib/i18n/server";

/** #51: a thin Bids bar on the Ledger (no new sidebar item). Hidden until the member has any bid activity. */
export async function BidsStrip({ userId }: { userId: string }) {
  const tx = await serverTx();
  const [received, sent, requested] = await Promise.all([
    prisma.bidRecipient.count({ where: { memberId: userId, request: { status: "OPEN", bids: { none: { bidderId: userId, status: { not: "DRAFT" } } } } } }),
    prisma.bid.count({ where: { bidderId: userId, status: { not: "DRAFT" } } }),
    prisma.bidRequest.count({ where: { requesterId: userId } }),
  ]);
  if (!received && !sent && !requested) return null;
  return (
    <Link href="/bids" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded border border-brass bg-paper px-4 py-3 text-[15px] text-forest" data-testid="bids-strip">
      <span>
        <b className="mr-2 text-[12px] uppercase tracking-[0.16em] text-brass">{tx("Bids")}</b>
        {received} {tx("requests for you")} · {sent} {tx("sent")} · {requested} {tx("requested")}
      </span>
      <span className="font-semibold underline decoration-brass">{tx("Open Bids")} ›</span>
    </Link>
  );
}
