import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { publicAbsoluteUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

/** Older letters used this path. The current letter uses /request-status. */
export default async function InviteStatusRedirect({
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
  redirect(publicAbsoluteUrl(`/request-status/${encodeURIComponent(token)}${suffix}`, await headers()));
}
