# Verification benchmark - fourteenth-b6-1

Rubric 2026-10-25. Run started 10/26/2026, 10:44:40 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B6R02 | real | LeFrak Organization / Richard LeFrak | not F/DECLINE; company corroborated where public | B | 81 | High | APPROVE WITH CONDITIONS | 76 NEEDS_OWNER_DECISION | 71.9% / 62.8% | **PASS** |
| B6R04 | real | Kramer Levin Naftalis & Frankel LLP (now HSF Kramer) / Jay A. Neveloff | not F/DECLINE; company corroborated where public | D | 61 | Medium | NEEDS MORE INFO | 63 NEEDS_OWNER_DECISION | 59.3% / 46.3% | **PASS** FN |

## Counts

- Cases: 2; PASS 2, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **1** (B6R04)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B6R02 | B6R04 |
|---|:-:|:-:|
| email-syntax (5) | P | P |
| email-provider (2) | P | P |
| disposable-email (8) | P | P |
| role-address (4) | P | P |
| phone-state (4) | I | I |
| text-risk (4) | P | P |
| duplicate (8) | P | P |
| sanctions (10) | P | P |
| linkedin-format (4) | P | P |
| business-card (10) | N | N |
| invite-source (6) | P | P |
| plausibility (4) | P | P |
| velocity (4) | P | P |
| social-links (2) | I | I |
| address (2) | P | P |
| mx (6) | P | P |
| rdap (4) | P | P |
| website (4) | P | U |
| linkedin-fetch (8) | P* | P |
| screen-x (4) | U | U |
| screen-facebook (4) | U | U |
| screen-instagram (4) | U | U |
| screen-youtube (8) | P* | P* |
| screen-tiktok (4) | I | I |
| screen-news (4) | I | I |
| screen-web (8) | P* | P* |
| web-footprint (8) | P* | P* |
| business-registry (8) | P | I |
| edgar (12) | I | I |
| courts (0) | P | P |
| opencorporates (0) | U | U |
| opensanctions (0) | U | U |
| news (8) | P* | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B6R02 - LeFrak Organization / Richard LeFrak
- Ground truth to be confirmed by Richard: Richard LeFrak - CNBC 2026-07-15 and 2026-09-29 (LeFrak Organization CEO); lefrak.com/news-and-press (Chairman and CEO); TRD 2025-02-27 says firm calls him executive chairman; title unconfirmed by Richard

### B6R04 - Kramer Levin Naftalis & Frankel LLP (now HSF Kramer) / Jay A. Neveloff
- Ground truth to be confirmed by Richard: Jay Neveloff - hsfkramer.com/our-people/j/jay-a-neveloff (Partner, Chair of Real Estate US); kramerlevin.com/en/people/jay-a-neveloff.html (archived Kramer Levin bio); HSF Kramer news 2026-05-12 (CO Power 100 2026); title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.kramerlevin.com. blocked by site (403) — not checkable for free; ask applicant for a team-page URL The site redirected to https…
- screen-x=UNAVAILABLE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for f…
- screen-instagram=UNAVAILABLE: Searched: Kramer Levin Naftalis & Frankel LLP on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" / "Neveloff" "kramer levin naftalis frankel". no match found Name: no. Company: no. City: no…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 10405 |
| SEC company_tickers | 200 | 106 |
| SEC efts (URL as used by edgar.ts) | 200 | 507 |
| DuckDuckGo html | 200 | 725 |
| Bing web | 200 | 96 |
| Google News RSS | 200 | 546 |
| GDELT doc API | 429 | 8105 |
| OFAC sdn.csv (HEAD) | 200 | 8707 |
| rdap.org | 200 | 154 |
| OpenSanctions API (expected 401) | 401 | 262 |
| OpenCorporates API (expected 401) | 401 | 634 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 2 cases: screen-x=2, screen-facebook=2, screen-instagram=2, opencorporates=2, opensanctions=2, website=1.
