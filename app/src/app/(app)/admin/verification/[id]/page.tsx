import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteBusinessCard, skipVerificationCheck, updateVerificationCase, updateVerificationCheck } from "@/actions/verification";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireVerificationAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ADMIN_INTROS } from "@/lib/membership-copy";
import { displayCheckStatus } from "@/lib/review-steps";
import { CHECK_RESULTS, VERIFICATION_STATUSES, checkResultLabel, verificationCaseHeading, verificationStatusLabel } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VerificationCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string; step?: string }>;
}) {
  await requireVerificationAdmin();
  const { id } = await params;
  const query = await searchParams;
  const record = await prisma.verificationCase.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, org: true, location: true } },
      project: { select: { id: true, name: true, location: true, year: true, userId: true, user: { select: { name: true } } } },
      checks: { orderBy: { label: "asc" }, include: { reviewer: { select: { name: true } } } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!record) notFound();
  const requestedStep = Number(query.step || "1");
  const stepIndex = Number.isFinite(requestedStep) ? Math.min(record.checks.length, Math.max(1, requestedStep)) : 1;
  const currentCheck = record.checks[stepIndex - 1];
  const heading = verificationCaseHeading(record);
  const expiresValue = record.expiresAt ? record.expiresAt.toISOString().slice(0, 10) : "";
  const businessCard = record.userId
    ? await prisma.businessCard.findUnique({
        where: { userId: record.userId },
        select: { id: true, fileName: true, contentType: true, sizeBytes: true, uploadedAt: true, deletedAt: true },
      })
    : null;

  return (
    <div>
      <header className="safe-top bg-forest px-4 pb-4 text-paper md:hidden">
        <Link href="/admin/verification" className="inline-flex min-h-11 items-center text-sm text-sand">
          ‹ Queue
        </Link>
        <h1 className="font-serif text-2xl font-normal leading-tight">{heading.title}</h1>
        <p className="mt-1 text-sm text-sand">{heading.detail}</p>
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-3 md:pt-6 lg:px-8">
      <PageHeader title={heading.title} />
      <h1 className="font-serif text-2xl font-normal leading-tight md:hidden">{heading.title}</h1>
      <p className="mt-1 text-sm text-mut">{heading.detail}</p>
      <p className="mt-1 text-sm text-mut">
        <Link href="/admin/verification" className="text-brass">
          Verification queue
        </Link>
        {" · "}
        {record.subject === "MEMBER" ? "Member" : "Project"} · {verificationStatusLabel(record.status)}
      </p>
      <div className="mt-3">
        <Banner error={query.error} notice={query.notice} />
      </div>
      <p className="mt-3 text-sm text-ink">
        {ADMIN_INTROS.verification} The badge is shown to members only after you mark this file Verified and every item is Pass. A skip is not a pass. Members otherwise see “Verification in progress.”
      </p>

      <form action={updateVerificationCase} className={`${card} mt-4 space-y-3 p-4`}>
        <input type="hidden" name="caseId" value={record.id} />
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" className={field} defaultValue={record.status}>
            {VERIFICATION_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Re-verify / expiry date</label>
          <input name="expiresAt" type="date" className={field} defaultValue={expiresValue} />
        </div>
        <div>
          <label className={labelCls}>Internal note</label>
          <textarea name="internalNote" className={field} rows={4} defaultValue={record.internalNote} placeholder="Members never see this." />
          <p className="mt-1 text-[11px] text-mut">Admin only. This note is not rendered on profiles or alerts.</p>
        </div>
        <button className={btn} type="submit">
          Save file
        </button>
      </form>

      {record.subject === "MEMBER" ? (
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Business card</h2>
          <p className="mt-1 text-sm text-ink">Members never see this file. Match it to public records on the checklist. It is stored in the database, not on the server disk.</p>
          {businessCard && !businessCard.deletedAt && businessCard.sizeBytes > 0 ? (
            <div className="mt-3 text-sm">
              <a className="font-semibold text-forest underline" href={`/api/admin/verification/cards/${businessCard.id}`}>
                View {businessCard.fileName}
              </a>
              <p className="mt-1 text-xs text-mut">
                {businessCard.contentType} · {businessCard.sizeBytes} bytes · uploaded {formatAuditTime(businessCard.uploadedAt)}
              </p>
              {record.status === "VERIFIED" ? (
                <form action={deleteBusinessCard} className="mt-3">
                  <input type="hidden" name="caseId" value={record.id} />
                  <button className={btnOutline} type="submit">
                    Delete business card
                  </button>
                </form>
              ) : (
                <p className="mt-2 text-xs text-mut">Delete is available after this file is marked Verified.</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-mut">{businessCard?.deletedAt ? `Deleted ${formatAuditTime(businessCard.deletedAt)}.` : "No business card uploaded."}</p>
          )}
        </section>
      ) : null}

      <section className={`${card} mt-4 p-4`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Guided review</p>
        {currentCheck ? (
          <>
            <h2 className="mt-1 font-serif text-2xl font-normal">
              Step {stepIndex} of {record.checks.length}
            </h2>
            <p className="mt-1 font-semibold">{currentCheck.label}</p>
            <p className="mt-1 text-sm text-ink">
              {displayCheckStatus(currentCheck.result, currentCheck.note)}
              {currentCheck.reviewer ? ` · ${currentCheck.reviewer.name}` : ""}
              {currentCheck.reviewedAt ? ` · ${formatAuditTime(currentCheck.reviewedAt)}` : ""}
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {record.checks.map((check, index) => (
                <a
                  key={check.id}
                  href={`/admin/verification/${record.id}?step=${index + 1}`}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-sm border px-3 text-xs ${
                    index + 1 === stepIndex ? "border-brass bg-forest text-paper" : "border-line bg-cream"
                  }`}
                >
                  {index + 1}. {check.label}
                </a>
              ))}
            </div>
            <form action={updateVerificationCheck} className="mt-3 space-y-2">
              <input type="hidden" name="checkId" value={currentCheck.id} />
              <input type="hidden" name="nextStep" value={String(Math.min(record.checks.length, stepIndex + 1))} />
              <label className={labelCls}>Your mark</label>
              <select name="result" className={field} defaultValue={currentCheck.result}>
                {CHECK_RESULTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input name="evidenceUrl" className={field} defaultValue={currentCheck.evidenceUrl} placeholder="https:// evidence link" />
              <textarea name="note" className={field} rows={3} defaultValue={currentCheck.note} placeholder="What you checked and what the evidence shows" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className={`${btn} min-h-11`} type="submit">
                  Save & next
                </button>
                {stepIndex > 1 ? (
                  <a className={`${btnOutline} inline-flex min-h-11 items-center justify-center`} href={`/admin/verification/${record.id}?step=${stepIndex - 1}`}>
                    Back
                  </a>
                ) : null}
              </div>
            </form>
            <form action={skipVerificationCheck} className="mt-3 space-y-2 rounded border border-[#7A2E2E] bg-cream p-3">
              <input type="hidden" name="checkId" value={currentCheck.id} />
              <input type="hidden" name="nextStep" value={String(Math.min(record.checks.length, stepIndex + 1))} />
              <p className="font-serif text-xl text-forest">Skip (override)</p>
              <p className="text-sm text-ink">A skip is not a pass. It is written on this file’s audit log.</p>
              <textarea name="skipReason" className={field} rows={2} required minLength={8} placeholder="Why you are skipping this" />
              <button className={`${btnOutline} min-h-11`} type="submit">
                Record skip
              </button>
            </form>
          </>
        ) : (
          <p className="mt-2 text-sm text-mut">This file has no checklist items.</p>
        )}
      </section>
      <details className={`${card} mt-4 p-4`}>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-forest">View full checklist</summary>
        <ul className="mt-3 space-y-3">
          {record.checks.map((check) => (
            <li key={check.id} className="border-t border-line pt-3">
              <p className="font-semibold">{check.label}</p>
              <p className="mt-1 text-xs text-mut">
                {displayCheckStatus(check.result, check.note)} · {checkResultLabel(check.result)}
                {check.reviewer ? ` · ${check.reviewer.name}` : ""}
                {check.reviewedAt ? ` · ${formatAuditTime(check.reviewedAt)}` : ""}
              </p>
              <form action={updateVerificationCheck} className="mt-3 space-y-2">
                <input type="hidden" name="checkId" value={check.id} />
                <select name="result" className={field} defaultValue={check.result}>
                  {CHECK_RESULTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input name="evidenceUrl" className={field} defaultValue={check.evidenceUrl} placeholder="https:// evidence link" />
                <textarea name="note" className={field} rows={3} defaultValue={check.note} placeholder="What you checked and what the evidence shows" />
                <button className={btnOutline} type="submit">
                  Save item
                </button>
              </form>
            </li>
          ))}
        </ul>
      </details>

      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Audit log</h2>
      <ul className={`${card} divide-y divide-line px-4`}>
        {record.events.length === 0 ? <li className="py-3 text-sm text-mut">No changes yet.</li> : null}
        {record.events.map((event) => (
          <li key={event.id} className="py-3 text-sm">
            <span className="text-ink">{event.summary}</span>
            <span className="mt-1 block text-xs text-mut">
              {event.actor?.name ?? "System"} · {formatAuditTime(event.createdAt)}
              {event.fromStatus && event.fromStatus !== event.toStatus ? ` · ${verificationStatusLabel(event.fromStatus)} → ${verificationStatusLabel(event.toStatus)}` : ""}
            </span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
