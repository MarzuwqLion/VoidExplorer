# Decisions

Format: what — why — how to reverse.

- Spec was provided at docs/spec.md; renamed to docs/SPEC.md to match the spec's repo layout. The "save prompt to docs/SPEC.md" step was skipped as instructed — the owner had already saved it. — Reverse: rename the file.
- Playwright runs headless Chromium with --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader; WebGL works with these flags. — Reverse: edit playwright.config.ts.
- @dimforge/rapier3d-compat (WASM inlined) is used so physics runs both in the browser and in Vitest under Node for headless simulation tests. Bundle is ~5 MB as a result. — Reverse: switch to @dimforge/rapier3d with a wasm loader plugin.
- Enemies do not use Rapier bodies: they move on the baked nav grid (which stores walkable height), and shots use analytic hitboxes after a Rapier raycast against static geometry. Cheaper and makes weak spots trivial. — Reverse: add kinematic bodies in src/ai.
- Pointer-lock loss opens the pause menu with a "Click to resume" subtitle; clicking the dimmed background or Resume re-locks. — Reverse: src/core/game.ts pause().
- Rapier's built-in autostep did not climb 0.3 m steps in this setup, so the controller does its own step-up (probe ahead for a walkable ledge no higher than 0.35 m and lift onto it). — Reverse: re-enable cc.enableAutostep in src/player/controller.ts.
- After a move, velocity is projected off wall normals reported by the character controller instead of clamped per axis (the clamp bled speed on small corrections). — Reverse: src/player/controller.ts.
- On the bridge, Shift jogs (walk is the default); on planets jog is the default, light stick tilt walks and Shift is the roadie run. — Reverse: PlayerController target speed selection.
- Raider aim error is a uniform cone of 1.9 degrees plus 0.22 degrees per m/s of commander speed: measured 60% hits at 20 m standing still and about 35% while jogging (unit test). — Reverse: AI.aimErrorBase/aimErrorPerSpeed in src/data/enemies.ts.
- Riflemen only use low cover (1.0 to 1.4 m) so they can pop up and fire over it; tall cover is used by the commander and other enemies. — Reverse: lowOnly in src/ai/brains.ts.
- While grounded the controller sends no vertical input (snap-to-ground follows slopes); Rapier trimmed horizontal motion on ordinary floor contacts otherwise. — Reverse: src/player/controller.ts.
- Enemy models were built by a subagent in src/world/models/enemyModels.ts and creature.ts; the foreman uses 56 meshes, above the 40 guideline, still within the draw-call budget. — Reverse: simplify the foreman model.
