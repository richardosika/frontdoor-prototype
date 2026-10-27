# Verification benchmark - fifteenth-batch4-rest

Rubric 2026-10-25. Run started 10/27/2026, 1:56:12 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B4R01 | real | The Durst Organization / Douglas Durst | not F/DECLINE; company corroborated where public | C | 79 | High | APPROVE WITH CONDITIONS | 75 NEEDS_OWNER_DECISION | 70.6% / 59% | **PASS** |
| B4R02 | real | Tutor Perini Corporation / Ronald Tutor | not F/DECLINE; company corroborated where public | C | 75 | Medium | APPROVE WITH CONDITIONS | 72 NEEDS_OWNER_DECISION | 63.9% / 54.3% | **PASS** |
| B4R03 | real | Newmark Group / Barry Gosin | not F/DECLINE; company corroborated where public | C | 75 | Medium | APPROVE WITH CONDITIONS | 76 NEEDS_OWNER_DECISION | 71.3% / 70.7% | **PASS** |
| B4R04 | real | Belkin Burden Goldman LLP / Sherwin Belkin | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 56 NEEDS_OWNER_DECISION | 52.2% / 29.7% | **PASS** FN |
| B4F01 | fake | Batch-4 fake: invented bridge lender, nonexistent website, personal L… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |

## Counts

- Cases: 5; PASS 5, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **1** (B4R04)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B4R01 | B4R02 | B4R03 | B4R04 | B4F01 |
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
| plausibility (4) | P | P | P | P | P |
| velocity (4) | P | P | P | P | P |
| social-links (2) | I | I | I | I | I |
| address (2) | P | P | P | P | P |
| mx (6) | P | P | P | P | P |
| rdap (4) | P | P | P | P | F |
| website (4) | P | P | U | P | F |
| linkedin-fetch (4) | P | P | P | P* | U |
| screen-x (4) | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U |
| screen-youtube (8) | P* | I | P* | I | I |
| screen-tiktok (4) | I | I | I | I | I |
| screen-news (8) | P | I | P | I | I |
| screen-web (4) | P | I | P* | U | U |
| web-footprint (4) | I | I | I | I | U |
| business-registry (8) | P | N | I | I | N |
| edgar (12) | I | P* | P* | I | I |
| courts (0) | P | P | P | P | P |
| opencorporates (0) | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U |
| news (8) | P* | P* | P* | I | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B4R01 - The Durst Organization / Douglas Durst
- Ground truth to be confirmed by Richard: Douglas Durst - https://www.durst.org/about/executives/douglas-durst (Chairman); durst.org news / Commercial Observer Power 100 2026-05-08. LinkedIn slug thedurstorg confirmed via search.; title unconfirmed by Richard

### B4R02 - Tutor Perini Corporation / Ronald Tutor
- Ground truth to be confirmed by Richard: Ronald Tutor - https://www.tutorperini.com/about/leadership/ (Executive Chairman since Jan 2025; NOT CEO - Gary Smalley CEO since 2025-01-01); DEF 14A 2026-04-09: Executive Chairman through 2026-12-31; SEC filer TUTOR PERINI CORP CIK 77543. LinkedIn slug tutor-perini-corporation confirmed via search.; title unconfirmed by Richard

### B4R03 - Newmark Group / Barry Gosin
- Ground truth to be confirmed by Richard: Barry Gosin - https://www.nmrk.com/people/barry-m-gosin (CEO); Newmark press release 2026-08-07: steps down as CEO 2026-12-31, stays Chairman of Newmark & Co.; SEC filer Newmark Group, Inc. CIK 1690680. LinkedIn slug nmrk-cre confirmed via search.; title unconfirmed by Richard

### B4R04 - Belkin Burden Goldman LLP / Sherwin Belkin
- Ground truth to be confirmed by Richard: Sherwin Belkin - https://bbgllp.com/attorney/sherwin-belkin/ (founding Partner). Note: announced retirement effective 2026-10-31 (his LinkedIn post 2026-05-21; The Real Deal 2026-05-22) - current today, stale in 5 days. Site URL: canonical is https://bbgllp.com (www.bbgllp.com also exists; both 403 to curl on this box). LinkedIn slug belkin-burden-goldman-llp confirmed via search.; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Sherwin Belkin" "burden goldman" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Sherwin Belkin" "burden goldman" on Facebook. The company website links https://www.facebook.com/BelkinBurden/, and Facebook blocked autom…
- screen-instagram=UNAVAILABLE: Searched: Belkin Burden Goldman LLP on Instagram. The company website links https://www.instagram.com/bbg_llp/, and Instagram blocked automated acces…
- screen-youtube=INCONCLUSIVE: Searched: "Sherwin Belkin" "burden goldman" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Sherwin Belkin" "burden goldman" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Sherwin Belkin" "burden goldman" / "Belkin" "burden goldman". name found, company not named. Sherwin Belkin, prominent New York landlord-s…
- FLAG screen-news=INCONCLUSIVE review: Searched: "Sherwin Belkin" "burden goldman" / "Belkin" "burden goldman". name found, company not named. Sherwin Belkin, prominent New York landlord-s…
- screen-web=UNAVAILABLE: Searched: "Sherwin Belkin" "Belkin Burden Goldman LLP" "New York". DuckDuckGo returned a challenge page and is not checkable for free. Couldn't check…
- web-footprint=INCONCLUSIVE: Searched: "Sherwin Belkin" "Belkin Burden Goldman LLP" "New York". same source as linkedin-fetch Name: no. Company: no. City: no. Confidence: none.
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company, without a negative term tying them together. Google News, Bing News responded. Unavailable: GDELT.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 0 | 30004 |
| SEC company_tickers | 200 | 146 |
| SEC efts (URL as used by edgar.ts) | 200 | 491 |
| DuckDuckGo html | 202 | 139 |
| Bing web | 200 | 101 |
| Google News RSS | 200 | 521 |
| GDELT doc API | 200 | 11269 |
| OFAC sdn.csv (HEAD) | 200 | 9712 |
| rdap.org | 200 | 254 |
| OpenSanctions API (expected 401) | 401 | 212 |
| OpenCorporates API (expected 401) | 401 | 484 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 5 cases: screen-x=5, screen-facebook=5, screen-instagram=5, opencorporates=5, opensanctions=5, website=1, screen-web=2, linkedin-fetch=1, web-footprint=1.
