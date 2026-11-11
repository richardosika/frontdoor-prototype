import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Nov 10: a Deal Room file. Only the sponsor, approved members of that room, and staff can open it. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const viewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, status: true, isAdmin: true } });
  if (!viewer || viewer.status !== "ACTIVE") return notFound();
  const { id } = await context.params;
  const doc = await prisma.dealDocument.findUnique({
    where: { id },
    select: { bytes: true, fileName: true, contentType: true, deal: { select: { sponsorId: true, access: { where: { requesterId: viewer.id, status: "APPROVED" }, select: { id: true } } } } },
  });
  if (!doc || !doc.bytes) return notFound();
  const allowed = viewer.isAdmin || doc.deal.sponsorId === viewer.id || doc.deal.access.length > 0;
  if (!allowed) return notFound();
  const bytes = Buffer.from(doc.bytes);
  const inline = doc.contentType !== "application/acad";
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": doc.contentType || "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${doc.fileName.replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
