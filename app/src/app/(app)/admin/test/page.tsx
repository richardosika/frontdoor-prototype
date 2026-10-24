import { createSampleApplicants, deleteTestData } from "@/actions/owner";
import { AdminNav } from "@/components/admin-nav";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, btnOutline, card } from "@/components/ui";
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
          <p className="mt-2">Delete all test data removes only is_test applications and is_test members.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={createSampleApplicants}>
              <button className={btn} type="submit">
                Create sample applicants
              </button>
            </form>
            <form action={deleteTestData}>
              <button className={btnOutline} type="submit">
                Delete all test data
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
