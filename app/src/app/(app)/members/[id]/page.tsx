import { notFound } from "next/navigation";
import { Banner } from "@/components/banner";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/current-user";
import { loadMemberProfile } from "@/lib/member-profile";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const loaded = await loadMemberProfile(user.id, id);
  if (!loaded) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <Banner error={query.error} notice={query.notice} />
      <ProfileView
        member={loaded.member}
        projects={loaded.member.projects}
        isSelf={user.id === loaded.member.id}
        connection={loaded.connection}
        projectCount={loaded.member.projects.length}
        vouchCount={loaded.vouchCount}
      />
    </div>
  );
}
