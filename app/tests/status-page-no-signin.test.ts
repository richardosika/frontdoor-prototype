import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("post-submit status pages", () => {
  for (const rel of ["../src/components/application-status.tsx", "../src/app/request-status/view/[token]/page.tsx"]) {
    it(`${rel} has Back to home and no Sign in`, () => {
      const src = readFileSync(path.resolve(__dirname, rel), "utf8");
      expect(src).not.toContain("Sign in");
      expect(src).not.toContain('href="/login"');
      expect(src).toContain("Back to home");
      expect(src).toContain("publicSiteUrl()");
    });
  }
});
