import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { BILLING_EMAIL_LOCALES, cardExpiryDay, cardExpiringEmail, paymentDeclinedEmail } from "@/lib/billing-emails";
import { appBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function BillingEmailPreviewsPage() {
  await requireAdmin();
  const base = await appBaseUrl();
  const now = new Date();
  const current = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "numeric",
  }).formatToParts(now);
  const month = Number(current.find((part) => part.type === "month")!.value);
  const year = Number(current.find((part) => part.type === "year")!.value);
  const expiresOn = cardExpiryDay(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year);
  return (
    <div data-testid="billing-email-previews" className="min-w-0">
      <MobileTitle href="/admin/templates" label="Templates" title="Billing email previews" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Billing email previews" />
        {BILLING_EMAIL_LOCALES.map((locale) => {
          const input = { locale, name: "Alex", expiresOn, link: `${base}/settings#billing` };
          const emails = [
            cardExpiringEmail("30", input),
            cardExpiringEmail("2", input),
            paymentDeclinedEmail({ locale, name: "Alex", link: `${base}/pay` }),
          ];
          return (
            <section key={locale} lang={locale} className="mt-6 min-w-0">
              <h2 className="font-serif text-2xl">{locale.toUpperCase()}</h2>
              {emails.map((email, index) => (
                <article key={index} className={`${card} mt-3 min-w-0 p-4`}>
                  <h3 className="break-words font-serif text-xl">{email.subject}</h3>
                  <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed [overflow-wrap:anywhere]">{email.text}</pre>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
