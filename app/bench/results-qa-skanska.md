# Verification benchmark - qa-skanska

Rubric 2026-10-25. Run started 10/27/2026, 9:34:55 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| QASKA | real | Skanska USA / Richard Kennedy (usa.skanska.com redirect) | not F/DECLINE; company corroborated where public | C | 71 | High | APPROVE WITH CONDITIONS | 76 LEGIT | 71.9% / 62.8% | **PASS** |

## Counts

- Cases: 1; PASS 1, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | QASKA |
|---|:-:|
| email-syntax (5) | P |
| email-provider (2) | P |
| disposable-email (8) | P |
| role-address (4) | P |
| phone-state (4) | I |
| text-risk (4) | P |
| duplicate (8) | P |
| sanctions (10) | P |
| linkedin-format (4) | P |
| business-card (10) | N |
| invite-source (6) | P |
| plausibility (4) | P |
| velocity (4) | P |
| social-links (2) | I |
| address (2) | P |
| mx (6) | P |
| rdap (4) | P |
| website (4) | U |
| linkedin-fetch (4) | P |
| screen-x (4) | U |
| screen-facebook (4) | U |
| screen-instagram (4) | U |
| screen-youtube (8) | P* |
| screen-tiktok (4) | I |
| screen-news (8) | P |
| screen-web (8) | P* |
| web-footprint (8) | P* |
| business-registry (8) | P |
| edgar (12) | I |
| courts (0) | U |
| opencorporates (0) | U |
| opensanctions (0) | U |
| news (8) | P* |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### QASKA - Skanska USA / Richard Kennedy (usa.skanska.com redirect)
- Ground truth to be confirmed by Richard: Richard Kennedy - skanska.com/us/en leadership; the application site is the usa.skanska.com host that redirects; title unconfirmed by Richard

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 2329 |
| SEC company_tickers | 200 | 65 |
| SEC efts (URL as used by edgar.ts) | 200 | 1248 |
| DuckDuckGo html | 200 | 633 |
| Bing web | 200 | 144 |
| Google News RSS | 200 | 547 |
| GDELT doc API | 429 | 10854 |
| OFAC sdn.csv (HEAD) | 200 | 10730 |
| rdap.org | 200 | 149 |
| OpenSanctions API (expected 401) | 401 | 317 |
| OpenCorporates API (expected 401) | 401 | 254 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 1 cases: website=1, screen-x=1, screen-facebook=1, screen-instagram=1, courts=1, opencorporates=1, opensanctions=1.
