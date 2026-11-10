import Link from "next/link";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { SampleTag, StatusPill, h2 } from "@/components/bids-ui";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { loadBidsHome } from "@/lib/bids-db";
import { isGeneralContractor, isSubcontractor, tradeLabel } from "@/lib/trades";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { roleById } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** #51 Bids: Bid Opportunities (subs), requests received & bids sent (one list since Nov 10), bids requested. Reached from the Ledger, the project page and alerts. */
export default async function BidsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser();
  const tx = await serverTx();
  const locale = await currentLocale();
  const q = await searchParams;
  const { toDo, sent, requested, open, trade } = await loadBidsHome(user.id);
  const gc = isGeneralContractor(user);
  const sub = isSubcontractor(user);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/New_York" });
  // Requests not yet answered first, then bids sent, newest first within each.
  const mine = [...toDo, ...sent];
  const who = (p: { name: string; org: string; role?: string | null }) => [p.name, p.org, roleById(p.role) ? tx(roleById(p.role)!.label) : ""].filter(Boolean).join(" · ");
  const row = "flex flex-wrap items-start justify-between gap-2 border-b border-line py-3 last:border-0";
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="bids-home">
      <PageHeader title={tx("Bids")} />
      <p className="mt-2 text-[16px] leading-relaxed text-ink">{tx("Proposals on projects you're part of. Only members already on a project can see its requests, and every proposal is private between the bidder and the requester.")} {tx("General contractor requests are open to every verified general contractor.")}</p>
      {q.error || q.notice ? <div className="mt-3"><Banner error={q.error ? tx(q.error) : undefined} notice={q.notice ? tx(q.notice) : undefined} /></div> : null}

      {sub ? (
        <section className={`${card} mt-5 p-4 sm:p-5`} data-testid="bids-trade-packages">
          {/* Nov 10 (Julia): "Trade bid packages for you" becomes Bid Opportunities. */}
          <h2 className={h2}>{tx("Bid Opportunities")} · {trade.length}</h2>
          <p className="mb-2 text-[14px] text-mut">{tx("Bid packages that match your trades and service areas.")}</p>
          {trade.length === 0 ? <p className="text-[15px] text-mut">{tx("There are no matching opportunities available right now.")}</p> : null}
          <ul>
            {trade.map((r) => (
              <li key={r.id} className={row}>
                <Link href={`/bids/${r.id}`} className="min-w-0">
                  <span className="block font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{tx(tradeLabel(r.trade))} · {r.project.name}</span>
                  <span className="block text-[14px] text-mut">{who(r.requester)} · {r.project.location} · {tx("Due")} {date.format(r.dueAt)}</span>
                </Link>
                <StatusPill status="NEW" tx={tx} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open.length ? (
        <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="bids-open">
          <h2 className={h2}>{tx("Open to verified general contractors")} · {open.length}</h2>
          <ul>
            {open.map((r) => (
              <li key={r.id} className={row}>
                <Link href={`/bids/${r.id}`} className="min-w-0">
                  <span className="block font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{r.project.name}</span>
                  <span className="block text-[14px] text-mut">{who(r.requester)} · {r.project.location} · {r._count.plans} {tx("plan files")} · {tx("Due")} {date.format(r.dueAt)}</span>
                </Link>
                <StatusPill status="NEW" tx={tx} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Nov 10 (Julia): Requests received and Bids sent are one list; each row shows where it stands. */}
      <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="bids-received">
        <h2 className={h2}>{tx("Requests received & bids sent")} · {mine.length}</h2>
        {mine.length === 0 ? <p className="text-[15px] text-mut">{tx("No requests or bids yet.")}</p> : null}
        <ul data-testid="bids-sent">
          {mine.map((r) => {
            const bid = r.request.bids[0];
            const sentAt = bid && bid.status !== "DRAFT" ? bid.submittedAt : null;
            return (
              <li key={r.id} className={row}>
                <Link href={`/bids/${r.request.id}`} className="min-w-0">
                  <span className="block font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{r.request.project.name}</span>
                  <span className="block text-[14px] text-mut">
                    {who(r.request.requester)} · {r.request.trade ? tx(tradeLabel(r.request.trade)) : tx(r.request.template.name)} · {sentAt ? `${tx("Sent")} ${date.format(sentAt)}` : `${tx("Due")} ${date.format(r.request.dueAt)}`}
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  {r.request.isSample ? <SampleTag tx={tx} /> : null}
                  <StatusPill status={bid && bid.status !== "DRAFT" ? bid.status : r.request.status !== "OPEN" ? "CLOSED" : bid ? "DRAFT" : "NEW"} tx={tx} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      {gc ? (
        <p className="mt-4 rounded border border-line bg-cream px-4 py-3 text-[15px] text-ink" data-testid="bids-gc-trade-hint">
          {tx("Need subcontractors? Open a project you're on and choose Post a trade bid package. Only subs in that trade and area are matched.")}{" "}
          <Link href="/suggest?category=SUBCONTRACTOR" className="font-semibold text-forest underline decoration-brass">{tx("Suggest a subcontractor")}</Link>
        </p>
      ) : null}

      <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="bids-requested">
        <h2 className={h2}>{tx("Bids requested")} · {requested.length}</h2>
        {requested.length === 0 ? <p className="text-[15px] text-mut">{tx("To ask for proposals, open a project you're on and choose Request bids.")}</p> : null}
        <ul>
          {requested.map((r) => (
            <li key={r.id} className={row}>
              <Link href={`/bids/${r.id}`} className="min-w-0">
                <span className="block font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{r.project.name}</span>
                <span className="block text-[14px] text-mut">{tx(r.template.name)} · {r.bids.length} {tx("of")} {r._count.recipients} {tx("received")} · {tx("Due")} {date.format(r.dueAt)}</span>
              </Link>
              <span className="flex items-center gap-2">{r.isSample ? <SampleTag tx={tx} /> : null}<StatusPill status={r.status} tx={tx} /></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
