# Verification

The engine recommends. It never approves or declines a member. Richard Osika decides every application.

A run stores a score from 0 to 100, one verdict, and a short summary. The verdict is exactly one of:

- `LEGIT`
- `NOT_LEGIT`
- `NEEDS_OWNER_DECISION`

Members never see the score, the verdict, the checklist, the notes, or the sources. They see “Verified” or “Verification in progress” on a verification file, and a plain membership status on the application page.

## Score

Score = round(100 × weight of PASS checks / weight of checks that are not `NOT_RUN`).

`INCONCLUSIVE`, `FAIL`, and `UNAVAILABLE` stay in the denominator and earn 0. A blocked source does not shrink the denominator. A thin file cannot look strong. `NOT_RUN` is left out, because that check was not attempted.

## Verdict

Evaluated in this order:

1. Any check with `hardFlag` → `NOT_LEGIT`.
2. Otherwise `LEGIT` only when the score is at least **72**, at least **3** passing checks have `corroborates` and weight of at least **8**, and no check has `reviewFlag` or status `FAIL`.
3. Everything else → `NEEDS_OWNER_DECISION`.

Absence of a sanctions hit is not corroboration. A private email (Gmail and the like) is allowed. The engine does not match an email domain to a website, and an email domain is never evidence that a company is real.

`NOT_LEGIT` is reserved for hard red flags:

- A watchlist name match at or above 0.92 **and** a location token from the list appears in the application location.
- A disposable email domain and no website and no LinkedIn URL.
- Fraud-pattern text: “guaranteed returns” together with wire, seed phrase, send funds, or no risk.
- The email already belongs to a member, or to a declined application.

A possible sanctions match without location corroboration is a review flag, not a hard flag. Common names such as John Smith against a list entry in another country stay on `NEEDS_OWNER_DECISION`.

## Grade

The letter grade is the authoritative score. The older 0–100 weight percentage stays on `VerificationRun.score` and is labeled “legacy weight score” on the audit log, the admin activity feed, and the CRM timeline. The file and the application list show the letter and the grade score. It is a recommendation to Richard Osika. Rubric version `2026-10-25`.

Points are fixed and sum to 100. A missing, blocked, or empty source earns 0 and still sits in the possible total, so missing data cannot raise the grade. Email domain and MX earn 0. RDAP earns at most 2.

| Category | Possible | What earns the points |
| --- | --- | --- |
| Identity and contact | 18 | Well-formed email 2, not disposable 4, not a shared inbox 2, phone area code matches 3, LinkedIn link shape 3, public LinkedIn page names the person 4, or a LinkedIn company page names the company only 2. A toll-free number (800, 833, 844, 855, 866, 877, 888) is not applicable: those 3 points leave the line and it is not scored 0 of 3. |
| Company legitimacy | 22 | Website names the person and company 8, or the company only on the firm's own site 4, EDGAR hit 6, business card matches 4, domain record 2, state registry 2 (exact company name on NY, CT, CO, OR, or PA open data; other states earn 0) |
| Public footprint and reputation | 18 | Web result names person and company 8, headline names both 8, social links are full URLs 2 |
| Risk and sanctions | 20 | Sanctions list clear 8, not a duplicate 6, no fraud-pattern text 4, no application burst 2 |
| Role fit and plausibility | 12 | Name, company, and role readable 8, referral or request code on file 4 |
| Completeness of application | 10 | Phone 2, location 2, website or LinkedIn 2, track record 2, business card 1, reference 1 |

Letters before caps: A 90–100, B 80–89, C 70–79, D 60–69, F 0–59. Caps only lower the letter.

Proposal R2 is off (`GRADE_WEIGHTS_MODE` is `standard`). Turning it on moves the 4 LinkedIn-fetch points and the 2 registry points onto the website (11) and the web footprint (11), then rescales earned points over the points that could actually be checked. A blocked or skipped check leaves that denominator. “No SEC registrant” stays in it. A file with no referral is `No referral was supplied` and those 4 points leave the denominator; a code that was supplied but is not valid still scores 0 and is flagged. With R2 off, a missing referral still scores 0 of 4 and the line reads `No referral was supplied (0 of 4)`. Letter floors do not move.

- No independent person-and-company corroboration: cannot exceed D, so the letter stays below C. Letter floors are unchanged (C still starts at 70). One independent source: cannot exceed C, and the recommendation is not an approval. The applicant's own website, team pages on that site, a LinkedIn company page, and a self-reported card are not independent sources. A company-only match on the firm's own site or LinkedIn company page is labelled “company confirmed, person NOT confirmed” and earns half the points of a person-and-company match. That partial credit cannot by itself reach APPROVE. A public web footprint has to come from a third-party host and still needs the person and the company. The same page is not counted again as a footprint. A company-name-only EDGAR or NY registry hit is company-exists evidence and does not corroborate the person. EDGAR matches a normalized exact name or a ticker that is the whole applicant name. A company search keeps a short token such as SL, requires every other non-generic token, and does not pick the shortest title. Generic words such as group, capital, and realty do not match a different firm. “CBRE Group” does not match Unum Group. A LinkedIn or social URL that was not fetched does not earn its points unless an independent source already corroborated the file.
- Negative headline that is only a name match: cannot exceed C. The file says “possible match, verify” and does not state the headline as fact. A headline is attributed to the person only on a full-name match, not a single surname token.
- Disposable email that still has a public page, sanctions name without country or date of birth, or fraud, sanctions, or a criminal charge tied to the person together with the company or city: cannot exceed D, with a red banner. A company-level lawsuit or lien is an attention item for Richard. It is not that cap. Separate news headlines are not separate conflicts. An OpenSanctions hard flag, if that paid source ever answers, uses the same sanctions caps.
- Corroborated sanctions, fraud-pattern text, disposable email with no website or LinkedIn, or a duplicate of a member or a declined applicant: cannot exceed F, with a red banner.
- Two or more conflicting checks: cannot exceed C.

Confidence is separate. High: at least 70% of weighted checks returned pass or fail, and at least 2 sources corroborated the person and the company. Medium: at least 45%, or at least 1 corroborating source. Low: otherwise, and always when nothing corroborated them.

The recommendation is one of APPROVE, APPROVE WITH CONDITIONS, NEEDS MORE INFO, or DECLINE. A hard red flag recommends DECLINE. A doubtful hit, low confidence, or a thin file recommends NEEDS MORE INFO. A paying role is not a clean APPROVE, because monthly dues go out only after approval. The grade is stored as JSON on the verification run with the time it was graded. Re-run writes a note of what changed. Richard’s decision log and the admin notice include the grade. Members never see it.

The company-site probe also tries `/attorney`, `/lawyers`, `/our-people`, and `/associated_attorney`, reads sitemap.xml URLs that contain the surname, and follows one nested link such as `/our-people/partners/stephen-b-meister/`. A LinkedIn company slug may contain a dot. A civil docket that does not name the applicant, including a caption such as "Zumba v. Sciame Construction", is an attention item and does not cap the grade. The cap stays for fraud, a criminal charge, an indictment, a sanction, or an SEC charge, and for a civil headline that names the applicant with the company or the city. REO, a dividend reset, a loss, and a downgrade are not negative hits. EDGAR also searches the free full-text index by the full company name when the firm is missing from `company_tickers.json`. An exact normalized title matches first. Otherwise every non-generic token of two or more characters has to be in the title, and the shortest title does not win. Generic words never suffice, so CBRE Group matches CBRE GROUP, INC. and does not match Unum Group. SL Green Realty Corp matches SL GREEN REALTY CORP and does not match GREEN DOT CORP. A company-name hit does not corroborate the person. The approve step lists `person-to-company link` as Unverified unless a check actually corroborated the person, even when the company step auto-passed. News and social queries use the full distinctive company phrase. A result counts only when it names the person and the company or the city. A search that matches none of those says `no match found`, and each source is named once. Re-run checks writes that grade onto the application run, labels latest check against the grade at application when they differ, and always adds an audit entry. Script, style, and head are removed before the 180,000-character cap, and the probe also tries `/about/leadership` and `/about/executive-management`. A page that names the person and the city without the company is inconclusive and says `name found, company not named`. It does not corroborate. A cross-domain redirect is reported with the final URL. The new brand is a review-only alias and does not corroborate by itself. A headline that says the person is taking a step back is an announced departure, not current employment. The words real, estate, trust, and usa are generic, so Mack Real Estate Group stays the brand Mack and does not match LEAD REAL ESTATE CO. A two- or three-letter brand stays in the query with the next two words, so BK Real Estate Advisors is searched as "bk real estate" and SL Green Realty as "sl green realty". A list of given names that share one surname still matches, including founded by William, Richard and Stephen Mack. A foreclosure headline is company-level review and does not cap the grade. When the news check fails, its link is the negative headline, and screen-news uses that same judgement. A TLD with no RDAP service, including .us, could not be checked for free. An unregistered domain says domain is not registered and counts against the company. A web footprint does not repeat a URL another check already passed; when it has no page of its own it says same source as that check. Screen-news uses the news judgement and does not corroborate the same headline again. The four-page crawl prefers leadership and about pages over a service slug ending in -management, reads same-origin paths from escaped JSON, and reads sitemap.xml with a larger cap than the 180KB HTML default. A Facebook /people/name/id/ link keeps the id.

There is no language model on this path. The summary is built from the checks. If a model key is set elsewhere on the site, this file is still not sent to a model.

## Summary

The stored summary text is the executive summary plus a short legacy line. It is not a language model. It always includes:

- The applicant, the company, what checked out, what did not, and what could not be checked
- The letter grade, the recommendation to Richard Osika, and the next step
- `Recommendation: LEGIT`, `Recommendation: NOT LEGIT`, or `Recommendation: NEEDS YOUR DECISION`
- `What I could not check for free`, including any source marked unavailable (blocked, timed out, or errored)

## Jobs

Submitting an application queues an application run and a company run. A new project queues a project run. Pending and running jobs resume on server boot. A source that answers with nothing relevant is `INCONCLUSIVE` (“No data found”). A source that is blocked, times out, or errors is `UNAVAILABLE`, earns 0, and in the standard weighting stays in the score denominator. Proposal R2 drops a blocked or skipped check from the coverage denominator instead of treating it as a silent zero. A domain whose DNS is NXDOMAIN or ENOTFOUND, or that has no RDAP record, is `FAIL` and the summary says “domain does not resolve” under what did not check out. A timeout, HTTP 403, HTTP 405, or a captcha stays `UNAVAILABLE`. Neither a block nor an empty result fails the job by itself. Each check shows a status chip. The recommendation is computed again after a skipped review step lowers confidence, so a skip can move APPROVE to NEEDS MORE INFO.

Test-console samples run with the network off. The strong sample adds three local fixture checks so a `LEGIT` recommendation is visible without outside sites. **Re-run verification** turns the network on and does not add those fixtures. The verdict can change. The test console can also create one `is_test` applicant with a name, company, email, and website you type, then queue a live run.

OCR is installed (`tesseract.js`). An uploaded card that comes back with no text is `UNAVAILABLE`: the summary says the image could not be checked and an administrator should read the file. If card text is already on the application, the checker requires the full first and last name and a real company match. That match is self-reported. No upload is `NOT_RUN`.

## Free sources

| Check | Source | When it does not run |
| --- | --- | --- |
| Email syntax, disposable list, free provider, role address | Bundled lists | Always local |
| MX | DNS | Skipped on offline passes and disposable domains |
| Website, /about, /team | Public HTTP | A blank website is missing, not blocked. A page that names the company and not the person is “company confirmed, person NOT confirmed” and earns half the website points. A different generational suffix is inconclusive and does not pass. The applicant's own page is self-reported. HTTP 403 is not retried. The row says “blocked by site (403) — not checkable for free; ask applicant for a team-page URL” and is `UNAVAILABLE`, never a pass or a fail. HTTP 405 is “blocked by site, ask applicant for a team-page URL” and is also `UNAVAILABLE`. A script-rendered shell with nothing to read says “site is script-rendered; nothing readable” and is not checkable. It is not “person not found”. An HTTP 200 Imperva or Cloudflare challenge (`_Incapsula_Resource`, `cf-chl`, “Just a moment”, “Attention Required”) says “The company website served a bot challenge” and is `UNAVAILABLE`. It is not page content, and it is not retried with a browser user agent. NXDOMAIN or ENOTFOUND is “domain does not resolve” and is a failure under what did not check out. |
| RDAP | rdap.org | No company host |
| Sanctions | Full OFAC SDN CSV plus the alternate-names file, cached in `SourceCache`. The cache refreshes on startup when it is missing or older than a day. | An empty cache is `NOT_RUN` and earns 0. The local name Alexei Sanctionhit can still flag that labelled sample. It is not a loaded list. A name match is a hard flag only when the country or a date of birth also lines up. |
| OpenSanctions | api.opensanctions.org | Not checkable for free. HTTP 401 without a paid key is `UNAVAILABLE`. A hard flag, if a list is ever returned, uses the sanctions caps. |
| OpenCorporates | api.opencorporates.com | Not checkable for free. HTTP 401 without a paid token is `UNAVAILABLE`. A company-name hit would be company-exists evidence only. |
| EDGAR | SEC company list and efts.sec.gov full-text search | A 4-letter distinctive token such as “toll” can match. A block or timeout is `UNAVAILABLE`. A response with zero hits is `INCONCLUSIVE`. A company-name hit does not corroborate the person unless a filing also names them. Lookup uses the run's fetch function, so an offline test does not call the network. |
| Courts | CourtListener public search, per result | 401, 403, or no response is `UNAVAILABLE`. A clean no-hit is “no record found in CourtListener federal data” and is not a clearance of all litigation. Its weight is 2. A severe word in a different result is ignored. A full-name hit without the company is “possible match, needs review” and is not a failure. |
| Web | DuckDuckGo HTML, then Bing, then Wikipedia REST, then keyless Wikidata `wbsearchentities` | An empty but reachable results page is `INCONCLUSIVE`. A challenge page is `UNAVAILABLE` and says “not checkable for free”. Under proposal R2 that row leaves the coverage denominator. A footprint taken from the applicant's own site is the same self-reported source as that site. |
| News | Google News RSS, Bing News RSS, and GDELT | Quoted full person name, a company word that is not the applicant's own surname (or the full phrase when every word is generic, as in “related companies”), and company plus city. The given name has to appear before the surname. A surname that only sits inside the company name does not count. Two or more company words have to appear together and in order, so “Starwood Capital” is not “Starwood Property Trust”. A generational suffix (Jr., Sr., II, III, IV) is dropped from the query so the surname is still searched. It is kept in the match: when both sides have a suffix, they have to agree, and a mismatch is inconclusive with a review flag. A hyphen is part of the word, so “turner” does not match “page-turner”. Identical headlines are dropped before they are scored or saved. Items older than five years are dropped. The full name has to appear. A single surname token is not the person. A YouTube, TikTok, or news hit counts only when the name appears with the company or the city. Anything else says “no match found” and is not “returned a public result”. A headline that only repeats the query does not count. “Leaves”, “departs”, “joins X from Y”, “jump to X from Y”, “former”, “ex-”, “to retire”, and “to step down” are an announced departure, not a failure and not a grade cap. A LinkedIn directory URL (`/pub/dir`, `/directory`, `/search`, or the breadcrumb “linkedin.com › pub › dir”) is not evidence. Fraud, sanctions, or a criminal charge tied to the person with the company or city is a failure for review, not an automatic decline. A company-level lawsuit that does not name the applicant is an attention item, not a grade cap. A negative term on the person alone is “possible match, needs review” and is not a failure. A blocked feed is `UNAVAILABLE` and is listed under what could not be checked for free. GDELT waits five seconds between calls and caches a success. |
| LinkedIn and other social pages | Public HTTP with an identifying user agent, not a browser spoof | A block is `UNAVAILABLE` and not checkable for free. A response without the name is `INCONCLUSIVE`. Logged-in pages are not scraped. A company slug may include `&` or a percent-encoded character, as in `/company/cushman-&-wakefield/`. A URL may include a query string or a sub-path. The shape of a URL does not earn points by itself. |
| RDAP | rdap.org on the registrable domain (`www.related.com` is looked up as `related.com`) | A timeout or block is `UNAVAILABLE`. HTTP 404, or DNS NXDOMAIN, is `FAIL`: “domain does not resolve”. `example.com`, `example.net`, `example.org`, and names under `.example`, `.test`, `.invalid`, or `localhost` are `FAIL`: “did not check out”. They earn 0. |
| Address | Local US state code and ZIP-5 range. A full street is sent to the keyless US Census Geocoder (`geocoding.geo.census.gov`) | An invalid state or ZIP, a street number of 0, or a geocoder miss, earns 0 and the line says “address did not check out”. The street number has to be 1 or higher. A geocoder timeout is “not checkable”: not a pass and not a failure. A city and state with no street still earns the 2 location points when the state is real. No USPS or Google key is used. |
| State registry | Keyless Socrata for NY, CT, CO, OR, and PA. Exact normalized company name only | Company-exists evidence. It does not corroborate a person. A portal that does not respond is not checkable for free. NJ, WA, IA, TX, FL, DE, IL, CA, MA, and MD were checked from this server and have no free company-name API. |
| Business card | Local text compare. OCR is installed (tesseract.js). | `NOT_RUN` when nothing was uploaded. `UNAVAILABLE` when an image was uploaded and OCR returned no text. A text match requires the full name and the company, and it is self-reported. |

A file that has not submitted an application is still graded from the referral or request fields. The summary says: “Referral or request only — no application submitted; grade based on request fields only.” The role in that sentence is the role on the request, the same role the list shows.

Manual registry links for states with no free company-name API:

- NJ: https://www.njportal.com/DOR/BusinessNameSearch/
- WA: https://ccfs.sos.wa.gov/
- IA: https://sos.iowa.gov/search/business/search.aspx
- DE: https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx
- FL: https://search.sunbiz.org/Inquiry/CorporationSearch/ByName
- TX: https://mycpa.cpa.state.tx.us/coa/
- NC: https://www.sosnc.gov/online_services/search/by_title/_Business_Registration
- TN: https://sos.tn.gov/business-services/business-search

A location with no manual link says “No manual registry link for this state”. A company name that is not made of real words, such as “Blorptex Qwvzn”, fails the role check and is listed under what did not check out. “Keystone” and “Brambleton” stay readable. Phone area codes use a full NANP table. An area code outside the stated state is inconclusive (“outside the stated state”), not “could not be read”.

Refresh the OFAC cache from **Admin → Verification settings**. The server also refreshes it on startup when the cache is missing or older than a day. Every fetch, including LinkedIn, X, Facebook, Instagram, YouTube, and TikTok, uses `PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)`. Those hosts often block that agent. A block is not checkable for free. A 403 is not retried with a browser user agent.

Transient network failures, HTTP 429, and HTTP 5xx are retried twice with backoff (700ms, then 1400ms, or five seconds for GDELT). HTTP 403 is not retried. NXDOMAIN, HTTP 401, HTTP 405, and a challenge page are not retried.

## What Render cannot check for free

Live QA on the Oregon Render service on 26 Oct 2026, plus the benchmark preflight, showed these sources do not return a usable free result from that host. The user agent stays `PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)`. A block is `UNAVAILABLE` and the summary says it is not checkable for free. It is not scored as a failed company match.

| Source | What Render saw | How the grade treats it |
| --- | --- | --- |
| DuckDuckGo HTML | HTTP 202 or a challenge page | Not checkable for free. Wikipedia REST is tried next, then keyless Wikidata. |
| Bing web search | Often blocked or unusable from the same run, even when a preflight returns 200 | Same fallback. If all four fail, the footprint says web search is not checkable for free. |
| X, Facebook, Instagram | Blocked on the QA files | `UNAVAILABLE`. Not a pass. |
| LinkedIn | Auth wall or no response. `cbre.com` also returns HTTP 403 to this agent | “blocked by site”. Not a failed name match. No browser user-agent is sent. |
| CourtListener | Sometimes times out | `UNAVAILABLE`. A timeout is not “domain does not resolve”. |
| OpenCorporates | HTTP 401 without a paid token | Not checkable for free. Weight 0. |
| OpenSanctions | HTTP 401 without a paid key | Not checkable for free. Weight 0. |

A `QA-TEST ` prefix is removed for search only when the email is `qa-test-*@privatefloorclub.com`. The removal is logged. Any other email keeps the prefix, including in production. The stored company name is not rewritten.

## Notices

`NOTICE_TEST_RECIPIENT` defaults to `rich@privatefloorclub.com`. Every outbound notice is stored in the admin Outbox. When `RESEND_API_KEY` is set, that same notice is emailed only to the test recipient, not to the applicant.
