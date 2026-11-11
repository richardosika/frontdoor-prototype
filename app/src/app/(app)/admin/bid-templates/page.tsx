import { SubmitButton } from "@/components/submit-button";
import { saveTemplateVersion, setTemplateStatus } from "@/actions/bids";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { parseFields } from "@/lib/bids";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { SEEK_CATEGORIES } from "@/lib/project-contact";

export const dynamic = "force-dynamic";

/** #51 Admin: standard bid templates. Each change is a new version; approving one retires the previous approved version. */
export default async function BidTemplatesAdmin({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; edit?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const rows = await prisma.bidTemplate.findMany({ orderBy: [{ category: "asc" }, { version: "desc" }], include: { _count: { select: { requests: true } } } });
  const edit = q.edit ? rows.find((r) => r.id === q.edit) : null;
  const cats = [...SEEK_CATEGORIES.map((c) => c.id), "SUBCONTRACTOR"];
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-3 md:pt-6 lg:px-8" data-testid="admin-bid-templates">
      <PageHeader title="Bid templates" />
      <p className="mt-2 text-[15px] text-ink">Members pick only Approved templates. Requests keep the version they were sent with. Bids themselves stay private between bidder and requester; staff do not see them here.</p>
      <Banner error={q.error} notice={q.notice} />
      <table className="mt-4 w-full border-collapse bg-paper text-[14px]">
        <thead><tr className="bg-forest text-left text-paper"><th className="p-2">Template</th><th className="p-2">Version</th><th className="p-2">Status</th><th className="p-2">Fields</th><th className="p-2">Used</th><th className="p-2" /></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-line align-top">
              <td className="p-2"><b className="text-forest">{t.name}</b><span className="block text-[12px] text-mut">{t.category}</span></td>
              <td className="p-2">v{t.version}</td>
              <td className="p-2">{t.status}{t.approvedAt ? <span className="block text-[12px] text-mut">{t.approvedBy}</span> : null}</td>
              <td className="p-2 text-[13px] text-mut">{parseFields(t.fields).map((f) => f.label).join(", ")}</td>
              <td className="p-2">{t._count.requests}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  <a className={btnOutline} href={`/admin/bid-templates?edit=${t.id}#edit`}>New version</a>
                  {t.status !== "APPROVED" ? <form action={setTemplateStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="APPROVED" /><SubmitButton className={btn}>Approve</SubmitButton></form> : null}
                  {t.status === "APPROVED" ? <form action={setTemplateStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="RETIRED" /><SubmitButton className={btnOutline}>Retire</SubmitButton></form> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form id="edit" action={saveTemplateVersion} className={`${card} mt-6 p-5`}>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass">{edit ? `New version of ${edit.name}` : "New template"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={labelCls}>Category</span>
            <select name="category" defaultValue={edit?.category ?? ""} className={field} required>
              <option value="">Choose</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label><span className={labelCls}>Name</span><input name="name" defaultValue={edit?.name ?? ""} className={field} required /></label>
        </div>
        <label className="mt-3 block"><span className={labelCls}>Fields (JSON: key, label, type money|percent|number|months|date|text|long|checks|yesno|profile, section price|terms|risk|scope, required, perUnit, best low|high|short, options)</span>
          <textarea name="fields" rows={14} className={`${field} font-mono text-[12px]`} defaultValue={edit ? JSON.stringify(parseFields(edit.fields), null, 1) : "[]"} />
        </label>
        <SubmitButton className={`${btn} mt-3`} pendingLabel="Saving…">Save as draft version</SubmitButton>
      </form>
    </div>
  );
}
