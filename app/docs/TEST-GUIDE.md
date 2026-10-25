# Test guide

Use this on the deployed site or on a local server. Seeded members use the password `cornicio-demo`. Administrators sign in only at `/admin/login` (also linked as **Admin**, with a brass shield, from the home page, the member sign-in page, apply, and the legal pages). Marcus Hale is `marcus.hale@halerow.example`.

When `ADMIN_PASSWORD` is set to at least 12 characters, the server replaces every administrator password with that value at startup. `cornicio-demo` then stops working for administrators and still works for members. A shorter value is ignored. If `ADMIN_PASSWORD` is unset, Marcus’s password remains `cornicio-demo`, but only on `/admin/login`.

The member sign-in page does not accept an administrator, and it uses the same generic error it uses for a wrong password. `/admin/login` does not accept a member, including a member password that is correct, and it uses that same generic error. After an administrator signs in, the next page is `/admin`. Open a private window when you want a member session and an administrator session at the same time.

Nothing on this test charges a card. Every email notice is stored in the Outbox and addressed only to `rich@privatefloorclub.com` (or `NOTICE_TEST_RECIPIENT` if that env var is set).

When `SITE_GATE_PASSWORD` is set, the browser asks for HTTP Basic username `privatefloor` and that password before any page, script, or API call. `/api/health` and `/api/stripe/webhook` do not ask. After the browser accepts the password, it sends that header again on same-origin requests, so `/login`, `/admin/login`, and the Auth.js calls from those pages keep working. When `SITE_GATE_PASSWORD` is unset, nothing asks for that password. Responses send `X-Robots-Tag: noindex, nofollow`, and `/robots.txt` disallows every path.

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

1. Open `/admin/login` from the **Admin** link, or go there directly. The title is **Private Floor administrator**. Sign in as Marcus Hale. `/admin` shows open applications, the Outbox count, and test applications. The signed-in nav keeps **Admin**, with the same brass shield. Signing in as Marcus on `/login`, or as a member on `/admin/login`, stays on that page and shows **Those credentials were not recognized.**
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

## Command center

The admin home is `/admin`. A person who is not an administrator is sent back to the floor. The check runs on the server.

1. The top strip is **Needs your attention**. Each tile is a count and a link: applications awaiting a decision, needs-more-info replies, payments due or failed, reports, flagged posts, introductions and deal rooms, and CRM follow-ups due. A count above zero uses a brass border.
2. **Funnel** shows submitted, in review, approved, payment due, declined, and active members. **Last 7 days** shows new applications, decisions, Outbox notices, and new members. **Recent activity** is the audit log, newest first, and opens the full log.
3. The left navigation groups Applications & Verification, Members, Payments, CRM, Email templates & Outbox, Moderation, Content/Legal versions, Help, Settings, Audit log, and Test console. On a phone, open **Admin menu**. The command center link is active only on `/admin`.
4. **Payments** lists members who owe dues, paid, were waived, failed, or have a refund note. Due and failed rows are marked. Open the member to mark paid, waive, or resend the link.
5. **Introductions and deal rooms** lists pending introductions by name and note. The member still accepts or declines. Deal-room requests stay on the same page.
6. **Legal versions** lists each draft, its version line, and a link to the public page. Five of them are marked recorded at signup.
7. **Settings** shows the test recipient (`NOTICE_TEST_RECIPIENT`) and a Test / Live choice in large type. Test stores notices in the Outbox for that recipient. Live is saved for a later mail provider and still does not email anyone. The dues table shows the flat annual amounts. It is not an editor. **Sources and watchlists** is linked from the same page.
8. Invite requests and new codes stay on the command center. Issuing a code puts the information email in the Outbox. Copy the code. Applicants are not emailed.

## Help

Help is the button on the lower right of signup, the public pages, and the signed-in floor.

1. Open Help on `/apply` or after sign-in. Ask what a general contractor pays. The answer includes **$2,400 a year**, says it is not legal, tax, or investment advice, and does not promise approval. With no `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, the answer is the keyword FAQ. If a key is set, Help still answers only from the retrieved pages.
2. Ask whether you will be approved, ask for legal or investment advice, or ask for a verification score or a source list. Help refuses, does not invent an outcome, and points to **connect@privatefloorclub.com**. A prompt that says to ignore the rules gets the same refusal.
3. Ask something the pages do not cover. Help says it is not sure and offers the same email. Thumbs up and thumbs down stick to that question in the browser session.
4. `/admin/help` lists questions, with filters for unanswered, refused, and thumbs down. The list has the question text and the answer. It does not show a name or email. `/admin/help/faq` edits the articles Help retrieves. Unpublished articles drop out. The legal drafts stay in their files.
5. Help pauses after 20 questions in an hour for that browser session.

## Project filters

Deals (`/deals`), the Ledger (`/feed`), and the directory (`/network`) share one filter bar. The address bar is the filter. Copy link copies that URL. A saved filter is stored for you on that page only.

1. On `/deals`, set asset class, a state, project stage (land / entitlement, pre-construction, under construction, stabilized, recap), capital size, what is needed (equity, debt, GC, broker, legal / advisory), the poster’s role, and a posted window (7, 30, or 90 days). Add a keyword. Choose newest, oldest, or best match. Apply. The result count names the filters that are on. Clear returns to every public deal.
2. Open Saved filters, name the current link, and save it. The named link comes back. Remove deletes only that saved row.
3. On `/feed`, the same project filters apply to posts. The For you, Deals, Seeking, and My circle tabs keep the filters. A new raising or seeking post asks for stage and what is needed.
4. On `/network`, filter by asset class (including condo and storage), state, deal type, what is needed, and role. Sort by name or newest. Stage, capital size, and posted date stay on deals and posts.

## Round 2 checks

1. A suspended member who is already signed in lands on **Account suspended**, with a sign-out button and connect@privatefloorclub.com. They are not sent back and forth between sign-in and the floor.
2. The application report and the company report use the same website result. A made-up name on example.com is not a pass.
3. Help answers what a general contractor pays ($2,400 a year; brokers $1,800; attorneys and advisors $1,200; developers, investors, family offices, and lenders free; paid after approval), why a post was held, and how to request an introduction. Those answers have no `[DATE]` and no raw markdown.
4. Signup step 4 shows those dues. Draft wording stays on the legal pages as the banner. Member-facing text uses October 24, 2026 instead of `[DATE]`.
5. A payment-due member is absent from the directory and cannot receive an introduction until the dues are recorded.
6. A seeking post keeps the dollar band you picked. **$5M+** is not shown as Other scope.
7. Delete applicant also removes the CRM person and the linked member account. CRM people, invite requests, and invite codes have their own delete controls. **Delete records from the last N hours** is on the test console, separate from Delete all test data.
8. The news check reads Google News RSS, Bing News RSS, and GDELT for the quoted person, the quoted company, and the company plus city. Matching headlines show the source, the New York date, and an Open article link. A blocked feed is listed under what could not be checked for free.
9. Accepting an introduction notifies the requester. Approving a deal room notifies the requester. Email subjects do not include the founder sign-off. That line stays at the end of the letter. Pay dues says dues are waived only when an administrator waived them. A simulated payment is labelled TEST. Renewal dates are America/New_York calendar dates. Data export downloads a file that includes the member's own email. A member reply is separate from the track record and shows a New York time. An application with no report has **Run verification** on the list.

## What the offline samples are for

The strong LEGIT row is there so you can see that verdict without waiting on EDGAR, CourtListener, or web search. Re-run that row if you want to see which live sources answered from the server you are using. A blocked source is unavailable and is listed under “What I could not check for free.” A source that answers with no match is “No data found.” Neither one approves anyone.
