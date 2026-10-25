# Verification

The engine recommends. It never approves or declines a member. Richard Osika decides every application.

A run stores a score from 0 to 100, one verdict, and a short summary. The verdict is exactly one of:

- `LEGIT`
- `NOT_LEGIT`
- `NEEDS_OWNER_DECISION`

Members never see the score, the verdict, the checklist, the notes, or the sources. They see “Verified” or “Verification in progress” on a verification file, and a plain membership status on the application page.

## Score

Score = round(100 × weight of PASS checks / weight of checks that are not `NOT_RUN`).

`INCONCLUSIVE` and `FAIL` stay in the denominator and earn 0. A thin file cannot look strong. `NOT_RUN` is left out.

## Verdict

Evaluated in this order:

1. Any check with `hardFlag` → `NOT_LEGIT`.
2. Otherwise `LEGIT` only when the score is at least **72**, at least **3** passing checks have `corroborates` and weight of at least **8**, and no check has `reviewFlag` or status `FAIL`.
3. Everything else → `NEEDS_OWNER_DECISION`.

Absence of a sanctions hit is not corroboration. A private email (Gmail and the like) is allowed. An email domain that matches the company is a bonus, not a requirement.

`NOT_LEGIT` is reserved for hard red flags:

- A watchlist name match at or above 0.92 **and** a location token from the list appears in the application location.
- A disposable email domain and no website and no LinkedIn URL.
- Fraud-pattern text: “guaranteed returns” together with wire, seed phrase, send funds, or no risk.
- The email already belongs to a member, or to a declined application.

A possible sanctions match without location corroboration is a review flag, not a hard flag. Common names such as John Smith against a list entry in another country stay on `NEEDS_OWNER_DECISION`.

## Grade

The letter grade is separate from the older 0–100 engine score. It is a recommendation to Richard Osika. Rubric version `2026-10-25`.

Points are fixed and sum to 100. A missing, blocked, or empty source earns 0 and still sits in the possible total, so missing data cannot raise the grade. Email domain and MX earn 0. RDAP earns at most 2.

| Category | Possible | What earns the points |
| --- | --- | --- |
| Identity and contact | 18 | Well-formed email 2, not disposable 4, not a shared inbox 2, phone area code matches 3, LinkedIn link shape 3, public LinkedIn page names the person 4 |
| Company legitimacy | 22 | Website names the person or company 8, EDGAR hit 6, business card matches 4, domain record 2, state registry 2 (always 0; it is not searched for free) |
| Public footprint and reputation | 18 | Web result names person and company 8, headline names both 8, social links are full URLs 2 |
| Risk and sanctions | 20 | Sanctions list clear 8, not a duplicate 6, no fraud-pattern text 4, no application burst 2 |
| Role fit and plausibility | 12 | Name, company, and role readable 8, invite code on file 4 |
| Completeness of application | 10 | Phone 2, location 2, website or LinkedIn 2, track record 2, business card 1, reference 1 |

Letters before caps: A 90–100, B 80–89, C 70–79, D 60–69, F 0–59. Caps only lower the letter.

- No person-and-company corroboration: cannot exceed B.
- Negative headline that is only a name match: cannot exceed C. The file says “possible match, verify” and does not state the headline as fact.
- Disposable email that still has a public page, sanctions name without country or date of birth, or a negative headline or court result that also names the company: cannot exceed D, with a red banner.
- Corroborated sanctions, fraud-pattern text, disposable email with no website or LinkedIn, or a duplicate of a member or a declined applicant: cannot exceed F, with a red banner.
- Two or more conflicting checks: cannot exceed C.

Confidence is separate. High: at least 70% of weighted checks returned pass or fail, and at least 2 sources corroborated the person and the company. Medium: at least 45%, or at least 1 corroborating source. Low: otherwise, and always when nothing corroborated them.

The recommendation is one of APPROVE, APPROVE WITH CONDITIONS, NEEDS MORE INFO, or DECLINE. A hard red flag recommends DECLINE. A doubtful hit, low confidence, or a thin file recommends NEEDS MORE INFO. A paying role is not a clean APPROVE, because annual dues go out only after approval. The grade is stored as JSON on the verification run with the time it was graded. Re-run writes a note of what changed. Richard’s decision log and the admin notice include the grade. Members never see it.

There is no language model on this path. The summary is built from the checks. If a model key is set elsewhere on the site, this file is still not sent to a model.

## Summary

The stored summary text is the executive summary plus a short legacy line. It is not a language model. It always includes:

- The applicant, the company, what checked out, what did not, and what could not be checked
- The letter grade, the recommendation to Richard Osika, and the next step
- `Recommendation: LEGIT`, `Recommendation: NOT LEGIT`, or `Recommendation: NEEDS YOUR DECISION`
- `What I could not check for free`, including any source marked unavailable (blocked, timed out, or errored)

## Jobs

Submitting an application queues an application run and a company run. A new project queues a project run. Pending and running jobs resume on server boot. A source that answers with nothing relevant is `INCONCLUSIVE` (“No data found”). A source that is blocked, times out, or errors is `UNAVAILABLE` and is left out of the score. Neither one fails the job by itself. Each check shows a status chip.

Test-console samples run with the network off. The strong sample adds three local fixture checks so a `LEGIT` recommendation is visible without outside sites. **Re-run verification** turns the network on and does not add those fixtures. The verdict can change. The test console can also create one `is_test` applicant with a name, company, email, and website you type, then queue a live run.

Image OCR is not installed, and this host does not add a WASM OCR package. An uploaded card with no extracted text is `UNAVAILABLE`: the summary says the image could not be checked and an administrator should read the file. If card text is already on the application, the checker scores name and company consistency. No upload is `NOT_RUN`.

## Free sources

| Check | Source | When it does not run |
| --- | --- | --- |
| Email syntax, disposable list, free provider, role address | Bundled lists | Always local |
| MX | DNS | Skipped on offline passes and disposable domains |
| Website, /about, /team | Public HTTP | No company site and the email is a free provider |
| RDAP | rdap.org | No company host |
| Sanctions | Full OFAC SDN CSV plus the alternate-names file, cached in `SourceCache`, plus the local name Alexei Sanctionhit | Empty cache still has the test overlay. A name match is `NOT_LEGIT` only when the country or a date of birth also lines up. |
| EDGAR | efts.sec.gov full-text search | A block or timeout is `UNAVAILABLE`. A response with zero hits is `INCONCLUSIVE`. |
| Courts | CourtListener public search, per result | 401, 403, or no response is `UNAVAILABLE`. A severe word in a different result is ignored. A full-name hit without the company is “possible match, needs review” and is not a failure. |
| Web | DuckDuckGo HTML, then Wikipedia, Wikidata, GDELT, and Bing | A page title that only repeats the query does not count. If every provider is blocked or empty, the check is `UNAVAILABLE`. |
| News | Google News RSS, Bing News RSS, and GDELT | Quoted person name, quoted company name, and company plus city. Items older than five years are dropped. The name has to appear in the headline or snippet. A headline that only repeats the query does not count. A negative term with the company or city in the same item is a failure for review, not an automatic decline. A negative term on the person alone is “possible match, needs review” and is not a failure. A blocked feed is `UNAVAILABLE` and is listed under what could not be checked for free. GDELT waits five seconds between calls and caches a success. |
| LinkedIn | Public page only | A block is `UNAVAILABLE`. A response without the name is `INCONCLUSIVE`. Logged-in pages are not scraped. |
| RDAP | rdap.org on the registrable domain (`www.related.com` is looked up as `related.com`) | A timeout or block is `UNAVAILABLE`. HTTP 404 is “No data found”. |
| State registry | Deep link only | Always `NOT_RUN` with a manual link for NJ, NY, DE, FL, and TX |
| Business card | Local text compare | `NOT_RUN` when nothing was uploaded. `UNAVAILABLE` when an image was uploaded and OCR is not installed. |

State registry links:

- NJ: https://www.njportal.com/DOR/BusinessNameSearch/
- NY: https://apps.dos.ny.gov/publicInquiry/
- DE: https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx
- FL: https://search.sunbiz.org/Inquiry/CorporationSearch/ByName
- TX: https://mycpa.cpa.state.tx.us/coa/

Refresh the OFAC cache from **Admin → Verification settings**.

## Notices

`NOTICE_TEST_RECIPIENT` defaults to `rich@privatefloorclub.com`. Every outbound notice is stored in the admin Outbox. When `RESEND_API_KEY` is set, that same notice is emailed only to the test recipient, not to the applicant.
