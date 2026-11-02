import { MoneyInput } from "@/components/money-input";
import Link from "next/link";
import { decideBid, saveBid } from "@/actions/bids";
import { Banner } from "@/components/banner";
import { SECTIONS, SampleTag, StatusPill, h2, money, showValue } from "@/components/bids-ui";
import { btn, btnGhost, btnOutline, card, field, labelCls } from "@/components/ui";
import type { BidField } from "@/lib/bid-templates";
import { bestPerRow, canDecide, canEditBid, numeric, parseFields, parseJson, perUnit } from "@/lib/bids";
import { parseQuestions, profileFacts } from "@/lib/bids-db";
import { requireUser } from "@/lib/current-user";
import { canOpenRequest } from "@/lib/bid-plans";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Tx = (s: string) => string;
const BEST: Record<string, string> = { low: "★ lowest", high: "★ highest", short: "★ shortest" };

function NotAvailable({ tx }: { tx: Tx }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8" data-testid="bid-not-available">
      <p className="text-[16px] text-ink">{tx("This request is not available.")}</p>
      <Link href="/bids" className="mt-3 inline-block text-forest underline decoration-brass">{tx("Bids")}</Link>
    </div>
  );
}

export default async function BidRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser();
  const tx = await serverTx();
  const locale = await currentLocale();
  const { id } = await params;
  const q = await searchParams;
  const req = await prisma.bidRequest.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, location: true } },
      requester: { select: { id: true, name: true, org: true } },
      template: true,
      recipients: { select: { memberId: true } },
      plans: { select: { id: true, fileName: true, sizeBytes: true, contentType: true } },
    },
  });
  // Outsiders see nothing, not even that the request exists. Staff manage templates, not bids.
  if (!req) return <NotAvailable tx={tx} />;
  const isRequester = req.requesterId === user.id;
  // General-contractor requests are open: any verified GC can view the plans and bid without being picked.
  const isRecipient = !isRequester && canOpenRequest({ viewer: user, requesterId: req.requesterId, recipientIds: req.recipients.map((r) => r.memberId), templateCategory: req.template.category }) !== null;
  // Staff: read-only view of the comparison and PDFs. No actions on behalf of members.
  const isStaff = !isRequester && !isRecipient && user.isAdmin;
  if (!isRequester && !isRecipient && !isStaff) return <NotAvailable tx={tx} />;
  const fields = parseFields(req.template.fields);
  const questions = parseQuestions(req.questions);
  const due = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(req.dueAt);
  const head = (
    <>
      <Link href={isStaff ? "/admin/bids" : isRequester ? `/projects/${req.project.id}` : "/bids"} className="inline-flex min-h-11 items-center text-[15px] text-forest underline decoration-brass">‹ {isStaff ? "Admin · Bids" : isRequester ? req.project.name : tx("Bids")}</Link>
      {isStaff ? <p className="mt-2 border-l-[3px] border-brass bg-cream px-3 py-2 text-[14px]" data-testid="staff-readonly">Staff view · read-only. Requested by {req.requester.name} ({req.requester.org}). Members cannot see each other&apos;s bids; staff cannot act for them here.</p> : null}
      <PlansList plans={req.plans} tx={tx} />
      {q.error || q.notice ? <div className="mt-2"><Banner error={q.error ? tx(q.error) : undefined} notice={q.notice ? tx(q.notice) : undefined} /></div> : null}
    </>
  );
  if (isRequester || isStaff) return <Compare readOnly={isStaff} req={req} fields={fields} questions={questions} tx={tx} locale={locale} due={due} head={head} />;
  return <BidForm req={req} fields={fields} questions={questions} userId={user.id} tx={tx} locale={locale} due={due} head={head} />;
}

function PlansList({ plans, tx }: { plans: { id: string; fileName: string; sizeBytes: number; contentType: string }[]; tx: (s: string) => string }) {
  if (!plans.length) return null;
  return (
    <section className="mt-3 rounded border border-line bg-paper p-4" data-testid="bid-plans">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Construction plans")}</h2>
      <ul className="mt-1">
        {plans.map((plan) => (
          <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-0">
            <a href={`/api/bid-plans/${plan.id}`} target="_blank" rel="noreferrer" className="font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]" data-testid="bid-plan-link">
              {plan.fileName}
            </a>
            <span className="text-[13px] text-mut">{(plan.sizeBytes / 1024 / 1024).toLocaleString("en-US", { maximumFractionDigits: 1 })} MB</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Req = NonNullable<Awaited<ReturnType<typeof loadReq>>>;
async function loadReq(id: string) {
  return prisma.bidRequest.findUnique({ where: { id }, include: { project: { select: { id: true, name: true, location: true } }, requester: { select: { id: true, name: true, org: true } }, template: true, recipients: { select: { memberId: true } } } });
}

async function Compare({ readOnly = false, req, fields, questions, tx, locale, due, head }: { readOnly?: boolean; req: Req; fields: BidField[]; questions: string[]; tx: Tx; locale: string; due: string; head: React.ReactNode }) {
  const rows = await prisma.bid.findMany({
    where: { requestId: req.id, status: { not: "DRAFT" } },
    include: { bidder: { select: { id: true, name: true, org: true, insuranceCoverage: true, insuranceInfo: true, credentialNote: true } } },
  });
  const bids = rows
    .map((b) => {
      const values = parseJson<Record<string, unknown>>(b.values, {});
      const facts = profileFacts(b.bidder, tx);
      values.profileInsurance = facts.insurance;
      values.profileLicense = facts.license;
      const total = numeric(values.total);
      values.__perUnit = perUnit(total, req.units) ?? "";
      values.__perSf = perUnit(total, req.squareFeet) ?? "";
      return { ...b, values, answers: parseJson<string[]>(b.answers, []) };
    })
    .sort((a, b) => (numeric(a.values.total) ?? Infinity) - (numeric(b.values.total) ?? Infinity));
  const perUnitField: BidField = { key: "__perUnit", label: `${tx("Per unit")} (${req.units ?? ""})`, type: "money", section: "price", best: "low", required: false };
  const perSfField: BidField = { key: "__perSf", label: `${tx("Per SF")} (${(req.squareFeet ?? 0).toLocaleString("en-US")})`, type: "money", section: "price", best: "low", required: false };
  const extra = [...(req.units ? [perUnitField] : []), ...(req.squareFeet ? [perSfField] : [])];
  const all = fields.flatMap((f) => (f.key === "total" && f.perUnit ? [f, ...extra] : [f]));
  const best = bestPerRow(all, bids);
  const cell = (f: BidField, b: (typeof bids)[number]) => {
    const v = b.values[f.key];
    const shown = f.key.startsWith("__") && v !== "" ? money(Number(v), f.key === "__perSf", locale) : showValue(f, v, locale, tx);
    if (!shown) return f.required !== false && f.type !== "profile" ? { text: `⚠ ${tx("Not provided")}`, cls: "bg-[#FBEAE3] font-semibold text-[#9A3B1E]", missing: true } : { text: "—", cls: "text-mut", missing: false };
    const win = best[f.key]?.includes(b.id) && bids.length > 1;
    return { text: shown, tag: win ? tx(BEST[f.best!]) : "", cls: win ? "bg-[#E4EFE7] font-bold text-forest" : "", missing: false };
  };
  const Actions = ({ b }: { b: (typeof bids)[number] }) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      {(["SHORTLISTED", "DECLINED", "AWARDED"] as const).map((d) =>
        !readOnly && canDecide(b.status, req.status, d) ? (
          <form key={d} action={decideBid}>
            <input type="hidden" name="bidId" value={b.id} />
            <input type="hidden" name="decision" value={d} />
            <button className={d === "AWARDED" ? btn : d === "DECLINED" ? btnGhost : btnOutline} data-testid={`decide-${d}-${b.bidder.id}`}>{tx(d === "SHORTLISTED" ? "Shortlist" : d === "DECLINED" ? "Decline" : "Award")}</button>
          </form>
        ) : null,
      )}
      <StatusPill status={b.status} tx={tx} />
    </div>
  );
  const Pdf = ({ b }: { b: (typeof bids)[number] }) => (b.pdfName ? <a href={`/api/bid-files/${b.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brass underline">{tx("View full bid (PDF)")}</a> : <span className="italic text-mut">{tx("No PDF attached")}</span>);
  const phoneKeys = new Set(["total", "__perUnit", "__perSf", "duration"]);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="bid-compare">
      {head}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Compare proposals")}</p>
      <h1 className="font-serif text-[28px] leading-tight text-forest sm:text-[36px]">{req.project.name}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-mut">
        <span>{tx(req.template.name)} v{req.template.version} · {bids.length} {tx("of")} {req.recipients.length} {tx("received")} · {tx("Due")} {due}</span>
        {req.isSample ? <SampleTag tx={tx} /> : null}
        <StatusPill status={req.status} tx={tx} />
      </p>
      {questions.length ? <p className="mt-2 text-[14px] text-ink">{questions.map((qq, i) => `Q${i + 1} · ${qq}`).join("  ·  ")}</p> : null}
      {bids.length === 0 ? <section className={`${card} mt-4 p-5 text-[15px] text-mut`}>{tx("No proposals yet. You'll get an alert and an email as each one arrives.")}</section> : null}
      {bids.length ? (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded border border-line md:block" data-testid="compare-table">
            <table className="w-full min-w-[720px] border-collapse bg-paper text-[14px]">
              <thead>
                <tr className="bg-forest text-paper">
                  <th className="sticky left-0 bg-forest px-3 py-2.5 text-left font-medium">{tx("Field")}</th>
                  {bids.map((b) => <th key={b.id} className="px-3 py-2.5 text-right font-medium">{b.bidder.org || b.bidder.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map(([sec, label]) => {
                  const list = all.filter((f) => f.section === sec);
                  if (!list.length) return null;
                  return [
                    <tr key={sec}><td colSpan={bids.length + 1} className="bg-[#F1E8D2] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-forest">{tx(label)}</td></tr>,
                    ...list.map((f) => (
                      <tr key={f.key} className="border-b border-line align-top">
                        <td className="sticky left-0 bg-paper px-3 py-2 text-mut">{f.key.startsWith("__") ? f.label : tx(f.label)}</td>
                        {bids.map((b) => {
                          const c = cell(f, b);
                          return <td key={b.id} className={`px-3 py-2 text-right [overflow-wrap:anywhere] ${c.cls}`} data-testid={c.missing ? "cell-missing" : c.tag ? "cell-best" : undefined}>{c.text}{c.tag ? <span className="ml-1 text-[10px] font-semibold text-[#2A4A3B]">{c.tag}</span> : null}</td>;
                        })}
                      </tr>
                    )),
                  ];
                })}
                {questions.map((qq, i) => (
                  <tr key={`q${i}`} className="border-b border-line align-top">
                    <td className="sticky left-0 bg-paper px-3 py-2 text-mut">Q{i + 1} · {qq}</td>
                    {bids.map((b) => (b.answers[i] ? <td key={b.id} className="px-3 py-2 text-right">{b.answers[i]}</td> : <td key={b.id} className="bg-[#FBEAE3] px-3 py-2 text-right font-semibold text-[#9A3B1E]" data-testid="cell-missing">⚠ {tx("No answer")}</td>))}
                  </tr>
                ))}
                <tr className="border-b border-line"><td className="sticky left-0 bg-paper px-3 py-2 text-mut">{tx("Full bid (PDF)")}</td>{bids.map((b) => <td key={b.id} className="px-3 py-2 text-right"><Pdf b={b} /></td>)}</tr>
                <tr><td className="sticky left-0 bg-paper px-3 py-2" />{bids.map((b) => <td key={b.id} className="px-3 py-3 text-right"><Actions b={b} /></td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 md:hidden" data-testid="compare-cards">
            <p className="mb-2 text-[13px] text-mut">{tx("★ best value in green · ⚠ missing in red.")}</p>
            {bids.map((b) => (
              <section key={b.id} className={`${card} mb-3 p-4`}>
                <h2 className="font-serif text-[20px] text-forest">{b.bidder.org || b.bidder.name}</h2>
                {all.filter((f) => phoneKeys.has(f.key) || cell(f, b).missing).map((f) => {
                  const c = cell(f, b);
                  return <div key={f.key} className="flex justify-between gap-3 border-b border-line py-1.5 text-[14px]"><span className="text-mut">{f.key.startsWith("__") ? f.label : tx(f.label)}</span><span className={`text-right ${c.cls}`}>{c.text}{c.tag ? ` ${c.tag}` : ""}</span></div>;
                })}
                {questions.map((qq, i) => (b.answers[i] ? null : <div key={i} className="flex justify-between gap-3 border-b border-line py-1.5 text-[14px]"><span className="text-mut">Q{i + 1}</span><span className="font-semibold text-[#9A3B1E]">⚠ {tx("No answer")}</span></div>))}
                <div className="flex justify-between gap-3 py-2 text-[14px]"><span className="text-mut">{tx("Full bid")}</span><Pdf b={b} /></div>
                <Actions b={b} />
              </section>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-mut">{tx("Each proposal is private between you and that bidder. Award moves the project to Active for the winner; the others get a polite note.")}</p>
        </>
      ) : null}
    </div>
  );
}

async function BidForm({ req, fields, questions, userId, tx, locale, due, head }: { req: Req; fields: BidField[]; questions: string[]; userId: string; tx: Tx; locale: string; due: string; head: React.ReactNode }) {
  const [bid, me] = await Promise.all([
    prisma.bid.findUnique({ where: { requestId_bidderId: { requestId: req.id, bidderId: userId } }, select: { id: true, status: true, values: true, answers: true, pdfName: true, pdfSize: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { insuranceCoverage: true, insuranceInfo: true, credentialNote: true } }),
  ]);
  const values = parseJson<Record<string, unknown>>(bid?.values ?? "{}", {});
  const answers = parseJson<string[]>(bid?.answers ?? "[]", []);
  const facts = me ? profileFacts(me, tx) : { insurance: "", license: "" };
  const editable = canEditBid({ requestStatus: req.status, dueAt: req.dueAt, bidStatus: bid?.status });
  const input = (f: BidField) => {
    const v = values[f.key];
    const name = `f_${f.key}`;
    const req2 = f.required !== false;
    const dis = !editable;
    if (f.type === "profile") return <div className="min-h-11 rounded-sm border border-dashed border-line bg-cream px-3 py-2.5 text-[14px] text-forest">{(f.source === "insurance" ? facts.insurance : facts.license) || tx("Not on your profile yet")}</div>;
    if (f.type === "long") return <textarea name={name} defaultValue={String(v ?? "")} rows={3} maxLength={2000} disabled={dis} className={field} />;
    if (f.type === "checks") return <div>{(f.options ?? []).map((o) => <label key={o} className="flex min-h-11 items-center gap-2 text-[15px]"><input type="checkbox" name={name} value={o} defaultChecked={Array.isArray(v) && v.includes(o)} disabled={dis} className="h-5 w-5 accent-forest" />{tx(o)}</label>)}</div>;
    if (f.type === "yesno") return <select name={name} defaultValue={String(v ?? "")} disabled={dis} className={field}><option value="">—</option><option value="yes">{tx("Yes")}</option><option value="no">{tx("No")}</option></select>;
    if (f.type === "date") return <input type="date" name={name} defaultValue={String(v ?? "")} disabled={dis} className={field} />;
    if (f.type === "money") return <MoneyInput name={name} defaultValue={String(v ?? "")} disabled={dis} placeholder={f.hint ? tx(f.hint) : ""} className={field} />;
    const num = ["percent", "number", "months"].includes(f.type);
    return (
      <div className="relative">
        <input name={name} defaultValue={String(v ?? "")} inputMode={num ? "decimal" : undefined} disabled={dis} placeholder={f.hint ? tx(f.hint) : ""} aria-required={req2} className={field} />
        {f.type === "percent" ? <span className="pointer-events-none absolute right-3 top-[11px] text-mut">%</span> : null}
      </div>
    );
  };
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="bid-form">
      {head}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Your proposal")} · {tx(req.template.name)}</p>
      <h1 className="font-serif text-[28px] leading-tight text-forest sm:text-[36px]">{req.project.name}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-mut">
        <span>{req.requester.name} · {req.requester.org} · {tx("Due")} {due}</span>
        {req.isSample ? <SampleTag tx={tx} /> : null}
        {bid ? <StatusPill status={bid.status} tx={tx} /> : null}
      </p>
      {req.units || req.squareFeet || req.basisNote ? <p className="mt-2 text-[14px] text-ink">{tx("Project basis")}: {[req.basisNote, req.units ? `${req.units} ${tx("units")}` : "", req.squareFeet ? `${req.squareFeet.toLocaleString("en-US")} ${tx("gross SF")}` : ""].filter(Boolean).join(" · ")}</p> : null}
      {!editable ? <p className="mt-3 border-l-[3px] border-brass bg-cream px-3 py-2 text-[14px]">{tx(bid && bid.status !== "DRAFT" && bid.status !== "SUBMITTED" ? "The requester has made a decision on your proposal." : "This request is closed for changes.")}</p> : null}
      <form action={saveBid} className="mt-4">
        <input type="hidden" name="requestId" value={req.id} />
        {SECTIONS.map(([sec, label]) => {
          const list = fields.filter((f) => f.section === sec);
          if (!list.length) return null;
          return (
            <section key={sec} className={`${card} mb-4 p-4 sm:p-5`}>
              <h2 className={h2}>{tx(label)}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((f) => (
                  <label key={f.key} className={f.type === "long" || f.type === "checks" ? "sm:col-span-2" : ""} data-testid={`field-${f.key}`}>
                    <span className={labelCls}>{tx(f.label)}{f.required === false || f.type === "profile" ? "" : " *"}{f.type === "profile" ? ` · ${tx("auto-filled")}` : ""}</span>
                    {input(f)}
                  </label>
                ))}
              </div>
            </section>
          );
        })}
        {questions.length ? (
          <section className={`${card} mb-4 p-4 sm:p-5`}>
            <h2 className={h2}>{tx("Questions from the requester")}</h2>
            {questions.map((qq, i) => (
              <label key={i} className="mb-3 block">
                <span className="mb-1 block text-[15px] font-semibold text-forest">Q{i + 1} · {qq} *</span>
                <textarea name={`a${i + 1}`} defaultValue={answers[i] ?? ""} maxLength={500} rows={2} disabled={!editable} className={field} />
              </label>
            ))}
          </section>
        ) : null}
        <section className={`${card} mb-4 p-4 sm:p-5`}>
          <h2 className={h2}>{tx("Attach your full bid (PDF, optional)")}</h2>
          {bid?.pdfName ? (
            <p className="mb-2 text-[15px]">📄 <a href={`/api/bid-files/${bid.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brass underline" data-testid="bid-pdf-link">{bid.pdfName}</a> · {(bid.pdfSize / 1024 / 1024).toFixed(1)} MB
              {editable ? <label className="ml-3 inline-flex items-center gap-1 text-[14px] text-mut"><input type="checkbox" name="removePdf" value="1" className="accent-forest" /> {tx("Remove")}</label> : null}
            </p>
          ) : null}
          {editable ? <input type="file" name="pdf" accept="application/pdf" className="block w-full text-[14px]" data-testid="bid-pdf-input" /> : null}
          <p className="mt-2 text-[13px] text-mut">{tx("Max 25 MB. The standard form above is still required. Your PDF is shown alongside it for reference.")}</p>
        </section>
        <p className="mb-3 border-l-[3px] border-brass bg-cream px-3 py-2 text-[14px]">{tx("Every field marked * is required by the staff-approved template, so the requester sees your proposal side by side with others. Only the requester can see your numbers.")}</p>
        {editable ? (
          <div className="flex flex-wrap justify-end gap-2">
            {bid?.status === "SUBMITTED" ? null : <button className={btnOutline} name="intent" value="draft" data-testid="bid-save-draft">{tx("Save draft")}</button>}
            <button className={btn} name="intent" value="submit" data-testid="bid-submit">{tx(bid?.status === "SUBMITTED" ? "Update proposal" : "Submit proposal")}</button>
          </div>
        ) : null}
      </form>
    </div>
  );
}


