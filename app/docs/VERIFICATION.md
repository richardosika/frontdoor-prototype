# Verification

The engine recommends. It never approves or declines a member. Richard Osika decides every application.

A run stores a score from 0 to 100, one verdict, and a short summary. The verdict is exactly one of:

- `LEGIT`
- `NOT_LEGIT`
- `NEEDS_OWNER_DECISION`

Members never see the score, the verdict, the checklist, the notes, or the sources. They see “Verified” or “Verification in progress” on a committee file, and a plain membership status on the application page.

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
- What is missing
- `What I could not check for free`

## Jobs

Submitting an application queues an application run and a company run. A new project queues a project run. Pending and running jobs resume on server boot. A failed source is `INCONCLUSIVE` or `NOT_RUN`. It does not fail the whole job.

Test-console samples run with the network off. The strong sample adds three local fixture checks so a `LEGIT` recommendation is visible without outside sites. **Re-run verification** turns the network on and does not add those fixtures. The verdict can change.

Image OCR is not installed. Card images are compared by hand. If card text is supplied to the checker, it scores name and company consistency.

## Free sources

| Check | Source | When it does not run |
| --- | --- | --- |
| Email syntax, disposable list, free provider, role address | Bundled lists | Always local |
| MX | DNS | Skipped on offline passes and disposable domains |
| Website, /about, /team | Public HTTP | No company site and the email is a free provider |
| RDAP | rdap.org | No company host |
| Sanctions | OFAC SDN CSV cached in `SourceCache`, plus the local name Alexei Sanctionhit | Empty cache still has the test overlay |
| EDGAR | efts.sec.gov full-text search | Non-200 response is `NOT_RUN` |
| Courts | CourtListener public search | 401, 403, or no response is `NOT_RUN` |
| Web | DuckDuckGo HTML | Block, captcha, or no response is inconclusive |
| LinkedIn | Public page only | A block is inconclusive. Logged-in pages are not scraped |
| State registry | Deep link only | Always `NOT_RUN` with a manual link for NJ, NY, DE, FL, and TX |
| Business card | Local text compare | `NOT_RUN` when there is no text |

State registry links:

- NJ: https://www.njportal.com/DOR/BusinessNameSearch/
- NY: https://apps.dos.ny.gov/publicInquiry/
- DE: https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx
- FL: https://search.sunbiz.org/Inquiry/CorporationSearch/ByName
- TX: https://mycpa.cpa.state.tx.us/coa/

Refresh the OFAC cache from **Admin → Verification settings**.

## Notices

`NOTICE_TEST_RECIPIENT` defaults to `rich@privatefloorclub.com`. Every outbound notice is stored in the admin Outbox and is not sent to the applicant.
