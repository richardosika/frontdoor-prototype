import { currentUser } from "@/lib/current-user";
import { documentsOpen, folderVisible, type TeamRoleId } from "@/lib/platform/deal-team";
import { prisma } from "@/lib/prisma";
import { dealStorage } from "@/lib/storage";
import { localLinkValid } from "@/lib/storage/local-disk";

export async function GET(
  request: Request,
  context: { params: Promise<{ dealId: string; documentId: string }> },
) {
  const user = await currentUser();
  if (!user || user.status !== "ACTIVE") return new Response("Forbidden", { status: 403 });
  const { dealId, documentId } = await context.params;
  const document = await prisma.dealDocument.findUnique({
    where: { id: documentId },
    include: { deal: true, folder: true },
  });
  if (!document || document.dealId !== dealId || !document.storageKey) return new Response("Not found", { status: 404 });
  const [team, access] = await Promise.all([
    prisma.dealTeamMember.findUnique({ where: { dealId_userId: { dealId, userId: user.id } } }),
    prisma.dealAccess.findUnique({ where: { dealId_requesterId: { dealId, requesterId: user.id } } }),
  ]);
  const isSponsor = document.deal.sponsorId === user.id || user.isAdmin;
  const ndaAckAt = team?.ndaAckAt || (access?.ndaAcknowledged ? access.ndaAcknowledgedAt : null);
  const teamStatus = team?.status || (access?.status === "APPROVED" ? "ADDED" : null);
  if (!documentsOpen({ isSponsor, teamStatus, ndaAckAt }) && !user.isAdmin) return new Response("Forbidden", { status: 403 });
  const visible = folderVisible({
    isSponsor,
    teamRole: (team?.teamRole as TeamRoleId) || null,
    audience: (document.folder?.audienceRoles as TeamRoleId[]) || [],
    sponsorOnly: document.sponsorOnly,
  });
  if (!visible && !user.isAdmin) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const sig = url.searchParams.get("sig");
  if (sig && !localLinkValid(document.storageKey, url.searchParams.get("exp") || "", sig)) {
    return new Response("Forbidden", { status: 403 });
  }
  const bytes = await dealStorage().read(document.storageKey);
  if (!bytes) return new Response("Not found", { status: 404 });
  await prisma.documentAccessLog.create({
    data: { documentId, userId: user.id, action: url.searchParams.get("download") === "1" ? "DOWNLOAD" : "VIEW" },
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": document.contentType || "application/octet-stream",
      "content-disposition": `attachment; filename="${document.fileName || "document"}"`,
      "cache-control": "private, no-store",
    },
  });
}
