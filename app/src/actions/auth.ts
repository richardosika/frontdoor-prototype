"use server";

import bcrypt from "bcryptjs";
import { AuthError, CredentialsSignin } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HELP_COOKIE } from "@/lib/help/store";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DECLINED_APPLICATION_STATUSES, OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { adminLoginDecision, adminLoginTrace, adminSignInAllowed, GENERIC_SIGN_IN_ERROR, signInFailureCopy } from "@/lib/sign-in";

function safeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "/feed";
  return value;
}

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNext(String(formData.get("next") || "/feed"));

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user?.isAdmin) {
    if (password) await bcrypt.compare(password, user.passwordHash);
    return { error: GENERIC_SIGN_IN_ERROR };
  }
  const memberPasswordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  let pendingApplicationPasswordMatches = false;
  let declinedApplicationPasswordMatches = false;
  if (!user && email && password) {
    const application = await prisma.application.findFirst({
      where: { email, status: { in: [...OPEN_APPLICATION_STATUSES, ...DECLINED_APPLICATION_STATUSES] } },
      orderBy: { createdAt: "desc" },
    });
    if (application && (await bcrypt.compare(password, application.passwordHash))) {
      const declined = (DECLINED_APPLICATION_STATUSES as readonly string[]).includes(application.status);
      declinedApplicationPasswordMatches = declined;
      pendingApplicationPasswordMatches = !declined;
    }
  }

  const failure = signInFailureCopy({
    memberFound: Boolean(user),
    memberPasswordMatches,
    memberActive: user?.status === "ACTIVE",
    pendingApplicationPasswordMatches,
    declinedApplicationPasswordMatches,
  });
  if (failure) return { error: failure };

  try {
    await resetHelpChat();
    await signIn("credentials", { email, password, portal: "member", redirectTo: next });
  } catch (error) {
    if (error instanceof CredentialsSignin || (error instanceof AuthError && error.type === "CredentialsSignin")) {
      return { error: GENERIC_SIGN_IN_ERROR };
    }
    throw error;
  }
}

async function passwordMatchesAccount(password: string, passwordHash: string): Promise<boolean> {
  if (!password) return false;
  if (await bcrypt.compare(password, passwordHash).catch(() => false)) return true;
  const trimmed = password.trim();
  if (!trimmed || trimmed === password) return false;
  return bcrypt.compare(trimmed, passwordHash).catch(() => false);
}

export async function adminLoginAction(formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const matches = Boolean(user && (await passwordMatchesAccount(password, user.passwordHash)));
  const decision = adminLoginDecision({ user, passwordMatches: matches });
  if (decision !== "ok" || !user) {
    console.log(
      adminLoginTrace({
        found: Boolean(user),
        active: user?.status === "ACTIVE",
        admin: Boolean(user?.isAdmin),
        allowed: adminSignInAllowed(user),
        passwordMatches: matches,
        passwordChars: password.trim().length,
      }),
    );
    return { error: GENERIC_SIGN_IN_ERROR };
  }
  try {
    await resetHelpChat();
    const destination = await signIn("credentials", {
      email,
      password: password.trim(),
      portal: "admin",
      redirectTo: "/admin",
      redirect: false,
    });
    if (typeof destination !== "string" || destination.includes("error=")) {
      console.log("ADMIN_LOGIN result=signin_rejected");
      return { error: GENERIC_SIGN_IN_ERROR };
    }
  } catch (error) {
    if (error instanceof CredentialsSignin || (error instanceof AuthError && error.type === "CredentialsSignin")) {
      console.log("ADMIN_LOGIN result=signin_rejected");
      return { error: GENERIC_SIGN_IN_ERROR };
    }
    throw error;
  }
  redirect("/admin");
}

/** Help chat starts blank for every login: drop the browser's help key on sign-in and sign-out. */
async function resetHelpChat() {
  try {
    (await cookies()).delete(HELP_COOKIE);
  } catch {
    // read-only cookie store outside an action
  }
}

export async function logoutAction() {
  await resetHelpChat();
  await signOut({ redirectTo: "/" });
}
