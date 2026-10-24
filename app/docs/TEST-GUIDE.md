# Test guide

Use this on the deployed site or on a local server. The demo password for seeded members, including the admin, is `cornicio-demo`. Sign in as Marcus Hale (`marcus.hale@halerow.example`) for the admin screens. Open a private window when you want a member session and an admin session at the same time.

Nothing on this test charges a card. Every email notice is stored in the Outbox and addressed only to `rich@privatefloorclub.com` (or `NOTICE_TEST_RECIPIENT` if that env var is set).

The logo on forest backgrounds is a stand-in PF mark and reversed lockup. The approved files in `richardosika/private-floor-site` `tools/brand-src` were not readable from the build environment.

## Member side

1. Open `/apply`.
2. Step 1, **Invite code**. Enter `PF-7K2M-91QX`, or choose **Request an invite** and finish that form on the home page. An admin copies the new code from `/admin`. The code is not emailed.
3. Step 2, **Choose role**. Pick a general contractor to see $2,400, a broker to see $1,800, an attorney to see $1,200, or a developer, investor, family office, or lender to see no annual dues.
4. Step 3, **Your details**. Fill name, email, a password of at least 8 characters, company, and city/state. Phone, LinkedIn, website, social links, references, and the track-record note are optional. Upload a JPG or PNG business card and confirm the screen shows the file name, type, size, and a preview.
5. Still on step 3, **Confirm your email**. Send the code. Open `/admin/outbox` in the admin session and read the 6-digit code. Confirm it, then continue. The code is not sent to the address you typed.
6. Step 4, **Terms**. The page shows the “Before you submit” text and two unchecked boxes, using the sentences in `src/content/legal/applicant-consent.md`. Open `/legal/terms`, `/legal/privacy`, `/legal/disclosures`, `/legal/guidelines`, `/legal/applicant-consent`, and `/legal/verification-policy`. Each page shows **Draft - pending attorney review** and the version from the file’s `Version:` line. Continue stays disabled until both boxes are checked.
7. Step 5, **Membership dues**. Confirm the amount and the line **Founding member: dues waived during testing**. Both boxes are still required. The helper under **Submit application** is the sentence from the consent draft. Submit. There is no payment form. The acceptance rows store the time and each document’s parsed version.
8. Open **View application status**. It should say **Application under review** and **Verification in progress**. It must not show a score or a source.
9. In the admin session, open the application, choose **Needs more info**, and write what you need. Reload the status page, reply with a note, and optionally upload a file. The status returns to in review.
10. Approve the application as an Invited member. Sign in with the new email and password. The feed shows **Membership status** and a first-week checklist: profile, directory, community guidelines, a seeking or raising post, and an introduction. Directory and guidelines have **Mark done**. The other three complete when you save a profile, post, or request an introduction.
11. Sign in with a wrong password. The message stays generic. Sign in with the right password on an application that is still open. The message says the application is under review. On a declined application the message says it was not approved, with no reasons.

## Admin side

1. `/admin` shows open applications, the Outbox count, and test applications.
2. `/admin/test`. Choose **Create sample applicants**. Six labelled TEST people appear:
   - Strong legit (offline fixtures, recommendation LEGIT)
   - Ambiguous (phone area code does not match the state)
   - Alexei Sanctionhit in Newark, company starting with TEST (recommendation NOT LEGIT). The person name is the fake watchlist name so the match is not diluted. The row is marked TEST.
   - Thin Gmail file
   - Disposable email with no site or LinkedIn
   - Duplicate of Marcus Hale
3. `/admin/applications`. The default filter is **Needs action** (open applications, including ones that already have a verdict). Other filters: New, In review, Needs info, Recommended legit, Recommended not legit, Needs your decision, Approved, and Declined. Sort by submitted time and by score. Times are America/New_York. Select rows and **Delete selected**, or open a row and **Delete this applicant and all their data**. Both write an audit event.
4. Open a row. Read the applicant, the business card if one was uploaded, the automated report, the company report, and the evidence table. Save an internal note. **Re-run verification** calls the live free sources and can change a sample verdict. Approve, decline, or ask for more info. The decision log records who, when, and the note. A decline does not put that note on the member status page.
5. `/admin/outbox` lists every test notice.
6. `/admin/audit` lists decisions, verification runs, and moderation events.
7. `/admin/sources` lists sources, the OFAC cache time, and **Refresh watchlists now**.
8. `/admin/members` and a member’s page show legal acceptances after an approval (document, version, time, IP hash).
9. **Delete all test data** removes `is_test` applications and leftover `is_test` members, including a custom test applicant. It asks for confirmation. Seeded demo members that are not `is_test` stay.
10. **Create a test applicant** takes a name, company, email, and website, marks the row `is_test`, and queues a live verification run. Use it for a public company or a made-up name without going through `/apply`.

## After signup

Sign in as a member. Nothing here shows another member’s email or phone. Badges say **Verified** or **Verification in progress**. Wording says Private Floor administrator. No dues are charged.

1. **Feed.** Complete the checklist. Post an update, a raising post, or a seeking post. Raising and seeking show the Seeking and Raising rules and require the acknowledgement box. A post that mentions IRR, a percent, accredited investors, a subscription, or similar language is held and does not appear for other members.
2. **Profile** (`/profile`). Edit markets, deal types, asset classes, check size or deal size, what you are looking for, what you offer, bio, website, and an optional business card.
3. **Network** (`/network`). Search and filter by role, state, deal type, and asset class. **Request introduction** sends a short note. The other member accepts or declines on Network. Accept opens a thread in Messages. Decline does not.
4. **Messages.** Reply in the thread. Block and report stay on the member profile and in the thread. Unread messages show on the Messages tab.
5. **Deals.** Search and filter, including any US state. Open a deal, read the Deal-Room NDA, and request access. The room lists document name, type, and size only. The sponsor can remove a participant. Close or edit your own post from the deal page.
6. **Alerts** and **Settings** (`/settings`). The bell lists in-app notices. Settings cover email copies of those notices, a password change, **Export my data**, and a deletion request. Email copies still land only in the Outbox for the test recipient.
7. **Admin.** `/admin` shows the application funnel, active members, posts, and introductions. `/admin/moderation` is the queue for flagged posts and open reports. A member page can suspend, reinstate, or remove a non-admin.
8. **Test console.** **Seed sample members** adds Dana, Gabe, and Lena Testfloor (`test.dev.floor@example.com`, `test.gc.floor@example.com`, `test.lp.floor@example.com`, password `cornicio-demo`). They are `is_test`. Dana has a published seeking post and a held post, Gabe has an accepted thread with Dana and a pending introduction to Lena, and Gabe can open Dana’s deal room. **Delete all test data** removes them with the other `is_test` rows.

Also open `/legal/seeking-raising` and `/legal/deal-room-nda`. Both show the draft banner and the version line.

## What the offline samples are for

The strong LEGIT row is there so you can see that verdict without waiting on EDGAR, CourtListener, or web search. Re-run that row if you want to see which live sources answered from the server you are using. A blocked source is unavailable and is listed under “What I could not check for free.” A source that answers with no match is “No data found.” Neither one approves anyone.
