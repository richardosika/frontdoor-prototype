import {
  expiredWeekDue, INSURANCE_PATH, insuranceDateKey, insuranceReminderDue, insuranceReminderKey, insuranceScopeWhere,
  requiresInsuranceFor, suspensionDate, suspensionDue, unresolvedExpired,
} from "@/lib/insurance-compliance";
import {
  insuranceExpiredEmail, insuranceExpiringEmail, insuranceSuspendedEmail,
  INSURANCE_EXPIRED_TEMPLATE_KEY, INSURANCE_SUSPENDED_TEMPLATE_KEY, INSURANCE_TEMPLATE_KEY,
} from "@/lib/insurance-email";
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
  /** before: 30 days ahead. expired: weekly reminder `week` after expiry. suspend / lift: the account. */
  kind: "before" | "expired" | "suspend" | "lift";
  week?: number;
  suspendKey?: string;
  result: "due" | "sent" | "claimed" | "failed" | "suppressed" | "suspended" | "lifted";
};

const isUnique = (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");

export async function runInsuranceReminders({ dryRun, now = new Date() }: { dryRun: boolean; now?: Date }) {
  const today = insuranceDateKey(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 31);
  const policies = await prisma.insurancePolicy.findMany({
    where: {
      user: { status: "ACTIVE", ...insuranceScopeWhere() },
      expiresOn: { gte: new Date(`${today}T00:00:00Z`), lt: end },
    },
    include: { user: { select: { name: true, email: true, locale: true, role: true, extraCategories: true } } },
    orderBy: [{ expiresOn: "asc" }, { id: "asc" }],
  });
  const summary: InsuranceReminderSummary[] = [];
  const link = `${publicOrigin({ get: () => null })}${INSURANCE_PATH}`;
  if (policies.length) await remindBefore(policies.filter(({ user }) => requiresInsuranceFor(user)), { dryRun, now, today, end, link, summary });
  await remindExpired({ dryRun, now, link, summary });
  return summary;
}

type Window = { dryRun: boolean; now: Date; today: string; end: Date; link: string; summary: InsuranceReminderSummary[] };
type BeforePolicy = { userId: string; type: string; otherName: string; expiresOn: Date; user: { name: string; email: string; locale: string } };

async function remindBefore(policies: BeforePolicy[], { dryRun, now, today, end, link, summary }: Window) {
  if (!policies.length) return;
  const claims = await prisma.insuranceReminder.findMany({
    where: { userId: { in: [...new Set(policies.map(({ userId }) => userId))] }, expiresKey: { gte: today, lt: end.toISOString().slice(0, 10) } },
    select: { userId: true, policyType: true, expiresKey: true },
  });
  const sentKeys = new Set(claims.map((row) => insuranceReminderKey(row.userId, row.policyType, row.expiresKey)));
  const due = remindersDue(policies, sentKeys, now);
  for (const policy of due) {
    const { user, userId, type, otherName } = policy;
    const expiresKey = insuranceDateKey(policy.expiresOn);
    const item: InsuranceReminderSummary = { userId, name: user.name, type, otherName, expiresKey, kind: "before", result: "due" };
    summary.push(item);
    if (dryRun) continue;
    try {
      await prisma.insuranceReminder.create({ data: { userId, policyType: type, expiresKey } });
    } catch (error) {
      if (isUnique(error)) {
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
}


async function deliver(user: { id: string; email: string }, mail: { subject: string; text: string; title: string; body: string }, templateKey: string) {
  const [email, notice] = await Promise.allSettled([
    sendNotice({ intendedTo: user.email, subject: mail.subject, text: mail.text, templateKey }),
    notify(user.id, { title: mail.title, body: mail.body, href: INSURANCE_PATH }),
  ]);
  if (email.status === "rejected" || notice.status === "rejected") {
    console.error("Insurance notice delivery failed", email.status, notice.status);
    return "failed" as const;
  }
  return email.value.suppressed ? "suppressed" as const : "sent" as const;
}

/**
 * Nov 17 (Richard, decision 4): after a policy expires with no current policy of the same type, one reminder a week for
 * four weeks, then the account is suspended a week after the 4th. Suspension never happens before four reminders were
 * actually sent, so nobody is suspended on the first run. A current policy (or staff) lifts it.
 */
async function remindExpired({ dryRun, now, link, summary }: Omit<Window, "today" | "end">) {
  const todayStart = new Date(`${insuranceDateKey(now)}T00:00:00Z`);
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      AND: [insuranceScopeWhere(), { OR: [{ insurancePolicies: { some: { expiresOn: { lt: todayStart } } } }, { insuranceSuspendedAt: { not: null } }] }],
    },
    select: {
      id: true, name: true, email: true, locale: true, role: true, extraCategories: true,
      insuranceSuspendedAt: true, insuranceSuspensionLiftedAt: true,
      insurancePolicies: { orderBy: [{ expiresOn: "asc" }, { id: "asc" }], select: { type: true, otherName: true, expiresOn: true } },
      insuranceExpiredReminders: { select: { policyType: true, expiresKey: true, week: true, sentAt: true } },
    },
    orderBy: { id: "asc" },
  });
  for (const user of users) {
    if (!requiresInsuranceFor(user)) continue;
    const open = unresolvedExpired(user.insurancePolicies, now, user.insuranceSuspensionLiftedAt);
    const seen = new Set<string>();
    let overdue: (typeof open)[number] | null = null;
    for (const policy of open) {
      const expiresKey = insuranceDateKey(policy.expiresOn);
      const key = `${policy.type}|${expiresKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sent = user.insuranceExpiredReminders.filter((row) => row.policyType === policy.type && row.expiresKey === expiresKey);
      if (suspensionDue(sent, now)) overdue ??= policy;
      const week = expiredWeekDue(policy.expiresOn, sent, now);
      if (!week) continue;
      const suspendOn = suspensionDate(week, now);
      const item: InsuranceReminderSummary = {
        userId: user.id, name: user.name, type: policy.type, otherName: policy.otherName, expiresKey,
        kind: "expired", week, suspendKey: insuranceDateKey(suspendOn), result: "due",
      };
      summary.push(item);
      if (dryRun) continue;
      try {
        await prisma.insuranceExpiredReminder.create({ data: { userId: user.id, policyType: policy.type, expiresKey, week } });
      } catch (error) {
        item.result = isUnique(error) ? "claimed" : "failed";
        if (!isUnique(error)) console.error("Expired insurance reminder claim failed", error);
        continue;
      }
      item.result = await deliver(user, insuranceExpiredEmail({ ...policy, locale: user.locale, link, name: user.name, week, suspendOn }), INSURANCE_EXPIRED_TEMPLATE_KEY);
    }
    if (overdue && !user.insuranceSuspendedAt) {
      const item: InsuranceReminderSummary = {
        userId: user.id, name: user.name, type: overdue.type, otherName: overdue.otherName, expiresKey: insuranceDateKey(overdue.expiresOn), kind: "suspend", result: "due",
      };
      summary.push(item);
      if (dryRun) continue;
      const claimed = await prisma.user.updateMany({ where: { id: user.id, insuranceSuspendedAt: null }, data: { insuranceSuspendedAt: now } });
      if (!claimed.count) { item.result = "claimed"; continue; }
      const delivered = await deliver(user, insuranceSuspendedEmail({ ...overdue, locale: user.locale, link, name: user.name }), INSURANCE_SUSPENDED_TEMPLATE_KEY);
      item.result = delivered === "failed" ? "failed" : "suspended";
    } else if (!open.length && user.insuranceSuspendedAt) {
      summary.push({ userId: user.id, name: user.name, type: "", otherName: "", expiresKey: "", kind: "lift", result: dryRun ? "due" : "lifted" });
      if (!dryRun) await prisma.user.update({ where: { id: user.id }, data: { insuranceSuspendedAt: null } });
    }
  }
}
