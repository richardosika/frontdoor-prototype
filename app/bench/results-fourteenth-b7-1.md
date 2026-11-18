# Verification benchmark - fourteenth-b7-1

Rubric 2026-10-25. Run started 10/26/2026, 10:47:19 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B7R01 | real | Vornado Realty Trust / Steven Roth | not F/DECLINE; company corroborated where public | B | 85 | High | APPROVE WITH CONDITIONS | 86 NEEDS_OWNER_DECISION | 81.3% / 81.4% | **PASS** |
| B7R02 | real | Skanska USA / Richard Kennedy | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 73 NEEDS_OWNER_DECISION | 68.1% / 53.8% | **PASS** |
| B7R03 | real | Avison Young / James Nelson | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 64 NEEDS_OWNER_DECISION | 59.7% / 45.9% | **PASS** |

## Counts

- Cases: 3; PASS 3, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B7R01 | B7R02 | B7R03 |
|---|:-:|:-:|:-:|
| email-syntax (5) | P | P | P |
| email-provider (2) | P | P | P |
| disposable-email (8) | P | P | P |
| role-address (4) | P | P | P |
| phone-state (4) | I | I | I |
| text-risk (4) | P | P | P |
| duplicate (8) | P | P | P |
| sanctions (10) | P | P | P |
| linkedin-format (4) | P | P | P |
| business-card (10) | N | N | N |
| invite-source (6) | P | P | P |
| plausibility (4) | P | P | P |
| velocity (4) | P | P | P |
| social-links (2) | I | I | I |
| address (2) | P | P | P |
| mx (6) | P | P | P |
| rdap (4) | P | P | U |
| website (4) | P | U | P |
| linkedin-fetch (4) | P | P | P |
| screen-x (4) | U | U | U |
| screen-facebook (4) | U | U | U |
| screen-instagram (4) | U | U | U |
| screen-youtube (8) | P* | P* | P* |
| screen-tiktok (4) | I | I | I |
| screen-news (8) | P | P | I |
| screen-web (8) | P* | P | P |
| web-footprint (8) | P* | I | I |
| business-registry (8) | P | P | I |
| edgar (12) | P* | I | I |
| courts (0) | U | U | U |
| opencorporates (0) | U | U | U |
| opensanctions (0) | U | U | U |
| news (8) | P* | P* | P* |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B7R01 - Vornado Realty Trust / Steven Roth
- Ground truth to be confirmed by Richard: Steven Roth - vno.com/governance/executive-management (Chairman of the Board and CEO); SEC DEF 14A 2026-04-07; SEC 10-Q exhibit 31.1 signed 2026-08-03 as Chairman and CEO; title unconfirmed by Richard

### B7R02 - Skanska USA / Richard Kennedy
- Ground truth to be confirmed by Richard: Richard Kennedy - skanska.com/us/en/about-us/skanska-in-the-u.s/quick-facts (President and CEO Skanska USA); skanska.com group management page (EVP Skanska AB, Group Leadership Team); title unconfirmed by Richard

### B7R03 - Avison Young / James Nelson
- Ground truth to be confirmed by Richard: James Nelson - avisonyoung.us/w/james-nelson (Principal, Head of U.S. Investment Sales); Avison Young press release 2025-03-12; CoStar 2026-02-17; title unconfirmed by Richard

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 1338 |
| SEC company_tickers | 200 | 197 |
| SEC efts (URL as used by edgar.ts) | 200 | 442 |
| DuckDuckGo html | 200 | 585 |
| Bing web | 200 | 99 |
| Google News RSS | 200 | 481 |
| GDELT doc API | 429 | 10432 |
| OFAC sdn.csv (HEAD) | 200 | 8709 |
| rdap.org | 200 | 163 |
| OpenSanctions API (expected 401) | 401 | 249 |
| OpenCorporates API (expected 401) | 401 | 518 |
| DNS MX gmail.com (ok) | 200 | 19 |

UNAVAILABLE counts per check across 3 cases: screen-x=3, screen-facebook=3, screen-instagram=3, courts=3, opencorporates=3, opensanctions=3, website=1, rdap=1.
