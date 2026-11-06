import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { memberLine } from "@/lib/member-line";
import { openConversation, removeFromCircle } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { btn, btnOutline } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import type { loadMyCircle } from "@/lib/ledger-projects";
import { roleLabel, roleShort } from "@/lib/roles";

type Circle = Awaited<ReturnType<typeof loadMyCircle>>;

/** #28: only people connected through a project, with their shared projects and a way into messages. */
export async function MyCircleList({ people, back = "/network" }: { people: Circle; back?: string }) {
  const tx = await serverTx();
  if (people.length === 0) {
    return (
      <div className="rounded border border-line bg-paper p-5 text-[16px] text-ink" data-testid="circle-empty">
        <p>{tx("No one in your circle yet. People join your circle when a contact about a project is accepted.")}</p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="circle-list">
      {people.map((person) => (
        <li key={person.id} className="rounded border border-line bg-paper p-4">
          <Link href={`/members/${person.id}`} className="flex items-center gap-3">
            <Avatar initials={person.initials} photoId={person.photoId} />
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-semibold">{person.name}</span>
              <span className="block truncate text-[13px] text-mut">
                {memberLine(person, tx)}
              </span>
            </span>
          </Link>
          <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-brass">{tx("Shared projects")}</p>
          {person.projects.length ? (
            <ul className="mt-1 space-y-1">
              {person.projects.map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="text-[15px] text-forest underline decoration-brass underline-offset-2">
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] text-mut">{tx("None yet.")}</p>
          )}
          <div className="mt-3 grid gap-2">
            {person.conversationId ? (
              <Link href={`/messages/${person.conversationId}`} className={`${btnOutline} w-full`}>
                {tx("Open messages")}
              </Link>
            ) : (
              <form action={openConversation}>
                <input type="hidden" name="userId" value={person.id} />
                <SubmitButton className={`${btn} w-full`}>
                  {tx("Send a message")}
                </SubmitButton>
              </form>
            )}
            {/* Nov 5: remove without blocking, with a confirm step. */}
            <details className="text-[14px]" data-testid="circle-remove">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-semibold text-mut underline decoration-line [&::-webkit-details-marker]:hidden">{tx("Remove from My Circle")}</summary>
              <form action={removeFromCircle} className="mt-1 grid gap-2 rounded border border-line bg-cream p-3">
                <input type="hidden" name="userId" value={person.id} />
                <input type="hidden" name="back" value={back} />
                <p className="text-ink">{tx("{name} leaves your circle. This is not a block and they are not told. To stop all contact, block them from their profile instead.").replace("{name}", person.name)}</p>
                <SubmitButton className={btnOutline} pendingLabel="Removing…" data-testid="circle-remove-confirm">{tx("Remove")}</SubmitButton>
              </form>
            </details>
          </div>
        </li>
      ))}
    </ul>
  );
}
