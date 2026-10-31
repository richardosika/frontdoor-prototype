import Link from "next/link";
import { JoinEntryBanner } from "@/components/already-signed-in";
import { Banner } from "@/components/banner";
import { GettingStarted } from "@/components/getting-started";
import { ReviewTracker } from "@/components/review-tracker";
import { LedgerProjects } from "@/components/ledger-projects";
import { loadLedgerProjects, loadMyCircle } from "@/lib/ledger-projects";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/current-user";
import { gettingStarted, isDeveloperRole, readSlimFilters } from "@/lib/member-reach";
import { parseSeeking } from "@/lib/project-contact";
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
  const t = translator(await currentLocale());
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
    loadLedgerProjects(user, { filters }),
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
  });

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
        <GettingStarted items={checklist} />
        {note}
        <LedgerProjects data={ledgerProjects} role={user.role} filters={filters} />
        <div className="mt-4 space-y-4 lg:hidden">
          {circlePanel}
        </div>
      </section>
      <aside className="hidden space-y-4 lg:block">
        {circlePanel}
      </aside>
    </div>
  );
}
