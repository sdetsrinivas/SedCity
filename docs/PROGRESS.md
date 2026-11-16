# Progress

Update this file in every PR that changes status (the PR template of this project: small PR, one module). Last updated: 2026-11-16.

## Where we are

`main` has **53 of 131 traps live** once the module 5 PR merges: phase (a) done, modules 3, 4 and 5 done (property tax self-assessment pays through the shared AstheenPay checkout). 240 unit/integration tests and 56 Playwright verification checks pass.

| PR | What | State |
|---|---|---|
| #1 | Phase (a): shell, mock layer, home, login/register, SMS inbox, session timeout | merged |
| #2 | Shared foundations: geo data (6 zones / 48 wards / 397 streets), formatters, applications store, `PageHead` | merged |
| #4 | Module 3: electricity connection wizard (10 traps) | merged (replaced #3, auto-closed when its stacked base branch was deleted) |
| #6 | Module 4 part A: water bill consumer lookup + bill details (4 traps) | merged |
| #7 | Module 4 part B: payment options + AstheenPay gateway + receipt (9 traps) | merged |
| (this PR) | Module 5: property tax self-assessment (9 traps); AstheenPay generalised for more than water bills | open |

Live traps (53): CHK-01 CHK-02 CHK-03 CHK-04 CHK-09 · RAD-01 RAD-02 RAD-03 · TXT-01 TXT-02 TXT-03 TXT-04 TXT-12 TXT-13 TXT-14 · DRP-06 DRP-08 · BTN-01 BTN-04 BTN-05 BTN-06 BTN-09 BTN-10 · DLG-02 DLG-05 DLG-07 DLG-08 DLG-09 DLG-12 DLG-13 DLG-15 DLG-19 · FRM-01 · HYD-01 · DYN-01 DYN-04 · TBL-04 TBL-05 · DAT-05 · FIL-02 FIL-05 · OTH-01 OTH-02 OTH-11 OTH-12 OTH-14 OTH-17 OTH-18 OTH-22 OTH-23 OTH-24 OTH-25 OTH-26.

## Next up

1. **Module 6: Grievance Registration & Tracking** (`/grievances/new`, `/grievances/track`): finishes phase (b). Delay to register: `GRIEVANCE_POLL`.
2. Phase (c), then phase (d).

## Decisions and deviations from the original plan

- **CHK-09 is a `button role=checkbox`, not a native checkbox.** React 19 replays native input changes made before hydration, so a native box cannot be made truly inert.
- Tariff/geo/mock data is generated once with a fixed seed and committed (`src/mock/data/geo.json`).
- Language is stored in cookie `amc_lang`, theme in `amc_theme` (so SSR matches); session in localStorage (kept) or sessionStorage (CHK-01).
- **AstheenPay is shared.** `PaySession.order` is a tagged union (`water` | `propertyTax`) and the checkout words its “Payment for” line from it; the host component moved to `src/modules/astheenpay/GatewayFrame.tsx` (keys `ap.host*`). A new paying service adds an `order` kind and an `ap.for…` string.
- Property tax localities are the 48 wards (name without the “Ward N –” prefix); the base rate comes from the ward's zone (`src/mock/data/property.json`). Seeded assessment numbers: `014-002-00731`, `003-001-01208`, `029-004-00057`, `021-003-03390`, `036-001-00412`. A paid half-year is remembered per browser (`amc.taxPayments`).
- Added delay `ASSESSMENT_DEBOUNCE` (500ms) alongside the planned `ASSESSMENT_CHECK` and `LOCALITY_PAGE`.
- Repo-local git identity is the GitHub noreply address of `srinivascompanyprofile` (the machine had no global identity).

## Open questions for the user

- Should Claude merge each PR itself once CI is green? So far the user has explicitly asked for merges (#1, then #2 and #4). Until told otherwise, open the PR, wait for CI, and ask/leave it.
- Tamil copy has not been reviewed by a native speaker.

## Gotchas (learned the hard way)

- Next renames its process to `next-server`: free the port with `lsof -ti:3100 | xargs kill`, **not** `pkill -f "next start"`, or Playwright reuses a stale build.
- Never stack PRs: merging the base deletes its branch and GitHub auto-closes the dependent PR. Branch every PR from `main`.
- The AstheenPay checkout lives at `/pay/…`; `src/components/layout/Chrome.tsx` hides the portal header, footer, cookie banner, session watcher and shortcuts there (it runs inside an iframe/popup).
- Chrome's `Element.scrollIntoView()` now returns a Promise: never write `useEffect(() => el.scrollIntoView())` as an expression body (React calls the returned value as a cleanup and crashes in production).
- Sticky header covers headings after focus/scroll: use `scroll-margin-top` (see `.stepTitle`).
