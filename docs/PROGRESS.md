# Progress

Update this file in every PR that changes status (the PR template of this project: small PR, one module). Last updated: 2026-11-16.

## Where we are

`main` has **44 of 131 traps live** once the module 4 part B PR merges: phase (a) done, modules 3 and 4 done (water bill lookup, bill details, payment options and the AstheenPay gateway in an iframe or popup, with OTP and PDF receipt). 209 unit/integration tests and 47 Playwright verification checks pass.

| PR | What | State |
|---|---|---|
| #1 | Phase (a): shell, mock layer, home, login/register, SMS inbox, session timeout | merged |
| #2 | Shared foundations: geo data (6 zones / 48 wards / 397 streets), formatters, applications store, `PageHead` | merged |
| #4 | Module 3: electricity connection wizard (10 traps) | merged (replaced #3, auto-closed when its stacked base branch was deleted) |
| #6 | Module 4 part A: water bill consumer lookup + bill details (4 traps) | merged |
| (this PR) | Module 4 part B: payment options + AstheenPay gateway + receipt (9 traps) | open |

Live traps (44): CHK-01 CHK-02 CHK-04 CHK-09 · RAD-01 RAD-02 · TXT-01 TXT-02 TXT-03 TXT-04 TXT-12 TXT-14 · DRP-08 · BTN-01 BTN-04 BTN-05 BTN-06 BTN-09 · DLG-05 DLG-07 DLG-08 DLG-09 DLG-13 DLG-15 DLG-19 · FRM-01 · HYD-01 · DYN-01 DYN-04 · TBL-04 · DAT-05 · FIL-02 FIL-05 · OTH-02 OTH-11 OTH-12 OTH-14 OTH-17 OTH-18 OTH-22 OTH-23 OTH-24 OTH-25 OTH-26.

## Next up

1. **Module 5: Property Tax Self-Assessment** (`/services/property-tax/assess`): CHK-03, RAD-03, TXT-13, DRP-06, BTN-10, DLG-02, DLG-12, TBL-05, OTH-01 (see the trap map in PLAN.md). Delays to register: `ASSESSMENT_CHECK`, `LOCALITY_PAGE`. The AstheenPay checkout (`src/modules/astheenpay/`, sessions in `src/mock/endpoints/astheenpay.ts`) can be reused for its "Proceed to pay"; it currently words the order as a water bill (`ap.forBill`), so generalise that when reusing.
2. Module 6 grievances (finishes phase b), then phase (c), then phase (d).

## Decisions and deviations from the original plan

- **CHK-09 is a `button role=checkbox`, not a native checkbox.** React 19 replays native input changes made before hydration, so a native box cannot be made truly inert.
- Tariff/geo/mock data is generated once with a fixed seed and committed (`src/mock/data/geo.json`).
- Language is stored in cookie `amc_lang`, theme in `amc_theme` (so SSR matches); session in localStorage (kept) or sessionStorage (CHK-01).
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
