import { contactAboutProject } from "@/actions/projects";
import { btn, btnOutline, field } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";

export type ReachProject = { id: string; name: string; status: string };

function statusWord(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return "Contacted";
}

export async function StatusPill({ status }: { status: string }) {
  const tx = await serverTx();
  const tone = status === "ACCEPTED" ? "border-forest bg-forest text-paper" : status === "DECLINED" ? "border-line bg-cream text-mut" : "border-brass bg-brass-soft text-ink";
  return (
    <span data-testid="outreach-status" className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold ${tone}`}>
      {tx(status === "PENDING" ? "Sent" : statusWord(status))}
    </span>
  );
}

/**
 * #39c: Reach out with an optional short note. With several projects the sender picks which one it is about.
 * Only projects passed in are offered; the server action enforces the contact rule again.
 */
export async function ReachOut({
  projects,
  toId,
  back,
  label,
  primary = false,
  align = "end",
}: {
  projects: ReachProject[];
  toId?: string;
  back: string;
  label?: string;
  primary?: boolean;
  align?: "start" | "end";
}) {
  const tx = await serverTx();
  const open = projects.filter((project) => !project.status);
  if (open.length === 0) return null;
  const title = label ?? (open.length === 1 ? tx("Reach out") : tx("Reach out about a project"));
  return (
    <details className="group w-full min-w-0 sm:w-auto" data-testid="reach-out">
      <summary className={`${primary ? btn : btnOutline} w-full cursor-pointer list-none whitespace-normal text-center sm:w-auto [&::-webkit-details-marker]:hidden`}>{title}</summary>
      <form action={contactAboutProject} className={`mt-2 grid w-full gap-2 rounded border border-line bg-cream p-3 sm:w-80 ${align === "end" ? "sm:ml-auto" : ""}`}>
        <input type="hidden" name="back" value={back} />
        {toId ? <input type="hidden" name="toId" value={toId} /> : null}
        {open.length === 1 ? (
          <>
            <input type="hidden" name="projectId" value={open[0].id} />
            <p className="text-[14px] text-mut">
              {tx("About")}: <b className="text-ink">{open[0].name}</b>
            </p>
          </>
        ) : (
          <label className="grid gap-1 text-[14px] text-mut">
            {tx("Which project?")}
            <select name="projectId" className={`${field} text-[16px]`} required data-testid="reach-out-project">
              {open.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1 text-[14px] text-mut">
          {tx("Add a short note (optional)")}
          <textarea name="note" rows={3} maxLength={500} className={`${field} text-[16px]`} placeholder={tx("A short note. It stays inside Private Floor.")} data-testid="reach-out-note" />
        </label>
        <button className={btn} type="submit" data-testid="reach-out-send">
          {tx("Send request")}
        </button>
      </form>
    </details>
  );
}
