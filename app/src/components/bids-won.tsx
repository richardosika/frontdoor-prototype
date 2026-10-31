import { prisma } from "@/lib/prisma";
import { serverTx } from "@/lib/i18n/server";

/** #51: awarded bids count as deals won on the profile. Shown only when there is at least one. */
export async function BidsWon({ memberId }: { memberId: string }) {
  const tx = await serverTx();
  const won = await prisma.bid.count({ where: { bidderId: memberId, status: "AWARDED" } });
  if (!won) return null;
  return (
    <p className="mx-4 mt-3 rounded border border-brass bg-paper px-4 py-3 text-[15px] text-forest md:mx-0" data-testid="profile-deals-won">
      ★ <b>{won}</b> {tx(won === 1 ? "deal won through Private Floor bids" : "deals won through Private Floor bids")}
    </p>
  );
}
