import Link from "next/link";
import { notFound } from "next/navigation";
import { adminReviewAccess, requestAccess, reviewAccess } from "@/actions/deals";
import { closePost, updatePost } from "@/actions/feed";
import { openConversation, reportPost } from "@/actions/social";
import { Banner } from "@/components/banner";
import { KindTag, TierBadge } from "@/components/badge";
import { MobileTitle } from "@/components/page-header";
import { btn, btnOutline, dealCard, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { sizeLabel } from "@/lib/domain";
import { plural } from "@/lib/format";
import { readLegalMarkdown, stripVersionLine } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      sponsor: { include: { projects: { include: { confirmations: true }, orderBy: { year: "desc" } } } },
      access: { include: { requester: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) notFound();
  const post = await prisma.post.findFirst({ where: { dealId: deal.id }, orderBy: { createdAt: "desc" } });
  const ndaHtml = renderMarkdown(stripVersionLine(readLegalMarkdown("deal-room-nda.md")));
  const mine = deal.access.find((item) => item.requesterId === user.id);
  const isSponsor = deal.sponsorId === user.id;
  const approved = mine?.status === "APPROVED" || isSponsor;

  return (
    <div>
      <MobileTitle href="/deals" label="Deals" title="Deal" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
      <Link href="/deals" className="hidden text-sm text-mut md:inline">
        ‹ Deals
      </Link>
      <Banner error={query.error} notice={query.notice} />
      <div className={`mt-3 p-5 ${dealCard}`}>
        <div className="flex items-start justify-between gap-3">
          <KindTag kind={deal.kind} roleLabel={roleShort(roleLabel(deal.roleNeeded))} />
          <span className="text-xs text-mut">{deal.market} · {sizeLabel(deal.sizeBand)} · {deal.assetClass}</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl font-normal">{deal.title}</h1>
        <Link href={`/members/${deal.sponsorId}`} className="mt-1 inline-flex items-center gap-2 text-sm text-mut">
          Sponsor: {deal.sponsor.name} <TierBadge tier={deal.sponsor.tier} />
        </Link>
        <div className="mt-4 grid grid-cols-3 overflow-hidden border border-brass-line">
          <Cell label={deal.kind === "DEAL" ? "Raise" : "Size"} value={deal.raiseLabel} />
          <Cell label="State" value={deal.market} />
          <Cell label={deal.kind === "SEEKING" ? "Needed" : "Asset"} value={deal.kind === "SEEKING" ? roleShort(roleLabel(deal.roleNeeded)) : deal.assetClass} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink">{deal.blurb}</p>
        <p className="mt-2 text-xs text-mut">
          This page is a member note. {BRAND.name} does not offer securities, accept subscriptions, or process payments.
        </p>
        <h2 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Sponsor track record</h2>
        {deal.sponsor.projects.length === 0 ? <p className="text-sm text-mut">No projects listed.</p> : null}
        <ul>
          {deal.sponsor.projects.map((project) => (
            <li key={project.id} className="flex items-center justify-between border-b border-line py-2 text-sm">
              <span>
                <b>{project.name}</b>
                <span className="block text-xs text-mut">
                  {project.location} · {project.year} · {plural(project.confirmations.filter((item) => item.status === "CONFIRMED").length, "counterparty", "counterparties")} confirmed
                </span>
              </span>
              <span className="font-serif">{project.valueLabel}</span>
            </li>
          ))}
        </ul>
        {approved ? (
          <div className="mt-4 rounded border border-brass bg-brass-soft p-3 text-sm">
            <b>You can open the deal room.</b>
            <p className="mt-1 text-ink">Approved members are listed there. Materials stay among those members.</p>
            <Link href={`/deals/${deal.id}/room`} className={`${btn} mt-3`}>
              Open deal room
            </Link>
          </div>
        ) : mine?.status === "REMOVED" ? (
          <form action={requestAccess} className="mt-4 rounded border border-brass bg-brass-soft p-3 text-sm">
            <input type="hidden" name="dealId" value={deal.id} />
            <p className="mb-2">The sponsor removed you from this room. You can request access again after acknowledging the current NDA.</p>
            <NdaCopy html={ndaHtml} />
            <button className={`${btn} mt-3`} type="submit">
              Request access again
            </button>
          </form>
        ) : mine?.status === "PENDING" ? (
          <div className="mt-4 rounded border border-brass bg-brass-soft p-3 text-sm">
            <b>Pending — not approved</b>
            <p className="mt-1">
              Your request to {deal.sponsor.name} is waiting on sponsor review. It has not been approved. An admin can decide on {deal.sponsor.name}&apos;s behalf.
            </p>
          </div>
        ) : (
          <form action={requestAccess} className="mt-4 rounded border border-brass bg-brass-soft p-3 text-sm">
            <input type="hidden" name="dealId" value={deal.id} />
            {mine?.status === "REJECTED" ? (
              <p className="mb-2">
                <b>Request declined.</b> {deal.sponsor.name} did not approve access. You can send a new request.
              </p>
            ) : null}
            <NdaCopy html={ndaHtml} />
            <button className={`${btn} mt-3`} type="submit">
              Request access
            </button>
          </form>
        )}
        {isSponsor && post ? (
          <div className="mt-4 grid gap-2">
            <form action={updatePost} className="grid gap-2">
              <input type="hidden" name="postId" value={post.id} />
              <input name="title" defaultValue={post.title || deal.title} className={field} />
              <textarea name="body" defaultValue={post.body} rows={3} className={field} />
              <button className={btnOutline} type="submit">
                Save post
              </button>
            </form>
            <form action={closePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button className={btnOutline} type="submit">
                Close post
              </button>
            </form>
          </div>
        ) : null}
        {!isSponsor && post ? (
          <form action={reportPost} className="mt-4 flex gap-2">
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="back" value={`/deals/${deal.id}`} />
            <input name="reason" className={field} placeholder="Report this post" />
            <button className={btnOutline} type="submit">
              Report
            </button>
          </form>
        ) : null}
        {isSponsor ? null : (
          <div className="mt-4 flex gap-2">
            <form action={openConversation}>
              <input type="hidden" name="userId" value={deal.sponsorId} />
              <button className={btnOutline} type="submit">
                Message sponsor
              </button>
            </form>
          </div>
        )}
        {isSponsor || user.isAdmin ? (
          <section className="mt-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Access requests</h2>
            {user.isAdmin && !isSponsor ? (
              <p className="mt-1 text-xs text-ink">You are acting for {deal.sponsor.name}. The requester is told an admin decided.</p>
            ) : null}
            {deal.access.length === 0 ? <p className="mt-2 text-sm text-mut">No requests yet.</p> : null}
            <ul className="mt-2 divide-y divide-line">
              {deal.access.map((access) => (
                <li key={access.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <Link href={`/members/${access.requesterId}`} className="font-semibold">
                      {access.requester.name}
                    </Link>
                    <span className="block text-xs text-mut">
                      {roleShort(roleLabel(access.requester.role))} · {access.status === "PENDING" ? "Pending — not approved" : access.status}
                      {access.ndaAcknowledged ? ` · NDA ${access.ndaVersion || "acknowledged"}` : ""}
                    </span>
                  </span>
                  {access.status === "PENDING" ? (
                    <span className="flex gap-2">
                      <form action={isSponsor ? reviewAccess : adminReviewAccess}>
                        <input type="hidden" name="accessId" value={access.id} />
                        <button className={btnOutline} name="decision" value="REJECTED" type="submit">
                          Decline
                        </button>
                      </form>
                      <form action={isSponsor ? reviewAccess : adminReviewAccess}>
                        <input type="hidden" name="accessId" value={access.id} />
                        <button className={btn} name="decision" value="APPROVED" type="submit">
                          Approve
                        </button>
                      </form>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      </div>
    </div>
  );
}

function NdaCopy({ html }: { html: string }) {
  return (
    <>
      <b>Deal-room NDA</b>
      <div className="mt-2 max-h-64 overflow-y-auto rounded border border-line bg-paper p-3" dangerouslySetInnerHTML={{ __html: html }} />
      <label className="mt-3 flex items-start gap-2 text-ink">
        <input type="checkbox" name="nda" required className="mt-1" />
        <span>I accept this NDA. Private Floor records the version, the time, and a hash of my IP address. It does not show that record to other members.</span>
      </label>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-line px-3 py-2 last:border-0">
      <b className="block font-serif text-lg font-normal">{value}</b>
      <small className="text-[9.5px] uppercase tracking-wider text-mut">{label}</small>
    </div>
  );
}
