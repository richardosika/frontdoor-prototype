/** Free sources the engine knows about. Paid APIs are not configured. */
export const VERIFICATION_SOURCES = [
  { name: "Email syntax, disposable domains, free-provider flag, role address", kind: "Local list" },
  { name: "MX lookup", kind: "DNS" },
  { name: "Website fetch, HTTPS, title text, /about, /team", kind: "Public HTTP" },
  { name: "RDAP domain record", kind: "rdap.org" },
  { name: "OFAC SDN CSV and alternate names", kind: "treasury.gov, full file cached" },
  { name: "SEC EDGAR full-text search", kind: "efts.sec.gov" },
  { name: "CourtListener public search", kind: "courtlistener.com" },
  { name: "Web search (DuckDuckGo, Wikipedia, Wikidata, GDELT, Bing)", kind: "Free HTML or API, no key" },
  { name: "LinkedIn public page title", kind: "Public HTTP, no login" },
  { name: "State registry deep links", kind: "Manual. No free API." },
  { name: "Business card text compare", kind: "Local. OCR is not installed; an uploaded image is marked could not be checked." },
  { name: "Duplicates, phone area code, invite source, velocity", kind: "Private Floor records" },
] as const;
