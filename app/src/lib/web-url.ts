/** Website and LinkedIn fields accept bare domains such as `example.com`, `www.example.com` or `linkedin.com/in/name`. */
const HAS_SCHEME = /^https?:\/\//i;
const BARE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

/** Adds https:// when the value has no scheme. Blank stays blank. */
export function normalizeWebUrl(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** True for a blank value, or something that reads as a web address with or without https://. */
export function isWebUrl(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return true;
  if (/\s/.test(trimmed)) return false;
  const rest = trimmed.replace(HAS_SCHEME, "");
  return BARE.test(rest);
}

/** Error text for a filled-in field that is not a web address, else null. */
export function webUrlIssue(label: string, value: string | null | undefined): string | null {
  return isWebUrl(value) ? null : `${label} should be a web address, like example.com.`;
}
