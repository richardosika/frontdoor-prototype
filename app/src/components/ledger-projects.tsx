import Link from "next/link";
import { addContactToCircle, respondProjectContact } from "@/actions/projects";
import { ReachOut, StatusPill } from "@/components/reach-out";
import { memberLine } from "@/lib/member-line";
import { ProjectFacts } from "@/components/project-facts";
import { ProjectForm, ReviewChip } from "@/components/project-form";
import { btn, btnOutline } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import { SlimFilterBar } from "@/components/slim-filters";
import { isDeveloperRole, type SlimFilters } from "@/lib/member-reach";
import type { loadLedgerProjects } from "@/lib/ledger-projects";
import { formatProjectValue, parseSeeking, projectLocation, seekLabel } from "@/lib/project-contact";
import { roleLabel, roleShort } from "@/lib/roles";

type Data = Awaited<ReturnType<typeof loadLedgerProjects>>;

const h2 = "text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";
const box = "rounded border border-line bg-paper p-4 md:p-5";

function statusWord(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return "Sent";
}

export async function LedgerProjects({ data, role, filters }: { data: Data; role: string; filters?: SlimFilters }) {
  const developer = isDeveloperRole(role);
  const tx = await serverTx();
  const ownerFirst = role === "DEVELOPER" || data.myProjects.length > 0;

  type Received = Data["received"][number];
  const requestCard = (row: Received, showProject: boolean) => {
    const seeking = parseSeeking(row.project.seeking);
    return (
      <li key={row.id} className="grid gap-2 border-t border-line py-3 first:border-t-0" data-testid="outreach-request">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/members/${row.from.id}`} className="text-[16px] font-semibold text-forest underline decoration-brass underline-offset-2">
              {row.from.name}
            </Link>
            <p className="text-[14px] text-mut" data-testid="member-line">{memberLine(row.from, tx)}</p>
          </div>
          {row.status === "PENDING" ? null : <StatusPill status={row.status} />}
        </div>
        {showProject ? (
          <div className="rounded border border-line bg-cream px-3 py-2">
            <Link href={`/projects/${row.project.id}`} className="text-[15px] font-semibold text-forest underline decoration-brass underline-offset-2">
              {row.project.name}
            </Link>
            <p className="text-[14px] text-mut">{[tx(row.project.asset), projectLocation(row.project) || row.project.location, row.project.year ? String(row.project.year) : ""].filter(Boolean).join(" · ")}</p>
            {seeking.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {seeking.map((id) => (
                  <span key={id} className="rounded-full border border-brass bg-paper px-2.5 py-0.5 text-[13px] text-ink" data-testid="seeking-chip">
                    {tx(seekLabel(id))}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {row.note ? <p className="border-l-2 border-brass pl-3 text-[15px] italic leading-relaxed text-ink" data-testid="request-note">“{row.note}”</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {row.status === "PENDING" ? (
            <>
              <form action={respondProjectContact}>
                <input type="hidden" name="contactId" value={row.id} />
                <button className={btn} name="decision" value="ACCEPTED" type="submit">
                  {tx("Accept")}
                </button>
              </form>
              <form action={respondProjectContact}>
                <input type="hidden" name="contactId" value={row.id} />
                <button className={btnOutline} name="decision" value="DECLINED" type="submit">
                  {tx("Decline")}
                </button>
              </form>
            </>
          ) : null}
          {row.status === "ACCEPTED" && row.ownerIsMe && !row.inCircle ? (
            <form action={addContactToCircle}>
              <input type="hidden" name="contactId" value={row.id} />
              <button className={btnOutline} type="submit">
                {tx("Add to My Circle")}
              </button>
            </form>
          ) : null}
          <Link href={`/members/${row.from.id}`} className="ml-auto text-[14px] font-semibold text-forest underline decoration-brass">
            {tx("View profile")} ›
          </Link>
        </div>
      </li>
    );
  };

  // #40: one card per project: header, then one row per role sought with matched members, then requests received.
  const mine = (
    <section id="ledger-my-projects" className="grid scroll-mt-20 gap-3" data-testid="ledger-my-projects" key="mine">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2}>{tx("My projects")}</h2>
      </div>
      <details id="ledger-add-project" className="scroll-mt-20" data-testid="ledger-add-project">
        <summary className={`${btn} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}>+ {tx("Add a project")}</summary>
        <div className="mt-3 rounded border border-line bg-cream p-4 md:p-5">
          <ProjectForm back="/feed" />
        </div>
      </details>
      {data.myProjects.length === 0 ? <p className={`${box} text-[16px] text-mut`}>{tx("No projects listed yet.")}</p> : null}
      {data.myProjects.map((project) => {
        const incoming = data.received.filter((row) => row.project.id === project.id);
        const approved = project.reviewStatus === "APPROVED";
        return (
          <article key={project.id} className={box} data-testid="ledger-project-card">
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
              <div className="min-w-0 flex-1">
                <Link href={`/projects/${project.id}`} className="text-[19px] font-semibold text-forest underline decoration-brass underline-offset-2">
                  {project.name}
                </Link>
                <p className="mt-0.5 text-[15px] text-mut">{[tx(project.asset), projectLocation(project) || project.location, String(project.year)].filter(Boolean).join(" · ")}</p>
              </div>
              <ReviewChip status={project.reviewStatus} />
            </header>
            {project.reviewStatus === "NEEDS_INFO" ? (
              <div className="mt-3 rounded border border-brass bg-cream px-3 py-2 text-[15px] text-ink">
                {project.reviewNote ? (
                  <p>
                    <b>{tx("Note from the reviewer:")}</b> {project.reviewNote}
                  </p>
                ) : null}
                <Link href={`/profile#project-${project.id}`} className="mt-1 inline-block font-semibold text-forest underline decoration-brass">
                  {tx("Edit and resubmit")}
                </Link>
              </div>
            ) : null}
            {project.seekingIds.length === 0 ? (
              <p className="mt-3 text-[15px] text-mut">{tx("Not seeking anyone. Members cannot contact you about this project.")}</p>
            ) : !approved ? (
              <div className="mt-3" data-testid="matching-after-approval">
                <div className="flex flex-wrap gap-1.5">
                  {project.seekingIds.map((id) => (
                    <span key={id} className="rounded-full border border-line px-2.5 py-0.5 text-[13px] text-mut">
                      {tx(seekLabel(id))}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[15px] text-mut">{tx("Matching opens after approval")}</p>
              </div>
            ) : (
              <div className="mt-1">
                {project.lookingFor.map((group) => (
                  <div key={group.category} className="grid gap-1 border-b border-line py-3 last:border-0 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-4" data-testid="seek-row">
                    <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-brass md:pt-2">{tx(seekLabel(group.category))}</p>
                    <div className="min-w-0">
                      {group.members.length === 0 ? <p className="py-2 text-[14px] text-mut">{tx("No matching members yet.")}</p> : null}
                      <ul className="grid gap-1">
                        {group.members.map((member) => (
                          <li key={member.id} className="flex min-h-12 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-1">
                            <Link href={`/members/${member.id}`} className="min-w-0 flex-1 basis-48">
                              <span className="block text-[15px] font-semibold text-ink">{member.name}</span>
                              <span className="block text-[13px] text-mut" data-testid="member-line">{memberLine(member, tx)}</span>
                            </Link>
                            {member.status ? <StatusPill status={member.status} /> : <ReachOut projects={[{ id: project.id, name: project.name, status: "" }]} toId={member.id} back="/feed" />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {incoming.length ? (
              <div className="mt-3 rounded border border-brass/60 bg-paper px-3" data-testid="project-requests">
                <p className="pt-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-brass">{tx("Requests received")}</p>
                <ul>{incoming.map((row) => requestCard(row, false))}</ul>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );

  const myIds = new Set(data.myProjects.map((project) => project.id));
  const otherReceived = data.received.filter((row) => !myIds.has(row.project.id));
  const otherSent = data.sent.filter((row) => !myIds.has(row.project.id));
  const outreach =
    otherReceived.length || otherSent.length || !ownerFirst ? (
      <section id="ledger-outreach" className={`${box} scroll-mt-20`} data-testid="ledger-outreach" key="outreach">
        <h2 className={h2}>{tx("Outreach")}</h2>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{tx("Requests received")}</p>
            {otherReceived.length === 0 ? <p className="text-[15px] text-mut">{tx("None yet.")}</p> : null}
            <ul>{otherReceived.map((row) => requestCard(row, true))}</ul>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{tx("Requests sent")}</p>
            {otherSent.length === 0 ? <p className="text-[15px] text-mut">{tx("None yet.")}</p> : null}
            <ul>
              {otherSent.map((row) => (
                <li key={row.id} className="flex min-w-0 flex-wrap items-center gap-2 border-t border-line py-2 first:border-t-0">
                  <span className="min-w-0 flex-1">
                    <Link href={`/members/${row.to.id}`} className="font-semibold">
                      {row.to.name}
                    </Link>
                    <span className="block text-[13px] text-mut">{[memberLine(row.to, tx), row.project.name].filter(Boolean).join(" · ")}</span>
                  </span>
                  <StatusPill status={row.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    ) : null;

  // #21: developers do not get the "Projects seeking your category" box; everyone else gets it with a slim filter bar.
  const seekingMe = data.myCategory && !developer ? (
    <section id="ledger-seeking" className={`${box} scroll-mt-20`} data-testid="ledger-seeking-me" key="seeking">
      {filters ? <SlimFilterBar path="/feed" filters={filters} anchor="ledger-seeking" /> : null}
      <h2 className={h2}>
        {tx("Projects seeking your category")}: {data.myCategories.map((id) => tx(seekLabel(id))).join(", ")}
      </h2>
      {data.seekingMe.length === 0 ? (
        <p className="mt-2 text-[15px] text-mut">
          {filters && (filters.asset || filters.state || filters.size) ? tx("No projects match these filters.") : tx("No approved projects are seeking your category right now.")}
        </p>
      ) : null}
      <ul className="mt-2">
        {data.seekingMe.map((project) => (
          <li key={project.id} className="border-b border-line py-3 last:border-0">
            <p className="text-[16px] font-semibold"><Link href={`/projects/${project.id}`} className="underline decoration-brass underline-offset-2 hover:text-forest">{project.name}</Link></p>
            <p className="text-[15px] text-mut">
              <Link href={`/members/${project.user.id}`} className="text-ink underline decoration-line">
                {project.user.name}
              </Link>
              {project.user.org ? ` · ${project.user.org}` : ""} · {tx(project.asset)} · {project.location} · {project.year}
            </p>
            <ProjectFacts category={project.matchedCategory ?? data.myCategory} project={project} />
            {project.status ? (
              <p className="mt-1 text-[14px] text-mut">
                {tx("Contact request")}: {tx(statusWord(project.status))}
              </p>
            ) : (
              <div className="mt-2">
                <ReachOut projects={[{ id: project.id, name: project.name, status: "" }]} back="/feed" label={tx("Contact about this project")} align="start" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const circleShared = data.circleShared.length ? (
    <section className={box} data-testid="ledger-circle-projects" key="circle">
      <h2 className={h2}>{tx("Shared by My Circle")}</h2>
      <ul className="mt-2">
        {data.circleShared.map((project) => (
          <li key={project.id} className="border-b border-line py-3 last:border-0">
            <p className="text-[16px] font-semibold">
              <Link href={`/projects/${project.id}`} className="underline decoration-brass underline-offset-2 hover:text-forest">{project.name}</Link> <span className="font-normal text-forest">{formatProjectValue(project.valueLabel)}</span>
            </p>
            <p className="text-[15px] text-mut">
              {project.user.name}{project.user.org ? ` · ${project.user.org}` : ""} · {tx(project.asset)} · {project.street ? `${project.street}, ` : ""}
              {project.location} · {project.year}
            </p>
            {project.summary ? <p className="mt-1 text-[15px] text-ink">{project.summary}</p> : null}
            <Link href={`/projects/${project.id}`} className="mt-1 inline-block text-[15px] font-semibold text-forest underline decoration-brass">
              {tx("Open the project")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const order = ownerFirst ? [mine, outreach, seekingMe, circleShared] : [seekingMe, outreach, mine, circleShared];
  return (
    <div className="mb-6 grid gap-4" data-testid="ledger-projects">
      {order}
    </div>
  );
}
