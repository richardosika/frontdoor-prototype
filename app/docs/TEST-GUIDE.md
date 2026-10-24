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
7. Step 5, **Membership dues**. Confirm the amount and the line **Founding member: dues waived during testing**. A paying role also says the flat amount is due after approval and that no card is collected on the form. Both boxes are still required. The helper under **Submit application** is the sentence from the consent draft. Submit. There is no payment form on the application. The acceptance rows store the time and each document’s parsed version.
8. Open **View application status**. It should say **Application under review** and **Verification in progress**. It must not show a score or a source.
9. In the admin session, open the application, choose **Needs more info**, and write what you need. Reload the status page, reply with a note, and optionally upload a file. The status returns to in review.
10. Approve the application as an Invited member. A developer, investor, family office, or lender can sign in and open the floor. A general contractor, broker, or attorney is **Approved, payment due** and the sign-in stops on Pay dues until the test payment, a manual mark-paid, or a waiver. After the floor opens, the feed shows **Membership status** and a first-week checklist: profile, directory, community guidelines, a seeking or raising post, and an introduction. Directory and guidelines have **Mark done**. The other three complete when you save a profile, post, or request an introduction.
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

Sign in as a member whose dues are not outstanding. Nothing here shows another member’s email or phone. Badges say **Verified** or **Verification in progress**. Wording says Private Floor administrator. A paying role that has not paid sees only the Pay dues page.

1. **Feed.** Complete the checklist. Post an update, a raising post, or a seeking post. Raising and seeking show the Seeking and Raising rules and require the acknowledgement box. A post that mentions IRR, a percent, accredited investors, a subscription, or similar language is held and does not appear for other members.
2. **Profile** (`/profile`). Edit markets, deal types, asset classes, check size or deal size, what you are looking for, what you offer, bio, website, and an optional business card.
3. **Network** (`/network`). Search and filter by role, state, deal type, and asset class. **Request introduction** sends a short note. The other member accepts or declines on Network. Accept opens a thread in Messages. Decline does not.
4. **Messages.** Reply in the thread. Block and report stay on the member profile and in the thread. Unread messages show on the Messages tab.
5. **Deals.** Search and filter, including any US state. Open a deal, read the Deal-Room NDA, and request access. The room lists document name, type, and size only. The sponsor can remove a participant. Close or edit your own post from the deal page.
6. **Alerts** and **Settings** (`/settings`). The bell lists in-app notices. Settings cover email copies of those notices, a password change, **Export my data**, and a deletion request. Email copies still land only in the Outbox for the test recipient.
7. **Admin.** `/admin` shows the application funnel, active members, posts, and introductions. `/admin/moderation` is the queue for flagged posts and open reports. A member page can suspend, reinstate, or remove a non-admin.
8. **Test console.** **Seed sample members** adds Dana, Gabe, and Lena Testfloor (`test.dev.floor@example.com`, `test.gc.floor@example.com`, `test.lp.floor@example.com`, password `cornicio-demo`). They are `is_test`. Dana has a published seeking post and a held post, Gabe has an accepted thread with Dana and a pending introduction to Lena, and Gabe can open Dana’s deal room. **Delete all test data** removes them with the other `is_test` rows.

Also open `/legal/seeking-raising` and `/legal/deal-room-nda`. Both show the draft banner and the version line.

## Dues after approval

Nothing in this section charges a real card. If `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the matching `STRIPE_PRICE_GC`, `STRIPE_PRICE_BROKER`, or `STRIPE_PRICE_ADVISOR` are all set, Pay dues uses Stripe Checkout in test mode (annual subscription). If any of those is missing, the page is labelled **TEST** and uses the simulated payment buttons. Private Floor stores no card number.

Flat annual dues, chosen from the approved role: general contractor $2,400, broker or mortgage broker $1,800, attorney or advisor $1,200. Developers, investors and LPs, family offices, and lenders are free and become active as soon as you approve them. The fee is never based on a deal.

1. On `/admin/test`, choose **Seed payment-due member**. Gina Paytest (`test.gc.pay@example.com`, password `cornicio-demo`) is an is_test general contractor with status **Approved, payment due**.
2. `/admin/applications` (filter **Approved**) shows a payment status column. Open her row or `/admin/members`. The dues panel shows **Payment due**, $2,400 a year, and no renewal date yet.
3. `/admin/outbox` is where the approval notice goes when you approve a new paying applicant. The notice is addressed only to the test recipient and contains `/pay/` plus a token. **Resend payment link** writes another Outbox notice.
4. Sign out of the admin session. Open that `/pay/…` link, or sign in as Gina. The floor redirects to **Pay dues**. The page shows the amount, what the year covers, the founding-member line, and a link to `/legal/membership-dues`. The rest of the floor stays closed, including the feed, directory, and settings. **Sign out** is on the page.
5. Choose **Simulate a failed payment**. The status becomes **Payment failed**. The Outbox gets a failed-payment notice. Sign-in still stops on Pay dues.
6. Choose **Pay dues (test)**. The notice says no card was charged. The floor opens, the application moves to **Approved**, and a welcome notice is in the Outbox. Signing in again lands on the feed and the first-week checklist.
7. **Settings** shows the receipt: amount, simulated TEST mode, paid time, renewal date one year out, and **No card on file**. The billing portal button appears only after a Stripe test checkout that stored a customer id.
8. As admin, **Mark paid** records a manual payment and an audit event. **Waive dues** asks for a reason, comps the membership, and writes an audit event. **Save refund note** asks for a note, sets the status to refund noted, and closes the floor again until dues are paid. **Send renewal reminder** and **Send failed-payment notice** write Outbox notices. The renewal reminder needs a renewal date.
9. Approve a developer. The status is **Approved** immediately, the welcome notice does not include a payment link, and sign-in opens the floor.

## Email templates and people

Templates are at `/admin/templates`. The people board is at `/admin/crm`.

1. `/admin/templates` lists nine letters: information, thank you, welcome, needs more info, approved, declined, payment due, dues reminder, and renewal. The delivery flag offers **Outbox (test)** and **Live (not connected)**. Saving Live still writes only to the Outbox for the test recipient. It does not email the person.
2. Open a template. The preview fills `{first_name}` and the other tokens with sample values, and the letter ends with **Richard Osika, Founder**. Change a sentence, **Save version**, and the version list grows. **Restore** saves that older text as a new version. **Send test to the test recipient** puts a `[test]` copy in `/admin/outbox`.
3. Submit an application. The Outbox thank-you uses the saved template. Approve a free role and the approved letter is used. Approve a paying role and the payment-due letter is used. Needs-more-info includes the note you wrote. Decline does not include a reason. A recorded payment sends the welcome letter. A failed test payment sends the dues reminder. A renewal reminder sends the renewal letter.
4. `/admin/crm` is the pipeline: Invited, Applied, In review, Approved, Active, Declined. Search by name, email, company, or tag. **Follow-ups due** filters the board. **Export CSV** downloads the rows.
5. Open a person. The timeline shows the invite, application, emails, verification run, decision, and payment when those exist. Add a note. Set a follow-up date, tags, and an owner. Check **Do not contact**, write a reason, and save. The next letter to that email is stored in the Outbox as **Not sent** with the reason, and the timeline says the same.
6. **Add a prospect** mints an invite code and, with the box checked, puts the information email in the Outbox. Issuing a code for an invite request does the same. **Send information email** on a person sends it again. The applicant is not emailed.

## What the offline samples are for

The strong LEGIT row is there so you can see that verdict without waiting on EDGAR, CourtListener, or web search. Re-run that row if you want to see which live sources answered from the server you are using. A blocked source is unavailable and is listed under “What I could not check for free.” A source that answers with no match is “No data found.” Neither one approves anyone.
