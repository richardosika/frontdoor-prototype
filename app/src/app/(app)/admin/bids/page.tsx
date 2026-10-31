import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** #51 Admin: every bid request and its bids, read-only. Staff open the comparison and PDFs but take no action for members. */
export default async function AdminBids() {
  await requireAdmin();
  const rows = await prisma.bidRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      project: { select: { id: true, name: true } },
      requester: { select: { name: true, org: true } },
      template: { select: { name: true, version: true } },
      _count: { select: { recipients: true } },
      bids: { orderBy: { submittedAt: "desc" }, select: { id: true, status: true, pdfName: true, submittedAt: true, bidder: { select: { name: true, org: true } } } },
    },
  });
  const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" });
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-3 md:pt-6 lg:px-8" data-testid="admin-bids">
      <PageHeader title="Bids (read-only)" />
      <p className="mt-2 text-[15px] text-ink">Every bid request and the proposals on it. Open a request for the side-by-side comparison and PDFs. Staff can read only; shortlist, decline and award stay with the requester. Members never see each other&apos;s bids.</p>
      <p className="mt-1 text-[14px] text-mut">{rows.length} requests · {rows.reduce((n, r) => n + r.bids.filter((b) => b.status !== "DRAFT").length, 0)} submitted bids</p>
      <ul className="mt-4">
        {rows.map((r) => (
          <li key={r.id} className="mb-3 rounded border border-line bg-paper p-4" data-testid="admin-bid-request">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/bids/${r.id}`} className="font-semibold text-forest underline decoration-brass">{r.project.name} · {r.template.name} v{r.template.version}</Link>
              <span className="text-[13px] text-mut">{r.isSample ? "SAMPLE · " : ""}{r.status} · due {fmt.format(r.dueAt)}</span>
            </div>
            <p className="text-[14px] text-mut">Requested by {r.requester.name} ({r.requester.org}) · {fmt.format(r.createdAt)} · {r._count.recipients} recipients</p>
            <ul className="mt-2 text-[14px]">
              {r.bids.map((b) => (
                <li key={b.id} className="flex flex-wrap justify-between gap-2 border-t border-line py-1.5">
                  <span>{b.bidder.org || b.bidder.name} · {b.status}{b.submittedAt ? ` · ${fmt.format(b.submittedAt)}` : ""}</span>
                  {b.pdfName && b.status !== "DRAFT" ? <a href={`/api/bid-files/${b.id}`} target="_blank" rel="noreferrer" className="text-brass underline">{b.pdfName}</a> : <span className="text-mut">{b.status === "DRAFT" ? "draft (not shared)" : "no PDF"}</span>}
                </li>
              ))}
              {r.bids.length === 0 ? <li className="text-mut">No bids yet.</li> : null}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
