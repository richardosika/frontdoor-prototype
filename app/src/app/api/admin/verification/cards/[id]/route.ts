import { verificationActor } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { gateVerificationRequest } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verificationActor();
  const denied = gateVerificationRequest({
    path: new URL(request.url).pathname,
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied) return denied;

  const { id } = await context.params;
  const card = await prisma.businessCard.findUnique({ where: { id } });
  if (!card || card.deletedAt || card.sizeBytes < 1) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const bytes = Buffer.from(card.bytes);
  if (bytes.byteLength < 1) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const fileName = card.fileName.replace(/["\r\n]/g, "");
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": card.contentType,
      "content-length": String(bytes.byteLength),
      "content-disposition": `inline; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
