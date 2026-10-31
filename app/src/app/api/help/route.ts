import { NextResponse } from "next/server";
import { HELP_EMAIL, normalizeQuestion, sameOrigin } from "@/lib/help/answer";
import { HELP_COOKIE, answerQuestion, newHelpSession, sessionFromHeader } from "@/lib/help/store";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/current-user";
import { currentLocale } from "@/lib/i18n/server";
import { answerMemberQuestion, helpChips } from "@/lib/help/member-store";
import { isDeveloperRole } from "@/lib/member-reach";

export const dynamic = "force-dynamic";

function withSession(body: unknown, status: number, sessionKey: string, fresh: boolean) {
  const response = NextResponse.json(body, { status });
  if (fresh) {
    response.cookies.set(HELP_COOKIE, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return response;
}

function openSession(request: Request): { sessionKey: string; fresh: boolean } {
  const existing = sessionFromHeader(request.headers.get("cookie"));
  if (existing) return { sessionKey: existing, fresh: false };
  return { sessionKey: newHelpSession(), fresh: true };
}

export async function GET(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Help is unavailable." }, { status: 403 });
  }
  const { sessionKey, fresh } = openSession(request);
  const turns = fresh
    ? []
    : await prisma.helpTurn.findMany({
        where: { sessionKey },
        orderBy: { createdAt: "asc" },
        take: 30,
        select: { id: true, question: true, answer: true, feedback: true, unanswered: true },
      });
  const user = await currentUser().catch(() => null);
  const chips = user ? helpChips(isDeveloperRole(user.role), await currentLocale()) : [];
  return withSession({ turns: turns.map((t) => ({ ...t, escalate: t.unanswered })), chips, member: Boolean(user) }, 200, sessionKey, fresh);
}

export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Help is unavailable." }, { status: 403 });
  }
  let payload: { question?: string } = {};
  try {
    payload = (await request.json()) as { question?: string };
  } catch {
    payload = {};
  }
  const question = normalizeQuestion(String(payload.question || ""));
  const { sessionKey, fresh } = openSession(request);
  if (!question) {
    return withSession({ error: "Type a question." }, 400, sessionKey, fresh);
  }
  // #49: signed-in members get the grounded, member-type-aware chat with staff hand-off.
  const user = await currentUser().catch(() => null);
  if (user && user.status === "ACTIVE") {
    const member = await answerMemberQuestion({ question, sessionKey, user, locale: await currentLocale() });
    return withSession({ id: member.id, answer: member.answer, escalate: member.escalate, handoff: HELP_EMAIL }, 200, sessionKey, fresh);
  }
  const result = await answerQuestion({ question, sessionKey });
  const status = result.unanswered && result.answer.startsWith("Help is pausing") ? 429 : 200;
  return withSession(
    { id: result.id, answer: result.answer, confidence: result.confidence, handoff: HELP_EMAIL },
    status,
    sessionKey,
    fresh,
  );
}
