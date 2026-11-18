# Verification benchmark - batch10-after

Rubric 2026-10-25. Run started 10/27/2026, 12:17:00 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv download HTTP 200 (5744136 chars); alt.csv download HTTP 200 (1063745 chars); 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B10R01 | real | RXR / Scott Rechler | not F/DECLINE; company corroborated where public | F | 54 | Low | NEEDS MORE INFO | 61 NEEDS_OWNER_DECISION | 57.2% / 35.1% | **FAIL** FN |
| B10R02 | real | STO Building Group / Robert Mullen | not F/DECLINE; company corroborated where public | D | 68 | Medium | NEEDS MORE INFO | 65 NEEDS_OWNER_DECISION | 60.7% / 43.6% | **PASS** FN |
| B10R04 | real | Adam Leitman Bailey, P.C. / Adam Leitman Bailey | not F/DECLINE; company corroborated where public | C | 70 | Medium | APPROVE WITH CONDITIONS | 70 NEEDS_OWNER_DECISION | 65.6% / 53.8% | **PASS** |
| B10R05 | real | Walker & Dunlop / Willy Walker | not F/DECLINE; company corroborated where public | B | 82 | Medium | APPROVE WITH CONDITIONS | 80 LEGIT | 71.9% / 76.7% | **PASS** |
| B10F01 | fake | Batch-10 fake: unregistered domain, invented lender | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |

## Counts

- Cases: 5; PASS 4, FAIL 1, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **2** (B10R01, B10R02)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B10R01 | B10R02 | B10R04 | B10R05 | B10F01 |
|---|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P |
| role-address (4) | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P |
| linkedin-format (4) | I | I | I | I | P |
| business-card (10) | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P |
| velocity (4) | P | P | P | P | P |
| social-links (2) | I | I | I | I | I |
| address (2) | P | P | P | P | P |
| mx (6) | P | P | P | P | P |
| rdap (4) | P | P | P | P | F |
| website (4) | P | P | P | P | F |
| linkedin-fetch (4) | P | P | P* | P* | U |
| screen-x (4) | U | U | U | U | U |
| screen-facebook (4) | I | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U |
| screen-youtube (4) | I | I | I | I | I |
| screen-tiktok (4) | I | I | I | I | I |
| screen-news (8) | P | I | P | P | I |
| screen-web (4) | I | P* | P | P* | I |
| web-footprint (4) | I | P* | I | P* | I |
| business-registry (8) | P | P | P | N | I |
| edgar (12) | I | I | I | P* | I |
| courts (0) | U | I | U | I | I |
| opencorporates (0) | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U |
| news (8) | I | I | P* | P* | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B10R01 - RXR / Scott Rechler
- MISS: no company-evidence check returned PASS with corroborates=true.
- False negative: grade F / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Scott Rechler" "rxr" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=INCONCLUSIVE: Searched: "Scott Rechler" "rxr" on Facebook. no match found Name: no. Company: yes. City: no. Confidence: low.
- screen-instagram=UNAVAILABLE: Searched: RXR on Instagram. The company website links https://www.instagram.com/one_rxr/, and Instagram blocked automated access. Couldn't check for …
- screen-youtube=INCONCLUSIVE: Searched: "Scott Rechler" "rxr" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Scott Rechler" "rxr" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-web=INCONCLUSIVE: Searched: "Scott Rechler" "RXR" "New York". No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: non…
- web-footprint=INCONCLUSIVE: Searched: "Scott Rechler" "RXR" "New York". same source as screen-news Name: no. Company: no. City: no. Confidence: none.
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### B10R02 - STO Building Group / Robert Mullen
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Robert Mullen" "sto building group" on X. The company website links https://twitter.com/Structuretone, and X blocked automated access. Cou…
- screen-facebook=UNAVAILABLE: Searched: "Robert Mullen" "sto building group" on Facebook. The company website links https://www.facebook.com/StructureTone/, and Facebook blocked a…
- screen-instagram=UNAVAILABLE: Searched: STO Building Group on Instagram. The company website links https://www.instagram.com/stobuildinggroup/, and Instagram blocked automated acc…
- screen-youtube=INCONCLUSIVE: Searched: "Robert Mullen" "sto building group" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Robert Mullen" "sto building group" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Robert Mullen" "sto building group" / "Mullen" "sto building group" / "Robert Mullen" "stobuildinggroup". Found: RC Andersen joins STO Bui…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company. Male, Believed to Be Project Worker, Dies in Fall on STO Building Group London Site Google News, Bing New…

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 421 |
| SEC company_tickers | 200 | 94 |
| SEC efts (URL as used by edgar.ts) | 200 | 706 |
| DuckDuckGo html | 200 | 639 |
| Bing web | 200 | 137 |
| Google News RSS | 200 | 550 |
| GDELT doc API | 429 | 12349 |
| OFAC sdn.csv (HEAD) | 200 | 9733 |
| rdap.org | 200 | 334 |
| OpenSanctions API (expected 401) | 401 | 326 |
| OpenCorporates API (expected 401) | 401 | 506 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 5 cases: screen-x=5, screen-instagram=5, courts=2, opencorporates=5, opensanctions=5, screen-facebook=4, linkedin-fetch=1.
