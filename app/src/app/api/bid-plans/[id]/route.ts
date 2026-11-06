import { auth } from "@/auth";
import { canOpenRequest } from "@/lib/bid-plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Plans on a bid request: the requester, picked members, any verified GC on an open request, and staff. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const viewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, status: true, paymentStatus: true, isAdmin: true, extraCategories: true, trades: true, markets: true, location: true } });
  if (!viewer || viewer.status !== "ACTIVE") return notFound();
  const { id } = await context.params;
  const plan = await prisma.bidPlan.findUnique({
    where: { id },
    include: { request: { select: { requesterId: true, trade: true, serviceStates: true, recipients: { select: { memberId: true } }, template: { select: { category: true } } } } },
  });
  if (!plan) return notFound();
  const access = canOpenRequest({ viewer, requesterId: plan.request.requesterId, recipientIds: plan.request.recipients.map((r) => r.memberId), templateCategory: plan.request.template.category, trade: plan.request.trade, serviceStates: plan.request.serviceStates });
  if (!access && !viewer.isAdmin) return notFound();
  const bytes = Buffer.from(plan.bytes);
  const inline = plan.contentType !== "application/acad";
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": plan.contentType,
      "content-length": String(bytes.byteLength),
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${plan.fileName.replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
