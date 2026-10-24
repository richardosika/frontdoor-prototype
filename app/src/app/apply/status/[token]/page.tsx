import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COPY = {
  PENDING: {
    title: "Application under review",
    body: "The committee has not decided yet. This page updates when they do.",
  },
  APPROVED: {
    title: "Application approved",
    body: "You can sign in with the email and password you chose. Your tier starts at Invited.",
  },
  REJECTED: {
    title: "Application not approved",
    body: "The committee did not approve this application.",
  },
} as const;

export default async function ApplicationStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const application = await prisma.application.findUnique({ where: { statusToken: token } });
  if (!application) notFound();
  const copy = COPY[application.status];

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
          <p className="mt-1 text-sm text-ink">{copy.body}</p>
          {application.reviewerNote ? (
            <div className="mt-4 rounded border border-brass bg-brass-soft p-3 text-sm text-ink">
              <b>Note from the committee</b>
              <p className="mt-1">{application.reviewerNote}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-mut">No note from the committee yet.</p>
          )}
          {application.status === "APPROVED" ? (
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
