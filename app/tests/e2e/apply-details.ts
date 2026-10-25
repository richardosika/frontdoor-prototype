import assert from "node:assert/strict";
import { chromium, type Locator, type Page } from "playwright-core";

const BASE = process.env.APP_URL || "http://localhost:3000";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";

async function field(page: Page, label: string): Promise<Locator> {
  return page.getByRole("textbox", { name: new RegExp(`^${label}$`, "i") });
}

async function openDetails(page: Page) {
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Invite code" }).waitFor();
  await page.getByPlaceholder("PF-XXXX-XXXX").fill("PF-7K2M-91QX");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Choose role" }).waitFor();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Your details" }).waitFor();
}

async function fillRequired(page: Page, email: string, phone = "2015550148") {
  const values: [string, string][] = [
    ["First name", "Ada"],
    ["Last name", "Okoye"],
    ["Email", email],
    ["Create password", "correct-horse"],
    ["Company", "Northline Builders"],
    ["Street", "299 Market Street"],
    ["City", "Saddle Brook"],
    ["State", "NJ"],
    ["ZIP", "07663"],
    ["Contact phone", phone],
  ];
  for (const [label, value] of values) {
    if (!value) continue;
    await field(page, label).then((input) => input.fill(value));
  }
}

async function confirmEmail(page: Page) {
  await page.getByRole("button", { name: "Send code" }).click();
  const hint = page.getByText(/TEST MODE/);
  await hint.waitFor();
  const code = (await hint.innerText()).match(/\b(\d{4})\b/)?.[1];
  assert.ok(code, "test mode should show the 4-digit code");
  await page.getByPlaceholder("0000").fill(code);
  await page.getByRole("button", { name: "Confirm code" }).click();
  await page.getByText("Email confirmed.").waitFor();
}

async function stepLabel(page: Page): Promise<string> {
  return page.locator("text=/Step \\d+ of 5/").first().innerText();
}

async function run(width: number, height: number) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));

    await openDetails(page);
    await page.getByText("Minimum 8 characters").waitFor();
    await field(page, "Create password").then((input) => input.fill("short"));
    await page.locator("#apply-password").blur();
    await page.getByText("Password must be at least 8 characters.").waitFor();
    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await stepLabel(page), "Step 3 of 5");
    await page.getByText("Please complete the highlighted fields.").waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "apply-first-name");
    await page.getByText("Enter your first name.").waitFor();
    const send = page.getByRole("button", { name: "Send code" });
    assert.equal(await send.isDisabled(), true);
    assert.match(await page.locator("#apply-still-needed").innerText(), /Still needed: first name,/);
    assert.equal(await page.getByPlaceholder("0000").count(), 0);

    const email = `ada.details.${width}.${Date.now()}@example.com`;
    await fillRequired(page, email, "");
    await field(page, "ZIP").then((input) => input.fill(""));
    await page.locator("#apply-zip").blur();
    await page.getByText("Enter a ZIP code.").waitFor();
    assert.equal(await page.locator("#apply-still-needed").innerText(), "Still needed: ZIP, contact phone");
    assert.equal(await send.isDisabled(), true);
    assert.equal(await page.getByPlaceholder("0000").count(), 0);

    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await stepLabel(page), "Step 3 of 5");
    await page.waitForFunction(() => document.activeElement?.id === "apply-zip");
    const zipBox = await page.locator("#apply-zip").boundingBox();
    assert.ok(zipBox && zipBox.y >= 0 && zipBox.y < height, "ZIP should scroll into view");

    await field(page, "ZIP").then((input) => input.fill("07663"));
    await field(page, "Contact phone").then((input) => input.fill("2015550148"));
    await page.getByText("Still needed:").waitFor({ state: "hidden" });
    assert.equal(await send.isDisabled(), false);

    await field(page, "LinkedIn URL").then((input) => input.fill("linkedin.com/in/ada"));
    await page.locator("#apply-linkedin").blur();
    assert.equal(await page.locator("#apply-still-needed").innerText(), "Still needed: LinkedIn URL");
    assert.equal(await send.isDisabled(), true);
    await field(page, "LinkedIn URL").then((input) => input.fill(""));
    await page.getByText("Still needed:").waitFor({ state: "hidden" });

    await confirmEmail(page);
    await field(page, "Contact phone").then((input) => input.fill(""));
    await page.getByText("Email confirmed.").waitFor();
    assert.match(await page.locator("#apply-still-needed").innerText(), /contact phone/);
    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await stepLabel(page), "Step 3 of 5");
    await page.getByText("Please complete the highlighted fields.").waitFor();
    await page.getByText("Enter a contact phone number with at least 7 digits.").waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "apply-phone");
    const phoneBox = await page.locator("#apply-phone").boundingBox();
    assert.ok(phoneBox && phoneBox.y >= 0 && phoneBox.y < height, "contact phone should scroll into view");
    await page.getByText("Email confirmed.").waitFor();

    await field(page, "Contact phone").then((input) => input.fill("2015550148"));
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Step 4 of 5").waitFor();
    assert.equal(failures.length, 0, failures.join("\n"));
    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  await run(1280, 800);
  await run(390, 700);
  console.log("apply details playwright: ok");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
