# Verification benchmark - qa-oct27

Rubric 2026-10-25. Run started 10/27/2026, 9:16:42 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | real (company only) | Prologis (company only) | not F/DECLINE; company-only corroboration | C | 72 | Medium | APPROVE WITH CONDITIONS | 71 NEEDS_OWNER_DECISION | 63.2% / 53.8% | **PASS** |
| R05 | real | Hines / Jeff Hines | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 63 NEEDS_OWNER_DECISION | 55.8% / 38.5% | **PASS** FN |
| QAJLL | real | Jones Lang LaSalle / Christian Ulbrich | not F/DECLINE; company corroborated where public | B | 80 | Medium | APPROVE WITH CONDITIONS | 71 NEEDS_OWNER_DECISION | 63.2% / 53.8% | **PASS** |
| QATURN | real | Turner Construction / Peter Davoren | not F/DECLINE; company corroborated where public | D | 69 | Medium | NEEDS MORE INFO | 62 NEEDS_OWNER_DECISION | 58.3% / 43.6% | **PASS** FN |
| QASKA | real | Skanska USA / Richard Kennedy (usa.skanska.com redirect) | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 73 LEGIT | 68.9% / 56.1% | **PASS** |
| QAMM | real | Marcus & Millichap / Hessam Nadji | not F/DECLINE; company corroborated where public | B | 80 | Medium | APPROVE WITH CONDITIONS | 74 NEEDS_OWNER_DECISION | 65.6% / 59% | **PASS** |
| QAF01 | fake | Gibberish company, 0 Nowhere Lane, unregistered domain | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 32 | Low | NEEDS MORE INFO | 39 NEEDS_OWNER_DECISION | 45.8% / 20% | **PASS** |

## Counts

- Cases: 7; PASS 7, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **2** (R05, QATURN)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | R01 | R05 | QAJLL | QATURN | QASKA | QAMM | QAF01 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P | P | I |
| business-card (10) | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | F |
| velocity (4) | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I |
| business-registry (8) | N | N | N | I | P | N | I |
| address (2) | P | P | P | P | P | P | F |
| mx (6) | P | P | P | P | P | P | P |
| rdap (4) | P | P | P | P | P | P | F |
| website (4) | U | U | P | P | U | P | F |
| linkedin-fetch (4) | P | P* | P | P | P | P | U |
| screen-x (4) | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | I | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U |
| screen-youtube (8) | P* | P* | P* | I | I | P* | I |
| screen-tiktok (4) | I | I | I | I | I | I | I |
| screen-news (8) | P | I | P | I | P | P | I |
| screen-web (4) | P | P | I | P* | P* | P | I |
| web-footprint (4) | I | I | I | P* | P* | I | I |
| edgar (12) | I | I | I | I | I | I | I |
| courts (0) | P | I | P | P | I | U | U |
| opencorporates (0) | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U |
| news (8) | P* | I | P* | I | P* | P* | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### R01 - Prologis (company only)
- Ground truth to be confirmed by Richard: Hamid Moghadam - assumed Prologis co-founder/executive; unverified

### R05 - Hines / Jeff Hines
- Ground truth to be confirmed by Richard: Jeff Hines - assumed Hines executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.hines.com. blocked the check (403). blocked by site (403) — not checkable for free; ask applicant for a team-page URL Couldn't …
- screen-x=UNAVAILABLE: Searched: "Jeff Hines" "hines" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jeff Hines" "hines" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Hines on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: "Jeff Hines" "hines" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jeff Hines" "hines" / "Hines" "hines". Found: Hines Announces Next Generation Leadership to Build on Global Real Assets Momentum - Hines N…
- web-footprint=INCONCLUSIVE: Searched: "Jeff Hines" "Hines" "Houston". same source as linkedin-fetch Name: no. Company: no. City: no. Confidence: none.
- edgar=INCONCLUSIVE: EDGAR lists HINES GLOBAL INCOME TRUST, INC. (HGIT). That is a partial name match for a different firm, not the company on the application. It is inco…
- FLAG edgar=INCONCLUSIVE review: EDGAR lists HINES GLOBAL INCOME TRUST, INC. (HGIT). That is a partial name match for a different firm, not the company on the application. It is inco…
- news=INCONCLUSIVE: A headline names the person or the company. Hines Private Wealth Solutions Completes Record $591 Million Delaware Statutory Trust Offering Google New…

### QAJLL - Jones Lang LaSalle / Christian Ulbrich
- Ground truth to be confirmed by Richard: Christian Ulbrich - jll.com leadership pages name him as Chief Executive Officer; title unconfirmed by Richard

### QATURN - Turner Construction / Peter Davoren
- Ground truth to be confirmed by Richard: Peter Davoren - turnerconstruction.com leadership names him as Chairman and CEO; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Peter Davoren" "turner" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Peter Davoren" "turner" on Facebook. The company website links https://www.facebook.com/turnerconstruction, and Facebook blocked automated…
- screen-instagram=UNAVAILABLE: Searched: Turner Construction on Instagram. The company website links https://www.instagram.com/turnerconstructioncompany/, and Instagram blocked aut…
- screen-youtube=INCONCLUSIVE: Searched: "Peter Davoren" "turner" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Peter Davoren" "turner" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Peter Davoren" "turner" / "Davoren" "turner" / "Peter Davoren" "turnerconstruction". Found: Turner Construction Leaders, Founders, and Exe…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company. Turner Tops Out Hudson Valley Community College's Applied Technology Education Center Google News, Bing N…

### QASKA - Skanska USA / Richard Kennedy (usa.skanska.com redirect)
- Ground truth to be confirmed by Richard: Richard Kennedy - skanska.com/us/en leadership; the application site is the usa.skanska.com host that redirects; title unconfirmed by Richard

### QAMM - Marcus & Millichap / Hessam Nadji
- Ground truth to be confirmed by Richard: Hessam Nadji - marcusmillichap.com names him as President and Chief Executive Officer; title unconfirmed by Richard

### QAF01 - Gibberish company, 0 Nowhere Lane, unregistered domain
- Ground truth to be confirmed by Richard: Invented. The company name is gibberish, the street number is 0, and the domain is not registered.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 3188 |
| SEC company_tickers | 200 | 117 |
| SEC efts (URL as used by edgar.ts) | 200 | 1636 |
| DuckDuckGo html | 200 | 596 |
| Bing web | 200 | 85 |
| Google News RSS | 200 | 448 |
| GDELT doc API | 429 | 12324 |
| OFAC sdn.csv (HEAD) | 200 | 13407 |
| rdap.org | 200 | 277 |
| OpenSanctions API (expected 401) | 401 | 309 |
| OpenCorporates API (expected 401) | 401 | 636 |
| DNS MX gmail.com (ok) | 200 | 17 |

UNAVAILABLE counts per check across 7 cases: website=3, screen-x=7, screen-facebook=6, screen-instagram=7, opencorporates=7, opensanctions=7, courts=2, linkedin-fetch=1.
