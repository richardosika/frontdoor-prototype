import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { moderationDenial } from "@/lib/messaging";
import { blocksMembership } from "@/lib/payments";
import { adminSignInAllowed } from "@/lib/sign-in";
import { verificationDenial } from "@/lib/verification";
import { enforceInsuranceHold } from "@/lib/insurance-hold";

/** insuranceSubmission: only the Profile insurance save and the Member NDA acceptance pass an insurance suspension. */
type AccessOptions = { insuranceSubmission?: boolean };

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireAccount(opts: AccessOptions = {}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/suspended");
  // Nov 17 follow-up (Richard): enforced here so every page, layout and server action that loads the member is held.
  await enforceInsuranceHold(user, opts);
  return user;
}

export async function requireUser(opts: AccessOptions = {}) {
  const user = await requireAccount(opts);
  if (!user.isAdmin && blocksMembership(user.paymentStatus)) redirect("/pay");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!adminSignInAllowed(user)) redirect("/feed");
  return user;
}

export async function verificationActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, isAdmin: true, status: true, isTest: true, email: true },
  });
  if (!user || user.status !== "ACTIVE" || !adminSignInAllowed(user)) return null;
  return user;
}

export async function requireModerationAdmin() {
  const actor = await verificationActor();
  const denied = moderationDenial({
    path: "/admin/messages",
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied || !actor) notFound();
  return actor;
}

export async function requireVerificationAdmin() {
  const actor = await verificationActor();
  const denied = verificationDenial({
    path: "/admin/verification",
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied || !actor) notFound();
  return actor;
}
