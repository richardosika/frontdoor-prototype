import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/help/answer";
import { HELP_COOKIE, sessionFromHeader } from "@/lib/help/store";
import { currentUser } from "@/lib/current-user";
import { notifyAdmins } from "@/lib/notify";
import { sendNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** #49: hand a Help question to staff: an admin alert plus an email (delivery goes to the test recipient only). */
export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"))) return NextResponse.json({ error: "Help is unavailable." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const sessionKey = sessionFromHeader(request.headers.get("cookie"));
  let id = "";
  try { id = String(((await request.json()) as { id?: string }).id || ""); } catch { id = ""; }
  const turn = id && sessionKey ? await prisma.helpTurn.findFirst({ where: { id, sessionKey } }) : null;
  if (!turn) return NextResponse.json({ error: "That question was not found." }, { status: 404 });
  if (turn.feedback === "staff") return NextResponse.json({ ok: true, already: true });
  await prisma.helpTurn.update({ where: { id: turn.id }, data: { feedback: "staff", unanswered: true } });
  const body = `${user.name} (${user.org || "no company"}, ${roleLabel(user.role)}, ${user.email}) asked Help:\n\n"${turn.question}"\n\nHelp replied:\n${turn.answer}\n\nPlease reply to the member by email.`;
  await notifyAdmins({ title: "Help question for staff", body: body.slice(0, 900), href: "/admin" });
  await sendNotice({ intendedTo: BRAND.contactEmail, subject: `Help question from ${user.name}`, text: body, templateKey: "help-escalation" }).catch(() => null);
  return NextResponse.json({ ok: true });
}
void HELP_COOKIE;
