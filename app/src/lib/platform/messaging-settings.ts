import { prisma } from "@/lib/prisma";
import { MESSAGING_SETTING_KEYS, parseMessagingSettings, type MessagingSettings } from "@/lib/platform/messaging-policy";

export async function loadMessagingSettings(): Promise<MessagingSettings> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: Object.values(MESSAGING_SETTING_KEYS) } },
    select: { key: true, value: true },
  });
  return parseMessagingSettings(rows);
}
