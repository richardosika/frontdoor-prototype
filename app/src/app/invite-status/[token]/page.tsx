import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { applicationReceivedMessage, INVITE_STATUS_COPY } from "@/lib/applicant-copy";
import { BRAND } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COPY = INVITE_STATUS_COPY;

export default async function InviteStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await prisma.inviteRequest.findUnique({
    where: { statusToken: token },
    select: { name: true, status: true },
  });
  if (!request) notFound();
  const copy = COPY[request.status];

  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{BRAND.name}</p>
          <h1 className="mt-1 font-serif text-2xl font-normal">{copy.title}</h1>
          {request.status === "PENDING" ? (
            <p className="mt-2 text-sm text-ink">{applicationReceivedMessage(request.name)}</p>
          ) : (
            <>
              <p className="mt-2 font-serif text-lg">{request.name}</p>
              <p className="mt-1 text-sm text-ink">{copy.body}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
