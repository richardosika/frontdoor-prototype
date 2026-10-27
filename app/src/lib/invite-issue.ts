import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { givenNameFrom } from "@/lib/person-fields";
import { roleLabel } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";

function mintInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = (size: number) =>
    Array.from(randomBytes(size), (byte) => alphabet[byte % alphabet.length]).join("");
  return `PF-${chunk(4)}-${chunk(4)}`;
}

/** Issue the one-time code for a request to join. The caller records the decision and the file status. */
export async function issueInviteCodeForRequest(input: {
  adminId: string;
  requestId: string;
}): Promise<{ ok: true; code: string; email: string; name: string } | { ok: false; error: string }> {
  const request = await prisma.inviteRequest.findUnique({ where: { id: input.requestId } });
  if (!request || request.status !== "PENDING") return { ok: false, error: "That request to join is not waiting." };

  let code = mintInviteCode();
  let inviteId = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const invite = await prisma.inviteCode.create({
        data: {
          code,
          maxUses: 1,
          note: `For ${request.name}`,
          createdById: input.adminId,
        },
      });
      inviteId = invite.id;
      break;
    } catch {
      code = mintInviteCode();
    }
  }
  if (!inviteId) return { ok: false, error: "Could not issue a code. Try again." };

  const base = await appBaseUrl();
  await prisma.inviteRequest.update({
    where: { id: request.id },
    data: { status: "ISSUED", inviteCodeId: inviteId },
  });
  await sendTemplate({
    key: "info",
    to: request.email,
    vars: buildMailVars({
      name: request.name,
      givenName: givenNameFrom(request.givenName, request.name),
      role: roleLabel(request.role),
      org: request.org,
      applyLink: `${base}/apply`,
      inviteCode: code,
    }),
    person: { name: request.name, role: request.role, org: request.org, location: request.location, inviteCode: code },
  });
  return { ok: true, code, email: request.email, name: request.name };
}
