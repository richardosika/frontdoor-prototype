import bcrypt from "bcryptjs";
import { KEEP_ADMIN_EMAIL } from "@/lib/clean-test-data";
import { initialsFromName } from "@/lib/domain";
import { isDemoRecord } from "@/lib/person-standing";
import { prisma } from "@/lib/prisma";

/** Seeded member password. A demo account that was an administrator returns to this. */
export const DEMO_MEMBER_PASSWORD = "cornicio-demo";

export const OWNER_ADMIN_NAME = "Richard Osika";
export const OWNER_ADMIN_TITLE = "Founder";

/** Identity written on every startup. The password is never part of this object. */
export function ownerAdminIdentity() {
  return {
    email: KEEP_ADMIN_EMAIL,
    name: OWNER_ADMIN_NAME,
    initials: initialsFromName(OWNER_ADMIN_NAME),
    credentialNote: OWNER_ADMIN_TITLE,
    isAdmin: true,
    isTest: false,
    status: "ACTIVE" as const,
  };
}

export type AdminFlagUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  isTest?: boolean | null;
  status?: string;
};

/** Administrators whose address or test flag marks them as demo data. */
export function demoAdministratorIds(users: AdminFlagUser[]): string[] {
  return users
    .filter((user) => user.isAdmin && isDemoRecord({ isTest: user.isTest, email: user.email }))
    .map((user) => user.id);
}

export function ownerAccountNeedsRepair(
  user: { isAdmin: boolean; isTest?: boolean | null; status?: string } | null,
): "create" | "repair" | "ready" {
  if (!user) return "create";
  if (!user.isAdmin || user.isTest || (user.status != null && user.status !== "ACTIVE")) return "repair";
  return "ready";
}

/**
 * Demo administrators lose the admin flag and go back to the member password.
 * The owner address is created when it is missing, then ADMIN_PASSWORD can replace that hash.
 */
export async function prepareAdministratorAccounts(): Promise<{ revoked: number; owner: "create" | "repair" | "ready" }> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, isAdmin: true, isTest: true, status: true },
  });
  const revokeIds = demoAdministratorIds(users);
  if (revokeIds.length) {
    const passwordHash = await bcrypt.hash(DEMO_MEMBER_PASSWORD, 10);
    await prisma.user.updateMany({
      where: { id: { in: revokeIds } },
      data: { isAdmin: false, passwordHash },
    });
  }

  const owner = users.find((user) => user.email.trim().toLowerCase() === KEEP_ADMIN_EMAIL) ?? null;
  const ownerAction = ownerAccountNeedsRepair(owner);
  const identity = ownerAdminIdentity();
  if (ownerAction === "create") {
    const passwordHash = await bcrypt.hash(`${crypto.randomUUID()}${crypto.randomUUID()}`, 10);
    await prisma.user.create({
      data: {
        ...identity,
        passwordHash,
        role: "DEVELOPER",
        org: "Private Floor Club",
        location: "New York, NY",
        tier: "CONFIRMED",
        paymentStatus: "NOT_REQUIRED",
      },
    });
  } else if (owner) {
    await prisma.user.update({
      where: { id: owner.id },
      data: identity,
    });
  }

  return { revoked: revokeIds.length, owner: ownerAction };
}
