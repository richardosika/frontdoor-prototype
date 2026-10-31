import { ColleagueInvite } from "@/components/colleague-invite";
import { PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { referralStatus, referralsLeft } from "@/lib/referrals";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  Sent: "border-line text-mut",
  Applied: "border-brass text-forest",
  Approved: "border-forest bg-forest text-paper",
};

/** #43 Refer a colleague: send a referral by email and follow each one. The code itself is never shown. */
export default async function ReferPage() {
  const tx = await serverTx();
  const user = await requireUser();
  const sent = await prisma.inviteCode.findMany({
    where: { createdById: user.id, sentAt: { not: null } },
    select: { id: true, referredName: true, referredEmail: true, sentAt: true, applications: { select: { status: true } } },
    orderBy: { sentAt: "desc" },
  });
  const left = referralsLeft(sent.length);
  const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "America/New_York" });
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-3 md:pb-6 md:pt-6 lg:px-8">
      <PageHeader title={tx("Refer a colleague")} />
      <p className="mt-2 text-[16px] leading-relaxed text-ink">
        {tx("Recommend someone you have worked with. We email them a link to apply; every application is personally reviewed.")}
      </p>
      <p className="mt-2 font-sans text-[15px] font-semibold text-forest" data-testid="referrals-left">
        {tx("Referrals left")}: {left}
      </p>
      <div className="mt-4">
        <ColleagueInvite left={left} />
      </div>
      <section className={`${card} mt-5 p-4`} data-testid="referral-list">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Your referrals")}</h2>
        {sent.length === 0 ? <p className="mt-2 text-[15px] text-mut">{tx("No referrals yet.")}</p> : null}
        <ul>
          {sent.map((row) => {
            const status = referralStatus(row.applications);
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3 last:border-0" data-testid="referral-row">
                <div className="min-w-0">
                  <p className="font-semibold text-forest [overflow-wrap:anywhere]">{row.referredName}</p>
                  <p className="text-[14px] text-mut [overflow-wrap:anywhere]">
                    {row.referredEmail} · {row.sentAt ? dateFmt.format(row.sentAt) : ""}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[13px] font-semibold ${TONE[status]}`} data-testid={`referral-status-${status}`}>
                  {tx(status)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
