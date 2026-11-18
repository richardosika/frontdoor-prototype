import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import { EXPIRED_PAYMENT_LINK, EXPIRED_STATUS_LINK, expiredLinkCopy } from "@/lib/expired-link";

const ROOT = path.resolve(__dirname, "../src");

describe("expired pay and status links", () => {
  it("uses a branded sentence and the contact address", () => {
    expect(EXPIRED_PAYMENT_LINK).toBe(
      "This payment link has expired or is no longer valid. Contact connect@privatefloorclub.com",
    );
    expect(EXPIRED_STATUS_LINK).toBe(
      "This status link has expired or is no longer valid. Contact connect@privatefloorclub.com",
    );
    expect(EXPIRED_PAYMENT_LINK).toContain(BRAND.contactEmail);
    expect(expiredLinkCopy("payment").title).toBe("Payment link");
    expect(expiredLinkCopy("status").body).toBe(EXPIRED_STATUS_LINK);
  });

  it("shows that sentence from the pay and status routes", () => {
    const pay = readFileSync(path.join(ROOT, "app/pay/[token]/not-found.tsx"), "utf8");
    const application = readFileSync(path.join(ROOT, "app/apply/status/[token]/not-found.tsx"), "utf8");
    const invite = readFileSync(path.join(ROOT, "app/invite-status/[token]/not-found.tsx"), "utf8");
    const request = readFileSync(path.join(ROOT, "app/request-status/[token]/not-found.tsx"), "utf8");
    expect(pay).toContain('kind="payment"');
    expect(application).toContain('kind="status"');
    expect(invite).toContain('kind="status"');
    expect(request).toContain('kind="status"');
    expect(readFileSync(path.join(ROOT, "app/pay/[token]/route.ts"), "utf8")).toContain("status: 404");
    const applyStatus = readFileSync(path.join(ROOT, "app/apply/status/[token]/route.ts"), "utf8");
    expect(applyStatus).toContain("publicStatusPath");
    expect(applyStatus).not.toContain("/apply/status/view");
    expect(readFileSync(path.join(ROOT, "app/request-status/[token]/route.ts"), "utf8")).toContain("status: 404");
    expect(readFileSync(path.join(ROOT, "lib/http-document.ts"), "utf8")).toContain("<h1>");
    expect(readFileSync(path.join(ROOT, "app/invite-status/[token]/page.tsx"), "utf8")).toContain("/request-status/");
  });
});
