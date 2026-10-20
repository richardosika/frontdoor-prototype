"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canConnect, orderedPair } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/email";

export async function requestConnection(formData: FormData) {
  const user = await requireUser();
  const toId = String(formData.get("toId") || "");
  const decision = canConnect(user.id, toId);
  if (!decision.ok) redirect(`/network?error=${encodeURIComponent(decision.reason)}`);

  const target = await prisma.user.findUnique({ where: { id: toId } });
  if (!target || target.status !== "ACTIVE") redirect("/network");

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { fromId: user.id, toId },
        { fromId: toId, toId: user.id },
      ],
    },
  });

  if (existing?.status === "ACCEPTED") redirect(`/members/${toId}`);
  if (existing?.status === "PENDING") redirect(`/members/${toId}?notice=Request+already+pending`);

  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: { fromId: user.id, toId, status: "PENDING" },
    });
  } else {
    await prisma.connection.create({ data: { fromId: user.id, toId, status: "PENDING" } });
  }

  await sendEmail({
    to: target.email,
    subject: `${user.name} wants to connect on ${BRAND.short}`,
    text: `${user.name} (${user.org}) sent you a connection request. Open Network to accept or decline.\n\nDelivered by the console email adapter.`,
  });

  revalidatePath("/network");
  revalidatePath(`/members/${toId}`);
  redirect(`/members/${toId}?notice=Connection+request+sent`);
}

export async function respondConnection(formData: FormData) {
  const user = await requireUser();
  const connectionId = String(formData.get("connectionId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "ACCEPTED" && decision !== "DECLINED") redirect("/network");

  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.toId !== user.id) redirect("/network");

  await prisma.connection.update({
    where: { id: connection.id },
    data: { status: decision },
  });
  revalidatePath("/network");
  redirect("/network");
}

export async function openConversation(formData: FormData) {
  const user = await requireUser();
  const otherId = String(formData.get("userId") || "");
  if (otherId === user.id) redirect("/messages");
  const other = await prisma.user.findUnique({ where: { id: otherId } });
  if (!other) redirect("/messages");
  const [userAId, userBId] = orderedPair(user.id, otherId);
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body || body.length > 2000) {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent("Write a message under 2000 characters.")}`);
  }
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.userAId !== user.id && conversation.userBId !== user.id)) {
    redirect("/messages");
  }
  await prisma.message.create({
    data: { conversationId, senderId: user.id, body },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}
