# Verification benchmark - batch6-live-a

Rubric 2026-10-25. Run started 10/26/2026, 5:11:32 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 60 | Low | NEEDS MORE INFO | 60 NEEDS_OWNER_DECISION | 56.1% / 42.9% | **PASS** |
| B5R02 | real | Sciame Construction / Frank J. Sciame Jr. | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 66 NEEDS_OWNER_DECISION | 62.6% / 53.5% | **PASS** |
| B5R04 | real | Meister Seelig & Schuster / Stephen B. Meister | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 65 NEEDS_OWNER_DECISION | 63.2% / 43.6% | **PASS** FN |
| B5F01 | fake | Batch-5 fake: invented REIT-style lender, nonexistent website and Lin… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |

## Counts

- Cases: 5; PASS 5, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **1** (B5R04)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | F01 | F07b | B5R02 | B5R04 | B5F01 |
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
| plausibility (4) | P | P | P | F | P |
| velocity (4) | P | P | P | P | P |
| social-links (2) | I | I | I | I | I |
| address (2) | P | P | P | P | P |
| mx (6) | P | P | P | P | P |
| website (4) | N | P | P | P | F |
| linkedin-fetch (4) | U | P | P* | P | U |
| screen-x (4) | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U |
| screen-youtube (4) | U | U | U | U | U |
| screen-tiktok (4) | I | I | I | I | I |
| screen-news (4) | I | I | P* | I | I |
| screen-web (4) | I | I | P* | P* | I |
| web-footprint (4) | I | I | P* | P* | I |
| business-registry (8) | I | I | I | P | N |
| edgar (12) | I | P | I | I | I |
| courts (0) | I | P | P | P | U |
| opencorporates (0) | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U |
| news (8) | I | I | I | I | I |
| rdap (4) |  | P | P | P | F |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### F07b - Control 7b: real exec (Larry Silverstein) paired with Toll Brothers + Toll Brothers' real site
- Caps applied: Capped at D: no free source corroborated the person and the company

### B5R02 - Sciame Construction / Frank J. Sciame Jr.
- Ground truth to be confirmed by Richard: Frank Sciame - sciame.com/about (CEO / Chairman); NYC PASSPort vendor 1653540 (Chairman & CEO, 2026-02-03); FEC filing 2026-10-22 (Chairman); title unconfirmed by Richard

### B5R04 - Meister Seelig & Schuster / Stephen B. Meister
- Ground truth to be confirmed by Richard: Stephen Meister - meisterseelig.com/position/co-founder (Co-Founder); firm press release 2026-01-20; rename announced 2026-04-09; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- FLAG plausibility=FAIL review: The company name does not look like real words.
- screen-x=UNAVAILABLE: Searched: "Stephen Meister" "seelig schuster pllc" on X. The company website links https://x.com/MSS_PLLC, and X blocked automated access. Couldn't c…
- screen-facebook=UNAVAILABLE: Searched: "Stephen Meister" "seelig schuster pllc" on Facebook. The company website links https://www.facebook.com/sharer/, and Facebook blocked auto…
- screen-instagram=UNAVAILABLE: Searched: Meister Seelig & Schuster PLLC on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=UNAVAILABLE: Searched: "Stephen Meister" "seelig schuster pllc" on YouTube. YouTube did not include readable video titles. Couldn't check for free. Not checkable …
- screen-tiktok=INCONCLUSIVE: Searched: "Stephen Meister" "seelig schuster pllc" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Stephen Meister" "seelig schuster pllc" / "Meister" "seelig schuster pllc". no match found Name: no. Company: no. City: no. Confidence: no…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company, without a negative term tying them together. Google News, Bing News responded. Unavailable: GDELT.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 1800 |
| SEC company_tickers | 200 | 109 |
| SEC efts (URL as used by edgar.ts) | 200 | 637 |
| DuckDuckGo html | 200 | 613 |
| Bing web | 200 | 169 |
| Google News RSS | 200 | 583 |
| GDELT doc API | 429 | 10337 |
| OFAC sdn.csv (HEAD) | 200 | 9746 |
| rdap.org | 200 | 163 |
| OpenSanctions API (expected 401) | 401 | 318 |
| OpenCorporates API (expected 401) | 401 | 238 |
| DNS MX gmail.com (ok) | 200 | 19 |

UNAVAILABLE counts per check across 5 cases: linkedin-fetch=2, screen-x=5, screen-facebook=5, screen-instagram=5, screen-youtube=5, opencorporates=5, opensanctions=5, courts=1.
