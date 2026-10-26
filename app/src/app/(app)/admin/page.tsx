import Link from "next/link";
import { createInvite, declineInviteRequest, deleteInviteCode, deleteInviteRequest, issueInviteForRequest, reviewVouch } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { CopyCode } from "@/components/copy-code";
import { PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { btn, btnOutline, card, field, labelCls, sectionLabel } from "@/components/ui";
import { activitySince, attentionItems, funnelCounts, mergeActivity, type ActivityRow } from "@/lib/admin-home";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { roleLabel } from "@/lib/roles";
import { formatRunScores } from "@/lib/verify/score";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; issued?: string; issuedFor?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const since = activitySince();
  const issuedCode = params.issued ? await prisma.inviteCode.findUnique({ where: { code: params.issued } }) : null;
  const [
    awaitingDecision,
    infoReplies,
    paymentsDueOrFailed,
    reports,
    flaggedPosts,
    pendingIntros,
    pendingDeals,
    followUpsDue,
    funnelRows,
    activeMembers,
    weekApplications,
    weekDecisions,
    weekOutbox,
    weekMembers,
    decisions,
    moderation,
    runs,
    vouches,
    inviteRequests,
    invites,
  ] = await Promise.all([
    prisma.application.count({ where: { status: { in: ["PENDING", "SUBMITTED", "IN_REVIEW"] } } }),
    prisma.application.count({ where: { status: "IN_REVIEW", statement: { contains: "Member reply" } } }),
    prisma.user.count({ where: { isAdmin: false, paymentStatus: { in: ["DUE", "FAILED"] } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.post.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.introduction.count({ where: { status: "PENDING" } }),
    prisma.dealAccess.count({ where: { status: "PENDING" } }),
    prisma.crmPerson.count({ where: { followUpAt: { lte: new Date() } } }),
    prisma.application.groupBy({ by: ["status"], _count: true }),
    prisma.user.count({ where: { status: "ACTIVE", isAdmin: false } }),
    prisma.application.count({ where: { createdAt: { gte: since } } }),
    prisma.applicationDecision.count({ where: { createdAt: { gte: since } } }),
    prisma.outboxNotice.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { isAdmin: false, createdAt: { gte: since } } }),
    prisma.applicationDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { name: true } }, application: { select: { name: true } } },
    }),
    prisma.moderationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { name: true } } },
    }),
    prisma.verificationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, subject: true, status: true, verdict: true, score: true, gradeLetter: true, gradeScore: true, createdAt: true, application: { select: { name: true } } },
    }),
    prisma.confirmation.findMany({
      where: { status: "CONFIRMED", reviewStatus: "PENDING_ADMIN" },
      include: { project: { include: { user: true } } },
      orderBy: { respondedAt: "desc" },
    }),
    prisma.inviteRequest.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const attention = attentionItems({
    awaitingDecision,
    infoReplies,
    paymentsDueOrFailed,
    reports,
    flaggedPosts,
    introAndDealIssues: pendingIntros + pendingDeals,
    followUpsDue,
  });
  const funnel = funnelCounts(
    funnelRows.map((row) => ({ status: row.status, count: row._count })),
    activeMembers,
  );
  const activity = mergeActivity([
    ...decisions.map(
      (row): ActivityRow => ({
        id: `decision-${row.id}`,
        at: row.createdAt.toISOString(),
        kind: "decision",
        text: `${row.actor?.name || "Private Floor"} · ${row.decision} · ${row.application.name}`,
        href: "/admin/audit",
      }),
    ),
    ...moderation.map(
      (row): ActivityRow => ({
        id: `moderation-${row.id}`,
        at: row.createdAt.toISOString(),
        kind: "moderation",
        text: `${row.actor?.name || "Private Floor"} · ${row.summary}`,
        href: "/admin/audit",
      }),
    ),
    ...runs.map(
      (row): ActivityRow => ({
        id: `run-${row.id}`,
        at: row.createdAt.toISOString(),
        kind: "verification",
        text: `${row.subject} · ${row.status}${row.verdict ? ` · ${row.verdict}` : ""}${formatRunScores(row) ? ` · ${formatRunScores(row)}` : ""} · ${row.application?.name || "No application"}`,
        href: "/admin/audit",
      }),
    ),
  ]);
  const week = [
    { label: "Applications", value: weekApplications },
    { label: "Decisions", value: weekDecisions },
    { label: "Outbox notices", value: weekOutbox },
    { label: "New members", value: weekMembers },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Command center" />
      <p className="font-serif text-2xl text-forest md:hidden">Command center</p>
        <p className="mt-1 text-sm text-ink">
        What is waiting on a Private Floor administrator, then the floor behind it. Members never see this page. Applications are waiting to be checked. Members are approved. People is everyone.
      </p>
      <div className="mt-4">
        <Banner error={params.error} notice={params.notice} />
        {issuedCode ? (
          <CopyCode
            code={issuedCode.code}
            caption={`Invite code for ${params.issuedFor || "this request"}. The information email is in the Outbox. Copy the code. Applicants are not emailed.`}
          />
        ) : null}
      </div>

      <section className="mt-6" aria-label="Needs your attention">
        <h2 className="font-serif text-2xl font-normal text-forest">Needs your attention</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {attention.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`${card} flex min-h-11 items-center gap-3 px-4 py-3 ${item.hot ? "border-brass" : "border-line"}`}
              >
                <b className="font-serif text-3xl font-normal tabular-nums">{item.count}</b>
                <span className="text-sm text-ink">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={`${card} p-4`}>
          <h2 className={sectionLabel}>Funnel</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {funnel.map((item) => (
              <li key={item.label}>
                <b className="font-serif text-2xl font-normal">{item.value}</b>
                <span className="mt-1 block text-xs uppercase tracking-wider text-mut">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} p-4`}>
          <h2 className={sectionLabel}>Last 7 days</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {week.map((item) => (
              <li key={item.label}>
                <b className="font-serif text-2xl font-normal">{item.value}</b>
                <span className="mt-1 block text-xs uppercase tracking-wider text-mut">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={`${card} mt-4 p-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={sectionLabel}>Recent activity</h2>
          <Link href="/admin/audit" className="text-sm underline decoration-brass">
            Audit log
          </Link>
        </div>
        {activity.length === 0 ? <p className="mt-3 text-sm text-mut">Nothing recorded yet.</p> : null}
        <ul className="mt-2 divide-y divide-line text-sm">
          {activity.map((row) => (
            <li key={row.id} className="py-2">
              <Link href={row.href} className="block min-h-11">
                <span className="text-xs text-mut">{formatAuditTime(new Date(row.at))}</span>
                <span className="mt-0.5 block text-ink">{row.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-6 p-4`}>
        <h2 className={sectionLabel}>Vouches waiting for review</h2>
        <p className="mt-1 text-sm text-ink">A counterparty confirmation does not change membership. Membership stays Approved.</p>
        {vouches.length === 0 ? <p className="mt-3 text-sm text-mut">None waiting.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {vouches.map((vouch) => (
            <li key={vouch.id} className="py-3 text-sm">
              <b>{vouch.project.user.name}</b>
              <span className="text-mut"> · {vouch.project.name}</span>
              <p className="text-xs text-ink">
                {vouch.counterpartyName} ({vouch.counterpartyEmail}) confirmed.
                {vouch.note ? ` Note: ${vouch.note}` : ""}
              </p>
              <form action={reviewVouch} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="confirmationId" value={vouch.id} />
                <button className={btnOutline} name="decision" value="REJECTED" type="submit">
                  Decline
                </button>
                <button className={btn} name="decision" value="APPROVED" type="submit">
                  Accept vouch
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-6 p-4`}>
        <h2 className={sectionLabel}>Invite requests</h2>
        <p className="mt-1 text-sm text-ink">
          Issuing a code puts the information email in the Outbox. Copy the code. Applicants are not emailed.
        </p>
        {inviteRequests.length === 0 ? <p className="mt-3 text-sm text-mut">None waiting.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {inviteRequests.map((request) => (
            <li key={request.id} className="py-3 text-sm">
              <b>{request.name}</b>
              <span className="text-mut"> · {request.email}</span>
              <p className="text-xs text-ink">
                {roleLabel(request.role)} · {request.org} · {request.location}
              </p>
              {request.note ? <p className="mt-1 text-xs text-ink">{request.note}</p> : null}
              <p className="text-xs text-mut">{request.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {request.status === "PENDING" ? (
                  <>
                    <form action={issueInviteForRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className={btn} type="submit">
                        Issue code
                      </button>
                    </form>
                    <form action={declineInviteRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className={btnOutline} type="submit">
                        Decline
                      </button>
                    </form>
                  </>
                ) : null}
                <form id={`delete-request-${request.id}`} action={deleteInviteRequest}>
                  <input type="hidden" name="requestId" value={request.id} />
                </form>
                <ConfirmSubmitButton
                  form={`delete-request-${request.id}`}
                  className={btnOutline}
                  message={`Delete the invite request for ${request.name}? The CRM person stays.`}
                >
                  Delete request
                </ConfirmSubmitButton>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={`${card} p-4`}>
          <h2 className={sectionLabel}>New invite code</h2>
          <form action={createInvite} className="mt-3 space-y-2">
            <div>
              <label className={labelCls}>Code</label>
              <input name="code" className={field} placeholder="PF-NEW-CODE" required />
            </div>
            <div>
              <label className={labelCls}>Max uses</label>
              <input name="maxUses" type="number" min={1} max={100} defaultValue={5} className={field} />
            </div>
            <div>
              <label className={labelCls}>Note</label>
              <input name="note" className={field} placeholder="Q4 founding invites" />
            </div>
            <button className={btn} type="submit">
              Create code
            </button>
          </form>
        </section>
        <section className={`${card} p-4`}>
          <h2 className={sectionLabel}>Invite codes</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {invites.map((invite) => (
              <li key={invite.id} className="py-2">
                <b>{invite.code}</b>
                <span className="block text-xs text-mut">
                  {invite.uses}/{invite.maxUses} used {invite.note ? `· ${invite.note}` : ""}
                </span>
                <form id={`delete-code-${invite.id}`} action={deleteInviteCode}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                </form>
                <ConfirmSubmitButton
                  form={`delete-code-${invite.id}`}
                  className={`${btnOutline} mt-2`}
                  message={`Delete invite code ${invite.code}? Codes that already have applications are kept until those applicants are deleted.`}
                >
                  Delete code
                </ConfirmSubmitButton>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
