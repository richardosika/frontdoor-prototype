import Link from "next/link";
import { redirect } from "next/navigation";
import { respondIntroduction } from "@/actions/social";
import { Banner } from "@/components/banner";
import { MyCircleList } from "@/components/my-circle";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { serverTx } from "@/lib/i18n/server";
import { loadMyCircle } from "@/lib/ledger-projects";
import { isDeveloperRole } from "@/lib/member-reach";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * #28: no member browses the full member list. Developers find people through "Find your team"; everyone else
 * sees "My Circle": only people connected through a project. The full directory stays in admin.
 */
export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  if (isDeveloperRole(user.role) && !user.isAdmin) redirect("/deals#my-circle");
  const tx = await serverTx();
  const params = await searchParams;
  const [people, incoming] = await Promise.all([
    loadMyCircle(user),
    prisma.introduction.findMany({ where: { toId: user.id, status: "PENDING" }, include: { from: true } }),
  ]);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-8 pt-3 md:pt-6 lg:px-8" data-testid="my-circle">
      <PageHeader title={tx("My Circle")} />
      <p className="mt-1 text-[16px] leading-relaxed text-ink">
        {tx("People connected to you through a project, with the projects you share. Email and phone stay private; messages stay inside Private Floor.")}
      </p>
      {user.isAdmin ? (
        <Link href="/admin/members" className="mt-2 inline-block text-[14px] font-semibold text-forest underline decoration-brass">
          {tx("Full member directory (admin)")}
        </Link>
      ) : null}
      <div className="mt-3">
        <Banner error={error ? tx(error) : undefined} notice={notice ? tx(notice) : undefined} />
      </div>
      {incoming.length ? (
        <section className="mb-4 mt-3 rounded border border-brass bg-brass-soft p-4">
          <h2 className="text-sm font-semibold">{tx("Introduction requests")}</h2>
          <ul className="mt-2 space-y-3">
            {incoming.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-semibold">{item.from.name}</span>
                <span className="text-mut"> · {tx(roleShort(roleLabel(item.from.role)))}</span>
                <p className="mt-1 text-ink">{item.note}</p>
                <span className="mt-2 flex gap-2">
                  <form action={respondIntroduction}>
                    <input type="hidden" name="introductionId" value={item.id} />
                    <button className={btnOutline} name="decision" value="DECLINED" type="submit">
                      {tx("Decline")}
                    </button>
                  </form>
                  <form action={respondIntroduction}>
                    <input type="hidden" name="introductionId" value={item.id} />
                    <button className={btn} name="decision" value="ACCEPTED" type="submit">
                      {tx("Accept")}
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mt-4">
        <MyCircleList people={people} />
      </div>
    </div>
  );
}
