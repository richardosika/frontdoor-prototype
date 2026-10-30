import { Banner } from "@/components/banner";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/current-user";
import { loadMemberProfile } from "@/lib/member-profile";
import { appBaseUrl } from "@/lib/url";
import { serverTx } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tx = await serverTx();
  const [loaded, linkOrigin] = await Promise.all([loadMemberProfile(user.id, user.id), appBaseUrl()]);
  if (!loaded) return null;
  return (
    <div className="mx-auto max-w-3xl md:px-8 md:py-6">
      {params.error || params.notice ? (
        <div className="px-4 pt-3 md:px-0">
          <Banner error={params.error ? tx(params.error) : undefined} notice={params.notice ? tx(params.notice) : undefined} />
        </div>
      ) : null}
      <ProfileView
        member={loaded.member}
        projects={loaded.projects}
        gallery={loaded.gallery}
        isSelf
        connection="NONE"
        intro="NONE"
        introductionId=""
        projectCount={loaded.projects.length}
        vouchCount={loaded.vouchCount}
        linkOrigin={linkOrigin}
        verification={loaded.verification}
        blockedByViewer={false}
        blockedByThem={false}
        ownDeals={loaded.ownDeals}
      />
    </div>
  );
}
