import { notFound } from "next/navigation";
import { respondConfirmation } from "@/actions/profile";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const confirmation = await prisma.confirmation.findUnique({
    where: { token },
    include: { project: { include: { user: true } } },
  });
  if (!confirmation) notFound();
  const project = confirmation.project;

  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="bg-forest px-6 py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
        <h1 className="font-serif text-2xl font-normal">Confirm a project</h1>
        <p className="mt-2 text-sm text-ink">
          {project.user.name} ({project.user.org}) listed you, {confirmation.counterpartyName}, as a counterparty on this project. No {BRAND.short} account is required.
        </p>
        <div className="mt-4 rounded border border-line bg-cream p-3 text-sm">
          <b>{project.name}</b>
          <p className="mt-1 text-mut">
            {project.asset} · {project.location} · {project.year} · {project.valueLabel}
          </p>
          {project.summary ? <p className="mt-2 text-ink">{project.summary}</p> : null}
        </div>
        {confirmation.status !== "PENDING" ? (
          <p className="mt-4 rounded border border-brass bg-brass-soft px-3 py-2 text-sm">
            Recorded as {confirmation.status === "CONFIRMED" ? "confirmed" : "declined"}.
            {confirmation.note ? ` Note: ${confirmation.note}` : ""}
          </p>
        ) : (
          <form action={respondConfirmation} className="mt-4 space-y-3">
            <input type="hidden" name="token" value={token} />
            <div>
              <label className={labelCls}>Note (optional)</label>
              <textarea name="note" className={field} rows={3} placeholder="We closed this together in 2023." />
            </div>
            <div className="flex gap-2">
              <button className={`${btnOutline} flex-1`} name="decision" value="DECLINED" type="submit">
                Decline
              </button>
              <button className={`${btn} flex-1`} name="decision" value="CONFIRMED" type="submit">
                Confirm
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </main>
  );
}
