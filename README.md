# Astheenapuram Citizen Services Portal

A realistic municipal portal for the fictional city of **Astheenapuram**, run by the fictional
**Astheenapuram Municipal Corporation (AMC)**. Residents can pay bills, apply for connections and
certificates, raise grievances and book halls.

Behind the realistic UI, it is a practice ground for UI test automation (Selenium, Playwright,
Cypress, codeless tools). Every common element type exists in several implementations, each a
known automation trap, placed inside real service flows. The site itself never mentions traps
or testing. The trap guide lives in `docs/` and is not served.

> All names, data, accounts, payments and services are fictional. Nothing leaves the browser.

> **Contributors / AI assistants:** start with [CLAUDE.md](CLAUDE.md) (rules), [docs/PLAN.md](docs/PLAN.md) (plan and trap map) and [docs/PROGRESS.md](docs/PROGRESS.md) (status and next steps).

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:unit` | Pure logic, delay registry, i18n parity, trap-registry integrity |
| `npm run test:integration` | Components and mock API together in jsdom (Testing Library) |
| `npm run verify` | Playwright verification suite against a production build (proves each trap) |
| `npm run verify:install` | Installs the Chromium build Playwright needs (first run only) |

## Seeded accounts

| Role | Username | Password |
|---|---|---|
| Citizen | `meena.r` | `Astheen@123` |
| Citizen | `arul.k` | `Arul@2026` |
| Officer | `officer.selvi` | `Officer@123` |

Sign-in asks for an OTP. It is shown in a toast for ~3 seconds and also kept under
**SMS Copies** (`/messages`). New accounts can be created at `/register`; they live in your browser's localStorage.

## Why Next.js (App Router)

The portal needs real hydration behaviour, not imitations of it:

- **Server rendering by default.** Pages are React Server Components rendered per request (the language and theme come from cookies).
- **Streaming.** `<Suspense>` boundaries stream late content, e.g. the home-page notices arrive about 2s after the shell.
- **Client-only pages.** `next/dynamic` with `ssr:false` renders nothing on the server, e.g. `/messages`.
- **Selective / delayed hydration.** `src/components/DelayedHydration.tsx` wraps a component in `React.lazy` + `Suspense` and resolves its chunk only after a named delay. The server HTML stays visible but React has not attached handlers, so clicks are dropped. This is genuine React behaviour, not a disabled flag.
- **Different DOM conventions.** React controlled inputs (where `.value =` via JS does not update app state), keyed list re-rendering, and CSS-Module hashed class names all come with the framework. A framework-free region (`src/vanilla/`) and native Web Components (in later phases) add other conventions.
- **Deployment.** Vercel runs it with no configuration. Render uses `render.yaml` (`npm run build` → `npm start`).

## Project layout

```
src/app/                 routes (App Router)
src/components/          layout shell (header, nav, footer, consent, session watcher) and UI primitives
src/modules/<module>/    per-service components (home, auth, …)
src/vanilla/             framework-free regions (news ticker, …)
src/mock/api.ts          the single mock service layer: call(name, handler, {failWhen, failRate})
src/mock/delays.ts       every simulated delay, registered by name with its page and element
src/mock/data/*.json     seeded mock data
src/i18n/                English + Tamil dictionaries (Tamil is type-checked against English)
traps/registry.ts        single source of truth for all traps (the guide is generated from it)
verification/            Playwright checks: each test title contains its trap ID, e.g. "[CHK-01]"
tests/integration/       Vitest + Testing Library integration tests
```

Every trap is marked in code with a comment containing its ID (`// CHK-01: …`). Search for the ID to find it.

## Mock services, delays and failures

All "API calls" go through `call()` in `src/mock/api.ts`, which waits for a named delay from
`src/mock/delays.ts` and can simulate failure (deterministic `failWhen`, random `failRate`, or forced).

For tests only, delays and failures can be overridden with a cookie named `amc_mock` that holds
URL-encoded JSON:

```json
{ "scale": 0, "delays": { "SESSION_WARN": 1500 }, "fail": ["LOGIN_CHECK"] }
```

## Tests and CI

`.github/workflows/ci.yml` runs on every pull request, on pushes to `main`, and on demand. It has two jobs:

1. **Typecheck, unit and integration tests.** The unit suite also checks that every trap in `traps/registry.ts`
   has complete documentation, a code comment with its ID, valid delay names, and at least one
   verification test, so an undocumented or unverified trap fails CI.
2. **Verification suite.** Builds the production app, installs Chromium and runs `npm run verify`.
   On failure, the HTML report and traces are uploaded as an artifact.

## Build status

| Phase | Scope | Status |
|---|---|---|
| a | Shell, branding, navigation, i18n, dark mode, mock layer, home, login/register, SMS inbox, session timeout | ✅ |
| b | Electricity connection ✅, water bill + AstheenPay ✅, property tax, grievances | 🚧 |
| c | Certificates, news & events, directory, bookings, dashboard, help, officer queue | ⏳ |
| d | Full registry, trap guide (Markdown + PDF via `npm run guide`), complete verification | ⏳ |

Routes for modules not yet built show a "temporarily unavailable" notice.
