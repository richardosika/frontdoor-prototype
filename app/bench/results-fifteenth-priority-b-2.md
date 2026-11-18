# Verification benchmark - fifteenth-priority-b-2

Rubric 2026-10-25. Run started 10/27/2026, 2:52:44 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B6R01 | real | SL Green Realty Corp / Marc Holliday | not F/DECLINE; company corroborated where public | B | 85 | High | APPROVE WITH CONDITIONS | 80 LEGIT | 75.5% / 69.2% | **PASS** |
| B6R02 | real | LeFrak Organization / Richard LeFrak | not F/DECLINE; company corroborated where public | B | 81 | High | APPROVE WITH CONDITIONS | 76 NEEDS_OWNER_DECISION | 71.9% / 62.8% | **PASS** |
| B6R04 | real | Kramer Levin Naftalis & Frankel LLP (now HSF Kramer) / Jay A. Neveloff | not F/DECLINE; company corroborated where public | D | 61 | Medium | NEEDS MORE INFO | 59 NEEDS_OWNER_DECISION | 55.8% / 38.5% | **PASS** FN |

## Counts

- Cases: 3; PASS 3, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **1** (B6R04)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B6R01 | B6R02 | B6R04 |
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
| rdap (4) | P | P | P |
| website (4) | P | P | U |
| linkedin-fetch (4) | P | P* | P |
| screen-x (4) | U | U | U |
| screen-facebook (4) | U | U | U |
| screen-instagram (4) | U | U | U |
| screen-youtube (8) | P* | P* | I |
| screen-tiktok (4) | I | I | I |
| screen-news (8) | P | I | I |
| screen-web (4) | I | P* | P* |
| web-footprint (4) | I | P* | P* |
| business-registry (8) | P | P | I |
| edgar (12) | P* | I | I |
| courts (0) | P | U | U |
| opencorporates (0) | U | U | U |
| opensanctions (0) | U | U | U |
| news (8) | P* | P* | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B6R01 - SL Green Realty Corp / Marc Holliday
- Ground truth to be confirmed by Richard: Marc Holliday - slgreen.com/about/executive-management/marc-holliday (Chairman & CEO); SEC DEF 14A 2026-04-22 (CEO since 2004; ceased Interim President 2026-02-27 when Harrison Sitomer named President); title unconfirmed by Richard

### B6R02 - LeFrak Organization / Richard LeFrak
- Ground truth to be confirmed by Richard: Richard LeFrak - CNBC 2026-07-15 and 2026-09-29 (LeFrak Organization CEO); lefrak.com/news-and-press (Chairman and CEO); TRD 2025-02-27 says firm calls him executive chairman; title unconfirmed by Richard

### B6R04 - Kramer Levin Naftalis & Frankel LLP (now HSF Kramer) / Jay A. Neveloff
- Ground truth to be confirmed by Richard: Jay Neveloff - hsfkramer.com/our-people/j/jay-a-neveloff (Partner, Chair of Real Estate US); kramerlevin.com/en/people/jay-a-neveloff.html (archived Kramer Levin bio); HSF Kramer news 2026-05-12 (CO Power 100 2026); title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.kramerlevin.com. blocked by site (403) — not checkable for free; ask applicant for a team-page URL The site redirected to https…
- screen-x=UNAVAILABLE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for f…
- screen-instagram=UNAVAILABLE: Searched: Kramer Levin Naftalis & Frankel LLP on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" / "Neveloff" "kramer levin naftalis frankel". no match found Name: no. Company: no. City: no…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 0 | 30003 |
| SEC company_tickers | 200 | 140 |
| SEC efts (URL as used by edgar.ts) | 200 | 1177 |
| DuckDuckGo html | 202 | 157 |
| Bing web | 200 | 127 |
| Google News RSS | 200 | 533 |
| GDELT doc API | 429 | 8800 |
| OFAC sdn.csv (HEAD) | 200 | 9756 |
| rdap.org | 200 | 295 |
| OpenSanctions API (expected 401) | 401 | 291 |
| OpenCorporates API (expected 401) | 401 | 475 |
| DNS MX gmail.com (ok) | 200 | 17 |

UNAVAILABLE counts per check across 3 cases: screen-x=3, screen-facebook=3, screen-instagram=3, opencorporates=3, opensanctions=3, courts=2, website=1.
