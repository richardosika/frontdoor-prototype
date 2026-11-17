import { INSURANCE_PATH, INSURANCE_ROLES, insuranceDateKey, insuranceReminderDue, insuranceReminderKey } from "@/lib/insurance-compliance";
import { insuranceExpiringEmail, INSURANCE_TEMPLATE_KEY } from "@/lib/insurance-email";
import { sendNotice } from "@/lib/notices";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/public-origin";

export function remindersDue<T extends { userId: string; type: string; expiresOn: Date }>(
  policies: readonly T[], sentKeys: ReadonlySet<string>, now: Date,
): T[] {
  const seen = new Set(sentKeys);
  return policies.filter((policy) => {
    if (!insuranceReminderDue(policy, seen, now)) return false;
    seen.add(insuranceReminderKey(policy.userId, policy.type, insuranceDateKey(policy.expiresOn)));
    return true;
  });
}

export type InsuranceReminderSummary = {
  userId: string;
  name: string;
  type: string;
  otherName: string;
  expiresKey: string;
  result: "due" | "sent" | "claimed" | "failed" | "suppressed";
};

export async function runInsuranceReminders({ dryRun, now = new Date() }: { dryRun: boolean; now?: Date }) {
  const today = insuranceDateKey(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 31);
  const policies = await prisma.insurancePolicy.findMany({
    where: {
      user: { status: "ACTIVE", role: { in: [...INSURANCE_ROLES] } },
      expiresOn: { gte: new Date(`${today}T00:00:00Z`), lt: end },
    },
    include: { user: { select: { name: true, email: true, locale: true } } },
    orderBy: [{ expiresOn: "asc" }, { id: "asc" }],
  });
  if (!policies.length) return [];
  const claims = await prisma.insuranceReminder.findMany({
    where: { userId: { in: [...new Set(policies.map(({ userId }) => userId))] }, expiresKey: { gte: today, lt: end.toISOString().slice(0, 10) } },
    select: { userId: true, policyType: true, expiresKey: true },
  });
  const sentKeys = new Set(claims.map((row) => insuranceReminderKey(row.userId, row.policyType, row.expiresKey)));
  const due = remindersDue(policies, sentKeys, now);
  const link = `${publicOrigin({ get: () => null })}${INSURANCE_PATH}`;
  const summary: InsuranceReminderSummary[] = [];
  for (const policy of due) {
    const { user, userId, type, otherName } = policy;
    const expiresKey = insuranceDateKey(policy.expiresOn);
    const item: InsuranceReminderSummary = { userId, name: user.name, type, otherName, expiresKey, result: "due" };
    summary.push(item);
    if (dryRun) continue;
    try {
      await prisma.insuranceReminder.create({ data: { userId, policyType: type, expiresKey } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        item.result = "claimed";
        continue;
      }
      console.error("Insurance reminder claim failed", error);
      item.result = "failed";
      continue;
    }
    const mail = insuranceExpiringEmail({ ...policy, locale: user.locale, link, name: user.name });
    // Keep the claim if either delivery fails. Retrying after an uncertain delivery could send a duplicate.
    const [email, notice] = await Promise.allSettled([
      sendNotice({ intendedTo: user.email, subject: mail.subject, text: mail.text, templateKey: INSURANCE_TEMPLATE_KEY }),
      notify(userId, { title: mail.title, body: mail.body, href: INSURANCE_PATH }),
    ]);
    if (email.status === "rejected" || notice.status === "rejected") {
      console.error("Insurance reminder delivery failed", email.status, notice.status);
      item.result = "failed";
    } else {
      item.result = email.value.suppressed ? "suppressed" : "sent";
    }
  }
  return summary;
}
