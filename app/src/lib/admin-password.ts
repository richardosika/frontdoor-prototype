import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const ADMIN_PASSWORD_MIN_LENGTH = 12;

export const ADMIN_PASSWORD_TOO_SHORT =
  "ADMIN_PASSWORD is shorter than 12 characters. Admin passwords were left unchanged.";

export type AdminPasswordAccount = {
  id: string;
  isAdmin: boolean;
  passwordHash: string;
};

/**
 * Render values are often pasted with a trailing newline or wrapping quotes.
 * Those characters are not part of the password a person types.
 */
export function normalizeAdminPassword(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let next = value.replace(/^\uFEFF/, "").trim();
  const wrapped =
    (next.startsWith('"') && next.endsWith('"') && next.length >= 2) ||
    (next.startsWith("'") && next.endsWith("'") && next.length >= 2);
  if (wrapped) next = next.slice(1, -1).trim();
  return next;
}

export function adminPasswordShape(value: string | undefined): { chars: number; normalized: number; trimmed: 0 | 1 } {
  const normalized = normalizeAdminPassword(value);
  return {
    chars: value?.length ?? 0,
    normalized: normalized?.length ?? 0,
    trimmed: value != null && normalized != null && value !== normalized ? 1 : 0,
  };
}

/** Unset stays as seeded. A short value is refused. The password itself is never included in the result. */
export function adminPasswordAction(value: string | undefined): "unset" | "too-short" | "apply" {
  const normalized = normalizeAdminPassword(value);
  if (normalized == null || normalized.length === 0) return "unset";
  if (normalized.length < ADMIN_PASSWORD_MIN_LENGTH) return "too-short";
  return "apply";
}

export async function syncAdminPasswordsFromEnv(
  raw: string | undefined,
  db: {
    listAdmins: () => Promise<AdminPasswordAccount[]>;
    setPasswordHash: (id: string, passwordHash: string) => Promise<void>;
  },
  crypto: {
    compare: (password: string, hash: string) => Promise<boolean>;
    hash: (password: string) => Promise<string>;
  },
  warn: (message: string) => void = console.warn,
): Promise<"unset" | "too-short" | "updated" | "unchanged"> {
  const action = adminPasswordAction(raw);
  if (action === "unset") return "unset";
  if (action === "too-short") {
    warn(ADMIN_PASSWORD_TOO_SHORT);
    return "too-short";
  }
  const password = normalizeAdminPassword(raw) ?? "";
  const admins = (await db.listAdmins()).filter((account) => account.isAdmin);
  let updated = 0;
  for (const account of admins) {
    const same = await crypto.compare(password, account.passwordHash).catch(() => false);
    if (same) continue;
    await db.setPasswordHash(account.id, await crypto.hash(password));
    updated += 1;
  }
  return updated > 0 ? "updated" : "unchanged";
}

/** When ADMIN_PASSWORD is set, every administrator password becomes that value. Member passwords stay put. */
export async function syncAdminPasswords(): Promise<"unset" | "too-short" | "updated" | "unchanged"> {
  return syncAdminPasswordsFromEnv(
    process.env.ADMIN_PASSWORD,
    {
      listAdmins: () =>
        prisma.user.findMany({
          where: { isAdmin: true },
          select: { id: true, isAdmin: true, passwordHash: true },
        }),
      setPasswordHash: async (id, passwordHash) => {
        await prisma.user.update({ where: { id }, data: { passwordHash } });
      },
    },
    {
      compare: (password, hash) => bcrypt.compare(password, hash),
      hash: (password) => bcrypt.hash(password, 10),
    },
  );
}
