import Link from "next/link";
import { addProspect } from "@/actions/crm";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, card, field, labelCls } from "@/components/ui";
import { syncCrm } from "@/lib/crm";
import { CRM_STAGES, crmStageLabel, followUpDue, parseTags } from "@/lib/crm-stage";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ROLES, roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; q?: string; stage?: string; due?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  await syncCrm();
  const q = (params.q || "").trim();
  const stage = CRM_STAGES.find((item) => item === params.stage) || "";
  const dueOnly = params.due === "1";
  const people = await prisma.crmPerson.findMany({
    where: {
      ...(stage ? { stage } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { org: { contains: q, mode: "insensitive" } },
              { tags: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const visible = dueOnly ? people.filter((person) => followUpDue(person.followUpAt)) : people;
  const dueCount = people.filter((person) => followUpDue(person.followUpAt)).length;
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="People" />
      <div className="mx-auto max-w-6xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="People" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <p className="mt-3 text-sm text-ink">
          One record for each invite, application, and member. {dueCount} follow-up{dueCount === 1 ? "" : "s"} due.{" "}
          <Link href="/admin/crm/export" className="underline decoration-brass">
            Export CSV
          </Link>
        </p>
        <form className="mt-3 flex flex-wrap items-end gap-2" action="/admin/crm">
          <label>
            <span className={labelCls}>Search</span>
            <input name="q" defaultValue={q} className={field} placeholder="Name, email, company, tag" />
          </label>
          {stage ? <input type="hidden" name="stage" value={stage} /> : null}
          {dueOnly ? <input type="hidden" name="due" value="1" /> : null}
          <button className={btn} type="submit">
            Search
          </button>
          <Link href={dueOnly ? "/admin/crm" : "/admin/crm?due=1"} className="text-sm underline decoration-brass">
            {dueOnly ? "Show everyone" : "Follow-ups due"}
          </Link>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
          <Link href="/admin/crm" className={`inline-flex min-h-11 items-center rounded-sm border px-3 ${stage ? "border-line" : "border-brass bg-forest text-paper"}`}>
            All
          </Link>
          {CRM_STAGES.map((item) => (
            <Link
              key={item}
              href={`/admin/crm?stage=${item}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 ${stage === item ? "border-brass bg-forest text-paper" : "border-line bg-paper"}`}
            >
              {crmStageLabel(item)}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {CRM_STAGES.filter((item) => !stage || item === stage).map((item) => {
            const rows = visible.filter((person) => person.stage === item);
            return (
              <section key={item} className="w-64 shrink-0">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
                  {crmStageLabel(item)} · {rows.length}
                </h2>
                <ul className="mt-2 space-y-2">
                  {rows.length === 0 ? <li className="text-xs text-mut">None</li> : null}
                  {rows.map((person) => (
                    <li key={person.id}>
                      <Link href={`/admin/crm/${person.id}`} className={`${card} block p-3 text-sm`}>
                        <p className="font-semibold">{person.name}</p>
                        <p className="text-xs text-mut">
                          {person.org || person.email}
                          {person.role ? ` · ${roleLabel(person.role)}` : ""}
                        </p>
                        {parseTags(person.tags).length ? <p className="mt-1 text-xs text-ink">{parseTags(person.tags).join(" · ")}</p> : null}
                        {followUpDue(person.followUpAt) ? <p className="mt-1 text-xs text-brass">Follow-up due</p> : null}
                        {person.doNotContact ? <p className="mt-1 text-xs text-brass">Do not contact</p> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <section className={`${card} mt-6 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Add a prospect</h2>
          <p className="mt-1 text-sm text-ink">Mints an invite code. The information email goes to the Outbox for the test recipient when the box is checked.</p>
          <form action={addProspect} className="mt-3 grid gap-3 md:grid-cols-2">
            <label>
              <span className={labelCls}>Name</span>
              <input name="name" className={field} required />
            </label>
            <label>
              <span className={labelCls}>Email</span>
              <input name="email" type="email" className={field} required />
            </label>
            <label>
              <span className={labelCls}>Role</span>
              <select name="role" className={field} defaultValue="">
                <option value="">Not chosen</option>
                {ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Company</span>
              <input name="org" className={field} />
            </label>
            <label>
              <span className={labelCls}>City</span>
              <input name="location" className={field} />
            </label>
            <label className="flex items-center gap-2 text-sm md:mt-6">
              <input type="checkbox" name="sendInfo" value="yes" defaultChecked />
              Send the information email
            </label>
            <button className={btn} type="submit">
              Add prospect
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
