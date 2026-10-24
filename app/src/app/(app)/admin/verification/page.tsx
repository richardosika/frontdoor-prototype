import type { ReactNode } from "react";
import Link from "next/link";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card, chipOff, chipOn } from "@/components/ui";
import { requireVerificationAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  VERIFICATION_STATUSES,
  effectiveVerificationStatus,
  isAwaitingVerification,
  verificationQueueLabel,
  verificationStatusLabel,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; subject?: string }>;
}) {
  await requireVerificationAdmin();
  const params = await searchParams;
  const statusFilter = VERIFICATION_STATUSES.some((item) => item.id === params.status) ? params.status : undefined;
  const subject = params.subject === "MEMBER" || params.subject === "PROJECT" ? params.subject : undefined;
  const cases = await prisma.verificationCase.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { name: true, org: true, location: true } },
      project: { select: { name: true, location: true, year: true, user: { select: { name: true } } } },
    },
  });
  const awaiting = cases.filter((item) => isAwaitingVerification(item)).length;
  const visible = cases.filter((item) => {
    const effective = effectiveVerificationStatus(item);
    if (subject && item.subject !== subject) return false;
    if (statusFilter && effective !== statusFilter) return false;
    return true;
  });

  const labels = queueLabels(visible);

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Verification" />
      <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Verification" />
      <p className="mt-1 text-sm text-ink">
        Admin only. Members never see this queue, the checklists, or the internal notes. {awaiting} awaiting review.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Filter href="/admin/verification" on={!subject && !statusFilter}>
          All
        </Filter>
        <Filter href={queueHref({ subject: "MEMBER", status: statusFilter })} on={subject === "MEMBER"}>
          Members
        </Filter>
        <Filter href={queueHref({ subject: "PROJECT", status: statusFilter })} on={subject === "PROJECT"}>
          Projects
        </Filter>
        {VERIFICATION_STATUSES.map((item) => (
          <Filter key={item.id} href={queueHref({ subject, status: item.id })} on={statusFilter === item.id}>
            {item.label}
          </Filter>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {visible.length === 0 ? <li className="text-sm text-mut">Nothing in this view.</li> : null}
        {visible.map((item) => {
          const effective = effectiveVerificationStatus(item);
          return (
            <li key={item.id}>
              <Link href={`/admin/verification/${item.id}`} className={`${card} flex min-h-11 items-center justify-between gap-3 px-4 py-3`}>
                <span>
                  <b className="block text-sm">{labels.get(item.id)}</b>
                  <span className="text-xs text-mut">{item.subject === "MEMBER" ? "Member" : "Project"}</span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-brass">{verificationStatusLabel(effective)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}

function queueLabels(items: (Parameters<typeof verificationQueueLabel>[0] & { id: string })[]) {
  const base = items.map((item) => verificationQueueLabel(item));
  const counts = new Map<string, number>();
  for (const label of base) counts.set(label, (counts.get(label) ?? 0) + 1);
  const labels = new Map<string, string>();
  items.forEach((item, index) => {
    const label = base[index] ?? "Case";
    labels.set(item.id, (counts.get(label) ?? 0) > 1 ? `${label} · ${item.id.slice(-4)}` : label);
  });
  return labels;
}

function queueHref(input: { subject?: string; status?: string }) {
  const params = new URLSearchParams();
  if (input.subject) params.set("subject", input.subject);
  if (input.status) params.set("status", input.status);
  const value = params.toString();
  return value ? `/admin/verification?${value}` : "/admin/verification";
}

function Filter({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={on ? chipOn : chipOff}>
      {children}
    </Link>
  );
}
