# Verification benchmark - after-qa

Rubric 2026-10-25. Run started 10/26/2026, 2:14:35 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | real (company only) | Prologis (company only) | not F/DECLINE; company-only corroboration | C | 75 | Medium | APPROVE WITH CONDITIONS | 79 LEGIT | 70.2% / 69.2% | **PASS** |
| R02 | real | Blackstone / Jonathan Gray | not F/DECLINE; company corroborated where public | D | 67 | Medium | NEEDS MORE INFO | 70 NEEDS_OWNER_DECISION | 65.2% / 59% | **PASS** FN |
| R03 | real | Related Companies / Stephen Ross | not F/DECLINE; company corroborated where public | C | 77 | Medium | APPROVE WITH CONDITIONS | 67 NEEDS_OWNER_DECISION | 62.7% / 53.8% | **PASS** |
| R04 | real | Tishman Speyer / Rob Speyer | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 69 NEEDS_OWNER_DECISION | 64.5% / 58.1% | **PASS** |
| R05 | real | Hines / Jeff Hines | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 62 NEEDS_OWNER_DECISION | 55.3% / 38.5% | **PASS** FN |
| R06 | real | Silverstein Properties / Larry Silverstein | not F/DECLINE; company corroborated where public | C | 79 | Medium | APPROVE WITH CONDITIONS | 68 NEEDS_OWNER_DECISION | 63.6% / 56.1% | **PASS** |
| R07 | real (company only) | Veris Residential (company only) | not F/DECLINE; company-only corroboration | B | 83 | Medium | APPROVE WITH CONDITIONS | 79 LEGIT | 70.2% / 69.2% | **PASS** |
| R08 | real | Hovnanian Enterprises / Ara Hovnanian | not F/DECLINE; company corroborated where public | C | 73 | Medium | APPROVE WITH CONDITIONS | 77 LEGIT | 68.5% / 65.9% | **PASS** |
| R09 | real (company only) | Toll Brothers (company only) | not F/DECLINE; company-only corroboration | C | 79 | Medium | APPROVE WITH CONDITIONS | 82 LEGIT | 73.3% / 75.6% | **PASS** |
| R10 | real (company only) | Greystar (company only) | not F/DECLINE; company-only corroboration | D | 67 | Medium | NEEDS MORE INFO | 66 NEEDS_OWNER_DECISION | 58.8% / 46.3% | **PASS** FN |
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 40.9% / 9.1% | **PASS** |
| F02 | fake | Control 2: invented firm, mailinator, no site/LinkedIn | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 35 NOT_LEGIT | 43% / 0% | **PASS** |
| F03a | fake | Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no s… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 50 | Low | NEEDS MORE INFO | 57 NEEDS_OWNER_DECISION | 49% / 27.3% | **PASS** |
| F03b | fake | Control 3b: impersonation - made-up person + 'Prologis' + the REAL pr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 56 | Low | NEEDS MORE INFO | 63 NEEDS_OWNER_DECISION | 55.6% / 37.1% | **PASS** |
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 47 NEEDS_OWNER_DECISION | 43.6% / 15.2% | **PASS** |
| F04b | fake | Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-co… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 59 | Low | NEEDS MORE INFO | 54 NEEDS_OWNER_DECISION | 50.3% / 15.2% | **PASS** |
| F05 | fake | Control 5: fraud text with invented firm | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 40 NOT_LEGIT | 43.9% / 9.1% | **PASS** |
| F06a | fake | Control 6a: real OFAC SDN individual + location matching the list (fu… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | DECLINE | 37 NOT_LEGIT | 44.7% / 9.1% | **PASS** |
| F06b | fake | Control 6b: same SDN individual, US location (name-only match, uncorr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 35 NEEDS_OWNER_DECISION | 44.7% / 9.1% | **PASS** |
| F06c | fake | Control 6c: BUG PROBE - same as F01 but with an EMPTY watchlist cache… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 41 NEEDS_OWNER_DECISION | 34.2% / 9.1% | **PASS** |
| F07a | fake | Control 7a: real exec (Stephen Ross) paired with a different real com… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 40.9% / 9.1% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 60 | Low | NEEDS MORE INFO | 59 NEEDS_OWNER_DECISION | 55.6% / 42.9% | **PASS** |
| F08a | fake | Hard fake 8a: copycat spelling of Blackstone, made-up person, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 40.9% / 9.1% | **PASS** |
| F08b | fake | Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 50 NEEDS_OWNER_DECISION | 43.6% / 15.2% | **PASS** |
| R11 | real (company only) | CBRE Group / Bob Sulentic (company only) | not F/DECLINE; company-only corroboration | C | 75 | Medium | APPROVE WITH CONDITIONS | 76 LEGIT | 67.7% / 64.1% | **PASS** |
| R12 | real (company only) | Madison Realty Capital / Josh Zegen (company only) | not F/DECLINE; company-only corroboration | C | 71 | Medium | APPROVE WITH CONDITIONS | 66 NEEDS_OWNER_DECISION | 62.1% / 53.5% | **PASS** |
| R13 | real (company only) | Cole Schotz / Richard Abramson (company only) | not F/DECLINE; company-only corroboration | D | 67 | Medium | NEEDS MORE INFO | 62 NEEDS_OWNER_DECISION | 55.3% / 38.5% | **PASS** FN |
| R14 | real (company only) | Parke Bancorp / Vito Pantilione (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | APPROVE WITH CONDITIONS | 76 LEGIT | 67.7% / 64.1% | **PASS** |
| Q01 | qa | QA Turner Construction, prefixed, person QA Tester | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 57 | Low | NEEDS MORE INFO | 59 NEEDS_OWNER_DECISION | 52.9% / 25.7% | **PASS** |
| Q01b | qa | QA Turner Construction, no prefix, person QA Tester | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 57 | Low | NEEDS MORE INFO | 59 NEEDS_OWNER_DECISION | 52.9% / 25.7% | **PASS** |
| Q02 | qa | QA CBRE Group, prefixed, person QA Tester | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 55 | Low | NEEDS MORE INFO | 56 NEEDS_OWNER_DECISION | 50.3% / 31.4% | **PASS** |
| Q02b | qa | QA CBRE Group, no prefix, person QA Tester | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 55 | Low | NEEDS MORE INFO | 56 NEEDS_OWNER_DECISION | 50.3% / 31.4% | **PASS** |
| Q03 | qa | QA Related Companies, prefixed, person QA Tester | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 55 | Low | NEEDS MORE INFO | 53 NEEDS_OWNER_DECISION | 47.8% / 25.7% | **PASS** |
| Q03b | qa | QA Related Companies, no prefix, person QA Tester | QA firm, person unmatched: company-only credit allowed, never APPROVE* | F | 55 | Low | NEEDS MORE INFO | 53 NEEDS_OWNER_DECISION | 47.8% / 25.7% | **PASS** |
| Q04 | qa | QA fake control, prefixed, .example domain | QA fake control: F or D, never APPROVE*, domain does not resolve | F | 47 | Low | NEEDS MORE INFO | 47 NEEDS_OWNER_DECISION | 45.2% / 20% | **PASS** |
| Q04b | qa | QA fake control, no prefix, .example domain | QA fake control: F or D, never APPROVE*, domain does not resolve | F | 47 | Low | NEEDS MORE INFO | 47 NEEDS_OWNER_DECISION | 45.2% / 20% | **PASS** |

## Counts

- Cases: 36; PASS 36, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **4** (R02, R05, R10, R13)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | F01 | F02 | F03a | F03b | F04 | F04b | F05 | F06a | F06b | F06c | F07a | F07b | F08a | F08b | R11 | R12 | R13 | R14 | Q01 | Q01b | Q02 | Q02b | Q03 | Q03b | Q04 | Q04b |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I | P | P | P | P | P | P | P | P |
| text-risk (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | F | N | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P | P | P | P | P | P | I | I | I | P | I | P | I | I | I | I | I | I | I | I | P | P | P | P | I | I | I | I | I | I | I | I |
| business-card (10) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | N | N | N | N | N | N | N | N |
| plausibility (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| business-registry (8) | N | I | I | I | N | I | N | N | N | N | I | I | N | N | I | I | U | N | I | I | I | I | I | N | N | I | N | N | P | P | I | I | I | I | N | N |
| mx (6) | P | P | P | P | P | P | P | P | P | P | P | N | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| rdap (4) | P | P | P | P | P | P | P | P | P | P |  |  |  | P |  |  |  |  |  |  |  | P |  |  | P | P | P | P | P | P | P | P | P | P | F | F |
| website (4) | U | U | P | U | U | P | P | I | P | P | N | N | N | U | P | P | N | N | N | N | N | P | N | P | U | P | P | P | P | P | U | U | P | P | F | F |
| linkedin-fetch (4) | P | P | P | P* | P* | P* | P | U | P | P* | U | U | U | P | U | U | U | U | U | U | U | P | U | U | P | P* | I | U | P | P | U | U | P | P | U | U |
| screen-x (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | I | U | U | I | U | U | U | U | U | U | U | U | U | U | U | U | I | U | U | U | I | I | U | I | I | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-youtube (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | I | I | U | U | U | U | U | U |
| screen-tiktok (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| screen-news (8) | P* | P* | I | P* | I | I | I | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | I | I | I | I | I | I | I | I |
| screen-web (4) | P | P | P* | P* | P | P* | P* | P* | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | P* | P* | P* | I | I | I | I | I | I | I | I |
| web-footprint (8) | P* | P* | P* | P* | P* | P* | P* | P* | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | P* | P* | P* | I | I | I | I | I | I | I | I |
| edgar (12) | P | P | I | I | I | I | P* | P | P* | I | I | I | P | P | I | I | I | I | I | I | I | P | I | I | P | I | I | P | I | I | P | P | I | I | I | I |
| courts (0) | P | P | U | P | I | P | P | P | P | U | U | P | P | P | U | P | P | P | P | I | I | P | P | P | P | P | P | U | P | P | P | P | P | P | P | P |
| opencorporates (0) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| news (8) | P* | I | P* | P* | I | P* | P* | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | P* | I | I | I | I | I | I | I | I |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### R01 - Prologis (company only)
- Ground truth to be confirmed by Richard: Hamid Moghadam - assumed Prologis co-founder/executive; unverified

### R02 - Blackstone / Jonathan Gray
- Ground truth to be confirmed by Richard: Jonathan Gray - assumed Blackstone executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.blackstone.com. blocked by site, ask applicant for a team-page URL Couldn't check for free. Not checkable for free.
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
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Bob Faith" greystar on X. The company website links https://x.com/GreystarApts, and X blocked automated access. Couldn't check for free. N…
- screen-facebook=UNAVAILABLE: Searched: "Bob Faith" greystar on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Greystar on Instagram. The company website links https://www.instagram.com/greystarapartments, and Instagram blocked automated access. Coul…
- screen-youtube=UNAVAILABLE: Searched: "Bob Faith" greystar on YouTube. YouTube did not include readable video titles. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: Bob Faith Greystar on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Bob Faith" "greystar" / "Faith" "greystar". No result found that names this person and this company. Name: no. Company: no. City: no. Conf…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### F02 - Control 2: invented firm, mailinator, no site/LinkedIn
- Caps applied: Capped at F: The email domain is disposable (Bundled disposable-domain list).

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:34025/F04/

### F04b - Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-code phone, and a social URL - tests how close a cosmetic fake gets to grade C
- Self-hosted fixture page at http://127.0.0.1:34025/F04b/

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
- Self-hosted fixture page at http://127.0.0.1:41561/F08b/

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

### Q01 - QA Turner Construction, prefixed, person QA Tester
- Ground truth to be confirmed by Richard: Live QA applicant. The person name is QA Tester and is not a Turner employee. Company string recovered from the 26 Oct 2026 Render grade.

### Q01b - QA Turner Construction, no prefix, person QA Tester
- Ground truth to be confirmed by Richard: Same live QA applicant without the QA-TEST prefix.

### Q02 - QA CBRE Group, prefixed, person QA Tester
- Ground truth to be confirmed by Richard: Live QA applicant. The person is not a CBRE employee. cbre.com blocks this agent. EDGAR should exact-match CBRE Group.

### Q02b - QA CBRE Group, no prefix, person QA Tester
- Ground truth to be confirmed by Richard: Same live QA applicant without the QA-TEST prefix.

### Q03 - QA Related Companies, prefixed, person QA Tester
- Ground truth to be confirmed by Richard: Live QA applicant. The person is not a Related employee.

### Q03b - QA Related Companies, no prefix, person QA Tester
- Ground truth to be confirmed by Richard: Same live QA applicant without the QA-TEST prefix.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 408 |
| SEC company_tickers | 200 | 128 |
| SEC efts (URL as used by edgar.ts) | 200 | 590 |
| DuckDuckGo html | 200 | 631 |
| Bing web | 200 | 104 |
| Google News RSS | 200 | 559 |
| GDELT doc API | 200 | 10984 |
| OFAC sdn.csv (HEAD) | 200 | 8740 |
| rdap.org | 200 | 310 |
| OpenSanctions API (expected 401) | 401 | 287 |
| OpenCorporates API (expected 401) | 401 | 635 |
| DNS MX gmail.com (ok) | 200 | 17 |

UNAVAILABLE counts per check across 36 cases: website=8, screen-x=36, screen-facebook=29, screen-instagram=36, screen-youtube=34, opencorporates=36, opensanctions=36, courts=5, linkedin-fetch=18, business-registry=1.

## Change vs after-followup2

| Case | Before | After | Result before -> after |
|---|---|---|---|
| R01 | C 73 APPROVE WITH CONDITIONS | C 75 APPROVE WITH CONDITIONS | PASS -> PASS |
| R02 | D 65 NEEDS MORE INFO | D 67 NEEDS MORE INFO | PASS -> PASS |
| R03 | C 75 APPROVE WITH CONDITIONS | C 77 APPROVE WITH CONDITIONS | PASS -> PASS |
| R04 | C 71 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| R05 | D 63 NEEDS MORE INFO | D 63 NEEDS MORE INFO | PASS -> PASS |
| R06 | C 79 APPROVE WITH CONDITIONS | C 79 APPROVE WITH CONDITIONS | PASS -> PASS |
| R07 | B 81 APPROVE WITH CONDITIONS | B 83 APPROVE WITH CONDITIONS | PASS -> PASS |
| R08 | C 73 APPROVE WITH CONDITIONS | C 73 APPROVE WITH CONDITIONS | PASS -> PASS |
| R09 | B 81 APPROVE WITH CONDITIONS | C 79 APPROVE WITH CONDITIONS | PASS -> PASS |
| R10 | C 71 APPROVE WITH CONDITIONS | D 67 NEEDS MORE INFO | PASS -> PASS |
| F01 | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F02 | F 40 DECLINE | F 40 DECLINE | PASS -> PASS |
| F03a | F 50 NEEDS MORE INFO | F 50 NEEDS MORE INFO | PASS -> PASS |
| F03b | F 54 NEEDS MORE INFO | F 56 NEEDS MORE INFO | PASS -> PASS |
| F04 | F 54 NEEDS MORE INFO | F 54 NEEDS MORE INFO | PASS -> PASS |
| F04b | F 59 NEEDS MORE INFO | F 59 NEEDS MORE INFO | PASS -> PASS |
| F05 | F 40 DECLINE | F 40 DECLINE | PASS -> PASS |
| F06a | F 36 DECLINE | F 36 DECLINE | PASS -> PASS |
| F06b | F 36 NEEDS MORE INFO | F 36 NEEDS MORE INFO | PASS -> PASS |
| F06c | F 36 NEEDS MORE INFO | F 36 NEEDS MORE INFO | PASS -> PASS |
| F07a | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F07b | D 62 NEEDS MORE INFO | D 60 NEEDS MORE INFO | PASS -> PASS |
| F08a | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F08b | F 54 NEEDS MORE INFO | F 54 NEEDS MORE INFO | PASS -> PASS |
| R11 | C 73 APPROVE WITH CONDITIONS | C 75 APPROVE WITH CONDITIONS | PASS -> PASS |
| R12 | C 71 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| R13 | D 67 NEEDS MORE INFO | D 67 NEEDS MORE INFO | PASS -> PASS |
| R14 | C 73 NEEDS MORE INFO | B 81 APPROVE WITH CONDITIONS | PASS -> PASS |
| Q01 | - | F 57 NEEDS MORE INFO | - -> PASS |
| Q01b | - | F 57 NEEDS MORE INFO | - -> PASS |
| Q02 | - | F 55 NEEDS MORE INFO | - -> PASS |
| Q02b | - | F 55 NEEDS MORE INFO | - -> PASS |
| Q03 | - | F 55 NEEDS MORE INFO | - -> PASS |
| Q03b | - | F 55 NEEDS MORE INFO | - -> PASS |
| Q04 | - | F 47 NEEDS MORE INFO | - -> PASS |
| Q04b | - | F 47 NEEDS MORE INFO | - -> PASS |

### Per-check status flips vs after-followup2 (network flakiness or live-data drift)

- R01: linkedin-fetch INCONCLUSIVE->PASS
- R02: linkedin-fetch INCONCLUSIVE->PASS
- R03: linkedin-fetch INCONCLUSIVE->PASS; courts INCONCLUSIVE->UNAVAILABLE
- R07: linkedin-fetch INCONCLUSIVE->PASS
- R09: linkedin-fetch INCONCLUSIVE->PASS; screen-web UNAVAILABLE->PASS
- R10: courts INCONCLUSIVE->UNAVAILABLE
- F01: courts INCONCLUSIVE->UNAVAILABLE
- F03a: screen-web UNAVAILABLE->INCONCLUSIVE; web-footprint UNAVAILABLE->INCONCLUSIVE
- F03b: linkedin-fetch INCONCLUSIVE->PASS
- F04: courts PASS->UNAVAILABLE
- F05: business-registry INCONCLUSIVE->UNAVAILABLE
- F06c: business-registry UNAVAILABLE->INCONCLUSIVE
- F07b: linkedin-fetch INCONCLUSIVE->PASS; business-registry UNAVAILABLE->INCONCLUSIVE
- R11: linkedin-fetch INCONCLUSIVE->PASS
- R13: courts UNAVAILABLE->PASS
- R14: screen-web INCONCLUSIVE->PASS; web-footprint INCONCLUSIVE->PASS
