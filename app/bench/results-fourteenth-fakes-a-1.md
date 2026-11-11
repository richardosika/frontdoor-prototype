# Verification benchmark - fourteenth-fakes-a-1

Rubric 2026-10-25. Run started 10/26/2026, 10:52:23 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F02 | fake | Control 2: invented firm, mailinator, no site/LinkedIn | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 36 NOT_LEGIT | 43.7% / 0% | **PASS** |
| F03a | fake | Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no s… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F03b | fake | Control 3b: impersonation - made-up person + 'Prologis' + the REAL pr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 50 | Low | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 48 NEEDS_OWNER_DECISION | 44.4% / 15.2% | **PASS** |
| F04b | fake | Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-co… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 59 | Low | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 51% / 15.2% | **PASS** |
| F05 | fake | Control 5: fraud text with invented firm | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 41 NOT_LEGIT | 44.7% / 9.1% | **PASS** |

## Counts

- Cases: 7; PASS 7, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | F01 | F02 | F03a | F03b | F04 | F04b | F05 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P |
| disposable-email (8) | P | F! | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | P | I |
| text-risk (4) | P | P | P | P | P | P | F! |
| duplicate (8) | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P |
| linkedin-format (4) | I | I | I | P | I | P | I |
| business-card (10) | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | P | I |
| address (2) | P | P | P | P | P | P | P |
| mx (6) | P | N | P | P | P | P | P |
| website (4) | N | N | N | U | P | P | N |
| linkedin-fetch (4) | U | U | U | P | U | U | U |
| screen-x (4) | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U |
| screen-youtube (4) | I | I | I | I | I | I | I |
| screen-tiktok (4) | I | I | I | I | I | I | I |
| screen-news (4) | I | I | I | I | I | I | I |
| screen-web (4) | I | I | I | I | I | I | I |
| web-footprint (4) | I | I | I | I | I | I | I |
| business-registry (8) | I | I | N | N | I | I | I |
| edgar (12) | I | I | I | I | I | I | I |
| courts (0) | I | U | P | P | P | P | P |
| opencorporates (0) | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U |
| news (8) | I | I | I | I | I | I | I |
| rdap (4) |  |  |  | P |  |  |  |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### F02 - Control 2: invented firm, mailinator, no site/LinkedIn
- Caps applied: Capped at F: The email domain is disposable (Bundled disposable-domain list).

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:40179/F04/

### F04b - Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-code phone, and a social URL - tests how close a cosmetic fake gets to grade C
- Self-hosted fixture page at http://127.0.0.1:40179/F04b/

### F05 - Control 5: fraud text with invented firm
- Caps applied: Capped at F: The write-up matches a fraud pattern: guaranteed returns together with a request to send funds (Local text heuristic).

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 1596 |
| SEC company_tickers | 200 | 107 |
| SEC efts (URL as used by edgar.ts) | 200 | 502 |
| DuckDuckGo html | 200 | 599 |
| Bing web | 200 | 202 |
| Google News RSS | 200 | 563 |
| GDELT doc API | 429 | 8084 |
| OFAC sdn.csv (HEAD) | 200 | 8717 |
| rdap.org | 200 | 132 |
| OpenSanctions API (expected 401) | 401 | 362 |
| OpenCorporates API (expected 401) | 401 | 637 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 7 cases: linkedin-fetch=6, screen-x=7, screen-facebook=7, screen-instagram=7, opencorporates=7, opensanctions=7, courts=1, website=1.
