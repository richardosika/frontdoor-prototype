import { notFound } from "next/navigation";
import { restoreTemplate, saveTemplate, sendTestTemplate } from "@/actions/crm";
import { Banner } from "@/components/banner";
import { TemplateEditor } from "@/components/template-editor";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btnOutline, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { isTemplateKey, sampleTemplateVars, TEMPLATE_VARIABLES } from "@/lib/email-templates";
import { formatAuditTime } from "@/lib/format";
import { ensureTemplates } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TemplateEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const { key } = await params;
  const query = await searchParams;
  if (!isTemplateKey(key)) notFound();
  await ensureTemplates();
  const template = await prisma.emailTemplate.findUnique({
    where: { key },
    include: { versions: { orderBy: { version: "desc" }, take: 12 } },
  });
  if (!template) notFound();
  return (
    <div>
      <MobileTitle href="/admin/templates" label="Templates" title={template.name} />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title={template.name} />
        <div className="mt-3">
          <Banner error={query.error} notice={query.notice} />
        </div>
        <p className="mt-3 text-sm text-ink">
          Variables: {TEMPLATE_VARIABLES.map((name) => `{${name}}`).join(", ")}. The sign-off Richard Osika, Founder is added to the letter, not the subject. Declined mail does not include a reason.
        </p>
        <TemplateEditor
          templateKey={template.key}
          initialSubject={template.subject}
          initialBody={template.body}
          sample={sampleTemplateVars()}
          save={saveTemplate}
          sendTest={sendTestTemplate}
        />
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Versions</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {template.versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p>
                    Version {version.version} · {formatAuditTime(version.createdAt)}
                  </p>
                  <p className="text-ink">{version.subject}</p>
                </div>
                <form action={restoreTemplate}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <button className={btnOutline} type="submit">
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
