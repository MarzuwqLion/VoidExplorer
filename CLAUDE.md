# Sojourner — working rules

Read PLAN.md and docs/SPEC.md before doing anything.

- Never stop to ask. On ambiguity pick what serves the pillars, log one line in DECISIONS.md (what, why, how to reverse), keep going.
- A finished milestone is not a stopping point: commit, tick it in PLAN.md, start the next one. Only stop at the section 13 definition of done.
- PLAN.md: one line per milestone (`- [ ] M0 Foundation`), gate checks indented beneath, "Next up" line at the top. Cuts are ticked with "(cut)".
- On resume: re-read CLAUDE.md, PLAN.md, docs/SPEC.md, continue from "Next up". Never restart finished work.
- Skeleton first, then depth. The full-loop test passes at every commit from M1. Thin is fine, fake is not.
- Run every gate. Three focused attempts, then log in KNOWN_ISSUES.md, apply simplest fallback, move on. Never mark a failing check as passed.
- `npm run dev` and `npm run build` work at every commit. Run the full test suite before each milestone commit.
- No TODOs, empty functions, placeholder screens or fake data in the final build. Cut using the spec's cut order and record cuts.
- Look at screenshots (tests/screenshots/M<n>/). Black screens or overlapping UI fail the gate.
- Every number lives in src/data as a typed constant. Every proper name lives in src/data/names.ts.
- Source files under about 400 lines. Stay in scope (spec section 13 out-of-scope list).
- Commits: `M5: bridge, crew dialogue and upgrade terminal working`.

## Commands
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run typecheck` / `npm run lint` / `npm test` (Vitest) / `npm run e2e` (Playwright)
