import { verificationActor } from "@/lib/current-user";
import { memberDirectoryResponse, type MemberRecord } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const select = {
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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verificationActor();
  const { id } = await context.params;
  if (!actor) return memberDirectoryResponse({ viewer: null, subject: null });
  const subject = await prisma.user.findUnique({ where: { id, status: "ACTIVE" }, select });
  return memberDirectoryResponse({
    viewer: { isAdmin: actor.isAdmin },
    subject: subject as MemberRecord | null,
  });
}
