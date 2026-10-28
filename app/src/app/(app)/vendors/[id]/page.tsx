import Link from "next/link";
import { notFound } from "next/navigation";
import { introduceMember } from "@/actions/social";
import { VerifiedMark } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { btn, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import {
  AVAILABILITY_LABELS,
  inVendorShowcase,
  isVendorRole,
  publicCredentials,
  publicLicences,
  publicProjects,
} from "@/lib/platform/showcase";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import { toPublicVerification, type VerificationStatus } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      vendorProfile: true,
      licenses: { select: { kind: true, stateCode: true, scope: true, status: true, expiresOn: true, verifiedAt: true, recheckOn: true, showOnProfile: true } },
      vendorCredentials: { select: { kind: true, label: true, issuer: true, verifiedAt: true, visible: true } },
      projects: { include: { confirmations: { select: { status: true, reviewStatus: true, showName: true, counterpartyName: true } } } },
      memberVerification: { select: { status: true, verifiedAt: true, expiresAt: true, checks: { select: { result: true } } } },
      specialties: { include: { specialty: true } },
    },
  });
  if (!member || !member.vendorProfile) notFound();
  const badge = toPublicVerification(
    member.memberVerification ? { ...member.memberVerification, status: member.memberVerification.status as VerificationStatus } : null,
  );
  const listed = inVendorShowcase({ role: member.role, showcaseStatus: member.vendorProfile.showcaseStatus, verified: badge.showBadge });
  const self = viewer.id === member.id;
  if (!listed && !self && !viewer.isAdmin) notFound();
  if (!self && !viewer.isAdmin && viewer.role !== "DEVELOPER") notFound();
  const now = new Date();
  const licences = publicLicences(member.licenses, now);
  const credentials = publicCredentials(member.vendorCredentials);
  const projects = publicProjects(member.projects);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/vendors" className="text-sm text-mut">
        ‹ Vendor showcase
      </Link>
      <PageHeader title={member.name} />
      <p className="mt-1 text-sm text-mut">
        {member.org} · {roleLabel(member.role)} · {member.homeCity} {member.location}
      </p>
      <p className="mt-2 text-sm font-semibold text-forest">{AVAILABILITY_LABELS[member.vendorProfile.availability]}</p>
      {member.vendorProfile.headline ? <p className="mt-3 font-serif text-2xl">{member.vendorProfile.headline}</p> : null}
      {member.vendorProfile.services ? <p className="mt-2 text-sm text-ink">{member.vendorProfile.services}</p> : null}
      <div className="mt-3">
        <VerifiedMark view={badge} />
      </div>
      {member.specialties.length ? <p className="mt-3 text-sm text-ink">{member.specialties.map((row) => row.specialty.label).join(" · ")}</p> : null}
      <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Licences</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {licences.map((licence) => (
          <li key={`${licence.stateCode}-${licence.kind}`}>
            {licence.stateCode} · {licence.kind}
            {licence.scope ? ` · ${licence.scope}` : ""} · {licence.label}
            {licence.checkedOn ? ` · checked ${licence.checkedOn}` : ""}
          </li>
        ))}
      </ul>
      {licences.length === 0 ? <p className="mt-2 text-sm text-mut">No licence is shown.</p> : null}
      <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Credentials</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {credentials.map((item) => (
          <li key={item.label}>
            {item.label}
            {item.issuer ? ` · ${item.issuer}` : ""}
            {item.verifiedOn ? " · Verified" : " · Listed by member"}
          </li>
        ))}
      </ul>
      <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Projects</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {projects.map((project) => (
          <li key={project.name}>
            <b>{project.name}</b>
            <span className="block text-mut">
              {project.location} · {project.year} · {project.asset}
            </span>
            {project.namedReferences.map((name) => (
              <span key={name} className="block text-ink">
                Confirmed by {name}
              </span>
            ))}
            {project.unnamedReferences ? <span className="block text-mut">A counterparty confirmed this project.</span> : null}
          </li>
        ))}
      </ul>
      {self || isVendorRole(viewer.role) ? null : (
        <form action={introduceMember} className="mt-6 grid gap-2">
          <input type="hidden" name="userId" value={member.id} />
          <input type="hidden" name="back" value={`/vendors/${member.id}`} />
          <textarea name="note" className={field} rows={3} required placeholder="Short note" />
          <button className={btn} type="submit">
            Request introduction
          </button>
        </form>
      )}
    </div>
  );
}
