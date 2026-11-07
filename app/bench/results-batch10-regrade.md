# Verification benchmark - batch10-regrade

Rubric 2026-10-25. Run started 10/27/2026, 12:30:16 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B10R01 | real | RXR / Scott Rechler | not F/DECLINE; company corroborated where public | C | 76 | Medium | APPROVE WITH CONDITIONS | 68 NEEDS_OWNER_DECISION | 64.1% / 51.2% | **PASS** |
| B10R04 | real | Adam Leitman Bailey, P.C. / Adam Leitman Bailey | not F/DECLINE; company corroborated where public | C | 70 | Medium | NEEDS MORE INFO | 69 NEEDS_OWNER_DECISION | 64.8% / 51.4% | **PASS** |

## Counts

- Cases: 2; PASS 2, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B10R01 | B10R04 |
|---|:-:|:-:|
| email-syntax (5) | P | P |
| email-provider (2) | P | P |
| disposable-email (8) | P | P |
| role-address (4) | P | P |
| phone-state (4) | I | I |
| text-risk (4) | P | P |
| duplicate (8) | P | P |
| sanctions (10) | P | P |
| linkedin-format (4) | I | I |
| business-card (10) | N | N |
| invite-source (6) | P | P |
| plausibility (4) | P | P |
| velocity (4) | P | P |
| social-links (2) | I | I |
| address (2) | P | P |
| mx (6) | P | P |
| rdap (4) | P | P |
| website (4) | P | P |
| linkedin-fetch (4) | P | P |
| screen-x (4) | U | U |
| screen-facebook (4) | I | I |
| screen-instagram (4) | U | U |
| screen-youtube (4) | I | I |
| screen-tiktok (4) | I | I |
| screen-news (8) | P | P |
| screen-web (8) | P* | P |
| web-footprint (8) | P* | I |
| business-registry (8) | P | P |
| edgar (12) | I | I |
| courts (0) | I | I |
| opencorporates (0) | U | U |
| opensanctions (0) | U | U |
| news (8) | I | P* |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B10R04 - Adam Leitman Bailey, P.C. / Adam Leitman Bailey
- Caps applied: Capped at C: fewer than two independent sources tied this person to this company

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 347 |
| SEC company_tickers | 200 | 130 |
| SEC efts (URL as used by edgar.ts) | 200 | 872 |
| DuckDuckGo html | 200 | 294 |
| Bing web | 200 | 101 |
| Google News RSS | 200 | 521 |
| GDELT doc API | 0 | 10072 |
| OFAC sdn.csv (HEAD) | 200 | 8701 |
| rdap.org | 200 | 152 |
| OpenSanctions API (expected 401) | 401 | 310 |
| OpenCorporates API (expected 401) | 401 | 525 |
| DNS MX gmail.com (ok) | 200 | 17 |

UNAVAILABLE counts per check across 2 cases: screen-x=2, screen-instagram=2, opencorporates=2, opensanctions=2.
