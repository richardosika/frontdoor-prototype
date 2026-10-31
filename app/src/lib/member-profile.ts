import { blocksMembership } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { projectAudience } from "@/lib/project-contact-db";
import { canContactAboutProject, categoryForRole, projectDetailsVisible } from "@/lib/project-contact";
import { projectAccessible } from "@/lib/member-reach";
import { toPublicVerification, type PublicVerification, type VerificationStatus } from "@/lib/verification";

export async function loadMemberProfile(viewerId: string, memberId: string) {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: {
      projects: {
        include: {
          confirmations: true,
          contacts: { where: { OR: [{ fromId: viewerId }, { toId: viewerId }] }, select: { status: true } },
          documents: { select: { id: true, title: true, fileName: true, sizeBytes: true, version: true, updatedAt: true }, orderBy: { createdAt: "asc" } },
          deals: { select: { id: true } },
        },
        orderBy: { year: "desc" },
      },
      images: {
        where: { kind: "GALLERY" },
        select: { id: true, caption: true, width: true, height: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!member || member.status !== "ACTIVE") return null;
  if (viewerId !== memberId && blocksMembership(member.paymentStatus)) return null;
  const viewer = (await prisma.user.findUnique({ where: { id: viewerId }, select: { id: true, role: true, isAdmin: true } })) ?? {
    id: viewerId,
    role: "",
    isAdmin: false,
  };
  const [connection, introduction] = await Promise.all([
    prisma.connection.findFirst({
      where: {
        OR: [
          { fromId: viewerId, toId: memberId },
          { fromId: memberId, toId: viewerId },
        ],
      },
    }),
    prisma.introduction.findFirst({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [
          { fromId: viewerId, toId: memberId },
          { fromId: memberId, toId: viewerId },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  let state: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING" = "NONE";
  if (connection?.status === "ACCEPTED") state = "ACCEPTED";
  else if (connection?.status === "PENDING" && connection.fromId === viewerId) state = "PENDING";
  else if (connection?.status === "PENDING" && connection.toId === viewerId) state = "INCOMING";
  let intro: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING" = "NONE";
  if (introduction?.status === "ACCEPTED") intro = "ACCEPTED";
  else if (introduction?.status === "PENDING" && introduction.fromId === viewerId) intro = "PENDING";
  else if (introduction?.status === "PENDING" && introduction.toId === viewerId) intro = "INCOMING";
  const vouchCount = member.projects.reduce(
    (sum, project) =>
      sum + project.confirmations.filter((item) => item.status === "CONFIRMED" && item.reviewStatus === "APPROVED").length,
    0,
  );
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: memberId },
        { blockerId: memberId, blockedId: viewerId },
      ],
    },
    select: { blockerId: true },
  });
  const blockedByViewer = blocks.some((item) => item.blockerId === viewerId);
  const blockedByThem = blocks.some((item) => item.blockerId === memberId);
  const cases = await prisma.verificationCase.findMany({
    where: {
      OR: [{ userId: memberId }, { projectId: { in: member.projects.map((project) => project.id) } }],
    },
    select: {
      userId: true,
      projectId: true,
      status: true,
      verifiedAt: true,
      expiresAt: true,
      checks: { select: { result: true } },
    },
  });
  const memberCase = cases.find((item) => item.userId === memberId);
  const verification = toPublicVerification(
    memberCase
      ? { ...memberCase, status: memberCase.status as VerificationStatus }
      : null,
  );
  const inOwnerCircle = connection?.status === "ACCEPTED";
  // #25: a member sees another member's project only when it seeks their category or they are in the owner's circle.
  // A developer whose approved project seeks this member's category also sees the member's past work (Find your team).
  const memberCategory = categoryForRole(member.role);
  const teamCandidate =
    viewer.id !== member.id && memberCategory
      ? (await prisma.trackProject.count({ where: { userId: viewer.id, reviewStatus: "APPROVED", seeking: { contains: memberCategory } } })) > 0
      : false;
  const visibleProjects = member.projects.filter(
    (project) =>
      projectAccessible(project, { id: viewer.id, isAdmin: viewer.isAdmin, role: viewer.role, inOwnerCircle }) ||
      (teamCandidate && project.reviewStatus === "APPROVED"),
  );
  const audiences = new Map(
    await Promise.all(
      visibleProjects.map(async (project) => [project.id, viewer.id === project.userId || viewer.isAdmin ? [] : await projectAudience(project.id)] as const),
    ),
  );
  const ownDeals = viewerId === memberId ? await prisma.deal.findMany({ where: { sponsorId: memberId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }) : [];
  const projects = visibleProjects.map((project) => {
    const record = cases.find((item) => item.projectId === project.id);
    return {
      id: project.id,
      name: project.name,
      asset: project.asset,
      location: project.location,
      year: project.year,
      valueLabel: project.valueLabel,
      summary: project.summary,
      street: project.street,
      city: project.city,
      state: project.state,
      role: project.role,
      seeking: project.seeking,
      shareWithCircle: project.shareWithCircle,
      roleFacts: project.roleFacts,
      reviewStatus: project.reviewStatus,
      reviewNote: viewer.id === project.userId || viewer.isAdmin ? project.reviewNote : "",
      detailsVisible: projectDetailsVisible(project, { id: viewer.id, isAdmin: viewer.isAdmin, inOwnerCircle }),
      canContact:
        viewer.id !== project.userId &&
        canContactAboutProject({ project, from: { id: viewer.id, role: viewer.role }, to: { id: member.id, role: member.role } }).ok,
      contactStatus: project.contacts[0]?.status ?? "",
      documents: project.documents,
      documentsVisible: viewer.id === project.userId || viewer.isAdmin || (audiences.get(project.id) ?? []).includes(viewer.id),
      linkedDealId: project.deals[0]?.id ?? "",
      confirmations: project.confirmations.map((item) => ({
        id: item.id,
        status: item.status,
        reviewStatus: item.reviewStatus,
        counterpartyName: item.counterpartyName,
        token: item.token,
      })),
      verification: toPublicVerification(record ? { ...record, status: record.status as VerificationStatus } : null),
    };
  });
  return {
    member: {
      id: member.id,
      name: member.name,
      initials: member.initials,
      photoId: member.photoId,
      coverId: member.coverId,
      org: member.org,
      location: member.location,
      role: member.role,
      tier: member.tier,
      bio: member.bio,
      website: member.website,
      markets: member.markets,
      dealTypes: member.dealTypes,
      assetClasses: member.assetClasses,
      checkSize: member.checkSize,
      lookingFor: member.lookingFor,
      offering: member.offering,
      yearsInBusiness: member.yearsInBusiness,
      typicalJobSize: member.typicalJobSize,
      licenses: member.licenses,
      insuranceInfo: member.insuranceInfo,
      specialties: member.specialties,
      // Private rates and terms only ever go back to the member themself.
      privateTerms: viewerId === memberId ? member.privateTerms : "",
      createdAt: member.createdAt,
    },
    projects,
    gallery: member.images,
    ownDeals,
    verification,
    connection: state,
    intro,
    introductionId: introduction?.id ?? "",
    vouchCount,
    blockedByViewer,
    blockedByThem,
  };
}

export type { PublicVerification };
