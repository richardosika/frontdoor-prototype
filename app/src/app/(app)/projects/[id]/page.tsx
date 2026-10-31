import Link from "next/link";
import { ReachOut, StatusPill } from "@/components/reach-out";
import { ProjectFacts } from "@/components/project-facts";
import { ProjectFactsFields } from "@/components/project-facts-fields";
import { factsFor } from "@/lib/project-facts";
import { memberLine } from "@/lib/member-line";
import { contactAboutProject, respondProjectContact, setProjectSharing, updateProjectSeeking, updateProjectFacts } from "@/actions/projects";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { ProjectDocuments } from "@/components/project-documents";
import { ReviewChip } from "@/components/project-form";
import { ReviewTracker } from "@/components/review-tracker";
import { btn, btnOutline, card, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { serverTx } from "@/lib/i18n/server";
import { eligibleForDirectory } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { circleIds, projectAudience } from "@/lib/project-contact-db";
import { projectPageView } from "@/lib/project-page";
import { SEEK_CATEGORIES, fixRoleTypos, canContactAboutProject, categoryMemberWhere, memberCategories, memberInCategory, formatProjectValue, parseSeeking, projectLocation, seekLabel } from "@/lib/project-contact";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

const h2 = "mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";
const box = `${card} mt-4 p-5 sm:p-6`;

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const tx = await serverTx();
  const project = await prisma.trackProject.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, initials: true, photoId: true, org: true, role: true, status: true } },
      documents: { select: { id: true, title: true, fileName: true, sizeBytes: true, version: true, updatedAt: true, contentType: true }, orderBy: { createdAt: "asc" } },
      deals: { select: { id: true, title: true } },
      contacts: {
        include: {
          from: { select: { id: true, name: true, initials: true, photoId: true, role: true, org: true } },
          to: { select: { id: true, name: true, initials: true, photoId: true, role: true, org: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!project || (project.user.status !== "ACTIVE" && !viewer.isAdmin)) return <ProjectNotAvailable tx={tx} />;
  const ownerCircle = await circleIds(project.userId);
  const view = projectPageView(project, { id: viewer.id, isAdmin: viewer.isAdmin, inOwnerCircle: ownerCircle.has(viewer.id), role: viewer.role, extraCategories: viewer.extraCategories });
  // #25: not sought and not in the owner's circle: nothing about the project is shown.
  if (view === "hidden") return <ProjectNotAvailable tx={tx} />;
  const isOwner = view === "owner";
  const seeking = parseSeeking(project.seeking);
  const back = `/projects/${project.id}`;
  const audience = isOwner || viewer.isAdmin ? [] : await projectAudience(project.id);
  const docsVisible = isOwner || viewer.isAdmin || audience.includes(viewer.id);
  const photos = project.documents.filter((doc) => doc.contentType.startsWith("image/"));
  const files = project.documents.filter((doc) => !doc.contentType.startsWith("image/"));
  const full = view === "owner" || view === "full";
  const myContact = project.contacts.find((c) => c.fromId === viewer.id || c.toId === viewer.id);
  const canContact = !isOwner && canContactAboutProject({ project, from: { id: viewer.id, role: viewer.role, extraCategories: viewer.extraCategories }, to: { id: project.userId, role: project.user.role } }).ok;
  // #42: the first of my categories this project seeks (or my primary one).
  const myCategory = memberCategories(viewer).find((id) => seeking.includes(id)) ?? memberCategories(viewer)[0] ?? null;

  const matches = isOwner && project.reviewStatus === "APPROVED" && seeking.length
    ? (
        await prisma.user.findMany({
          where: { status: "ACTIVE", id: { not: project.userId }, ...(categoryMemberWhere(seeking) as object) },
          select: { id: true, name: true, initials: true, photoId: true, role: true, extraCategories: true, org: true, location: true, status: true, paymentStatus: true },
          orderBy: { name: "asc" },
          take: 24,
        })
      ).filter(eligibleForDirectory).filter((member) => seeking.some((id) => memberInCategory(member, id)))
    : [];
  const ownDeals = isOwner ? await prisma.deal.findMany({ where: { sponsorId: viewer.id }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-3 md:px-8 md:pt-6" data-testid={`project-page-${view}`}>
      <Link href={isOwner ? "/feed" : `/members/${project.userId}`} className="inline-flex min-h-11 items-center font-sans text-[15px] text-forest underline decoration-brass">
        ‹ {isOwner ? tx("Ledger") : project.user.name}
      </Link>
      {query.error || query.notice ? (
        <div className="mt-2">
          <Banner error={query.error ? tx(query.error) : undefined} notice={query.notice ? tx(query.notice) : undefined} />
        </div>
      ) : null}

      {isOwner && project.reviewStatus !== "APPROVED" ? (
        <section className={`${box} border-brass bg-brass-soft`} data-testid="project-review-status">
          <h2 className={h2}>{tx("Review status")}</h2>
          <ReviewTracker status={project.reviewStatus} />
          <p className="mt-3 text-[16px] leading-relaxed text-ink">
            {project.reviewStatus === "PENDING_REVIEW"
              ? tx("Our team is reviewing this project. Other members cannot see it until it is approved. We'll send you an alert and an email as soon as it's approved or if we need anything else.")
              : project.reviewStatus === "NEEDS_INFO"
                ? tx("Our team needs a little more information. Edit the project and resubmit it.")
                : tx("This project was not approved.")}
          </p>
        </section>
      ) : null}
      <section className={box} data-testid="project-overview">
        <div className="flex flex-wrap items-center gap-2">
          <ReviewChip status={project.reviewStatus} />
          <span className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-mut">{tx(project.asset)}</span>
        </div>
        <h1 className="mt-3 font-serif text-[30px] leading-tight text-forest sm:text-[36px]">{project.name}</h1>
        <p className="mt-1 text-[17px] text-ink">
          {full && project.street ? `${project.street}, ` : ""}
          {projectLocation(project) || project.location}
        </p>
        <Link href={`/members/${project.userId}`} className="mt-3 flex items-center gap-3">
          <Avatar initials={project.user.initials} photoId={project.user.photoId} />
          <span>
            <span className="block font-semibold text-forest">{project.user.name}</span>
            <span className="block text-[14px] text-mut">{tx(roleLabel(project.user.role))} · {project.user.org}</span>
          </span>
        </Link>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[15px] sm:grid-cols-4">
          <Fact label={tx("Asset class")} value={tx(project.asset)} />
          <Fact label={tx("Year")} value={String(project.year)} />
          <Fact label={tx("Value")} value={full ? formatProjectValue(project.valueLabel) : tx("Shared after contact")} />
          <Fact label={tx("Owner's role")} value={tx(fixRoleTypos(project.role)) || "—"} />
        </dl>
        {isOwner || viewer.isAdmin ? (
          <ProjectFacts category={null} project={project} all />
        ) : (
          <div data-testid="project-facts-for-you">
            {factsFor(myCategory, project).length ? (
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-brass">{tx("What matters for you")}</p>
            ) : null}
            <ProjectFacts category={myCategory} project={project} valueVisible={full} />
          </div>
        )}
        {isOwner ? (
          <details className="mt-4 rounded border border-line bg-cream p-3" data-testid="project-facts-edit">
            <summary className="cursor-pointer text-[15px] font-semibold text-forest">{tx("Edit details for the members you're seeking")}</summary>
            <form action={updateProjectFacts} className="mt-2 grid gap-3">
              <input type="hidden" name="projectId" value={project.id} />
              <ProjectFactsFields roleFacts={project.roleFacts} />
              <button className={`${btn} justify-self-start`} type="submit">{tx("Save details")}</button>
            </form>
          </details>
        ) : null}
        {full && project.summary ? (
          <div className="mt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-mut">{tx("Notes")}</p>
            <p className="mt-1 whitespace-pre-line text-[16px] leading-relaxed text-ink">{project.summary}</p>
          </div>
        ) : null}
        {!full ? (
          <p className="mt-4 rounded border border-line bg-cream px-3 py-2 text-[15px] text-ink" data-testid="project-basic-note">
            {tx("The street address, value, notes, and documents are shared with the owner's circle and with members whose contact the owner accepts.")}
          </p>
        ) : null}
      </section>

      <section className={box} data-testid="project-seeking">
        <h2 className={h2}>{isOwner ? tx("What you're looking for") : tx("What this project is looking for")}</h2>
        {isOwner ? (
          <form action={updateProjectSeeking} className="grid gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="back" value={back} />
            <div className="grid gap-2 sm:grid-cols-2">
              {SEEK_CATEGORIES.map((item) => (
                <label key={item.id} className="flex min-h-11 items-center gap-2 rounded-sm border border-line bg-paper px-3 text-[15px]">
                  <input type="checkbox" name="seeking" value={item.id} defaultChecked={seeking.includes(item.id)} className="h-5 w-5" />
                  {tx(item.label)}
                </label>
              ))}
            </div>
            <button className={`${btn} justify-self-start`} type="submit">{tx("Save")}</button>
          </form>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {seeking.map((cat) => (
                <li key={cat} className={`rounded-sm border px-3 py-1.5 text-[15px] ${cat === myCategory ? "border-forest bg-forest text-paper" : "border-brass/60 bg-cream text-forest"}`}>
                  {tx(seekLabel(cat))}
                </li>
              ))}
            </ul>
            <div className="mt-4" data-testid="project-contact-area">
              {myContact ? (
                <p className="text-[15px] text-ink">{tx("Contact request")}: <b>{tx(statusLabel(myContact.status))}</b></p>
              ) : canContact ? (
                <form action={contactAboutProject} className="grid gap-2">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="back" value={back} />
                  <textarea name="note" maxLength={500} rows={3} className={`${field} text-[16px]`} placeholder={tx("Short note to the owner (optional)")} />
                  <button className={`${btn} justify-self-start`} type="submit" data-testid="project-contact-button">{tx("Contact about this project")}</button>
                </form>
              ) : (
                <p className="text-[15px] text-mut" data-testid="project-no-contact">{tx("This project is not seeking your category, so contact is not open.")}</p>
              )}
            </div>
          </>
        )}
      </section>

      {isOwner ? (
        <section className={box} data-testid="project-interest">
          <h2 className={h2}>{tx("Who's interested")}</h2>
          {project.contacts.length === 0 ? <p className="text-[15px] text-mut">{tx("No contact requests yet.")}</p> : null}
          <ul className="grid gap-2">
            {project.contacts.map((c) => {
              const incoming = c.toId === viewer.id;
              const other = incoming ? c.from : c.to;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded border border-line bg-paper p-3">
                  <Avatar initials={other.initials} photoId={other.photoId} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/members/${other.id}`} className="font-semibold text-forest underline decoration-brass">{other.name}</Link>
                    <p className="text-[14px] text-mut">
                      {memberLine(other, tx)}
                    </p>
                    <p className="text-[13px] text-mut">
                      {incoming ? tx("Received") : tx("Sent")} · {tx(statusLabel(c.status))}
                    </p>
                    {c.note ? <p className="mt-1 text-[15px] text-ink">“{c.note}”</p> : null}
                  </div>
                  {incoming && c.status === "PENDING" ? (
                    <div className="flex gap-2">
                      {(["ACCEPTED", "DECLINED"] as const).map((decision) => (
                        <form key={decision} action={respondProjectContact}>
                          <input type="hidden" name="contactId" value={c.id} />
                          <input type="hidden" name="decision" value={decision} />
                          <input type="hidden" name="back" value={back} />
                          <button className={decision === "ACCEPTED" ? btn : btnOutline} type="submit">{decision === "ACCEPTED" ? tx("Accept") : tx("Decline")}</button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {isOwner && matches.length ? (
        <section className={box} data-testid="project-matches">
          <h2 className={h2}>{tx("Matching members")}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {matches.map((m) => {
              const already = project.contacts.some((c) => c.fromId === m.id || c.toId === m.id);
              return (
                <li key={m.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded border border-line bg-paper p-3">
                  <Avatar initials={m.initials} photoId={m.photoId} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/members/${m.id}`} className="font-semibold text-forest underline decoration-brass">{m.name}</Link>
                    <p className="text-[14px] text-mut" data-testid="member-line">{memberLine(m, tx)}</p>
                  </div>
                  {already ? (
                    <StatusPill status={project.contacts.find((c) => c.fromId === m.id || c.toId === m.id)?.status ?? "PENDING"} />
                  ) : project.reviewStatus === "APPROVED" ? (
                    <ReachOut projects={[{ id: project.id, name: project.name, status: "" }]} toId={m.id} back={back} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {docsVisible || isOwner ? (
        <section className={box} data-testid="project-media">
          <h2 className={h2}>{tx("Documents & photos")}</h2>
          {photos.length ? (
            <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="project-photos">
              {photos.map((photo) => (
                <li key={photo.id} className="overflow-hidden rounded border border-line bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/project-documents/${photo.id}`} alt={photo.title} className="block aspect-[4/3] w-full object-cover" />
                  <p className="px-2 py-1.5 text-[14px] text-ink">{photo.title}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <ProjectDocuments
            projectId={project.id}
            documents={isOwner ? project.documents : files}
            isOwner={isOwner}
            approved={project.reviewStatus === "APPROVED"}
            deals={ownDeals}
            linkedDealId={project.deals[0]?.id ?? ""}
            back={back}
          />
        </section>
      ) : null}

      {isOwner ? (
        <section className={box} data-testid="project-sharing">
          <h2 className={h2}>{tx("Sharing")}</h2>
          <form action={setProjectSharing} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="back" value={back} />
            <input type="hidden" name="share" value={project.shareWithCircle ? "" : "on"} />
            <span className="text-[16px] text-ink">
              {tx("Share with My Circle")}: <b>{project.shareWithCircle ? tx("On") : tx("Off")}</b>
            </span>
            <button className={btnOutline} type="submit">{project.shareWithCircle ? tx("Stop sharing") : tx("Share with My Circle")}</button>
          </form>
          <p className="mt-3 text-[15px] text-ink">
            {tx("Linked deal room")}:{" "}
            {project.deals[0] ? (
              <Link href={`/deals/${project.deals[0].id}`} className="font-semibold underline decoration-brass">{project.deals[0].title}</Link>
            ) : (
              <span className="text-mut">{tx("None. Link one under Documents.")}</span>
            )}
          </p>
        </section>
      ) : project.deals[0] && full ? (
        <section className={box}>
          <h2 className={h2}>{tx("Linked deal room")}</h2>
          <Link href={`/deals/${project.deals[0].id}`} className="font-semibold underline decoration-brass">{project.deals[0].title}</Link>
        </section>
      ) : null}
    </div>
  );
}

function statusLabel(status: string): string {
  return status === "ACCEPTED" ? "Accepted" : status === "DECLINED" ? "Declined" : "Pending";
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold uppercase tracking-wider text-mut">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  );
}

function ProjectNotAvailable({ tx }: { tx: (text: string) => string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8 md:py-16" data-testid="project-not-available">
      <section className={`${card} p-6 text-center sm:p-10`}>
        <h1 className="font-serif text-[30px] text-forest sm:text-[36px]">{tx("Project not available")}</h1>
        <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-ink">
          {tx("This project is not open to you. Projects are shown only to members in the categories they are seeking and to the owner's circle.")}
        </p>
        <Link href="/feed" className={`${btn} mt-6`}>
          {tx("Back to the Ledger")}
        </Link>
      </section>
    </div>
  );
}
