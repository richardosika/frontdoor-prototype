import Link from "next/link";
import { setDeliveryMode } from "@/actions/crm";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, card, field } from "@/components/ui";
import { noticeTestRecipient } from "@/lib/brand";
import { requireAdmin } from "@/lib/current-user";
import { ensureTemplates, mailDeliveryMode } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  await ensureTemplates();
  const [templates, mode] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" }, include: { versions: { select: { id: true } } } }),
    mailDeliveryMode(),
  ]);
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Email templates" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Email templates" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <p className="mt-3 text-sm text-ink">
          Every send on this build is stored in the Outbox. When RESEND_API_KEY is set, a copy is emailed only to {noticeTestRecipient()}. Applicants are not emailed.
        </p>
        <form action={setDeliveryMode} className={`${card} mt-4 flex flex-wrap items-end gap-3 p-4`}>
          <label className="text-sm">
            Delivery flag
            <select name="delivery" defaultValue={mode} className={`${field} mt-1`}>
              <option value="outbox">Outbox (test)</option>
              <option value="live">Live (not connected)</option>
            </select>
          </label>
          <button className={btn} type="submit">
            Save flag
          </button>
        </form>
        <ul className="mt-4 space-y-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link href={`/admin/templates/${template.key}`} className={`${card} block p-4`}>
                <h2 className="font-serif text-xl font-normal">{template.name}</h2>
                <p className="text-sm text-ink">{template.subject}</p>
                <p className="text-xs text-mut">{template.versions.length} version{template.versions.length === 1 ? "" : "s"}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
