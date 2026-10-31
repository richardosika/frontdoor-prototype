import Link from "next/link";
import { JoinEntryBanner } from "@/components/already-signed-in";
import { Banner } from "@/components/banner";
import { ColleagueInvite } from "@/components/colleague-invite";
import { GettingStarted } from "@/components/getting-started";
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

  const [application, ownedCodes, outreachSent, ledgerProjects, circle] = await Promise.all([
    prisma.application.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.inviteCode.findMany({ where: { createdById: user.id } }),
    prisma.projectContact.count({ where: { fromId: user.id } }),
    loadLedgerProjects(user, { filters }),
    loadMyCircle(user),
  ]);
  const mine = ledgerProjects.myProjects;
  const checklist = gettingStarted({
    role: user.role,
    profileDone: user.markets.trim().length > 1 && (user.lookingFor.trim().length > 1 || user.offering.trim().length > 1 || user.bio.trim().length > 1),
    ndaAccepted: Boolean(user.ndaAcceptedAt),
    projectCount: mine.length,
    seekingSet: mine.some((project) => parseSeeking(project.seeking).length > 0),
    approvedProject: mine.some((project) => project.reviewStatus === "APPROVED"),
    outreachSent,
    hasPhoto: Boolean(user.photoId),
  });
  const unusedCodes = ownedCodes.filter((code) => code.uses < code.maxUses).map((code) => ({ code: code.code, note: code.note }));

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
        <GettingStarted items={checklist} />
        {note}
        <LedgerProjects data={ledgerProjects} role={user.role} filters={filters} />
        <div className="mt-4 space-y-4 lg:hidden">
          {circlePanel}
          <ColleagueInvite codes={unusedCodes} />
        </div>
      </section>
      <aside className="hidden space-y-4 lg:block">
        {circlePanel}
        <ColleagueInvite codes={unusedCodes} />
      </aside>
    </div>
  );
}
