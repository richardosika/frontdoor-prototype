import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEntryLink } from "@/components/admin-mark";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { documentVersion, legalDoc, memberFacingLegal, readLegalMarkdown } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";
import { currentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDoc(slug);
  if (!doc) notFound();
  const [locale, tx, viewer] = await Promise.all([currentLocale(), serverTx(), currentUser().catch(() => null)]);
  // #19: signed-in members go back to the Ledger; everyone else to the homepage.
  const homeHref = viewer && viewer.status === "ACTIVE" ? "/feed" : "/";
  const source = readLegalMarkdown(doc.file, locale);
  const version = documentVersion(source);
  const html = renderMarkdown(memberFacingLegal(source));

  return (
    <main className="min-h-dvh bg-cream md:wash md:px-4 md:py-10">
      <article className="mx-auto min-h-dvh w-full max-w-2xl bg-paper px-6 py-8 text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <Logo />
        <p className="mt-6 rounded border border-brass bg-brass-soft px-3 py-2 text-sm text-forest">
          {tx("Draft - pending attorney review.")} {tx("Version")} {version}. {BRAND.legalName}, {BRAND.formation}. {BRAND.address}. {BRAND.contactEmail}.
        </p>
        <div className="mt-4" dangerouslySetInnerHTML={{ __html: html }} />
        <p className="mt-8 flex flex-wrap items-center gap-4 text-sm">
          <Link href={homeHref} className="underline decoration-brass" data-testid="legal-back-home">
            {tx("Back to home")}
          </Link>
          <AdminEntryLink />
        </p>
      </article>
    </main>
  );
}
