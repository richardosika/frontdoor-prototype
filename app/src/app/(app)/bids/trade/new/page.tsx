import Link from "next/link";
import { createTradePackage } from "@/actions/bids";
import { Banner } from "@/components/banner";
import { h2 } from "@/components/bids-ui";
import { SubmitButton } from "@/components/submit-button";
import { btn, card, field, labelCls } from "@/components/ui";
import { PLAN_ACCEPT } from "@/lib/bid-plans";
import { bidAccess } from "@/lib/bids-db";
import { requireUser } from "@/lib/current-user";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { US_STATES } from "@/lib/member-network";
import { prisma } from "@/lib/prisma";
import { isGeneralContractor, sortedTrades, statesFrom } from "@/lib/trades";

export const dynamic = "force-dynamic";

/** Nov 6: a GC posts a trade bid package on a project they own or are active on. Matching subs are alerted. */
export default async function NewTradePackage({ searchParams }: { searchParams: Promise<{ project?: string; error?: string }> }) {
  const user = await requireUser();
  const tx = await serverTx();
  const locale = await currentLocale();
  const q = await searchParams;
  const access = q.project && isGeneralContractor(user) ? await bidAccess(q.project, user.id) : null;
  if (!access) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8" data-testid="trade-package-unavailable">
        <p className="text-[16px] text-ink">{tx("Only general contractors on a project can post trade bid packages for it.")}</p>
        <Link href="/bids" className="mt-3 inline-block text-forest underline decoration-brass">{tx("Bids")}</Link>
      </div>
    );
  }
  const project = await prisma.trackProject.findUnique({ where: { id: access.project.id }, select: { state: true, location: true } });
  const projectStates = statesFrom(project?.state || project?.location || "");
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const due = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const box = "h-5 w-5 shrink-0 accent-[#1F3A2E]";
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="trade-package-new">
      <Link href={`/projects/${access.project.id}`} className="inline-flex min-h-11 items-center text-[15px] text-forest underline decoration-brass">‹ {access.project.name}</Link>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Trade bid package")}</p>
      <h1 className="font-serif text-[30px] leading-tight text-forest sm:text-[36px]">{access.project.name}</h1>
      <p className="mt-1 text-[15px] text-mut">{tx("Only subcontractors who list this trade and serve one of the states you pick are matched and alerted. They bid on the standard Subcontractor form and can attach their own PDF.")}</p>
      {q.error ? <div className="mt-3"><Banner error={tx(q.error)} /></div> : null}
      <form action={createTradePackage} className="mt-4">
        <input type="hidden" name="projectId" value={access.project.id} />
        <section className={`${card} p-4 sm:p-5`}>
          <h2 className={h2}>1 · {tx("Trade")}</h2>
          <select name="trade" required defaultValue="" className={`${field} max-w-md`} data-testid="package-trade">
            <option value="" disabled>{tx("Choose a trade")}</option>
            {sortedTrades(locale, tx).map((t) => <option key={t.id} value={t.id}>{tx(t.label)}</option>)}
          </select>
        </section>
        <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="package-states">
          <h2 className={h2}>2 · {tx("Service area")}</h2>
          <p className="mb-2 text-[14px] text-mut">{tx("States this package covers. The project's state is ticked for you.")}</p>
          <div className="grid max-h-60 grid-cols-4 gap-x-2 gap-y-1 overflow-y-auto rounded border border-line bg-paper p-3 text-[16px] sm:grid-cols-8">
            {US_STATES.map((s) => (
              <label key={s} className="flex min-h-10 cursor-pointer items-center gap-2">
                <input type="checkbox" name="serviceStates" value={s} defaultChecked={projectStates.includes(s)} className={box} />
                {s}
              </label>
            ))}
          </div>
        </section>
        <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="package-scope">
          <h2 className={h2}>3 · {tx("Scope of work and schedule")}</h2>
          <label className="mb-3 block">
            <span className={labelCls}>{tx("Scope of work")} *</span>
            <textarea name="scopeOfWork" required minLength={10} maxLength={4000} rows={5} className={field} placeholder={tx("What the bid must cover: inclusions, exclusions, allowances.")} />
          </label>
          <label className="block">
            <span className={labelCls}>{tx("Schedule")} *</span>
            <textarea name="schedule" required minLength={3} maxLength={2000} rows={3} className={field} placeholder={tx("Expected start, key milestones and completion.")} />
          </label>
          <label className="mt-3 block max-w-xs">
            <span className={labelCls}>{tx("Bids due")}</span>
            <input type="date" name="dueAt" required min={minDate} defaultValue={due} className={field} />
            <span className="mt-1 block text-[13px] text-mut">{tx("5:00 PM ET on the due date")}</span>
          </label>
        </section>
        <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="package-plans">
          <h2 className={h2}>4 · {tx("Plans")}</h2>
          <input type="file" name="plans" multiple accept={PLAN_ACCEPT} className="block w-full text-[15px] file:mr-3 file:min-h-11 file:rounded-sm file:border file:border-forest file:bg-paper file:px-4 file:font-semibold file:text-forest" />
          <p className="mt-2 text-[13px] text-mut">{tx("PDF, DWG or images, up to 5 files and 25 MB each. Matching subcontractors can open them.")}</p>
          <label className="mt-3 block">
            <span className={labelCls}>{tx("Drawings / basis")}</span>
            <input name="basisNote" maxLength={300} className={field} placeholder={tx("e.g. 100% DD set")} />
          </label>
        </section>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/suggest?category=SUBCONTRACTOR" className="text-[15px] text-forest underline decoration-brass" data-testid="suggest-sub-link">{tx("Know a subcontractor who should be here? Suggest them")}</Link>
          <SubmitButton className={btn} data-testid="post-trade-package" pendingLabel="Posting…">{tx("Post trade bid package")}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
