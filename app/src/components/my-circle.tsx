import Link from "next/link";
import { openConversation } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { btn, btnOutline } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import type { loadMyCircle } from "@/lib/ledger-projects";
import { roleLabel, roleShort } from "@/lib/roles";

type Circle = Awaited<ReturnType<typeof loadMyCircle>>;

/** #28: only people connected through a project, with their shared projects and a way into messages. */
export async function MyCircleList({ people }: { people: Circle }) {
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
                {tx(roleShort(roleLabel(person.role)))} · {person.org}
              </span>
              <span className="block truncate text-[13px] text-mut">{person.location}</span>
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
          <div className="mt-3">
            {person.conversationId ? (
              <Link href={`/messages/${person.conversationId}`} className={`${btnOutline} w-full`}>
                {tx("Open messages")}
              </Link>
            ) : (
              <form action={openConversation}>
                <input type="hidden" name="userId" value={person.id} />
                <button className={`${btn} w-full`} type="submit">
                  {tx("Send a message")}
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
