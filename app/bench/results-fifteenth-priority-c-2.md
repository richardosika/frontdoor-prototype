# Verification benchmark - fifteenth-priority-c-2

Rubric 2026-10-25. Run started 10/27/2026, 3:03:06 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| B7R01 | real | Vornado Realty Trust / Steven Roth | not F/DECLINE; company corroborated where public | B | 85 | High | APPROVE WITH CONDITIONS | 86 NEEDS_OWNER_DECISION | 81.3% / 81.4% | **PASS** |
| B7R02 | real | Skanska USA / Richard Kennedy | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 69 NEEDS_OWNER_DECISION | 64.8% / 45.9% | **PASS** FN |
| B7R03 | real | Avison Young / James Nelson | not F/DECLINE; company corroborated where public | C | 78 | Medium | APPROVE WITH CONDITIONS | 64 NEEDS_OWNER_DECISION | 59.7% / 45.9% | **PASS** |
| B7R04 | real | Paul, Weiss, Rifkind, Wharton & Garrison LLP / Harris B. Freidus | not F/DECLINE; company corroborated where public | F | 52 | Low | NEEDS MORE INFO | 60 NEEDS_OWNER_DECISION | 56.1% / 25.7% | **FAIL** FN |

## Counts

- Cases: 4; PASS 3, FAIL 1, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **2** (B7R02, B7R04)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | B7R01 | B7R02 | B7R03 | B7R04 |
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
| address (2) | P | P | P | P |
| mx (6) | P | P | P | P |
| rdap (4) | P | P | U | P |
| website (4) | P | U | P | P |
| linkedin-fetch (4) | P | P | P | P |
| screen-x (4) | U | U | U | U |
| screen-facebook (4) | U | U | U | U |
| screen-instagram (4) | U | U | U | U |
| screen-youtube (8) | P* | I | P* | I |
| screen-tiktok (4) | I | I | I | I |
| screen-news (8) | P | P | I | I |
| screen-web (8) | P* | P | P | U |
| web-footprint (8) | P* | I | I | U |
| business-registry (8) | P | P | I | P |
| edgar (12) | P* | I | I | I |
| courts (0) | U | U | U | U |
| opencorporates (0) | U | U | U | U |
| opensanctions (0) | U | U | U | U |
| news (8) | P* | P* | P* | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### B7R01 - Vornado Realty Trust / Steven Roth
- Ground truth to be confirmed by Richard: Steven Roth - vno.com/governance/executive-management (Chairman of the Board and CEO); SEC DEF 14A 2026-04-07; SEC 10-Q exhibit 31.1 signed 2026-08-03 as Chairman and CEO; title unconfirmed by Richard

### B7R02 - Skanska USA / Richard Kennedy
- Ground truth to be confirmed by Richard: Richard Kennedy - skanska.com/us/en/about-us/skanska-in-the-u.s/quick-facts (President and CEO Skanska USA); skanska.com group management page (EVP Skanska AB, Group Leadership Team); title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.skanska.com/us/en/. blocked by site (403) — not checkable for free; ask applicant for a team-page URL Couldn't check for free. …
- screen-x=UNAVAILABLE: Searched: "Richard Kennedy" "skanska" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Richard Kennedy" "skanska" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Skanska USA on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=INCONCLUSIVE: Searched: "Richard Kennedy" "skanska" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Richard Kennedy" "skanska" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- web-footprint=INCONCLUSIVE: Searched: "Richard Kennedy" "Skanska USA" "New York". same source as screen-news Name: no. Company: no. City: no. Confidence: none.
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.

### B7R03 - Avison Young / James Nelson
- Ground truth to be confirmed by Richard: James Nelson - avisonyoung.us/w/james-nelson (Principal, Head of U.S. Investment Sales); Avison Young press release 2025-03-12; CoStar 2026-02-17; title unconfirmed by Richard

### B7R04 - Paul, Weiss, Rifkind, Wharton & Garrison LLP / Harris B. Freidus
- Ground truth to be confirmed by Richard: Harris Freidus - paulweiss.com/professionals/partners-and-counsel/harris-b-freidus ('Chair of Real Estate'); Chambers USA 2026 Paul Weiss real estate (chair); Lawdragon; title unconfirmed by Richard
- MISS: no company-evidence check returned PASS with corroborates=true.
- False negative: grade F / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Harris Freidus" "paul weiss rifkind wharton garrison" on X. The company website links https://twitter.com/paulweissllp, and X blocked auto…
- screen-facebook=UNAVAILABLE: Searched: "Harris Freidus" "paul weiss rifkind wharton garrison" on Facebook. The company website links https://www.facebook.com/people/Paul-Weiss-Ri…
- screen-instagram=UNAVAILABLE: Searched: Paul, Weiss, Rifkind, Wharton & Garrison LLP on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for f…
- screen-youtube=INCONCLUSIVE: Searched: "Harris Freidus" "paul weiss rifkind wharton garrison" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Harris Freidus" "paul weiss rifkind wharton garrison" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Harris Freidus" "paul weiss rifkind wharton garrison" / "Freidus" "paul weiss rifkind wharton garrison". no match found Name: no. Company:…
- screen-web=UNAVAILABLE: Searched: "Harris Freidus" "Paul, Weiss, Rifkind, Wharton & Garrison LLP" "New York". DuckDuckGo returned a challenge page and is not checkable for f…
- web-footprint=UNAVAILABLE: Searched: "Harris Freidus" "Paul, Weiss, Rifkind, Wharton & Garrison LLP" "New York". DuckDuckGo returned a challenge page and is not checkable for f…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company, without a negative term tying them together. Google News, Bing News responded. Unavailable: GDELT.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 0 | 30004 |
| SEC company_tickers | 200 | 175 |
| SEC efts (URL as used by edgar.ts) | 200 | 564 |
| DuckDuckGo html | 200 | 761 |
| Bing web | 200 | 121 |
| Google News RSS | 200 | 518 |
| GDELT doc API | 200 | 19623 |
| OFAC sdn.csv (HEAD) | 200 | 10735 |
| rdap.org | 200 | 300 |
| OpenSanctions API (expected 401) | 401 | 372 |
| OpenCorporates API (expected 401) | 401 | 641 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 4 cases: screen-x=4, screen-facebook=4, screen-instagram=4, courts=4, opencorporates=4, opensanctions=4, website=1, rdap=1, screen-web=1, web-footprint=1.
