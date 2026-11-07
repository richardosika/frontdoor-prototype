import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireModerationAdmin } from "@/lib/current-user";
import { timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ModerationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireModerationAdmin();
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, email: true, phone: true, linkedinUrl: true, org: true } },
      userB: { select: { id: true, name: true, email: true, phone: true, linkedinUrl: true, org: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
    },
  });
  if (!conversation) notFound();
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "OPENED_THREAD",
      conversationId: conversation.id,
      summary: `${admin.name} opened the thread between ${conversation.userA.name} and ${conversation.userB.name}.`,
    },
  });
  const people = [conversation.userA, conversation.userB];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <Link href="/admin/messages" className="inline-flex min-h-11 items-center text-sm text-mut">
        ‹ Message review
      </Link>
      <PageHeader title={`${conversation.userA.name} and ${conversation.userB.name}`} />
      <p className="mt-1 text-sm text-ink">Admin only. Opening this thread is written to the audit log.</p>
      <ul className={`mt-4 divide-y divide-line ${card}`}>
        {people.map((person) => (
          <li key={person.id} className="px-4 py-3 text-sm">
            <b>{person.name}</b>
            <span className="text-mut"> · {person.org}</span>
            <p className="text-xs text-ink">
              {person.email}
              {person.phone ? ` · ${person.phone}` : ""}
              {person.linkedinUrl ? ` · ${person.linkedinUrl}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <ul className="mt-4 space-y-2">
        {conversation.messages.map((message) => (
          <li key={message.id} className={`${card} px-4 py-3 text-sm`}>
            <p className="text-ink">{message.body}</p>
            <p className="mt-1 text-xs text-mut">
              {message.sender.name} · {message.kind} · {timeAgo(message.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
