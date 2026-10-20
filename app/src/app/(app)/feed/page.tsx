import Link from "next/link";
import { addComment, toggleLike } from "@/actions/feed";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { KindTag, TierBadge } from "@/components/badge";
import { Composer } from "@/components/composer";
import { btn } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { timeAgo } from "@/lib/format";
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
  searchParams: Promise<{ tab?: string; error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = TABS.some((item) => item.id === params.tab) ? params.tab : "foryou";

  const [posts, suggestions, invite] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        author: true,
        deal: true,
        likes: { select: { userId: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { id: { not: user.id }, status: "ACTIVE" },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.inviteCode.findFirst({ where: { createdById: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const connections = await prisma.connection.findMany({
    where: { status: "ACCEPTED", OR: [{ fromId: user.id }, { toId: user.id }] },
  });
  const circle = new Set<string>([user.id]);
  for (const connection of connections) {
    circle.add(connection.fromId === user.id ? connection.toId : connection.fromId);
  }

  const visible = posts.filter((post) => {
    if (tab === "deals") return post.kind === "DEAL";
    if (tab === "seeking") return post.kind === "SEEKING";
    if (tab === "circle") return circle.has(post.authorId);
    return true;
  });

  const investors = suggestions.filter((person) => person.role === "INVESTOR_PE" || person.role === "FAMILY_OFFICE");

  return (
    <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,760px)_320px] lg:px-8">
      <section>
        <header className="mb-4 border-b border-line pb-3">
          <h1 className="font-serif text-[26px] uppercase tracking-[0.18em]">Your feed</h1>
        </header>
        <Banner error={params.error} notice={params.notice} />
        <Composer />
        <div className="mt-4 flex gap-5 overflow-x-auto border-b border-line text-[13px] text-mut">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={item.id === "foryou" ? "/feed" : `/feed?tab=${item.id}`}
              className={`shrink-0 pb-2 ${tab === item.id ? "border-b-2 border-terra font-semibold text-navy" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {visible.length === 0 ? <p className="py-10 text-center text-sm text-mut">Nothing here yet.</p> : null}
          {visible.map((post) => {
            const liked = post.likes.some((like) => like.userId === user.id);
            const seeking = post.kind === "SEEKING" ? roleShort(roleLabel(post.deal?.roleNeeded)) : undefined;
            return (
              <article
                key={post.id}
                className={`rounded-2xl border bg-white p-4 ${post.kind === "DEAL" ? "border-terra" : "border-line"}`}
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
                    {post.kind === "DEAL" ? `Raising ${post.deal.raiseLabel} — ${post.deal.title}` : post.deal.title}
                  </h2>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-ink">{post.body}</p>
                {post.deal && post.kind === "DEAL" ? (
                  <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-mist text-center">
                    <Mini label="Equity mult." value={post.deal.equityMultiple || "—"} />
                    <Mini label="Target IRR" value={post.deal.targetIrr || "—"} />
                    <Mini label="Min. check" value={post.deal.minCheck || "—"} />
                  </div>
                ) : null}
                {post.deal ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-mut">{post.deal.market}</span>
                    <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-mut">{post.deal.assetClass}</span>
                    <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-mut">{post.deal.raiseLabel}</span>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-4 border-t border-line pt-2 text-xs text-mut">
                  <form action={toggleLike}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className={liked ? "font-semibold text-terra" : ""}>
                      {liked ? "♥" : "♡"} {post.likes.length + (liked ? 0 : 0)}
                    </button>
                  </form>
                  <span>💬 {post.comments.length}</span>
                  {post.deal ? (
                    <Link href={`/deals/${post.dealId}`} className="ml-auto font-semibold text-navy">
                      View deal
                    </Link>
                  ) : null}
                </div>
                {post.comments.length ? (
                  <ul className="mt-2 space-y-2">
                    {post.comments.map((comment) => (
                      <li key={comment.id} className="rounded-xl bg-mist px-3 py-2 text-sm">
                        <span className="font-semibold">{comment.author.name}</span>{" "}
                        <span className="text-ink">{comment.body}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <form action={addComment} className="mt-2 flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="body" placeholder="Comment" className="min-w-0 flex-1 rounded-full border border-line px-3 py-2 text-sm outline-none focus:border-terra" />
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
        <div className="rounded-2xl border border-terra bg-gradient-to-br from-navy2 to-navy p-4 text-white">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#F5A887]">Match suggestions</div>
          <p className="mt-1 font-serif text-xl">{Math.max(investors.length, 1)} investors in the seeded network</p>
          <p className="mt-2 text-xs text-[#C4CCDD]">Rules match on role, market, and size. This is a directory, not a solicitation.</p>
          <Link href="/network?role=INVESTOR_PE" className={`${btn} mt-3 bg-white text-navy`}>
            Review matches
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra">Suggested connections</h2>
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
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra">Your verification</h2>
          <div className="mt-2">
            <TierBadge tier={user.tier} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink">Invite accepted. An admin can move you to Verified. A counterparty vouch moves you to Confirmed.</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra">Invite a colleague</h2>
          <p className="mt-2 text-xs text-ink">
            {invite ? (
              <>
                Your code <b>{invite.code}</b> has {Math.max(invite.maxUses - invite.uses, 0)} uses left.
              </>
            ) : (
              <>Ask an admin for a code, or use the demo code FD-7K2M-91QX.</>
            )}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-line px-2 py-2 last:border-0">
      <b className="block font-serif text-base font-normal">{value}</b>
      <small className="text-[9px] uppercase tracking-wider text-mut">{label}</small>
    </div>
  );
}
