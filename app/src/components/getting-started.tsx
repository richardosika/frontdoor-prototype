import Link from "next/link";
import { serverTx } from "@/lib/i18n/server";
import type { StartItem } from "@/lib/member-reach";

/** #24: a clean first-week checklist. Items tick themselves off; the box disappears once everything is done. */
export async function GettingStarted({ items, category = "" }: { items: StartItem[]; category?: string }) {
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
      <p className="mt-2 text-[14px] text-mut">{tx("Complete each step in order. The next step opens when the one before it is done.")}</p>
      <ul className="mt-2 divide-y divide-line">
        {items.map((item, index) => {
          const mark = (
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold ${
                item.state === "done" ? "border-forest bg-forest text-paper" : item.state === "current" ? "border-brass bg-brass text-paper" : "border-line bg-cream text-mut"
              }`}
            >
              {item.state === "done" ? "✓" : item.state === "locked" ? "🔒︎" : index + 1}
            </span>
          );
          if (item.state === "waiting") {
            return (
              <li key={item.id} data-state="waiting" className="-mx-2 flex min-h-12 items-center gap-3 rounded bg-cream px-2 py-2 text-[16px]">
                <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-dashed border-brass bg-paper text-[12px] font-bold text-brass">
                  {index + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-ink">{tx(item.label)}</span>
                  <span className="block text-[14px] text-brass">{tx("Waiting for staff approval")}</span>
                </span>
              </li>
            );
          }
          if (item.state === "current") {
            return (
              <li key={item.id} data-state="current">
                <Link href={item.href} className="-mx-2 flex min-h-12 items-center gap-3 rounded bg-brass-soft px-2 py-2 text-[16px] font-semibold">
                  {mark}
                  <span className="flex-1 text-ink">{tx(item.label)}</span>
                  <span className="shrink-0 text-[13px] text-forest underline decoration-brass">{tx("Start")} ›</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.id} data-state={item.state} aria-disabled={item.state === "locked" ? "true" : undefined} className="flex min-h-12 items-center gap-3 py-2 text-[16px]">
              {mark}
              <span className="flex-1">
                <span className={`block ${item.state === "done" ? "text-mut line-through decoration-line" : "text-mut opacity-60"}`}>{tx(item.label)}</span>
                {item.note ? <span className="block text-[14px] text-forest" data-testid={`start-note-${item.id}`}>{tx(item.note).replace("{category}", category).replace(/\bseeking a ([AEIOU])/, "seeking an $1")}</span> : null}
              </span>
              <span className="sr-only">{item.state === "done" ? tx("Done") : tx("Locked until the earlier steps are done")}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
