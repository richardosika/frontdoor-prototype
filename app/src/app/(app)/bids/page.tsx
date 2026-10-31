import Link from "next/link";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { SampleTag, StatusPill, h2 } from "@/components/bids-ui";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { loadBidsHome } from "@/lib/bids-db";
import { currentLocale, serverTx } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** #51 Bids: requests received, bids sent, bids requested. Reached from the Ledger, the project page and alerts. */
export default async function BidsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser();
  const tx = await serverTx();
  const locale = await currentLocale();
  const q = await searchParams;
  const { toDo, sent, requested } = await loadBidsHome(user.id);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/New_York" });
  const row = "flex flex-wrap items-start justify-between gap-2 border-b border-line py-3 last:border-0";
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="bids-home">
      <PageHeader title={tx("Bids")} />
      <p className="mt-2 text-[16px] leading-relaxed text-ink">{tx("Proposals on projects you're part of. Only members already on a project can see its requests, and every proposal is private between the bidder and the requester.")}</p>
      {q.error || q.notice ? <div className="mt-3"><Banner error={q.error ? tx(q.error) : undefined} notice={q.notice ? tx(q.notice) : undefined} /></div> : null}

      <section className={`${card} mt-5 p-4 sm:p-5`} data-testid="bids-received">
        <h2 className={h2}>{tx("Requests received")} · {toDo.length}</h2>
        {toDo.length === 0 ? <p className="text-[15px] text-mut">{tx("No open requests for you right now.")}</p> : null}
        <ul>
          {toDo.map((r) => (
            <li key={r.id} className={row}>
              <Link href={`/bids/${r.request.id}`} className="min-w-0">
                <span className="block font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{r.request.project.name}</span>
                <span className="block text-[14px] text-mut">{r.request.requester.name} · {r.request.requester.org} · {tx(r.request.template.name)} · {tx("Due")} {date.format(r.request.dueAt)}</span>
              </Link>
              <span className="flex items-center gap-2">{r.request.isSample ? <SampleTag tx={tx} /> : null}<StatusPill status={r.request.status !== "OPEN" ? "CLOSED" : r.request.bids[0] ? "DRAFT" : "NEW"} tx={tx} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="bids-sent">
        <h2 className={h2}>{tx("Bids sent")} · {sent.length}</h2>
        {sent.length === 0 ? <p className="text-[15px] text-mut">{tx("You haven't sent a proposal yet.")}</p> : null}
        <ul>
          {sent.map((r) => (
            <li key={r.id} className={row}>
              <Link href={`/bids/${r.request.id}`} className="min-w-0">
                <span className="block font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{r.request.project.name}</span>
                <span className="block text-[14px] text-mut">{r.request.requester.name} · {tx(r.request.template.name)} · {tx("Sent")} {r.request.bids[0].submittedAt ? date.format(r.request.bids[0].submittedAt) : ""}</span>
              </Link>
              <span className="flex items-center gap-2">{r.request.isSample ? <SampleTag tx={tx} /> : null}<StatusPill status={r.request.bids[0].status} tx={tx} /></span>
            </li>
          ))}
        </ul>
      </section>

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
