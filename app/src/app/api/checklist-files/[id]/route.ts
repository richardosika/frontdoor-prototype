import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checklistRoom } from "@/lib/deal-checklist-db";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** A checklist file, for the deal room's sponsor, approved members, and staff only. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const viewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isAdmin: true, status: true } });
  if (!viewer || viewer.status !== "ACTIVE") return notFound();
  const { id } = await context.params;
  const item = await prisma.dealChecklistItem.findUnique({ where: { id } });
  if (!item?.bytes || !(await checklistRoom(item.dealId, viewer))) return notFound();
  const bytes = Buffer.from(item.bytes);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": item.contentType || "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "content-disposition": `inline; filename="${item.fileName.replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
