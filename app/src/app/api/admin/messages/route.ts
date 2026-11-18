import { verificationActor } from "@/lib/current-user";
import { gateModerationRequest, moderationQueueResponse, type MemberRecord } from "@/lib/messaging";
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

export async function GET(request: Request) {
  const actor = await verificationActor();
  const denied = gateModerationRequest({
    path: new URL(request.url).pathname,
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied || !actor) return denied ?? new Response("Not found", { status: 404 });
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      userA: { select: memberSelect },
      userB: { select: memberSelect },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  await prisma.moderationEvent.create({
    data: { actorId: actor.id, action: "OPENED_QUEUE", summary: `${actor.name} opened the message queue.` },
  });
  return moderationQueueResponse({
    viewer: { isAdmin: true },
    threads: conversations.map((conversation) => ({
      id: conversation.id,
      updatedAt: conversation.updatedAt.toISOString(),
      preview: conversation.messages[0]?.body ?? "",
      members: [conversation.userA, conversation.userB] as MemberRecord[],
    })),
  });
}
