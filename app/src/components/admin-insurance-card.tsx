import { liftInsuranceSuspension } from "@/actions/insurance";
import { SubmitButton } from "@/components/submit-button";
import { card } from "@/components/ui";
import { shortMoney } from "@/lib/insurance";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { insuranceDaysUntil, insurancePolicyLabel, INSURANCE_TIME_ZONE } from "@/lib/insurance-compliance";
import { loadMemberInsurance, memberInsuranceStatus } from "@/lib/insurance-member";
import { prisma } from "@/lib/prisma";

export async function AdminInsuranceCard({ userId }: { userId: string }) {
  const [member, reminders, weekly, locale, tx] = await Promise.all([
    loadMemberInsurance(userId),
    prisma.insuranceReminder.findMany({ where: { userId }, orderBy: { sentAt: "desc" } }),
    prisma.insuranceExpiredReminder.findMany({ where: { userId }, orderBy: { sentAt: "desc" } }),
    currentLocale(),
    serverTx(),
  ]);
  if (!member) return null;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: INSURANCE_TIME_ZONE });
  const number = new Intl.NumberFormat(locale);
  const now = new Date();
  return (
    <section className={`${card} mt-4 min-w-0 space-y-3 p-4 text-sm [overflow-wrap:anywhere]`}>
      <h2 className="font-serif text-xl">{tx("Insurance")}</h2>
      <p className="font-semibold" data-testid="admin-insurance-status">{tx(memberInsuranceStatus(member))}</p>
      {member.insuranceSuspendedAt ? (
        <form action={liftInsuranceSuspension} className="grid gap-2 rounded border border-brass bg-cream p-3" data-testid="admin-insurance-suspended">
          <p>{tx("Suspended for an expired policy on {date}. The member can sign in and update insurance on Profile; a current policy lifts it automatically.").replace("{date}", date.format(member.insuranceSuspendedAt))}</p>
          <input type="hidden" name="userId" value={userId} />
          <SubmitButton className="min-h-11 justify-self-start rounded border border-forest px-4 font-semibold text-forest">{tx("Lift insurance suspension")}</SubmitButton>
        </form>
      ) : null}
      <dl className="grid min-w-0 gap-2 sm:grid-cols-2">
        {[
          ["Insurance agent name", member.insuranceAgentName],
          ["Insurance agent email", member.insuranceAgentEmail],
          ["Insurance agent phone", member.insuranceAgentPhone],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-semibold">{tx(label)}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="font-semibold">{tx("Certificate of insurance")}</dt>
          <dd>{member.insuranceCertificate ? (
            <a href={`/api/insurance-certificates/${userId}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline decoration-brass">
              {member.insuranceCertificate.fileName} · {date.format(member.insuranceCertificate.uploadedAt)}
            </a>
          ) : "—"}</dd>
        </div>
      </dl>
      <h3 className="font-semibold">{tx("Policies")}</h3>
      <ul className="space-y-1">
        {member.insurancePolicies.map((policy) => {
          const days = insuranceDaysUntil(policy.expiresOn, now);
          const status = days < 0 ? tx("Expired") : days === 1 ? tx("Expires in 1 day") : tx("Expires in {n} days").replace("{n}", number.format(days));
          const limits = [policy.limitAmount, policy.aggregateAmount].filter((n) => n > 0).map(shortMoney).join(" / ");
          return <li key={policy.id}>{[insurancePolicyLabel(policy.type, policy.otherName, tx), limits, date.format(policy.expiresOn), status].filter(Boolean).join(" · ")}</li>;
        })}
      </ul>
      {!member.insurancePolicies.length ? <p>—</p> : null}
      <h3 className="font-semibold">{tx("Reminder log")}</h3>
      <ul className="space-y-1">
        {reminders.map((entry) => (
          <li key={entry.id}>{insurancePolicyLabel(entry.policyType, "", tx)} · {entry.expiresKey} · {tx("30-day reminder")} · {tx("Recorded on {date}").replace("{date}", date.format(entry.sentAt))}</li>
        ))}
        {weekly.map((entry) => (
          <li key={entry.id}>{insurancePolicyLabel(entry.policyType, "", tx)} · {entry.expiresKey} · {tx("Expired: reminder {week} of 4").replace("{week}", String(entry.week))} · {tx("Recorded on {date}").replace("{date}", date.format(entry.sentAt))}</li>
        ))}
      </ul>
      {!reminders.length && !weekly.length ? <p>—</p> : null}
    </section>
  );
}
