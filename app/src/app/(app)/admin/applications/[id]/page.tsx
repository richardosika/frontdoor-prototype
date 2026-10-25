import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteOneApplication, rerunVerification, saveInternalNote } from "@/actions/owner";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { DecisionForm } from "@/components/decision-form";
import { PaymentPanel } from "@/components/payment-admin";
import { CheckTable, ExecutiveSummary, GradeMark, recommendationNeedsConfirm } from "@/components/grade-summary";
import { RunAndReload } from "@/components/run-and-reload";
import { btnOutline, card, field, labelCls, sectionLabel } from "@/components/ui";
import { applicationStatusLabel } from "@/lib/application-status";
import { requireAdmin } from "@/lib/current-user";
import { adminDuesLine } from "@/lib/dues";
import { settleStuckRuns } from "@/lib/verify/queue";
import { formatAuditTime } from "@/lib/format";
import { splitMemberReply } from "@/lib/statement";
import { prisma } from "@/lib/prisma";
import { gradeFactsFromApplication, gradeForRun } from "@/lib/verify/grade";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  await settleStuckRuns();
  const { id } = await params;
  const query = await searchParams;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      inviteCode: true,
      businessCard: { select: { id: true, fileName: true, contentType: true, sizeBytes: true, deletedAt: true } },
      reviewer: { select: { name: true } },
      decisions: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      legalAcceptances: { orderBy: { document: "asc" } },
      user: true,
      runs: { orderBy: { createdAt: "desc" }, include: { evidence: { orderBy: { checkKey: "asc" } } } },
    },
  });
  if (!application) notFound();
  const statementParts = splitMemberReply(application.statement);
  const report = application.runs.find((run) => run.subject === "APPLICATION");
  const company = application.runs.find((run) => run.subject === "COMPANY");
  const facts = gradeFactsFromApplication(application);
  const grade = gradeForRun(report, facts);
  const companyGrade = gradeForRun(company, { ...facts, name: application.org, applicantName: application.name });
  const card = application.businessCard;
  const cardOnFile = Boolean(card && !card.deletedAt && card.sizeBytes > 0);
  const open = ["PENDING", "SUBMITTED", "IN_REVIEW", "NEEDS_INFO"].includes(application.status);
  const verification = application.userId
    ? await prisma.verificationCase.findFirst({ where: { userId: application.userId }, select: { id: true } })
    : null;

  return (
    <div>
      <MobileTitle href="/admin/applications" label="Applications" title={application.name} />
      <div className="mx-auto min-w-0 max-w-3xl overflow-x-hidden px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title={application.name} />
        <div className="mt-3">
          <Banner error={query.error} notice={query.notice} />
        </div>
        <p className="mt-3 text-sm text-ink">Applications are the people waiting to be checked. This grade is a recommendation. Richard Osika approves every member.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <GradeMark letter={grade?.letter} score={grade?.score} recommendation={grade?.recommendation} confidence={grade?.confidence} />
          <span className="text-xs uppercase tracking-wide text-mut">{applicationStatusLabel(application.status)}</span>
          {application.isTest ? <span className="text-xs uppercase tracking-wide text-brass">Test</span> : null}
        </div>
        {grade ? <ExecutiveSummary report={grade} /> : <p className="mt-4 text-sm text-ink">No grade yet. Run verification to write the executive summary.</p>}
        <section className={`${card} mt-4 space-y-2 p-4 text-sm`}>
          <p>
            <b>Email:</b> {application.email}
            {application.emailVerifiedAt ? " · email code confirmed" : ""}
          </p>
          <p>
            <b>Role:</b> {roleLabel(application.role)} · {application.org} · {application.location}
          </p>
          <p>
            <b>Dues:</b> {adminDuesLine(application.duesCents, application.duesWaived)}
          </p>
          {application.phone ? (
            <p>
              <b>Phone:</b> {application.phone}
            </p>
          ) : null}
          {application.linkedinUrl ? (
            <p>
              <b>LinkedIn:</b> {application.linkedinUrl}
            </p>
          ) : null}
          {application.website ? (
            <p>
              <b>Website:</b> {application.website}
            </p>
          ) : null}
          {application.socialLinks ? (
            <p>
              <b>Social:</b> {application.socialLinks}
            </p>
          ) : null}
          <p>
            <b>Submitted:</b> {formatAuditTime(application.createdAt)}
          </p>
          <p>
            <b>Invite:</b> {application.inviteCode.code}
            {application.inviteCode.note ? ` · ${application.inviteCode.note}` : ""}
          </p>
          <p>
            <b>References:</b> {application.referenceEmails.length ? application.referenceEmails.join(", ") : "Not provided"}
          </p>
          <p>
            <b>Track record:</b> {statementParts.track || "Not provided"}
          </p>
          {statementParts.replies.map((reply) => (
            <p key={reply.at}>
              <b>Member reply:</b> {reply.text}
              <span className="block text-xs text-mut">{reply.label}</span>
            </p>
          ))}
          {application.reviewedAt ? (
            <p>
              <b>Last touch:</b> {formatAuditTime(application.reviewedAt)}
              {application.reviewer ? ` by ${application.reviewer.name}` : ""}
            </p>
          ) : null}
          {verification ? (
            <p>
              <Link href={`/admin/verification/${verification.id}`} className="underline decoration-brass">
                Verification file
              </Link>
            </p>
          ) : null}
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Business card</h2>
          {cardOnFile && card ? (
            <div className="mt-3">
              <p className="text-xs text-mut">
                {card.fileName} · {card.contentType} · {card.sizeBytes} bytes. Members never see this file.
              </p>
              {card.contentType.startsWith("image/") ? (
                // Admin-only authenticated file. The image optimizer cannot send the session.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/admin/verification/cards/${card.id}`} alt="Business card" className="mt-3 max-h-80 rounded border border-line" />
              ) : (
                <a className="mt-3 inline-block underline decoration-brass" href={`/api/admin/verification/cards/${card.id}`}>
                  Open the PDF
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-mut">No business card uploaded.</p>
          )}
        </section>
        <CheckSection title="Application checks" run={report} />
        {companyGrade ? <ExecutiveSummary report={companyGrade} title="Company file" /> : null}
        <CheckSection title="Company checks" run={company} />
        <div className="mt-4">
          <RunAndReload
            className={btnOutline}
            label={report ? "Re-run verification" : "Run verification"}
            pendingLabel="Running verification…"
            run={rerunVerification.bind(null, application.id)}
          />
          <p className="mt-2 text-xs text-mut">Re-run uses live free sources and can take a minute. Sample LEGIT rows use offline fixtures until you re-run.</p>
        </div>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Internal note</h2>
          <form action={saveInternalNote} className="mt-3 space-y-2">
            <input type="hidden" name="applicationId" value={application.id} />
            <textarea name="internalNote" className={field} rows={3} defaultValue={application.internalNote} />
            <button className={btnOutline} type="submit">
              Save note
            </button>
          </form>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Documents accepted</h2>
          {application.legalAcceptances.length === 0 ? <p className="mt-2 text-sm text-mut">None recorded.</p> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {application.legalAcceptances.map((row) => (
              <li key={row.id}>
                {row.document} · {row.version} · {formatAuditTime(row.acceptedAt)}
              </li>
            ))}
          </ul>
        </section>
        {application.user ? (
          <PaymentPanel
            userId={application.user.id}
            role={application.user.role}
            status={application.user.paymentStatus}
            duesCents={application.user.duesCents}
            renewalAt={application.user.renewalAt}
            paidAt={application.user.paidAt}
            paymentMode={application.user.paymentMode}
            waiverReason={application.user.waiverReason}
            refundNote={application.user.refundNote}
            back={`/admin/applications/${application.id}`}
          />
        ) : null}
        {open ? (
          <section className={`${card} mt-4 p-4`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Your decision</h2>
            <p className="mt-1 text-sm text-ink">Automation does not approve or decline. A decline does not show the reason to the applicant.</p>
            {grade ? (
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Grade {grade.letter} ({grade.score}). {grade.recommendation}. Confidence {grade.confidence}. {grade.summary.reasoning}
              </p>
            ) : null}
            <DecisionForm
              applicationId={application.id}
              notLegit={recommendationNeedsConfirm(grade?.recommendation, report?.verdict)}
              confirmLabel={grade?.recommendation === "DECLINE" ? "The recommendation is DECLINE." : "The recommendation is NOT LEGIT."}
            />
          </section>
        ) : null}
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Decision log</h2>
          {application.decisions.length === 0 ? <p className="mt-2 text-sm text-mut">No decisions yet.</p> : null}
          <ul className="mt-2 divide-y divide-line text-sm">
            {application.decisions.map((row) => (
              <li key={row.id} className="py-2">
                <b>{row.decision}</b>
                {row.gradeLetter ? ` · grade ${row.gradeLetter}${typeof row.gradeScore === "number" ? ` (${row.gradeScore})` : ""}` : ""}
                {row.recommendation ? ` · ${row.recommendation}` : ""} · {row.actor?.name || "Private Floor"} · {formatAuditTime(row.createdAt)}
                {row.reason ? <p className="text-ink">{row.reason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Delete applicant</h2>
          <p className="mt-2 text-sm text-ink">
            Removes this application, its business card, outbox notices, and verification runs. It also removes the linked member account and the CRM person when those exist. An administrator account is left in place.
          </p>
          <div className="mt-3">
            <RunAndReload
              className={btnOutline}
              label="Delete this applicant and all their data"
              pendingLabel="Deleting…"
              confirmMessage={`Delete ${application.name}? This removes the application, verification runs, outbox notices, business card, linked member account, and CRM person. This cannot be undone.`}
              run={deleteOneApplication.bind(null, application.id)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function CheckSection({
  title,
  run,
}: {
  title: string;
  run?: {
    status: string;
    finishedAt: Date | null;
    evidence: { id: string; checkKey: string; status: string; finding: string; source: string; url: string; ranAt: Date }[];
  };
}) {
  return (
    <section className={`${card} mt-4 p-4`}>
      <h2 className={sectionLabel}>{title}</h2>
      {!run ? <p className="mt-2 text-sm text-mut">No checks yet.</p> : null}
      {run ? (
        <>
          <p className="mt-2 text-xs text-mut">
            {run.status}
            {run.finishedAt ? ` · ${formatAuditTime(run.finishedAt)}` : ""}
          </p>
          <CheckTable evidence={run.evidence} />
        </>
      ) : null}
    </section>
  );
}
