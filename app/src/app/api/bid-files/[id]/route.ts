import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** #51: a bidder's PDF, for that bidder and the requester only. Bids stay private between them. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const viewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, status: true, isAdmin: true } });
  if (!viewer || viewer.status !== "ACTIVE") return notFound();
  const { id } = await context.params;
  const bid = await prisma.bid.findUnique({ where: { id }, select: { bidderId: true, status: true, pdfName: true, pdfBytes: true, request: { select: { requesterId: true } } } });
  if (!bid || !bid.pdfBytes) return notFound();
  const isBidder = bid.bidderId === viewer.id;
  const isRequester = bid.request.requesterId === viewer.id && bid.status !== "DRAFT";
  // Staff have read access to submitted bids (Richard, Oct 31).
  const isStaff = viewer.isAdmin && bid.status !== "DRAFT";
  if (!isBidder && !isRequester && !isStaff) return notFound();
  const bytes = Buffer.from(bid.pdfBytes);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.byteLength),
      "content-disposition": `inline; filename="${bid.pdfName.replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
