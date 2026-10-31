import Link from "next/link";
import { serverTx } from "@/lib/i18n/server";
import type { StartItem } from "@/lib/member-reach";

/** #24: a clean first-week checklist. Items tick themselves off; the box disappears once everything is done. */
export async function GettingStarted({ items }: { items: StartItem[] }) {
  if (items.every((item) => item.done)) return null;
  const tx = await serverTx();
  const done = items.filter((item) => item.done).length;
  return (
    <section className="mb-6 rounded border border-brass bg-paper p-4 md:p-5" data-testid="getting-started">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-[24px] font-normal leading-tight">{tx("Getting started")}</h2>
        <p className="shrink-0 text-[13px] font-semibold text-mut">
          {done} / {items.length} {tx("done")}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
        <div className="h-full bg-brass" style={{ width: `${Math.round((done / items.length) * 100)}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} data-done={item.done ? "yes" : "no"}>
            <Link href={item.href} className="flex min-h-12 items-center gap-3 py-2 text-[16px]">
              <span
                aria-hidden
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[13px] font-bold ${
                  item.done ? "border-forest bg-forest text-paper" : "border-brass bg-paper text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={`flex-1 ${item.done ? "text-mut line-through decoration-line" : "text-ink"}`}>{tx(item.label)}</span>
              <span className="sr-only">{item.done ? tx("Done") : tx("To do")}</span>
              {!item.done ? <span aria-hidden className="text-brass">›</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
