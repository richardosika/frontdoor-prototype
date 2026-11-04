import { SubmitButton } from "@/components/submit-button";
import { PLAN_ACCEPT } from "@/lib/bid-plans";
import Link from "next/link";
import { createBidRequest } from "@/actions/bids";
import { Banner } from "@/components/banner";
import { h2 } from "@/components/bids-ui";
import { btn, card, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { approvedTemplates, bidAccess } from "@/lib/bids-db";
import { parseFields, MAX_QUESTIONS } from "@/lib/bids";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { memberCategories, seekLabel } from "@/lib/project-contact";
import { roleLabel } from "@/lib/roles";
import { parseFacts } from "@/lib/project-facts";

export const dynamic = "force-dynamic";

/** #51 Screen 1: request proposals. Template, recipients (already on the project or accepted connections), due date, up to 3 questions. */
export default async function NewBidRequest({ searchParams }: { searchParams: Promise<{ project?: string; error?: string; template?: string }> }) {
  const user = await requireUser();
  const tx = await serverTx();
  const q = await searchParams;
  const access = q.project ? await bidAccess(q.project, user.id) : null;
  if (!access) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
        <p className="text-[16px] text-ink">{tx("You can request bids only on projects you own or are active on.")}</p>
        <Link href="/bids" className="mt-3 inline-block text-forest underline decoration-brass">{tx("Bids")}</Link>
      </div>
    );
  }
  const [templates, people, project] = await Promise.all([
    approvedTemplates(),
    prisma.user.findMany({ where: { id: { in: [...access.allowed] }, status: "ACTIVE" }, select: { id: true, name: true, org: true, role: true, extraCategories: true }, orderBy: { name: "asc" } }),
    prisma.trackProject.findUnique({ where: { id: access.project.id }, select: { roleFacts: true, valueLabel: true } }),
  ]);
  const facts = parseFacts(project?.roleFacts) as Record<string, unknown>;
  const unitsGuess = String(facts.units ?? "").replace(/\D/g, "");
  const sfGuess = "";
  const chosen = templates.find((t) => t.category === q.template) ?? templates.find((t) => t.category === "GENERAL_CONTRACTOR") ?? templates[0];
  const onProject = people.filter((p) => access.onProject.has(p.id));
  const connections = people.filter((p) => !access.onProject.has(p.id));
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const opt = "flex cursor-pointer gap-3 rounded border border-line bg-paper p-3 has-[:checked]:border-2 has-[:checked]:border-brass has-[:checked]:bg-cream";
  const Person = ({ p }: { p: (typeof people)[number] }) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line py-2 last:border-0" data-testid={`recipient-${p.id}`}>
      <input type="checkbox" name="recipient" value={p.id} className="h-5 w-5 accent-forest" />
      <span className="min-w-0">
        <span className="block font-semibold text-forest [overflow-wrap:anywhere]">{p.org || p.name}</span>
        <span className="block text-[14px] text-mut">{p.name} · {memberCategories(p).map((c) => tx(seekLabel(c))).join(", ") || tx(roleLabel(p.role))}</span>
      </span>
    </label>
  );
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="bid-request-new">
      <Link href={`/projects/${access.project.id}`} className="inline-flex min-h-11 items-center text-[15px] text-forest underline decoration-brass">‹ {access.project.name}</Link>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Request proposals")}</p>
      <h1 className="font-serif text-[30px] leading-tight text-forest sm:text-[36px]">{access.project.name}</h1>
      <p className="mt-1 text-[15px] text-mut">{tx("Only members accepted onto this project can see this request and submit a proposal.")} {tx("General contractor requests are open to every verified general contractor.")}</p>
      {q.error ? <div className="mt-3"><Banner error={tx(q.error)} /></div> : null}
      <form action={createBidRequest} className="mt-4" encType="multipart/form-data">
        <input type="hidden" name="projectId" value={access.project.id} />
        <section className={`${card} p-4 sm:p-5`}>
          <h2 className={h2}>1 · {tx("Choose an approved template")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="template-options">
            {templates.map((t) => (
              <label key={t.id} className={opt}>
                <input type="radio" name="templateId" value={t.id} defaultChecked={t.id === chosen?.id} className="mt-1 h-4 w-4 accent-forest" />
                <span className="min-w-0">
                  <b className="block text-forest">{tx(t.name)} · v{t.version}</b>
                  <small className="block text-[13px] text-mut">{parseFields(t.fields).filter((f) => f.type !== "profile").slice(0, 6).map((f) => tx(f.label)).join(", ")}</small>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 border-l-[3px] border-brass bg-cream px-3 py-2 text-[14px] text-ink">{tx("Templates are maintained by Private Floor staff so every proposal uses the same fields. Standard form required; bidders may also attach their own PDF bid.")}</p>
        </section>

        <section className={`${card} mt-4 p-4 sm:p-5`}>
          <h2 className={h2}>2 · {tx("Send to")}</h2>
          {people.length === 0 ? <p className="text-[15px] text-mut">{tx("Nobody is on this project yet. Accept members onto the project first, then request bids.")}</p> : null}
          {onProject.length ? <p className={labelCls}>{tx("Accepted on this project")}</p> : null}
          {onProject.map((p) => <Person key={p.id} p={p} />)}
          {connections.length ? <p className={`${labelCls} mt-4`}>{tx("Your accepted connections")}</p> : null}
          {connections.map((p) => <Person key={p.id} p={p} />)}
          <label className="mt-4 block max-w-xs">
            <span className={labelCls}>{tx("Proposals due")}</span>
            <input type="date" name="dueAt" required min={minDate} defaultValue={due} className={field} />
            <span className="mt-1 block text-[13px] text-mut">{tx("5:00 PM ET on the due date")}</span>
          </label>
        </section>

        <section className={`${card} mt-4 p-4 sm:p-5`}>
          <h2 className={h2}>3 · {tx("Custom questions (up to 3)")}</h2>
          {Array.from({ length: MAX_QUESTIONS }, (_, i) => (
            <label key={i} className="mb-3 block">
              <span className={labelCls}>Q{i + 1} {i === 2 ? `· ${tx("optional")}` : ""}</span>
              <input name="question" maxLength={500} className={field} placeholder={i === 0 ? tx("Can you hold pricing through closing?") : ""} />
            </label>
          ))}
          <p className="text-[13px] text-mut">{tx("Short answer, 500 characters max")}</p>
        </section>

        <section className={`${card} mt-4 p-4 sm:p-5`} data-testid="bid-plans-upload">
          <h2 className={h2}>{tx("Construction plans")}</h2>
          <input type="file" name="plans" multiple accept={PLAN_ACCEPT} className="block w-full text-[15px] file:mr-3 file:min-h-11 file:rounded-sm file:border file:border-forest file:bg-paper file:px-4 file:font-semibold file:text-forest" />
          <p className="mt-2 text-[13px] text-mut">{tx("PDF, DWG or images, up to 5 files and 25 MB each. General contractor requests are open: any verified general contractor can view the plans and bid. No approval step.")}</p>
        </section>

        <section className={`${card} mt-4 p-4 sm:p-5`}>
          <h2 className={h2}>{tx("Project basis shared with bidders")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className={labelCls}>{tx("Units")}</span><input name="units" inputMode="numeric" defaultValue={unitsGuess} className={field} /></label>
            <label><span className={labelCls}>{tx("Gross SF")}</span><input name="squareFeet" inputMode="numeric" defaultValue={sfGuess} className={field} /></label>
            <label><span className={labelCls}>{tx("Drawings / basis")}</span><input name="basisNote" maxLength={300} className={field} placeholder={tx("e.g. 100% DD set")} /></label>
          </div>
          <p className="mt-2 text-[13px] text-mut">{tx("Units and SF let the comparison normalize prices per unit and per SF.")}</p>
        </section>
        <div className="mt-4 flex justify-end">
          <SubmitButton className={btn} data-testid="send-bid-request" pendingLabel="Sending request…">{tx("Send request")}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
