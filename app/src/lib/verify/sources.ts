/** Free sources the engine knows about. Paid APIs are not configured. */
export const VERIFICATION_SOURCES = [
  { name: "Email syntax, disposable domains, free-provider flag, role address", kind: "Local list" },
  { name: "MX lookup", kind: "DNS" },
  { name: "Website fetch, including about and contact pages linked from the home page", kind: "Public HTTP" },
  { name: "RDAP domain record", kind: "rdap.org" },
  { name: "OFAC SDN CSV and alternate names", kind: "treasury.gov, full file cached" },
  { name: "OpenSanctions public search", kind: "Not checkable for free. opensanctions.org returns 401 without a paid key. A blocked response is not a clear result." },
  { name: "OpenCorporates public company search", kind: "Not checkable for free. opencorporates.com returns 401 without a paid token. A blocked response is not a clear result." },
  { name: "SEC EDGAR full-text search", kind: "efts.sec.gov" },
  { name: "CourtListener public search", kind: "courtlistener.com" },
  { name: "Web search (DuckDuckGo, Bing)", kind: "Free HTML, no key. An empty but reachable results page is inconclusive. A challenge page is could not check, not a miss." },
  { name: "Web footprint", kind: "Recorded by public screening. The applicant's own site counts as one self-reported source. There is no email-domain to website match." },
  { name: "News (Google News RSS)", kind: "Free RSS, no key. A different company with a similar name is not a match." },
  { name: "Social pages (LinkedIn, X, Facebook, Instagram, YouTube, TikTok)", kind: "Public HTTP only. A login wall is could not check, not a miss." },
  { name: "State registry deep links", kind: "Manual. No free API." },
  { name: "Business card text compare", kind: "Local. OCR is installed (tesseract.js). If it returns no text, the image is marked could not be checked. A text match is self-reported." },
  { name: "Duplicates, phone area code, invite source, velocity", kind: "Private Floor records" },
] as const;
