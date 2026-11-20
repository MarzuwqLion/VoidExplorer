# Decisions

Format: what — why — how to reverse.

- Spec was provided at docs/spec.md; renamed to docs/SPEC.md to match the spec's repo layout. The "save prompt to docs/SPEC.md" step was skipped as instructed — the owner had already saved it. — Reverse: rename the file.
- Playwright runs headless Chromium with --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader; WebGL works with these flags. — Reverse: edit playwright.config.ts.
- @dimforge/rapier3d-compat (WASM inlined) is used so physics runs both in the browser and in Vitest under Node for headless simulation tests. Bundle is ~5 MB as a result. — Reverse: switch to @dimforge/rapier3d with a wasm loader plugin.
- Enemies do not use Rapier bodies: they move on the baked nav grid (which stores walkable height), and shots use analytic hitboxes after a Rapier raycast against static geometry. Cheaper and makes weak spots trivial. — Reverse: add kinematic bodies in src/ai.
- Pointer-lock loss opens the pause menu with a "Click to resume" subtitle; clicking the dimmed background or Resume re-locks. — Reverse: src/core/game.ts pause().
