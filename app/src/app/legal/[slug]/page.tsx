import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";
import { documentVersion, LEGAL_DOCS, legalDoc, readLegalMarkdown, stripVersionLine } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDoc(slug);
  if (!doc) notFound();
  const source = readLegalMarkdown(doc.file);
  const version = documentVersion(source);
  const html = renderMarkdown(stripVersionLine(source));

  return (
    <main className="min-h-dvh bg-cream md:wash md:px-4 md:py-10">
      <article className="mx-auto min-h-dvh w-full max-w-2xl bg-paper px-6 py-8 text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <Logo />
        <p className="mt-6 rounded border border-brass bg-brass-soft px-3 py-2 text-sm text-forest">
          Draft - pending attorney review. Version {version}. {BRAND.legalName}, {BRAND.formation}. {BRAND.address}. {BRAND.contactEmail}.
        </p>
        <div className="mt-4" dangerouslySetInnerHTML={{ __html: html }} />
        <p className="mt-8 text-sm">
          <Link href="/apply" className="underline decoration-brass">
            Back to apply
          </Link>
        </p>
      </article>
    </main>
  );
}
