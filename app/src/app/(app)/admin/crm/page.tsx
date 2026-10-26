import Link from "next/link";
import { addProspect } from "@/actions/crm";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { DemoChip, StatusChip } from "@/components/status-chip";
import { btn, card, field, labelCls } from "@/components/ui";
import { syncCrm } from "@/lib/crm";
import { followUpDue, parseTags } from "@/lib/crm-stage";
import { requireAdmin } from "@/lib/current-user";
import { ADMIN_INTROS } from "@/lib/membership-copy";
import { PERSON_STATUSES, isDemoRecord, personStageLabel, personStanding } from "@/lib/person-standing";
import { prisma } from "@/lib/prisma";
import { ROLES, roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; q?: string; status?: string; due?: string; demo?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  await syncCrm();
  const q = (params.q || "").trim();
  const statusFilter = PERSON_STATUSES.find((item) => item === params.status) || "";
  const dueOnly = params.due === "1";
  const hideDemo = params.demo === "hide";
  const people = await prisma.crmPerson.findMany({
    where: {
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
    include: {
      application: { select: { status: true, isTest: true } },
      user: { select: { status: true, isTest: true, paymentStatus: true, isAdmin: true } },
      inviteRequest: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const decorated = people.map((person) => {
    const standing = personStanding({
      applicationStatus: person.application?.status,
      inviteStatus: person.inviteRequest?.status,
      accountStatus: person.user?.status,
      paymentStatus: person.user?.paymentStatus,
      hasMember: Boolean(person.userId),
      isAdmin: person.user?.isAdmin,
    });
    const demo = isDemoRecord({
      isTest: Boolean(person.user?.isTest || person.application?.isTest),
      email: person.email,
    });
    return { person, standing, demo };
  });
  const visible = decorated
    .filter((row) => (dueOnly ? followUpDue(row.person.followUpAt) : true))
    .filter((row) => (statusFilter ? row.standing.status === statusFilter : true))
    .filter((row) => (hideDemo ? !row.demo : true));
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
          {ADMIN_INTROS.people} {dueCount} follow-up{dueCount === 1 ? "" : "s"} due.{" "}
          <Link href="/admin/crm/export" className="underline decoration-brass">
            Export CSV
          </Link>
        </p>
        <form className="mt-3 flex flex-wrap items-end gap-2" action="/admin/crm">
          <label>
            <span className={labelCls}>Search</span>
            <input name="q" defaultValue={q} className={field} placeholder="Name, email, company, tag" />
          </label>
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          {dueOnly ? <input type="hidden" name="due" value="1" /> : null}
          {hideDemo ? <input type="hidden" name="demo" value="hide" /> : null}
          <button className={btn} type="submit">
            Search
          </button>
          <Link href={dueOnly ? "/admin/crm" : "/admin/crm?due=1"} className="text-sm underline decoration-brass">
            {dueOnly ? "Show everyone" : "Follow-ups due"}
          </Link>
          <Link href={hideDemo ? "/admin/crm" : "/admin/crm?demo=hide"} className="text-sm underline decoration-brass">
            {hideDemo ? "Show demo" : "Hide demo"}
          </Link>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
          <Link href="/admin/crm" className={`inline-flex min-h-11 items-center rounded-sm border px-3 ${statusFilter ? "border-line" : "border-brass bg-forest text-paper"}`}>
            All
          </Link>
          {PERSON_STATUSES.map((item) => (
            <Link
              key={item}
              href={`/admin/crm?status=${item}${q ? `&q=${encodeURIComponent(q)}` : ""}${hideDemo ? "&demo=hide" : ""}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 ${statusFilter === item ? "border-brass bg-forest text-paper" : "border-line bg-paper"}`}
            >
              {item === "PENDING" ? "Pending" : item === "APPROVED" ? "Approved" : "Declined"}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {(statusFilter ? [statusFilter] : PERSON_STATUSES).map((item) => {
            const rows = visible.filter((row) => row.standing.status === item);
            return (
              <section key={item} className="w-72 shrink-0">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
                  {item === "PENDING" ? "Pending" : item === "APPROVED" ? "Approved" : "Declined"} · {rows.length}
                </h2>
                <ul className="mt-2 space-y-2">
                  {rows.length === 0 ? <li className="text-xs text-mut">None</li> : null}
                  {rows.map(({ person, standing, demo }) => (
                    <li key={person.id}>
                      <Link href={`/admin/crm/${person.id}`} className={`${card} block p-3 text-sm`}>
                        <p className="font-semibold">{person.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <StatusChip status={standing.status} />
                          {demo ? <DemoChip /> : null}
                          {person.user?.isAdmin ? <span className="text-[10px] uppercase tracking-wider text-brass">Admin</span> : null}
                        </div>
                        <p className="mt-1 text-xs text-mut">
                          {person.org || person.email}
                          {person.role ? ` · ${roleLabel(person.role)}` : ""}
                          {` · ${personStageLabel(standing.stage)}`}
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
