# Verification benchmark - batch9-after

Rubric 2026-10-25. Run started 10/27/2026, 11:20:02 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B9R01 | real | Ready Capital Corporation / Thomas Capasse | not F/DECLINE; company corroborated where public | C | 72 | Medium | APPROVE WITH CONDITIONS | 71 NEEDS_OWNER_DECISION | 66.5% / 65.9% | **PASS** |
| B9R02 | real | JLL / Christian Ulbrich | not F/DECLINE; company corroborated where public | B | 83 | High | APPROVE WITH CONDITIONS | 86 LEGIT | 76.6% / 81.4% | **PASS** |
| B9R03 | real | Rudin Management Company / William Rudin | not F/DECLINE; company corroborated where public | C | 74 | Medium | APPROVE WITH CONDITIONS | 65 NEEDS_OWNER_DECISION | 60.7% / 53.8% | **PASS** |
| B9R04 | real | Joshua Stein PLLC / Joshua Stein | not F/DECLINE; company corroborated where public | F | 47 | Low | NEEDS MORE INFO | 60 NEEDS_OWNER_DECISION | 56.1% / 25.7% | **FAIL** FN |
| B9R05 | real | Hunter Roberts Construction Group / James McKenna | not F/DECLINE; company corroborated where public | D | 66 | Medium | NEEDS MORE INFO | 56 NEEDS_OWNER_DECISION | 52.2% / 35.1% | **PASS** FN |
| B9F01 | fake | Batch-9 fake: unregistered domain, invented lender | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| LR01 | qa | QA TestAF / Brookfield Properties | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 48 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 48.4% / 25.7% | **PASS** |
| LR02 | qa | QA TestAB / Skanska USA Building | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 48.4% / 14.3% | **PASS** |
| LR03 | qa | QA TestAG / AECOM Tishman | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 45 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 43.2% / 14.3% | **PASS** |

## Before / after

Prior numbers are the mvp grade at 707fa61 and the PR grade at f031c1f, from the batch 9 comparison. After is this live run on 5448135 plus the batch 9 case file.

| Case | mvp | PR before | After | Notes |
|---|---|---|---|---|
| B9R01 Thomas Capasse / Ready Capital |  | name-only EDGAR | C 72 APPROVE WITH CONDITIONS | Form 4 names Capasse Thomas E, CIK 1527590. Company litigation is attention, not a cap. Courts: None found, INCONCLUSIVE. |
| B9R02 Christian Ulbrich / JLL | F 51 | F 42 | B 83 APPROVE WITH CONDITIONS | jll.com is Company: yes. No review-only alias. EDGAR is JONES LANG LASALLE INC (JLL), CIK 1037976, reporting owner Ulbrich Christian. |
| B9R03 William Rudin | C 76 | C 74 | C 74 APPROVE WITH CONDITIONS | Unchanged from the prior PR. The firm contains the surname only. |
| B9R04 Joshua Stein PLLC | C 76 | F 44 | F 47 NEEDS MORE INFO | Own site and /in/joshuasteinnyc are Name: yes, Company: yes, self-reported, not corroboration. Kansas City Jewish Chronicle and Attorney Mark Joshua Stein stay Name: no. Completeness 0/10. |
| B9R05 James McKenna / hrcg.com | D 64 | D 66 | D 66 NEEDS MORE INFO | Unchanged from the prior PR. |
| B9F01 Thaddeus Brinkwell | F 49 | F 40 | F 40 NEEDS MORE INFO | Dead domain and unregistered. No corroborating pass. Completeness 0/10. |
| LR01 QA TestAF / Brookfield |  | F 42-44 | F 48 NEEDS MORE INFO | Company confirmed, person not confirmed. EDGAR is Brookfield Properties, Inc., CIK 1680277, name-only. Completeness 0/10. |
| LR02 QA TestAB / Skanska |  | F 42-44 | F 44 NEEDS MORE INFO | Redirect to skanska.com/us/en followed, then 403. NY registry lists the company. Courts: None found, INCONCLUSIVE. Completeness 0/10. |
| LR03 QA TestAG / AECOM Tishman |  | F 42-44 | F 45 NEEDS MORE INFO | Parent match, needs review, AECOM (ACM), CIK 868857. Not a pass. Completeness 0/10. |

No fake scored above a real. Brinkwell is F 40. The lowest real is Joshua Stein at F 47. No QA replay reached C or an approval. No corroborating pass on the fake or the QA replays.

## Counts

- Cases: 9; PASS 8, FAIL 1, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **2** (B9R04, B9R05)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B9R01 | B9R02 | B9R03 | B9R04 | B9R05 | B9F01 | LR01 | LR02 | LR03 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P | P | P |
| linkedin-format (4) | I | P | I | P | I | P | I | I | I |
| business-card (10) | N | N | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I | I | I |
| address (2) | P | P | P | P | P | P | P | P | P |
| mx (6) | P | P | P | P | P | P | P | P | P |
| rdap (4) | P | P | P | P | P | F | P | P | P |
| website (4) | P | P | P | P | P | F | P | U | U |
| linkedin-fetch (4) | P | P | P | P | P | U | P | U | U |
| screen-x (4) | U | U | U | U | U | U | U | U | U |
| screen-facebook (4) | U | I | I | U | I | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U | U | U |
| screen-youtube (8) | P* | P* | I | I | P* | I | I | I | I |
| screen-tiktok (4) | I | I | I | I | I | I | I | I | I |
| screen-news (4) | I | P | I | I | I | I | I | I | I |
| screen-web (8) | P* | P* | P* | I | I | I | I | I | I |
| web-footprint (8) | P* | P* | P* | I | I | I | I | I | I |
| business-registry (8) | I | N | I | P | I | I | I | P | I |
| edgar (12) | P* | P* | I | I | I | I | I | I | I |
| courts (0) | I | I | U | I | U | I | I | I | I |
| opencorporates (0) | U | U | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U | U | U |
| news (8) | I | P* | P* | I | I | I | I | I | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B9R04 - Joshua Stein PLLC / Joshua Stein
- MISS: no company-evidence check returned PASS with corroborates=true.
- False negative: grade F / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Joshua Stein" "joshua stein" on X. The company website links https://twitter.com/joshuasteinpllc, and X blocked automated access. Couldn't…
- screen-facebook=UNAVAILABLE: Searched: "Joshua Stein" "joshua stein" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Joshua Stein PLLC on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=INCONCLUSIVE: Searched: "Joshua Stein" "joshua stein" on YouTube. no match found Name: no. Company: yes. City: no. Confidence: low.
- screen-tiktok=INCONCLUSIVE: Searched: "Joshua Stein" "joshua stein" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Joshua Stein" "joshua stein" / "Stein" "joshua" / "Joshua Stein" "joshuastein". Found: Joshua Stein named next JCF executive director - Ka…
- screen-web=INCONCLUSIVE: Searched: "Joshua Stein" "Joshua Stein PLLC" "New York". No result found that names this person and this company. Name: no. Company: no. City: no. Co…
- web-footprint=INCONCLUSIVE: Searched: "Joshua Stein" "Joshua Stein PLLC" "New York". No result found that names this person and this company. Name: no. Company: no. City: no. Co…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company. New York Court Reinstates Attorney Mark Joshua Stein Google News, Bing News responded. Unavailable: GDELT.

### B9R05 - Hunter Roberts Construction Group / James McKenna
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "James McKenna" "hunter roberts" on X. The company website links https://twitter.com/hunterrobertscg, and X blocked automated access. Could…
- screen-facebook=INCONCLUSIVE: Searched: "James McKenna" "hunter roberts" on Facebook. no match found Name: no. Company: alias (hrcg). City: no. Confidence: low.
- screen-instagram=UNAVAILABLE: Searched: Hunter Roberts Construction Group on Instagram. The company website links https://www.instagram.com/hunterrobertscg/, and Instagram blocked…
- screen-tiktok=INCONCLUSIVE: Searched: "James McKenna" "hunter roberts" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "James McKenna" "hunter roberts" / "McKenna" "hunter roberts" / "James McKenna" "hrcg". A headline names the person or the company. Hunter …
- screen-web=INCONCLUSIVE: Searched: "James McKenna" "Hunter Roberts Construction Group" "New York". No result found that names this person and this company. Name: no. Company:…
- web-footprint=INCONCLUSIVE: Searched: "James McKenna" "Hunter Roberts Construction Group" "New York". same source as screen-youtube Name: no. Company: no. City: no. Confidence: …
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company. Hunter Roberts welcomes Cabrera as vice president, director of healthcare Google News, Bing News responde…

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 394 |
| SEC company_tickers | 200 | 96 |
| SEC efts (URL as used by edgar.ts) | 200 | 350 |
| DuckDuckGo html | 200 | 739 |
| Bing web | 200 | 149 |
| Google News RSS | 200 | 496 |
| GDELT doc API | 0 | 10490 |
| OFAC sdn.csv (HEAD) | 200 | 10641 |
| rdap.org | 200 | 169 |
| OpenSanctions API (expected 401) | 401 | 345 |
| OpenCorporates API (expected 401) | 401 | 662 |
| DNS MX gmail.com (ok) | 200 | 17 |

UNAVAILABLE counts per check across 9 cases: screen-x=9, screen-facebook=6, screen-instagram=9, opencorporates=9, opensanctions=9, courts=2, linkedin-fetch=3, website=2.
