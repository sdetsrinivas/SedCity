---
name: module-loop
description: Build the next module(s) of the portal with a developer subagent (Opus 5.5, medium effort), a basic-but-complete review by a fresh-context reviewer subagent (Fable 5.2, medium effort), fix, CI, merge, then continue with the next module. Use when the user says "run the loop", "next module" or "continue building".
---

# Module loop (user-authorised: auto-merge on green CI)

The user explicitly authorised this loop, including merging PRs without asking each time. Run it module by module, sequentially, until the user stops it or `docs/PROGRESS.md` has no module left.

For each module (take the next item under "Next up" in `docs/PROGRESS.md`; split big modules into small PRs per CLAUDE.md):

1. **Develop.** `Agent` with `model: "opus"`, `effort: "medium"`, default type. Brief: read CLAUDE.md, docs/PLAN.md, docs/PROGRESS.md; branch from an up-to-date `main` (`phase-x/<module>`); implement the module with tests, registry entries, verification checks and doc updates; run `npm run typecheck && npm test` and the module's Playwright checks; do the visual checks from CLAUDE.md; commit, push, open the PR; wait for CI with `gh pr checks <n> --watch`; return the PR number and the trap IDs.
2. **Review.** `Agent` with `model: "fable"`, `effort: "medium"`, a **fresh agent every time** (empty context, never SendMessage to a previous reviewer). Brief it like this, adding only the PR number and its trap IDs: "This is a demo/test practice website, not production. Review PR #N (`gh pr diff N`). Read every changed file in the diff, including `traps/registry.ts`, the `verification/*.spec.ts` files and any file outside the module's own folder; do not rely on CI passing as a substitute for reading. Check: (a) obvious bugs, broken logic, crashes, type or test problems; (b) CLAUDE.md rules (visible text must not hint at traps, no data-testid, i18n keys in both languages, delays registered); (c) for each new trap ID, the code really does what its registry entry says and its `[ID]` spec asserts that behaviour rather than something trivial; (d) changes to shared files (layout, components, i18n tests) do not break other pages. The quirks described in the registry entries are intended, not bugs. No one-in-a-hundred edge cases, no style nitpicks, no refactor suggestions. Do not modify code. Post findings as one `gh pr review N --comment` and return a short list or 'LGTM', plus a line naming anything you did not read."
3. **Fix.** If the reviewer returned findings, `Agent` with `model: "opus"`, `effort: "medium"` (a new developer agent given the PR number and the findings). It fixes only what clearly makes sense in this project's context, skips the rest (replying with a one-line reason on the PR), pushes to the same branch and waits for CI. One review round only; do not loop reviews.
4. **Merge.** When `gh pr checks <n>` is all green, `gh pr merge <n> --squash --delete-branch`, then `git checkout main && git pull`. If the working tree has uncommitted user changes, stash them around the checkout/pull (`git stash push … && git checkout main && git pull --ff-only && git stash pop`) — otherwise `gh pr merge` merges remotely but fails the local checkout. If CI is red after the fix round, stop the loop and report to the user instead of merging.
5. **Next.** Check `docs/PROGRESS.md` was updated by the PR, then start step 1 for the next module from fresh `main`. Never stack PRs.

After each merged module give the user a two-line summary: PR number, trap IDs now live.
