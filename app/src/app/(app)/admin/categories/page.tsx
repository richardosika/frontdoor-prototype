import Link from "next/link";
import { reviewMemberCategory } from "@/actions/category-review";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field } from "@/components/ui";
import { categoryNeedsCredentialCheck } from "@/lib/category-review";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { memberCategories, parseSeeking, seekLabel } from "@/lib/project-contact";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** #42 review: extra categories members asked for, approved or declined one at a time. */
export default async function CategoryReviewPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const members = await prisma.user.findMany({
    where: { pendingCategories: { not: "" } },
    select: {
      id: true, name: true, org: true, role: true, location: true, website: true, extraCategories: true, pendingCategories: true,
      licenses: true, credentialNote: true, insuranceInfo: true, specialties: true, yearsInBusiness: true,
    },
    orderBy: { name: "asc" },
  });
  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Category review" />
      <p className="mt-3 text-[15px] text-ink">
        Members can cover more than one category. A new category counts nowhere (matching, Find buttons, Opportunities, alerts, deal rooms, project access) until you approve it here. Licensed categories need the license, bond authority or bar admission checked against public records first. Each decision alerts and emails the member.
      </p>
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <section className={`${card} mt-4 p-4`} data-testid="category-queue">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">Pending review ({members.reduce((n, m) => n + parseSeeking(m.pendingCategories).length, 0)})</h2>
        {members.length === 0 ? <p className="mt-2 text-[15px] text-mut">Nothing waiting.</p> : null}
        <ul>
          {members.map((member) => (
            <li key={member.id} className="border-b border-line py-4 last:border-0" data-testid={`category-member-${member.id}`}>
              <p className="font-serif text-[22px] text-forest">
                <Link href={`/members/${member.id}`} className="underline decoration-brass">{member.name}</Link>
              </p>
              <p className="text-[15px] text-mut">
                {roleLabel(member.role)} · {member.org} · {member.location}
              </p>
              <p className="mt-1 text-[14px] text-mut">Counts today: {memberCategories(member).map(seekLabel).join(", ")}</p>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-[14px] sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="font-semibold text-forest">Licenses / credentials</dt>
                <dd className="[overflow-wrap:anywhere]">{member.licenses || "None given"}</dd>
                <dt className="font-semibold text-forest">Credential on file</dt>
                <dd className="[overflow-wrap:anywhere]">{member.credentialNote || "None"}</dd>
                <dt className="font-semibold text-forest">Insurance / bonding</dt>
                <dd className="[overflow-wrap:anywhere]">{member.insuranceInfo || "None given"}</dd>
                <dt className="font-semibold text-forest">Services</dt>
                <dd className="[overflow-wrap:anywhere]">{member.specialties || "None given"}</dd>
                <dt className="font-semibold text-forest">Website</dt>
                <dd className="[overflow-wrap:anywhere]">{member.website || "None"}</dd>
              </dl>
              {parseSeeking(member.pendingCategories).map((category) => (
                <form key={category} action={reviewMemberCategory} className="mt-3 rounded border border-brass bg-brass-soft p-3" data-testid={`category-review-${member.id}-${category}`}>
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="category" value={category} />
                  <p className="font-semibold text-forest">
                    {seekLabel(category)}
                    {categoryNeedsCredentialCheck(category) ? <span className="ml-2 text-[12px] uppercase tracking-wider text-brass">Licensed: check required</span> : null}
                  </p>
                  {categoryNeedsCredentialCheck(category) ? (
                    <label className="mt-2 flex min-h-11 items-center gap-3 text-[15px]">
                      <input type="checkbox" name="credentialChecked" className="h-5 w-5 shrink-0 accent-[#1F3A2E]" />
                      I checked this member&apos;s license or credential for {seekLabel(category)} against public records.
                    </label>
                  ) : null}
                  <input name="note" maxLength={400} className={`${field} mt-2`} placeholder="Note to the member (optional)" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className={btn} name="decision" value="approve" type="submit">Approve</button>
                    <button className={btnOutline} name="decision" value="decline" type="submit">Decline</button>
                  </div>
                </form>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
