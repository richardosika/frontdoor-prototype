import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/help/answer";
import { sessionFromHeader } from "@/lib/help/store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Help is unavailable." }, { status: 403 });
  }
  const sessionKey = sessionFromHeader(request.headers.get("cookie"));
  if (!sessionKey) return NextResponse.json({ error: "Start a question first." }, { status: 400 });
  let payload: { id?: string; vote?: string } = {};
  try {
    payload = (await request.json()) as { id?: string; vote?: string };
  } catch {
    payload = {};
  }
  const vote = payload.vote === "down" ? "down" : payload.vote === "up" ? "up" : "";
  if (!vote || !payload.id) return NextResponse.json({ error: "Choose up or down." }, { status: 400 });
  const saved = await prisma.helpTurn.updateMany({
    where: { id: payload.id, sessionKey },
    data: { feedback: vote },
  });
  if (saved.count !== 1) return NextResponse.json({ error: "That question is not in this Help session." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
