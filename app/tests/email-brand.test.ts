import { describe, expect, it } from "vitest";
import { TEMPLATE_DEFS, renderTemplate, sampleTemplateVars, templateDef, type TemplateKey } from "@/lib/email-templates";
import { buildTestMail, noticeHtml, resendPayload } from "@/lib/resend-mail";

const BUTTON: Partial<Record<TemplateKey, string>> = {
  info: ">REQUEST TO JOIN</a>",
  invite_received: ">CHECK YOUR STATUS</a>",
  application_thanks: ">CHECK YOUR STATUS</a>",
  welcome: ">SIGN IN</a>",
  needs_info: ">REPLY</a>",
  approved: ">SIGN IN</a>",
  declined: ">CHECK YOUR STATUS</a>",
  payment_due: ">PAY MEMBERSHIP DUES</a>",
  dues_reminder: ">PAY MEMBERSHIP DUES</a>",
  renewal: ">CANCEL ANYTIME</a>",
};

function letter(key: TemplateKey) {
  const def = templateDef(key);
  if (!def) throw new Error(key);
  const vars = sampleTemplateVars();
  const subject = renderTemplate(def.subject, vars, { signOff: false });
  const text = renderTemplate(def.body, vars);
  const html = noticeHtml(text, { headline: subject });
  return { subject, text, html };
}

describe("branded email layout", () => {
  it("wraps every template in the branded card and keeps a plain-text letter", () => {
    expect(TEMPLATE_DEFS.length).toBeGreaterThan(0);
    for (const def of TEMPLATE_DEFS) {
      const { subject, text, html } = letter(def.key);
      expect(text, def.key).not.toMatch(/<!DOCTYPE|<html|<table/i);
      expect(text.trim().length, def.key).toBeGreaterThan(20);
      if (def.body.includes("{first_name}")) expect(text, def.key).toContain("Alex");
      expect(html, def.key).toContain("<!DOCTYPE html>");
      expect(html, def.key).toContain("background:#1F3A2E");
      expect(html, def.key).toContain("background:#F4EFE4");
      expect(html, def.key).toContain("background:#A8843F");
      expect(html, def.key).toContain("font-family:Georgia");
      expect(html, def.key).toContain("/email-assets/lockup.png");
      expect(html, def.key).toContain("Richard Osika, Founder");
      expect(html, def.key).toContain(subject.toUpperCase());
      const button = BUTTON[def.key];
      if (button) expect(html, def.key).toContain(button);
      if (def.key === "application_code") expect(html).toContain(">1234<");
      const message = buildTestMail({
        intendedTo: "ada@example.com",
        subject,
        text,
        to: "rich@privatefloorclub.com",
        from: "Private Floor Club <onboarding@resend.dev>",
      });
      const payload = resendPayload(message);
      expect(payload.text, def.key).toBe(text);
      expect(payload.html, def.key).toContain("background:#1F3A2E");
      expect(payload.html, def.key).toContain("Richard Osika, Founder");
    }
  });

  it("gives the dues letter a pay button inside the same wrapper", () => {
    const { text, html } = letter("payment_due");
    expect(text).toContain("Pay membership dues");
    expect(text).toContain("$99.50");
    expect(text).toContain("$199 per month");
    expect(text).toContain("https://cornicio-mvp.onrender.com/pay/preview");
    expect(html).toContain(">PAY MEMBERSHIP DUES</a>");
    expect(html).toContain('href="https://cornicio-mvp.onrender.com/pay/preview"');
    expect(html).toContain(">SIGN IN</a>");
    expect(html).toContain(">VIEW THE DECISION</a>");
  });
});
