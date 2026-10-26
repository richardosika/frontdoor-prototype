import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { applicationReceivedMessage, INVITE_STATUS_COPY } from "@/lib/applicant-copy";
import { applicationStatusLabel, memberStatusCopy } from "@/lib/application-status";
import { BRAND } from "@/lib/brand";
import { applicantDuesSentence, monthlyDuesCents } from "@/lib/dues";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RequestStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await prisma.inviteRequest.findUnique({
    where: { statusToken: token },
    select: { name: true, status: true, role: true },
  });
  if (!request) notFound();
  const pending = request.status === "PENDING";
  const status = request.status === "DECLINED" ? "DECLINED" : "IN_REVIEW";
  const copy = pending ? memberStatusCopy("IN_REVIEW") : INVITE_STATUS_COPY[request.status];
  const shownBody = copy.body.includes("{first_name}") ? applicationReceivedMessage(request.name) : copy.body;
  const monthly = monthlyDuesCents(request.role);

  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-2xl font-normal">{copy.title}</h1>
          <p className="mt-2 font-serif text-lg">{request.name}</p>
          <p className="mt-1 text-sm text-ink">{shownBody}</p>
          <div className="mt-4 rounded border border-line bg-cream p-3 text-sm">
            <p>
              <b>Membership status.</b> {applicationStatusLabel(status)}
            </p>
            {status === "IN_REVIEW" ? <p className="mt-1">Verification in progress.</p> : null}
            <p className="mt-1">{applicantDuesSentence(monthly, false)}</p>
          </div>
          <Link href="/apply" className={`${btn} mt-4 w-full`}>
            Back to apply
          </Link>
        </div>
      </div>
    </main>
  );
}
