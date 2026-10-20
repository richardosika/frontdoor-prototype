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
    <div className="mx-auto max-w-3xl md:px-8 md:py-6">
      {params.error || params.notice ? (
        <div className="px-4 pt-3 md:px-0">
          <Banner error={params.error} notice={params.notice} />
        </div>
      ) : null}
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
