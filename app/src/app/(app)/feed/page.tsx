import Link from "next/link";
import { requestConnection } from "@/actions/social";
import { roleLabel, roleShort } from "@/lib/roles";
import { JoinEntryBanner } from "@/components/already-signed-in";
import { Banner } from "@/components/banner";
import { GettingStarted } from "@/components/getting-started";
import { ReviewTracker } from "@/components/review-tracker";
import { LedgerProjects } from "@/components/ledger-projects";
import { loadLedgerProjects, loadMyCircle } from "@/lib/ledger-projects";
import { loadMyWork, loadResults, loadSidePanels } from "@/lib/my-work";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/current-user";
import { gettingStarted, isDeveloperRole, readSlimFilters } from "@/lib/member-reach";
import { parseSeeking, seekLabel } from "@/lib/project-contact";
import { prisma } from "@/lib/prisma";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

/**
 * The Ledger. No open social feed (#26): members see their own projects and outreach, and only projects seeking
 * their category or shared by their circle. Developers see their projects and who they are looking for (#21).
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const locale = await currentLocale();
  const t = translator(locale);
  const tx = await serverTx();
  const params = await searchParams;
  const developer = isDeveloperRole(user.role);
  const filters = developer ? undefined : readSlimFilters(params);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const submittedId = typeof params.submitted === "string" ? params.submitted : "";

  const [application, outreachSent, ledgerProjects, circle] = await Promise.all([
    prisma.application.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.projectContact.count({ where: { fromId: user.id } }),
    loadLedgerProjects(user, { filters, limit: isDeveloperRole(user.role) ? 6 : 8 }),
    loadMyCircle(user),
  ]);
  const mine = ledgerProjects.myProjects;
  const submitted = submittedId ? mine.find((project) => project.id === submittedId) : undefined;
  const firstName = user.name.split(" ")[0] || user.name;
  const checklist = gettingStarted({
    role: user.role,
    profileDone: user.markets.trim().length > 1 && (user.lookingFor.trim().length > 1 || user.offering.trim().length > 1 || user.bio.trim().length > 1),
    ndaAccepted: Boolean(user.ndaAcceptedAt),
    projectCount: mine.length,
    seekingSet: mine.some((project) => parseSeeking(project.seeking).length > 0),
    approvedProject: mine.some((project) => project.reviewStatus === "APPROVED" && parseSeeking(project.seeking).length > 0),
    projectPending: mine.some((project) => project.reviewStatus === "PENDING_REVIEW" || project.reviewStatus === "NEEDS_INFO"),
    outreachSent,
    hasPhoto: Boolean(user.photoId),
    hasCredential: Boolean(user.licenses?.trim()),
    noMatches: !isDeveloperRole(user.role) && ledgerProjects.allSeeking.length === 0,
  });

  const myWork = isDeveloperRole(user.role) ? null : await loadMyWork(user, ledgerProjects.newForYou);
  const side = myWork ? await loadSidePanels(user, myWork.active) : null;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "America/New_York" });
  const dayFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "America/New_York" });
  const panel = "rounded border border-line bg-paper p-5";
  const panelH = "text-[12px] font-semibold uppercase tracking-[0.16em] text-brass";
  // #45: under My Circle for everyone but developers.
  const sidePanels = side ? (
    <>
      <div className={panel} data-testid="ledger-viewed-you">
        <h2 className={panelH}>{tx("Who viewed your profile")}</h2>
        <p className="mt-1 font-serif text-[18px] leading-snug text-forest">
          {side.viewers.length} {tx(side.viewers.length === 1 ? "developer viewed your profile this week" : "developers viewed your profile this week")}
        </p>
        <div className="mt-3" data-testid="viewed-chart" aria-label={tx("Profile views, last 7 days")}>
          <div className="flex h-16 items-end gap-1.5">
            {side.chart.map((d) => (
              <i key={d.day} title={`${d.day}: ${d.count}`} data-count={d.count} className={`block flex-1 rounded-t-sm ${d.count ? "bg-brass" : "bg-line"}`} style={{ height: `${Math.max(12, (d.count / Math.max(1, ...side.chart.map((x) => x.count))) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-center text-[11px] text-mut">
            {side.chart.map((d) => <span key={d.day} className="flex-1">{weekday.format(d.date)}</span>)}
          </div>
        </div>
        <ul className="mt-2">
          {side.viewers.slice(0, 3).map((v) => {
            const ago = Math.max(0, Math.floor((Date.now() - v.lastViewed.getTime()) / 86400000));
            return (
              <li key={v.id} className="border-t border-line py-2 first:border-t-0" data-testid="viewer-row">
                <Link href={`/members/${v.id}`} className="text-[15px] font-semibold text-forest underline decoration-line [overflow-wrap:anywhere]">{v.name}</Link>
                <span className="block text-[13px] text-mut [overflow-wrap:anywhere]">{[v.org, v.location].filter(Boolean).join(" · ")}</span>
                <span className="mt-1 inline-block rounded-full bg-brass-soft px-2 py-0.5 text-[12px] text-forest">{tx(roleShort(roleLabel(v.role)))}</span>
                <span className="block text-[13px] text-mut">{ago === 0 ? tx("Viewed today") : ago === 1 ? tx("Viewed 1 day ago") : tx("Viewed {n} days ago").replace("{n}", String(ago))}</span>
              </li>
            );
          })}
        </ul>
        <Link href="/viewers" className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-forest underline decoration-brass" data-testid="see-all-viewers">{tx("See all viewers")} →</Link>
        <p className="text-[12px] text-mut">{tx("Only approved members are shown.")}</p>
      </div>
      <div className={panel} data-testid="ledger-people">
        <h2 className={panelH}>{tx("People you may want to work with")}</h2>
        <p className="mt-1 text-[13px] text-mut">{tx("Approved members on your projects")}</p>
        {side.people.length === 0 ? <p className="mt-2 text-[14px] text-mut">{tx("No one new on your projects yet.")}</p> : null}
        <ul className="mt-1">
          {side.people.map((p) => (
            <li key={p.id} className="flex items-start gap-3 border-t border-line py-2 first:border-t-0" data-testid="people-row">
              <div className="min-w-0 flex-1">
                <Link href={`/members/${p.id}`} className="text-[15px] font-semibold text-forest underline decoration-line [overflow-wrap:anywhere]">{p.name}</Link>
                {p.org ? <span className="block text-[13px] text-mut [overflow-wrap:anywhere]">{p.org}</span> : null}
                <span className="mt-1 inline-block rounded-full bg-brass-soft px-2 py-0.5 text-[12px] text-forest">{tx(roleShort(roleLabel(p.role)))}</span>
                {p.projectName ? <span className="block text-[13px] italic text-ink [overflow-wrap:anywhere]">{tx("On {project}").replace("{project}", p.projectName)}</span> : null}
              </div>
              <form action={requestConnection}>
                <input type="hidden" name="toId" value={p.id} />
                <button type="submit" className="min-h-11 rounded-sm border border-forest px-3 text-[14px] font-semibold text-forest" data-testid="people-connect">{tx("Connect")}</button>
              </form>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-mut">{tx("Suggestions come only from shared projects.")}</p>
      </div>
      <div className={panel} data-testid="ledger-upcoming">
        <h2 className={panelH}>{tx("Upcoming")}</h2>
        {side.upcoming.length === 0 ? <p className="mt-1 text-[14px] text-mut">{tx("Nothing scheduled on your active projects.")}</p> : null}
        <ul className="mt-1">
          {side.upcoming.map((u) => (
            <li key={`${u.projectId}-${u.title}`} className="border-t border-line py-2 first:border-t-0">
              <Link href={u.roomId ? `/deals/${u.roomId}/room` : `/projects/${u.projectId}`} className="text-[15px] font-semibold text-forest underline decoration-line [overflow-wrap:anywhere]">{u.title}</Link>
              <span className="block text-[13px] text-mut [overflow-wrap:anywhere]">{u.projectName}{u.dueDate ? ` · ${dayFmt.format(u.dueDate)}` : ""}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={panel} data-testid="ledger-unread">
        <h2 className={panelH}>{tx("Unread messages")}</h2>
        {side.unread.length === 0 ? <p className="mt-1 text-[14px] text-mut">{tx("You are all caught up.")}</p> : null}
        <ul className="mt-1">
          {side.unread.map((m) => (
            <li key={m.id} className="border-t border-line py-2 first:border-t-0">
              <p className="text-[15px] font-semibold text-forest [overflow-wrap:anywhere]">{m.sender.name}</p>
              <p className="line-clamp-2 text-[14px] text-ink [overflow-wrap:anywhere]">{m.body}</p>
              <Link href={`/messages/${m.conversationId}`} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-forest underline decoration-brass">{tx("Reply")} ›</Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  ) : null;
  const circlePanel = (
    <div className="rounded border border-line bg-paper p-5" data-testid="ledger-circle">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("My Circle")}</h2>
      <p className="mt-1 text-[14px] text-mut">{circle.length === 1 ? t("ledger.connection") : t("ledger.connections", { count: circle.length })}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink">{tx("People connected to you through a project.")}</p>
      <Link href={developer ? "/deals#my-circle" : "/network"} className="mt-3 inline-block text-[14px] font-semibold text-forest underline decoration-brass">
        {tx("Open My Circle")}
      </Link>
    </div>
  );
  const note = application?.reviewerNote ? (
    <p className="mb-4 rounded border border-line bg-paper px-3 py-2 text-sm text-ink">
      <b>{t("ledger.noteFrom", { owner: BRAND.owner })} </b>
      {application.reviewerNote}
    </p>
  ) : null;

  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 px-4 pb-8 pt-4 md:pt-8 lg:grid-cols-[minmax(0,800px)_340px] lg:px-10">
      <section className="min-w-0">
        <JoinEntryBanner name={user.name} />
        <header className="mb-6 border-b-[3px] border-double border-brass pb-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-[40px] font-normal italic leading-tight tracking-wide md:text-[52px]">{t("ledger.title")}</h1>
        </header>
        <Banner error={error ? tx(error) : undefined} notice={notice ? tx(notice) : undefined} />
        {submitted ? (
          <section className="relative mb-6 rounded border border-brass bg-brass-soft p-4 pr-12 md:p-5 md:pr-14" data-testid="submitted-thanks">
            <Link href="/feed" aria-label={tx("Dismiss")} className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-[22px] text-forest" data-testid="submitted-dismiss">
              ×
            </Link>
            <h2 className="font-serif text-[24px] leading-tight text-forest md:text-[26px]">{tx("Thank you, {name}.").replace("{name}", firstName)}</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-ink">
              {tx("{project} is with our team for review. We'll send you an alert and an email as soon as it's approved or if we need anything else.").replace("{project}", submitted.name)}
            </p>
            <div className="mt-3">
              <ReviewTracker status={submitted.reviewStatus} />
            </div>
            <Link href={`/projects/${submitted.id}`} className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-forest underline decoration-brass">
              {tx("View project")} ›
            </Link>
          </section>
        ) : null}
        {/* #44 expanded: for everyone but developers, Getting started becomes a thin bar at the bottom once complete. */}
        <GettingStarted items={checklist} category={ledgerProjects.myCategories.map((id) => tx(seekLabel(id))).join(" / ")} />
        {note}
        <LedgerProjects data={ledgerProjects} role={user.role} filters={filters} myWork={myWork}
          results={isDeveloperRole(user.role) ? null : await loadResults(user, ledgerProjects.allSeeking)}
        />
        {!isDeveloperRole(user.role) && checklist.every((item) => item.done) ? (
          <p className="mb-4 rounded border border-line bg-paper px-4 py-2 text-[14px] text-mut" data-testid="getting-started-done">✓ {tx("Getting started is complete.")} ({checklist.length} / {checklist.length})
            {checklist.find((item) => item.note) ? <span className="block text-forest" data-testid="start-note-reach">{tx(checklist.find((item) => item.note)!.note!).replace("{category}", ledgerProjects.myCategories.map((id) => tx(seekLabel(id))).join(" / ")).replace(/\bseeking a ([AEIOU])/, "seeking an $1")}</span> : null}
          </p>
        ) : null}
        <div className="mt-4 space-y-4 lg:hidden">
          {circlePanel}
          {sidePanels}
        </div>
      </section>
      <aside className="hidden space-y-4 lg:block">
        {circlePanel}
        {sidePanels}
      </aside>
    </div>
  );
}
