import Link from "next/link";
import { notFound } from "next/navigation";
import { addCrmNote, deleteCrmPerson, saveCrmPerson, sendPersonInfo } from "@/actions/crm";
import { startGuidedReview } from "@/actions/verification";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { STAGE_OVERRIDE_OPTIONS, crmStage, crmStageLabel, eventKindLabel, followUpDue, stageOverride } from "@/lib/crm-stage";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function CrmPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const person = await prisma.crmPerson.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 80 },
      application: { select: { status: true } },
      inviteRequest: { select: { status: true } },
      user: { select: { status: true, paymentStatus: true } },
    },
  });
  if (!person) notFound();
  const shownStage = crmStage({
    inviteStatus: person.inviteRequest?.status,
    applicationStatus: person.application?.status,
    memberActive: person.user?.status === "ACTIVE",
    paymentStatus: person.user?.paymentStatus,
    manualStage: person.manualStage,
  });
  const owners = await prisma.user.findMany({ where: { isAdmin: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <MobileTitle href="/admin/crm" label="People" title={person.name} />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title={person.name} />
        <div className="mt-3">
          <Banner error={query.error} notice={query.notice} />
        </div>
        <section className={`${card} mt-4 space-y-1 p-4 text-sm`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{crmStageLabel(shownStage)}</p>
          <p>{person.email}</p>
          <p>
            {person.role ? roleLabel(person.role) : "Role not set"}
            {person.org ? ` · ${person.org}` : ""}
            {person.location ? ` · ${person.location}` : ""}
          </p>
          {person.inviteCode ? <p>Invite code {person.inviteCode}</p> : null}
          {person.doNotContact ? <p className="text-brass">Do not contact. {person.doNotContactReason}</p> : null}
          {followUpDue(person.followUpAt) ? <p className="text-brass">Follow-up due {person.followUpAt?.toISOString().slice(0, 10)}</p> : null}
          <form action={startGuidedReview} className="pt-2">
            <input type="hidden" name="personId" value={person.id} />
            <button className={btn} type="submit">
              Start review
            </button>
          </form>
          <p className="flex flex-wrap gap-3 pt-1">
            {person.applicationId ? (
              <Link href={`/admin/applications/${person.applicationId}`} className="underline decoration-brass">
                Application
              </Link>
            ) : null}
            {person.userId ? (
              <Link href={`/admin/members/${person.userId}`} className="underline decoration-brass">
                Member
              </Link>
            ) : null}
          </p>
        </section>
        <form action={saveCrmPerson} className={`${card} mt-4 grid gap-3 p-4`}>
          <input type="hidden" name="personId" value={person.id} />
          <label>
            <span className={labelCls}>Stage override</span>
            <select name="manualStage" className={field} defaultValue={stageOverride(person.manualStage) || ""}>
              <option value="">Follow the record</option>
              {STAGE_OVERRIDE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {crmStageLabel(stage)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-mut">Approve, Active, and Declined come from the guided review decision. This menu cannot set them.</span>
          </label>
          <label>
            <span className={labelCls}>Tags</span>
            <input name="tags" className={field} defaultValue={person.tags} placeholder="founder, dallas" />
          </label>
          <label>
            <span className={labelCls}>Owner</span>
            <select name="ownerId" className={field} defaultValue={person.ownerId || ""}>
              <option value="">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>Follow-up date</span>
            <input name="followUpAt" type="date" className={field} defaultValue={person.followUpAt ? person.followUpAt.toISOString().slice(0, 10) : ""} />
          </label>
          <label>
            <span className={labelCls}>Follow-up note</span>
            <input name="followUpNote" className={field} defaultValue={person.followUpNote} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="doNotContact" value="yes" defaultChecked={person.doNotContact} />
            Do not contact
          </label>
          <label>
            <span className={labelCls}>Do-not-contact reason</span>
            <input name="doNotContactReason" className={field} defaultValue={person.doNotContactReason} placeholder="Required when the box is checked" />
          </label>
          <button className={btn} type="submit">
            Save
          </button>
        </form>
        <form action={sendPersonInfo} className="mt-4">
          <input type="hidden" name="personId" value={person.id} />
          <button className={btnOutline} type="submit">
            Send information email
          </button>
        </form>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Notes</h2>
          <form action={addCrmNote} className="mt-3 grid gap-2">
            <input type="hidden" name="personId" value={person.id} />
            <textarea name="body" className={field} rows={3} placeholder="A note for the file" />
            <button className={btnOutline} type="submit">
              Add note
            </button>
          </form>
          <ul className="mt-3 divide-y divide-line text-sm">
            {person.notes.map((note) => (
              <li key={note.id} className="py-2">
                <p>{note.body}</p>
                <p className="text-xs text-mut">
                  {note.author?.name || "Private Floor"} · {formatAuditTime(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Timeline</h2>
          {person.events.length === 0 ? <p className="mt-2 text-sm text-mut">No events yet.</p> : null}
          <ul className="mt-2 divide-y divide-line text-sm">
            {person.events.map((event) => (
              <li key={event.id} className="py-2">
                <p className="text-xs uppercase tracking-wide text-brass">{eventKindLabel(event.kind)}</p>
                <p>{event.summary}</p>
                <p className="text-xs text-mut">{formatAuditTime(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Delete CRM person</h2>
          <p className="mt-2 text-sm text-ink">Removes this CRM person, their notes, and their timeline. The member account and application stay.</p>
          <form id="delete-crm" action={deleteCrmPerson} className="mt-3">
            <input type="hidden" name="personId" value={person.id} />
            <ConfirmSubmitButton
              form="delete-crm"
              className={btnOutline}
              message={`Delete the CRM record for ${person.name}? Notes and timeline events go with it. The member account and application stay.`}
            >
              Delete CRM person
            </ConfirmSubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
