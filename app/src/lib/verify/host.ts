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
