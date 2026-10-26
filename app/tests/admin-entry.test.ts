import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_PASSWORD_TOO_SHORT,
  adminEnvPasswordMatches,
  adminPasswordAction,
  adminPasswordShape,
  credentialsAccepted,
  normalizeAdminPassword,
  syncAdminPasswordsFromEnv,
  type AdminPasswordAccount,
} from "@/lib/admin-password";
import { adminEntryRedirect } from "@/lib/session-gate";
import { adminLoginDecision, adminLoginTrace, adminSignInAllowed, credentialsPortalAllowed, GENERIC_SIGN_IN_ERROR, INACTIVE_ACCOUNT_ERROR, signInFailureCopy } from "@/lib/sign-in";
import { adminHttpLocationKind, demoAdministratorIds, ownerAccountNeedsRepair, ownerAdminIdentity } from "@/lib/admin-account";
import { KEEP_ADMIN_EMAIL } from "@/lib/clean-test-data";

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
    expect(adminPasswordAction(`  ${LONG}\n`)).toBe("apply");
    expect(adminPasswordAction(`"${LONG}"`)).toBe("apply");
    expect(normalizeAdminPassword(`  "${LONG}"\n`)).toBe(LONG);
    expect(adminPasswordShape(`  ${LONG}\n`)).toEqual({ chars: LONG.length + 3, normalized: LONG.length, trimmed: 1 });
    expect(JSON.stringify(adminPasswordShape(LONG))).not.toContain(LONG);
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

  it("accepts the env password when the stored hash is stale, and still blocks the member portal", () => {
    const secret = "correct-horse";
    expect(adminEnvPasswordMatches(`  ${secret}\n`, secret)).toBe(true);
    expect(adminEnvPasswordMatches("other-secret", secret)).toBe(false);
    expect(adminEnvPasswordMatches(secret, "short")).toBe(false);
    const admin = { isAdmin: true, allowedAdmin: true, hashMatches: false, envMatches: true };
    expect(credentialsAccepted({ ...admin, portal: "admin" })).toBe(true);
    expect(credentialsAccepted({ ...admin, portal: undefined })).toBe(true);
    expect(credentialsAccepted({ ...admin, portal: "member" })).toBe(false);
    expect(credentialsAccepted({ ...admin, allowedAdmin: false, portal: "admin" })).toBe(false);
    expect(credentialsAccepted({ isAdmin: false, allowedAdmin: false, hashMatches: true, envMatches: false, portal: "member" })).toBe(true);
    expect(JSON.stringify({ matched: adminEnvPasswordMatches(secret, secret) })).not.toContain(secret);
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

  it("refuses a demo account on the administrator sign-in and keeps the owner", () => {
    const marcus = { id: "user_mh", email: "marcus.hale@halerow.example", isAdmin: true, isTest: false, status: "ACTIVE" };
    const owner = { id: "user_owner", email: KEEP_ADMIN_EMAIL, isAdmin: true, isTest: false, status: "ACTIVE" };
    expect(adminSignInAllowed(marcus)).toBe(false);
    expect(adminSignInAllowed({ ...marcus, isAdmin: false })).toBe(false);
    expect(adminSignInAllowed(owner)).toBe(true);
    expect(adminSignInAllowed({ isAdmin: true, isTest: true, email: KEEP_ADMIN_EMAIL })).toBe(false);
    expect(demoAdministratorIds([marcus, owner])).toEqual(["user_mh"]);
    expect(ownerAccountNeedsRepair(null)).toBe("create");
    expect(ownerAccountNeedsRepair(owner)).toBe("ready");
    expect(ownerAccountNeedsRepair({ ...owner, isAdmin: false })).toBe("repair");
    const identity = ownerAdminIdentity();
    expect(identity).toMatchObject({
      email: KEEP_ADMIN_EMAIL,
      name: "Richard Osika",
      initials: "RO",
      credentialNote: "Founder",
      isAdmin: true,
      isTest: false,
      status: "ACTIVE",
    });
    expect(identity).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(identity)).not.toMatch(/cornicio|password/i);
    expect(adminLoginDecision({ user: marcus, passwordMatches: true })).toBe("rejected");
    expect(adminLoginDecision({ user: owner, passwordMatches: true })).toBe("ok");
    expect(adminLoginDecision({ user: owner, passwordMatches: false })).toBe("rejected");
    const trace = adminLoginTrace({
      found: true,
      active: true,
      admin: true,
      allowed: true,
      passwordMatches: false,
      passwordChars: 16,
    });
    expect(trace).toContain("compare=0");
    expect(trace).not.toContain("@");
    expect(adminHttpLocationKind("")).toBe("none");
    expect(adminHttpLocationKind("https://cornicio-mvp.onrender.com/login?error=CredentialsSignin")).toBe("error");
    expect(adminHttpLocationKind("https://cornicio-mvp.onrender.com/admin")).toBe("admin");
    expect(adminHttpLocationKind("/login?error=MissingCSRF")).toBe("error");
  });

  it("sends a signed-in administrator home and a signed-in member back to the floor", () => {
    expect(adminEntryRedirect("/admin/login", null)).toBeNull();
    expect(adminEntryRedirect("/admin/login", { isAdmin: true })).toBe("/admin");
    expect(adminEntryRedirect("/admin/login", { isAdmin: false })).toBe("/feed");
    expect(adminEntryRedirect("/login", { isAdmin: true })).toBeNull();
    expect(GENERIC_SIGN_IN_ERROR).toBe("Those credentials were not recognized.");
  });
});
