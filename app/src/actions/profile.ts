"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { tierAfterCounterpartyConfirm } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/url";

export async function addProject(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const asset = String(formData.get("asset") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const year = Number(formData.get("year") || 0);
  const valueLabel = String(formData.get("valueLabel") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  if (name.length < 2 || !asset || !location || !valueLabel || year < 1980 || year > 2100) {
    redirect("/profile?error=Add+a+name,+asset,+location,+year,+and+value");
  }
  await prisma.trackProject.create({
    data: { userId: user.id, name, asset, location, year, valueLabel, summary },
  });
  revalidatePath("/profile");
  redirect("/profile");
}

export async function requestConfirmation(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const counterpartyName = String(formData.get("counterpartyName") || "").trim();
  const counterpartyEmail = String(formData.get("counterpartyEmail") || "").trim().toLowerCase();
  if (!counterpartyName || !counterpartyEmail.includes("@")) {
    redirect("/profile?error=Add+the+counterparty+name+and+email");
  }
  const project = await prisma.trackProject.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== user.id) redirect("/profile");

  const token = randomBytes(24).toString("hex");
  await prisma.confirmation.create({
    data: { projectId, counterpartyName, counterpartyEmail, token },
  });

  const link = `${await appBaseUrl()}/confirm/${token}`;
  await sendEmail({
    to: counterpartyEmail,
    subject: `Confirm you worked with ${user.name} on ${project.name}`,
    text: `${user.name} listed you as a counterparty on ${project.name} (${project.location}, ${project.year}, ${project.valueLabel}).\n\nConfirm or decline (no account required):\n${link}\n\nDelivered by the console email adapter. The link is also printed in the server log.`,
  });

  revalidatePath("/profile");
  redirect("/profile?notice=Confirmation+link+sent+to+the+server+log");
}

export async function respondConfirmation(formData: FormData) {
  const token = String(formData.get("token") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  if (decision !== "CONFIRMED" && decision !== "DECLINED") redirect(`/confirm/${token}`);

  const confirmation = await prisma.confirmation.findUnique({
    where: { token },
    include: { project: { include: { user: true } } },
  });
  if (!confirmation) redirect("/");
  if (confirmation.status !== "PENDING") redirect(`/confirm/${token}`);

  await prisma.confirmation.update({
    where: { id: confirmation.id },
    data: { status: decision, note, respondedAt: new Date() },
  });

  if (decision === "CONFIRMED") {
    const nextTier = tierAfterCounterpartyConfirm(confirmation.project.user.tier);
    if (nextTier !== confirmation.project.user.tier) {
      await prisma.user.update({
        where: { id: confirmation.project.userId },
        data: { tier: nextTier },
      });
    }
    await sendEmail({
      to: confirmation.project.user.email,
      subject: `${confirmation.counterpartyName} confirmed ${confirmation.project.name}`,
      text: `${confirmation.counterpartyName} confirmed they worked with you on ${confirmation.project.name}. Your verification tier is now Confirmed.\n\nDelivered by the console email adapter.`,
    });
  }

  revalidatePath("/profile");
  revalidatePath(`/members/${confirmation.project.userId}`);
  redirect(`/confirm/${token}`);
}
