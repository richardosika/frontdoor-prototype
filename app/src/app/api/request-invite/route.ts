import { INVITE_REQUESTS_PER_EMAIL_PER_DAY, shouldDiscardInviteRequest, validateInviteRequest } from "@/lib/invite-request";
import { withinRateLimit } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { isRoleId } from "@/lib/roles";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  let body: Partial<Record<string, unknown>> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const website = String(body.website ?? "");
  if (shouldDiscardInviteRequest(website)) return Response.json({ ok: true });

  const input = {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    role: String(body.role ?? ""),
    company: String(body.company ?? ""),
    city: String(body.city ?? ""),
    note: String(body.note ?? ""),
  };
  const errors = validateInviteRequest(input);
  if (errors.length || !isRoleId(input.role)) {
    return Response.json({ error: errors[0] ?? "Pick a role." }, { status: 400 });
  }

  const email = input.email.trim().toLowerCase();
  const recent = await prisma.inviteRequest.count({
    where: { email, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
  if (!withinRateLimit(recent, INVITE_REQUESTS_PER_EMAIL_PER_DAY)) {
    return Response.json({ error: "Too many requests for that email. Try again tomorrow." }, { status: 429 });
  }

  await prisma.inviteRequest.create({
    data: {
      name: input.name.trim(),
      email,
      role: input.role,
      org: input.company.trim(),
      location: input.city.trim(),
      note: input.note.trim().slice(0, 500),
    },
  });
  return Response.json({ ok: true });
}
