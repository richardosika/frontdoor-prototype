import Link from "next/link";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { ConversationList } from "@/components/conversation-list";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SENT_TONE: Record<string, string> = {
  PENDING: "border-line text-mut",
  ACCEPTED: "border-forest bg-forest text-paper",
  DECLINED: "border-[#8a3b2b] text-[#8a3b2b]",
};
const SENT_LABEL: Record<string, string> = { PENDING: "Waiting for a reply", ACCEPTED: "Accepted", DECLINED: "Declined" };

/** Outbound requests: project contacts and introduction requests this member sent, with their status. */
async function SentList({ userId, tx, locale }: { userId: string; tx: (t: string) => string; locale: string }) {
  const [contacts, intros] = await Promise.all([
    prisma.projectContact.findMany({
      where: { fromId: userId },
      include: { to: { select: { id: true, name: true, org: true } }, project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.introduction.findMany({
      where: { fromId: userId },
      include: { to: { select: { id: true, name: true, org: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const rows = [
    ...contacts.map((c) => ({ id: c.id, at: c.createdAt, kind: tx("Contact about this project"), to: c.to, about: c.project.name, status: c.status as string })),
    ...intros.map((i) => ({ id: i.id, at: i.createdAt, kind: tx("Introduction request"), to: i.to, about: "", status: i.status as string })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/New_York" });
  if (!rows.length) return null;
  return (
    <section className="border-t border-line bg-paper" data-testid="sent-requests">
    <h2 className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Requests you sent")}</h2>
    <ul className="divide-y divide-line" data-testid="sent-list">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" data-testid="sent-row">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-brass">{row.kind}</p>
            <Link href={`/members/${row.to.id}`} className="font-semibold text-forest [overflow-wrap:anywhere]">
              {row.to.name}
            </Link>
            <p className="text-[13px] text-mut [overflow-wrap:anywhere]">
              {[row.to.org, row.about, dateFmt.format(row.at)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-[13px] font-semibold ${SENT_TONE[row.status] ?? SENT_TONE.PENDING}`} data-testid={`sent-status-${row.status}`}>
            {tx(SENT_LABEL[row.status] ?? row.status)}
          </span>
        </li>
      ))}
    </ul>
    </section>
  );
}

/** Nov 10 (Julia): Inbox and Sent mirror LinkedIn messages (list on the left, conversation on the right); no buttons. */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; error?: string }> }) {
  const tx = await serverTx();
  const locale = await currentLocale();
  const user = await requireUser();
  const params = await searchParams;
  const tab = params.tab === "sent" ? "sent" : "inbox";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const [conversations, requestsSent] = await Promise.all([
    listConversations(user.id),
    Promise.all([prisma.projectContact.count({ where: { fromId: user.id } }), prisma.introduction.count({ where: { fromId: user.id } })]).then(([a, b]) => a + b),
  ]);
  const none = conversations.length === 0;
  return (
    <div className="mx-auto max-w-3xl pb-24 lg:grid lg:min-h-dvh lg:max-w-none lg:grid-cols-[360px_minmax(0,1fr)] lg:pb-0" data-testid="messages-page">
      <div>
        {params.error ? <p className="border-b border-line bg-[#FBEAE3] px-4 py-2 text-[14px] text-[#9A3B1E]" role="alert">{tx(params.error)}</p> : null}
        <ConversationList conversations={conversations} activeId={null} tab={tab} q={q} requestsSent={requestsSent} />
        {tab === "sent" ? <SentList userId={user.id} tx={tx} locale={locale} /> : null}
      </div>
      <div className="hidden items-center justify-center bg-cream p-8 lg:flex">
        {none ? (
          <section className="max-w-md text-center" data-testid="messages-empty">
            <h2 className="font-serif text-[28px] text-forest">{tx("No conversations yet")}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink">{tx("Conversations open when a member accepts your contact about a project, or when you are in each other's circle.")}</p>
          </section>
        ) : (
          <p className="text-[15px] text-mut">{tx("Select a conversation.")}</p>
        )}
      </div>
      {none ? (
        <p className="px-4 pt-2 text-[15px] leading-relaxed text-mut lg:hidden" data-testid="messages-empty-mobile">{tx("Conversations open when a member accepts your contact about a project, or when you are in each other's circle.")}</p>
      ) : null}
    </div>
  );
}
