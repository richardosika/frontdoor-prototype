"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/current-user";
import { canRequestDealAccess } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { RATE_LIMITS, withinRateLimit } from "@/lib/messaging";
import { notify } from "@/lib/notify";
import { deliverPortalMessage, isBlocked } from "@/lib/portal-message";

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
  if (await isBlocked(user.id, deal.sponsorId)) {
    redirect(`/deals/${dealId}?error=${encodeURIComponent("Messaging is closed between these members.")}`);
  }
  const recentAccess = await prisma.dealAccess.count({
    where: { requesterId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (!existing && !withinRateLimit(recentAccess, RATE_LIMITS.accessPerDay)) {
    redirect(`/deals/${dealId}?error=${encodeURIComponent("You have sent too many access requests today.")}`);
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

  const sent = await deliverPortalMessage({
    from: user,
    toId: deal.sponsorId,
    kind: "ACCESS",
    body: `${user.name} requested access to "${deal.title}" and acknowledged the NDA. Review it on the deal page. ${BRAND.name} does not process a subscription or payment.`,
  });
  if (!sent.ok) redirect(`/deals/${dealId}?error=${encodeURIComponent(sent.reason)}`);

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/alerts");
  redirect(`/deals/${dealId}?notice=Request+sent`);
}

export async function reviewAccess(formData: FormData) {
  const user = await requireUser();
  await settleAccess({
    actor: user,
    accessId: String(formData.get("accessId") || ""),
    decision: String(formData.get("decision") || ""),
    onBehalfOfSponsor: false,
    returnTo: "/deals",
  });
}

export async function adminReviewAccess(formData: FormData) {
  const admin = await requireAdmin();
  await settleAccess({
    actor: admin,
    accessId: String(formData.get("accessId") || ""),
    decision: String(formData.get("decision") || ""),
    onBehalfOfSponsor: true,
    returnTo: "/admin/access",
  });
}

async function settleAccess(input: {
  actor: { id: string; name: string };
  accessId: string;
  decision: string;
  onBehalfOfSponsor: boolean;
  returnTo: string;
}) {
  if (input.decision !== "APPROVED" && input.decision !== "REJECTED") redirect(input.returnTo);

  const access = await prisma.dealAccess.findUnique({
    where: { id: input.accessId },
    include: { deal: { include: { sponsor: true } }, requester: true },
  });
  if (!access) redirect(input.returnTo);
  if (!input.onBehalfOfSponsor && access.deal.sponsorId !== input.actor.id) redirect("/deals");
  const back = input.onBehalfOfSponsor ? "/admin/access" : `/deals/${access.dealId}`;
  if (!access.ndaAcknowledged) {
    redirect(`${back}?error=${encodeURIComponent("NDA acknowledgement is missing.")}`);
  }

  await prisma.dealAccess.update({
    where: { id: access.id },
    data: { status: input.decision, reviewedAt: new Date() },
  });

  const decisionBody = input.onBehalfOfSponsor
    ? input.decision === "APPROVED"
      ? `${input.actor.name} approved your request for "${access.deal.title}" on behalf of ${access.deal.sponsor.name}. Open the deal room. ${BRAND.name} does not take a subscription or move funds.`
      : `${input.actor.name} declined your request for "${access.deal.title}" on behalf of ${access.deal.sponsor.name}.`
    : input.decision === "APPROVED"
      ? `${input.actor.name} approved your request for "${access.deal.title}". Open the deal room. ${BRAND.name} does not take a subscription or move funds.`
      : `${input.actor.name} declined your request for "${access.deal.title}".`;
  const sent = await deliverPortalMessage({
    from: input.actor,
    toId: access.requesterId,
    kind: "ACCESS",
    body: decisionBody,
  });
  if (!sent.ok) {
    await notify(access.requesterId, {
      title: input.decision === "APPROVED" ? "Access approved" : "Access declined",
      body: "You have a new message on Private Floor.",
      href: input.decision === "APPROVED" ? `/deals/${access.dealId}/room` : `/deals/${access.dealId}`,
    });
  }
  if (input.decision === "APPROVED") {
    await prisma.dealEvent.create({
      data: {
        dealId: access.dealId,
        actorId: input.actor.id,
        summary: input.onBehalfOfSponsor
          ? `${input.actor.name} approved ${access.requester.name} into the room on behalf of ${access.deal.sponsor.name}.`
          : `${input.actor.name} approved ${access.requester.name} into the room.`,
      },
    });
  }

  revalidatePath(`/deals/${access.dealId}`);
  revalidatePath(`/deals/${access.dealId}/room`);
  revalidatePath("/admin/access");
  revalidatePath("/admin");
  revalidatePath("/alerts");
  const notice =
    input.decision === "APPROVED"
      ? `Approved ${access.requester.name} for ${access.deal.title}`
      : `Declined ${access.requester.name} for ${access.deal.title}`;
  redirect(`${back}?notice=${encodeURIComponent(notice)}`);
}

async function requireRoom(dealId: string, userId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { access: { where: { requesterId: userId, status: "APPROVED" } } },
  });
  if (!deal) return null;
  const allowed = deal.sponsorId === userId || deal.access.length > 0;
  if (!allowed) return null;
  return deal;
}

export async function addDealDocument(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const url = String(formData.get("url") || "").trim().slice(0, 500);
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  const room = `/deals/${dealId}/room`;
  if (title.length < 2 || !/^https?:\/\//i.test(url)) {
    redirect(`${room}?error=${encodeURIComponent("Add a title and a link that starts with http.")}`);
  }
  const deal = await requireRoom(dealId, user.id);
  if (!deal) redirect(`/deals/${dealId}?error=${encodeURIComponent("The sponsor has not approved your access.")}`);

  await prisma.dealDocument.create({
    data: { dealId, authorId: user.id, title, url, note },
  });
  await prisma.dealEvent.create({
    data: { dealId, actorId: user.id, summary: `${user.name} added a document link: ${title}.` },
  });
  revalidatePath(room);
  redirect(room);
}

export async function postDealQuestion(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") || "");
  const body = String(formData.get("body") || "").trim().slice(0, 2000);
  const parentId = String(formData.get("parentId") || "");
  const room = `/deals/${dealId}/room`;
  if (body.length < 1) redirect(`${room}?error=${encodeURIComponent("Write a question or reply.")}`);
  const deal = await requireRoom(dealId, user.id);
  if (!deal) redirect(`/deals/${dealId}?error=${encodeURIComponent("The sponsor has not approved your access.")}`);

  const parent = parentId ? await prisma.dealMessage.findUnique({ where: { id: parentId } }) : null;
  if (parentId && (!parent || parent.dealId !== dealId || parent.parentId)) {
    redirect(`${room}?error=${encodeURIComponent("That question is not in this room.")}`);
  }
  await prisma.dealMessage.create({
    data: { dealId, authorId: user.id, body, parentId: parentId || null },
  });
  await prisma.dealEvent.create({
    data: {
      dealId,
      actorId: user.id,
      summary: parentId ? `${user.name} replied in the room.` : `${user.name} asked a question.`,
    },
  });

  const recipients = new Set<string>();
  if (user.id !== deal.sponsorId) recipients.add(deal.sponsorId);
  if (parent && parent.authorId !== user.id) recipients.add(parent.authorId);
  const note = parentId
    ? `${user.name} replied in the deal room for ${deal.title}: ${body}`
    : `${user.name} asked a question in the deal room for ${deal.title}: ${body}`;
  for (const recipientId of recipients) {
    if (await isBlocked(user.id, recipientId)) continue;
    await deliverPortalMessage({ from: user, toId: recipientId, kind: "DEAL", body: note });
  }

  revalidatePath(room);
  revalidatePath("/alerts");
  redirect(room);
}
