import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Member photos, for signed-in members only (the same people who can open a member profile). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const { id } = await context.params;
  const image = await prisma.memberImage.findUnique({ where: { id }, include: { user: { select: { status: true } } } });
  if (!image || image.user.status !== "ACTIVE") return notFound();
  const bytes = Buffer.from(image.bytes);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": image.contentType,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
