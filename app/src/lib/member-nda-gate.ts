import { redirect } from "next/navigation";
import { MEMBER_NDA_GATE, MEMBER_NDA_SLUG, memberNdaVersion, needsMemberNda } from "@/lib/member-nda";
import { prisma } from "@/lib/prisma";

/**
 * Existing members accept the Member NDA on their next visit before continuing. A member who already agreed on /join
 * (recorded against the application email, same version) is carried over without a second click.
 */
export async function enforceMemberNda(user: { id: string; email: string; isAdmin: boolean; ndaVersion: string; ndaAcceptedAt: Date | null }) {
  const version = memberNdaVersion();
  if (!needsMemberNda(user, version)) return;
  const fromJoin = await prisma.legalAcceptance.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" }, document: MEMBER_NDA_SLUG, version },
    orderBy: { acceptedAt: "desc" },
  });
  if (fromJoin) {
    await prisma.user.update({ where: { id: user.id }, data: { ndaAcceptedAt: fromJoin.acceptedAt, ndaVersion: version } });
    return;
  }
  redirect(MEMBER_NDA_GATE);
}
