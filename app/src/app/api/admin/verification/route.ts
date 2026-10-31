import { prisma } from "@/lib/prisma";
import { verificationActor } from "@/lib/current-user";
import { gateVerificationRequest, isAwaitingVerification, verificationStatusLabel } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await verificationActor();
  const denied = gateVerificationRequest({
    path: new URL(request.url).pathname,
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied) return denied;

  const cases = await prisma.verificationCase.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subject: true,
      status: true,
      expiresAt: true,
      updatedAt: true,
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  return Response.json({
    awaiting: cases.filter((item) => isAwaitingVerification(item)).length,
    cases: cases.map((item) => ({
      id: item.id,
      subject: item.subject,
      name: item.user?.name ?? item.project?.name ?? "File",
      status: item.status,
      statusLabel: verificationStatusLabel(item.status),
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}
