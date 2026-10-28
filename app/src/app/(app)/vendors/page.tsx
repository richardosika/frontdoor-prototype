import Link from "next/link";
import { Banner } from "@/components/banner";
import { VerifiedMark } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { btn, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { planLocationBackfill } from "@/lib/platform/backfill";
import { METROS, SPECIALTIES, directoryAssetOptions, legacyAssetSlugs } from "@/lib/platform/catalog";
import { AVAILABILITY_LABELS, VENDOR_ROLES, findVendorLabel, isVendorRole, publicLicences, showcaseResults, type ShowcaseVendor } from "@/lib/platform/showcase";
import { US_STATES } from "@/lib/member-network";
import { prisma } from "@/lib/prisma";
import { ROLES, roleLabel, roleShort } from "@/lib/roles";
import { toPublicVerification, type VerificationStatus } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; state?: string; metro?: string; assetClass?: string; specialty?: string; error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  if (isVendorRole(user.role)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Vendor showcase" />
        <p className="mt-2 text-sm text-ink">Developers browse the showcase. You edit the profile they can see after a Private Floor administrator approves it.</p>
        <Link href="/vendors/edit" className={`${btn} mt-4`}>
          Edit showcase profile
        </Link>
      </div>
    );
  }
  if (user.role !== "DEVELOPER" && !user.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Vendor showcase" />
        <p className="mt-2 text-sm text-ink">The vendor showcase is for developers.</p>
      </div>
    );
  }
  const role = params.role && isVendorRole(params.role) ? params.role : "";
  const rows = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] },
      vendorProfile: { showcaseStatus: "LISTED" },
      role: role ? (role as "GENERAL_CONTRACTOR") : { in: VENDOR_ROLES as unknown as ["GENERAL_CONTRACTOR"] },
    },
    include: {
      vendorProfile: true,
      memberMarkets: { include: { market: true } },
      assetFocus: { include: { assetType: true } },
      specialties: { include: { specialty: true } },
      memberVerification: { select: { status: true, verifiedAt: true, expiresAt: true, checks: { select: { result: true } } } },
      licenses: { select: { kind: true, stateCode: true, scope: true, status: true, expiresOn: true, verifiedAt: true, recheckOn: true, showOnProfile: true } },
    },
  });
  const now = new Date();
  const extras = new Map<string, { licences: ReturnType<typeof publicLicences>; badge: ReturnType<typeof toPublicVerification> }>();
  const vendors: ShowcaseVendor[] = rows.flatMap((member) => {
    if (!member.vendorProfile) return [];
    const parsed = planLocationBackfill(member);
    const badge = toPublicVerification(
      member.memberVerification ? { ...member.memberVerification, status: member.memberVerification.status as VerificationStatus } : null,
    );
    extras.set(member.id, { licences: publicLicences(member.licenses, now), badge });
    return [
      {
        id: member.id,
        role: member.role,
        name: member.name,
        initials: member.initials,
        org: member.org,
        bio: member.bio,
        location: member.location,
        markets: member.markets,
        dealTypes: member.dealTypes,
        assetClasses: member.assetClasses,
        checkSize: member.checkSize,
        lookingFor: "",
        offering: member.vendorProfile.services,
        nationwide: member.nationwide,
        homeCity: member.homeCity || parsed.homeCity,
        homeState: member.memberMarkets.find((row) => row.relation === "HOME" && row.market.kind === "STATE")?.market.code || parsed.homeState,
        homeMetro: member.memberMarkets.find((row) => row.relation === "HOME" && row.market.kind === "METRO")?.market.code || parsed.homeMetro || "",
        operateStates: member.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "STATE").map((row) => row.market.code),
        operateMetros: member.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "METRO").map((row) => row.market.code),
        operateCounties: [],
        assetSlugs: member.assetFocus.length ? member.assetFocus.map((row) => row.assetType.slug) : legacyAssetSlugs(member.assetClasses),
        specialtySlugs: member.specialties.map((row) => row.specialty.slug),
        verified: badge.showBadge,
        createdAt: member.createdAt,
        completeness: member.vendorProfile.headline ? 2 : 1,
        showcaseStatus: member.vendorProfile.showcaseStatus,
        availability: member.vendorProfile.availability,
        headline: member.vendorProfile.headline,
      },
    ];
  });
  const shown = showcaseResults(vendors, {
    role: role || undefined,
    state: params.state,
    metro: params.metro,
    asset: params.assetClass,
    specialty: params.specialty,
  });

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 lg:px-8">
      <PageHeader title="Vendor showcase" />
      <p className="mt-1 text-sm text-ink">
        {findVendorLabel(role)} by market, asset type, and specialty. A vendor is listed only after verification and approval. No placement fee changes the order.
      </p>
      <Banner error={params.error} notice={params.notice} />
      <form className="mt-4 grid gap-3 rounded border border-line bg-paper p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className={labelCls}>Trade</span>
          <select name="role" className={field} defaultValue={role}>
            <option value="">Any vendor</option>
            {ROLES.filter((item) => isVendorRole(item.id)).map((item) => (
              <option key={item.id} value={item.id}>
                {roleShort(item.label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>State</span>
          <select name="state" className={field} defaultValue={params.state || ""}>
            <option value="">Any</option>
            {US_STATES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Metro</span>
          <select name="metro" className={field} defaultValue={params.metro || ""}>
            <option value="">Any</option>
            {METROS.map((metro) => (
              <option key={metro.code} value={metro.code}>
                {metro.short}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Asset type</span>
          <select name="assetClass" className={field} defaultValue={params.assetClass || ""}>
            <option value="">Any</option>
            {directoryAssetOptions().map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Specialty</span>
          <select name="specialty" className={field} defaultValue={params.specialty || ""}>
            <option value="">Any</option>
            {SPECIALTIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className={btn} type="submit">
            Search vendors
          </button>
        </div>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {shown.map((vendor) => {
          const card = extras.get(vendor.id);
          return (
            <article key={vendor.id} className="rounded border border-line bg-paper p-4">
              <Link href={`/vendors/${vendor.id}`} className="font-serif text-xl">
                {vendor.name}
              </Link>
              <p className="text-sm text-mut">
                {vendor.org} · {roleShort(roleLabel(vendor.role))} · {vendor.homeCity} {vendor.homeState}
              </p>
              <p className="mt-1 text-xs font-semibold text-forest">{AVAILABILITY_LABELS[vendor.availability]}</p>
              {vendor.headline ? <p className="mt-2 text-sm text-ink">{vendor.headline}</p> : null}
              <div className="mt-2">{card ? <VerifiedMark view={card.badge} /> : null}</div>
              <p className="mt-2 flex flex-wrap gap-1">
                {(card?.licences ?? []).slice(0, 3).map((licence) => (
                  <span key={`${licence.stateCode}-${licence.kind}`} className="rounded-sm border border-line px-2 py-0.5 text-[11px]">
                    {licence.stateCode} · {licence.kind} · {licence.label}
                  </span>
                ))}
              </p>
            </article>
          );
        })}
      </div>
      {shown.length === 0 ? <p className="mt-6 text-sm text-mut">No listed vendors match those filters.</p> : null}
    </div>
  );
}
