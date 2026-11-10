import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { field } from "@/components/ui";
import { filterConversations, type ConversationRow } from "@/lib/conversations";

/**
 * Nov 10 (Julia): the conversation list mirrors LinkedIn messages: a search box, Inbox and Sent tabs, one row per
 * person with photo, name, "You: " on your own last message, time, and unread in bold. No buttons.
 */
export async function ConversationList({
  conversations,
  activeId,
  tab = "inbox",
  q = "",
  requestsSent = 0,
}: {
  conversations: ConversationRow[];
  activeId: string | null;
  tab?: "inbox" | "sent";
  q?: string;
  requestsSent?: number;
}) {
  const tx = await serverTx();
  const rows = filterConversations(conversations, tab, q);
  const sentCount = conversations.filter((c) => c.lastFromMe).length + requestsSent;
  const tabCls = (on: boolean) =>
    `inline-flex min-h-11 items-center border-b-2 px-3 text-[15px] font-semibold ${on ? "border-forest text-forest" : "border-transparent text-mut hover:text-forest"}`;
  const unreadTotal = conversations.reduce((n, c) => n + (c.unread ? 1 : 0), 0);
  return (
    <section className="bg-paper lg:min-h-dvh lg:border-r lg:border-line" data-testid="conversation-list">
      <div className="border-b border-line px-4 pb-2 pt-4">
        <h1 className="font-serif text-[24px] font-normal text-forest">{tx("Messages")}</h1>
        <form method="get" action="/messages" className="mt-2" role="search">
          {tab === "sent" ? <input type="hidden" name="tab" value="sent" /> : null}
          <input name="q" defaultValue={q} className={`${field} text-[16px]`} placeholder={tx("Search messages")} aria-label={tx("Search messages")} data-testid="messages-search" />
        </form>
        <nav className="mt-2 flex gap-1" aria-label={tx("Messages")} data-testid="message-tabs">
          <Link href="/messages" className={tabCls(tab === "inbox")} aria-current={tab === "inbox" ? "page" : undefined} data-testid="tab-inbox">
            {tx("Inbox")}
            {unreadTotal ? <span className="ml-1.5 rounded-full bg-forest px-1.5 text-[11px] text-paper">{unreadTotal}</span> : null}
          </Link>
          <Link href="/messages?tab=sent" className={tabCls(tab === "sent")} aria-current={tab === "sent" ? "page" : undefined} data-testid="tab-sent">
            {tx("Sent")}
            {sentCount ? <span className="ml-1.5 rounded-full bg-brass px-1.5 text-[11px] text-paper">{sentCount}</span> : null}
          </Link>
        </nav>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-[15px] text-mut" data-testid="conversation-list-empty">
          {q ? tx("No conversations match this search.") : tab === "sent" ? tx("No sent messages yet.") : tx("No conversations yet")}
        </p>
      ) : null}
      <ul>
        {rows.map((conversation) => {
          const on = activeId === conversation.id;
          const bold = conversation.unread > 0;
          return (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                aria-current={on ? "true" : undefined}
                className={`flex items-start gap-3 border-b border-line border-l-[3px] px-4 py-3 ${on ? "border-l-forest bg-cream" : "border-l-transparent hover:bg-cream"}`}
                data-testid="conversation-row"
              >
                <Avatar initials={conversation.initials} photoId={conversation.photoId} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[15px] ${bold ? "font-bold text-forest" : "font-semibold text-ink"}`}>{conversation.name}</span>
                    <span className="shrink-0 text-[12px] text-mut">{conversation.time}</span>
                  </span>
                  <span className="block truncate text-[12px] text-mut">{conversation.sub}</span>
                  <span className={`mt-0.5 flex items-center gap-2 text-[13px] ${bold ? "font-semibold text-ink" : "text-mut"}`}>
                    <span className="min-w-0 flex-1 truncate">{conversation.lastFromMe ? `${tx("You")}: ` : ""}{conversation.preview}</span>
                    {bold ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-forest" aria-label={tx("Unread")} /> : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
