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

## Summary

The summary is a template. It is not a language model. It always includes:

- `Recommendation: LEGIT`, `Recommendation: NOT LEGIT`, or `Recommendation: NEEDS YOUR DECISION`
- The strongest support
- The strongest concern
- `No data found` for sources that responded without a match
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

`NOTICE_TEST_RECIPIENT` defaults to `rich@privatefloorclub.com`. Every outbound notice is stored in the admin Outbox. When `SMTP_URL` is set, that same notice is emailed only to the test recipient, not to the applicant.
