import { createSampleApplicants, deleteRecentRecords, deleteTestData, seedMemberNetwork, seedPaymentDueMember } from "@/actions/owner";
import { CreateTestApplicantForm } from "@/components/create-test-applicant";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TestConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const count = await prisma.application.count({ where: { isTest: true } });
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Test console" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Test console" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <section className={`${card} mt-4 p-4 text-sm text-ink`}>
          <p>{count} test applications are in the database. Sample rows are labelled TEST and tagged is_test.</p>
          <p className="mt-2">
            Create sample applicants adds six people: a strong legit file, an ambiguous file, a sanctions-style hit on the fake name Alexei Sanctionhit, a thin private-email file, a disposable email, and a duplicate of an existing member. The first pass runs offline so each verdict is visible without waiting on outside sites. Re-run on an application uses live sources.
          </p>
          <p className="mt-2">Delete all test data removes only is_test applications and is_test members, including anyone created with the form below.</p>
          <p className="mt-2">Delete records from the last N hours removes applications, non-admin members, CRM people, requests to join, and unused referral codes created in that window. Administrators stay. Use it for a probe, not for the seeded samples, unless those samples were created inside the window.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={createSampleApplicants}>
              <button className={btn} type="submit">
                Create sample applicants
              </button>
            </form>
            <form id="delete-test-data" action={deleteTestData} />
            <ConfirmSubmitButton
              form="delete-test-data"
              className={btnOutline}
              message="Delete every is_test applicant and member? This cannot be undone. People who are not marked is_test stay."
            >
              Delete all test data
            </ConfirmSubmitButton>
          </div>
          <form id="delete-recent" action={deleteRecentRecords} className="mt-4 flex flex-wrap items-end gap-2">
            <label>
              <span className={labelCls}>Hours</span>
              <input name="hours" type="number" min={1} max={168} defaultValue={24} className={field} />
            </label>
          </form>
          <ConfirmSubmitButton
            form="delete-recent"
            className={`${btnOutline} mt-2`}
            message="Delete applications, non-admin members, CRM people, requests to join, and unused referral codes created in this window? Administrators stay. This cannot be undone."
          >
            Delete records from the last N hours
          </ConfirmSubmitButton>
        </section>
        <section className={`${card} mt-4 p-4 text-sm text-ink`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Member floor samples</h2>
          <p className="mt-2">
            Adds three is_test members (developer, general contractor, and investor), a published seeking post, a post held for review, a pending introduction, and an accepted thread. Password is cornicio-demo. Delete all test data removes them.
          </p>
          <form action={seedMemberNetwork} className="mt-3">
            <button className={btn} type="submit">
              Seed sample members
            </button>
          </form>
        </section>
        <section className={`${card} mt-4 p-4 text-sm text-ink`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Payment due sample</h2>
          <p className="mt-2">
            Adds Gina Paytest, an is_test general contractor already approved with payment due (test.gc.pay@example.com, password cornicio-demo, first month $74.50, then $149 per month). Sign-in stops on the Pay dues page. The button does not charge a card. Delete all test data removes her.
          </p>
          <form action={seedPaymentDueMember} className="mt-3">
            <button className={btn} type="submit">
              Seed payment-due member
            </button>
          </form>
        </section>
        <section className={`${card} mt-4 p-4 text-sm text-ink`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Create a test applicant</h2>
          <p className="mt-2">
            Runs live verification on a name you choose, without /apply. The row is marked is_test. Notices still go only to the test recipient.
          </p>
          <CreateTestApplicantForm />
        </section>
      </div>
    </div>
  );
}
