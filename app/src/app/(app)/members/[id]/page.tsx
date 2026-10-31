import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner } from "@/components/banner";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/current-user";
import { loadMemberProfile } from "@/lib/member-profile";
import { appBaseUrl } from "@/lib/url";
import { isDeveloperRole } from "@/lib/member-reach";
import { VendorProfile } from "@/components/vendor-profile";
import { prisma } from "@/lib/prisma";
import { canContactAboutProject, memberCategories } from "@/lib/project-contact";

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
  // #38: the viewer's approved projects that seek this member's category, with any contact already sent.
  const categories = memberCategories(loaded.member);
  const mine = categories.length && user.id !== loaded.member.id
    ? await prisma.trackProject.findMany({
        where: { userId: user.id, reviewStatus: "APPROVED", OR: categories.map((id) => ({ seeking: { contains: id } })) },
        include: { contacts: { where: { OR: [{ toId: loaded.member.id }, { fromId: loaded.member.id }] }, select: { status: true } } },
        orderBy: { submittedAt: "desc" },
      })
    : [];
  const reach = mine
    .filter((project) => canContactAboutProject({ project, from: { id: user.id, role: user.role }, to: { id: loaded.member.id, role: loaded.member.role, extraCategories: loaded.member.extraCategories } }).ok)
    .map((project) => ({ id: project.id, name: project.name, status: project.contacts[0]?.status ?? "" }));
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
      {user.id !== loaded.member.id ? (
        <VendorProfile
          member={loaded.member}
          projects={loaded.projects}
          gallery={loaded.gallery}
          reach={reach}
          canMessage={loaded.intro === "ACCEPTED" || loaded.connection === "ACCEPTED"}
          blockedByViewer={loaded.blockedByViewer}
          blockedByThem={loaded.blockedByThem}
          reviewed
        />
      ) : (
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
      )}
    </div>
  );
}
