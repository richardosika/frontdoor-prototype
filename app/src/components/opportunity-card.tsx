import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { ReachOut } from "@/components/reach-out";
import { ProjectFacts } from "@/components/project-facts";
import { ConfirmDismiss } from "@/components/confirm-dismiss";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { parseFacts } from "@/lib/project-facts";
import { formatProjectValue, seekLabel } from "@/lib/project-contact";
import { isNewOpportunity } from "@/lib/opportunities";

export type OpportunityProject = {
  id: string;
  name: string;
  asset: string;
  location: string;
  year: number;
  valueLabel: string;
  roleFacts?: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  matchedCategory?: string | null;
  status?: string;
  user: { id: string; name: string; org?: string | null; role?: string };
};

function statusWord(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return "Pending";
}

/**
 * Nov 10 (Julia): one opportunity card for the Ledger and Opportunities, so both look the same. Each new project
 * (approved in the last 7 days) carries a "New" tag. The X hides the project: on the Ledger it leaves the Ledger only;
 * on Opportunities it asks "Are you sure you want to remove this project?" first.
 */
export async function OpportunityCard({
  project,
  fallbackCategory,
  back,
  dismissAction,
  confirmDismiss = false,
  now = Date.now(),
}: {
  project: OpportunityProject;
  fallbackCategory: string | null;
  back: string;
  dismissAction?: (formData: FormData) => Promise<void>;
  confirmDismiss?: boolean;
  now?: number;
}) {
  const tx = await serverTx();
  const locale = await currentLocale();
  const bid = parseFacts(project.roleFacts ?? "{}").bidDue;
  const closes = bid ? new Date(`${bid}T23:59:00`).getTime() - now : NaN;
  const isNew = isNewOpportunity(project, now);
  const soon = closes >= 0 && closes <= 14 * 86400000;
  const label = tx("Not interested: remove this project");
  return (
    <li className="relative flex min-w-0 flex-col rounded border border-line border-t-[4px] border-t-brass bg-paper p-4 md:p-5" data-testid="opportunity-card">
      {dismissAction ? (
        confirmDismiss ? (
          <div className="absolute right-1 top-1">
            <ConfirmDismiss
              action={dismissAction}
              fields={{ projectId: project.id, back }}
              label={label}
              question={tx("Are you sure you want to remove this project?")}
              yes={tx("Remove")}
              no={tx("Cancel")}
            />
          </div>
        ) : (
          <form action={dismissAction} className="absolute right-1 top-1">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton aria-label={label} title={label} className="grid h-11 w-11 place-items-center rounded-full text-[22px] leading-none text-mut hover:bg-cream hover:text-forest" pendingLabel="…" data-testid="opportunity-dismiss">
              ×
            </SubmitButton>
          </form>
        )
      ) : null}
      <div className="flex min-h-6 flex-wrap gap-2 pr-10">
        {isNew ? <span className="rounded-full bg-brass px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-paper" data-testid="tag-new">{tx("New")}</span> : null}
        {soon ? <span className="rounded-full bg-[#A2412C] px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-white" data-testid="tag-closes-soon">{tx("Closes soon")}</span> : null}
        {project.matchedCategory ? <span className="rounded-full border border-brass px-2.5 py-0.5 text-[12px] text-forest">{tx(seekLabel(project.matchedCategory))}</span> : null}
      </div>
      <Link href={`/projects/${project.id}`} className="mt-2 font-serif text-[24px] leading-snug underline decoration-brass underline-offset-2 hover:text-forest [overflow-wrap:anywhere]">{project.name}</Link>
      <p className="mt-1 text-[15px] text-mut [overflow-wrap:anywhere]">
        <Link href={`/members/${project.user.id}`} className="text-ink underline decoration-line">{project.user.name}</Link>
        {project.user.org ? ` · ${project.user.org}` : ""} · {project.location}
      </p>
      <p className="mt-1 text-[15px] text-ink">
        {tx(project.asset)}{project.valueLabel ? ` · ${formatProjectValue(project.valueLabel, locale)}` : ""} · {project.year}
      </p>
      <div className="mt-1 flex-1"><ProjectFacts category={project.matchedCategory ?? fallbackCategory} project={project} /></div>
      {project.status ? (
        <p className="mt-3 text-[15px] font-semibold text-forest">{tx("Contact request")}: {tx(statusWord(project.status))}</p>
      ) : (
        <div className="mt-3">
          <ReachOut projects={[{ id: project.id, name: project.name, status: "" }]} back={back} label={tx("Contact about this project")} primary align="start" />
        </div>
      )}
    </li>
  );
}
