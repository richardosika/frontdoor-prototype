import { verificationActor } from "@/lib/current-user";
import { gateModerationRequest, moderationThreadResponse, type MemberRecord } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const memberSelect = {
  id: true,
  name: true,
  initials: true,
  org: true,
  location: true,
  role: true,
  tier: true,
  bio: true,
  credentialNote: true,
  email: true,
  phone: true,
  linkedinUrl: true,
} as const;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verificationActor();
  const denied = gateModerationRequest({
    path: new URL(request.url).pathname,
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied || !actor) return denied ?? new Response("Not found", { status: 404 });
  const { id } = await context.params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: memberSelect } } },
    },
  });
  if (!conversation) return moderationThreadResponse({ viewer: { isAdmin: true }, thread: null });
  await prisma.moderationEvent.create({
    data: {
      actorId: actor.id,
      action: "OPENED_THREAD",
      conversationId: conversation.id,
      summary: `${actor.name} opened a message thread.`,
    },
  });
  return moderationThreadResponse({
    viewer: { isAdmin: true },
    thread: {
      id: conversation.id,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        body: message.body,
        kind: message.kind,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender as MemberRecord,
      })),
    },
  });
}
