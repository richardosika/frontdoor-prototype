"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { hashClientIp } from "@/lib/legal";
import { MEMBER_NDA_SLUG, memberNdaVersion, safeNext } from "@/lib/member-nda";
import { prisma } from "@/lib/prisma";

/** Records the member's acceptance of the current Member NDA: timestamp and version, on the account and in the legal record. */
export async function acceptMemberNda(formData: FormData) {
  const user = await requireUser();
  const next = safeNext(formData.get("next"));
  if (formData.get("agree") !== "on") redirect(`/member-nda?error=1&next=${encodeURIComponent(next)}`);
  const version = memberNdaVersion();
  const acceptedAt = new Date();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { ndaAcceptedAt: acceptedAt, ndaVersion: version } }),
    prisma.legalAcceptance.create({ data: { userId: user.id, email: user.email, document: MEMBER_NDA_SLUG, version, acceptedAt, ipHash: ip ? hashClientIp(ip) : "" } }),
  ]);
  redirect(next);
}
