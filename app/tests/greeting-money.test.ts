import { describe, expect, it } from "vitest";
import { buildMailVars } from "@/lib/mail";
import { firstName, renderTemplate, TEMPLATE_DEFS } from "@/lib/email-templates";
import { givenNameFrom } from "@/lib/person-fields";
import { formatMoney } from "@/lib/dues";
import { formatProjectValue } from "@/lib/project-contact";
import { formatMoneyDigits, formatUsd, moneyDigits } from "@/lib/money";
import { phrase } from "@/lib/i18n/phrases";

describe("email greetings use the first name", () => {
  it("never keeps part of a multi-word last name", () => {
    expect(firstName("Stephanie De La Torre")).toBe("Stephanie");
    expect(givenNameFrom("", "Stephanie De La Torre")).toBe("Stephanie");
    expect(givenNameFrom("Stephanie", "Stephanie De La Torre")).toBe("Stephanie");
    expect(givenNameFrom("Mary Ann", "Mary Ann De La Torre")).toBe("Mary Ann");
    expect(firstName("")).toBe("there");
  });
  it("renders 'Hello Stephanie,' in every notice template", () => {
    const vars = buildMailVars({ name: "Stephanie De La Torre" } as Parameters<typeof buildMailVars>[0]);
    for (const def of TEMPLATE_DEFS) {
      const body = renderTemplate(def.body, vars);
      if (!body.includes("Hello")) continue;
      expect(body, def.key).not.toContain("De La");
      expect(body, def.key).toMatch(/Hello Stephanie,/);
    }
  });
});

describe("money formatting", () => {
  it("groups thousands in USD", () => {
    expect(formatUsd(50_000_000)).toBe("$50,000,000");
    expect(formatUsd(1_250_000)).toBe("$1,250,000");
    expect(formatMoney(125_000_000)).toBe("$1,250,000");
    expect(formatMoney(49_950)).toBe("$499.50");
    expect(formatProjectValue("50000000")).toBe("$50,000,000");
    expect(formatProjectValue("$24M")).toBe("$24,000,000");
  });
  it("is locale aware", () => {
    expect(formatUsd(1_250_000, "de")).toMatch(/^1\.250\.000\s\$$/);
    expect(formatUsd(1_250_000, "es")).toMatch(/^1\.250\.000\s(US)?\$$/);
    expect(formatUsd(1_250_000, "ja")).toBe("$1,250,000");
    expect(formatMoneyDigits("5000", "es")).toBe("5.000");
  });
  it("money inputs save the plain number", () => {
    expect(moneyDigits("$1,250,000")).toBe("1250000");
    expect(moneyDigits("50,000,000")).toBe("50000000");
    expect(formatMoneyDigits("1250000")).toBe("1,250,000");
  });
});

describe("/join translations", () => {
  it("has ES, DE and JA for headings and labels", () => {
    for (const text of ["Request to join", "About you", "Work email", "Continue", "Select a state", "Step {step} of 2"]) {
      for (const locale of ["es", "de", "ja"] as const) expect(phrase(locale, text), `${locale}:${text}`).not.toBe(text);
    }
  });
});
