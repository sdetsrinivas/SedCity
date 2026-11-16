# Plan

> Original brief and approved plan, condensed. Current status: [PROGRESS.md](PROGRESS.md). Working rules: [../CLAUDE.md](../CLAUDE.md). The per-trap map is at the bottom of this file.

## Goal

A realistic municipal portal for the fictional city **Astheenapuram** (run by the fictional **Astheenapuram Municipal Corporation, AMC**) where residents use city services. Its real purpose is to be a practice ground for UI test automation (Selenium, Playwright, Cypress, codeless tools): every common element type exists in several implementations, each a known automation trap, placed inside real service flows.

Hard rules from the brief:
- It must look and behave like a genuine government portal. **No visible hints, no "trap"/"test" wording anywhere in the UI.**
- Traps live inside real service flows, never on a "demo gallery" page. Each variant of the same element type sits on a different page or flow.
- No real payments, external services or personal data. Original branding. ₹ for currency.
- **Never add `data-testid` attributes.**
- Difficulty mix: ~30% easy (good ids/labels), 40% medium, 30% hard.

## Stack (decided)

- **Next.js App Router + TypeScript.** Chosen for genuine hydration behaviour: Server Components, `<Suspense>` streaming, `next/dynamic` `ssr:false` client-only pages, and selective hydration via `React.lazy` (`src/components/DelayedHydration.tsx`). React controlled inputs, keyed re-rendering and CSS-Module hashed classes come with it.
- Frontend only: mock JSON in `src/mock/data/`, state in localStorage/sessionStorage via `src/mock/store.ts`.
- All "API calls" go through `call()` in `src/mock/api.ts`; every delay is registered by name in `src/mock/delays.ts` (and must be listed in the trap guide with page + element).
- A vanilla-JS region (`src/vanilla/`, no framework) and native Web Components with shadow DOM (chatbot etc., in the Help phase) so DOM conventions differ across the site.
- Second language: **Tamil** (typed against English so a missing key fails typecheck). Dark mode, text-size controls.
- Deploy: Vercel as-is, Render via `render.yaml`; local `npm run dev`.
- Tests: Vitest (unit + jsdom integration), Playwright verification suite (one `[TRAP-ID]` check per trap, run against a production build), GitHub Actions on every PR.

## Modules and build order

| # | Module | Routes | Status |
|---|---|---|---|
| 1 | Home | `/` | ✅ |
| 2 | Login / Register / SMS inbox / session timeout / role switch | `/login` `/register` `/messages` | ✅ |
| 3 | New Electricity Connection wizard | `/services/electricity/new-connection` | ✅ |
| 4 | Water Bill Payment + AstheenPay gateway (iframe + popup) | `/services/water/pay`, `/pay/astheenpay/checkout` | ✅ |
| 5 | Property Tax Self-Assessment (pays through AstheenPay) | `/services/property-tax/assess` | ✅ |
| 6 | Grievance Registration & Tracking | `/grievances/new`, `/grievances/track` | ✅ |
| 7 | Certificates (Birth / Trade Licence) | `/certificates/birth`, `/certificates/trade-license` | ⏳ |
| 8 | City News & Events | `/news`, `/news/events/[slug]` | ⏳ |
| 9 | Officials & Office Directory (table + virtualized vanilla view + geolocation) | `/directory/officials`, `/directory/offices` | ⏳ |
| 10 | Hall / Park Booking | `/bookings` | ⏳ |
| 11 | My Dashboard (+ Officer work queue) | `/dashboard`, `/officer/queue` | ⏳ |
| 12 | Help (shadow-DOM chatbot, FAQ, nested-iframe survey) | `/help`, `/help/survey` | ⏳ |
| — | Trap registry completion, `npm run guide` → `docs/trap-guide.md` + `docs/Astheenapuram-Trap-Guide.pdf` (cover, TOC, section per element type, summary table; **not linked or served from the site**), full verification | | ⏳ |

Phases from the brief: (a) shell/auth ✅ → (b) modules 3–6 ✅ → (c) modules 7–12 → (d) registry, guide PDF, full verification. Placeholder routes show a "temporarily unavailable" notice until their module ships.

## Delays still to register (planned values)

Add each to `src/mock/delays.ts` with page, element and linked trap IDs when its module lands.

| Name | Value | Where |
|---|---|---|
| `NEWS_PAGE` | random 1–4s | Infinite scroll |
| `DIRECTORY_PAGE` | 800ms | Officials spinner overlay (DYN-02) |
| `MAP_IFRAME` | 5s | Late-loading iframe (FRM-04) |
| `SKELETON` | 2s | Dashboard cards (DYN-03) |
| `CHAT_REPLY` | random 1–2s | Chatbot |
| `SURVEY_INNER` | 2s | Nested survey iframe |
| `STREAM_DASHBOARD` | 3s | Dashboard server streaming |

Already registered: search debounce/suggest, `STREAM_ANNOUNCEMENTS`, `HYDRATE_HOME`, `CAROUSEL_ROTATE`, login/OTP/toast TTL, `HYDRATE_REGISTER`, `REGISTER_SUBMIT`, session warn/countdown, `ZONE_LIST`/`WARD_LIST`/`STREET_LIST`, `STEP_ANIMATION`, `REVIEW_BANNER`, `ELEC_SUBMIT`, `CONSUMER_LOOKUP`, `PAY_OVERLAY`, `GATEWAY_LOAD`, `GATEWAY_OTP_SEND`, `GATEWAY_OTP_VERIFY`, `GATEWAY_RETURN`, `ASSESSMENT_DEBOUNCE`, `ASSESSMENT_CHECK`, `LOCALITY_PAGE`, `GRIEVANCE_SUBMIT`, `GRIEVANCE_LOOKUP`, `GRIEVANCE_POLL`, `GRIEVANCE_STATUS`, `GRIEVANCE_UPDATE`.

## Seeded accounts (README only, never on the site)

`meena.r` / `Astheen@123` (citizen) · `arul.k` / `Arul@2026` (citizen) · `officer.selvi` / `Officer@123` (officer). Test-only delay/failure overrides: cookie `amc_mock` (see README). CAPTCHA bypass (guide only): decode the hidden `captcha_token` (base64 JSON `{a,b,op,ts}`).

# Trap map

Approved plan for the Astheenapuram Citizen Services Portal: a realistic municipal portal for a fictional city that doubles as a UI-automation practice site. Status per trap is generated from `traps/registry.ts` — when a trap goes live, flip its status here. Live detail (how it's built, locators, assertions) lives in the registry, not here.

Difficulty: E easy · M medium · H hard (target mix ≈30/40/30). Status: ✅ live · ⏳ planned.

**131 traps · 65 live · 66 planned.** Difficulty mix: E 39 / M 51 / H 41.


## Checkbox (CHK)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| CHK-01 | Native, SSR `checked` attribute | `/login: keep me signed in` | E | ✅ |
| CHK-02 | Native, state only via `.checked` property | `/services/water/pay: email receipt` | M | ✅ |
| CHK-03 | `div role=checkbox` | `/services/property-tax/assess: rebates` | M | ✅ |
| CHK-04 | Hidden input + styled label | `/services/electricity/new-connection: declaration` | M | ✅ |
| CHK-05 | Inside open shadow DOM | `/help chatbot: email transcript` | H | ⏳ |
| CHK-06 | Indeterminate select-all (property only) | `/dashboard: notifications` | M | ⏳ |
| CHK-07 | State only as CSS class / SVG swap | `/bookings: amenity tiles` | H | ⏳ |
| CHK-08 | Restored from localStorage after hydration | `/news: events only` | H | ⏳ |
| CHK-09 | Inert until delayed hydration (button role=checkbox) | `/register: terms` | H | ✅ |

## Radio (RAD)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| RAD-01 | Native group | `/services/electricity/new-connection: connection type` | E | ✅ |
| RAD-02 | Card radios, roving tabindex | `/services/water/pay: payment method` | M | ✅ |
| RAD-03 | Segmented control | `/services/property-tax/assess: usage type` | E | ✅ |
| RAD-04 | Same `name` in two forms | `/certificates/birth: applicant vs delivery` | H | ⏳ |

## Text input (TXT)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| TXT-01 | Plain | `/login: username` | E | ✅ |
| TXT-02 | Masked phone | `/register: mobile` | M | ✅ |
| TXT-03 | Masked Astheen ID | `/services/electricity/new-connection: applicant` | M | ✅ |
| TXT-04 | Reformats on blur | `/services/water/pay: consumer number` | E | ✅ |
| TXT-05 | Controlled input (`.value` via JS ignored) | `/grievances/track: grievance number` | M | ✅ |
| TXT-06 | contenteditable | `/grievances/new: description` | H | ✅ |
| TXT-07 | Input in shadow DOM | `/help chatbot` | H | ⏳ |
| TXT-08 | readonly vs disabled vs aria-disabled | `/dashboard: profile` | E | ⏳ |
| TXT-09 | Paste blocked | `/certificates/trade-license: re-enter bank account` | M | ⏳ |
| TXT-10 | maxlength | `/certificates/birth: child name` | E | ⏳ |
| TXT-11 | Placeholder as only label | `/bookings: purpose, attendees` | M | ⏳ |
| TXT-12 | Floating label | `/pay/astheenpay/checkout: card fields` | E | ✅ |
| TXT-13 | Debounced async validation | `/services/property-tax/assess: assessment no.` | M | ✅ |
| TXT-14 | Typeahead (debounced combobox) | `/: global search` | M | ✅ |

## Dropdown (DRP)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| DRP-01 | Native select | `/certificates/birth: hospital` | E | ⏳ |
| DRP-02 | optgroups | `/certificates/trade-license: business category` | E | ⏳ |
| DRP-03 | Portal listbox at end of body | `/grievances/new: category` | H | ✅ |
| DRP-04 | Searchable combobox | `/directory/officials: department` | M | ⏳ |
| DRP-05 | Multi-select with chips | `/officer/queue: wards` | M | ⏳ |
| DRP-06 | Options lazy-loaded on scroll | `/services/property-tax/assess: locality` | H | ✅ |
| DRP-07 | Closes on blur | `/news: category` | H | ⏳ |
| DRP-08 | Cascading, delayed load | `/services/electricity/new-connection: zone→ward→street` | M | ✅ |

## Buttons & links (BTN)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| BTN-01 | button vs anchor vs div/span | `/: service tiles` | E | ✅ |
| BTN-02 | Icon-only, aria-label only | `/directory/officials: row actions` | E | ⏳ |
| BTN-03 | Identical text (“Read more”) | `/news: cards` | M | ⏳ |
| BTN-04 | Covered by overlay/spinner | `/services/water/pay: Proceed to pay` | H | ✅ |
| BTN-05 | Moves due to layout shift | `/services/electricity/new-connection: Submit (review)` | H | ✅ |
| BTN-06 | Disabled until form valid | `/login: Sign in` | E | ✅ |
| BTN-07 | Double-click action | `/officer/queue: claim row` | M | ⏳ |
| BTN-08 | Right-click context menu | `/dashboard: documents` | M | ⏳ |
| BTN-09 | Hover-only menu | `header: Services` | M | ✅ |
| BTN-10 | Duplicate mobile + desktop in DOM | `/services/property-tax/assess: Proceed to pay` | M | ✅ |

## Dialogs & popups (DLG)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| DLG-01 | alert | `/grievances/new: no ward selected` | E | ✅ |
| DLG-02 | confirm | `/services/property-tax/assess: remove floor` | E | ✅ |
| DLG-03 | prompt | `/dashboard: rename document` | M | ⏳ |
| DLG-04 | beforeunload | `/certificates/*: unsaved form` | M | ⏳ |
| DLG-05 | Portal modal (session timeout) | signed-in pages | M | ✅ |
| DLG-06 | Native `<dialog>` | `/bookings: confirm` | E | ⏳ |
| DLG-07 | Nested modals | `/services/electricity/new-connection: tariff→glossary` | H | ✅ |
| DLG-08 | Modal inside iframe | AstheenPay: OTP modal | H | ✅ |
| DLG-09 | Auto-dismiss toast (~3s) | `/login: OTP` | M | ✅ |
| DLG-10 | Toast stack | `/officer/queue: bulk actions` | M | ⏳ |
| DLG-11 | Snackbar with Undo | `/dashboard: delete notification` | M | ⏳ |
| DLG-12 | Tooltip | `/services/property-tax/assess: unit-area-value info` | E | ✅ |
| DLG-13 | Popover | `/register: Why Astheen ID?` | E | ✅ |
| DLG-14 | `target=_blank` | `/news: event detail` | E | ⏳ |
| DLG-15 | `window.open` popup | `/services/water/pay: pay in popup` | H | ✅ |
| DLG-16 | Print dialog | `/grievances/track: acknowledgement` | M | ✅ |
| DLG-17 | Geolocation prompt | `/directory/offices: nearest` | E | ⏳ |
| DLG-18 | Notification permission | `/dashboard: preferences` | E | ⏳ |
| DLG-19 | Clipboard copy | `/services/electricity/new-connection: reference no.` | M | ✅ |

## Frames & shadow DOM (FRM/SHD)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| FRM-01 | Same-origin iframe | `/services/water/pay: AstheenPay` | M | ✅ |
| FRM-02 | Nested iframes | `/help/survey` | H | ⏳ |
| FRM-03 | srcdoc iframe | `/help/survey inner` | H | ⏳ |
| FRM-04 | Late-loading iframe, no id/name | `/directory/offices: map` | H | ⏳ |
| SHD-01 | Open shadow root | `/help chatbot` | M | ⏳ |
| SHD-02 | Nested shadow roots | `/help chatbot: quick replies` | H | ⏳ |
| SHD-03 | Closed shadow root | `/certificates/trade-license: fee badge` | H | ⏳ |
| SHD-04 | Slotted content | `/dashboard: profile card` | M | ⏳ |

## Hydration (HYD)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| HYD-01 | Visible but inert until hydration | `/: Quick Pay` | H | ✅ |
| HYD-02 | Text changes after hydration | `/dashboard: greeting, last login` | M | ⏳ |
| HYD-03 | Element replaced (stale reference) | `/news/events/[slug]: Register` | H | ⏳ |
| HYD-04 | List re-keyed on filter | `/directory/officials` | H | ⏳ |

## Waits & dynamic content (DYN)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| DYN-01 | Delayed appearance | `/services/water/pay: bill details` | E | ✅ |
| DYN-02 | Spinner overlay | `/directory/officials: paging` | M | ⏳ |
| DYN-03 | Skeleton loaders | `/dashboard: cards` | E | ⏳ |
| DYN-04 | Slide animation (present, not clickable) | `/services/electricity/new-connection: step change` | H | ✅ |
| DYN-05 | Polling status | `/grievances/track` | M | ✅ |
| DYN-06 | Hashed classes / generated ids | `/bookings` | H | ⏳ |
| DYN-07 | Reordering list | `/officer/queue: SLA order` | H | ⏳ |
| DYN-08 | Nested scroll containers | `/directory/offices` | H | ⏳ |
| DYN-09 | Sticky header covers elements | `/certificates/trade-license: long form` | M | ⏳ |

## Tables (TBL)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| TBL-01 | Static | `/help: fee schedule` | E | ⏳ |
| TBL-02 | Sortable + paginated | `/directory/officials` | M | ⏳ |
| TBL-03 | `div role=grid` | `/dashboard: payment history` | H | ⏳ |
| TBL-04 | Nested table | `/services/water/pay: slab breakup` | M | ✅ |
| TBL-05 | Editable cells | `/services/property-tax/assess: floors` | H | ✅ |
| TBL-06 | Expandable rows | `/officer/queue` | M | ⏳ |
| TBL-07 | Sticky header | `/grievances/track: my grievances` | E | ✅ |
| TBL-08 | Duplicate text across rows | `/bookings: my bookings` | M | ⏳ |

## Date & time (DAT)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| DAT-01 | Native date | `/certificates/birth: DOB` | E | ⏳ |
| DAT-02 | Custom calendar | `/bookings` | H | ⏳ |
| DAT-03 | Date range | `/dashboard: payments filter` | M | ⏳ |
| DAT-04 | Time picker | `/grievances/new: inspection time` | M | ✅ |
| DAT-05 | DD/MM/YYYY text date + calendar | `/services/electricity/new-connection: inspection date` | M | ✅ |
| DAT-06 | Disabled dates | `/grievances/track: reschedule` | M | ✅ |

## Files (FIL)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| FIL-01 | Native file input | `/certificates/birth` | E | ⏳ |
| FIL-02 | Hidden input behind styled button | `/services/electricity/new-connection: documents` | M | ✅ |
| FIL-03 | Drag-and-drop only | `/grievances/new: photos` | H | ✅ |
| FIL-04 | Multiple files | `/certificates/trade-license` | E | ⏳ |
| FIL-05 | PDF download | `/services/water/pay: receipt` | E | ✅ |
| FIL-06 | CSV download | `/directory/officials: export` | E | ⏳ |

## Other (OTH)

| ID | Variant | Route / flow | D | Status |
|---|---|---|---|---|
| OTH-01 | Native slider | `/services/property-tax/assess: building age` | E | ✅ |
| OTH-02 | Custom slider | `/services/water/pay: partial payment` | H | ✅ |
| OTH-03 | HTML5 drag-and-drop | `/bookings: move booking` | H | ⏳ |
| OTH-04 | Pointer-event drag-and-drop | `/dashboard: reorder widgets` | H | ⏳ |
| OTH-05 | Canvas signature | `/certificates/trade-license` | H | ⏳ |
| OTH-06 | SVG needing local-name() XPath | `/grievances/new: ward map` | H | ✅ |
| OTH-07 | Tabs | `/help` | E | ⏳ |
| OTH-08 | Accordion | `/help: FAQ` | E | ⏳ |
| OTH-09 | Star rating | `/grievances/track` | E | ✅ |
| OTH-10 | Toggle switch | `/dashboard: paperless billing` | E | ⏳ |
| OTH-11 | Keyboard shortcuts | global: / and Alt+L | M | ✅ |
| OTH-12 | Text split across spans / &nbsp; | `/services/water/pay: amount due` | M | ✅ |
| OTH-13 | Duplicate ids on one page | `/certificates/trade-license` | H | ⏳ |
| OTH-14 | Canvas math CAPTCHA | `/login` | H | ✅ |
| OTH-15 | Canvas chart | `/dashboard` | H | ⏳ |
| OTH-16 | SVG chart | `/dashboard` | E | ⏳ |
| OTH-17 | Auto-rotating carousel | `/` | M | ✅ |
| OTH-18 | News ticker (vanilla JS) | `/` | M | ✅ |
| OTH-19 | Infinite scroll, lazy images, end state | `/news` | M | ⏳ |
| OTH-20 | Virtualized list (vanilla JS) | `/directory/offices` | H | ⏳ |
| OTH-21 | SVG slot map | `/bookings` | H | ⏳ |
| OTH-22 | Cookie banner on first visit | `/` | E | ✅ |
| OTH-23 | Language switch | global | E | ✅ |
| OTH-24 | Dark mode | global | E | ✅ |
| OTH-25 | OTP in mock SMS inbox | `/login, /messages` | M | ✅ |
| OTH-26 | Role switch | `/login` | M | ✅ |
