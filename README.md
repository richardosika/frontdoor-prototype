# FrontDoor prototype
Static, no build. `python3 -m http.server` in this folder, open http://localhost:8000.
Demo invite code: FD-7K2M-91QX. Tests: `python3 test_playwright.py` (Playwright; screenshots to shots/).

## Layouts
- <768px: original phone layout (unchanged)
- 768–1023px: icon-rail sidebar + fluid centered column
- >=1024px: navy sidebar nav, centered feed, right panel (matches/suggestions/verification), deals card grid, split views for deal detail + messages
Tests: `python3 test_playwright.py` runs the full flow at 1440x900, 1024x768, 768x1024, 390x844.

## Member roles
Developer, Investor / Private Equity, Family Office, Lender / Debt Fund, Mortgage Broker, General Contractor, Architect / Engineer, Real Estate Attorney, Securities Attorney, Zoning / Land Use Attorney, Insurance (builder's risk, title, surety / bonding), Broker, Appraiser, Property Manager, Accountant / Cost Seg, 1031 Exchange Intermediary.
Onboarding groups them as Capital, Build and Design, Legal, Insurance, Services. Each role has its own credential check (e.g. attorneys by bar admission, insurers by producer license, architects by state license), defined in `ROLEDEF` in app.js. Network and Deals have scrollable role chips. All members are fictional.
