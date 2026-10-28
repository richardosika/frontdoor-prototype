import { addCredential, addLicence, requestProjectShowcase, saveVendorProfile } from "@/actions/vendor";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { SIZE_BANDS } from "@/lib/domain";
import { US_STATES } from "@/lib/member-network";
import { LICENSE_KIND_LABELS, isVendorRole } from "@/lib/platform/showcase";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VendorEditPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser();
  if (!isVendorRole(user.role)) redirect("/profile");
  const params = await searchParams;
  const profile = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  const [licences, projects] = await Promise.all([
    prisma.license.findMany({ where: { userId: user.id }, select: { id: true, kind: true, stateCode: true, status: true } }),
    prisma.trackProject.findMany({ where: { userId: user.id }, select: { id: true, name: true, inShowcase: true, showcaseRequested: true } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Showcase profile" />
      <p className="mt-2 text-sm text-ink">
        Developers see this only after your membership is verified and a Private Floor administrator approves the listing. A self-reported licence shows as Listed by member.
      </p>
      <Banner error={params.error} notice={params.notice} />
      <p className="mt-3 text-sm text-mut">Listing status: {profile?.showcaseStatus || "HIDDEN"}</p>
      <form action={saveVendorProfile} className="mt-4 grid gap-3 rounded border border-line bg-cream p-4">
        <label>
          <span className={labelCls}>Headline</span>
          <input name="headline" defaultValue={profile?.headline || ""} className={field} />
        </label>
        <label>
          <span className={labelCls}>Services</span>
          <textarea name="services" defaultValue={profile?.services || ""} className={field} rows={4} />
        </label>
        <label>
          <span className={labelCls}>Project size</span>
          <select name="projectSizeBand" defaultValue={profile?.projectSizeBand || ""} className={field}>
            <option value="">Any</option>
            {SIZE_BANDS.map((band) => (
              <option key={band.id} value={band.id}>
                {band.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Years in business</span>
          <input name="yearsInBusiness" type="number" min={0} max={80} defaultValue={profile?.yearsInBusiness ?? ""} className={field} />
        </label>
        <label>
          <span className={labelCls}>Availability</span>
          <select name="availability" defaultValue={profile?.availability || "OPEN"} className={field}>
            <option value="OPEN">Open</option>
            <option value="SELECTIVE">Selective</option>
            <option value="BOOKED">Booked</option>
          </select>
        </label>
        <label>
          <span className={labelCls}>Availability note</span>
          <input name="availabilityNote" defaultValue={profile?.availabilityNote || ""} className={field} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="acceptingRequests" defaultChecked={profile?.acceptingRequests ?? true} />
          Accepting introduction requests
        </label>
        <button className={btn} type="submit">
          Save showcase profile
        </button>
      </form>
      <h2 className="mt-6 font-serif text-xl">Projects</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {projects.map((project) => (
          <li key={project.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {project.name}
              {project.inShowcase ? " · shown" : project.showcaseRequested ? " · waiting for review" : ""}
            </span>
            {project.inShowcase ? null : (
              <form action={requestProjectShowcase}>
                <input type="hidden" name="projectId" value={project.id} />
                <button className={btn} type="submit">
                  Ask to show this project
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-serif text-xl">Licences</h2>
      <ul className="mt-2 text-sm">
        {licences.map((licence) => (
          <li key={licence.id}>
            {licence.stateCode} · {LICENSE_KIND_LABELS[licence.kind] || licence.kind} · {licence.status === "VERIFIED" ? "Verified" : "Listed by member"}
          </li>
        ))}
      </ul>
      <form action={addLicence} className="mt-3 grid gap-2 rounded border border-line bg-paper p-3">
        <label>
          <span className={labelCls}>State</span>
          <select name="stateCode" className={field}>
            {US_STATES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Type</span>
          <select name="kind" className={field}>
            {Object.entries(LICENSE_KIND_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Scope</span>
          <input name="scope" className={field} />
        </label>
        <label>
          <span className={labelCls}>Number, kept private</span>
          <input name="number" className={field} />
        </label>
        <label>
          <span className={labelCls}>Expiry</span>
          <input name="expiresOn" type="date" className={field} />
        </label>
        <button className={btn} type="submit">
          Add licence
        </button>
      </form>
      <h2 className="mt-6 font-serif text-xl">Credentials</h2>
      <form action={addCredential} className="mt-3 grid gap-2 rounded border border-line bg-paper p-3">
        <label>
          <span className={labelCls}>Kind</span>
          <select name="kind" className={field} defaultValue="INSURANCE">
            <option value="INSURANCE">Insurance</option>
            <option value="BONDING">Bonding</option>
            <option value="CERTIFICATION">Certification</option>
            <option value="AWARD">Award</option>
          </select>
        </label>
        <label>
          <span className={labelCls}>Label</span>
          <input name="label" className={field} required />
        </label>
        <label>
          <span className={labelCls}>Issuer</span>
          <input name="issuer" className={field} />
        </label>
        <button className={btn} type="submit">
          Add credential
        </button>
      </form>
    </div>
  );
}
