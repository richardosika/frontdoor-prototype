import { prisma } from "@/lib/prisma";

export async function loadMemberProfile(viewerId: string, memberId: string) {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: {
      projects: { include: { confirmations: true }, orderBy: { year: "desc" } },
    },
  });
  if (!member || member.status !== "ACTIVE") return null;
  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { fromId: viewerId, toId: memberId },
        { fromId: memberId, toId: viewerId },
      ],
    },
  });
  let state: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING" = "NONE";
  if (connection?.status === "ACCEPTED") state = "ACCEPTED";
  else if (connection?.status === "PENDING" && connection.fromId === viewerId) state = "PENDING";
  else if (connection?.status === "PENDING" && connection.toId === viewerId) state = "INCOMING";
  const vouchCount = member.projects.reduce(
    (sum, project) =>
      sum + project.confirmations.filter((item) => item.status === "CONFIRMED" && item.reviewStatus === "APPROVED").length,
    0,
  );
  return { member, connection: state, vouchCount };
}
