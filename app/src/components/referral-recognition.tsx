import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

/**
 * Suggest a vendor recognition. On a vendor's profile: "Referred by" the suggesting member (their name only when they
 * allowed it). On a member's profile: how many vendors they referred became verified members.
 */
export async function ReferralRecognition({ memberId }: { memberId: string }) {
  const tx = await serverTx();
  const [referredBy, count] = await Promise.all([
    prisma.vendorSuggestion.findFirst({
      where: { vendorUserId: memberId, status: "VERIFIED" },
      include: { suggestedBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.vendorSuggestion.count({ where: { suggestedById: memberId, status: "VERIFIED" } }),
  ]).catch(() => [null, 0] as const);
  if (!referredBy && !count) return null;
  return (
    <div className="mx-4 mt-3 flex flex-wrap gap-2 md:mx-0" data-testid="referral-recognition">
      {referredBy ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brass bg-[#F6EEDB] px-3 py-1 text-[13px] font-semibold text-forest" data-testid="referred-by-badge">
          ✦ {referredBy.nameOk ? `${tx("Referred by")} ${referredBy.suggestedBy.name}` : tx("Referred by a member")}
        </span>
      ) : null}
      {count ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-[13px] font-semibold text-forest" data-testid="referral-count">
          {tx("Vendors referred")}: {count.toLocaleString("en-US")}
        </span>
      ) : null}
    </div>
  );
}
