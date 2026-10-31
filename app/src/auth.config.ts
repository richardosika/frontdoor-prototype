import type { NextAuthConfig } from "next-auth";
import { sessionIssuedAtAccepted } from "@/lib/session-gate";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (!sessionIssuedAtAccepted(token.iat, process.env.SESSION_ISSUED_AFTER, Boolean(user))) return null;
      if (user) {
        token.id = user.id;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
        token.tier = String((user as { tier?: string }).tier ?? "INVITED");
        token.role = String((user as { role?: string }).role ?? "");
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.tier = String(token.tier ?? "INVITED");
      session.user.role = String(token.role ?? "");
      return session;
    },
  },
} satisfies NextAuthConfig;
