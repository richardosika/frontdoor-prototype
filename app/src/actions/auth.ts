"use server";

import bcrypt from "bcryptjs";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GENERIC_SIGN_IN_ERROR, signInFailureCopy } from "@/lib/sign-in";

function safeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "/feed";
  return value;
}

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNext(String(formData.get("next") || "/feed"));

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const memberPasswordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  let pendingApplicationPasswordMatches = false;
  if (!user && email && password) {
    const application = await prisma.application.findFirst({
      where: { email, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (application) pendingApplicationPasswordMatches = await bcrypt.compare(password, application.passwordHash);
  }

  const failure = signInFailureCopy({
    memberFound: Boolean(user),
    memberPasswordMatches,
    memberActive: user?.status === "ACTIVE",
    pendingApplicationPasswordMatches,
  });
  if (failure) return { error: failure };

  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (error instanceof CredentialsSignin || (error instanceof AuthError && error.type === "CredentialsSignin")) {
      return { error: GENERIC_SIGN_IN_ERROR };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
