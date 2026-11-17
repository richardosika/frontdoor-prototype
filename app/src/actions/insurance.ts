"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { runInsuranceReminders } from "@/lib/insurance-reminders";
import { prisma } from "@/lib/prisma";

export async function runInsuranceReminderAction(dryRun: boolean) {
  const admin = await requireAdmin();
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: dryRun ? "PREVIEW_INSURANCE_REMINDERS" : "SEND_INSURANCE_REMINDERS",
      summary: dryRun ? "Previewed due insurance reminders." : "Ran due insurance reminders.",
    },
  });
  try {
    const reminders = await runInsuranceReminders({ dryRun });
    if (!dryRun) revalidatePath("/admin/insurance");
    return { ok: true as const, dryRun, reminders };
  } catch (error) {
    console.error("Staff insurance reminder run failed", error);
    return { ok: false as const };
  }
}

/** Nov 17 (Richard, decision 4): staff lift an insurance suspension. Policies that expired before now no longer count toward a new one. */
export async function liftInsuranceSuspension(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  if (!userId) return;
  const now = new Date();
  const updated = await prisma.user.updateMany({
    where: { id: userId, insuranceSuspendedAt: { not: null } },
    data: { insuranceSuspendedAt: null, insuranceSuspensionLiftedAt: now },
  });
  if (updated.count) {
    await prisma.moderationEvent.create({
      data: { actorId: admin.id, action: "LIFT_INSURANCE_SUSPENSION", summary: `Lifted insurance suspension for ${userId}.` },
    });
  }
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/insurance");
}
