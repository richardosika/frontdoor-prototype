import { randomBytes } from "node:crypto";
import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { duplicateJoinMessage, inviteRequestAddress, INVITE_REQUESTS_PER_EMAIL_PER_DAY, shouldDiscardInviteRequest, validateInviteRequest } from "@/lib/invite-request";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { withinRateLimit } from "@/lib/messaging";
import { joinName } from "@/lib/person-fields";
import { prisma } from "@/lib/prisma";
import { publicStatusPath } from "@/lib/public-status";
import { isRoleId, roleLabel } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";

const DAY = 24 * 60 * 60 * 1000;
const VERIFIED_WINDOW_MS = 30 * 60 * 1000;

export async function postJoinRequest(request: Request): Promise<Response> {
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
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    email: String(body.email ?? ""),
    role: String(body.role ?? ""),
    company: String(body.company ?? ""),
    street: String(body.street ?? ""),
    city: String(body.city ?? ""),
    state: String(body.state ?? "").trim().toUpperCase(),
    zip: String(body.zip ?? ""),
    note: String(body.note ?? ""),
  };
  const errors = validateInviteRequest(input);
  if (errors.length || !isRoleId(input.role)) {
    return Response.json({ error: errors[0] ?? "Pick a role." }, { status: 400 });
  }

  const email = input.email.trim().toLowerCase();
  const verified = await prisma.emailChallenge.findFirst({
    where: { email, verifiedAt: { gt: new Date(Date.now() - VERIFIED_WINDOW_MS) } },
    orderBy: { verifiedAt: "desc" },
  });
  if (!verified?.verifiedAt) {
    return Response.json({ error: "Verify the email code before you submit." }, { status: 400 });
  }

  const recent = await prisma.inviteRequest.count({
    where: { email, createdAt: { gte: new Date(Date.now() - DAY) } },
  });
  if (!withinRateLimit(recent, INVITE_REQUESTS_PER_EMAIL_PER_DAY)) {
    return Response.json({ error: "Too many requests for that email. Try again tomorrow." }, { status: 429 });
  }

  const [existingUser, openApplication, openRequest] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.application.findFirst({
      where: { email, status: { in: [...OPEN_APPLICATION_STATUSES] } },
      select: { id: true },
    }),
    prisma.inviteRequest.findFirst({
      where: { email, status: { in: ["PENDING", "ISSUED"] } },
      select: { id: true },
    }),
  ]);
  const duplicate = duplicateJoinMessage({
    hasAccount: Boolean(existingUser),
    hasOpenApplication: Boolean(openApplication),
    hasOpenRequest: Boolean(openRequest),
  });
  if (duplicate) return Response.json({ error: duplicate }, { status: 409 });

  const name = joinName(input.firstName, input.lastName);
  const location = inviteRequestAddress(input);
  const statusToken = randomBytes(24).toString("hex");
  const created = await prisma.inviteRequest.create({
    data: {
      name,
      email,
      role: input.role,
      org: input.company.trim(),
      location,
      note: input.note.trim().slice(0, 500),
      statusToken,
    },
  });
  const { openInviteReview } = await import("@/lib/guided-prefill-db");
  await openInviteReview(created.id).catch((error) => {
    console.error("guided prefill failed", error instanceof Error ? error.message : "error");
  });
  const statusPath = publicStatusPath(statusToken);
  const statusUrl = `${await appBaseUrl()}${statusPath}`;
  try {
    await sendTemplate({
      key: "application_thanks",
      to: email,
      vars: buildMailVars({
        name,
        role: roleLabel(input.role),
        org: input.company.trim(),
        statusLink: statusUrl,
      }),
      person: {
        name,
        role: input.role,
        org: input.company.trim(),
        location,
        inviteRequestId: created.id,
      },
    });
  } catch {
    return Response.json({ error: "We saved the request, but the note could not be recorded. Try again in a moment." }, { status: 500 });
  }
  return Response.json({ ok: true, statusUrl: statusPath });
}
