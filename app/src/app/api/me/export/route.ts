import { NextResponse } from "next/server";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const [posts, messages, introductions, access] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: user.id },
      select: { id: true, kind: true, status: true, title: true, body: true, market: true, createdAt: true },
    }),
    prisma.message.findMany({
      where: { senderId: user.id },
      select: { id: true, body: true, kind: true, createdAt: true, conversationId: true },
    }),
    prisma.introduction.findMany({
      where: { OR: [{ fromId: user.id }, { toId: user.id }] },
      select: { id: true, fromId: true, toId: true, note: true, status: true, createdAt: true },
    }),
    prisma.dealAccess.findMany({
      where: { requesterId: user.id },
      select: { dealId: true, status: true, ndaVersion: true, ndaAcknowledgedAt: true },
    }),
  ]);
  return new NextResponse(
    JSON.stringify({
    exportedAt: new Date().toISOString(),
    profile: {
      email: user.email,
      name: user.name,
      role: user.role,
      org: user.org,
      location: user.location,
      bio: user.bio,
      website: user.website,
      markets: user.markets,
      dealTypes: user.dealTypes,
      assetClasses: user.assetClasses,
      checkSize: user.checkSize,
      lookingFor: user.lookingFor,
      offering: user.offering,
      tier: user.tier,
    },
    posts,
    messagesSent: messages,
    introductions,
    dealAccess: access,
  }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="private-floor-export.json"',
      },
    },
  );
}
