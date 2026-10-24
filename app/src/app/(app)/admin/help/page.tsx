import Link from "next/link";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { ensureHelpArticles } from "@/lib/help/store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unanswered", label: "Unanswered" },
  { id: "refused", label: "Refused" },
  { id: "down", label: "Thumbs down" },
] as const;

export default async function AdminHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdmin();
  await ensureHelpArticles();
  const params = await searchParams;
  const filter = FILTERS.some((item) => item.id === params.filter) ? params.filter : "all";
  const where =
    filter === "unanswered"
      ? { unanswered: true }
      : filter === "refused"
        ? { confidence: "refused" }
        : filter === "down"
          ? { feedback: "down" }
          : {};
  const [turns, unanswered] = await Promise.all([
    prisma.helpTurn.findMany({ where, orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.helpTurn.count({ where: { unanswered: true } }),
  ]);

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Help" />
      <div className="mx-auto max-w-4xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Help questions" />
        <p className="mt-1 text-sm text-ink">
          {unanswered} unanswered. Questions are stored as typed. Help does not keep a name, email, or address with them.{" "}
          <Link href="/admin/help/faq" className="underline decoration-brass">
            Edit the FAQ
          </Link>
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {FILTERS.map((item) => (
            <Link
              key={item.id}
              href={item.id === "all" ? "/admin/help" : `/admin/help?filter=${item.id}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 ${filter === item.id ? "border-brass bg-forest text-paper" : "border-line bg-paper"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {turns.length === 0 ? <p className="mt-6 text-sm text-mut">No questions in this filter.</p> : null}
        <ul className="mt-4 space-y-3">
          {turns.map((turn) => (
            <li key={turn.id} className={`${card} p-4 text-sm`}>
              <p className="text-xs text-mut">
                {formatAuditTime(turn.createdAt)} · {turn.confidence} · {turn.provider}
                {turn.feedback === "up" ? " · thumbs up" : turn.feedback === "down" ? " · thumbs down" : ""}
                {turn.unanswered ? " · unanswered" : ""}
              </p>
              <p className="mt-2 font-semibold">{turn.question}</p>
              <p className="mt-2 whitespace-pre-wrap text-ink">{turn.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
