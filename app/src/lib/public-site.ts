/**
 * Marketing homepage for “Back to home” after a request is submitted.
 * https://privatefloorclub.com is registered but not serving the site yet, so the
 * fallback is the preview until PUBLIC_SITE_URL points at the public domain.
 */
export const PUBLIC_SITE_FALLBACK = "https://private-floor-preview.onrender.com";

export function publicSiteUrl(configured = process.env.PUBLIC_SITE_URL): string {
  const value = configured?.trim().replace(/\/$/, "") ?? "";
  if (/^https?:\/\//i.test(value)) return value;
  return PUBLIC_SITE_FALLBACK;
}
