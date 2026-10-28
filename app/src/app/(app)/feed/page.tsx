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
import { PageHeader } from "@/components/page-header";
import { btn, btnBrass, btnOutline, dealCard, matchPanel } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/current-user";
import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { matchAudience, marketToken, matchScore, sizeLabel } from "@/lib/domain";
import { publicRaiseLabel } from "@/lib/platform/deal-team";
import { plural, tierLabel, timeAgo } from "@/lib/format";
import { memberFacingLegal, readLegalMarkdown } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";
import { checklistProgress, intentsForRole, postIsPublic } from "@/lib/member-network";
import { filterSummary, inferNeed, narrowProjects, needLabel, projectQuery, settleProjectQuery, sortProjects, stageLabel } from "@/lib/project-filter";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "foryou", label: "For you" },
  { id: "deals", label: "Deals" },
  { id: "seeking", label: "Seeking" },
  { id: "circle", label: "My circle" },
] as const;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
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
      if (tab === "deals") return post.kind === "DEAL";
      if (tab === "seeking") return post.kind === "SEEKING";
      if (tab === "circle") return circle.has(post.authorId);
      return true;
    })
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return (
    <div className="mx-auto grid max-w-[1180px] gap-6 px-4 pb-6 pt-3 md:pt-6 lg:grid-cols-[minmax(0,760px)_320px] lg:px-8">
      <section>
        <JoinEntryBanner name={user.name} />
        <PageHeader title="The Ledger" ledger />
        <Banner error={error} notice={notice} />
        <div className="flex gap-5 overflow-x-auto border-b border-line font-serif text-[15px] text-mut">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={projectQuery("/feed", { ...filters, tab: item.id === "foryou" ? undefined : item.id })}
              className={`inline-flex min-h-11 shrink-0 items-center border-b-2 ${tab === item.id ? "border-brass font-semibold text-forest" : "border-transparent"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <ProjectFilterBar path="/feed" filters={filters} saved={saved} />
        <section className="mt-4 rounded border border-brass bg-paper p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Membership status</p>
          <h2 className="mt-1 font-serif text-2xl font-normal">{tierLabel(user.tier)} member</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Your account is active. {BRAND.owner} approved membership. Reviewed membership means every member is personally reviewed. You see “Verified” or “Verification in progress.” Verified means the verification file was completed by Private Floor.
          </p>
          <div className="mt-2">
            <TierBadge tier={user.tier} />
          </div>
        </section>
        {checklistOpen ? (
          <section className="mt-4 rounded border border-brass bg-paper p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">First week</p>
            <h2 className="mt-1 font-serif text-2xl font-normal">Getting started</h2>
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
                        Mark done
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
            {application?.reviewerNote ? (
              <p className="mt-3 rounded border border-line bg-cream px-3 py-2 text-sm text-ink">
                <b>Note from {BRAND.owner}. </b>
                {application.reviewerNote}
              </p>
            ) : null}
          </section>
        ) : application?.reviewerNote ? (
          <p className="mt-4 rounded border border-line bg-paper px-3 py-2 text-sm text-ink">
            <b>Note from {BRAND.owner}. </b>
            {application.reviewerNote}
          </p>
        ) : null}
        <div className="mt-4 space-y-4 lg:hidden">
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
            <p className="py-10 text-center text-sm text-mut">{filterSummary(filters) ? "No posts match these filters." : "Nothing here yet."}</p>
          ) : null}
          {visible.map((post) => {
            const liked = post.likes.some((like) => like.userId === user.id);
            const seeking = post.kind === "SEEKING" ? roleShort(roleLabel(post.deal?.roleNeeded)) : undefined;
            return (
              <article
                key={post.id}
                className={`p-4 md:p-5 ${post.kind === "DEAL" ? dealCard : "rounded border border-line bg-paper"}`}
              >
                <div className="flex items-start gap-3">
                  <Link href={`/members/${post.authorId}`}>
                    <Avatar initials={post.author.initials} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/members/${post.authorId}`} className="text-sm font-semibold">
                        {post.author.name}
                      </Link>
                      <TierBadge tier={post.author.tier} />
                    </div>
                    <p className="text-[11.5px] text-mut">
                      {roleShort(roleLabel(post.author.role))} · {post.author.org} · {timeAgo(post.createdAt)}
                    </p>
                  </div>
                  <KindTag kind={post.kind} roleLabel={seeking} />
                </div>
                {post.deal ? (
                  <h2 className="mt-3 font-serif text-lg font-normal">
                    {post.deal.title}
                  </h2>
                ) : null}
                {!postIsPublic(post) ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brass">
                    {post.status === "PENDING_REVIEW" ? "Held for a Private Floor administrator" : post.status === "CLOSED" ? "Closed" : "Not published"}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-ink">{post.body}</p>
                {post.deal ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">{post.deal.market}</span>
                    <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">{post.deal.assetClass}</span>
                    <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">{publicRaiseLabel({ kind: post.kind, raiseLabel: post.deal.raiseLabel, sizeLabel: sizeLabel(post.deal.sizeBand) || post.sizeRange })}</span>
                    {stageLabel(post.stage || post.deal.stage) ? (
                      <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">{stageLabel(post.stage || post.deal.stage)}</span>
                    ) : null}
                    {needLabel(inferNeed({ need: post.need || post.deal.need, intent: post.intent, roleNeeded: post.deal.roleNeeded })) ? (
                      <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">
                        {needLabel(inferNeed({ need: post.need || post.deal.need, intent: post.intent, roleNeeded: post.deal.roleNeeded }))}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-4 border-t border-line pt-2 text-xs text-mut">
                  <form action={toggleLike}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className={liked ? "font-semibold text-brass" : ""}>
                      {liked ? "♥" : "♡"} {post.likes.length + (liked ? 0 : 0)}
                    </button>
                  </form>
                  <span>💬 {post.comments.length}</span>
                  {post.deal ? (
                    <Link href={`/deals/${post.dealId}`} className="ml-auto font-semibold text-forest">
                      View deal
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
                      <input name="title" defaultValue={post.title} className="min-h-11 rounded-sm border border-line bg-paper px-3 text-sm" placeholder="Title" />
                      <textarea name="body" defaultValue={post.body} rows={2} className="rounded-sm border border-line bg-paper px-3 py-2 text-sm" />
                      <button className={btnOutline} type="submit">
                        Save edit
                      </button>
                    </form>
                    {post.status !== "CLOSED" ? (
                      <form action={closePost}>
                        <input type="hidden" name="postId" value={post.id} />
                        <button className={btnOutline} type="submit">
                          Close post
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <form action={reportPost} className="mt-3 flex gap-2">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="back" value="/feed" />
                    <input name="reason" placeholder="Report this post" className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 py-2 text-sm" />
                    <button className={btnOutline} type="submit">
                      Report
                    </button>
                  </form>
                )}
                <form action={addComment} className="mt-2 flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="body" placeholder="Comment" className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass" />
                  <button className={btn} type="submit">
                    Send
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="hidden space-y-4 lg:block">
        <div className={matchPanel}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-sand">Match suggestions</div>
          <p className="mt-1 font-serif text-xl">{plural(matchCount, audience.singular, audience.plural)} in your markets</p>
          <p className="mt-2 text-xs text-sand">Rules match on role, market, and size. This is a directory, not a solicitation.</p>
          <Link href={`/network?role=${audience.role}`} className={`${btnBrass} mt-3`}>
            Review matches
          </Link>
        </div>
        <div className="rounded border border-line bg-paper p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Suggested connections</h2>
          <ul className="mt-2">
            {suggestions.map((person) => (
              <li key={person.id} className="flex items-center gap-2 border-b border-line py-2 last:border-0">
                <Avatar initials={person.initials} size="sm" />
                <Link href={`/members/${person.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{person.name}</span>
                  <span className="block truncate text-[11px] text-mut">{roleShort(roleLabel(person.role))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-line bg-paper p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Membership status</h2>
          <div className="mt-2">
            <TierBadge tier={user.tier} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink">
            Approved member. Account active. {BRAND.owner} approves every member. Members see Verified or Verification in progress. Verified means the verification file was completed by Private Floor.
          </p>
        </div>
        <ColleagueInvite codes={unusedCodes} />
      </aside>
    </div>
  );
}

