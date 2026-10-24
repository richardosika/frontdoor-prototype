"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { ensureHelpArticles } from "@/lib/help/store";
import { prisma } from "@/lib/prisma";

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "article";
}

export async function saveHelpArticle(formData: FormData) {
  await requireAdmin();
  await ensureHelpArticles();
  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim().slice(0, 140);
  const body = String(formData.get("body") || "").trim().slice(0, 8000);
  const published = formData.get("published") === "yes";
  if (title.length < 2 || body.length < 2) redirect("/admin/help/faq?error=Title+and+answer+are+required");
  const article = await prisma.helpArticle.findUnique({ where: { id } });
  if (!article) redirect("/admin/help/faq?error=That+article+is+gone");
  await prisma.helpArticle.update({ where: { id }, data: { title, body, published } });
  revalidatePath("/admin/help/faq");
  redirect("/admin/help/faq?notice=Saved");
}

export async function createHelpArticle(formData: FormData) {
  await requireAdmin();
  await ensureHelpArticles();
  const title = String(formData.get("title") || "").trim().slice(0, 140);
  const body = String(formData.get("body") || "").trim().slice(0, 8000);
  if (title.length < 2 || body.length < 2) redirect("/admin/help/faq?error=Title+and+answer+are+required");
  let slug = slugify(title);
  const taken = await prisma.helpArticle.findUnique({ where: { slug } });
  if (taken) slug = `${slug}-${Date.now().toString(36)}`.slice(0, 70);
  await prisma.helpArticle.create({ data: { slug, title, body, published: true } });
  revalidatePath("/admin/help/faq");
  redirect("/admin/help/faq?notice=Added");
}
