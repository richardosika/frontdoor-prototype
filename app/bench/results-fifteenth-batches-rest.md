# Verification benchmark - fifteenth-batches-rest

Rubric 2026-10-25. Run started 10/27/2026, 2:06:46 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B5R01 | real | Douglaston Development / Jeffrey Levine | not F/DECLINE; company corroborated where public | C | 77 | Medium | APPROVE WITH CONDITIONS | 70 NEEDS_OWNER_DECISION | 65.6% / 48.7% | **PASS** |
| B5R03 | real | BK Real Estate Advisors / Bob Knakal | not F/DECLINE; company corroborated where public | C | 77 | Medium | APPROVE WITH CONDITIONS | 70 NEEDS_OWNER_DECISION | 65.6% / 48.7% | **PASS** |
| B5F01 | fake | Batch-5 fake: invented REIT-style lender, nonexistent website and Lin… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B6R03 | real | Ackman-Ziff Real Estate Group / Simon Ziff | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 65 NEEDS_OWNER_DECISION | 60.7% / 48.7% | **PASS** |
| B6F01 | fake | Batch-6 fake: invented capital-partners LLC, nonexistent website and … | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B7R05 | real | Mack Real Estate Group / Richard Mack | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 59 NEEDS_OWNER_DECISION | 55.8% / 38.5% | **PASS** |
| B7F01 | fake | Batch-7 fake: invented capital-holdings LLC, nonexistent website and … | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |

## Counts

- Cases: 7; PASS 7, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B5R01 | B5R03 | B5F01 | B6R03 | B6F01 | B7R05 | B7F01 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P | P | P |
| business-card (10) | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I |
| address (2) | P | P | P | P | P | P | P |
| mx (6) | P | P | P | P | P | P | P |
| rdap (4) | P | P | F | P | F | P | F |
| website (4) | P | P | F | P | F | P | F |
| linkedin-fetch (4) | I | I | U | P* | U | P* | U |
| screen-x (4) | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U |
| screen-youtube (8) | P* | I | I | I | I | P* | I |
| screen-tiktok (4) | I | I | I | I | I | I | I |
| screen-news (8) | P | I | I | P | I | I | I |
| screen-web (4) | U | P* | U | U | U | U | U |
| web-footprint (4) | I | P* | U | I | U | I | U |
| business-registry (8) | P | P | N | I | I | I | I |
| edgar (12) | I | I | I | I | I | I | I |
| courts (0) | P | P | P | P | P | I | P |
| opencorporates (0) | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U |
| news (8) | P* | P* | I | P* | I | I | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B5R01 - Douglaston Development / Jeffrey Levine
- Ground truth to be confirmed by Richard: Jeffrey Levine - douglastondevelopment.com/about/executive-and-senior-management-team (Founder & Chairman); Commercial Observer Power 100 2026-05-08; ENR 2026-03-23; title unconfirmed by Richard

### B5R03 - BK Real Estate Advisors / Bob Knakal
- Ground truth to be confirmed by Richard: Bob Knakal - bkrea.com/about/bob-knakal (Chairman & CEO); Commercial Observer Power 100 2026 #76; title unconfirmed by Richard

### B6R03 - Ackman-Ziff Real Estate Group / Simon Ziff
- Ground truth to be confirmed by Richard: Simon Ziff - ackmanziff.com/company (President since 1995); The Real Deal 2026-01-08; Commercial Observer 2026-04-30; title unconfirmed by Richard

### B7R05 - Mack Real Estate Group / Richard Mack
- Ground truth to be confirmed by Richard: Richard Mack - Business Wire 2026-07-15 ('Richard Mack, CEO of MREG'); clarosmortgage.com board page (CEO of MREG and MRECS; Chairman & CEO of Claros Mortgage Trust); mackregroup.com/about (co-founder); title unconfirmed by Richard

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 2200 |
| SEC company_tickers | 200 | 125 |
| SEC efts (URL as used by edgar.ts) | 200 | 307 |
| DuckDuckGo html | 202 | 175 |
| Bing web | 200 | 108 |
| Google News RSS | 200 | 468 |
| GDELT doc API | 429 | 11311 |
| OFAC sdn.csv (HEAD) | 200 | 8662 |
| rdap.org | 200 | 162 |
| OpenSanctions API (expected 401) | 401 | 328 |
| OpenCorporates API (expected 401) | 401 | 740 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 7 cases: screen-x=7, screen-facebook=7, screen-instagram=7, screen-web=6, opencorporates=7, opensanctions=7, linkedin-fetch=3, web-footprint=3.
