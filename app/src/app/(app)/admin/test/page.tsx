import { createCustomTestApplicant, createSampleApplicants, deleteTestData, seedMemberNetwork, seedPaymentDueMember } from "@/actions/owner";
import { AdminNav } from "@/components/admin-nav";
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
        <AdminNav current="/admin/test" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <section className={`${card} mt-4 p-4 text-sm text-ink`}>
          <p>{count} test applications are in the database. Sample rows are labelled TEST and tagged is_test.</p>
          <p className="mt-2">
            Create sample applicants adds six people: a strong legit file, an ambiguous file, a sanctions-style hit on the fake name Alexei Sanctionhit, a thin private-email file, a disposable email, and a duplicate of an existing member. The first pass runs offline so each verdict is visible without waiting on outside sites. Re-run on an application uses live sources.
          </p>
          <p className="mt-2">Delete all test data removes only is_test applications and is_test members, including anyone created with the form below.</p>
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
            Adds Gina Paytest, an is_test general contractor already approved with payment due (test.gc.pay@example.com, password cornicio-demo, $2,400). Sign-in stops on the Pay dues page. The button does not charge a card. Delete all test data removes her.
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
          <form action={createCustomTestApplicant} className="mt-4 grid gap-3">
            <label className="block">
              <span className={labelCls}>Name</span>
              <input className={field} name="name" required placeholder="Stephen Ross" />
            </label>
            <label className="block">
              <span className={labelCls}>Company</span>
              <input className={field} name="org" required placeholder="Related Companies" />
            </label>
            <label className="block">
              <span className={labelCls}>Email</span>
              <input className={field} name="email" type="email" required placeholder="stephen.ross.probe@example.com" />
            </label>
            <label className="block">
              <span className={labelCls}>Website</span>
              <input className={field} name="website" placeholder="https://www.related.com" />
            </label>
            <label className="block">
              <span className={labelCls}>Location</span>
              <input className={field} name="location" placeholder="New York, NY" />
            </label>
            <button className={btn} type="submit">
              Create and run verification
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
