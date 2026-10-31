# Verification benchmark - after-followup2

Rubric 2026-10-25. Run started 10/26/2026, 1:36:04 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | real (company only) | Prologis (company only) | not F/DECLINE; company-only corroboration | C | 73 | Medium | APPROVE WITH CONDITIONS | 77 LEGIT | 68.5% / 65.9% | **PASS** |
| R02 | real | Blackstone / Jonathan Gray | not F/DECLINE; company corroborated where public | D | 65 | Medium | NEEDS MORE INFO | 67 NEEDS_OWNER_DECISION | 62.7% / 53.8% | **PASS** FN |
| R03 | real | Related Companies / Stephen Ross | not F/DECLINE; company corroborated where public | C | 75 | Medium | APPROVE WITH CONDITIONS | 64 NEEDS_OWNER_DECISION | 60.2% / 48.7% | **PASS** |
| R04 | real | Tishman Speyer / Rob Speyer | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 69 NEEDS_OWNER_DECISION | 64.5% / 58.1% | **PASS** |
| R05 | real | Hines / Jeff Hines | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 63 NEEDS_OWNER_DECISION | 56.4% / 41.5% | **PASS** FN |
| R06 | real | Silverstein Properties / Larry Silverstein | not F/DECLINE; company corroborated where public | C | 79 | Medium | APPROVE WITH CONDITIONS | 68 NEEDS_OWNER_DECISION | 63.6% / 56.1% | **PASS** |
| R07 | real (company only) | Veris Residential (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | APPROVE WITH CONDITIONS | 76 LEGIT | 67.7% / 64.1% | **PASS** |
| R08 | real | Hovnanian Enterprises / Ara Hovnanian | not F/DECLINE; company corroborated where public | C | 73 | Medium | APPROVE WITH CONDITIONS | 77 LEGIT | 68.5% / 65.9% | **PASS** |
| R09 | real (company only) | Toll Brothers (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | APPROVE WITH CONDITIONS | 76 LEGIT | 67.7% / 64.1% | **PASS** |
| R10 | real (company only) | Greystar (company only) | not F/DECLINE; company-only corroboration | C | 71 | Medium | APPROVE WITH CONDITIONS | 66 NEEDS_OWNER_DECISION | 58.8% / 46.3% | **PASS** |
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 40.9% / 9.1% | **PASS** |
| F02 | fake | Control 2: invented firm, mailinator, no site/LinkedIn | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 35 NOT_LEGIT | 43% / 0% | **PASS** |
| F03a | fake | Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no s… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 50 | Low | NEEDS MORE INFO | 57 NEEDS_OWNER_DECISION | 49% / 27.3% | **PASS** |
| F03b | fake | Control 3b: impersonation - made-up person + 'Prologis' + the REAL pr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 60 NEEDS_OWNER_DECISION | 52.9% / 31.4% | **PASS** |
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 47 NEEDS_OWNER_DECISION | 43.6% / 15.2% | **PASS** |
| F04b | fake | Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-co… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 59 | Low | NEEDS MORE INFO | 54 NEEDS_OWNER_DECISION | 50.3% / 15.2% | **PASS** |
| F05 | fake | Control 5: fraud text with invented firm | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 40 NOT_LEGIT | 43.9% / 9.1% | **PASS** |
| F06a | fake | Control 6a: real OFAC SDN individual + location matching the list (fu… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | DECLINE | 37 NOT_LEGIT | 44.7% / 9.1% | **PASS** |
| F06b | fake | Control 6b: same SDN individual, US location (name-only match, uncorr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 35 NEEDS_OWNER_DECISION | 44.7% / 9.1% | **PASS** |
| F06c | fake | Control 6c: BUG PROBE - same as F01 but with an EMPTY watchlist cache… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 41 NEEDS_OWNER_DECISION | 34.2% / 9.1% | **PASS** |
| F07a | fake | Control 7a: real exec (Stephen Ross) paired with a different real com… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 40.9% / 9.1% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 62 | Low | NEEDS MORE INFO | 57 NEEDS_OWNER_DECISION | 52.9% / 37.1% | **PASS** |
| F08a | fake | Hard fake 8a: copycat spelling of Blackstone, made-up person, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 40.9% / 9.1% | **PASS** |
| F08b | fake | Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 50 NEEDS_OWNER_DECISION | 43.6% / 15.2% | **PASS** |
| R11 | real (company only) | CBRE Group / Bob Sulentic (company only) | not F/DECLINE; company-only corroboration | C | 73 | Medium | APPROVE WITH CONDITIONS | 73 LEGIT | 65.2% / 59% | **PASS** |
| R12 | real (company only) | Madison Realty Capital / Josh Zegen (company only) | not F/DECLINE; company-only corroboration | C | 71 | Medium | APPROVE WITH CONDITIONS | 66 NEEDS_OWNER_DECISION | 62.1% / 53.5% | **PASS** |
| R13 | real (company only) | Cole Schotz / Richard Abramson (company only) | not F/DECLINE; company-only corroboration | D | 67 | Medium | NEEDS MORE INFO | 62 NEEDS_OWNER_DECISION | 55.3% / 38.5% | **PASS** FN |
| R14 | real (company only) | Parke Bancorp / Vito Pantilione (company only) | not F/DECLINE; company-only corroboration | C | 73 | Medium | NEEDS MORE INFO | 69 NEEDS_OWNER_DECISION | 60.8% / 48.6% | **PASS** |

## Counts

- Cases: 28; PASS 28, FAIL 0, ERROR 0.
- False positives (fake reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **3** (R02, R05, R13)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | F01 | F02 | F03a | F03b | F04 | F04b | F05 | F06a | F06b | F06c | F07a | F07b | F08a | F08b | R11 | R12 | R13 | R14 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | F | N | P | P | P | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P | P | P | P | P | P | I | I | I | P | I | P | I | I | I | I | I | I | I | I | P | P | P | P |
| business-card (10) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I |
| business-registry (8) | N | I | I | I | N | I | N | N | N | N | I | I | N | N | I | I | I | N | I | U | I | U | I | N | N | I | N | N |
| mx (6) | P | P | P | P | P | P | P | P | P | P | P | N | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| rdap (4) | P | P | P | P | P | P | P | P | P | P |  |  |  | P |  |  |  |  |  |  |  | P |  |  | P | P | P | P |
| website (4) | U | U | P | U | U | P | P | I | P | P | N | N | N | U | P | P | N | N | N | N | N | P | N | P | U | P | P | P |
| linkedin-fetch (4) | I | I | I | P* | P* | P* | I | U | I | P* | U | U | U | I | U | U | U | U | U | U | U | I | U | U | I | P* | I | U |
| screen-x (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | I | U | U | I | U | U | U | U | U | U | U | U | U | U | U | U | I | U | U | U | I | I | U |
| screen-instagram (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-youtube (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-tiktok (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| screen-news (8) | P* | P* | I | P* | I | I | I | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I |
| screen-web (8) | P* | P | P* | P* | P* | P* | P* | P* | U | P* | I | I | U | I | I | I | I | I | I | I | I | I | I | I | P* | P* | P* | I |
| web-footprint (8) | P* | P* | P* | P* | P* | P* | P* | P* | P* | P* | I | I | U | I | I | I | I | I | I | I | I | I | I | I | P* | P* | P* | I |
| edgar (12) | P | P | I | I | I | I | P* | P | P* | I | I | I | P | P | I | I | I | I | I | I | I | P | I | I | P | I | I | P |
| courts (0) | P | P | I | P | I | P | P | P | P | I | I | P | P | P | P | P | P | P | P | I | I | P | P | P | P | P | U | U |
| opencorporates (0) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| news (8) | P* | I | P* | P* | I | P* | P* | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | P* |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### R01 - Prologis (company only)
- Ground truth to be confirmed by Richard: Hamid Moghadam - assumed Prologis co-founder/executive; unverified

### R02 - Blackstone / Jonathan Gray
- Ground truth to be confirmed by Richard: Jonathan Gray - assumed Blackstone executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.blackstone.com. blocked by site, ask applicant for a team-page URL Couldn't check for free. Not checkable for free.
- linkedin-fetch=INCONCLUSIVE: Searched: https://www.linkedin.com/company/blackstone/. Found: the public LinkedIn page Name: no. Company: yes. City: yes. Confidence: medium.
- screen-x=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Blackstone on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on YouTube. YouTube did not include readable video titles. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: Jonathan Gray Blackstone on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: n…
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### R03 - Related Companies / Stephen Ross
- Ground truth to be confirmed by Richard: Stephen Ross - assumed Related founder; title unverified

### R04 - Tishman Speyer / Rob Speyer
- Ground truth to be confirmed by Richard: Rob Speyer - assumed Tishman Speyer executive; title unverified

### R05 - Hines / Jeff Hines
- Ground truth to be confirmed by Richard: Jeff Hines - assumed Hines executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.hines.com. blocked by site, ask applicant for a team-page URL Couldn't check for free. Not checkable for free.
- screen-x=UNAVAILABLE: Searched: "Jeff Hines" hines on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jeff Hines" hines on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Hines on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=UNAVAILABLE: Searched: "Jeff Hines" hines on YouTube. YouTube did not include readable video titles. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: Jeff Hines Hines on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jeff Hines" "hines" / "Hines" "hines". No result found that names this person and this company. Name: no. Company: no. City: no. Confidenc…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company, without a negative term tying them together. Google News, Bing News responded. Unavailable: GDELT.

### R06 - Silverstein Properties / Larry Silverstein
- Ground truth to be confirmed by Richard: Larry Silverstein - assumed Silverstein Properties founder; title unverified

### R07 - Veris Residential (company only)
- Ground truth to be confirmed by Richard: Mahbod Nia - assumed Veris Residential executive; chosen by bench author, unverified

### R08 - Hovnanian Enterprises / Ara Hovnanian
- Ground truth to be confirmed by Richard: Ara Hovnanian - assumed Hovnanian Enterprises executive; title unverified. hovnanian.com does not resolve from the box, so the corporate site khov.com is used.

### R09 - Toll Brothers (company only)
- Ground truth to be confirmed by Richard: Douglas Yearley - assumed Toll Brothers executive; chosen by bench author, unverified

### R10 - Greystar (company only)
- Ground truth to be confirmed by Richard: Bob Faith - assumed Greystar founder; chosen by bench author, unverified

### F02 - Control 2: invented firm, mailinator, no site/LinkedIn
- Caps applied: Capped at F: The email domain is disposable (Bundled disposable-domain list).

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:33585/F04/

### F04b - Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-code phone, and a social URL - tests how close a cosmetic fake gets to grade C
- Self-hosted fixture page at http://127.0.0.1:33585/F04b/

### F05 - Control 5: fraud text with invented firm
- Caps applied: Capped at F: The write-up matches a fraud pattern: guaranteed returns together with a request to send funds (Local text heuristic).

### F06a - Control 6a: real OFAC SDN individual + location matching the list (full OFAC cache)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)
- Caps applied: Capped at F: A sanctions list name matches, and the location or date of birth on the application lines up with the list entry (OFAC SDN cache). Confirm the entry before you decide.

### F06b - Control 6b: same SDN individual, US location (name-only match, uncorroborated)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)

### F07b - Control 7b: real exec (Larry Silverstein) paired with Toll Brothers + Toll Brothers' real site
- Caps applied: Capped at D: no free source corroborated the person and the company

### F08b - Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:33585/F08b/

### R11 - CBRE Group / Bob Sulentic (company only)
- Ground truth to be confirmed by Richard: Bob Sulentic is assumed to be associated with CBRE Group. The person link is unverified.

### R12 - Madison Realty Capital / Josh Zegen (company only)
- Ground truth to be confirmed by Richard: Josh Zegen is assumed to be associated with Madison Realty Capital. The person link is unverified.

### R13 - Cole Schotz / Richard Abramson (company only)
- Ground truth to be confirmed by Richard: Richard Abramson is assumed to be associated with Cole Schotz. The person link is unverified.
- False negative: grade D / NEEDS MORE INFO.
- linkedin-fetch=INCONCLUSIVE: Searched: https://www.linkedin.com/company/cole-schotz-pc/. No result found that names this person and this company. Name: no. Company: no. City: no.…
- screen-x=UNAVAILABLE: Searched: "Richard Abramson" cole on X. The company website links https://x.com/coleschotz, and X blocked automated access. Couldn't check for free. …
- screen-facebook=INCONCLUSIVE: Searched: "Richard Abramson" cole on Facebook. Found: Cole Schotz P.C. / Hackensack NJ Name: no. Company: yes. City: yes. Confidence: medium.
- screen-instagram=UNAVAILABLE: Searched: Cole Schotz on Instagram. The company website links https://www.instagram.com/cole_schotz_pc, and Instagram blocked automated access. Could…
- screen-youtube=UNAVAILABLE: Searched: "Richard Abramson" cole on YouTube. YouTube did not include readable video titles. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: Richard Abramson Cole Schotz on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidenc…
- screen-news=INCONCLUSIVE: Searched: "Richard Abramson" "cole schotz" / "Abramson" "cole schotz". No result found that names this person and this company. Name: no. Company: no…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### R14 - Parke Bancorp / Vito Pantilione (company only)
- Ground truth to be confirmed by Richard: Vito Pantilione is assumed to be associated with Parke Bancorp. The person link is unverified.
- Caps applied: Capped at C: fewer than two independent sources tied this person to this company

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 2296 |
| SEC company_tickers | 200 | 149 |
| SEC efts (URL as used by edgar.ts) | 200 | 1712 |
| DuckDuckGo html | 202 | 168 |
| Bing web | 200 | 160 |
| Google News RSS | 200 | 629 |
| GDELT doc API | 429 | 11714 |
| OFAC sdn.csv (HEAD) | 200 | 9684 |
| rdap.org | 200 | 316 |
| OpenSanctions API (expected 401) | 401 | 287 |
| OpenCorporates API (expected 401) | 401 | 622 |
| DNS MX gmail.com (ok) | 200 | 21 |

UNAVAILABLE counts per check across 28 cases: website=6, screen-x=28, screen-facebook=23, screen-instagram=28, screen-youtube=28, opencorporates=28, opensanctions=28, linkedin-fetch=14, screen-web=2, web-footprint=1, business-registry=2, courts=2.

## Change vs after-batch2

| Case | Before | After | Result before -> after |
|---|---|---|---|
| R01 | C 73 APPROVE WITH CONDITIONS | C 73 APPROVE WITH CONDITIONS | PASS -> PASS |
| R02 | D 65 NEEDS MORE INFO | D 65 NEEDS MORE INFO | PASS -> PASS |
| R03 | C 75 APPROVE WITH CONDITIONS | C 75 APPROVE WITH CONDITIONS | PASS -> PASS |
| R04 | C 71 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| R05 | D 63 NEEDS MORE INFO | D 63 NEEDS MORE INFO | PASS -> PASS |
| R06 | C 79 APPROVE WITH CONDITIONS | C 79 APPROVE WITH CONDITIONS | PASS -> PASS |
| R07 | B 81 APPROVE WITH CONDITIONS | B 81 APPROVE WITH CONDITIONS | PASS -> PASS |
| R08 | B 81 APPROVE WITH CONDITIONS | C 73 APPROVE WITH CONDITIONS | PASS -> PASS |
| R09 | B 81 APPROVE WITH CONDITIONS | B 81 APPROVE WITH CONDITIONS | PASS -> PASS |
| R10 | C 71 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| F01 | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F02 | F 40 DECLINE | F 40 DECLINE | PASS -> PASS |
| F03a | F 58 NEEDS MORE INFO | F 50 NEEDS MORE INFO | PASS -> PASS |
| F03b | D 65 NEEDS MORE INFO | F 54 NEEDS MORE INFO | PASS -> PASS |
| F04 | D 62 NEEDS MORE INFO | F 54 NEEDS MORE INFO | PASS -> PASS |
| F04b | D 67 NEEDS MORE INFO | F 59 NEEDS MORE INFO | PASS -> PASS |
| F05 | F 40 DECLINE | F 40 DECLINE | PASS -> PASS |
| F06a | F 36 DECLINE | F 36 DECLINE | PASS -> PASS |
| F06b | F 36 NEEDS MORE INFO | F 36 NEEDS MORE INFO | PASS -> PASS |
| F06c | F 36 NEEDS MORE INFO | F 36 NEEDS MORE INFO | PASS -> PASS |
| F07a | F 52 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F07b | D 62 NEEDS MORE INFO | D 62 NEEDS MORE INFO | PASS -> PASS |
| F08a | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F08b | D 62 NEEDS MORE INFO | F 54 NEEDS MORE INFO | PASS -> PASS |
| R11 | C 73 APPROVE WITH CONDITIONS | C 73 APPROVE WITH CONDITIONS | PASS -> PASS |
| R12 | C 71 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| R13 | D 64 NEEDS MORE INFO | D 67 NEEDS MORE INFO | PASS -> PASS |
| R14 | B 81 NEEDS MORE INFO | C 73 NEEDS MORE INFO | PASS -> PASS |

### Per-check status flips vs after-batch2 (network flakiness or live-data drift)

- R01: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R02: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R03: screen-youtube PASS->UNAVAILABLE; screen-news PASS->INCONCLUSIVE; screen-web UNAVAILABLE->PASS
- R04: screen-youtube PASS->UNAVAILABLE; courts UNAVAILABLE->PASS
- R05: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R06: screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R07: screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R08: website PASS->INCONCLUSIVE; linkedin-fetch INCONCLUSIVE->UNAVAILABLE; screen-facebook INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; screen-news INCONCLUSIVE->PASS; screen-web UNAVAILABLE->PASS
- R09: screen-youtube PASS->UNAVAILABLE
- R10: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- F01: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE
- F02: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE; courts UNAVAILABLE->PASS
- F03a: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; web-footprint PASS->UNAVAILABLE
- F03b: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint PASS->INCONCLUSIVE
- F04: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint PASS->INCONCLUSIVE
- F04b: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint PASS->INCONCLUSIVE
- F05: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE
- F06a: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE
- F06b: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE; business-registry UNAVAILABLE->INCONCLUSIVE
- F06c: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE; business-registry INCONCLUSIVE->UNAVAILABLE
- F07a: screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint PASS->INCONCLUSIVE; business-registry UNAVAILABLE->INCONCLUSIVE
- F07b: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE
- F08a: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE
- F08b: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint PASS->INCONCLUSIVE
- R11: screen-instagram INCONCLUSIVE->UNAVAILABLE; screen-youtube PASS->UNAVAILABLE; screen-news PASS->INCONCLUSIVE; screen-web UNAVAILABLE->PASS; courts UNAVAILABLE->PASS
- R12: screen-youtube PASS->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R13: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->PASS
- R14: screen-youtube INCONCLUSIVE->UNAVAILABLE; screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint PASS->INCONCLUSIVE
