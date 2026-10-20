import Link from "next/link";
import type { listConversations } from "@/lib/conversations";

export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: Awaited<ReturnType<typeof listConversations>>;
  activeId: string | null;
}) {
  return (
    <section className="lg:min-h-dvh lg:border-r lg:border-line lg:bg-cream">
      <h1 className="mb-0 hidden border-b-[3px] border-double border-brass px-5 py-6 font-serif text-[26px] font-normal uppercase tracking-[0.14em] lg:block">
        Messages
      </h1>
      {conversations.length === 0 ? (
        <p className="px-5 py-8 text-sm text-mut">No messages yet. Open a profile and choose Message.</p>
      ) : null}
      <ul>
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              className={`flex items-center gap-3 border-b border-line px-1 py-3 lg:border-l-[3px] lg:px-5 ${
                activeId === conversation.id ? "bg-paper lg:border-l-brass" : "lg:border-l-transparent"
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brass bg-parchment font-serif text-sm text-forest">
                {conversation.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{conversation.name}</span>
                <span className="block text-[11px] text-mut">{conversation.sub}</span>
                <span className="block truncate text-xs text-mut">{conversation.preview}</span>
              </span>
              <span className="text-right text-[11px] text-mut">
                {conversation.time}
                {conversation.unread ? (
                  <span className="mt-1 block rounded-sm bg-brass px-1.5 text-[10px] font-bold text-paper">{conversation.unread}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
