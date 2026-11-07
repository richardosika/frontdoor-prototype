import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { publicAbsoluteUrl } from "@/lib/public-origin";
import { publicStatusPath } from "@/lib/public-status";

export const dynamic = "force-dynamic";

/** Older letters opened the view path directly. Send them to the public status link. */
export default async function ApplicationStatusRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value)) for (const item of value) search.append(key, item);
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  redirect(publicAbsoluteUrl(`${publicStatusPath(token)}${suffix}`, await headers()));
}
