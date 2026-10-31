import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { StatusPill } from "@/components/reach-out";
import { btn, btnOutline, field } from "@/components/ui";
import { addChecklistItem, commentChecklistItem, reachOutForChecklist, removeChecklistItem, updateChecklistItem, uploadChecklistFile } from "@/actions/checklist";
import { serverTx } from "@/lib/i18n/server";
import { memberLine } from "@/lib/member-line";
import { SEEK_CATEGORIES, seekLabel, memberInCategory } from "@/lib/project-contact";
import { timeAgo } from "@/lib/format";
import {
  CHECKLIST_SECTIONS,
  CHECKLIST_STATUSES,
  STATUS_LABEL,
  checklistProgress,
  daysOverdue,
  dueInputValue,
  filterChecklist,
  isOverdue,
  type ChecklistFilter,
  type ChecklistStatus,
} from "@/lib/deal-checklist";

type Person = { id: string; name: string; initials: string; photoId: string; role: string; extraCategories?: string | null; org: string; location: string };
type Item = {
  id: string;
  section: string;
  title: string;
  category: string;
  status: string;
  assigneeId: string | null;
  dueDate: Date | null;
  fileName: string;
  sizeBytes: number;
  fileAt: Date | null;
  comments: { id: string; body: string; createdAt: Date; author: { name: string } }[];
};
type Candidate = Person & { status: string };

const h2 = "text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";
const box = "rounded border border-line bg-paper p-4 md:p-5";

function statusTone(status: string) {
  if (status === "DONE") return "border-forest bg-forest text-paper";
  if (status === "IN_PROGRESS") return "border-brass bg-brass-soft text-ink";
  return "border-line-strong border-[#CDBF9F] bg-paper text-mut";
}

function formatDue(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

export async function DealChecklist({
  dealId,
  userId,
  manage,
  members,
  items,
  filter,
  project,
  candidates,
  events,
  locale,
}: {
  dealId: string;
  userId: string;
  manage: boolean;
  members: Person[];
  items: Item[];
  filter: ChecklistFilter;
  project: { id: string; name: string; approved: boolean } | null;
  candidates: Record<string, Candidate[]>;
  events: { id: string; summary: string; createdAt: Date; actorId: string | null }[];
  locale: string;
}) {
  const tx = await serverTx();
  const now = new Date();
  const progress = checklistProgress(items);
  const overdue = items.filter((item) => isOverdue(item, now)).length;
  const needed = items.filter((item) => item.status === "NEEDED").length;
  const mine = items.filter((item) => item.assigneeId === userId).length;
  const shown = filterChecklist(items, filter, userId, now);
  const byId = new Map(members.map((person) => [person.id, person]));
  const sections = [...new Set([...CHECKLIST_SECTIONS, ...items.map((item) => item.section)])].filter((section) => shown.some((item) => item.section === section));
  const tabs: { id: ChecklistFilter; label: string; count: number }[] = [
    { id: "all", label: tx("All"), count: items.length },
    { id: "mine", label: tx("Mine"), count: mine },
    { id: "overdue", label: tx("Overdue"), count: overdue },
  ];

  return (
    <div id="checklist" className="grid scroll-mt-20 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" data-testid="deal-checklist">
      <div className="min-w-0">
        <section className={box}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className={h2}>{tx("Due-diligence checklist")}</p>
              <p className="mt-1 font-serif text-[26px] text-forest" data-testid="checklist-progress">
                {tx("{done} of {total} done").replace("{done}", String(progress.done)).replace("{total}", String(progress.total))}
              </p>
            </div>
            <p className="text-[14px] text-mut">
              {overdue} {tx("overdue")} · {needed} {tx("needed")}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-parchment" aria-hidden>
            <div className="h-full bg-brass" style={{ width: `${progress.percent}%` }} />
          </div>
        </section>

        <div className="my-3 flex flex-wrap items-center justify-between gap-2">
          <nav className="inline-flex overflow-hidden rounded-sm border border-[#CDBF9F]" data-testid="checklist-filter">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/deals/${dealId}/room?f=${tab.id}#checklist`}
                className={`min-h-11 border-r border-[#CDBF9F] px-4 py-2.5 text-[14px] last:border-0 ${filter === tab.id ? "bg-forest text-paper" : "bg-paper text-ink"}`}
                aria-current={filter === tab.id ? "page" : undefined}
              >
                {tab.label} ({tab.count})
              </Link>
            ))}
          </nav>
          {manage ? (
            <details className="w-full sm:w-auto" data-testid="checklist-add">
              <summary className={`${btn} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}>+ {tx("Add item")}</summary>
              <form action={addChecklistItem} className="mt-2 grid gap-2 rounded border border-line bg-cream p-3 sm:w-96">
                <input type="hidden" name="dealId" value={dealId} />
                <input name="title" className={`${field} text-[16px]`} placeholder={tx("Item name")} required />
                <select name="section" className={`${field} text-[16px]`} defaultValue="Site & Title">
                  {CHECKLIST_SECTIONS.map((section) => (
                    <option key={section} value={section}>{tx(section)}</option>
                  ))}
                </select>
                <select name="category" className={`${field} text-[16px]`} defaultValue="">
                  <option value="">{tx("Who usually fills it (optional)")}</option>
                  {SEEK_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>{tx(category.label)}</option>
                  ))}
                </select>
                <select name="assigneeId" className={`${field} text-[16px]`} defaultValue="">
                  <option value="">{tx("Unassigned")}</option>
                  {members.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
                <input name="dueDate" type="date" className={`${field} text-[16px]`} aria-label={tx("Due date")} />
                <button className={btn} type="submit">{tx("Add item")}</button>
              </form>
            </details>
          ) : null}
        </div>

        {shown.length === 0 ? <p className={`${box} text-[15px] text-mut`}>{filter === "overdue" ? tx("Nothing is overdue.") : filter === "mine" ? tx("Nothing is assigned to you.") : tx("No items yet.")}</p> : null}

        {sections.map((section) => {
          const list = shown.filter((item) => item.section === section);
          const all = items.filter((item) => item.section === section);
          return (
            <section key={section} className={`${box} mb-3`} data-testid="checklist-section">
              <div className="flex items-baseline justify-between border-b border-line pb-2">
                <h3 className="font-serif text-[21px] text-forest">{tx(section)}</h3>
                <span className="text-[13px] text-mut">
                  {all.filter((item) => item.status === "DONE").length} / {all.length}
                </span>
              </div>
              <ul>
                {list.map((item) => {
                  const late = isOverdue(item, now);
                  const who = item.assigneeId ? byId.get(item.assigneeId) : undefined;
                  const canEdit = manage || item.assigneeId === userId;
                  const filled = item.status === "DONE" || Boolean(item.category && members.some((person) => memberInCategory(person, item.category)));
                  const pool = item.category ? candidates[item.category] ?? [] : [];
                  return (
                    <li
                      key={item.id}
                      id={`item-${item.id}`}
                      data-testid="checklist-item"
                      data-overdue={late ? "true" : undefined}
                      className={`scroll-mt-20 border-b border-line py-3 last:border-0 ${late ? "-mx-2 border-l-[3px] border-l-[#A2412C] bg-[#FBEFEA] px-2" : ""}`}
                    >
                      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 md:grid-cols-[1.5rem_minmax(0,1fr)_auto] md:items-center">
                        <span aria-hidden className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2 text-[12px] ${item.status === "DONE" ? "border-forest bg-forest text-paper" : "border-[#CDBF9F]"}`}>
                          {item.status === "DONE" ? "✓" : ""}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-forest">{item.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[12px] ${statusTone(item.status)}`} data-testid="checklist-status">
                              {item.status === "DONE" ? "✓ " : ""}
                              {tx(STATUS_LABEL[item.status as ChecklistStatus] ?? item.status)}
                            </span>
                            {late ? (
                              <span className="rounded-full bg-[#A2412C] px-2.5 py-0.5 text-[12px] font-semibold text-white" data-testid="checklist-overdue">
                                {tx("Overdue")} · {daysOverdue(item, now)} {tx("days")}
                              </span>
                            ) : null}
                            {item.fileName ? (
                              <a href={`/api/checklist-files/${item.id}`} className="text-[13px] text-forest underline decoration-brass [overflow-wrap:anywhere]" data-testid="checklist-file">
                                📎 {item.fileName}
                              </a>
                            ) : null}
                            {item.category ? <span className="text-[12px] text-mut">{tx(seekLabel(item.category))}</span> : null}
                          </div>
                        </div>
                        <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-mut md:col-start-auto md:justify-end">
                          <span className="flex items-center gap-1.5 text-ink">
                            {who ? <Avatar initials={who.initials} photoId={who.photoId} size="sm" /> : null}
                            {who ? who.name : tx("Unassigned")}
                          </span>
                          {item.dueDate ? <span className={late ? "font-semibold text-[#A2412C]" : ""}>{tx("Due")} {formatDue(item.dueDate, locale)}</span> : null}
                          <span>💬 {item.comments.length}</span>
                        </div>
                      </div>

                      <div className="ml-9 mt-2 flex flex-wrap gap-2">
                        <details className="min-w-0 flex-1 basis-full" data-testid="checklist-details">
                          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center text-[14px] font-semibold text-forest underline decoration-brass [&::-webkit-details-marker]:hidden">
                            {canEdit ? tx("Update") : tx("Comments")} ›
                          </summary>
                          <div className="mt-2 grid gap-3 rounded border border-line bg-cream p-3">
                            {canEdit ? (
                              <form action={updateChecklistItem} className="grid gap-2 sm:grid-cols-2">
                                <input type="hidden" name="itemId" value={item.id} />
                                {manage ? <input name="title" defaultValue={item.title} className={`${field} text-[16px] sm:col-span-2`} aria-label={tx("Item name")} /> : null}
                                <select name="status" defaultValue={item.status} className={`${field} text-[16px]`} aria-label={tx("Status")}>
                                  {CHECKLIST_STATUSES.map((status) => (
                                    <option key={status} value={status}>{tx(STATUS_LABEL[status])}</option>
                                  ))}
                                </select>
                                {manage ? (
                                  <>
                                    <select name="assigneeId" defaultValue={item.assigneeId ?? ""} className={`${field} text-[16px]`} aria-label={tx("Assignee")}>
                                      <option value="">{tx("Unassigned")}</option>
                                      {members.map((person) => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                      ))}
                                    </select>
                                    <input name="dueDate" type="date" defaultValue={dueInputValue(item.dueDate)} className={`${field} text-[16px]`} aria-label={tx("Due date")} />
                                    <select name="category" defaultValue={item.category} className={`${field} text-[16px]`} aria-label={tx("Category")}>
                                      <option value="">{tx("No category")}</option>
                                      {SEEK_CATEGORIES.map((category) => (
                                        <option key={category.id} value={category.id}>{tx(category.label)}</option>
                                      ))}
                                    </select>
                                  </>
                                ) : null}
                                <button className={`${btn} sm:col-span-2 sm:justify-self-start`} type="submit">{tx("Save")}</button>
                              </form>
                            ) : null}
                            {canEdit ? (
                              <form action={uploadChecklistFile} className="grid gap-2 border-t border-line pt-3">
                                <input type="hidden" name="itemId" value={item.id} />
                                <input name="file" type="file" className="text-[15px]" required aria-label={tx("Attach a file")} />
                                <label className="flex items-center gap-2 text-[14px]">
                                  <input type="checkbox" name="markDone" className="h-5 w-5 accent-[#1F3A2E]" /> {tx("Mark done")}
                                </label>
                                <button className={`${btnOutline} justify-self-start`} type="submit">{item.fileName ? tx("Replace file") : tx("Attach a file")}</button>
                              </form>
                            ) : null}
                            <div className="border-t border-line pt-3">
                              <ul className="grid gap-2">
                                {item.comments.map((comment) => (
                                  <li key={comment.id} className="text-[14px]">
                                    <b>{comment.author.name}</b> <span className="text-mut">· {timeAgo(comment.createdAt)}</span>
                                    <p className="text-ink">{comment.body}</p>
                                  </li>
                                ))}
                              </ul>
                              <form action={commentChecklistItem} className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <input type="hidden" name="itemId" value={item.id} />
                                <input name="body" className={`${field} text-[16px]`} placeholder={tx("Add a comment")} required />
                                <button className={btnOutline} type="submit">{tx("Comment")}</button>
                              </form>
                            </div>
                            {manage ? (
                              <form action={removeChecklistItem} className="border-t border-line pt-3">
                                <input type="hidden" name="itemId" value={item.id} />
                                <button className="min-h-10 text-[14px] text-[#A2412C] underline" type="submit">{tx("Remove item")}</button>
                              </form>
                            ) : null}
                          </div>
                        </details>
                        {manage && !filled && item.category && project ? (
                          <details className="min-w-0 basis-full" data-testid="checklist-find">
                            <summary className={`${btnOutline} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                              {tx("Find a {category}").replace("{category}", tx(seekLabel(item.category)))}
                            </summary>
                            <div className="mt-2 rounded border border-line bg-paper p-3">
                              {!project.approved ? <p className="text-[14px] text-mut">{tx("Matching opens after approval")}</p> : null}
                              {project.approved && pool.length === 0 ? <p className="text-[14px] text-mut">{tx("No approved members in this category yet.")}</p> : null}
                              {project.approved ? (
                                <ul className="grid gap-2">
                                  {pool.map((person) => (
                                    <li key={person.id} className="flex min-w-0 flex-wrap items-center gap-3 border-b border-line pb-2 last:border-0">
                                      <Link href={`/members/${person.id}`} className="flex min-w-0 flex-1 basis-48 items-center gap-2">
                                        <Avatar initials={person.initials} photoId={person.photoId} size="sm" />
                                        <span className="min-w-0">
                                          <span className="block font-semibold">{person.name}</span>
                                          <span className="block text-[13px] text-mut">{memberLine(person, tx)}</span>
                                        </span>
                                      </Link>
                                      {person.status ? (
                                        <StatusPill status={person.status} />
                                      ) : (
                                        <details className="w-full sm:w-auto">
                                          <summary className={`${btnOutline} w-full cursor-pointer list-none text-center sm:w-auto [&::-webkit-details-marker]:hidden`}>{tx("Reach out")}</summary>
                                          <form action={reachOutForChecklist} className="mt-2 grid gap-2 sm:w-72">
                                            <input type="hidden" name="itemId" value={item.id} />
                                            <input type="hidden" name="toId" value={person.id} />
                                            <p className="text-[13px] text-mut">
                                              {tx("About")}: <b className="text-ink">{project.name}</b>. {tx("This adds the category to what the project is seeking.")}
                                            </p>
                                            <textarea name="note" rows={2} maxLength={500} className={`${field} text-[16px]`} placeholder={tx("Add a short note (optional)")} />
                                            <button className={btn} type="submit">{tx("Send request")}</button>
                                          </form>
                                        </details>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="min-w-0">
        <section className={box} data-testid="checklist-activity">
          <p className={h2}>{tx("Activity")}</p>
          {events.length === 0 ? <p className="mt-2 text-[14px] text-mut">{tx("Nothing recorded yet.")}</p> : null}
          <ul className="mt-2">
            {events.map((event) => {
              const actor = event.actorId ? byId.get(event.actorId) : undefined;
              return (
                <li key={event.id} className="flex gap-2.5 border-b border-line py-2.5 last:border-0">
                  {actor ? <Avatar initials={actor.initials} photoId={actor.photoId} size="sm" /> : null}
                  <div className="min-w-0">
                    <p className="text-[14px] leading-snug text-ink">{event.summary}</p>
                    <span className="text-[12px] text-mut">{timeAgo(event.createdAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
