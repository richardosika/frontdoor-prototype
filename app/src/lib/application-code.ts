export const APPLICATION_CODE_LENGTH = 4;

function uniformRoll(limit: number): number {
  const max = Math.floor(0x1_0000_0000 / limit) * limit;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0] ?? 0;
  } while (value >= max);
  return value % limit;
}

const PROVIDER_ENV_KEYS = ["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_URL"] as const;

type ProviderEnv = Partial<Record<(typeof PROVIDER_ENV_KEYS)[number], string | undefined>>;

/** A real sender is configured only when one of these values is non-empty. Test mode is the default. */
export function emailProviderConfigured(env: ProviderEnv = process.env as ProviderEnv): boolean {
  return PROVIDER_ENV_KEYS.some((key) => (env[key] ?? "").trim().length > 0);
}

export function newApplicationCode(roll: () => number = () => uniformRoll(10 ** APPLICATION_CODE_LENGTH)): string {
  const value = Math.trunc(roll());
  const bounded = Number.isFinite(value) ? Math.abs(value) % 10 ** APPLICATION_CODE_LENGTH : 0;
  return String(bounded).padStart(APPLICATION_CODE_LENGTH, "0");
}

export function normalizeApplicationCode(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Exactly `1` keeps the code on screen after an email provider, including Resend, is configured. */
export function showTestCodeRequested(env: { SHOW_TEST_CODE?: string } = process.env as { SHOW_TEST_CODE?: string }): boolean {
  return env.SHOW_TEST_CODE === "1";
}

/** The digits stay off screen once a provider is configured, unless SHOW_TEST_CODE=1. */
export function verificationCodeForScreen(input: { providerConfigured: boolean; showTestCode?: boolean; code: string }): string | null {
  if (input.providerConfigured && !input.showTestCode) return null;
  return input.code;
}

export function testModeCodeMessage(code: string, options?: { providerConfigured?: boolean }): string {
  if (options?.providerConfigured) {
    return `TEST MODE. Your code is ${code}. A copy is in the admin Outbox. SHOW_TEST_CODE is on, so the code is also shown here.`;
  }
  return `TEST MODE. No email provider is configured. Your code is ${code}. The same code is in the admin Outbox.`;
}
