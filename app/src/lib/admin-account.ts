import bcrypt from "bcryptjs";
import { adminPasswordAction, adminPasswordShape, normalizeAdminPassword } from "@/lib/admin-password";
import { KEEP_ADMIN_EMAIL } from "@/lib/clean-test-data";
import { initialsFromName } from "@/lib/domain";
import { isDemoRecord } from "@/lib/person-standing";
import { prisma } from "@/lib/prisma";
import { adminSignInAllowed } from "@/lib/sign-in";

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

/** Confirms the owner row and whether the env password matches its hash. The password is not logged. */
export async function logAdminLoginProbe(): Promise<void> {
  const raw = process.env.ADMIN_PASSWORD;
  const normalized = normalizeAdminPassword(raw);
  const shape = adminPasswordShape(raw);
  const owner = await prisma.user.findUnique({
    where: { email: KEEP_ADMIN_EMAIL },
    select: { isAdmin: true, isTest: true, email: true, status: true, passwordHash: true },
  });
  const rawMatch = Boolean(owner && raw && (await bcrypt.compare(raw, owner.passwordHash).catch(() => false)));
  const normMatch = Boolean(
    owner && normalized && (await bcrypt.compare(normalized, owner.passwordHash).catch(() => false)),
  );
  const demoPasswordMatch = Boolean(
    owner && (await bcrypt.compare(DEMO_MEMBER_PASSWORD, owner.passwordHash).catch(() => false)),
  );
  const line = [
    "ADMIN_LOGIN_PROBE",
    `action=${adminPasswordAction(raw)}`,
    `chars=${shape.chars}`,
    `normalized=${shape.normalized}`,
    `trim=${shape.trimmed}`,
    `owner=${owner ? 1 : 0}`,
    `admin=${owner?.isAdmin ? 1 : 0}`,
    `active=${owner?.status === "ACTIVE" ? 1 : 0}`,
    `demo=${owner && isDemoRecord(owner) ? 1 : 0}`,
    `allowed=${adminSignInAllowed(owner) ? 1 : 0}`,
    `raw_match=${rawMatch ? 1 : 0}`,
    `norm_match=${normMatch ? 1 : 0}`,
    `demo_password_match=${demoPasswordMatch ? 1 : 0}`,
    `gate_chars=${process.env.SITE_GATE_PASSWORD?.length ?? 0}`,
  ].join(" ");
  if (line.includes("@")) throw new Error("Login probe contained an address");
  console.log(line);
}

export function adminHttpLocationKind(location: string): "error" | "admin" | "other" | "none" {
  if (!location) return "none";
  if (location.includes("error=")) return "error";
  if (location.includes("/admin")) return "admin";
  return "other";
}

/** Signs in on this server with the env password and logs status codes only. */
export async function rehearseAdminHttpLogin(): Promise<void> {
  const password = normalizeAdminPassword(process.env.ADMIN_PASSWORD);
  const gate = process.env.SITE_GATE_PASSWORD || "";
  if (!password) {
    console.log("ADMIN_HTTP_LOGIN skipped=no_password");
    return;
  }
  const port = process.env.PORT || "3000";
  const origin = `http://127.0.0.1:${port}`;
  const headers = new Headers();
  if (gate) headers.set("authorization", `Basic ${Buffer.from(`privatefloor:${gate}`).toString("base64")}`);
  const started = Date.now();
  let csrf: Response | null = null;
  while (Date.now() - started < 20000) {
    try {
      csrf = await fetch(`${origin}/api/auth/csrf`, { headers });
      if (csrf.status === 200 || csrf.status === 401) break;
    } catch {
      csrf = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!csrf) {
    console.log("ADMIN_HTTP_LOGIN csrf=down");
    return;
  }
  if (csrf.status !== 200) {
    console.log(`ADMIN_HTTP_LOGIN csrf=${csrf.status}`);
    return;
  }
  const payload = (await csrf.json().catch(() => null)) as { csrfToken?: string } | null;
  const csrfCookies = typeof csrf.headers.getSetCookie === "function" ? csrf.headers.getSetCookie() : [];
  const form = new URLSearchParams({
    csrfToken: payload?.csrfToken || "",
    email: KEEP_ADMIN_EMAIL,
    password,
    portal: "admin",
    callbackUrl: "/admin",
  });
  const postHeaders = new Headers(headers);
  postHeaders.set("content-type", "application/x-www-form-urlencoded");
  if (csrfCookies.length) postHeaders.set("cookie", csrfCookies.map((cookie) => cookie.split(";")[0]).join("; "));
  const callback = await fetch(`${origin}/api/auth/callback/credentials`, {
    method: "POST",
    headers: postHeaders,
    body: form,
    redirect: "manual",
  });
  const locationKind = adminHttpLocationKind(callback.headers.get("location") || "");
  const sessionCookies = typeof callback.headers.getSetCookie === "function" ? callback.headers.getSetCookie() : [];
  const session = sessionCookies.some((cookie) => /session-token=([^;]+)/.test(cookie) && !/session-token=;/.test(cookie));
  let adminStatus = 0;
  if (session) {
    const adminHeaders = new Headers(headers);
    adminHeaders.set("cookie", sessionCookies.map((cookie) => cookie.split(";")[0]).join("; "));
    const admin = await fetch(`${origin}/admin`, { headers: adminHeaders, redirect: "manual" });
    adminStatus = admin.status;
  }
  console.log(
    `ADMIN_HTTP_LOGIN csrf=200 callback=${callback.status} location=${locationKind} session=${session ? 1 : 0} admin=${adminStatus}`,
  );
}
