"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { BRAND } from "@/lib/brand";
import { tierAfterCounterpartyConfirm } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { canOpenProjectToCounterparties, toPublicVerification, type VerificationStatus } from "@/lib/verification";
import { attachVouchEvidence, ensureVerificationCase } from "@/lib/verification-db";
import { sendEmail } from "@/lib/email";
import { notify, notifyAdmins } from "@/lib/notify";
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
  const project = await prisma.trackProject.create({
    data: { userId: user.id, name, asset, location, year, valueLabel, summary },
  });
  await ensureVerificationCase({ subject: "PROJECT", projectId: project.id, actorId: user.id });
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
  const project = await prisma.trackProject.findUnique({
    where: { id: projectId },
    include: { verification: { include: { checks: { select: { result: true } } } } },
  });
  if (!project || project.userId !== user.id) redirect("/profile");
  const open = canOpenProjectToCounterparties(
    toPublicVerification(
      project.verification
        ? { ...project.verification, status: project.verification.status as VerificationStatus }
        : null,
    ),
  );
  if (!open) {
    redirect("/profile?error=This+project+is+not+open+to+counterparties+until+verification+is+complete");
  }

  const token = randomBytes(24).toString("hex");
  await prisma.confirmation.create({
    data: { projectId, counterpartyName, counterpartyEmail, token },
  });

  const link = `${await appBaseUrl()}/confirm/${token}`;
  await sendEmail({
    to: counterpartyEmail,
    subject: `${BRAND.name}: confirm you worked with ${user.name} on ${project.name}`,
    text: `${user.name} listed you as a counterparty on ${project.name} (${project.location}, ${project.year}, ${project.valueLabel}).\n\nConfirm or decline (no ${BRAND.name} account required):\n${link}\n`,
  });

  revalidatePath("/profile");
  redirect("/profile?notice=The+link+is+on+this+project.+Copy+it+and+send+it+to+your+counterparty.");
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

  const nextTier = tierAfterCounterpartyConfirm(confirmation.project.user.tier);
  await prisma.confirmation.update({
    where: { id: confirmation.id },
    data: {
      status: decision,
      reviewStatus: decision === "CONFIRMED" ? "PENDING_ADMIN" : "OPEN",
      note,
      respondedAt: new Date(),
    },
  });

  if (nextTier !== confirmation.project.user.tier) {
    await prisma.user.update({
      where: { id: confirmation.project.userId },
      data: { tier: nextTier },
    });
  }

  if (decision === "CONFIRMED") {
    await notify(confirmation.project.userId, {
      title: "Vouch received",
      body: `${confirmation.counterpartyName} confirmed ${confirmation.project.name}. Your tier stays ${confirmation.project.user.tier === "CONFIRMED" ? "Confirmed" : "unchanged"} until the committee reviews the vouch.`,
      href: "/profile",
    });
    await notifyAdmins({
      title: "Vouch to review",
      body: `${confirmation.counterpartyName} confirmed ${confirmation.project.name} for ${confirmation.project.user.name}.`,
      href: "/admin/verification",
    });
    await attachVouchEvidence({
      memberId: confirmation.project.userId,
      projectName: confirmation.project.name,
      counterpartyName: confirmation.counterpartyName,
      note,
      evidenceUrl: `${await appBaseUrl()}/confirm/${token}`,
    });
    await sendEmail({
      to: confirmation.project.user.email,
      subject: `${BRAND.name}: ${confirmation.counterpartyName} confirmed ${confirmation.project.name}`,
      text: `${confirmation.counterpartyName} confirmed they worked with you on ${confirmation.project.name}. A committee member still needs to accept the vouch before your tier can become Confirmed.\n`,
    });
  } else {
    await notify(confirmation.project.userId, {
      title: "Vouch declined",
      body: `${confirmation.counterpartyName} declined ${confirmation.project.name}. Your tier is unchanged.`,
      href: "/profile",
    });
  }

  revalidatePath("/profile");
  revalidatePath(`/members/${confirmation.project.userId}`);
  redirect(`/confirm/${token}`);
}
