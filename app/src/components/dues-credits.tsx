import { currentMonthlyCents, formatMoney } from "@/lib/dues";
import { numberLocale } from "@/lib/money";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { nextChargeAfterCredits } from "@/lib/vendor-suggestions";

/** Dues credits from vendor referrals on the billing page. Each credit covers one month and applies to the next charge. */
export async function DuesCredits({ user }: { user: { id: string; role: string; duesCents: number; renewalAt: Date | null } }) {
  const tx = await serverTx();
  const locale = await currentLocale();
  const credits = await prisma.duesCredit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }).catch(() => []);
  if (!credits.length) return null;
  const monthly = currentMonthlyCents(user.role, user.duesCents);
  const next = nextChargeAfterCredits(monthly, credits);
  const available = credits.filter((c) => c.status === "AVAILABLE").length;
  return (
    <div className="mt-3 rounded border border-brass bg-[#F6EEDB] p-3 text-[14px] text-forest" data-testid="dues-credits">
      <p className="font-semibold">{tx("Referral credits")}</p>
      {monthly > 0 && available > 0 ? (
        <p className="mt-1" data-testid="next-charge-after-credit">
          {tx("Next dues charge")} {user.renewalAt ? new Intl.DateTimeFormat(numberLocale(locale), { dateStyle: "long", timeZone: "America/New_York" }).format(user.renewalAt) : ""}: {formatMoney(next.cents, locale)} ({tx("credit")} −{formatMoney(next.creditCents, locale)}).
          {available > 1 ? ` ${available} ${tx("free months available.")}` : ""}
        </p>
      ) : null}
      <ul className="mt-1">
        {credits.map((c) => (
          <li key={c.id} className="flex flex-wrap justify-between gap-2 border-t border-[#E9D9B0] py-1.5 first:border-0" data-testid={`dues-credit-${c.status}`}>
            <span>{c.status === "RECOGNITION" ? tx("Referral recognition") : tx("One free month of dues")}</span>
            <span className="text-mut">
              {c.status === "RECOGNITION" ? tx("Recognition only") : `${formatMoney(c.cents, locale)} · ${c.status === "APPLIED" ? tx("Applied") : tx("Applies to your next dues charge")}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
