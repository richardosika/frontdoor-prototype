"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import {
  MESSAGING_DEFAULTS,
  MESSAGING_SETTING_KEYS,
  parseMessagingSettings,
  type MessagingSettings,
} from "@/lib/platform/messaging-policy";
import { prisma } from "@/lib/prisma";

const FIELDS: { field: keyof MessagingSettings; key: string; min: number; max: number }[] = [
  { field: "introDaily", key: MESSAGING_SETTING_KEYS.introDaily, min: 1, max: 100 },
  { field: "introNewAccountDaily", key: MESSAGING_SETTING_KEYS.introNewAccountDaily, min: 1, max: 100 },
  { field: "messageHourly", key: MESSAGING_SETTING_KEYS.messageHourly, min: 1, max: 200 },
  { field: "reportsDaily", key: MESSAGING_SETTING_KEYS.reportsDaily, min: 1, max: 50 },
  { field: "outstandingIntros", key: MESSAGING_SETTING_KEYS.outstandingIntros, min: 1, max: 200 },
  { field: "reRequestDays", key: MESSAGING_SETTING_KEYS.reRequestDays, min: 0, max: 365 },
  { field: "threadWindowMinutes", key: MESSAGING_SETTING_KEYS.threadWindowMinutes, min: 1, max: 24 * 60 },
  { field: "newAccountDays", key: MESSAGING_SETTING_KEYS.newAccountDays, min: 0, max: 90 },
];

export async function saveMessagingSettings(formData: FormData) {
  const admin = await requireAdmin();
  const draft: { key: string; value: unknown }[] = FIELDS.map((item) => ({
    key: item.key,
    value: { n: String(formData.get(item.field) || MESSAGING_DEFAULTS[item.field]) },
  }));
  const settings = parseMessagingSettings(draft);
  await prisma.$transaction(
    FIELDS.map((item) =>
      prisma.siteSetting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: { n: settings[item.field] }, updatedById: admin.id },
        update: { value: { n: settings[item.field] }, updatedById: admin.id },
      }),
    ),
  );
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "MESSAGING_SETTINGS",
      targetType: "settings",
      summary: `${admin.name} updated messaging caps.`,
    },
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?notice=Messaging+caps+saved");
}

export async function setMessagingRestriction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const back = `/admin/members/${userId}`;
  const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, isAdmin: true } });
  if (!member || member.isAdmin) redirect("/admin/members");
  if (formData.get("clear") === "1") {
    await prisma.userRestriction.deleteMany({
      where: { userId, kind: { in: ["MESSAGING_PAUSED", "MESSAGING_SUSPENDED"] } },
    });
    await prisma.moderationEvent.create({
      data: {
        actorId: admin.id,
        action: "MESSAGING_RESTRICTION_CLEARED",
        targetUserId: userId,
        targetType: "member",
        summary: `${admin.name} cleared messaging restrictions for ${member.name}.`,
      },
    });
    revalidatePath(back);
    redirect(`${back}?notice=Messaging+restriction+cleared`);
  }
  const kind = String(formData.get("kind") || "");
  if (kind !== "MESSAGING_PAUSED" && kind !== "MESSAGING_SUSPENDED") redirect(back);
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);
  if (reason.length < 3) redirect(`${back}?error=${encodeURIComponent("Add a reason for the messaging restriction.")}`);
  const endsOn = String(formData.get("endsOn") || "");
  const endsAt = endsOn ? new Date(`${endsOn}T23:59:59`) : null;
  await prisma.userRestriction.create({
    data: { userId, kind, reason, endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null, createdById: admin.id },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: kind,
      targetUserId: userId,
      targetType: "member",
      summary: `${admin.name} set ${kind === "MESSAGING_PAUSED" ? "messaging paused" : "messaging suspended"} for ${member.name}.`,
    },
  });
  revalidatePath(back);
  revalidatePath("/admin/audit");
  redirect(`${back}?notice=Messaging+restriction+saved`);
}

export async function setReportStatus(formData: FormData) {
  const admin = await requireAdmin();
  const reportId = String(formData.get("reportId") || "");
  const status = String(formData.get("status") || "");
  if (status !== "REVIEWING" && status !== "ACTIONED" && status !== "DISMISSED") redirect("/admin/moderation");
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || (report.status !== "OPEN" && report.status !== "REVIEWING")) redirect("/admin/moderation");
  const resolutionNote = String(formData.get("resolutionNote") || "").trim().slice(0, 500);
  await prisma.report.update({
    where: { id: report.id },
    data: {
      status,
      resolvedById: status === "REVIEWING" ? null : admin.id,
      resolvedAt: status === "REVIEWING" ? null : new Date(),
      resolutionNote,
    },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "REPORT_STATUS",
      targetUserId: report.targetUserId,
      targetType: "report",
      summary: `${admin.name} marked a report ${status}.`,
    },
  });
  revalidatePath("/admin/moderation");
  redirect("/admin/moderation?notice=Report+updated");
}
