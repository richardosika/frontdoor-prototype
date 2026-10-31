import Link from "next/link";
import { contactAboutProject } from "@/actions/projects";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { MyCircleList } from "@/components/my-circle";
import { PageHeader } from "@/components/page-header";
import { SlimFilterBar } from "@/components/slim-filters";
import { btn, btnOutline, card, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { serverTx } from "@/lib/i18n/server";
import { loadFindTeam, loadLedgerProjects, loadMyCircle } from "@/lib/ledger-projects";
import { isDeveloperRole, readSlimFilters } from "@/lib/member-reach";
import { seekLabel } from "@/lib/project-contact";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

const h2 = "text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";

function statusWord(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return "Sent";
}

/**
 * #27: the Deals page is replaced. Developers get "Find your team"; everyone else gets "Opportunities for you":
 * only approved projects seeking their category plus projects shared by their circle. No open list of deals.
 */
export default async function DealsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const tx = await serverTx();
  const user = await requireUser();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  if (isDeveloperRole(user.role)) return <FindYourTeam user={user} error={error} notice={notice} />;

  const filters = readSlimFilters(params);
  const data = await loadLedgerProjects(user, { filters, limit: 200 });
  const active = Boolean(filters.asset || filters.state || filters.size);
  const rows = [...data.seekingMe.map((project) => ({ ...project, why: "seeking" as const })), ...data.circleShared.map((project) => ({ ...project, status: "", why: "circle" as const }))];

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-8 pt-3 md:pt-6 lg:px-8" data-testid="opportunities">
      <PageHeader title={tx("Opportunities for you")} />
      <p className="mt-1 text-[16px] leading-relaxed text-ink">
        {data.myCategory
          ? `${tx("Approved projects seeking your category")}: ${tx(seekLabel(data.myCategory))}. ${tx("Plus projects your circle shares with you.")}`
          : tx("Projects your circle shares with you.")}
      </p>
      <div className="mt-3">
        <Banner error={error ? tx(error) : undefined} notice={notice ? tx(notice) : undefined} />
      </div>
      <div className="mt-3">
        <SlimFilterBar path="/deals" filters={filters} />
      </div>
      <p className="text-[13px] text-mut">
        {rows.length} {tx(rows.length === 1 ? "project" : "projects")}
      </p>
      {rows.length === 0 ? (
        <div className={`${card} mt-3 p-6 text-center text-[16px] text-mut`}>
          {active ? tx("No projects match these filters.") : tx("No approved projects are seeking your category right now.")}
        </div>
      ) : (
        <ul className="mt-3 grid gap-4 md:grid-cols-2">
          {rows.map((project) => (
            <li key={project.id} className={`${card} flex flex-col border-t-[3px] border-t-brass p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
                {project.why === "seeking" ? tx("Seeking your category") : tx("Shared by My Circle")}
              </p>
              <Link href={`/projects/${project.id}`} className="mt-1 font-serif text-[22px] leading-snug underline decoration-brass underline-offset-2 hover:text-forest">
                {project.name}
              </Link>
              <p className="mt-1 text-[15px] text-mut">
                {project.user.name} · {tx(project.asset)} · {project.location} · {project.year}
              </p>
              {project.valueLabel ? <p className="mt-1 font-serif text-[17px] text-forest">{project.valueLabel}</p> : null}
              {project.why === "seeking" ? (
                project.status ? (
                  <p className="mt-3 text-[14px] text-mut">
                    {tx("Contact request")}: {tx(statusWord(project.status))}
                  </p>
                ) : (
                  <form action={contactAboutProject} className="mt-3 grid gap-2">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="back" value="/deals" />
                    <input name="note" className={`${field} text-[16px]`} placeholder={tx("A short note. It stays inside Private Floor.")} />
                    <button className={btn} type="submit">
                      {tx("Contact about this project")}
                    </button>
                  </form>
                )
              ) : (
                <Link href={`/projects/${project.id}`} className={`${btnOutline} mt-3`}>
                  {tx("Open the project")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function FindYourTeam({ user, error, notice }: { user: { id: string }; error?: string; notice?: string }) {
  const tx = await serverTx();
  const [team, circle] = await Promise.all([loadFindTeam(user), loadMyCircle(user)]);
  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-8 pt-3 md:pt-6 lg:px-8" data-testid="find-your-team">
      <PageHeader title={tx("Find your team")} />
      <p className="mt-1 text-[16px] leading-relaxed text-ink">
        {tx("Approved members in the categories your projects are seeking. Reach out about a specific project; the conversation stays inside Private Floor.")}
      </p>
      <div className="mt-3">
        <Banner error={error ? tx(error) : undefined} notice={notice ? tx(notice) : undefined} />
      </div>
      {team.projects.length === 0 ? (
        <div className={`${card} mt-4 p-5 text-[16px] text-ink`}>
          <p>{tx("Once staff approve a project and you choose who it is seeking, matching members appear here.")}</p>
          {team.pending.length ? (
            <p className="mt-2 text-[15px] text-mut">
              {tx("Waiting for staff review")}: {team.pending.map((project) => project.name).join(", ")}
            </p>
          ) : null}
          <Link href="/feed#ledger-add-project" className={`${btn} mt-4`}>
            {tx("Add a project")}
          </Link>
        </div>
      ) : null}
      {team.projects.map((project) => (
        <section key={project.id} className={`${card} mt-4 min-w-0 p-4 md:p-5`} data-testid="team-project">
          <p className={h2}>{tx("For project")}</p>
          <Link href={`/projects/${project.id}`} className="font-serif text-[24px] leading-snug underline decoration-brass underline-offset-2">
            {project.name}
          </Link>
          <p className="text-[14px] text-mut">
            {tx(project.asset)} · {project.location}
          </p>
          {project.groups.map((group) => (
            <div key={group.category} className="mt-4 min-w-0 border-l-2 border-brass pl-3">
              <p className="text-[16px] font-semibold text-forest">
                {tx(seekLabel(group.category))} <span className="font-normal text-mut">· {group.members.length}</span>
              </p>
              {group.members.length === 0 ? <p className="text-[15px] text-mut">{tx("No matching members yet.")}</p> : null}
              <ul className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {group.members.map((member) => (
                  <li key={member.id} className="min-w-0 rounded border border-line bg-cream p-3">
                    <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                      <Avatar initials={member.initials} photoId={member.photoId} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[16px] font-semibold">{member.name}</span>
                        <span className="block truncate text-[13px] text-mut">
                          {tx(roleShort(roleLabel(member.role)))} · {member.org} · {member.location}
                        </span>
                      </span>
                    </Link>
                    {member.bio || member.offering ? <p className="mt-2 line-clamp-2 text-[14px] text-ink">{member.offering || member.bio}</p> : null}
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">{tx("Past work")}</p>
                    {member.projects.length ? (
                      <ul className="text-[14px] text-ink">
                        {member.projects.map((work) => (
                          <li key={work.id} className="truncate">
                            {work.name} · {tx(work.asset)} · {work.year}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[14px] text-mut">{tx("None listed yet.")}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {member.status ? (
                        <span className="rounded-sm border border-line bg-paper px-2 py-1 text-[13px] font-semibold text-forest" data-testid="outreach-status">
                          {tx("Outreach")}: {tx(statusWord(member.status))}
                        </span>
                      ) : (
                        <form action={contactAboutProject} className="min-w-0 max-w-full">
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="toId" value={member.id} />
                          <input type="hidden" name="back" value="/deals" />
                          <button className={`${btnOutline} h-auto max-w-full whitespace-normal text-left`} type="submit">
                            {tx("Reach out about")} {project.name}
                          </button>
                        </form>
                      )}
                      <Link href={`/members/${member.id}`} className="text-[14px] font-semibold text-forest underline decoration-brass">
                        {tx("View profile")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <section id="my-circle" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 font-serif text-[26px]">{tx("My Circle")}</h2>
        <MyCircleList people={circle} />
      </section>
    </div>
  );
}
