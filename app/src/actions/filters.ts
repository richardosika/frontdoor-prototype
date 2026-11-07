"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { FILTER_SURFACES, safeFilterQuery, type FilterSurface } from "@/lib/project-filter";
import { prisma } from "@/lib/prisma";

function isSurface(value: string): value is FilterSurface {
  return (FILTER_SURFACES as readonly string[]).includes(value);
}

function back(surface: FilterSurface, query: string, extra?: Record<string, string>) {
  const params = new URLSearchParams(query);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
  }
  const value = params.toString();
  return value ? `/${surface}?${value}` : `/${surface}`;
}

export async function saveFilter(formData: FormData) {
  const user = await requireUser();
  const surfaceRaw = String(formData.get("surface") || "");
  if (!isSurface(surfaceRaw)) redirect("/deals?error=Choose+a+page");
  const query = safeFilterQuery(String(formData.get("query") || ""));
  if (query === null) redirect(back(surfaceRaw, "", { error: "That filter link is not valid" }));
  if (!query) redirect(back(surfaceRaw, "", { error: "Apply a filter before saving it" }));
  const name = String(formData.get("name") || "")
    .replace(/[^\w '&.-]/g, "")
    .trim()
    .slice(0, 40);
  if (name.length < 2) redirect(back(surfaceRaw, query, { error: "Name the filter" }));
  const count = await prisma.savedFilter.count({ where: { userId: user.id, surface: surfaceRaw } });
  if (count >= 12) redirect(back(surfaceRaw, query, { error: "You can save 12 filters on this page" }));
  await prisma.savedFilter.create({
    data: { userId: user.id, name, surface: surfaceRaw, query },
  });
  revalidatePath(`/${surfaceRaw}`);
  redirect(back(surfaceRaw, query, { notice: "Filter saved" }));
}

export async function deleteSavedFilter(formData: FormData) {
  const user = await requireUser();
  const surfaceRaw = String(formData.get("surface") || "");
  if (!isSurface(surfaceRaw)) redirect("/deals");
  const id = String(formData.get("id") || "");
  const query = safeFilterQuery(String(formData.get("query") || "")) ?? "";
  await prisma.savedFilter.deleteMany({ where: { id, userId: user.id } });
  revalidatePath(`/${surfaceRaw}`);
  redirect(back(surfaceRaw, query, { notice: "Filter removed" }));
}
