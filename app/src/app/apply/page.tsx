import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const query = await searchParams;
  const code = query.code ? `?code=${encodeURIComponent(query.code)}` : "";
  redirect(`/join${code}`);
}
