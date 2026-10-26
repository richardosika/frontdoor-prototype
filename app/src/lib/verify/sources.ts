/** Free sources the engine knows about. Paid APIs are not configured. */
export const VERIFICATION_SOURCES = [
  { name: "Email syntax, disposable domains, free-provider flag, role address", kind: "Local list" },
  { name: "MX lookup", kind: "DNS" },
  { name: "Website fetch, including up to four team, people, leadership, about, professionals, or attorney pages linked from the home page, plus up to eight sitemap.xml paths that contain the last name", kind: "Public HTTP via the same polite fetch. A sitemap index is followed only for a few people-page sitemaps. Pages on the applicant's own site are one self-reported source." },
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
  { name: "NY Active Corporations", kind: "data.ny.gov, keyless. Exact normalized name only. Company-exists evidence, not a person link. Other states stay a manual link and are not a pass." },
  { name: "Business card text compare", kind: "Local. OCR is installed (tesseract.js). If it returns no text, the image is marked could not be checked. A text match is self-reported." },
  { name: "Duplicates, phone area code, referral or request, velocity", kind: "Private Floor records" },
] as const;
