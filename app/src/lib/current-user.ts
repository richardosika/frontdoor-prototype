import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verificationDenial } from "@/lib/verification";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user || user.status !== "ACTIVE") redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/feed");
  return user;
}

export async function verificationActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, isAdmin: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
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
