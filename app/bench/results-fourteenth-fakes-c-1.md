# Verification benchmark - fourteenth-fakes-c-1

Rubric 2026-10-25. Run started 10/26/2026, 11:08:40 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B4F01 | fake | Batch-4 fake: invented bridge lender, nonexistent website, personal L… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B8F01 | fake | Fake control: Blorptex Qwvzn Builders LLC | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 42 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B5F01 | fake | Batch-5 fake: invented REIT-style lender, nonexistent website and Lin… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B6F01 | fake | Batch-6 fake: invented capital-partners LLC, nonexistent website and … | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B7F01 | fake | Batch-7 fake: invented capital-holdings LLC, nonexistent website and … | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |

## Counts

- Cases: 5; PASS 5, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B4F01 | B8F01 | B5F01 | B6F01 | B7F01 |
|---|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P |
| role-address (4) | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P |
| business-card (10) | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P |
| plausibility (4) | P | F | P | P | P |
| velocity (4) | P | P | P | P | P |
| social-links (2) | I | I | I | I | I |
| business-registry (8) | N | I | N | I | I |
| address (2) | P | F | P | P | P |
| mx (6) | P | P | P | P | P |
| rdap (4) | F | F | F | F | F |
| website (4) | F | F | F | F | F |
| linkedin-fetch (4) | U | U | U | U | U |
| screen-x (4) | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U |
| screen-youtube (4) | I | I | I | I | I |
| screen-tiktok (4) | I | I | I | I | I |
| screen-news (4) | I | I | I | I | I |
| screen-web (4) | I | I | I | I | I |
| web-footprint (4) | I | I | I | I | I |
| edgar (12) | I | I | I | I | I |
| courts (0) | P | P | P | U | P |
| opencorporates (0) | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U |
| news (8) | I | I | I | I | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 1474 |
| SEC company_tickers | 200 | 200 |
| SEC efts (URL as used by edgar.ts) | 200 | 404 |
| DuckDuckGo html | 200 | 620 |
| Bing web | 200 | 95 |
| Google News RSS | 200 | 508 |
| GDELT doc API | 200 | 16471 |
| OFAC sdn.csv (HEAD) | 200 | 8648 |
| rdap.org | 200 | 232 |
| OpenSanctions API (expected 401) | 401 | 263 |
| OpenCorporates API (expected 401) | 401 | 211 |
| DNS MX gmail.com (ok) | 200 | 21 |

UNAVAILABLE counts per check across 5 cases: linkedin-fetch=5, screen-x=5, screen-facebook=5, screen-instagram=5, opencorporates=5, opensanctions=5, courts=1.
