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

/** The digits are returned to the browser only while no email provider is configured. */
export function verificationCodeForScreen(input: { providerConfigured: boolean; code: string }): string | null {
  if (input.providerConfigured) return null;
  return input.code;
}

export function testModeCodeMessage(code: string): string {
  return `TEST MODE. No email provider is configured. Your code is ${code}. The same code is in the admin Outbox.`;
}
