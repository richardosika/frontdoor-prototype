import Link from "next/link";
import { notFound } from "next/navigation";
import { withdrawConnection } from "@/actions/social";
import { SubmitButton } from "@/components/submit-button";
import { btn, card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const STATUS: Record<string, string> = { PENDING: "Waiting for a reply", ACCEPTED: "Accepted", DECLINED: "Declined" };

export default async function SentRequestPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await requireUser();
  const { kind, id } = await params;
  const tx = await serverTx();
  const locale = await currentLocale();
  const where = { id, fromId: user.id };
  const include = { to: { select: { name: true, org: true } } };
  // Request ownership grants access to this receipt regardless of directory visibility or dues.
  const contact = kind === "contact" ? await prisma.projectContact.findFirst({ where, include: { ...include, project: { select: { name: true } } } }) : null;
  const request = kind === "connection" ? await prisma.connection.findFirst({ where, include })
    : kind === "contact" ? contact
    : kind === "intro" ? await prisma.introduction.findFirst({ where, include }) : null;
  if (!request) notFound();
  const title = kind === "connection" ? "Circle request" : kind === "contact" ? "Contact about this project" : "Introduction request";
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York", }).format(request.createdAt);
  return <div className="mx-auto max-w-3xl px-4 pb-24 pt-6" data-testid="sent-request-detail">
    <Link href="/messages?tab=sent" className="inline-flex min-h-11 items-center text-forest underline">{tx("Requests you sent")}</Link>
    <article className={`${card} mt-3 space-y-3 p-4`}>
      <h1 className="font-serif text-2xl text-forest">{tx(title)}</h1>
      <h2 className="text-lg font-semibold">{request.to.name}</h2>
      <p>{request.to.org}</p>
      {contact ? <p>{contact.project.name}</p> : null}
      <p>{tx("Sent")}: <time dateTime={request.createdAt.toISOString()}>{date}</time></p>
      <p data-testid="request-status">{tx(STATUS[request.status] ?? request.status)}</p>
      {kind === "connection" && request.status === "PENDING" ? <form action={withdrawConnection}>
        <input type="hidden" name="connectionId" value={request.id} />
        <SubmitButton className={`${btn} min-h-11 w-full whitespace-normal`} pendingLabel="Withdrawing…">{tx("Withdraw request")}</SubmitButton>
      </form> : null}
      {/* Project contacts and introductions have no withdrawal action in their existing workflows. */}
    </article>
  </div>;
}
