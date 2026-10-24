import { createHelpArticle, saveHelpArticle } from "@/actions/help-admin";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, card, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { ensureHelpArticles } from "@/lib/help/store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminHelpFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  await ensureHelpArticles();
  const articles = await prisma.helpArticle.findMany({ orderBy: { title: "asc" } });

  return (
    <div>
      <MobileTitle href="/admin/help" label="Help" title="FAQ" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="FAQ and knowledge" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <p className="mt-3 text-sm text-ink">
          Published articles are retrieved with the legal drafts and the how-it-works notes. Unpublish an article to take it out of Help. Legal drafts stay in their files.
        </p>
        <form action={createHelpArticle} className={`${card} mt-4 space-y-2 p-4`}>
          <h2 className="font-serif text-xl font-normal">New article</h2>
          <label className={labelCls} htmlFor="new-title">
            Title
          </label>
          <input id="new-title" name="title" className={field} required />
          <label className={labelCls} htmlFor="new-body">
            Answer
          </label>
          <textarea id="new-body" name="body" className={`${field} min-h-28`} required />
          <button className={btn} type="submit">
            Add article
          </button>
        </form>
        <ul className="mt-4 space-y-4">
          {articles.map((article) => (
            <li key={article.id}>
              <form action={saveHelpArticle} className={`${card} space-y-2 p-4`}>
                <input type="hidden" name="id" value={article.id} />
                <label className={labelCls} htmlFor={`title-${article.id}`}>
                  Title
                </label>
                <input id={`title-${article.id}`} name="title" defaultValue={article.title} className={field} required />
                <label className={labelCls} htmlFor={`body-${article.id}`}>
                  Answer
                </label>
                <textarea id={`body-${article.id}`} name="body" defaultValue={article.body} className={`${field} min-h-36`} required />
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" name="published" value="yes" defaultChecked={article.published} />
                  Published
                </label>
                <button className={btn} type="submit">
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
