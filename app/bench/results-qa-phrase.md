# Verification benchmark - qa-phrase

Rubric 2026-10-25. Run started 10/27/2026, 10:29:37 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| QAP-HINES | real | Hines / Jeff Hines (affiliate must not pass) | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 63 NEEDS_OWNER_DECISION | 55.8% / 38.5% | **PASS** FN |
| QAP-CBRE | real | CBRE Group / Robert Sulentic (must not match Unum) | not F/DECLINE; company corroborated where public | C | 72 | Medium | APPROVE WITH CONDITIONS | 71 NEEDS_OWNER_DECISION | 63.2% / 53.8% | **PASS** |
| QAP-KENNEDY | real | Skanska USA / Richard Kennedy (court name must be a phrase) | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 73 LEGIT | 68.9% / 56.1% | **PASS** |

## Counts

- Cases: 3; PASS 3, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **1** (QAP-HINES)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | QAP-HINES | QAP-CBRE | QAP-KENNEDY |
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
| business-registry (8) | N | N | P |
| address (2) | P | P | P |
| mx (6) | P | P | P |
| rdap (4) | P | P | P |
| website (4) | U | U | U |
| linkedin-fetch (8) | P* | P | P |
| screen-x (4) | U | U | U |
| screen-facebook (4) | U | U | U |
| screen-instagram (4) | U | U | U |
| screen-youtube (8) | P* | P* | I |
| screen-tiktok (4) | I | I | I |
| screen-news (4) | I | P | P |
| screen-web (4) | P | P | P* |
| web-footprint (4) | I | I | P* |
| edgar (12) | I | I | I |
| courts (0) | I | P | I |
| opencorporates (0) | U | U | U |
| opensanctions (0) | U | U | U |
| news (8) | I | P* | P* |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### QAP-HINES - Hines / Jeff Hines (affiliate must not pass)
- Ground truth to be confirmed by Richard: Jeff Hines - assumed Hines executive; title unverified. HINES GLOBAL INCOME TRUST is an affiliate, not this company.
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.hines.com. blocked the check (403). blocked by site (403) — not checkable for free; ask applicant for a team-page URL Couldn't …
- screen-x=UNAVAILABLE: Searched: "Jeff Hines" "hines" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jeff Hines" "hines" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Hines on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: "Jeff Hines" "hines" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jeff Hines" "hines" / "Hines" "hines". Found: Hines Announces Next Generation Leadership to Build on Global Real Assets Momentum - Hines N…
- web-footprint=INCONCLUSIVE: Searched: "Jeff Hines" "Hines" "Houston". same source as linkedin-fetch Name: no. Company: no. City: no. Confidence: none.
- edgar=INCONCLUSIVE: EDGAR lists HINES GLOBAL INCOME TRUST, INC. (HGIT). That is a parent, affiliate, or partial name match for a different firm, not an exact match for t…
- FLAG edgar=INCONCLUSIVE review: EDGAR lists HINES GLOBAL INCOME TRUST, INC. (HGIT). That is a parent, affiliate, or partial name match for a different firm, not an exact match for t…
- news=INCONCLUSIVE: A headline names the person or the company. Hines Private Wealth Solutions Completes Record $591 Million Delaware Statutory Trust Offering Google New…

### QAP-CBRE - CBRE Group / Robert Sulentic (must not match Unum)
- Ground truth to be confirmed by Richard: Robert Sulentic is assumed to be associated with CBRE Group. The person link is unverified. Unum Group is a different registrant.

### QAP-KENNEDY - Skanska USA / Richard Kennedy (court name must be a phrase)
- Ground truth to be confirmed by Richard: Richard Kennedy - skanska.com/us/en leadership; title unconfirmed by Richard. Separate words Richard and Kennedy are not a court hit.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 547 |
| SEC company_tickers | 200 | 213 |
| SEC efts (URL as used by edgar.ts) | 200 | 404 |
| DuckDuckGo html | 200 | 601 |
| Bing web | 200 | 118 |
| Google News RSS | 200 | 474 |
| GDELT doc API | 429 | 9685 |
| OFAC sdn.csv (HEAD) | 200 | 9716 |
| rdap.org | 200 | 194 |
| OpenSanctions API (expected 401) | 401 | 302 |
| OpenCorporates API (expected 401) | 401 | 257 |
| DNS MX gmail.com (ok) | 200 | 17 |

UNAVAILABLE counts per check across 3 cases: website=3, screen-x=3, screen-facebook=3, screen-instagram=3, opencorporates=3, opensanctions=3.
