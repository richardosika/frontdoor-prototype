const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "co.nz",
  "com.br",
  "co.jp",
  "com.mx",
]);

/** Strip a leading www. and keep the registrable domain (example.com, example.co.uk). */
export function registrableHost(host: string): string {
  const bare = host
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  const labels = bare.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const suffix2 = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(suffix2) && labels.length >= 3) return labels.slice(-3).join(".");
  return suffix2;
}

const RESERVED_EXAMPLE_SLD = new Set(["example.com", "example.net", "example.org"]);
const RESERVED_TLDS = new Set(["example", "test", "invalid", "localhost"]);

/**
 * Names that must not earn a domain-registration pass.
 * example.com (and example.net / example.org), anything under .example, .test,
 * .invalid, or .localhost, and localhost itself.
 */
export function isReservedDomain(host: string): boolean {
  const bare = host.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!bare) return false;
  if (bare === "localhost" || bare.endsWith(".localhost")) return true;
  const labels = bare.split(".").filter(Boolean);
  const tld = labels[labels.length - 1] || "";
  if (RESERVED_TLDS.has(tld)) return true;
  if (labels.length >= 2 && RESERVED_EXAMPLE_SLD.has(labels.slice(-2).join("."))) return true;
  return false;
}
