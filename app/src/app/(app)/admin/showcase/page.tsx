import { approveShowcaseProject, reviewShowcase, verifyCredential } from "@/actions/vendor-admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { toPublicVerification, type VerificationStatus } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function AdminShowcasePage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [profiles, projects, credentials] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { showcaseStatus: { in: ["PENDING", "LISTED"] } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            org: true,
            role: true,
            memberVerification: { select: { status: true, verifiedAt: true, expiresAt: true, checks: { select: { result: true } } } },
          },
        },
      },
      orderBy: { userId: "asc" },
    }),
    prisma.trackProject.findMany({ where: { showcaseRequested: true, inShowcase: false }, include: { user: { select: { name: true } } } }),
    prisma.vendorCredential.findMany({ where: { verifiedAt: null, visible: true }, include: { user: { select: { name: true } } }, take: 40 }),
  ]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Vendor showcase" />
      <p className="mt-2 text-sm text-ink">A listing needs both a verified membership file and your approval. There is no paid placement.</p>
      <Banner error={params.error} notice={params.notice} />
      <ul className="mt-4 divide-y divide-line">
        {profiles.map((profile) => {
          const badge = toPublicVerification(
            profile.user.memberVerification
              ? { ...profile.user.memberVerification, status: profile.user.memberVerification.status as VerificationStatus }
              : null,
          );
          return (
            <li key={profile.userId} className="py-3 text-sm">
              <b>{profile.user.name}</b>
              <span className="text-mut"> · {profile.user.org} · {profile.showcaseStatus}</span>
              <p className="text-xs text-mut">{badge.showBadge ? "Membership file verified" : "Verification in progress"}</p>
              <p className="mt-1 text-ink">{profile.headline}</p>
              <div className="mt-2 flex gap-2">
                <form action={reviewShowcase}>
                  <input type="hidden" name="userId" value={profile.userId} />
                  <button className={btn} name="decision" value="LISTED" type="submit">
                    Approve listing
                  </button>
                </form>
                <form action={reviewShowcase}>
                  <input type="hidden" name="userId" value={profile.userId} />
                  <button className={btnOutline} name="decision" value="HIDDEN" type="submit">
                    Hide
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      <h2 className="mt-6 font-serif text-xl">Projects waiting</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {projects.map((project) => (
          <li key={project.id}>
            {project.name} · {project.user.name}
            <form action={approveShowcaseProject} className="mt-1">
              <input type="hidden" name="projectId" value={project.id} />
              <button className={btnOutline} type="submit">
                Approve project
              </button>
            </form>
          </li>
        ))}
      </ul>
      {projects.length === 0 ? <p className="mt-2 text-sm text-mut">None waiting.</p> : null}
      <h2 className="mt-6 font-serif text-xl">Credentials waiting</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {credentials.map((row) => (
          <li key={row.id}>
            {row.label} · {row.user.name}
            {row.evidenceUrl ? <span className="block text-xs text-mut">Evidence on file for admin review.</span> : null}
            <form action={verifyCredential} className="mt-1">
              <input type="hidden" name="credentialId" value={row.id} />
              <button className={btnOutline} type="submit">
                Mark checked
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
