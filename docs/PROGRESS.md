# Progress

Update this file in every PR that changes status (the PR template of this project: small PR, one module). Last updated: 2026-11-19.

## Where we are

**100 of 131 traps are live** once the module 10 part A PR merges: phases (a) and (b) are done (modules 1–6); in phase (c) modules 7 (certificates), 8 (news & events) and 9 (directory) are merged and module 10 part A (hall / park booking: find and book) is in review. 482 unit/integration tests and 139 Playwright verification checks pass.

| PR | What | State |
|---|---|---|
| #1 | Phase (a): shell, mock layer, home, login/register, SMS inbox, session timeout | merged |
| #2 | Shared foundations: geo data (6 zones / 48 wards / 397 streets), formatters, applications store, `PageHead` | merged |
| #4 | Module 3: electricity connection wizard (10 traps) | merged (replaced #3, auto-closed when its stacked base branch was deleted) |
| #6 | Module 4 part A: water bill consumer lookup + bill details (4 traps) | merged |
| #7 | Module 4 part B: payment options + AstheenPay gateway + receipt (9 traps) | merged |
| #8 | Module 5: property tax self-assessment (9 traps); AstheenPay generalised for more than water bills | merged |
| #9 | Module 6 part A: grievance registration `/grievances/new` (6 traps) | merged |
| #10 | Module 6 part B: grievance tracking `/grievances/track` (6 traps); finishes phase (b) | merged |
| #11 | Module 7 part A: birth certificate `/certificates/birth` (6 traps); first PR of phase (c) | merged |
| #12 | Module 7 part B: trade licence `/certificates/trade-license` (7 traps + DLG-04 on a second page); finishes module 7 | merged |
| #13 | Module 8: news & events `/news`, `/news/events/[slug]` (6 traps) | merged |
| #14 | Module 9 part A: officials directory `/directory/officials` (6 traps) | merged |
| #15 | Module 9 part B: find nearest office `/directory/offices` (4 traps); finishes module 9 | merged |
| (this PR) | Module 10 part A: hall / park booking `/bookings`, find and book (6 traps) | open |

Live traps (100): CHK-01 CHK-02 CHK-03 CHK-04 CHK-07 CHK-08 CHK-09 · RAD-01 RAD-02 RAD-03 RAD-04 · TXT-01 TXT-02 TXT-03 TXT-04 TXT-05 TXT-06 TXT-09 TXT-10 TXT-11 TXT-12 TXT-13 TXT-14 · DRP-01 DRP-02 DRP-03 DRP-04 DRP-06 DRP-07 DRP-08 · BTN-01 BTN-02 BTN-03 BTN-04 BTN-05 BTN-06 BTN-09 BTN-10 · DLG-01 DLG-02 DLG-04 DLG-05 DLG-06 DLG-07 DLG-08 DLG-09 DLG-12 DLG-13 DLG-14 DLG-15 DLG-16 DLG-17 DLG-19 · FRM-01 FRM-04 · SHD-03 · HYD-01 HYD-03 HYD-04 · DYN-01 DYN-02 DYN-04 DYN-05 DYN-06 DYN-08 DYN-09 · TBL-02 TBL-04 TBL-05 TBL-07 · DAT-01 DAT-02 DAT-04 DAT-05 DAT-06 · FIL-01 FIL-02 FIL-03 FIL-04 FIL-05 FIL-06 · OTH-01 OTH-02 OTH-05 OTH-06 OTH-09 OTH-11 OTH-12 OTH-13 OTH-14 OTH-17 OTH-18 OTH-19 OTH-20 OTH-21 OTH-22 OTH-23 OTH-24 OTH-25 OTH-26.

## Next up

1. **Module 10 part B: my bookings and move a booking** (`/bookings`, below or beside the part A form; branch from `main`): TBL-08 (my bookings, duplicate text across rows: same venue / date / time in several rows) and OTH-03 (HTML5 drag-and-drop to move a booking to another free slot or day). It reads and rewrites the records part A saves:
   - `saveApplication()` record: `ref` `AMC/BK/<year>/<6 digits>`, `service: "booking"`, `status: "Submitted"`, `title` “Booking of {venue} on {DD/MM/YYYY}”, `applicant` (session name), `amount` = total (hire + amenities + deposit).
   - `details` (all strings): `venue` (V01–V06, `src/mock/data/bookings.json`), `date` (ISO), `slots` (start hours, comma-separated, consecutive, e.g. `"8,10"`), `start`/`end` (`"08:00"`/`"12:00"`), `hours`, `amenities` (ids, comma-separated, may be empty), `purpose`, `attendees`, `mobile` (10 digits), `hire`, `amenityFee`, `deposit`, `payBy` (ISO).
   - Saved bookings hold their slots: `heldSlots()` in `src/mock/endpoints/bookings.ts` turns every `booking` record not `Rejected` into `{ venue, date, slots }`, and `takenSlots()`/`dayStatus()` (`src/modules/bookings/booking.ts`) treat them as booked (slot map and calendar). A move must rewrite `date`/`slots`/`start`/`end`/`hours`/`hire`/`amount` of the same `ref`, and check the target with `takenSlots()` excluding the booking being moved.
2. Then modules 11–12 (dashboard + officer queue, help), then phase (d).

2. Then modules 11–12 (dashboard + officer queue, help), then phase (d).

## Decisions and deviations from the original plan

- **CHK-09 is a `button role=checkbox`, not a native checkbox.** React 19 replays native input changes made before hydration, so a native box cannot be made truly inert.
- Tariff/geo/mock data is generated once with a fixed seed and committed (`src/mock/data/geo.json`).
- Language is stored in cookie `amc_lang`, theme in `amc_theme` (so SSR matches); session in localStorage (kept) or sessionStorage (CHK-01).
- **AstheenPay is shared.** `PaySession.order` is a tagged union (`water` | `propertyTax`) and the checkout words its “Payment for” line from it; the host component moved to `src/modules/astheenpay/GatewayFrame.tsx` (keys `ap.host*`). A new paying service adds an `order` kind and an `ap.for…` string.
- Property tax localities are the 48 wards (name without the “Ward N –” prefix); the base rate comes from the ward's zone (`src/mock/data/property.json`). Seeded assessment numbers: `014-002-00731`, `003-001-01208`, `029-004-00057`, `021-003-03390`, `036-001-00412`. A paid half-year is remembered per browser (`amc.taxPayments`).
- Added delay `ASSESSMENT_DEBOUNCE` (500ms) alongside the planned `ASSESSMENT_CHECK` and `LOCALITY_PAGE`.
- Module 6 is split into part A (`/grievances/new`) and part B (`/grievances/track`). Part A added delay `GRIEVANCE_SUBMIT` (1.5s), categories in `src/mock/data/grievance.json` (with SLA days), and `clock`/`camera` icons. The ward map geometry is `src/modules/grievance/mapGeometry.ts` (not `wardMap.ts`: it would clash with `WardMap.tsx` on case-insensitive file systems). The ward is never pre-filled from the session, so the DLG-01 alert stays reachable.
- Grievance tracking (module 6 part B) keeps its state in localStorage `amc.grievanceProgress` (stage, history, inspection date, rating per grievance number). Seeded grievances are in `src/mock/data/grievance.json` (`seeded`: 14 for meena.r, 3 for arul.k), e.g. `AMC/GR/2026/004655` (submitted), `004612` (inspection scheduled), `004598` (resolved, not rated). A new grievance moves on one stage per automatic check and stops at “Inspection scheduled”; later stages exist only in seeded data. Added delays `GRIEVANCE_LOOKUP` (1s), `GRIEVANCE_STATUS` (0.6s) and `GRIEVANCE_UPDATE` (1s) next to the planned `GRIEVANCE_POLL` (every 5s). Inspection holidays are in the same JSON (`holidays`); availability rules are in `src/modules/grievance/tracking.ts`.
- Module 7 is split into part A (`/certificates/birth`) and part B (`/certificates/trade-license`); both live in `src/modules/certificates/`. Part A added delay `BIRTH_SUBMIT` (1.5s) and `src/mock/data/certificates.json` (10 hospitals H01–H10, fees ₹50/copy + ₹40 Speed Post); the fee is shown but not paid online (no AstheenPay order kind). The birth page is two sibling `<form>`s (application, delivery) because RAD-04 needs two radio groups with the same name; the Submit button sits in the delivery form. DLG-04 is a shared hook (`useLeaveGuard`); in-portal links navigate client-side and deliberately do not ask.
- Trade licence (module 7 part B) is one long form in six sections with a sticky in-page section bar (DYN-09) under the sticky header. Categories (4 optgroups, 19 categories, an “Others” in each) and fee rules are in `src/mock/data/certificates.json` (`tradeGroups`, `tradeFees`): annual fee = category base + ₹100 per started 100 sq. ft above 200 sq. ft (`tradeFee()`); shown, not paid online. Added delays `TRADE_FEE` (0.8s, fee badge) and `TRADE_SUBMIT` (1.5s). SHD-03 is the first native Web Component: `<amc-fee-badge>` in `src/modules/certificates/feeBadgeElement.ts` (closed root, data via the `view` property, theme via inherited `--c-*`). The saved application keeps the drawn signature as a PNG data URL and the account number masked.
- News & events (module 8) lives in `src/modules/news/`; 30 seeded items (19 news, 11 events) in `src/mock/data/news.json`, category pictures in `public/images/news/`. The server renders the first 8 cards; later pages come from `fetchNewsPage()` (`NEWS_PAGE`, random 1–4s). The category dropdown, the “Show events only” island and the list share a filter store through `NewsFilterContext.tsx` (a stable store object, so a filter change does not force the delayed island to hydrate). Added delays `HYDRATE_NEWS` (2s, CHK-08), `EVENT_SEATS` (1.5s, HYD-03) and `EVENT_REGISTER` (1s). Event registration is free, at most 4 people, kept in localStorage `amc.eventRegistrations` (numbers `EVR/2026/0xxxx`) and confirmed by SMS; `senior-health-camp` has 1 seat left.
- Officials directory (module 9 part A) lives in `src/modules/directory/`; 61 officials in 13 departments in `src/mock/data/directory.json` (generated once by a throwaway script, deterministic; phone = helpline 155 2026 + extension, e.g. `tel:1552026,202`; emails `@amc.example`). Paging, sorting (`Intl.Collator` in the page language, ties in published order) and filtering are in `src/mock/endpoints/directory.ts`. Delays `DIRECTORY_PAGE` (800ms, overlay) and the added `DIRECTORY_EXPORT` (1s, CSV). The applied filter is kept in the address (`?department=…&q=…`, `history.replaceState`); the server deliberately ignores it and renders the unfiltered first page, which the client then filters after hydration (HYD-04). Added icons `mail`, `arrowUp`, `arrowDown`, `sort` to `Icon.tsx`. No vanilla code on this page (the virtualized vanilla list is part B).
- Find nearest office (module 9 part B) is in `src/modules/directory/` too: 103 offices (head office, 6 zone offices, 48 ward offices, 18 Citizen Service Centres, 12 water supply depots, 18 health centres) added to `src/mock/data/directory.json` with `officeKinds` (hours, services) and `officeServices` (links to the portal's online services), generated once by a throwaway deterministic script. Positions are lat/lng in a fixed box (`CITY_BOUNDS`, north 12.55, west 79.40, 0.15° × 0.20°) that maps linearly onto the grievance ward map (`mapGeometry.ts`), so the map reuses the ward geometry; offices sit near their ward's centre. The head office is Ripon Mahal, Kalaivani Square, 600901 (as in the footer). Office extensions are 2000–2518 (officials use 201–1405). More than 15 km from the centre counts as outside the city. The map is a separate bare page `/maps/offices` (Chrome.tsx hides the shell under `/maps/`), talking to the page by `postMessage`. The virtualized list is `src/vanilla/office-list.js`. Added delays `LOCATE_TIMEOUT` (10s, the geolocation timeout, so specs can shorten it) and `OFFICE_NEAREST` (1s) next to the planned `MAP_IFRAME` (5s); added icon `locate`.
- Hall / park booking (module 10 part A) lives in `src/modules/bookings/`; venues (6: halls, parks, a ground; capacity, hourly rate, deposit, weekly closed day, opening hours, offered amenities) and 7 amenities are in `src/mock/data/bookings.json`. Rules in `booking.ts`: bookable from today + 2 to today + 60; two-hour slots; one booking = 1–4 consecutive slots; other citizens' bookings are a deterministic hash of venue/date/hour (about a quarter of slots, and about one day in nine fully booked). Booking needs a signed-in citizen (`RequireRole`). Fee = hours × rate + amenities + refundable deposit, shown, not paid online (“pay at the venue office by …”, SMS). Added delays `BOOKING_SLOTS` (1.2s, slot map) and `BOOKING_SUBMIT` (1.5s). The id prefix (DYN-06) is drawn per request in `src/app/bookings/page.tsx`. Verification picks its days with `verification/booking-dates.ts` (checked for every `today` over two years in `booking.test.ts`).
- `SESSION_WARN` and `SESSION_COUNTDOWN` are now read with `limitFor()` (time limits): with `{"scale":0}` the session watcher used to sign the user out at once, which broke every signed-in flow under that override. By-name overrides still work (DLG-05 check unchanged).
- Print: `src/app/globals.css` has shared print rules: a page with a `.print-area` prints only that element; `.print-only` / `.no-print` show or hide content in print.
- Repo-local git identity is the GitHub noreply address of `srinivascompanyprofile` (the machine had no global identity).

## Open questions for the user

- Should Claude merge each PR itself once CI is green? So far the user has explicitly asked for merges (#1, then #2 and #4). Until told otherwise, open the PR, wait for CI, and ask/leave it.
- Tamil copy has not been reviewed by a native speaker.

## Gotchas (learned the hard way)

- `.page` (padding `24px 0 48px`) overrides the side padding of `.container` when both are on one element (`container page`), so those pages touch the screen edge at 390px. The news pages nest them (`.container > .page`); the older pages still use the combined form (not changed here).
- Next renames its process to `next-server`: free the port with `lsof -ti:3100 | xargs kill`, **not** `pkill -f "next start"`, or Playwright reuses a stale build.
- Never stack PRs: merging the base deletes its branch and GitHub auto-closes the dependent PR. Branch every PR from `main`.
- The AstheenPay checkout lives at `/pay/…`; `src/components/layout/Chrome.tsx` hides the portal header, footer, cookie banner, session watcher and shortcuts there (it runs inside an iframe/popup).
- Chrome's `Element.scrollIntoView()` now returns a Promise: never write `useEffect(() => el.scrollIntoView())` as an expression body (React calls the returned value as a cleanup and crashes in production).
- Sticky header covers headings after focus/scroll: use `scroll-margin-top` (see `.stepTitle`).
- Native date inputs: Playwright `fill()` takes ISO only (a DD/MM/YYYY string leaves the field empty without an error in 1.65), and keyboard typing order follows the browser's UI language, not the `locale` test option. Compute dates from the browser's clock in specs.
- Geolocation under Playwright (measured): with no grant, headless Chromium reports the permission as `prompt` but fails `getCurrentPosition` at once with PERMISSION_DENIED; granted with no `setGeolocation`, it waits for the timeout (TIMEOUT). Use `context.grantPermissions(['geolocation'], { origin })` + `context.setGeolocation()`.
- Next.js keeps an empty `role="alert"` route announcer on every page, so `page.getByRole('alert')` is ambiguous; filter it (`.filter({ hasText: /\S/ })`).
- A focusable custom list must not scroll on focus: focus comes with the mousedown of a click, and moving the rows before mouseup sends the click to their common parent.
- jsdom has no `HTMLDialogElement.showModal()` and does not submit `<form method=dialog>`: `tests/integration/bookings.test.tsx` installs a small stand-in; the real behaviour is checked by the DLG-06 verification checks.
- Playwright treats `aria-disabled=true` as disabled for any element (an SVG `<rect>` too): `click()` waits until the timeout; use `click({ force: true })` when the click itself is what is being tested.
- Playwright and `beforeunload`: with no `dialog` listener a reload just goes through; dismissing inside `page.reload()` hangs until the timeout. Test "Stay" with `page.close({ runBeforeUnload: true })`.
