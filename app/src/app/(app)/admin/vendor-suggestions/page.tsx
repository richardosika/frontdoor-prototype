import { VendorSuggestionActions } from "@/components/vendor-suggestion-actions";
import { card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { seekLabel } from "@/lib/project-contact";
import { referralJoinLink } from "@/lib/referral-email";
import { appBaseUrl } from "@/lib/url";
import { RELATION_LABEL, STATUS_TONE, demandByCategory, statusLabel, type Relation, type SuggestionStatus } from "@/lib/vendor-suggestions";
import { syncSuggestionsQuietly } from "@/lib/vendor-suggestions-db";

export const dynamic = "force-dynamic";

const ORDER: Record<string, number> = { IN_REVIEW: 0, LINK_SENT: 1, APPLIED: 2, VERIFIED: 3, DECLINED: 4 };

/** Admin queue for member vendor suggestions, with demand by category and location. */
export default async function VendorSuggestionsAdminPage() {
  await syncSuggestionsQuietly({});
  const [rows, base] = await Promise.all([
    prisma.vendorSuggestion.findMany({ include: { suggestedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 300 }),
    appBaseUrl(),
  ]);
  const codes = await prisma.inviteCode.findMany({ where: { id: { in: rows.map((r) => r.inviteCodeId).filter((x): x is string => !!x) } }, select: { id: true, code: true } });
  const codeById = new Map(codes.map((c) => [c.id, c.code]));
  rows.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.createdAt.getTime() - a.createdAt.getTime());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const stats = [
    { v: rows.filter((r) => r.status === "IN_REVIEW").length, l: "In review" },
    { v: rows.filter((r) => r.status === "LINK_SENT").length, l: "Referral links sent" },
    { v: rows.filter((r) => r.status === "APPLIED" && r.statusChangedAt >= monthStart).length, l: "Applied this month" },
    { v: rows.filter((r) => r.status === "VERIFIED").length, l: "Verified via suggestion" },
  ];
  const demand = demandByCategory(rows);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:py-6" data-testid="admin-vendor-suggestions">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Operations</p>
      <h1 className="font-serif text-[30px] font-medium text-forest md:text-[38px]">Vendor suggestions</h1>
      <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink">
        Member-submitted vendors awaiting review. Approving creates a personal referral link; the vendor still completes the full application and verification.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className={`${card} p-4`} data-testid="suggestion-stat">
            <p className="font-serif text-[30px] text-forest">{s.v.toLocaleString("en-US")}</p>
            <p className="text-[12px] text-mut">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 items-start gap-5 2xl:grid-cols-[2.4fr_1fr]">
        <section className={`${card} px-3 py-2`} data-testid="suggestion-queue">
          <div className="hidden grid-cols-[1.4fr_1.1fr_1fr_0.9fr_0.9fr_minmax(220px,1.3fr)] gap-3 border-b border-line px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-mut lg:grid">
            <span>Vendor</span><span>Suggested by</span><span>Category</span><span>Location</span><span>Status</span><span>Actions</span>
          </div>
          {rows.length === 0 ? <p className="p-3 text-[14px] text-mut">No suggestions yet.</p> : null}
          {rows.map((row) => {
            const demandOnly = row.relation === "LOOKING" && !row.vendorName && !row.company;
            const code = row.inviteCodeId ? codeById.get(row.inviteCodeId) : undefined;
            const status = row.status as SuggestionStatus;
            return (
              <div key={row.id} className="grid grid-cols-1 gap-1.5 border-b border-line px-2 py-3 text-[14px] text-ink last:border-0 lg:grid-cols-[1.4fr_1.1fr_1fr_0.9fr_0.9fr_minmax(220px,1.3fr)] lg:gap-3" data-testid="admin-suggestion-row">
                <div className="min-w-0">
                  <p className="font-semibold text-forest [overflow-wrap:anywhere]">{row.vendorName || (row.company ? row.company : "—")}</p>
                  <p className="text-[12px] text-mut [overflow-wrap:anywhere]">{demandOnly ? "No specific vendor" : row.vendorName ? row.company || row.website || "No website" : row.website || "No website"}</p>
                  {row.contact ? <p className="text-[12px] text-mut [overflow-wrap:anywhere]">{row.contact}</p> : null}
                  {row.note ? <p className="mt-1 text-[12px] italic text-mut [overflow-wrap:anywhere]">{row.note}</p> : null}
                </div>
                <div>
                  {row.suggestedBy.name}
                  <p className="text-[12px] text-mut">
                    {RELATION_LABEL[row.relation as Relation] ?? row.relation} · {row.nameOk ? "name OK" : "private"}
                  </p>
                </div>
                <div>{seekLabel(row.category)}</div>
                <div>{row.location}</div>
                <div>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[status] ?? STATUS_TONE.IN_REVIEW}`} data-testid={`admin-status-${row.status}`}>
                    {demandOnly && status === "IN_REVIEW" ? "Demand signal" : statusLabel(row.status)}
                  </span>
                </div>
                <VendorSuggestionActions
                  id={row.id}
                  status={row.status}
                  demandOnly={demandOnly}
                  link={code ? referralJoinLink(base, code) : ""}
                  applicationHref={row.applicationId ? `/admin/applications/${row.applicationId}` : ""}
                />
              </div>
            );
          })}
        </section>
        <section className={`${card} p-5`} data-testid="demand-by-category">
          <h2 className="font-serif text-[22px] font-medium text-forest">Demand by category</h2>
          {demand.length === 0 ? <p className="mt-2 text-[14px] text-mut">No demand yet.</p> : null}
          {demand.map((d) => (
            <div key={`${d.category}-${d.area}`} className="flex justify-between gap-3 border-t border-line py-2.5 first-of-type:border-0" data-testid="demand-row">
              <div>
                <p className="font-semibold text-forest">{d.label}</p>
                <p className="text-[12px] text-mut">{d.area}</p>
              </div>
              <p className="whitespace-nowrap font-semibold text-brass">
                {d.count.toLocaleString("en-US")} {d.count === 1 ? "request" : "requests"}
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
