import Link from "next/link";
import { redirect } from "next/navigation";
import { addComment, closePost, markChecklist, toggleLike, updatePost } from "@/actions/feed";
import { reportPost } from "@/actions/social";
import { JoinEntryBanner } from "@/components/already-signed-in";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { KindTag, TierBadge } from "@/components/badge";
import { Composer } from "@/components/composer";
import { ProjectFilterBar } from "@/components/project-filters";
import { ColleagueInvite } from "@/components/colleague-invite";
import { LedgerProjects } from "@/components/ledger-projects";
import { loadLedgerProjects } from "@/lib/ledger-projects";
import { btn, btnBrass, btnOutline, dealCard, matchPanel } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/current-user";
import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { pickLeadDeals, hasPrefs } from "@/lib/ledger-match";
import { matchAudience, marketToken, matchScore } from "@/lib/domain";
import { plural, tierLabel, timeAgo } from "@/lib/format";
import { memberFacingLegal, readLegalMarkdown } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";
import { checklistProgress, intentsForRole, postIsPublic } from "@/lib/member-network";
import { filterSummary, inferNeed, narrowProjects, needLabel, projectQuery, settleProjectQuery, sortProjects, stageLabel } from "@/lib/project-filter";
import { prisma } from "@/lib/prisma";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { translator, type MessageKey } from "@/lib/i18n/messages";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

const TABS: { id: "foryou" | "requests"; label: string; key: MessageKey }[] = [
  { id: "foryou", label: "Matched for you", key: "ledger.tab.matched" },
  { id: "requests", label: "Requests", key: "ledger.tab.requests" },
];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const t = translator(await currentLocale());
  const tx = await serverTx();
  const params = await searchParams;
  const settled = settleProjectQuery("/feed", params, "feed");
  if (settled.redirectTo) redirect(settled.redirectTo);
  const filters = settled.filters;
  const tab = filters.tab || "foryou";
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const broad = Boolean(filters.q || filters.asset || filters.market || filters.size || filters.stage || filters.need || filters.posted || filters.role);

  const audience = matchAudience(user.role);
  const market = marketToken(user.location);
  const [posts, suggestions, application, ownedCodes, matchCount, postCount, introCount, saved] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: broad ? 200 : 40,
      include: {
        author: true,
        deal: true,
        likes: { select: { userId: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { id: { not: user.id }, status: "ACTIVE", paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] } },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.application.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.inviteCode.findMany({ where: { createdById: user.id } }),
    prisma.user.count({
      where: {
        id: { not: user.id },
        status: "ACTIVE",
        paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] },
        role: audience.role,
        ...(market ? { location: { contains: market } } : {}),
      },
    }),
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.introduction.count({ where: { OR: [{ fromId: user.id }, { toId: user.id }] } }),
    prisma.savedFilter.findMany({ where: { userId: user.id, surface: "feed" }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const ledgerProjects = await loadLedgerProjects(user);
  const checklist = checklistProgress({
    markets: user.markets,
    lookingFor: user.lookingFor,
    offering: user.offering,
    postCount,
    introCount,
    manual: user.checklistDone,
  });
  const checklistOpen = checklist.some((item) => !item.done);
  const unusedCodes = ownedCodes.filter((code) => code.uses < code.maxUses).map((code) => ({ code: code.code, note: code.note }));

  const connections = await prisma.connection.findMany({
    where: { status: "ACCEPTED", OR: [{ fromId: user.id }, { toId: user.id }] },
  });
  const circle = new Set<string>([user.id]);
  for (const connection of connections) {
    circle.add(connection.fromId === user.id ? connection.toId : connection.fromId);
  }

  const ranked = sortProjects(
    narrowProjects(
      posts.map((post) => ({
        id: post.id,
        sponsorRole: post.author.role,
        roleNeeded: post.deal?.roleNeeded ?? null,
        market: post.market || post.deal?.market || "",
        sizeBand: post.deal?.sizeBand || "",
        title: post.title || post.deal?.title || "",
        sponsorName: post.author.name,
        assetClass: post.assetClass || post.deal?.assetClass || "",
        kind: post.kind === "DEAL" || post.kind === "SEEKING" ? post.kind : undefined,
        raiseLabel: post.deal?.raiseLabel || post.sizeRange,
        stage: post.stage || post.deal?.stage || "",
        need: post.need || post.deal?.need || "",
        intent: post.intent,
        createdAt: post.createdAt,
        keywords: `${post.body} ${post.author.org} ${post.author.name}`,
        match:
          post.kind === "DEAL" || post.kind === "SEEKING"
            ? matchScore({
                memberRole: user.role,
                memberLocation: user.location,
                deal: {
                  kind: post.kind,
                  roleNeeded: post.deal?.roleNeeded ?? null,
                  sponsorRole: post.author.role,
                  market: post.market || post.deal?.market || "",
                },
              })
            : 0,
      })),
      filters,
    ),
    filters.sort,
  );
  const order = new Map(ranked.map((item, index) => [item.id, index]));
  const visible = posts
    .filter((post) => {
      if (!postIsPublic(post) && post.authorId !== user.id && !user.isAdmin) return false;
      if (!order.has(post.id)) return false;
      if (tab === "requests") return post.kind === "SEEKING";
      return true;
    })
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const prefs = { markets: user.markets, dealTypes: user.dealTypes, assetClasses: user.assetClasses };
  const lead = pickLeadDeals(
    prefs,
    posts
      .filter((post) => post.kind === "DEAL" && post.deal && postIsPublic(post))
      .map((post) => ({
        post,
        createdAt: post.createdAt,
        deal: {
          market: post.market || post.deal?.market || "",
          assetClass: post.assetClass || post.deal?.assetClass || "",
          text: `${post.deal?.title || ""} ${post.deal?.blurb || ""} ${post.deal?.need || ""} ${post.intent} ${post.need} ${post.title} ${post.body}`,
        },
      })),
  );
  const circlePosts = posts.filter((post) => post.authorId !== user.id && circle.has(post.authorId) && postIsPublic(post)).slice(0, 4);
  const circlePanel = (
    <div className="rounded border border-line bg-paper p-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">{t("ledger.circle")}</h2>
      <p className="mt-1 text-[14px] text-mut">{circle.size - 1 === 1 ? t("ledger.connection") : t("ledger.connections", { count: circle.size - 1 })}</p>
      {circlePosts.length ? (
        <ul className="mt-2">
          {circlePosts.map((post) => (
            <li key={post.id} className="border-b border-line py-2.5 last:border-0">
              <Link href={post.dealId ? `/deals/${post.dealId}` : `/members/${post.authorId}`} className="block">
                <span className="block text-[15px] font-semibold">{post.author.name}</span>
                <span className="line-clamp-2 block text-[14px] text-ink">{post.deal?.title || post.title || post.body}</span>
                <span className="block text-[12px] text-mut">{timeAgo(post.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-ink">{t("ledger.circleEmpty")}</p>
      )}
      <Link href="/network" className="mt-3 inline-block text-[14px] font-semibold text-forest underline decoration-brass">
        {t("ledger.findMembers")}
      </Link>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 px-4 pb-8 pt-4 md:pt-8 lg:grid-cols-[minmax(0,800px)_340px] lg:px-10">
      <section>
        <JoinEntryBanner name={user.name} />
        <header className="mb-6 border-b-[3px] border-double border-brass pb-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-[40px] font-normal italic leading-tight tracking-wide md:text-[52px]">{t("ledger.title")}</h1>
        </header>
        <Banner error={error ? tx(error) : undefined} notice={notice ? tx(notice) : undefined} />
        <LedgerProjects data={ledgerProjects} role={user.role} />
        <section className={`${matchPanel} mb-6 p-5 md:p-6`} data-testid="ledger-lead">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sand">
            {lead.matched ? t("ledger.matchedNote") : hasPrefs(prefs) ? t("ledger.noMatchNote") : t("ledger.noPrefsNote")}
          </p>
          <h2 className="mt-1 font-serif text-[30px] font-normal leading-tight md:text-[36px]">{lead.matched ? t("ledger.matchedTitle") : t("ledger.recentTitle")}</h2>
          {lead.items.length ? (
            <ul className="mt-4 grid gap-3">
              {lead.items.map(({ post, reasons }) => (
                <li key={post.id} className="rounded border border-brass/50 bg-paper/5 p-4">
                  <Link href={`/deals/${post.dealId}`} className="block">
                    <span className="block font-serif text-[22px] leading-snug text-paper md:text-[24px]">
                      {t("ledger.raising", { amount: post.deal?.raiseLabel || "", title: post.deal?.title || "" })}
                    </span>
                    <span className="mt-1 block text-[15px] text-sand">
                      {post.deal?.market} · {post.deal?.assetClass} · {post.author.name} · {timeAgo(post.createdAt)}
                    </span>
                    {reasons.length ? (
                      <span className="mt-2 flex flex-wrap gap-2">
                        {reasons.map((reason) => (
                          <span key={reason} className="rounded-sm border border-brass px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider text-brass">
                            {reason}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[16px] text-sand">{t("ledger.noDeals")}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/deals" className={btnBrass}>
              {t("ledger.allDeals")}
            </Link>
            <Link href="/profile" className="inline-flex min-h-11 items-center text-[15px] text-sand underline decoration-brass">
              {t("ledger.updatePrefs")}
            </Link>
          </div>
        </section>
        <div className="flex gap-7 overflow-x-auto border-b border-line font-serif text-[19px] text-mut md:text-[21px]">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={projectQuery("/feed", { ...filters, tab: item.id === "foryou" ? undefined : item.id })}
              className={`inline-flex min-h-11 shrink-0 items-center border-b-2 ${tab === item.id ? "border-brass font-semibold text-forest" : "border-transparent"}`}
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
        <ProjectFilterBar path="/feed" filters={filters} saved={saved} />
        {checklistOpen ? (
          <section className="mt-4 rounded border border-brass bg-paper p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t("ledger.firstWeek")}</p>
            <h2 className="mt-1 font-serif text-2xl font-normal">{t("ledger.gettingStarted")}</h2>
            <ol className="mt-2 space-y-2 text-sm text-ink">
              {checklist.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className={item.done ? "text-brass" : "text-mut"}>{item.done ? "✓" : "○"} </span>
                    <Link href={item.href} className="underline decoration-brass">
                      {item.label}
                    </Link>
                  </span>
                  {!item.done && (item.id === "directory" || item.id === "guidelines") ? (
                    <form action={markChecklist}>
                      <input type="hidden" name="item" value={item.id} />
                      <button className={btnOutline} type="submit">
                        {t("ledger.markDone")}
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
            {application?.reviewerNote ? (
              <p className="mt-3 rounded border border-line bg-cream px-3 py-2 text-sm text-ink">
                <b>{t("ledger.noteFrom", { owner: BRAND.owner })} </b>
                {application.reviewerNote}
              </p>
            ) : null}
          </section>
        ) : application?.reviewerNote ? (
          <p className="mt-4 rounded border border-line bg-paper px-3 py-2 text-sm text-ink">
            <b>{t("ledger.noteFrom", { owner: BRAND.owner })} </b>
            {application.reviewerNote}
          </p>
        ) : null}
        <div className="mt-4 space-y-4 lg:hidden">
          {circlePanel}
          <ColleagueInvite codes={unusedCodes} />
        </div>
        <div className="mt-4">
          <Composer
            intents={intentsForRole(user.role).map((item) => ({ id: item.id, label: item.label, kind: item.kind }))}
            rulesHtml={renderMarkdown(memberFacingLegal(readLegalMarkdown("seeking-raising.md")))}
          />
        </div>
        <div className="mt-4 space-y-4">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-[16px] text-mut">{filterSummary(filters) ? t("ledger.noFilterMatch") : t("ledger.empty")}</p>
          ) : null}
          {visible.map((post) => {
            const liked = post.likes.some((like) => like.userId === user.id);
            const seeking = post.kind === "SEEKING" ? tx(roleShort(roleLabel(post.deal?.roleNeeded))) : undefined;
            return (
              <article
                key={post.id}
                className={`p-4 md:p-5 ${post.kind === "DEAL" ? dealCard : "rounded border border-line bg-paper"}`}
              >
                <div className="flex items-start gap-3">
                  <Link href={`/members/${post.authorId}`}>
                    <Avatar initials={post.author.initials} photoId={post.author.photoId} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/members/${post.authorId}`} className="text-[17px] font-semibold">
                        {post.author.name}
                      </Link>
                      <TierBadge tier={post.author.tier} />
                    </div>
                    <p className="text-[14px] text-mut">
                      {tx(roleShort(roleLabel(post.author.role)))} · {post.author.org} · {timeAgo(post.createdAt)}
                    </p>
                  </div>
                  <KindTag kind={post.kind} roleLabel={seeking} />
                </div>
                {post.deal ? (
                  <h2 className="mt-3 font-serif text-[24px] font-normal leading-snug">
                    {post.kind === "DEAL" ? t("ledger.raising", { amount: post.deal.raiseLabel, title: post.deal.title }) : post.deal.title}
                  </h2>
                ) : null}
                {!postIsPublic(post) ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brass">
                    {post.status === "PENDING_REVIEW" ? t("ledger.held") : post.status === "CLOSED" ? t("ledger.closed") : t("ledger.unpublished")}
                  </p>
                ) : null}
                <p className="mt-2 text-[17px] leading-relaxed text-ink">{post.body}</p>
                {post.deal ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-mut">{post.deal.market}</span>
                    <span className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-mut">{post.deal.assetClass}</span>
                    <span className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-mut">{post.deal.raiseLabel}</span>
                    {stageLabel(post.stage || post.deal.stage) ? (
                      <span className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-mut">{tx(stageLabel(post.stage || post.deal.stage))}</span>
                    ) : null}
                    {needLabel(inferNeed({ need: post.need || post.deal.need, intent: post.intent, roleNeeded: post.deal.roleNeeded })) ? (
                      <span className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-mut">
                        {tx(needLabel(inferNeed({ need: post.need || post.deal.need, intent: post.intent, roleNeeded: post.deal.roleNeeded })))}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-4 border-t border-line pt-2 text-[14px] text-mut">
                  <form action={toggleLike}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className={liked ? "font-semibold text-brass" : ""}>
                      {liked ? "♥" : "♡"} {post.likes.length + (liked ? 0 : 0)}
                    </button>
                  </form>
                  <span>💬 {post.comments.length}</span>
                  {post.deal ? (
                    <Link href={`/deals/${post.dealId}`} className="ml-auto font-semibold text-forest">
                      {t("ledger.viewDeal")}
                    </Link>
                  ) : null}
                </div>
                {post.comments.length ? (
                  <ul className="mt-2 space-y-2">
                    {post.comments.map((comment) => (
                      <li key={comment.id} className="rounded bg-cream px-3 py-2 text-sm">
                        <span className="font-semibold">{comment.author.name}</span>{" "}
                        <span className="text-ink">{comment.body}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {post.authorId === user.id ? (
                  <div className="mt-3 grid gap-2">
                    <form action={updatePost} className="grid gap-2">
                      <input type="hidden" name="postId" value={post.id} />
                      <input name="title" defaultValue={post.title} className="min-h-11 rounded-sm border border-line bg-paper px-3 text-sm" placeholder={t("ledger.titlePlaceholder")} />
                      <textarea name="body" defaultValue={post.body} rows={2} className="rounded-sm border border-line bg-paper px-3 py-2 text-sm" />
                      <button className={btnOutline} type="submit">
                        {t("ledger.saveEdit")}
                      </button>
                    </form>
                    {post.status !== "CLOSED" ? (
                      <form action={closePost}>
                        <input type="hidden" name="postId" value={post.id} />
                        <button className={btnOutline} type="submit">
                          {t("ledger.closePost")}
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <form action={reportPost} className="mt-3 flex gap-2">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="back" value="/feed" />
                    <input name="reason" placeholder={t("ledger.reportPlaceholder")} className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 py-2 text-sm" />
                    <button className={btnOutline} type="submit">
                      {t("ledger.report")}
                    </button>
                  </form>
                )}
                <form action={addComment} className="mt-2 flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="body" placeholder={t("ledger.comment")} className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass" />
                  <button className={btn} type="submit">
                    {t("ledger.send")}
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="hidden space-y-4 lg:block">
        {circlePanel}
        <div className={matchPanel}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-sand">{t("ledger.matchSuggestions")}</div>
          <p className="mt-1 font-serif text-2xl">{t("ledger.inYourMarkets", { who: `${matchCount} ${tx(matchCount === 1 ? audience.singular : audience.plural)}` })}</p>
          <p className="mt-2 text-xs text-sand">{t("ledger.matchRules")}</p>
          <Link href={`/network?role=${audience.role}`} className={`${btnBrass} mt-3`}>
            {t("ledger.reviewMatches")}
          </Link>
        </div>
        <div className="rounded border border-line bg-paper p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t("ledger.suggested")}</h2>
          <ul className="mt-2">
            {suggestions.map((person) => (
              <li key={person.id} className="flex items-center gap-2 border-b border-line py-2 last:border-0">
                <Avatar initials={person.initials} photoId={person.photoId} size="sm" />
                <Link href={`/members/${person.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{person.name}</span>
                  <span className="block truncate text-[11px] text-mut">{tx(roleShort(roleLabel(person.role)))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ColleagueInvite codes={unusedCodes} />
      </aside>
    </div>
  );
}

