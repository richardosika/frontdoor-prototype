import { describe, expect, it } from "vitest";
import {
  ROBOTS_TAG,
  SITE_GATE_USERNAME,
  basicAuthorizationMatches,
  constantTimeEqual,
  parseBasicAuthorization,
  siteGateChallengeHeaders,
  siteGateConfigured,
  siteGateExempt,
  skipsMemberSession,
} from "@/lib/site-gate";

const PASSWORD = "gate-secret-value";

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

describe("site gate", () => {
  it("stays off until a password is set", () => {
    expect(siteGateConfigured(undefined)).toBe(false);
    expect(siteGateConfigured(null)).toBe(false);
    expect(siteGateConfigured("")).toBe(false);
    expect(siteGateConfigured(PASSWORD)).toBe(true);
  });

  it("exempts the health check, the Stripe webhook, and email images", () => {
    expect(siteGateExempt("/api/health")).toBe(true);
    expect(siteGateExempt("/api/stripe/webhook")).toBe(true);
    expect(siteGateExempt("/email-assets/lockup.png")).toBe(true);
    expect(siteGateExempt("/email-assets/")).toBe(true);
    expect(siteGateExempt("/email-assets")).toBe(false);
    expect(siteGateExempt("/email-assets-extra")).toBe(false);
    expect(siteGateExempt("/api/health/extra")).toBe(false);
    expect(siteGateExempt("/api/stripe")).toBe(false);
    expect(siteGateExempt("/api/stripe/webhook/replay")).toBe(false);
    expect(siteGateExempt("/login")).toBe(false);
    expect(siteGateExempt("/admin/login")).toBe(false);
    expect(siteGateExempt("/api/auth/callback/credentials")).toBe(false);
    expect(siteGateExempt("/robots.txt")).toBe(false);
  });

  it("accepts the fixed username and password, including a colon in the password", async () => {
    const withColon = "left:right";
    expect(await basicAuthorizationMatches(basic(SITE_GATE_USERNAME, withColon), withColon)).toBe(true);
    expect(await basicAuthorizationMatches(basic(SITE_GATE_USERNAME, PASSWORD), PASSWORD)).toBe(true);
    expect(await basicAuthorizationMatches(basic("someone", PASSWORD), PASSWORD)).toBe(false);
    expect(await basicAuthorizationMatches(basic(SITE_GATE_USERNAME, "wrong-password"), PASSWORD)).toBe(false);
    expect(await basicAuthorizationMatches(null, PASSWORD)).toBe(false);
    expect(await basicAuthorizationMatches("Bearer token", PASSWORD)).toBe(false);
    expect(await constantTimeEqual(PASSWORD, PASSWORD)).toBe(true);
    expect(await constantTimeEqual(PASSWORD, `${PASSWORD} `)).toBe(false);
    expect(await constantTimeEqual("short", "a-much-longer-secret")).toBe(false);
  });

  it("does not put the password in the challenge", () => {
    const headers = siteGateChallengeHeaders();
    expect(headers["WWW-Authenticate"]).toContain('Basic realm="Private Floor"');
    expect(headers["X-Robots-Tag"]).toBe(ROBOTS_TAG);
    expect(JSON.stringify(headers)).not.toContain(PASSWORD);
    expect(parseBasicAuthorization(basic(SITE_GATE_USERNAME, PASSWORD))?.password).toBe(PASSWORD);
  });

  it("still recognizes static assets for the member session", () => {
    expect(skipsMemberSession("/_next/static/chunks/app.js")).toBe(true);
    expect(skipsMemberSession("/_next/image")).toBe(true);
    expect(skipsMemberSession("/brand/pf-mark.svg")).toBe(true);
    expect(skipsMemberSession("/icon.svg")).toBe(true);
    expect(skipsMemberSession("/login")).toBe(false);
    expect(skipsMemberSession("/api/auth/session")).toBe(false);
  });
});
