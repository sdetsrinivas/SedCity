# Astheenapuram Citizen Services Portal

Realistic municipal portal for a fictional city that doubles as a **UI-automation practice site**. Each element type exists in several implementations ("traps") inside real service flows.

Read first: [docs/PLAN.md](docs/PLAN.md) (goal, stack, module order, delays, full trap map) · [docs/PROGRESS.md](docs/PROGRESS.md) (what's done, what's next, open questions, gotchas) · [README.md](README.md) (commands, accounts, layout).

## Rules — product

- It must look like a genuine government portal. **Never** put "trap", "test", "demo", "automation" or hints in any visible text, aria-label, placeholder or URL.
- Traps live inside real service flows, never on a gallery page. Each variant of the same element type goes on a different page/flow.
- **Never add `data-testid`** (or any test-only attribute). Difficulty mix ≈30% easy (good ids/labels) / 40% medium / 30% hard.
- All branding original and fictional; currency ₹ (`formatINR`); dates shown DD/MM/YYYY. No real payments, services or personal data.
- Every user-visible string goes through i18n: add the key to both `src/i18n/en.ts` and `ta.ts` (Tamil is typed against English; `i18n.test.ts` enforces key and placeholder parity).
- Frontend only. All "API calls" go through `call()` in `src/mock/api.ts`. **Every simulated delay is registered by name in `src/mock/delays.ts`** with page, element and trap IDs (the trap guide lists them).
- The trap guide (`docs/`, PDF via `npm run guide` in phase d) is **never linked or served** from the site.

## Rules — traps

Adding or changing a trap requires all of:
1. An entry in `traps/registry.ts` (single source of truth): what, how implemented, why hard, Selenium + Playwright strategy, what to assert, difficulty, linked delays.
2. A code comment containing the trap ID (e.g. `// DRP-08: …`) in one of the entry's `files`.
3. At least one Playwright check in `verification/*.spec.ts` whose title contains `[ID]`.

`traps/registry.test.ts` fails CI if any of the three is missing. Update the status in `docs/PLAN.md` and `docs/PROGRESS.md` in the same PR.

## Rules — workflow

- **Small PRs: one module (or smaller) per PR**, each with tests, registry entries and verification checks. Put shared infrastructure in its own PR first. The user asked for smaller PRs after the 117-file phase (a) PR.
- **Branch every PR from `main`. Never stack PRs** (merging the base auto-closes the dependent PR).
- Branch names: `phase-x/<module>` or `docs/<topic>`. Commit/PR attribution lines: follow the harness reminder.
- Open the PR, wait for CI (`gh pr checks <n> --watch`). **Merge only when the user asks, or inside the `module-loop` skill** (`.claude/skills/module-loop/`), where the user pre-authorised auto-merge on green CI after one review round. Orchestrator = Fable 5.2 medium (the session), developer = Opus 5.5 medium, reviewer = fresh Fable 5.2 medium.
- Don't assume approval carries over; confirm outward-facing or hard-to-reverse actions.
- After each module: run all tests, fix failures, then summarise what was built and which trap IDs are now live.
- Verify UI changes visually (Playwright screenshots) at desktop, mobile (390px), dark mode and Tamil before opening a PR.

## Rules — code

- Next.js App Router + TypeScript, React 19. Server Components by default; `"use client"` only where needed.
- **Delayed-hydration traps need non-native controls**: React 19 replays native input changes made before hydration (see CHK-09).
- Keep code readable; one component per file; module code in `src/modules/<module>/`; vanilla (no-framework) code in `src/vanilla/`.
- Alerts use full subtle borders (no thick side-stripe) — the design hook flags side-tab borders.
- Tests: pure logic → unit tests next to the code (`*.test.ts`); components + mock API → `tests/integration/`; behaviour in a real browser → `verification/`.

## Commands

```bash
npm run dev                 # http://localhost:3000
npm run typecheck && npm test           # tsc + unit + integration
npm run verify              # Playwright vs production build (needs: npm run verify:install once)
SKIP_BUILD=1 npx playwright test -c verification/playwright.config.ts -g "DRP-08"   # one trap, reuse a running server on :3100
lsof -ti:3100 | xargs kill  # free the verification port (pkill -f "next start" does NOT work)
```

Test-only overrides: cookie `amc_mock` = URL-encoded JSON `{"scale":0,"delays":{"NAME":ms},"fail":["NAME"]}` (set in specs via `mockDelays()` in `verification/fixtures.ts`).
