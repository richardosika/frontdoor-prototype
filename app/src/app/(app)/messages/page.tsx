import Link from "next/link";
import { serverTx } from "@/lib/i18n/server";
import { ConversationList } from "@/components/conversation-list";
import { btn, btnOutline } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";
import { isDeveloperRole } from "@/lib/member-reach";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SENT_TONE: Record<string, string> = {
  PENDING: "border-line text-mut",
  ACCEPTED: "border-forest bg-forest text-paper",
  DECLINED: "border-[#8a3b2b] text-[#8a3b2b]",
};
const SENT_LABEL: Record<string, string> = { PENDING: "Waiting for a reply", ACCEPTED: "Accepted", DECLINED: "Declined" };

function MessageTabs({ tab, tx, sentCount }: { tab: "inbox" | "sent"; tx: (t: string) => string; sentCount: number }) {
  const cls = (on: boolean) =>
    `inline-flex min-h-11 items-center border-b-2 px-4 text-[15px] font-semibold ${on ? "border-brass text-forest" : "border-transparent text-mut"}`;
  return (
    <nav className="flex gap-1 border-b border-line bg-paper px-2" aria-label={tx("Messages")} data-testid="message-tabs">
      <Link href="/messages" className={cls(tab === "inbox")} aria-current={tab === "inbox" ? "page" : undefined} data-testid="tab-inbox">
        {tx("Inbox")}
      </Link>
      <Link href="/messages?tab=sent" className={cls(tab === "sent")} aria-current={tab === "sent" ? "page" : undefined} data-testid="tab-sent">
        {tx("Sent")} {sentCount ? <span className="ml-1.5 rounded-sm bg-brass px-1.5 text-[11px] text-paper">{sentCount}</span> : null}
      </Link>
    </nav>
  );
}

/** Outbound requests: project contacts and introduction requests this member sent, with their status. */
async function SentList({ userId, tx }: { userId: string; tx: (t: string) => string }) {
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
  const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" });
  if (!rows.length) return <p className="p-6 text-[15px] text-mut" data-testid="sent-empty">{tx("Nothing sent yet.")}</p>;
  return (
    <ul className="divide-y divide-line bg-paper" data-testid="sent-list">
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
  );
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tx = await serverTx();
  const user = await requireUser();
  const tab = (await searchParams).tab === "sent" ? "sent" : "inbox";
  const [conversations, sentCount] = await Promise.all([
    listConversations(user.id),
    Promise.all([prisma.projectContact.count({ where: { fromId: user.id } }), prisma.introduction.count({ where: { fromId: user.id } })]).then(([a, b]) => a + b),
  ]);
  if (tab === "sent") {
    return (
      <div className="mx-auto max-w-3xl pb-24 md:py-6">
        <MessageTabs tab="sent" tx={tx} sentCount={sentCount} />
        <SentList userId={user.id} tx={tx} />
      </div>
    );
  }
  if (conversations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-4"><MessageTabs tab="inbox" tx={tx} sentCount={sentCount} /></div>
        <section className="w-full rounded border border-line bg-paper p-6 text-center sm:p-10" data-testid="messages-empty">
          <h1 className="font-serif text-[28px] text-forest sm:text-[34px]">{tx("No conversations yet")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[17px] leading-relaxed text-ink">
            {tx("Conversations open when a member accepts your contact about a project, or when you are in each other's circle.")}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-[16px] leading-relaxed text-mut">
            {isDeveloperRole(user.role)
              ? tx("Add a project and choose who it is seeking, then reach out to matching members from Find your team.")
              : tx("Add an approved project so the right members can reach you, contact members whose projects seek your category, or grow your circle.")}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/profile#add-project" className={btn}>
              {tx("Add a project")}
            </Link>
            <Link href="/deals" className={btnOutline} data-testid="messages-empty-find">
              {isDeveloperRole(user.role) ? tx("Find your team") : tx("Opportunities for you")}
            </Link>
            <Link href={isDeveloperRole(user.role) ? "/deals#my-circle" : "/network"} className={btnOutline}>
              {tx("My Circle")}
            </Link>
          </div>
        </section>
      </div>
    );
  }
  return (
    <>
    <MessageTabs tab="inbox" tx={tx} sentCount={sentCount} />
    <div className="mx-auto max-w-3xl lg:grid lg:max-w-none lg:grid-cols-[340px_minmax(0,1fr)]">
      <ConversationList conversations={conversations} activeId={null} />
      <div className="hidden items-center justify-center text-sm text-mut lg:flex">{tx("Select a conversation.")}</div>
    </div>
    </>
  );
}
