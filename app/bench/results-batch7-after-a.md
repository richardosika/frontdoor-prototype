# Verification benchmark - batch7-after-a

Rubric 2026-10-25. Run started 10/26/2026, 6:03:57 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 60 | Low | NEEDS MORE INFO | 60 NEEDS_OWNER_DECISION | 56.1% / 42.9% | **PASS** |
| B4R05 | real | Starwood Property Trust / Barry Sternlicht | not F/DECLINE; company corroborated where public | D | 67 | Medium | NEEDS MORE INFO | 72 NEEDS_OWNER_DECISION | 63.9% / 54.3% | **PASS** FN |
| B5R02 | real | Sciame Construction / Frank J. Sciame Jr. | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 66 NEEDS_OWNER_DECISION | 62.6% / 53.5% | **PASS** |
| B5R03 | real | BK Real Estate Advisors / Bob Knakal | not F/DECLINE; company corroborated where public | C | 77 | Medium | APPROVE WITH CONDITIONS | 70 NEEDS_OWNER_DECISION | 65.6% / 48.7% | **PASS** |

## Counts

- Cases: 5; PASS 5, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **1** (B4R05)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | F01 | F07b | B4R05 | B5R02 | B5R03 |
|---|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P |
| role-address (4) | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P |
| linkedin-format (4) | I | I | P | P | P |
| business-card (10) | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P |
| velocity (4) | P | P | P | P | P |
| social-links (2) | I | I | I | I | I |
| address (2) | P | P | P | P | P |
| mx (6) | P | P | P | P | P |
| website (4) | N | P | I | P | P |
| linkedin-fetch (4) | U | P | P | P* | I |
| screen-x (4) | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U |
| screen-youtube (4) | U | U | U | U | I |
| screen-tiktok (4) | I | I | I | I | I |
| screen-news (4) | I | I | I | P | I |
| screen-web (4) | I | I | P | P* | P* |
| web-footprint (4) | I | I | I | P* | P* |
| business-registry (8) | I | I | N | I | P |
| edgar (12) | I | P | P* | I | I |
| courts (0) | I | P | P | P | P |
| opencorporates (0) | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U |
| news (8) | I | I | P* | I | P* |
| rdap (4) |  | P | P | P | P |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### F07b - Control 7b: real exec (Larry Silverstein) paired with Toll Brothers + Toll Brothers' real site
- Caps applied: Capped at D: no free source corroborated the person and the company

### B4R05 - Starwood Property Trust / Barry Sternlicht
- Ground truth to be confirmed by Richard: Barry Sternlicht - https://www.starwoodpropertytrust.com/team/ (Chairman & CEO); DEF 14A 2026-03-13; 8-K 2026-04-24 re-elected director; SEC filer STARWOOD PROPERTY TRUST, INC. CIK 1465128. LinkedIn slug starwoodproperty confirmed via search.; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- website=INCONCLUSIVE: Searched: https://www.starwoodpropertytrust.com. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence…
- screen-x=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Starwood Property Trust on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on YouTube. YouTube did not include readable video titles. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: "Barry Sternlicht" "starwood" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Barry Sternlicht" "starwood" / "Sternlicht" "starwood". Found: Starwood's Barry Sternlicht on U.S. tariff policy: 'Uncertainty is bad for …
- web-footprint=INCONCLUSIVE: Searched: "Barry Sternlicht" "Starwood Property Trust" "Miami Beach". No result found that names this person and this company. Name: no. Company: no.…

### B5R02 - Sciame Construction / Frank J. Sciame Jr.
- Ground truth to be confirmed by Richard: Frank Sciame - sciame.com/about (CEO / Chairman); NYC PASSPort vendor 1653540 (Chairman & CEO, 2026-02-03); FEC filing 2026-10-22 (Chairman); title unconfirmed by Richard

### B5R03 - BK Real Estate Advisors / Bob Knakal
- Ground truth to be confirmed by Richard: Bob Knakal - bkrea.com/about/bob-knakal (Chairman & CEO); Commercial Observer Power 100 2026 #76; title unconfirmed by Richard

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 1748 |
| SEC company_tickers | 200 | 74 |
| SEC efts (URL as used by edgar.ts) | 200 | 403 |
| DuckDuckGo html | 200 | 591 |
| Bing web | 200 | 88 |
| Google News RSS | 200 | 483 |
| GDELT doc API | 0 | 10489 |
| OFAC sdn.csv (HEAD) | 200 | 9732 |
| rdap.org | 200 | 177 |
| OpenSanctions API (expected 401) | 401 | 385 |
| OpenCorporates API (expected 401) | 401 | 600 |
| DNS MX gmail.com (ok) | 200 | 20 |

UNAVAILABLE counts per check across 5 cases: linkedin-fetch=1, screen-x=5, screen-facebook=5, screen-instagram=5, screen-youtube=4, opencorporates=5, opensanctions=5.
