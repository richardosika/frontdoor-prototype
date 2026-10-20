import { Banner } from "@/components/banner";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/current-user";
import { loadMemberProfile } from "@/lib/member-profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const loaded = await loadMemberProfile(user.id, user.id);
  if (!loaded) return null;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <Banner error={params.error} notice={params.notice} />
      <ProfileView
        member={loaded.member}
        projects={loaded.member.projects}
        isSelf
        connection="NONE"
        projectCount={loaded.member.projects.length}
        vouchCount={loaded.vouchCount}
      />
    </div>
  );
}
