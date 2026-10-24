import Link from "next/link";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { ACCEPTANCE_SLUGS, LEGAL_DOCS, documentVersion, readLegalMarkdown } from "@/lib/legal";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  await requireAdmin();
  const recorded = new Set<string>(ACCEPTANCE_SLUGS);
  const docs = LEGAL_DOCS.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    version: documentVersion(readLegalMarkdown(doc.file)),
    recorded: recorded.has(doc.slug),
  }));

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Legal" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Legal versions" />
        <p className="mt-1 text-sm text-ink">
          Drafts members and applicants can open. The version is the first line of each file. Signup records the five acceptance documents.
        </p>
        <ul className="mt-4 space-y-3">
          {docs.map((doc) => (
            <li key={doc.slug} className={`${card} p-4 text-sm`}>
              <p className="font-serif text-xl font-normal">{doc.title}</p>
              <p className="mt-1 text-ink">Version {doc.version}</p>
              {doc.recorded ? <p className="text-xs uppercase tracking-wider text-brass">Recorded at signup</p> : null}
              <Link href={`/legal/${doc.slug}`} className="mt-2 inline-flex min-h-11 items-center underline decoration-brass">
                Open public page
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
