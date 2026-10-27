import Link from "next/link";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { DemoChip, StatusChip } from "@/components/status-chip";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { ADMIN_INTROS, VERIFIED_EXPLANATION } from "@/lib/membership-copy";
import { isApprovedMember, isDemoRecord, personStageLabel, personStanding } from "@/lib/person-standing";
import { paymentStatusLabel } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";
import { memberListVerificationLabel } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function MembersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; demo?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const hideDemo = params.demo === "hide";
  const members = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      ownedApplication: { select: { status: true, isTest: true } },
      memberVerification: { select: { status: true, expiresAt: true } },
    },
  });
  const rows = members
    .map((member) => {
      const standing = personStanding({
        applicationStatus: member.ownedApplication?.status,
        accountStatus: member.status,
        paymentStatus: member.paymentStatus,
        hasMember: true,
        isAdmin: member.isAdmin,
      });
      const demo = isDemoRecord({ isTest: member.isTest || member.ownedApplication?.isTest, email: member.email });
      const fileLabel = memberListVerificationLabel(member.memberVerification);
      return { member, standing, demo, fileLabel };
    })
    .filter((row) => isApprovedMember(row.standing))
    .filter((row) => (hideDemo ? !row.demo : true));

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Members" />
      <div className="mx-auto max-w-4xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Members" />
        <p className="mt-1 text-sm text-ink">{ADMIN_INTROS.members}</p>
        <p className="mt-1 text-sm text-ink">
          One status: Approved. The brass Verified badge is separate. {VERIFIED_EXPLANATION}
        </p>
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <p className="mt-3 text-sm">
          <Link href={hideDemo ? "/admin/members" : "/admin/members?demo=hide"} className="underline decoration-brass">
            {hideDemo ? "Show demo members" : "Hide demo members"}
          </Link>
        </p>
        {rows.length === 0 ? <p className="mt-6 text-sm text-mut">No approved members{hideDemo ? " outside the demo set" : ""}.</p> : null}
        <ul className={`mt-4 divide-y divide-line ${card}`}>
          {rows.map(({ member, standing, demo, fileLabel }) => (
            <li key={member.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <Link href={`/admin/members/${member.id}`} className="underline decoration-brass/40">
                  {member.name}
                </Link>
                <StatusChip status={standing.status} />
                {demo ? <DemoChip /> : null}
                {member.isAdmin ? <span className="text-[10px] uppercase tracking-wider text-brass">Admin</span> : null}
              </div>
              <p className="mt-1 text-xs text-mut">
                {roleShort(roleLabel(member.role))} · {member.org} · {paymentStatusLabel(member.paymentStatus)} · {personStageLabel(standing.stage)}
              </p>
              <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${fileLabel === "Verified" ? "text-brass" : "text-ink"}`}>
                {fileLabel}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
