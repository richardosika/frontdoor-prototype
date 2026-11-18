import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { adminEnvPasswordMatches, credentialsAccepted, normalizeAdminPassword } from "@/lib/admin-password";
import { adminSignInAllowed } from "@/lib/sign-in";
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
        const password = String(credentials?.password ?? "").trim();
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE") return null;
        const allowedAdmin = adminSignInAllowed(user);
        const hashMatches = await bcrypt.compare(password, user.passwordHash).catch(() => false);
        const envMatches = allowedAdmin && adminEnvPasswordMatches(password, process.env.ADMIN_PASSWORD);
        if (
          !credentialsAccepted({
            isAdmin: user.isAdmin,
            allowedAdmin,
            hashMatches,
            envMatches,
            portal: credentials?.portal,
          })
        ) {
          return null;
        }
        if (envMatches && !hashMatches) {
          const next = normalizeAdminPassword(process.env.ADMIN_PASSWORD);
          if (next) {
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: await bcrypt.hash(next, 10) },
            });
          }
        }
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
