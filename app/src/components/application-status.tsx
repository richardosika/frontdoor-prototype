import Link from "next/link";
import { ApplyReply } from "@/components/apply-reply";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { applicationReceivedMessage } from "@/lib/applicant-copy";
import { applicationStatusLabel, memberStatusCopy } from "@/lib/application-status";
import { BRAND } from "@/lib/brand";
import { currentMonthlyCents, statusMembershipLine } from "@/lib/dues";
import { formatEtDate } from "@/lib/format";

export function ApplicationStatus({
  application,
}: {
  application: {
    name: string;
    status: string;
    statusToken: string;
    reviewerNote: string;
    role: string;
    duesCents: number;
    duesWaived: boolean;
    user: { paymentStatus: string; renewalAt: Date | null } | null;
  };
}) {
  const copy = memberStatusCopy(application.status);
  const shownBody = copy.body.includes("{first_name}") ? applicationReceivedMessage(application.name) : copy.body;
  const declined = application.status === "DECLINED" || application.status === "REJECTED";
  const showNote =
    !declined &&
    Boolean(application.reviewerNote) &&
    (application.status === "NEEDS_INFO" || application.status === "APPROVED" || application.status === "PAYMENT_DUE");
  const canSignIn = application.status === "APPROVED" || application.status === "PAYMENT_DUE";
  const membershipLine = statusMembershipLine({
    status: application.status,
    monthlyCents: application.duesCents > 0 ? currentMonthlyCents(application.role, application.duesCents) : 0,
    waived: application.duesWaived,
    paymentStatus: application.user?.paymentStatus,
    renewalLabel: application.user?.renewalAt ? formatEtDate(application.user.renewalAt) : null,
  });

  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-2xl font-normal">{copy.title}</h1>
          <p className="mt-2 font-serif text-lg">{application.name}</p>
          <p className="mt-1 text-sm text-ink">{shownBody}</p>
          <div className="mt-4 rounded border border-line bg-cream p-3 text-sm">
            <p>
              <b>Membership status.</b> {applicationStatusLabel(application.status)}
            </p>
            {application.status === "SUBMITTED" || application.status === "IN_REVIEW" || application.status === "PENDING" ? (
              <p className="mt-1">Verification in progress.</p>
            ) : null}
            {membershipLine ? <p className="mt-1">{membershipLine}</p> : null}
          </div>
          {showNote ? (
            <div className="mt-4 rounded border border-brass bg-brass-soft p-3 text-sm text-ink">
              <b>{application.status === "NEEDS_INFO" ? "What we need" : `Note from ${BRAND.owner}`}</b>
              <p className="mt-1">{application.reviewerNote}</p>
            </div>
          ) : null}
          {application.status === "NEEDS_INFO" ? <ApplyReply token={application.statusToken} /> : null}
          {canSignIn ? (
            <Link href="/login" className={`${btn} mt-4 w-full`}>
              Sign in
            </Link>
          ) : (
            <Link href="/apply" className={`${btn} mt-4 w-full`}>
              Back to apply
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
