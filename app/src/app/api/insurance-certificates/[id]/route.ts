import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canOpenInsuranceCertificate } from "@/lib/trades";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Nov 6: a subcontractor's certificate of insurance. "me" is the member's own; staff and approved active GCs open a sub's by member id. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const viewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isAdmin: true, status: true, paymentStatus: true, role: true, extraCategories: true } });
  if (!viewer || viewer.status !== "ACTIVE") return notFound();
  const { id } = await context.params;
  const userId = id === "me" ? viewer.id : id;
  if (userId !== viewer.id) {
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, extraCategories: true, status: true } });
    if (!owner || (owner.status !== "ACTIVE" && !viewer.isAdmin)) return notFound();
    if (!canOpenInsuranceCertificate(viewer, owner)) return notFound();
  }
  const coi = await prisma.insuranceCertificate.findUnique({ where: { userId } });
  if (!coi) return notFound();
  const bytes = Buffer.from(coi.bytes);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": coi.contentType,
      "content-length": String(bytes.byteLength),
      "content-disposition": `inline; filename="${coi.fileName.replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
