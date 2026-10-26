import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Older letters used this path. The current letter uses /request-status. */
export default async function InviteStatusRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/request-status/${encodeURIComponent(token)}`);
}
