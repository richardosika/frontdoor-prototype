import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewProjectDocuments } from "@/lib/project-contact-db";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** A project document, for the owner, staff, and members involved in the project only. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const viewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isAdmin: true, status: true } });
  if (!viewer || viewer.status !== "ACTIVE") return notFound();
  const { id } = await context.params;
  const doc = await prisma.projectDocument.findUnique({ where: { id } });
  if (!doc || !(await canViewProjectDocuments(doc.projectId, viewer))) return notFound();
  const bytes = Buffer.from(doc.bytes);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": doc.contentType,
      "content-length": String(bytes.byteLength),
      "content-disposition": `inline; filename="${doc.fileName.replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
