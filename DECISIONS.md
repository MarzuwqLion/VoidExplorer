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
- Amara and Korr level geometry was built by subagents from layouts.ts. Recorded deviations: Amara's Ridge ramp loops east via (82,-34)-(88,-44)-(84,-52) to stay under 30 degrees, and the Ridge plateau starts at x 19; Korr's mesa ramp is 30 m long (31 degrees), the yard's west wall and side door sit at x -13.8, and the dock walls were pushed 1.6 m south and 2 m north to fit the crate and extraction pad. All named places stay within 5 m of the table. — Reverse: src/world/planets/*.
- Korr's gantry walkway sits on a solid machinery housing so nothing walks underneath (the nav grid is single-layer), and its railings are visual only so they don't block sight lines or shots. — Reverse: src/world/planets/korrProps.ts.
- When a boss dies, the rest of its encounter flees and despawns after 4 s; boss add spawns are validated with a nav path from the boss. — Reverse: Director.rout in src/ai/director.ts.
- When two or fewer enemies remain in an active encounter, the compass marks them in red so the player can find stragglers. — Reverse: PlanetScene.postStep.
- The loop bot runs with god mode and infinite ammo; its job is to prove beats, triggers, doors and transitions, not to win on skill. — Reverse: Bot.start in src/debug/bot.ts.
- Crew hubs show at most four choices: three topics before any mission; afterwards each planet gets a two-topic submenu and the first three move under "Earlier topics". — Reverse: src/data/dialogue/crew.ts.
- Brandt's terminal line is shown on the upgrade terminal panel; the "Upgrades" dialogue topic was folded into his system topic to keep the hub at four choices. — Reverse: src/ui/upgradeTerminal.ts.
- Okonkwo's after-action talk plays automatically the first time you speak to her after each mission; the final debrief uses automatic branches for the survey and lookout variants. — Reverse: src/data/dialogue/okonkwo.ts.
- Bloom is on by default with a Settings toggle (EffectComposer, UnrealBloomPass, OutputPass). — Reverse: settings.bloom default in src/core/save.ts.
- E2E runs start Vite with E2E=1, which disables HMR and file watching so edits during a long run cannot reload the test page. — Reverse: vite.config.ts.
- Draw-call budget: rigs fold hands, feet, neck and shoulder pads into their parent joints, each joint's parts merge into one vertex-coloured mesh, only the largest two parts of an enemy cast shadows, and enemies beyond 18 m swap to a single baked mesh. Busy moments measured at bridge 201, Amara 232, Korr 269 (including shadow and bloom passes). — Reverse: src/world/models/optimize.ts and LOD_DIST in src/ai/enemyViews.ts.
- Korr gets a soft suit lamp following the commander so the dusk interiors stay readable. — Reverse: PlanetScene.enter.
- Lights are disposed with their scene (shadow maps), which removed a texture leak across scene changes. — Reverse: disposeObject in src/scenes/scene.ts.
