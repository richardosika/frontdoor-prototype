import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewApplication } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
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
  const { id } = await params;
  const query = await searchParams;
  const application = await prisma.application.findUnique({
    where: { id },
    include: { inviteCode: true, businessCard: { select: { id: true, deletedAt: true, sizeBytes: true } }, reviewer: { select: { name: true } } },
  });
  if (!application) notFound();
  const verification = application.userId
    ? await prisma.verificationCase.findFirst({ where: { userId: application.userId }, select: { id: true } })
    : null;
  const cardOnFile = Boolean(application.businessCard && !application.businessCard.deletedAt && application.businessCard.sizeBytes > 0);

  return (
    <div>
      <MobileTitle href="/admin/applications" label="Queue" title={application.name} />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title={application.name} />
        <div className="mt-3">
          <Banner error={query.error} notice={query.notice} />
        </div>
        <section className={`${card} mt-4 space-y-2 p-4 text-sm`}>
          <p>
            <b>Email:</b> {application.email}
          </p>
          <p>
            <b>Role:</b> {roleLabel(application.role)} · {application.org} · {application.location}
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
          <p>
            <b>Submitted:</b> {formatAuditTime(application.createdAt)}
          </p>
          <p>
            <b>Status:</b> {application.status}
            {application.reviewedAt ? ` · decided ${formatAuditTime(application.reviewedAt)}` : ""}
            {application.reviewer ? ` by ${application.reviewer.name}` : ""}
          </p>
          <p>
            <b>Business card:</b> {cardOnFile ? "On file. Members never see it." : "No business card uploaded."}
          </p>
          <p>
            <b>References:</b> {application.referenceEmails.length ? application.referenceEmails.join(", ") : "Not provided"}
          </p>
          <p>
            <b>Invite:</b> {application.inviteCode.code}
          </p>
          <p>
            <b>Anyone who can speak for you:</b> {application.statement.trim() || "Not provided"}
          </p>
          {verification ? (
            <p>
              <Link className="font-semibold text-forest underline" href={`/admin/verification/${verification.id}`}>
                Open verification case
              </Link>
            </p>
          ) : (
            <p className="text-ink">The verification case opens when this application is approved.</p>
          )}
        </section>
        {application.status === "PENDING" ? (
          <form action={reviewApplication} className={`${card} mt-4 space-y-2 p-4`}>
            <input type="hidden" name="applicationId" value={application.id} />
            <input name="note" className={field} placeholder="Note to the applicant (optional)" />
            <div className="flex gap-2">
              <button className={`${btnOutline} flex-1`} name="decision" value="REJECTED" type="submit">
                Reject
              </button>
              <button className={`${btn} flex-1`} name="decision" value="APPROVED" type="submit">
                Approve as Invited
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
