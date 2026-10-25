import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_PASSWORD_TOO_SHORT,
  adminPasswordAction,
  syncAdminPasswordsFromEnv,
  type AdminPasswordAccount,
} from "@/lib/admin-password";
import { adminEntryRedirect } from "@/lib/session-gate";
import { credentialsPortalAllowed, GENERIC_SIGN_IN_ERROR, INACTIVE_ACCOUNT_ERROR, signInFailureCopy } from "@/lib/sign-in";

const MEMBER: AdminPasswordAccount = { id: "member", isAdmin: false, passwordHash: "member-hash" };
const ADMIN: AdminPasswordAccount = { id: "admin", isAdmin: true, passwordHash: "admin-hash" };
const LONG = "correct-horse";

describe("ADMIN_PASSWORD", () => {
  it("refuses a short value without recording it", () => {
    const secret = "tiny-secret";
    expect(secret.length).toBeLessThan(12);
    expect(adminPasswordAction(undefined)).toBe("unset");
    expect(adminPasswordAction("")).toBe("unset");
    expect(adminPasswordAction(secret)).toBe("too-short");
    expect(adminPasswordAction(LONG)).toBe("apply");
    expect(ADMIN_PASSWORD_TOO_SHORT).not.toContain(secret);
  });

  it("updates administrator hashes and leaves members unchanged", async () => {
    const warnings: string[] = [];
    const updates: { id: string; passwordHash: string }[] = [];
    const result = await syncAdminPasswordsFromEnv(
      LONG,
      {
        listAdmins: async () => [ADMIN, MEMBER],
        setPasswordHash: async (id, passwordHash) => {
          updates.push({ id, passwordHash });
        },
      },
      {
        compare: async (password, hash) => password === LONG && hash === "already",
        hash: async (password) => `hashed:${password.length}`,
      },
      (message) => warnings.push(message),
    );
    expect(result).toBe("updated");
    expect(updates).toEqual([{ id: "admin", passwordHash: `hashed:${LONG.length}` }]);
    expect(warnings).toEqual([]);
    expect(JSON.stringify(updates)).not.toContain(LONG);
  });

  it("skips a rewrite when the administrator password already matches", async () => {
    const updates: string[] = [];
    const result = await syncAdminPasswordsFromEnv(
      LONG,
      {
        listAdmins: async () => [{ ...ADMIN, passwordHash: "already" }],
        setPasswordHash: async (id) => {
          updates.push(id);
        },
      },
      {
        compare: async () => true,
        hash: async () => {
          throw new Error("hash should not run");
        },
      },
    );
    expect(result).toBe("unchanged");
    expect(updates).toEqual([]);
  });

  it("warns and writes nothing when the value is too short", async () => {
    const secret = "tiny-secret";
    const warnings: string[] = [];
    const listed = vi.fn(async () => [ADMIN]);
    const result = await syncAdminPasswordsFromEnv(
      secret,
      { listAdmins: listed, setPasswordHash: async () => undefined },
      { compare: async () => false, hash: async () => "nope" },
      (message) => warnings.push(message),
    );
    expect(result).toBe("too-short");
    expect(listed).not.toHaveBeenCalled();
    expect(warnings).toEqual([ADMIN_PASSWORD_TOO_SHORT]);
    expect(warnings.join(" ")).not.toContain(secret);
  });
});

describe("separate administrator sign-in", () => {
  it("keeps administrator credentials off the member page", () => {
    expect(credentialsPortalAllowed(true, "admin")).toBe(true);
    expect(credentialsPortalAllowed(false, "member")).toBe(true);
    expect(credentialsPortalAllowed(false, undefined)).toBe(true);
    expect(credentialsPortalAllowed(true, "member")).toBe(false);
    expect(credentialsPortalAllowed(true, undefined)).toBe(false);
    expect(credentialsPortalAllowed(false, "admin")).toBe(false);
    expect(
      signInFailureCopy({
        memberFound: true,
        memberPasswordMatches: true,
        memberActive: false,
        pendingApplicationPasswordMatches: false,
      }),
    ).toBe(INACTIVE_ACCOUNT_ERROR);
  });

  it("sends a signed-in administrator home and a signed-in member back to the floor", () => {
    expect(adminEntryRedirect("/admin/login", null)).toBeNull();
    expect(adminEntryRedirect("/admin/login", { isAdmin: true })).toBe("/admin");
    expect(adminEntryRedirect("/admin/login", { isAdmin: false })).toBe("/feed");
    expect(adminEntryRedirect("/login", { isAdmin: true })).toBeNull();
    expect(GENERIC_SIGN_IN_ERROR).toBe("Those credentials were not recognized.");
  });
});
