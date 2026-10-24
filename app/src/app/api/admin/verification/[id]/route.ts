import { prisma } from "@/lib/prisma";
import { verificationActor } from "@/lib/current-user";
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
  const record = await prisma.verificationCase.findUnique({
    where: { id },
    include: {
      checks: { orderBy: { label: "asc" }, include: { reviewer: { select: { name: true } } } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  if (!record) return new Response("Not found", { status: 404 });
  return Response.json({
    id: record.id,
    subject: record.subject,
    status: record.status,
    name: record.user?.name ?? record.project?.name ?? "File",
    internalNote: record.internalNote,
    verifiedAt: record.verifiedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    checks: record.checks.map((check) => ({
      id: check.id,
      key: check.key,
      label: check.label,
      result: check.result,
      note: check.note,
      evidenceUrl: check.evidenceUrl,
      reviewer: check.reviewer?.name ?? null,
      reviewedAt: check.reviewedAt?.toISOString() ?? null,
    })),
    events: record.events.map((event) => ({
      id: event.id,
      summary: event.summary,
      actor: event.actor?.name ?? null,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      createdAt: event.createdAt.toISOString(),
    })),
  });
}
