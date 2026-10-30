import Link from "next/link";
import { addContactToCircle, contactAboutProject, respondProjectContact } from "@/actions/projects";
import { ProjectForm, ReviewChip } from "@/components/project-form";
import { btn, btnOutline, field } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import type { loadLedgerProjects } from "@/lib/ledger-projects";
import { seekLabel } from "@/lib/project-contact";
import { roleLabel, roleShort } from "@/lib/roles";

type Data = Awaited<ReturnType<typeof loadLedgerProjects>>;

const h2 = "text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";
const box = "rounded border border-line bg-paper p-4 md:p-5";

function statusWord(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return "Sent";
}

export async function LedgerProjects({ data, role }: { data: Data; role: string }) {
  const tx = await serverTx();
  const ownerFirst = role === "DEVELOPER" || data.myProjects.length > 0;

  const mine = (
    <section className={box} data-testid="ledger-my-projects" key="mine">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2}>{tx("My projects")}</h2>
      </div>
      {data.myProjects.length === 0 ? <p className="mt-2 text-[16px] text-mut">{tx("No projects listed yet.")}</p> : null}
      <ul className="mt-2">
        {data.myProjects.map((project) => (
          <li key={project.id} className="border-b border-line py-3 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-semibold">{project.name}</span>
              <ReviewChip status={project.reviewStatus} />
            </div>
            <p className="text-[15px] text-mut">
              {tx(project.asset)} · {project.location} · {project.year}
            </p>
            {project.seekingIds.length ? (
              <p className="mt-1 text-[15px] text-ink">
                <span className="font-semibold">{tx("Seeking")}:</span> {project.seekingIds.map((id) => tx(seekLabel(id))).join(", ")}
              </p>
            ) : (
              <p className="mt-1 text-[15px] text-mut">{tx("Not seeking anyone. Members cannot contact you about this project.")}</p>
            )}
            {project.reviewStatus === "NEEDS_INFO" ? (
              <div className="mt-2 rounded border border-brass bg-cream px-3 py-2 text-[15px] text-ink">
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
            {project.reviewStatus === "PENDING_REVIEW" ? (
              <p className="mt-1 text-[14px] text-mut">{tx("Pending review. Other members cannot see this project until it is approved.")}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <details className="mt-3" data-testid="ledger-add-project">
        <summary className={`${btn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{tx("Add a project")}</summary>
        <div className="mt-4 rounded border border-line bg-cream p-4 md:p-5">
          <ProjectForm back="/feed" />
        </div>
      </details>
    </section>
  );

  const approvedWithSeeking = data.myProjects.filter((project) => project.lookingFor.length > 0);
  const lookingFor = approvedWithSeeking.length ? (
    <section className={box} data-testid="ledger-looking-for" key="looking">
      <h2 className={h2}>{tx("Who I'm looking for")}</h2>
      {approvedWithSeeking.map((project) => (
        <div key={project.id} className="mt-3">
          <p className="text-[16px] font-semibold">{project.name}</p>
          {project.lookingFor.map((group) => (
            <div key={group.category} className="mt-2 border-l-2 border-brass pl-3">
              <p className="text-[15px] font-semibold text-forest">{tx(seekLabel(group.category))}</p>
              {group.members.length === 0 ? <p className="text-[14px] text-mut">{tx("No matching members yet.")}</p> : null}
              <ul>
                {group.members.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-2 py-1.5">
                    <Link href={`/members/${member.id}`} className="min-w-0 flex-1 text-[15px]">
                      <span className="font-semibold">{member.name}</span>
                      <span className="text-mut"> · {tx(roleShort(roleLabel(member.role)))} · {member.org}</span>
                    </Link>
                    {member.status ? (
                      <span className="text-[14px] text-mut">{tx(statusWord(member.status))}</span>
                    ) : (
                      <form action={contactAboutProject}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="toId" value={member.id} />
                        <input type="hidden" name="back" value="/feed" />
                        <button className={btnOutline} type="submit">
                          {tx("Reach out")}
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </section>
  ) : null;

  const outreach = (
    <section className={box} data-testid="ledger-outreach" key="outreach">
      <h2 className={h2}>{tx("Outreach")}</h2>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[15px] font-semibold">{tx("Requests received")}</p>
          {data.received.length === 0 ? <p className="text-[15px] text-mut">{tx("None yet.")}</p> : null}
          <ul>
            {data.received.map((row) => (
              <li key={row.id} className="border-b border-line py-2 last:border-0">
                <p className="text-[15px]">
                  <Link href={`/members/${row.from.id}`} className="font-semibold">
                    {row.from.name}
                  </Link>{" "}
                  <span className="text-mut">· {row.project.name}</span>
                </p>
                {row.note ? <p className="text-[14px] text-ink">{row.note}</p> : null}
                {row.status === "PENDING" ? (
                  <div className="mt-1 flex gap-2">
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
                  </div>
                ) : (
                  <p className="text-[14px] text-mut">{tx(statusWord(row.status))}</p>
                )}
                {row.status === "ACCEPTED" && row.ownerIsMe && !row.inCircle ? (
                  <form action={addContactToCircle} className="mt-1">
                    <input type="hidden" name="contactId" value={row.id} />
                    <button className={btnOutline} type="submit">
                      {tx("Add to My Circle")}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[15px] font-semibold">{tx("Requests sent")}</p>
          {data.sent.length === 0 ? <p className="text-[15px] text-mut">{tx("None yet.")}</p> : null}
          <ul>
            {data.sent.map((row) => (
              <li key={row.id} className="border-b border-line py-2 last:border-0">
                <p className="text-[15px]">
                  <Link href={`/members/${row.to.id}`} className="font-semibold">
                    {row.to.name}
                  </Link>{" "}
                  <span className="text-mut">· {row.project.name}</span>
                </p>
                <p className="text-[14px] text-mut">{tx(statusWord(row.status))}</p>
                {row.status === "ACCEPTED" && row.project.userId === row.fromId && !data.acceptedSent.find((item) => item.id === row.id)?.inCircle ? (
                  <form action={addContactToCircle} className="mt-1">
                    <input type="hidden" name="contactId" value={row.id} />
                    <button className={btnOutline} type="submit">
                      {tx("Add to My Circle")}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  const seekingMe = data.myCategory ? (
    <section id="ledger-seeking" className={`${box} scroll-mt-20`} data-testid="ledger-seeking-me" key="seeking">
      <h2 className={h2}>
        {tx("Projects seeking your category")}: {tx(seekLabel(data.myCategory))}
      </h2>
      {data.seekingMe.length === 0 ? <p className="mt-2 text-[15px] text-mut">{tx("No approved projects are seeking your category right now.")}</p> : null}
      <ul className="mt-2">
        {data.seekingMe.map((project) => (
          <li key={project.id} className="border-b border-line py-3 last:border-0">
            <p className="text-[16px] font-semibold">{project.name}</p>
            <p className="text-[15px] text-mut">
              <Link href={`/members/${project.user.id}`} className="text-ink underline decoration-line">
                {project.user.name}
              </Link>{" "}
              · {tx(project.asset)} · {project.location} · {project.year}
            </p>
            {project.status ? (
              <p className="mt-1 text-[14px] text-mut">
                {tx("Contact request")}: {tx(statusWord(project.status))}
              </p>
            ) : (
              <form action={contactAboutProject} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="back" value="/feed" />
                <input name="note" className={`${field} text-[16px]`} placeholder={tx("A short note. It stays inside Private Floor.")} />
                <button className={btn} type="submit">
                  {tx("Contact about this project")}
                </button>
              </form>
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
              {project.name} <span className="font-serif font-normal text-forest">{project.valueLabel}</span>
            </p>
            <p className="text-[15px] text-mut">
              {project.user.name} · {tx(project.asset)} · {project.street ? `${project.street}, ` : ""}
              {project.location} · {project.year}
            </p>
            {project.summary ? <p className="mt-1 text-[15px] text-ink">{project.summary}</p> : null}
            <Link href={`/members/${project.user.id}#project-${project.id}`} className="mt-1 inline-block text-[15px] font-semibold text-forest underline decoration-brass">
              {tx("Open the project")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const order = ownerFirst ? [mine, lookingFor, outreach, seekingMe, circleShared] : [seekingMe, outreach, mine, lookingFor, circleShared];
  return (
    <div className="mb-6 grid gap-4" data-testid="ledger-projects">
      {order}
    </div>
  );
}
