import { startLocked } from "@/lib/start-gate";
import { StartLocked } from "@/components/start-locked";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { respondIntroduction } from "@/actions/social";
import { Banner } from "@/components/banner";
import { MyCircleList } from "@/components/my-circle";
import { PageHeader } from "@/components/page-header";
import { IntroduceMembers } from "@/components/introduce-members";
import { RecommendedConnections } from "@/components/recommended-connections";
import { btn, btnOutline } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { serverTx } from "@/lib/i18n/server";
import { loadMyCircle } from "@/lib/ledger-projects";
import { isDeveloperRole } from "@/lib/member-reach";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * #28: developers find people through "Find your team"; other members use "My Circle" for project connections.
 * Member Directory is at /directory, in the desktop sidebar and the More menu on phones.
 */
export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  if (isDeveloperRole(user.role) && !user.isAdmin) redirect("/deals#my-circle");
  const tx = await serverTx();
  const params = await searchParams;
  if (await startLocked(user)) {
    return (
      <div className="mx-auto max-w-[980px] px-4 pb-8 pt-3 md:pt-6 lg:px-8" data-testid="my-circle">
        <PageHeader title={tx("My Circle")} />
        <StartLocked />
      </div>
    );
  }
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
      <ul className="mt-3 grid gap-2 rounded border border-line bg-paper p-4 text-[15px] leading-relaxed text-ink sm:grid-cols-3" data-testid="circle-how">
        <li><b className="block text-forest">{tx("How people join")}</b>{tx("When a request about a project is accepted, whichever side sent it.")}</li>
        <li><b className="block text-forest">{tx("What you can do")}</b>{tx("Message anyone in your circle, see the projects you share, and introduce two members you know.")}</li>
        <li><b className="block text-forest">{tx("Remove or block")}</b>{tx("Remove someone quietly from your circle, or block them from their profile to stop all contact.")}</li>
      </ul>
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
                    <SubmitButton className={btnOutline} name="decision" value="DECLINED">
                      {tx("Decline")}
                    </SubmitButton>
                  </form>
                  <form action={respondIntroduction}>
                    <input type="hidden" name="introductionId" value={item.id} />
                    <SubmitButton className={btn} name="decision" value="ACCEPTED">
                      {tx("Accept")}
                    </SubmitButton>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <RecommendedConnections user={user} />
      <div className="mt-4">
        <MyCircleList people={people} />
      </div>
      <IntroduceMembers people={people.map((p) => ({ id: p.id, name: p.name, org: p.org }))} />
    </div>
  );
}
