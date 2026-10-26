import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { adminSignInAllowed, credentialsPortalAllowed } from "@/lib/sign-in";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE") return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        if (!credentialsPortalAllowed(user.isAdmin, credentials?.portal)) return null;
        if (credentials?.portal === "admin" && !adminSignInAllowed(user)) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          tier: user.tier,
          role: user.role,
        };
      },
    }),
  ],
});
