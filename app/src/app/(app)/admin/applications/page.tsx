import { reviewApplication } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const applications = await prisma.application.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { inviteCode: true, businessCard: { select: { id: true, deletedAt: true, sizeBytes: true } } },
  });

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Queue" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
      <PageHeader title="Applications" />
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      {applications.length === 0 ? <p className="mt-6 text-sm text-mut">No applications waiting.</p> : null}
      <ul className="mt-4 space-y-4">
        {applications.map((application) => (
          <li key={application.id} className={`${card} p-4`}>
            <h2 className="font-serif text-xl font-normal">{application.name}</h2>
            <p className="text-sm text-mut">
              {application.email}
              {application.phone ? ` · ${application.phone}` : ""}
              {application.linkedinUrl ? ` · ${application.linkedinUrl}` : ""} · {roleLabel(application.role)} · {application.org} · {application.location}
            </p>
            <p className="mt-2 text-sm text-ink">
              <b>Business card:</b>{" "}
              {application.businessCard && !application.businessCard.deletedAt && application.businessCard.sizeBytes > 0
                ? "On file. It appears on the verification case after approval, and members never see it."
                : "No business card uploaded."}
            </p>
            <p className="text-sm text-ink">
              <b>References:</b> {application.referenceEmails.length ? application.referenceEmails.join(", ") : "Not provided"}
            </p>
            <p className="text-sm text-ink">
              <b>Invite:</b> {application.inviteCode.code}
            </p>
            <p className="text-sm text-ink">
              <b>Anyone who can speak for you:</b> {application.statement.trim() || "Not provided"}
            </p>
            <form action={reviewApplication} className="mt-3 space-y-2">
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
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
