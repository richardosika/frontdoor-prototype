# Verification benchmark - fifteenth-priority-a-2

Rubric 2026-10-25. Run started 10/27/2026, 2:39:16 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B4R05 | real | Starwood Property Trust / Barry Sternlicht | not F/DECLINE; company corroborated where public | D | 67 | Medium | NEEDS MORE INFO | 70 NEEDS_OWNER_DECISION | 62.3% / 51.4% | **PASS** FN |
| B5R02 | real | Sciame Construction / Frank J. Sciame Jr. | not F/DECLINE; company corroborated where public | C | 79 | Medium | APPROVE WITH CONDITIONS | 70 NEEDS_OWNER_DECISION | 65.7% / 60% | **PASS** |
| B5R04 | real | Meister Seelig & Schuster / Stephen B. Meister | not F/DECLINE; company corroborated where public | C | 71 | Medium | NEEDS MORE INFO | 66 NEEDS_OWNER_DECISION | 62.3% / 40.5% | **PASS** |
| B5R05 | real | Arbor Realty Trust / Ivan Kaufman | not F/DECLINE; company corroborated where public | D | 67 | Medium | NEEDS MORE INFO | 66 NEEDS_OWNER_DECISION | 61.3% / 48.6% | **PASS** FN |

## Counts

- Cases: 4; PASS 4, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **2** (B4R05, B5R05)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B4R05 | B5R02 | B5R04 | B5R05 |
|---|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P |
| email-provider (2) | P | P | P | P |
| disposable-email (8) | P | P | P | P |
| role-address (4) | P | P | P | P |
| phone-state (4) | I | I | I | I |
| text-risk (4) | P | P | P | P |
| duplicate (8) | P | P | P | P |
| sanctions (10) | P | P | P | P |
| linkedin-format (4) | P | P | P | P |
| business-card (10) | N | N | N | N |
| invite-source (6) | P | P | P | P |
| plausibility (4) | P | P | P | P |
| velocity (4) | P | P | P | P |
| social-links (2) | I | I | I | I |
| business-registry (8) | N | I | P | I |
| address (2) | P | P | P | P |
| mx (6) | P | P | P | P |
| rdap (4) | P | P | P | P |
| website (4) | I | P | P | P |
| linkedin-fetch (4) | P | P* | P | P |
| screen-x (4) | U | U | U | U |
| screen-facebook (4) | U | U | U | U |
| screen-instagram (4) | U | U | U | U |
| screen-youtube (4) | I | P* | P* | I |
| screen-tiktok (4) | I | I | I | I |
| screen-news (8) | P | P | I | I |
| screen-web (4) | P | P* | P | P |
| web-footprint (4) | I | P* | I | I |
| edgar (12) | P* | I | I | P* |
| courts (0) | P | U | U | U |
| opencorporates (0) | U | U | U | U |
| opensanctions (0) | U | U | U | U |
| news (8) | I | I | I | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B4R05 - Starwood Property Trust / Barry Sternlicht
- Ground truth to be confirmed by Richard: Barry Sternlicht - https://www.starwoodpropertytrust.com/team/ (Chairman & CEO); DEF 14A 2026-03-13; 8-K 2026-04-24 re-elected director; SEC filer STARWOOD PROPERTY TRUST, INC. CIK 1465128. LinkedIn slug starwoodproperty confirmed via search.; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- website=INCONCLUSIVE: Searched: https://www.starwoodpropertytrust.com. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence…
- screen-x=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Starwood Property Trust on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=INCONCLUSIVE: Searched: "Barry Sternlicht" "starwood" on YouTube. no match found Name: yes. Company: no. City: no. Confidence: low.
- screen-tiktok=INCONCLUSIVE: Searched: "Barry Sternlicht" "starwood" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- web-footprint=INCONCLUSIVE: Searched: "Barry Sternlicht" "Starwood Property Trust" "Miami Beach". same source as screen-news Name: no. Company: no. City: no. Confidence: none.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### B5R02 - Sciame Construction / Frank J. Sciame Jr.
- Ground truth to be confirmed by Richard: Frank Sciame - sciame.com/about (CEO / Chairman); NYC PASSPort vendor 1653540 (Chairman & CEO, 2026-02-03); FEC filing 2026-10-22 (Chairman); title unconfirmed by Richard

### B5R04 - Meister Seelig & Schuster / Stephen B. Meister
- Ground truth to be confirmed by Richard: Stephen Meister - meisterseelig.com/position/co-founder (Co-Founder); firm press release 2026-01-20; rename announced 2026-04-09; title unconfirmed by Richard
- Caps applied: Capped at C: fewer than two independent sources tied this person to this company

### B5R05 - Arbor Realty Trust / Ivan Kaufman
- Ground truth to be confirmed by Richard: Ivan Kaufman - arbor.com/our-team/ivan-kaufman (Chairman, CEO, President); SEC proxy 2026-04-16; 10-K cert 2026-02-27; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Ivan Kaufman" "arbor" on X. The company website links https://twitter.com/arbor1, and X blocked automated access. Couldn't check for free.…
- screen-facebook=UNAVAILABLE: Searched: "Ivan Kaufman" "arbor" on Facebook. The company website links https://www.facebook.com/ArborRealtyTrust/, and Facebook blocked automated ac…
- screen-instagram=UNAVAILABLE: Searched: Arbor Realty Trust on Instagram. The company website links https://www.instagram.com/arborrealtytrust/, and Instagram blocked automated acc…
- screen-youtube=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" / "Kaufman" "arbor". Company-level litigation headline. Arbor hit with lawsuit over finder’s fee in Emerald Empire d…
- web-footprint=INCONCLUSIVE: Searched: "Ivan Kaufman" "Arbor Realty Trust" "Uniondale". No result found that names this person and this company. Name: no. Company: no. City: no. …
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 0 | 30006 |
| SEC company_tickers | 200 | 143 |
| SEC efts (URL as used by edgar.ts) | 200 | 471 |
| DuckDuckGo html | 202 | 153 |
| Bing web | 200 | 109 |
| Google News RSS | 200 | 554 |
| GDELT doc API | 429 | 10239 |
| OFAC sdn.csv (HEAD) | 200 | 9629 |
| rdap.org | 200 | 270 |
| OpenSanctions API (expected 401) | 401 | 292 |
| OpenCorporates API (expected 401) | 401 | 470 |
| DNS MX gmail.com (ok) | 200 | 19 |

UNAVAILABLE counts per check across 4 cases: screen-x=4, screen-facebook=4, screen-instagram=4, opencorporates=4, opensanctions=4, courts=3.
