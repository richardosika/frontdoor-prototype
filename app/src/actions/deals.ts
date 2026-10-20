"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canRequestDealAccess } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/email";

export async function requestAccess(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const ndaAcknowledged = formData.get("nda") === "on";
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { sponsor: true },
  });
  if (!deal) redirect("/deals");

  const existing = await prisma.dealAccess.findUnique({
    where: { dealId_requesterId: { dealId, requesterId: user.id } },
  });

  const decision = canRequestDealAccess({
    isSponsor: deal.sponsorId === user.id,
    ndaAcknowledged,
    existingStatus: existing?.status ?? null,
  });
  if (!decision.ok) {
    redirect(`/deals/${dealId}?error=${encodeURIComponent(decision.reason)}`);
  }

  if (existing) {
    await prisma.dealAccess.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        ndaAcknowledged: true,
        ndaAcknowledgedAt: new Date(),
        reviewedAt: null,
      },
    });
  } else {
    await prisma.dealAccess.create({
      data: {
        dealId,
        requesterId: user.id,
        ndaAcknowledged: true,
        ndaAcknowledgedAt: new Date(),
      },
    });
  }

  await sendEmail({
    to: deal.sponsor.email,
    subject: `Access request: ${deal.title}`,
    text: `${user.name} (${user.email}) requested access to "${deal.title}" and acknowledged the NDA. Review the request on the deal page. ${BRAND.name} does not process a subscription or payment.\n\nDelivered by the console email adapter.`,
  });

  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}?notice=Request+sent`);
}

export async function reviewAccess(formData: FormData) {
  const user = await requireUser();
  const accessId = String(formData.get("accessId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "APPROVED" && decision !== "REJECTED") redirect("/deals");

  const access = await prisma.dealAccess.findUnique({
    where: { id: accessId },
    include: { deal: true, requester: true },
  });
  if (!access || access.deal.sponsorId !== user.id) redirect("/deals");
  if (!access.ndaAcknowledged) {
    redirect(`/deals/${access.dealId}?error=${encodeURIComponent("NDA acknowledgement is missing.")}`);
  }

  await prisma.dealAccess.update({
    where: { id: access.id },
    data: { status: decision, reviewedAt: new Date() },
  });

  await sendEmail({
    to: access.requester.email,
    subject: decision === "APPROVED" ? `Access approved: ${access.deal.title}` : `Access declined: ${access.deal.title}`,
    text:
      decision === "APPROVED"
        ? `${user.name} approved your request for "${access.deal.title}". Open the deal room to see the other approved members. ${BRAND.name} does not take a subscription or move funds.\n\nDelivered by the console email adapter.`
        : `${user.name} declined your request for "${access.deal.title}".\n\nDelivered by the console email adapter.`,
  });

  revalidatePath(`/deals/${access.dealId}`);
  revalidatePath(`/deals/${access.dealId}/room`);
  redirect(`/deals/${access.dealId}`);
}
