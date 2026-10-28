import Link from "next/link";
import { setDeliveryMode } from "@/actions/crm";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, card, sectionLabel } from "@/components/ui";
import { duesSchedule } from "@/lib/admin-home";
import { noticeTestRecipient } from "@/lib/brand";
import { resendKeyConfigured } from "@/lib/resend-mail";
import { requireAdmin } from "@/lib/current-user";
import { mailDeliveryMode } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const mode = await mailDeliveryMode();
  const recipient = noticeTestRecipient();
  const live = mode === "live";
  const resend = resendKeyConfigured();
  const dues = duesSchedule();

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Settings" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Settings" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <section className={`${card} mt-4 p-4 ${live ? "border-brass" : ""}`}>
          <h2 className={sectionLabel}>Notice delivery</h2>
          <p className="mt-3 font-serif text-3xl font-normal">{live ? "Live" : "Test"}</p>
          <p className="mt-2 text-sm text-ink">
            {resend
              ? `Resend is configured. Every notice is stored in the Outbox and also emailed only to ${recipient}. Applicants are not emailed.`
              : live
                ? `Live is saved on this page. RESEND_API_KEY is not set, so nobody is emailed. Every notice stays in the Outbox for ${recipient}.`
                : `Test mode. Every notice is stored in the Outbox for ${recipient}. Set RESEND_API_KEY to also email that inbox. Applicants are not emailed.`}
          </p>
          <p className="mt-3 text-sm text-ink">
            Test recipient <b>{recipient}</b>. This is <span className="font-mono text-xs">NOTICE_TEST_RECIPIENT</span>. It is read here and changed in the service environment.
          </p>
          <form action={setDeliveryMode} className="mt-4 space-y-3">
            <input type="hidden" name="back" value="/admin/settings" />
            <fieldset className="space-y-2">
              <legend className="sr-only">Test or live mode</legend>
              <label className={`${card} flex min-h-11 cursor-pointer gap-3 p-3 ${live ? "" : "border-brass"}`}>
                <input type="radio" name="delivery" value="outbox" defaultChecked={!live} className="mt-1" />
                <span>
                  <b className="block">Test</b>
                  <span className="text-sm text-ink">Outbox only, for the test recipient.</span>
                </span>
              </label>
              <label className={`${card} flex min-h-11 cursor-pointer gap-3 p-3 ${live ? "border-brass" : ""}`}>
                <input type="radio" name="delivery" value="live" defaultChecked={live} className="mt-1" />
                <span>
                  <b className="block">Live</b>
                  <span className="text-sm text-ink">Saved preference. Resend still sends only to the test recipient.</span>
                </span>
              </label>
            </fieldset>
            <button className={btn} type="submit">
              Save delivery mode
            </button>
          </form>
        </section>

        <section className={`${card} mt-4 p-4`}>
          <h2 className={sectionLabel}>Membership dues</h2>
          <p className="mt-2 text-sm text-ink">
            Month to month. The first month is 50% off, then the full monthly price. Due only after approval. They are not edited on this page and they are never based on a deal. Waive a person from their member page.
          </p>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-mut">
                <th className="py-2 font-semibold">Role</th>
                <th className="py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {dues.filter((row) => row.cents > 0).map((row) => (
                <tr key={row.role} className="border-b border-line">
                  <td className="py-2">{row.label}</td>
                  <td className="py-2">{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-mut">Architects, other attorneys, and the remaining roles use the attorney / advisor amount.</p>
        </section>

        <section className={`${card} mt-4 p-4 text-sm`}>
          <h2 className={sectionLabel}>Sources and watchlists</h2>
          <p className="mt-2 text-ink">OFAC cache and the free verification sources live on their own page.</p>
          <Link href="/admin/sources" className="mt-3 inline-flex min-h-11 items-center underline decoration-brass">
            Open sources and watchlists
          </Link>
        </section>
      </div>
    </div>
  );
}
