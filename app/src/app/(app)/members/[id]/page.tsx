import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner } from "@/components/banner";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/current-user";
import { loadMemberProfile } from "@/lib/member-profile";
import { appBaseUrl } from "@/lib/url";
import { isDeveloperRole } from "@/lib/member-reach";

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
  const tx = await serverTx();
  const [loaded, linkOrigin] = await Promise.all([loadMemberProfile(user.id, id), appBaseUrl()]);
  if (!loaded) notFound();
  const backHref = isDeveloperRole(user.role) ? "/deals" : "/network";
  const backLabel = isDeveloperRole(user.role) ? tx("Find your team") : tx("My Circle");
  return (
    <div className="mx-auto max-w-3xl md:px-8 md:py-6">
      <Link href={backHref} className="mb-3 hidden px-1 text-sm text-mut md:inline-block">
        ‹ {backLabel}
      </Link>
      <div className="md:px-0">
        <Banner error={query.error ? tx(query.error) : undefined} notice={query.notice ? tx(query.notice) : undefined} />
      </div>
      <ProfileView
        member={loaded.member}
        projects={loaded.projects}
        gallery={loaded.gallery}
        isSelf={user.id === loaded.member.id}
        connection={loaded.connection}
        intro={loaded.intro}
        introductionId={loaded.introductionId}
        projectCount={loaded.projects.length}
        vouchCount={loaded.vouchCount}
        backHref={backHref}
        linkOrigin={linkOrigin}
        verification={loaded.verification}
        blockedByViewer={loaded.blockedByViewer}
        blockedByThem={loaded.blockedByThem}
      />
    </div>
  );
}
