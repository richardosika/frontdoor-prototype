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
