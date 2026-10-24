"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canRequestDealAccess } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";

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
    text: `${user.name} (${user.email}) requested access to "${deal.title}" and acknowledged the NDA. Review the request on the deal page. ${BRAND.name} does not process a subscription or payment.\n`,
  });
  await notify(deal.sponsorId, {
    title: "Access request",
    body: `${user.name} requested access to ${deal.title}.`,
    href: `/deals/${deal.id}`,
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/alerts");
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
        ? `${user.name} approved your request for "${access.deal.title}". Open the deal room to see the other approved members. ${BRAND.name} does not take a subscription or move funds.\n`
        : `${user.name} declined your request for "${access.deal.title}".\n`,
  });
  await notify(access.requesterId, {
    title: decision === "APPROVED" ? "Access approved" : "Access declined",
    body:
      decision === "APPROVED"
        ? `${user.name} approved your request for ${access.deal.title}.`
        : `${user.name} declined your request for ${access.deal.title}.`,
    href: decision === "APPROVED" ? `/deals/${access.dealId}/room` : `/deals/${access.dealId}`,
  });
  if (decision === "APPROVED") {
    await prisma.dealEvent.create({
      data: {
        dealId: access.dealId,
        actorId: user.id,
        summary: `${user.name} approved ${access.requester.name} into the room.`,
      },
    });
  }

  revalidatePath(`/deals/${access.dealId}`);
  revalidatePath(`/deals/${access.dealId}/room`);
  revalidatePath("/alerts");
  redirect(`/deals/${access.dealId}`);
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

  if (parentId) {
    const parent = await prisma.dealMessage.findUnique({ where: { id: parentId } });
    if (!parent || parent.dealId !== dealId || parent.parentId) {
      redirect(`${room}?error=${encodeURIComponent("That question is not in this room.")}`);
    }
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

  if (user.id !== deal.sponsorId) {
    await notify(deal.sponsorId, {
      title: parentId ? "Deal room reply" : "Deal room question",
      body: `${user.name} on ${deal.title}: ${body.slice(0, 140)}`,
      href: room,
    });
  }

  revalidatePath(room);
  revalidatePath("/alerts");
  redirect(room);
}
