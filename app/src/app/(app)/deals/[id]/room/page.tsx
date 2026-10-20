import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TierBadge } from "@/components/badge";
import { MobileTitle } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      sponsor: true,
      access: { where: { status: "APPROVED" }, include: { requester: true } },
    },
  });
  if (!deal) notFound();
  const allowed = deal.sponsorId === user.id || deal.access.some((item) => item.requesterId === user.id);
  if (!allowed) redirect(`/deals/${deal.id}?error=${encodeURIComponent("The sponsor has not approved your access.")}`);

  const members = [
    deal.sponsor,
    ...deal.access.map((item) => item.requester).filter((person) => person.id !== deal.sponsorId),
  ];

  return (
    <div>
      <MobileTitle href={`/deals/${deal.id}`} label="Deal" title="Room" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
      <Link href={`/deals/${deal.id}`} className="hidden text-sm text-mut md:inline">
        ‹ {deal.title}
      </Link>
      <div className={`mt-3 p-5 ${card}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Deal room</p>
        <h1 className="mt-1 font-serif text-2xl font-normal">{deal.title}</h1>
        <p className="mt-2 text-sm text-ink">
          People listed here were approved by {deal.sponsor.name} after an NDA acknowledgement. {BRAND.name} does not host a subscription, wire, or payment.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {members.map((person) => (
            <li key={person.id} className="flex items-center justify-between py-3">
              <Link href={`/members/${person.id}`}>
                <span className="font-semibold">{person.name}</span>
                <span className="block text-xs text-mut">
                  {roleShort(roleLabel(person.role))} · {person.org}
                  {person.id === deal.sponsorId ? " · Sponsor" : ""}
                </span>
              </Link>
              <TierBadge tier={person.tier} />
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  );
}
