import { InsurancePrompt } from "@/components/insurance-prompt";
import { Banner } from "@/components/banner";
import { BidsWon } from "@/components/bids-won";
import { ReferralRecognition } from "@/components/referral-recognition";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/current-user";
import { loadMemberProfile } from "@/lib/member-profile";
import { appBaseUrl } from "@/lib/url";
import { serverTx } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; warning?: string }>;
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
      {params.warning ? (
        /* Nov 17 (Richard, decision 3): the profile saved, but insurance is incomplete. */
        <div className="px-4 md:px-0">
          <p role="alert" data-testid="insurance-warning" className="mb-3 rounded border border-brass bg-brass-soft px-3 py-2 text-sm font-semibold text-forest [overflow-wrap:anywhere]">
            {tx("Profile saved, but your insurance is not complete:")} {tx(params.warning)}
          </p>
        </div>
      ) : null}
      <div className="px-4 md:px-0"><InsurancePrompt user={user} /></div>
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
      <ReferralRecognition memberId={loaded.member.id} />
      <BidsWon memberId={loaded.member.id} />
    </div>
  );
}
