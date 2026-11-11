import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@/components/banner";
import { LedgerProjects } from "@/components/ledger-projects";
import { ReviewTracker } from "@/components/review-tracker";
import { requireUser } from "@/lib/current-user";
import { loadLedgerProjects } from "@/lib/ledger-projects";
import { isDeveloperRole } from "@/lib/member-reach";
import { BRAND } from "@/lib/brand";
import { serverTx } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Nov 6: My Projects, the developer's own section in the sidebar. Add a project, see every project with who it is
 * seeking, and review the interest requests members send (accept or decline). The Ledger keeps a highlights card.
 */
export default async function MyProjectsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  // Other members list past work on their profile.
  if (!isDeveloperRole(user.role)) redirect("/profile#past-work");
  const tx = await serverTx();
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const data = await loadLedgerProjects(user, { limit: 6, receivedLimit: 200 });
  const submitted = one("submitted") ? data.myProjects.find((project) => project.id === one("submitted")) : undefined;
  const firstName = user.name.split(" ")[0] || user.name;
  return (
    <div className="mx-auto max-w-[900px] px-4 pb-8 pt-4 md:px-8 md:pt-8" data-testid="my-projects-page">
      <header className="mb-5 border-b-[3px] border-double border-brass pb-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-brass">{BRAND.name}</p>
        <h1 className="mt-1 font-serif text-[34px] font-normal italic leading-tight tracking-wide md:text-[44px]">{tx("My Projects")}</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-ink">{tx("Add projects, choose who each one is seeking, and review the members who expressed interest.")}</p>
      </header>
      <Banner error={one("error") ? tx(one("error")) : undefined} notice={one("notice") ? tx(one("notice")) : undefined} />
      {submitted ? (
        <section className="relative mb-6 rounded border border-brass bg-brass-soft p-4 pr-12 md:p-5 md:pr-14" data-testid="submitted-thanks">
          <Link href="/projects" aria-label={tx("Dismiss")} className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-[22px] text-forest" data-testid="submitted-dismiss">
            ×
          </Link>
          <h2 className="font-serif text-[24px] leading-tight text-forest md:text-[26px]">{tx("Thank you, {name}.").replace("{name}", firstName)}</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-ink">
            {tx("{project} is with our team for review. We'll send you an alert and an email as soon as it's approved or if we need anything else.").replace("{project}", submitted.name)}
          </p>
          <div className="mt-3">
            <ReviewTracker status={submitted.reviewStatus} />
          </div>
          <Link href={`/projects/${submitted.id}`} className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-forest underline decoration-brass">
            {tx("View project")} ›
          </Link>
        </section>
      ) : null}
      <LedgerProjects data={data} role={user.role} extraCategories={user.extraCategories} variant="myProjects" openAdd={one("add") === "1" || data.myProjects.length === 0} />
    </div>
  );
}
