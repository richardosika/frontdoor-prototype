import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@/components/application-status";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { INVITE_STATUS_COPY, requestReceivedMessage } from "@/lib/applicant-copy";
import { givenNameFrom } from "@/lib/person-fields";
import { BRAND } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function RequestStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await prisma.inviteRequest.findUnique({
    where: { statusToken: token },
    select: { name: true, givenName: true, status: true },
  });
  if (!request) {
    const application = await prisma.application.findUnique({
      where: { statusToken: token },
      include: { user: { select: { paymentStatus: true, renewalAt: true } } },
    });
    if (application) return <ApplicationStatus application={application} />;
    redirect(`${await appBaseUrl()}/request-status/${encodeURIComponent(token)}`);
  }
  const copy = INVITE_STATUS_COPY[request.status];
  const shownBody = copy.body.includes("{first_name}") ? requestReceivedMessage(givenNameFrom(request.givenName, request.name)) : copy.body;

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
          <Link href="/apply" className={`${btn} mt-4 w-full`}>
            Back to apply
          </Link>
        </div>
      </div>
    </main>
  );
}
