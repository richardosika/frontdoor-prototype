import { PageHeader } from "@/components/page-header";
import { SuggestVendorForm } from "@/components/suggest-vendor-form";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { numberLocale } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { seekLabel } from "@/lib/project-contact";
import { STATUS_TONE, statusLabel, suggestionCategories, type SuggestionStatus } from "@/lib/vendor-suggestions";
import { syncSuggestionsQuietly } from "@/lib/vendor-suggestions-db";

export const dynamic = "force-dynamic";

/** Suggest a vendor: private suggestions; every vendor is personally reviewed and verified before joining. */
export default async function SuggestVendorPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const q = await searchParams;
  const tx = await serverTx();
  const locale = await currentLocale();
  const user = await requireUser();
  await syncSuggestionsQuietly({ suggestedById: user.id });
  const rows = await prisma.vendorSuggestion.findMany({ where: { suggestedById: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const dateFmt = new Intl.DateTimeFormat(numberLocale(locale), { month: "short", day: "numeric", timeZone: "America/New_York" });
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="suggest-vendor-page">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Grow the network")}</p>
      <PageHeader title={tx("Suggest a vendor")} />
      <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink">
        {tx("Know a consultant or service provider who does excellent work? Tell us about them. We'll reach out, and if they apply, they go through the same review every member does.")}
      </p>
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className={`${card} p-4 shadow-[0_8px_24px_rgba(31,58,46,0.08)] sm:p-7`}>
          <div className="mb-5 flex gap-3 rounded border border-[#E9D9B0] bg-[#F6EEDB] px-4 py-3 text-[14px] leading-relaxed text-ink" data-testid="suggest-privacy">
            <span className="text-lg text-forest" aria-hidden>✓</span>
            <p>
              <b className="text-forest">{tx("Every vendor is personally reviewed and verified before they can join.")}</b>{" "}
              {tx("A suggestion is not a membership. Your suggestions are private: other members never see who you suggested, and the vendor only sees your name if you allow it below.")}
            </p>
          </div>
          <SuggestVendorForm categories={suggestionCategories()} initialCategory={suggestionCategories().some((c) => c.id === q.category) ? q.category : ""} />
        </section>
        <section className={`${card} p-4 shadow-[0_8px_24px_rgba(31,58,46,0.08)] sm:p-7`} data-testid="your-suggestions">
          <h2 className="font-serif text-[26px] font-medium text-forest">{tx("Your suggestions")}</h2>
          {rows.length === 0 ? <p className="mt-2 text-[15px] text-mut">{tx("No suggestions yet.")}</p> : null}
          <ul>
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 border-t border-line py-3.5 first:border-0" data-testid="suggestion-row">
                <div className="min-w-0">
                  <p className="font-semibold text-forest [overflow-wrap:anywhere]">{row.vendorName || row.company || tx("No specific vendor")}</p>
                  <p className="mt-0.5 text-[13px] text-mut [overflow-wrap:anywhere]">
                    {tx(seekLabel(row.category))} · {row.location} · {dateFmt.format(row.createdAt)}
                  </p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_TONE[row.status as SuggestionStatus] ?? STATUS_TONE.IN_REVIEW}`} data-testid={`suggestion-status-${row.status}`}>
                  {tx(statusLabel(row.status))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
