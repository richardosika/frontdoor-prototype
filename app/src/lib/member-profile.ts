import { prisma } from "@/lib/prisma";
import { toPublicVerification, type PublicVerification, type VerificationStatus } from "@/lib/verification";

export async function loadMemberProfile(viewerId: string, memberId: string) {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: {
      projects: { include: { confirmations: true }, orderBy: { year: "desc" } },
    },
  });
  if (!member || member.status !== "ACTIVE") return null;
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
  const projects = member.projects.map((project) => {
    const record = cases.find((item) => item.projectId === project.id);
    return {
      id: project.id,
      name: project.name,
      asset: project.asset,
      location: project.location,
      year: project.year,
      valueLabel: project.valueLabel,
      summary: project.summary,
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
      createdAt: member.createdAt,
    },
    projects,
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
