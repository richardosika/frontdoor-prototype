import Link from "next/link";
import { notFound } from "next/navigation";
import { updateVerificationCase, updateVerificationCheck } from "@/actions/verification";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireVerificationAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CHECK_RESULTS, VERIFICATION_STATUSES, checkResultLabel, verificationStatusLabel } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VerificationCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireVerificationAdmin();
  const { id } = await params;
  const query = await searchParams;
  const record = await prisma.verificationCase.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, userId: true } },
      checks: { orderBy: { label: "asc" }, include: { reviewer: { select: { name: true } } } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!record) notFound();
  const name = record.user?.name ?? record.project?.name ?? "File";
  const expiresValue = record.expiresAt ? record.expiresAt.toISOString().slice(0, 10) : "";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-3 md:pt-6 lg:px-8">
      <PageHeader title={name} />
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
        The badge is shown to members only after you mark this file Verified and every item below is Pass. Members otherwise see “Verification in progress.”
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

      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Checklist</h2>
      <ul className="space-y-3">
        {record.checks.map((check) => (
          <li key={check.id} className={`${card} p-4`}>
            <p className="font-semibold">{check.label}</p>
            <p className="mt-1 text-xs text-mut">
              {checkResultLabel(check.result)}
              {check.reviewer ? ` · ${check.reviewer.name}` : ""}
              {check.reviewedAt ? ` · ${check.reviewedAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
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

      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Audit log</h2>
      <ul className={`${card} divide-y divide-line px-4`}>
        {record.events.length === 0 ? <li className="py-3 text-sm text-mut">No changes yet.</li> : null}
        {record.events.map((event) => (
          <li key={event.id} className="py-3 text-sm">
            <span className="text-ink">{event.summary}</span>
            <span className="mt-1 block text-xs text-mut">
              {event.actor?.name ?? "System"} · {event.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              {event.fromStatus && event.fromStatus !== event.toStatus ? ` · ${verificationStatusLabel(event.fromStatus)} → ${verificationStatusLabel(event.toStatus)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
