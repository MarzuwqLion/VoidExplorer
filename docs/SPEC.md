# Sojourner — Claude Code Build Prompt (Space Survey MVP)

Nov 19, 2026 · @Marzuwq Muhammad

## Before you paste

Everything from section 1 down is the prompt. This section is for you and stays out of it.

**Hand-off, in order.**

1. Create an empty repo and open Claude Code in it.
2. Switch to Auto mode so approvals cannot stall the run: start with `claude --permission-mode auto` in a terminal, or pick Auto in the mode dropdown on web or desktop. Auto mode runs commands without asking, behind a safety check ([permission modes](https://code.claude.com/docs/en/permission-modes)).
3. Optional but worth it: add the stop hook below before you start.
4. Paste sections 1 to 14 as the first message. Or save them as `SPEC.md` in the repo and send: "Read SPEC.md and build it exactly as written."
5. If it ever stops early, send: "Read PLAN.md and continue until the M11 gate passes."
6. When it finishes, play with the tuning panel open (backquote key) and set the camera, recoil and sensitivity by feel.

**Optional stop hook.** Claude Code runs this script each time it tries to end its turn. While `PLAN.md` still has unticked milestones, the script sends it back to work. It gives up after 40 pushes, so a stuck run cannot loop forever. The format follows the [hooks reference](https://code.claude.com/docs/en/hooks). I have not run this hook myself, so test it once before relying on it, and delete both files when the build is done.

Save as `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/keep-going.sh\""
          }
        ]
      }
    ]
  }
}
```

Save as `.claude/hooks/keep-going.sh`. On Windows, Git for Windows must be installed and the file must use LF line endings, not CRLF. No `chmod` is needed on any system:

```bash
#!/bin/bash
# Sends Claude Code back to work while PLAN.md has unticked milestones.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f PLAN.md ] || exit 0
count_file=".claude/keep-going.count"
n=$(cat "$count_file" 2>/dev/null || echo 0)
if grep -qE '^- \[ \] M[0-9]+' PLAN.md && [ "$n" -lt 40 ]; then
  echo $((n + 1)) > "$count_file"
  echo "PLAN.md still has unticked milestones. Do not stop. Re-read PLAN.md, continue from Next up, and keep going until the M11 gate passes." >&2
  exit 2
fi
exit 0
```

**What is yours to change.**

- **Locked from your answers.** Steerable system map, crouch cover plus roll, solo commander on the surface, two-planet mission arc.
- **Defaults I chose.** Three.js, TypeScript, Vite and Rapier, the same stack as the earlier builds. Keyboard and mouse plus gamepad. Text-only dialogue. Every model and sound built in code. A small resource-to-upgrade loop on the ship so collecting has a purpose.
- **Story and script.** The premise in section 1 and every line in section 14 are mine, written so the voice is fixed instead of guessed. Rewrite any of it.
- **Placeholder names.** Sojourner (title and ship), the Armed Survey Corps, Commander Kade, the Oriel system, Amara and Korr, all crew and weapon names. Section 3 has Claude Code keep them in one data file so a rename takes a minute.

**What no prompt can do.** It cannot get past a usage limit or a session cap. The progress file and the stop hook only make recovery quick. It also cannot feel the game, which is why section 13 has it build a tuning panel for you.

## 1. Mission and pillars

You are the sole engineer, designer and artist on a browser game MVP with the working title **Sojourner**. Build the whole game in this repository in one continuous run, following the milestones in section 12, without stopping for approval.

**What it is.** A third-person sci-fi exploration shooter. The player is Commander Kade of the ASV Sojourner, a survey ship of the Armed Survey Corps. The Corps is a paramilitary exploration service whose teams always deploy armed. The ship has just arrived in the Oriel system: one sun, 15 planets, two of them habitable.

**Premise.** The Corps has lost contact with two ground teams in this system: the survey station on Amara and Team Cobalt on Korr. The Sojourner is sent to find them and finish the survey. Amara's trouble turns out to be wildlife. Korr's turns out to be people. Section 14 has the script.

**Core loop.**

1. Walk the bridge in third person and talk to the crew.
2. Use the star map console to open the system map and pilot the ship between planets.
3. Approach any planet to see its survey information. The two habitable planets offer a landing.
4. On the surface, explore a 3D area on foot: talk to people, fight, collect resources, finish the mission, extract.
5. Back on the ship, spend resources on upgrades, hear the crew react, fly to the next planet.
6. After both missions, a debrief on the bridge ends the demo.

**Inspiration.** Take the structure from Mass Effect: a ship hub, crew conversations, a system map, planet landings. Take the camera and gunfeel from Gears of War: a tight over-the-shoulder view, weighty movement, fights around cover. These are references for feel only. Everything in the game must be original. Use no names, characters, logos, designs, text or audio from those games or any other.

**Pillars. These can never be cut.**

1. The full loop is playable start to finish: bridge, system map, both planets, debrief.
2. An over-the-shoulder third-person camera everywhere the player walks.
3. Three weapons: pistol, submachine gun, battle rifle.
4. A sun and 15 planets, each showing survey information on approach. Exactly two can be landed on.
5. Conversations with the crew on the bridge and with characters on both planets.
6. Fighting, talking and resource collecting on both planets.
7. Playable in a desktop browser with keyboard and mouse, and with a gamepad.

**Target length.** 20 to 30 minutes for a first full playthrough.

**Quality bar.** A polished MVP: small in scope, but everything in it finished, readable and consistent. The final build has no gray boxes, placeholder text or dead buttons.

## 2. How to work

The owner is not watching and will test only when everything is finished. A question or a pause stalls the whole project, so these rules outrank your usual habits.

1. **Never stop to ask.** Do not ask questions, request approval or present a plan for sign-off. When something is ambiguous, pick the option that best serves the pillars, add one line to `DECISIONS.md` (what, why, how to reverse it) and keep going.
2. **A finished milestone is not a stopping point.** Commit, tick it off in `PLAN.md` and start the next milestone in the same turn. Before you end any turn, open `PLAN.md`. If a milestone is unticked and not recorded as cut, you are not done, so start it. Never end a turn with a progress summary or an offer to continue. The only valid place to end is the definition of done in section 13.
3. **First actions, before any game code.** Save this entire prompt word for word to `docs/SPEC.md`. Create `CLAUDE.md` with a short summary of these rules and the line "Read PLAN.md and docs/SPEC.md before doing anything." Create `PLAN.md`, `DECISIONS.md` and `KNOWN_ISSUES.md`. Make the first commit.
4. **PLAN.md format.** One line per milestone, exactly like `- [ ] M0 Foundation`, ticked as `- [x] M0 Foundation`. A milestone that was cut is ticked with "(cut)" after its name. Indent each milestone's gate checks beneath it. Keep a "Next up" line at the top that says exactly what to do next.
5. **Resume from PLAN.md.** If your context is compacted or a new session starts, re-read `CLAUDE.md`, `PLAN.md` and `docs/SPEC.md`, then continue from "Next up". Never restart or re-plan finished work.
6. **Skeleton first, then depth.** M1 builds a thin version of the whole loop. From then on the full-loop test passes at every commit and each milestone deepens one part. Thin is fine early: a plain room, plain spheres, a flat field. A fake is never fine: a button that does nothing, or a feature that only pretends to work.
7. **Run every gate, and never halt on one.** If a gate check fails, fix it. If the same check still fails after three focused attempts, log it in `KNOWN_ISSUES.md` with what you tried, apply the simplest fallback that keeps the game playable and move on. Never mark a failing check as passed.
8. **The game runs at every commit.** `npm run dev` starts it, `npm run build` passes and earlier milestones still work. Run the full test suite before each milestone commit.
9. **Nothing unfinished in the final build.** No TODO comments, empty functions, "coming soon" screens or fake data. If something has to shrink, use the cut order below and record the cut.
10. **Look at what you built.** Take screenshots and open them, as section 13 describes. A black screen, a character facing the wrong way or overlapping UI is a failed gate.
11. **Budget your effort.** Section 12 gives each milestone a share of your total effort. Tests and harness work get about a fifth of the total. If a test is taking longer than the feature it checks, simplify the test, log it and move on.
12. **Protect your context.** Keep source files under about 400 lines. Hand long content jobs (dialogue, planet data, tests) to subagents and have them report back in a few lines. Update `PLAN.md` before any long operation. One main thread owns integration, `PLAN.md` and commits.
13. **Stay in scope.** Add nothing this spec does not ask for. Section 13 lists what is out.

**Priorities.** When two things compete for effort, the higher one wins.

1. The loop works end to end.
2. Moving, aiming and shooting feel solid.
3. The two planet missions are complete and readable.
4. The bridge, crew and system map are complete.
5. Polish: audio, effects, menus, save.

**Commits.** At least one per milestone, in the form `M5: bridge, crew dialogue and upgrade terminal working`.

**Cut order.** If time or context is at risk, cut from the top of this list and log it. Never cut a pillar.

1. Shoulder swap.
2. Lean at tall cover.
3. Bloom and other post-processing.
4. Save and continue (keep new game only).
5. Asteroid belt and planet rings.
6. Gamepad rumble and the generative tension audio.
7. The third ship upgrade.
8. The Spitter enemy on Amara.
9. The Marksman enemy on Korr.
10. Second phases of both bosses.
11. Crew dialogue variants after each mission (keep the single final debrief).

## 3. Tech stack and architecture

**Stack.**

- TypeScript in strict mode, Vite, Three.js for rendering, Rapier (WASM) for physics and character collision.
- Vitest for unit tests. Playwright with Chromium for end-to-end tests and screenshots. ESLint and Prettier.
- Use current stable versions. For API details, read the installed package's types and docs instead of trusting memory.
- No game engine, no backend, no network calls at runtime. The build is a static site that works from `dist/` on any path, so set the Vite base to `./`.
- No external art, audio or font files. Models, materials, animation and sound are all generated in code (section 11). Use the system font stack.
- All UI (HUD, dialogue, panels, menus) is an HTML and CSS overlay, not text drawn in the canvas.

**Repo layout.**

```
docs/SPEC.md                 this prompt
CLAUDE.md  PLAN.md  DECISIONS.md  KNOWN_ISSUES.md  README.md
src/main.ts                  boot and scene manager
src/core/                    fixed-step loop, input, events, save, audio engine, seeded rng
src/scenes/                  title, bridge, systemMap, planet, end
src/player/                  controller, camera, weapons, animation
src/ai/                      nav grid, perception, enemy brains, encounter director
src/world/                   procedural meshes, terrain, props, materials
src/ui/                      hud, dialogue, panels, menus
src/data/                    names.ts, tuning.ts, weapons.ts, enemies.ts, planets.ts, layouts.ts, dialogue/, missions/
src/debug/                   debug panel, window.__game API, autoplay bot
tests/unit/  tests/e2e/  tests/screenshots/
```

**Architecture rules.**

- **Data-driven.** Every number in this spec lives in `src/data` as a typed constant, never inline in logic. Planets, weapons, enemies, dialogue and missions are data files.
- **Names in one place.** Every proper name (game title, ship, Corps, characters, planets, weapons) is defined once in `src/data/names.ts` and referenced everywhere else, so the owner can rename anything in one edit.
- **Feel values on top.** Put the values that need hands-on tuning (camera offsets, sensitivities, recoil, movement speeds) at the top of `tuning.ts` with a one-line comment each.
- **Fixed 60 Hz simulation** decoupled from rendering, with interpolation. Game logic must not depend on frame rate. Expose a way to step the simulation manually for tests.
- **Seeded randomness** for terrain, prop scatter and weapon spread, so runs and screenshots are reproducible.
- **One input layer** maps keyboard, mouse and gamepad to named actions. Game code reads actions only. Prompts show glyphs for the device used last.
- **Scenes clean up.** Each scene owns its objects and disposes all geometry, materials and listeners on exit. Entering a scene five times must not leak.
- **One game state object** holds mission flags, resources, upgrades, surveyed planets and stats, and serializes to JSON.

* **Layouts as data.** The coordinates in sections 8 and 10 live in `layouts.ts`. Scenes build from that file, and the top-down map in section 13 draws from the same file.
* **Small files.** Keep source files under about 400 lines so they stay cheap to read and edit late in a long session.

**Performance budget.** Headless tests cannot measure real frame rate, so design to these limits instead: at most 300 draw calls per scene, instancing for repeated props and foliage, one shadow-casting directional light with a 2048 map, device pixel ratio capped at 1.5, at most 12 active enemies at once.

## 4. Game flow

The game is a chain of five scenes: title, bridge, system map, planet, end screen. The player moves through them in this order.

1. **Title.** "New game", "Continue" when a save exists, "Controls", "Settings".
2. **Intro card.** Three sentences of text over the ship approaching the star. Skippable.
3. **Bridge.** The commander spawns at the aft door. First objective: "Speak with the XO". After the briefing: "Use the star map". Crew conversations and the upgrade terminal are available at any time.
4. **System map.** Opened from the star map console. The player pilots the ship. "Return to bridge" is always available.
5. **Landing.** Near a habitable planet, "Land" plays a 4-second descent: the shuttle leaves the ship, the planet grows, a mission title card appears. Then the planet scene loads. Take a snapshot of the game state at this moment.
6. **Planet.** The mission in section 10 plays out. Death respawns the player at the last checkpoint. Before the mission is complete the shuttle offers "Abort mission", which restores the landing snapshot and returns to the system map. After it is complete the shuttle offers "Extract".
7. **Takeoff.** A 3-second transition back to the system map, beside the planet. A completed planet shows "Mission complete" in its panel and cannot be landed on again.
8. **Bridge after a mission.** The crew have new lines, the XO gives a short after-action talk and the upgrade terminal has resources to spend.
9. **Debrief and end.** After both missions, the XO conversation is the final debrief. When it ends, show the end screen: play time, enemies defeated, accuracy, resources gathered, planets surveyed out of 15, upgrades bought and the choices made. Options: "Keep exploring" (free roam of the ship and map) and "Main menu".

**Rules that apply throughout.**

- The planets can be done in either order. The XO recommends Amara first.
- A pause menu works in every scene: resume, controls, settings, quit to title.
- Autosave on entering the bridge and on entering the system map.

## 5. Player, camera and controls

**The commander.** Commander Kade is 1.8 m tall, with a capsule collider of radius 0.35 m. Corps armor is matte slate-gray plates over a dark undersuit, with an amber stripe on the right shoulder and chest. On planets Kade wears a full helmet with an amber visor. On the bridge the helmet is off.

**Always armed.** On a planet the commander always has a weapon in hand. There is no unarmed state. On the bridge the pistol sits holstered on the thigh, weapons cannot be fired, and movement is walk and jog only.

**Camera.** Third person, over the right shoulder, in every walking scene.

| State | Behind | Right | Height | FOV | Notes |
| --- | --- | --- | --- | --- | --- |
| Default | 2.6 m | 0.55 m | 1.6 m | 70 | Commander sits left of center, crosshair at screen center |
| Aiming | 1.4 m | 0.60 m | 1.6 m | 50 | Blend in 0.15 s, commander faces the aim direction |
| Roadie run | 2.2 m | 0.55 m | 1.35 m | 78 | Light camera bob |
| Dialogue | n/a | n/a | n/a | 45 | Blend over 0.4 s to a shot past the commander's shoulder at the speaker |

- When not aiming, the commander turns toward the movement direction. Firing from the hip snaps the commander to face the camera direction.
- **Collision.** Sphere-cast from the pivot to the camera and pull in when blocked. The camera never passes through walls or terrain. Fade the commander out when the camera is closer than 0.6 m.
- **Aim through the crosshair.** Raycast from the camera through the crosshair to find the aim point, then fire from the muzzle at that point. If something near the muzzle blocks the shot, show a blocked-crosshair marker.
- Pitch range is -60 to +70 degrees. Settings include mouse sensitivity, gamepad sensitivity and invert Y.
- On gamepad, slow the look speed slightly while the crosshair is over an enemy. No snap or lock-on.

**Movement.**

| Move | Value |
| --- | --- |
| Walk | 2.0 m/s (bridge default, light stick tilt) |
| Jog | 4.5 m/s |
| Roadie run | 7.0 m/s while held, labeled "Sprint" in the game's own UI, turn rate limited to 180 degrees per second, cannot fire, no stamina |
| Aim walk | 2.2 m/s |
| Crouch walk | 2.2 m/s, capsule height 1.1 m |
| Dodge roll | 5 m over 0.55 s in the move direction, invulnerable for the first 0.30 s, 0.8 s cooldown |
| Melee | Rifle-butt strike, 50 damage, 1.8 m reach, 60 degree arc, 0.6 s, staggers |
| Acceleration | Full speed in 0.15 s, stop in 0.12 s |
| World | Gravity -20 m/s2, walkable slope up to 40 degrees, step up 0.35 m, no jump |

**Cover.** Manual, with no snapping to walls.

- Crouch is a toggle. Any solid object at least 1.0 m tall physically blocks shots, so a crouched commander behind it is safe from that side.
- Holding aim while crouched behind low cover (1.0 to 1.4 m) stands the commander up to shoot over it. Releasing aim drops back down. Each takes 0.2 s.
- At the edge of tall cover, aiming leans the commander and camera 0.4 m toward the open side, detected with side raycasts. If lean detection proves unreliable, remove it and log the cut. The crouch pop-up must work.
- Roadie run and roll cancel crouch.
- Both planets must be built with plenty of cover between 1.0 and 1.4 m tall.

**Controls on foot.** Never bind anything to Ctrl, because Ctrl+W closes the browser tab.

| Action | Keyboard and mouse | Gamepad (Xbox layout) |
| --- | --- | --- |
| Move | W A S D | Left stick |
| Look | Mouse | Right stick |
| Aim | Right mouse, hold | LT |
| Fire | Left mouse | RT |
| Reload | R | X |
| Interact, talk, harvest | E | X when a prompt is showing |
| Roadie run | Shift, hold | Click left stick to start, ends on stop or aim |
| Dodge roll | Space | A |
| Crouch toggle | C | B |
| Melee | F | RB |
| Medkit | Q | LB |
| Pistol, SMG, battle rifle | 1, 2, 3 | D-pad left, up, right |
| Next weapon | Mouse wheel | Y |
| Shoulder swap | X | Click right stick |
| Objectives log | Tab | View |
| Pause | Esc | Menu |
| Debug panel | Backquote | n/a |

**Controls in dialogue and menus.** W and S or the arrow keys plus E or Enter, mouse click, or left stick and D-pad plus A to confirm and B to go back.

**Mouse capture.** Click the canvas to lock the pointer. When the lock is lost, pause and show "Click to resume".

**Input defaults.** These are starting values. All of them appear in the tuning panel from section 13.

| Setting | Default |
| --- | --- |
| Mouse look | 0.10 degrees per pixel at sensitivity 1.0, slider from 0.2 to 3.0, x0.6 while aiming |
| Gamepad look | 200 degrees per second horizontal and 120 vertical at full tilt, response curve exponent 1.8, x0.55 while aiming |
| Stick dead zone | 0.15 radial on both sticks |
| Trigger threshold | 0.3 |
| Aim slowdown, gamepad only | Look speed x0.6 while the crosshair is within 1.5 degrees of an enemy |
| Interact range | Within 2.2 m and within 60 degrees of the camera direction |
| Knockdown | 1.0 s on the ground, then a 0.4 s get-up during which the commander cannot be hurt |

## 6. Weapons and combat

The commander carries all three weapons at all times on a planet and lands with the battle rifle in hand. Shots are hitscan with visible tracers, a muzzle flash and impact effects. Swapping takes 0.35 s. The weapons not in hand are visible on the back and thigh.

| Stat | Keeper pistol | Wasp SMG | Longwatch battle rifle |
| --- | --- | --- | --- |
| Fire mode | Semi-auto | Full auto | Semi-auto |
| Damage per shot | 22 | 11 | 38 |
| Fire rate cap | 240 rpm | 800 rpm | 200 rpm |
| Magazine | 12 | 36 | 16 |
| Reserve ammo | Unlimited | 216 max | 80 max |
| Reload time | 1.4 s | 1.8 s | 2.2 s |
| Headshot multiplier | x1.5 | x1.25 | x2.0 |
| Full damage out to | 25 m | 15 m | 60 m |
| Minimum damage from | 45 m (50%) | 30 m (40%) | 100 m (70%) |
| Spread, hip / aimed | 1.0 / 0.2 degrees | 3.0 / 1.4 degrees | 1.8 / 0.05 degrees |
| Spread added per shot | 0.3 degrees | 0.15, up to 2.0 | 0.5 degrees |
| Camera kick per shot | 0.8 degrees | 0.25 degrees | 1.3 degrees |
| Damage to armor bars | x1.0 | x0.6 | x1.4 |
| Role | Backup that never runs dry | Close range, packs of fauna | Range, precision, armor |

- Added spread decays within 0.4 s of the last shot. Camera kick recovers on its own.
- Shots to kill a 100-health target with body shots: pistol 5, SMG 10, battle rifle 3. Unit-test this.
- **Reload.** Manual with the reload action, automatic when firing an empty magazine. A roll, melee or swap cancels it. The commander can move while reloading but cannot fire.
- **Ammo.** Raiders have a 40% chance to drop 18 SMG rounds or 8 rifle rounds. An ammo crate at every checkpoint refills everything. The pistol guarantees the player is never out of options.

**Feedback, all required.** A crosshair that widens with spread. Hit markers: white on hit, red on kill, a distinct shape for headshots. Enemy flinch on every hit. Light screen shake per weapon. A directional damage indicator. "Reload" and "Low ammo" hints. A distinct synthesized sound for each weapon.

**Survivability.**

- **Shield 100.** Recharges at 30 per second after 4 s without taking damage.
- **Health 100.** Does not regenerate.
- **Medkits.** Carry 2. Each restores 60 health over 1.5 s. Usable while moving, not while rolling. Refilled at checkpoints and on the ship.
- Damage hits the shield first and overflow carries into health.
- At 25 health or less, pulse a red vignette and play a heartbeat.
- **Death.** Fade for 1.5 s, then respawn at the last checkpoint with full health, shield, medkits and ammo. Enemies killed before that checkpoint stay dead. The current encounter resets.

**Tuning intent.** One difficulty level. A player standing in the open against three riflemen should last about 6 seconds. A player using cover should lose shield often and health rarely. If simulations show the player dying faster than that, lower enemy accuracy first, then enemy damage, and log the change.

## 7. Enemies and AI

Amara has hostile wildlife and Korr has armed raiders, so the two planets fight differently. Each ends with a boss.

**Shared AI rules.**

- **Navigation.** Grid A\* with 0.5 m cells, baked at scene load from static colliders and slope, with path smoothing and simple avoidance between agents. Reach for a navmesh library only if the grid fails.
- **Perception.** Vision cone of 110 degrees out to 45 m with a line-of-sight raycast. Gunfire within 40 m alerts. An alerted enemy alerts its group within 25 m after 0.5 s.
- **Encounters** are authored groups started by trigger volumes. When every member is dead the encounter ends, a checkpoint saves and an ammo crate unlocks.
- **Raider accuracy** is an aim-error cone, never perfect aim. Target hit rates at 20 m: 60% against a stationary player, 35% against a moving one. Shots at a crouched player behind cover hit the cover. The first shot after spotting the player is delayed 0.6 s.
- **Attack tokens.** At most three raiders fire at once. The others reposition or flank.
- **Telegraphs.** Any attack dealing 30 damage or more has a pose, a sound and a color cue lasting at least 0.5 s.
- **Reactions.** Enemies flinch when hit, stagger when struck in melee, play a death animation and fade after 8 s. Enemies cannot hurt each other.
- **Budget.** A typical encounter has 4 to 7 enemies and never more than 12 are active.

* **Cover points.** Section 10 lists the cover in each arena. At scene load, generate cover points 0.6 m from each face of every cover piece. A raider picks the nearest free point that blocks the line to the player. If peeking proves unreliable, fall back to a simple cycle at the cover point: crouch for 2 s, stand and fire for 2 s.
* **Spawns.** Enemies spawn at authored points out of the player's sight when the player crosses an arena's trigger, never by popping in on screen.

**Amara wildlife.**

| Enemy | Health | Behavior | Attack |
| --- | --- | --- | --- |
| Stalker: dog-sized six-legged pack hunter | 60 | Runs at 6.5 m/s, circles, attacks in packs of 3 to 5 | Lunge from 6 m after a 0.4 s crouch: 18 damage, then 1.5 s recovery |
| Spitter: slow, plated back, glowing throat sac | 90 | Keeps 15 to 30 m away and retreats when approached. The sac takes x2 damage | Lobbed acid after a 1.2 s glow: 22 damage in 2.5 m, then a pool dealing 6 per second for 3 s |
| Alpha: bull-sized stalker matriarch, boss | 2,400 | Fought in the Den, a bowl with six rock pillars | See below |

**The Alpha.**

- **Charge.** Paws the ground and roars for 0.9 s, then runs a straight line at 14 m/s for up to 30 m. A hit deals 40 damage and knocks the commander down. If it hits a pillar it is stunned for 2.5 s and its flank takes x2 damage.
- **Swipe.** At close range, 25 damage after a 0.5 s wind-up.
- **Phase 2 at 50% health.** It howls and four stalkers join, once at 50% and again at 25%. The charge cooldown drops from 6 s to 4 s.
- Show a boss health bar at the top of the screen.

**Korr raiders.** Claim jumpers: an illegal mining crew in patched pressure suits, rust-orange and black.

| Enemy | Health | Behavior | Attack |
| --- | --- | --- | --- |
| Rifleman | 100 | Takes cover, peeks for 1.5 to 2.5 s, relocates every 2 or 3 peeks, advances if the player hides for 8 s | Three-round bursts at 8 damage per round, effective from 10 to 40 m |
| Rusher | 70 | Sprints at 6 m/s along flanking routes and shouts before charging | Scattergun: 6 pellets of 6 damage inside 8 m, one shot per second |
| Marksman | 60 | Holds high ground 30 to 70 m away and relocates after 2 shots | Charged shot of 55 damage after a visible red laser tracks for 1.5 s. Breaking line of sight cancels it |
| Foreman: heavy loader exo-rig, boss | 1,600 health under 1,000 armor | Fought on the loading dock. Walks at 2 m/s and never takes cover | See below |

**The Foreman.**

- **Rotary cannon.** Spins up for 1.0 s, then sweeps for 4 s at 10 hits per second and 5 damage per hit. It cannot shoot through cover.
- **Heat sinks.** After each full burst, heat sinks on both shoulders open and glow for 4 s. They can be hit from the front and take x2.5 damage.
- **Armor.** The yellow armor bar must be stripped before health takes damage. Weapon armor multipliers apply.
- **Stomp.** If the commander is within 3 m: 30 damage and knockback after a 0.6 s wind-up.
- **Phase 2 at 50% of total.** Two riflemen and two rushers join. The Foreman adds a mortar: three marked circles of 3 m radius, 1.5 s of warning, 45 damage each.

**Looks.** Every enemy must read by silhouette at 40 m.

- **Stalker.** A lean body 1.2 m long on six thin legs. A narrow eyeless head with a split jaw. Dark teal hide with coral-orange stripes that glow faintly.
- **Spitter.** Squat and 1.4 m tall on four thick legs. Overlapping bone-white back plates. A translucent amber throat sac that brightens before it spits.
- **Alpha.** A stalker scaled to 3.5 m long with heavy shoulders, a crown of bone ridges and brighter stripes. The flank weak spot is a soft glowing patch behind the front legs.
- **Raiders.** Patched pressure suits with mismatched plates and opaque round visors. The Rifleman is plain. The Rusher is lighter, with wrapped arms and a red shoulder cloth. The Marksman wears a long tarp cloak and carries a tall antenna.
- **Foreman.** An industrial exo-rig 2.8 m tall in worn yellow and black hazard paint. An operator cage in the chest, a rotary cannon on the right arm, a loader claw on the left and a heat sink on each shoulder.

## 8. The bridge and crew

The bridge is the hub: one walkable room where the player talks to four crew, buys upgrades and opens the star map.

**Layout.** One room about 18 m by 12 m with a 4 m ceiling.

- **Forward:** a panoramic viewport showing the star and the nearest planet, with the helm station in front of it.
- **Center:** a holographic star map table. This is the console that opens the system map. The XO stands here.
- **Port side:** the science station.
- **Aft starboard:** the armory alcove, with a weapon rack holding the SMG and battle rifle and the upgrade terminal.
- **Aft:** the door where the commander spawns.
- **Mood:** cool blue-white light, amber accent strips, animated console screens, a low engine hum.

**Coordinates.** The origin is the center of the floor. +x is starboard and -z is forward. The room runs 18 m fore to aft (z from -9 to 9) and 12 m across (x from -6 to 6).

| Item | Position (x, z) | Notes |
| --- | --- | --- |
| Viewport | z = -9, from x = -5 to 5 | Floor to ceiling |
| Helm station and Reyes | (0, -6.5) | Seated, facing forward, turns to talk |
| Star map table | (0, -1) | Round, 1.5 m radius, hologram of the system above it |
| Okonkwo | (1.8, -1.5) | Standing at the table |
| Science station and Zhao | (-5, -2) | Against the port wall |
| Armory alcove and Brandt | (4.5, 5.5) | Weapon rack on the wall behind him |
| Upgrade terminal | (5.5, 6.5) | In the alcove |
| Aft door and player spawn | (0, 8) | Commander faces forward |

**Crew.** All dialogue is text only.

| Crew member | Station | Personality | Role in the demo |
| --- | --- | --- | --- |
| Lt. Cmdr. Dara Okonkwo, executive officer | Map table | Dry, exacting, loyal | Mission briefing, after-action talks, final debrief, radio voice on planets |
| Flight Lt. Mateo Reyes, helm | Helm | Cocky, superstitious about the ship | Talks about the system and its planets, explains map flying in character |
| Dr. Lin Zhao, science officer | Science station | Curious, blunt | Explains habitability, wildlife and resources, reacts to what is brought back |
| Chief Tomas Brandt, quartermaster | Armory | Gruff, practical | Explains the three weapons and why the Corps always deploys armed, runs the upgrade terminal |

**Dialogue content.**

- Each crew member has a greeting and three topics before any mission: themselves, the Corps or the ship, and the current system.
- Each gains two new topics after each planet, reacting to what happened there, including the choice the player made.
- Write 150 to 200 lines across the whole game, planets included. Keep every line under 30 words and every answer under three lines.
- Voice: grounded military sci-fi, understated, with some dry humor. No lore dumps. Section 14 has lines to use as written. Match their voice for the rest.

**Dialogue system.**

- A data-driven node graph. Each node has an id, a speaker, text and either a next node or a list of choices. A choice has a label, a target node, optional conditions that read flags and optional effects that set flags, give resources or start objectives.
- Walking up to a character shows a "Talk" prompt. Starting a conversation locks movement, blends to the dialogue camera and opens a bottom panel with the speaker's name and line.
- Text types out at 60 characters per second. Confirm completes the line, then advances. Choices appear as a vertical list of 2 to 4. Visited topics dim. "Goodbye" is always offered at the topic hub.
- Characters turn to face the commander while talking and play idle animation otherwise: breathing, weight shifts, a glance at a console.
- Unit-test every graph: no dead ends, no unreachable nodes, every target resolves.

**Upgrade terminal.** A panel in the armory lists three one-time upgrades, their costs and the resources on hand.

| Upgrade | Effect | Cost |
| --- | --- | --- |
| Shield capacitor | Shield 100 to 130 | 6 Alloy, 2 Isotopes |
| Extended magazines | Magazine size +25% on all weapons | 4 Alloy, 4 Biomass |
| Field medic kit | Carry 3 medkits instead of 2 | 6 Biomass, 2 Isotopes |

Section 10 sets the resource totals so that either planet alone pays for at least one upgrade and both together pay for all three. Unit-test that.

## 9. The system map

The player pilots the Sojourner around a compressed 3D model of the Oriel system, viewed from above at a 55 degree tilt. Distances are for play, not realism.

**The ship.** An original wedge-shaped survey frigate with an engine trail.

- Cruise at 32 units per second and boost at 85. Reach full speed in 0.6 s. The ship turns to face its direction of travel.
- Any planet is reachable in under 12 s with boost.
- The ship starts between the orbits of Amara and Korr, so a first landing is under a minute away.
- The camera follows the ship and zooms from a close view of the ship out to the whole system.

**The system.**

- The sun, Oriel, sits at the origin with radius 14, emissive with a corona glow. It is a K-class orange star.
- Each orbit is drawn as a thin ring. Planets rotate and drift slowly along their orbits. A full orbit takes 6 to 40 minutes, inner planets fastest.
- **The Shoal** is an asteroid belt between orbit radii 170 and 185: about 600 instanced rocks, visual only, no collision.
- **Boundary.** At radius 440 the helm turns the ship back with a radio line.
- **Sun proximity.** Inside radius 30 a heat warning shows and the helm pushes the ship outward. Nothing in the system map can damage or kill the player.

**Finding things.**

- Planet name tags appear as HTML labels when the ship is within 60 units or the camera is zoomed out.
- The two habitable planets carry a green marker. Arrows at the screen edge point to them until both missions are complete.
- A counter shows "Surveyed n / 15".

**Approach.**

- Within (planet radius x 3) + 8 units, the ship slows by 40% and the survey panel slides in. Leaving that range closes it.
- The first approach marks the planet surveyed, with a scan sweep and a chime.
- The sun and the Shoal each have a short panel too.

**Survey panel contents.** Name, class, a rotating close-up of the planet, radius in km, gravity in g, day length, atmosphere, mean surface temperature, a survey note of 2 or 3 sentences and a landing line.

- Not habitable: "Landing: not viable" plus the specific reason.
- Habitable: "Landing: viable", the mission name and the "Land" prompt.
- Completed: "Mission complete".

**Controls.**

| Action | Keyboard and mouse | Gamepad |
| --- | --- | --- |
| Steer | W A S D | Left stick |
| Boost | Shift | RT |
| Zoom | Mouse wheel | Right stick up and down |
| Land, when offered | E | A |
| Return to bridge | Tab, hold 0.5 s | B, hold 0.5 s |

**The 15 planets.** The second table gives each planet's stat lines. Write the survey notes yourself in the voice of the examples below it.

| # | Name | Class | Orbit radius | Size | Look | Landing |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Cinder | Molten world | 34 | 1.6 | Black crust, glowing orange cracks | Not viable: molten surface |
| 2 | Anvil | Iron-rich barren | 52 | 2.0 | Gunmetal gray, cratered | Not viable: no atmosphere, extreme heat |
| 3 | Shroud | Toxic greenhouse | 72 | 2.8 | Pale yellow cloud deck | Not viable: crushing pressure, acid clouds |
| 4 | Amara | Temperate garden | 96 | 3.0 | Teal seas, green-gold land, white cloud | **Viable: mission "Landfall"** |
| 5 | Korr | Cold arid | 122 | 2.6 | Rust-red canyons, white polar frost | **Viable: mission "Cold Seam"** |
| 6 | Ochre | Frozen desert | 148 | 2.2 | Tan, with moving dust storms | Not viable: planet-wide storm season |
| 7 | Goliath | Ringed gas giant | 215 | 9.0 | Cream and amber bands, broad rings | Not viable: no surface |
| 8 | Pale | Ice-shell ocean world | 245 | 2.4 | Blue-white, cracked ice | Not viable: unstable ice crust |
| 9 | Tempest | Gas giant | 275 | 7.5 | Slate blue with one huge white storm | Not viable: no surface |
| 10 | Azure | Ice giant | 305 | 5.5 | Deep methane blue | Not viable: no surface |
| 11 | Vesper | Tilted ice giant | 332 | 5.0 | Pale teal, thin near-vertical rings | Not viable: no surface |
| 12 | Flint | Carbon dwarf | 356 | 1.4 | Near-black and glossy | Not viable: airless, far too cold |
| 13 | Hollow | Cratered ice dwarf | 376 | 1.3 | Gray-white with one giant impact basin | Not viable: airless, far too cold |
| 14 | Drift | Captured rogue dwarf | 394 | 1.2 | Dark red, on a visibly tilted orbit | Not viable: unstable orbit, no air |
| 15 | Terminus | Frozen dwarf | 410 | 1.1 | Dim blue-white nitrogen ice | Not viable: coldest body in the system |

**Stat lines for the survey panels.**

| Name | Radius | Gravity | Day length | Atmosphere | Mean temperature |
| --- | --- | --- | --- | --- | --- |
| Cinder | 3,100 km | 0.41 g | Tidally locked | Trace sodium vapor | 1,150 C on the day side |
| Anvil | 4,200 km | 0.78 g | 59 days | None | 430 C by day, -170 C by night |
| Shroud | 6,000 km | 0.93 g | 116 days, retrograde | Carbon dioxide and sulfur dioxide at 88 bar | 455 C |
| Amara | 6,500 km | 1.04 g | 26 hours | Nitrogen and oxygen, breathable | 17 C |
| Korr | 5,300 km | 0.82 g | 31 hours | Thin nitrogen and oxygen, breathable with a rebreather | -22 C |
| Ochre | 4,600 km | 0.62 g | 22 hours | Thin carbon dioxide at 0.04 bar | -68 C |
| Goliath | 71,000 km | 2.4 g at the cloud tops | 10 hours | Hydrogen and helium | -145 C at the cloud tops |
| Pale | 4,900 km | 0.55 g | 3.5 days | Trace oxygen | -160 C |
| Tempest | 58,000 km | 1.1 g at the cloud tops | 11 hours | Hydrogen and helium | -175 C |
| Azure | 25,500 km | 0.9 g | 17 hours | Hydrogen, helium and methane | -200 C |
| Vesper | 24,000 km | 1.1 g | 16 hours, tipped on its side | Hydrogen, helium and methane | -210 C |
| Flint | 1,400 km | 0.09 g | 6 days | None | -215 C |
| Hollow | 1,200 km | 0.06 g | 9 hours | None | -225 C |
| Drift | 1,100 km | 0.05 g | 40 hours | None | -232 C |
| Terminus | 1,000 km | 0.04 g | 6.4 days | Thin nitrogen haze | -238 C |

**The sun's panel.** Oriel. Class K1 orange dwarf. Surface 5,000 K. 0.8 solar masses. Age 6.1 billion years. Note: "Stable and long-lived. A good star to raise a colony under."

**Example survey notes.** Two or three short sentences, dry, written by someone who has filed a thousand of these.

- **Cinder:** "One face always to the star. The day side is a magma sea and the night side is glass. Nothing down there would survive being recovered."
- **Goliath:** "Banded giant with rings wider than the planet itself. Its pull keeps the Shoal thin. Helm requests we not fly through the rings."
- **Amara:** "Breathable air, liquid water, a biosphere that bites. Landfall Station was established here eleven months ago. Its beacon is dark."

## 10. The two planets

Each landable planet is one hand-authored 3D area of about 220 m by 220 m with a mission of 8 to 12 minutes that mixes talking, fighting and collecting.

**Rules for both.**

- Build the ground from seeded procedural terrain, then place props by hand. Use natural boundaries: cliffs, water, canyon walls. Where a gap is unavoidable, show "Return to the mission area" for 5 s and then move the player back.
- Show the current objective as one line of text, with a compass marker and distance.
- Save a checkpoint and unlock an ammo crate after every beat.
- Okonkwo comments by radio at each beat, as text in a comms box.
- Friendly characters cannot be damaged.

**Coordinates for both.**

- Each playable area runs from -110 to 110 on both axes, in meters, with the origin at the center. +x is east and -z is north. Height is ground level relative to 0.
- The layout tables below are authoritative. The sketches only show the flow. Build every named place within 5 m of its listed position.
- Put each arena's trigger at its entrance and its checkpoint and ammo crate at its exit.
- After building a planet, draw the top-down map from section 13 and compare it against the table.

**Resources.**

- Three types: **Alloy** (blue-gray ore veins), **Biomass** (green-gold plants) and **Isotopes** (violet crystals, rare).
- Nodes glow in their type's color and show on the compass within 25 m.
- Hold interact for 1.0 s to harvest with a scanner beam. Each node gives 1 unit and a toast such as "+1 Alloy".
- Place most nodes slightly off the main path to reward looking around.

| Planet | Alloy | Biomass | Isotopes |
| --- | --- | --- | --- |
| Amara | 3 nodes | 9 nodes | 2 nodes, plus 1 dropped by the Alpha |
| Korr | 9 nodes | 3 nodes (frost lichen) | 2 nodes, plus 2 from the sample vault |

### Amara: mission "Landfall"

**Look.** Late-afternoon gold light. Teal grass on rolling hills, tall fan-shaped coral-like trees, glowing plants in the shade, a river, the orange sun low and Goliath faint in the sky. Warm, inviting and slightly strange.

1. **Landing zone.** The shuttle sits on a flat rise. Okonkwo: the survey station's beacon has been dark for three weeks. Walk 70 m to Landfall Station.
2. **Landfall Station.** A safe area: three prefab habitat modules, a dead beacon tower, crates. Three characters:
   - **Chief Surveyor Nia Boateng** gives the mission. Stalkers dragged the beacon's three relay cores to their nests and the team has been pinned down since.
   - **Botanist Emil Varga**, optional. Explains the Spitter's weak sac. If asked, marks every Biomass node on the compass.
   - **Mechanic Jun Park**, optional. Asking about the old survey tunnel unlocks a gate into the Ravine, so the commander starts that fight on the high ledge above the spitters.
3. **The Grove.** Four stalkers, then three more. Relay core 1. Teaches packs and the dodge roll.
4. **The Ravine.** Two spitters on ledges and four stalkers. Relay core 2. Teaches cover against lobbed attacks and target priority.
5. **The Ridge.** Three spitters and six stalkers in two waves. The path beyond leads down into the Den.
6. **The Den.** A 40 m bowl with six rock pillars. The Alpha fight. Relay core 3 lies in the nest.
7. **Relight the beacon.** A short loop of about 80 m leads back to the station with no enemies. Install the cores, the beacon fires a beam into the sky, Boateng thanks the commander and mentions the tunnel if it was used. Extract at the shuttle.

**Amara layout.** The river closes the west edge, cliffs close the north and east, and thick coral forest closes the south.

```
                    NORTH
  +----------------------------------------------+
  |                                              |
  |          (DEN)<------- RIDGE --------+       |
  |            |           +14 m         |       |
  |            |                         |       |
  |            | return               RAVINE     |
  |            | path                 floor -6 m |
  |            |                         |       |
  |            |              tunnel ....+       |
  |            |              gate .     |       |
  |            v                  .      |       |
  |        [STATION]-----------(GROVE)---+       |
  |          /                                   |
  | river   /                                    |
  |        /                                     |
  |    [LZ]                                      |
  |                                              |
  +----------------------------------------------+
```

| Place | Center (x, z) | Size | Height | Cover and features |
| --- | --- | --- | --- | --- |
| Landing zone | (-80, 80) | 12 m pad | +6 m | Shuttle and first checkpoint, on a rise with a view of the station |
| Landfall Station | (-20, 45) | 18 m radius | +2 m | Three habitat modules around a beacon tower, crates. Boateng at the tower, Varga at a planter bed on the north side, Park at a workbench on the east side |
| The Grove | (35, 50) | 22 m radius | 0 m | Dense coral trees, 8 boulders 1.0 to 1.4 m tall, a nest mound at the center holding core 1 |
| Tunnel gate | (45, 28) | 3 m wide | 0 m | Locked unless Park's flag is set. The tunnel exits at (58, 5) on the Ravine's west ledge |
| The Ravine | (70, 0) | 60 m north to south, 14 m wide | Floor -6 m, ledges 0 m | Enter at the south end (70, 30). 6 boulders and 3 fallen trunks on the floor. Spitters on the east ledge. Core 2 at the north end |
| The Ridge | (40, -55) | 70 m east to west, 16 m wide | +14 m | A ramp climbs from the Ravine's north end. 10 rock outcrops for cover. Long sight lines |
| The Den | (-30, -60) | 20 m radius bowl | -4 m | Entrance ramp from the east at (-8, -58). Six pillars 2 m wide on a ring 11 m from the center. Nest with core 3 on the west side. The south exit opens after the fight |
| Return path | (-32, -40) to (-20, 27) | 4 m wide | Slopes down | No enemies. Checkpoint at the Den exit |

**Amara resource nodes.** Biomass: 3 along the path from the station to the Grove, 3 in the Grove, 2 on the Ravine floor, 1 on the return path. Alloy: 1 in the Ravine, 2 in Ridge outcrops. Isotopes: 1 at the far east end of the Ridge, 1 in a side nook at the Ravine's north end.

### Korr: mission "Cold Seam"

**Look.** Cold blue dusk. Rust-red canyon walls with frost on the ledges, light blowing snow, an abandoned strip mine with gantries, conveyor lines, cargo containers and flickering floodlights.

1. **Landing zone.** A mesa above the canyon. Okonkwo: a Corps survey team, Team Cobalt, stopped reporting from the old mine and unknown ships were seen leaving.
2. **Canyon approach.** Three riflemen patrol among boulders and wrecked rovers. The first cover fight.
3. **Lookout post.** A wounded raider lookout surrenders. The conversation has a real choice:
   - **Reassure him** with a promise of medical evacuation. He gives the gate code. The Mining Yard starts unaware, with enemies on idle patrols and a side door open for a flank.
   - **Threaten him.** He panics and trips the alarm. The yard starts alerted and in cover, and one extra wave of three arrives.
   - Record the choice. Okonkwo and Brandt refer to it later and the end screen lists it.
4. **The Mining Yard.** A large arena dense with cover: containers, low walls, a central conveyor. Four riflemen, two rushers and a marksman on a gantry, then reinforcements of two rushers and a rifleman. Alloy veins line the edges.
5. **Processing Hall.** A tight interior with two rushers and two riflemen. Free **Surveyor Idris Kwan** from a locked office. He explains what happened to Team Cobalt, opens the sample vault for 2 Isotopes and warns that the Foreman's rig overheats.
6. **Loading Dock.** The Foreman fight, in a 35 m by 45 m arena with staggered concrete barriers and two container stacks.
7. **Extraction.** Kwan calls the shuttle down to the dock. Extract.

**Korr layout.** Canyon walls close every side. The route runs from the south-west corner to the north-east.

```
                    NORTH
  +----------------------------------------------+
  |                              [EXTRACTION]    |
  |                              +----------+    |
  |                              |   DOCK   |    |
  |                              | Foreman  |    |
  |                              +----+-----+    |
  |                                   | corridor |
  |          side door     gantry +---+------+   |
  |               +--o----========|   HALL   |   |
  |               |               o   Kwan   |   |
  |               |  MINING YARD  +----------+   |
  |               |               |              |
  |        gate ->o---------------+              |
  |      [LOOKOUT]                               |
  |         /                                    |
  |     canyon                                   |
  |       /                                      |
  |   [LZ mesa]                                  |
  |                                              |
  +----------------------------------------------+
```

| Place | Center (x, z) | Size | Height | Cover and features |
| --- | --- | --- | --- | --- |
| Landing zone | (-85, 85) | 14 m mesa top | +18 m | Shuttle and first checkpoint. A ramp leads down to the north-east |
| Canyon approach | (-70, 65) to (-35, 20) | 75 m long, 12 to 16 m wide | 0 m | Two bends. 9 boulders and 2 wrecked rovers. The patrol starts at (-55, 45) |
| Lookout post | (-30, 10) | 8 m platform | +1 m | Sandbags, a tarp, a radio mast. The lookout sits against the mast. The main gate is at (-22, 2) |
| Mining Yard | (20, -15) | 70 m east to west, 55 m north to south | 0 m | 12 containers 2.6 m tall, 10 low walls 1.2 m tall, a conveyor 1.1 m tall running east to west through the center. A gantry along the north side at +8 m with stairs at its west end. Marksman at (40, -38). Side door at (-12, -35) |
| Processing Hall | (75, -30) | 30 m by 22 m interior | 0 m | Enter from the yard at (57, -25). Machinery blocks and 6 low barriers. Kwan's office in the north-east corner at (86, -38), with the vault door beside it |
| Loading Dock | (75, -80) | 35 m east to west, 45 m north to south | 0 m | Reached by a 15 m corridor from the hall's north door. 8 staggered concrete barriers 1.2 m tall. Container stacks at (63, -72) and (87, -88). The Foreman starts at the north end |
| Extraction | (75, -98) | 12 m pad | 0 m | The shuttle lands here after the fight |

**Korr resource nodes.** Alloy: 2 in the canyon, 5 around the edges of the yard, 2 in the hall. Biomass: 2 on canyon ledges reachable by ramps, 1 on the gantry. Isotopes: 1 behind the lookout post, 1 at the east end of the gantry, plus 2 from the vault.

## 11. Presentation

Everything the player sees and hears is generated in code. Aim for a look that is deliberately stylized, never an attempt at realism that falls short.

**Art direction.**

- Stylized low-poly with clean silhouettes, flat or lightly smoothed shading, vertex colors and simple procedural materials. No image files. Small canvas-generated textures are fine for noise and decals.
- One strict palette per scene:

| Scene | Palette |
| --- | --- |
| Bridge | Cool blue-gray with amber accents |
| System map | Deep navy, warm star glow, each planet its own color |
| Amara | Teal, gold and coral |
| Korr | Rust, ice blue and black |

- **Characters.** Jointed rigs of at least 15 parts: head, torso, pelvis, upper and lower arms, hands, upper and lower legs, feet. Slightly heroic proportions, armor plates as separate shapes. Heads are simple and stylized: hair and brow shapes, small dark eyes, no mouth animation. Crew differ by build, skin tone, hair shape and uniform trim.
- **Weapons.** Three distinct, readable models: a compact pistol, a stubby SMG with a side magazine, a long battle rifle with a scope rail.
- **Lighting.** One directional light with shadows, a hemisphere fill, distance fog matched to the sky, ACES tone mapping. Skies are a gradient dome with a sun disc and any planets named in section 10. Bloom is optional.

* **Ship and shuttle.** The Sojourner is a wedge-shaped frigate about 120 m long: a gray-white hull, amber running lights, twin engine nacelles and a dorsal sensor mast. The shuttle is a boxy 9 m dropship with tilting thrusters and a rear ramp. Both appear in the system map, in the transitions and on the planets.

**Animation.** A procedural keyed-pose system with blending.

- **Commander:** idle, walk, jog, roadie run (hunched), crouch idle and walk, roll, aim, fire recoil, reload timed per weapon, weapon swap, melee, hit reaction, knockdown, death, harvest, talk idle.
- **Enemies:** idle, move, attack telegraph, attack, flinch, stagger, death.

**Effects.** Muzzle flash, tracers, impact sparks and dust, a blue flare on shield hits and red on health hits, acid pools, the scan beam, the beacon beam, heat-sink glow, shuttle thrusters, dust on a roll.

**HUD on planets.**

- **Bottom left:** shield bar above health bar, medkit count.
- **Bottom right:** weapon name, magazine and reserve count, three weapon slots with the current one highlighted.
- **Top center:** compass strip with the objective marker, its distance and resource pips. The boss bar sits below it when needed.
- **Top left:** current objective in one line.
- **Top right:** comms box for radio lines.
- **Center:** dynamic crosshair, hit markers, interact prompt with the right device glyph, reload and low-ammo hints.
- On the bridge, show only interact prompts and the objective line.
- The UI scales with viewport height and stays readable from 1280x720 to 2560x1440.

**Audio.** Synthesized with the Web Audio API. No audio files.

- **Combat:** fire, reload and dry-fire sounds per weapon, impacts, melee, roll, shield break and recharge, medkit.
- **Enemies:** a distinct cue for every telegraph, such as a stalker screech, a spitter gurgle and short synthesized raider barks.
- **World:** footsteps by surface, UI ticks, the scan chime, and an ambient bed per scene (bridge hum, a space drone, wind and creature chirps on Amara, wind and creaking metal on Korr).
- **Tension:** a simple generative layer that rises in combat and drops when an encounter ends.
- Audio starts on the first user gesture. Settings have master, effects, ambient and music sliders.
- Put all playback behind one small interface with sound ids in a table, so recorded audio can replace the synthesized sounds later without touching game code.

**Menus.** Title, pause, controls (both layouts side by side), settings (mouse sensitivity, gamepad sensitivity, invert Y, volumes, screen shake on or off) and the end screen.

## 12. Milestones and gates

Work through these twelve milestones in order, without pausing between them. The percentage after each name is its share of your total effort.

Every gate also requires that the build, typecheck, lint, unit tests and end-to-end tests pass, and that the milestone's screenshots have been captured and reviewed. From M1 on, the full-loop test must pass at every commit.

**M0. Foundation (4%)**

- **Build:** the docs files from section 2. Vite with strict TypeScript, lint, Vitest, and Playwright running with software WebGL. The fixed-step loop, scene manager, input layer with an action map for keyboard, mouse and gamepad, the game state object, the `window.__game` debug API, the debug panel shell and the title screen.
- **Gate:** an end-to-end test loads the title screen and its screenshot is not blank. Unit tests cover the loop and the input mapping.

**M1. Walking skeleton (6%)**

- **Build:** a thin but real version of the whole loop. A plain bridge room with a walking capsule and a working star map console. A system map with the sun, 15 plain spheres read from `planets.ts`, a steerable ship marker and a working "Land" prompt at Amara and Korr. A flat field for each planet with a shuttle marker, one objective completed by walking to a marker, then extract. Mission flags, a one-line debrief on the bridge after both missions and a plain end screen.
- **Gate:** the full-loop test passes in both planet orders, driven through the input layer and the debug API. The planet data test passes: 15 entries, exactly 2 landable. One screenshot per scene is reviewed.

**M2. Commander and camera (10%)**

- **Build:** the character rig and animation system, the third-person controller on Rapier, the over-the-shoulder camera with collision and all movement from section 5. Add a test gym with slopes, steps, low cover and tall cover, reachable only from the debug panel.
- **Gate:** unit tests confirm each move speed, the roll distance and the invulnerability window. A scripted test backs the camera into walls and it never passes through. Screenshots of the default, aiming, roadie run and crouch framing look right.

**M3. Weapons (8%)**

- **Build:** three weapons with every stat from section 6, aim-through-crosshair firing, spread, kick, reload, swap, ammo and melee. Target dummies with health, shield and armor. The first HUD and hit feedback.
- **Gate:** unit tests reproduce the shots-to-kill figures and damage falloff. A scripted test kills a dummy with each weapon. The HUD screenshot is reviewed.

**M4. Enemies (12%)**

- **Build:** the nav grid, cover points, perception, attack tokens, the five standard enemies, the encounter director, and player damage, shield, medkits, death and checkpoints, all in the gym.
- **Gate:** in headless simulation, each enemy type paths to the player or to cover, and riflemen end up at cover points. A player standing still in the open against five riflemen dies in 5 to 15 s. A scripted player that only holds fire on the nearest enemy kills one of each type in the expected number of shots. A 5-minute simulation produces no NaN positions and no entities outside the level.

**M5. Bridge and crew (8%)**

- **Build:** the full bridge at section 8's coordinates, four crew with idle animation, the dialogue system, the briefing and all pre-mission lines from section 14, the star map console and the upgrade terminal.
- **Gate:** the dialogue graph test passes. An end-to-end test walks to each crew member, completes a conversation and buys an upgrade with debug-granted resources. Screenshots of the bridge and the dialogue camera are reviewed.

**M6. System map (8%)**

- **Build:** everything in section 9: planet looks, the Shoal, orbits, ship model and flight feel, survey panels with stat lines and notes, the survey counter, habitable-planet markers and the landing and takeoff transitions.
- **Gate:** a test moves the ship beside the sun and each of the 15 planets, checks each panel's name and class, and checks that only Amara and Korr offer "Land". A test flies to a planet using inputs only. Abort works: bridge, map, land, abort, map, bridge. Screenshots of the map zoomed in, zoomed out and three panels are reviewed.

**M7. Amara (13%)**

- **Build:** the full "Landfall" mission at section 10's coordinates: terrain, station characters and dialogue, encounters, resource nodes, the Alpha, the beacon and extraction.
- **Gate:** the top-down map matches the layout table: every place within 5 m and node counts correct. The loop bot completes the mission from landing to extraction, with and without the tunnel shortcut. In simulation the Alpha's charge hits a stationary player, a pillar stuns it, and sustained scripted fire kills it in 15 to 120 s. A screenshot of every beat is reviewed.

**M8. Korr (13%)**

- **Build:** the full "Cold Seam" mission at section 10's coordinates: the lookout choice, encounters, Kwan, the vault, resource nodes, the Foreman and extraction.
- **Gate:** the top-down map matches the layout table. The loop bot completes the mission through both dialogue branches. Threatening spawns the extra wave and reassuring leaves the yard unaware. In simulation the Foreman's cannon kills a stationary player in the open, cover blocks it, and sustained scripted fire on the heat sinks kills it in 15 to 120 s. A screenshot of every beat is reviewed.

**M9. Closing the loop (6%)**

- **Build:** post-mission crew dialogue for both planet orders, upgrades applied to the commander, the full debrief from section 14, the end screen with stats, the intro card, save and continue, and the pause, settings and controls menus.
- **Gate:** the full-loop test still passes in both orders and now checks the debrief variant for each lookout choice. Save and continue restores a mid-game state. Five scene round trips grow the renderer's geometry and texture counts by no more than 5%.

**M10. Feel and polish (8%)**

- **Build:** all audio and effects, animation polish, the final HUD with device glyphs, a gamepad pass (dead zones, aim slowdown, rumble where supported), bloom, the tuning panel from section 13, a performance pass against the budget and a tuning pass using simulation results.
- **Gate:** draw calls logged at a busy moment in each scene are within budget. Every UI screen is screenshotted at 1280x720 and 1920x1080 with no overflow or overlap. A test using injected gamepad state completes a bridge conversation and a kill. Changing a value in the tuning panel changes the game live.

**M11. Final verification and handoff (4%)**

- **Build:** run the full playthrough tests in both orders. Review fresh screenshots of every scene and beat and fix the worst problems found. Write the README: how to run, both control layouts, the debug and tuning panels, how to rename things in `names.ts`, how to deploy, and the playtest checklist from section 13. Add a GitHub Pages workflow that builds and publishes `dist/`. Bring `KNOWN_ISSUES.md` up to date. Write the final report.
- **Gate:** the definition of done in section 13.

## 13. Verification, scope and done

You cannot play the game, so prove it works four ways: tests on the logic, headless simulation of combat, a simple bot that walks the whole loop, and pictures you open and judge.

**Effort cap.** All verification together gets about a fifth of your total effort. Prefer ten cheap checks to one clever one.

**Test harness.**

- Run Playwright with headless Chromium and software WebGL. Launch with `--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader`. Current Chromium does not fall back to software WebGL without the last flag ([Chromium SwiftShader notes](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)).
- If a WebGL context still cannot be created, try `--enable-gpu`, then the full browser in headless mode. Record what worked in `DECISIONS.md`.
- If WebGL cannot run in this environment at all, keep every logic and simulation test, rely on the top-down map below for layout checks, log the gap in `KNOWN_ISSUES.md` and continue.
- Never use frame rate measured in a headless browser as a gate. It says nothing about real hardware. Use the draw-call and enemy budgets from section 3.

**Debug API.** `window.__game`, available in dev and test builds and in production behind `?debug=1`:

- `state()` returns a serializable snapshot.
- `goto(scene, options)`, `teleport(x, y, z)` and `teleportShipTo(planetId)`.
- `give(resource, n)`, `setFlag(name, value)`, `completeObjective()`.
- `god(on)`, `killAll()`, `spawn(enemyType, n)`.
- `step(seconds)` advances the fixed-step simulation without rendering. `seed(n)` sets the random seed.

* `layoutMap()` draws the top-down map described below and returns it as an image.

**Simulation tests.** Check combat without rendering by stepping the fixed-step simulation. Use two scripted stand-ins for the player: one that stands still, and one that holds fire on the nearest enemy. Together they prove that enemies are a threat and that they can be killed. Do not build a bot that has to win fights on skill.

**Loop bot.** `src/debug/bot.ts` drives the real action layer through the whole game with god mode on. It walks to the objective marker, interacts when prompted, fires at whatever is nearest and picks dialogue choices from a script. Its only job is to prove that every beat, trigger, door and transition works in order. Keep it under 300 lines.

**Top-down map.** A 2D canvas drawing that needs no WebGL, built from `layouts.ts` and the live scene: walkable cells, cover, named places, enemy spawns, resource nodes, triggers and checkpoints. Save one per planet to `tests/screenshots/` and compare it against section 10's tables.

**Unit tests.** Cover weapon damage, falloff and spread. Shield, health and medkit rules. Upgrade costs and effects. Resource totals against upgrade costs. Dialogue graph integrity. Nav grid pathing. Planet data: 15 entries, exactly 2 landable, unique names, ascending orbits. Save and load round trip.

**Screenshot review.** After each milestone, save the listed shots to `tests/screenshots/M<n>/`, open each one and check:

- The scene is lit, not black, with no missing geometry or flickering surfaces.
- The commander is in frame left of center, back to the camera, feet on the ground.
- The crosshair is centered.
- No UI overlaps or is cut off, and all text is readable.

Fix what fails before committing.

**Debug panel.** Opened with the backquote key or `?debug=1`: god mode, infinite ammo, give resources, jump to any scene, beat or checkpoint, kill all, show colliders, show the nav grid and cover points, AI state labels, frame rate and draw calls, time scale.

**Tuning panel.** A tab in the debug panel with a live slider for every feel value at the top of `tuning.ts`: camera offsets and field of view, look sensitivity, recoil and spread, move speeds, roll distance and timing. Changes apply immediately. A "Copy as JSON" button exports the current values so the owner can paste them back into `tuning.ts`. This is how the owner fixes feel, so it must work.

**Out of scope. Do not build any of these.**

- Multiplayer, or squadmates on planets.
- Grenades, powers or abilities. Skill trees, loot or inventory beyond three resources and three upgrades.
- Snap-to-cover, blind fire, vaulting or jumping.
- Vehicles, space combat, more than two landable planets, procedural planets.
- Voice acting, lip sync, a character creator, difficulty levels.
- Touch controls, cutscenes beyond the short transitions, external asset files, any backend.

**Definition of done.**

1. Every milestone from M0 to M11 is ticked in `PLAN.md`, or a specific cut is recorded in `DECISIONS.md` following the cut order.
2. From a clean clone, `npm install` and `npm run build` succeed, and `npm run dev` and `npm run preview` both serve a working game.
3. Typecheck, lint, unit tests and end-to-end tests all pass.
4. The full-loop test passes in both planet orders.
5. All seven pillars from section 1 are present and shown by a test or a reviewed screenshot.
6. A full playthrough produces no console errors.
7. `README.md`, `DECISIONS.md` and `KNOWN_ISSUES.md` are current.
8. The README ends with a 10-minute playtest checklist for the owner: what to try, in order, and what good looks like for each step.

**Playtest checklist, minimum contents.** Walk the bridge and talk to all four crew. Fly to three planets and read their panels. Land on Amara and finish it, paying attention to cover, the roll and the camera. Buy an upgrade. Land on Korr, make the lookout choice and fight the Foreman. Sit through the debrief and the end screen.

**Final report.** This is the one message the owner will read, so make it complete and plain:

- What was built, one line per milestone.
- Anything cut or changed from this spec, and why.
- Known issues, ranked by how much they would bother a player.
- How to run the game and open the debug panel.
- The three values most worth tuning by hand first.

Do not claim anything works unless a test or a reviewed screenshot shows it.

## 14. Script

Use these lines as written. They fix the story and the voice. Write every other line to match: short, dry and specific. Take all names from `names.ts`.

**Intro card.**

- "The Armed Survey Corps charts worlds nobody has claimed, and holds them until somebody can."
- "Two Corps teams in the Oriel system have stopped answering."
- "The ASV Sojourner has orders to find them and finish the survey."

**Briefing, at the map table.**

- **Okonkwo:** "Commander. Fifteen planets, two worth a landing. Both had our people on them."
- **Okonkwo:** "Amara, fourth orbit. Landfall Station went dark three weeks ago. No distress call. The beacon just stopped."
- **Okonkwo:** "Korr, fifth orbit. Team Cobalt was surveying an old mine. Their last transmission was half a sentence."
- **Choice, "Which first?"** Okonkwo: "Amara. A dead beacon is usually weather or wildlife. Korr worries me more, so I'd like you warmed up."
- **Choice, "What are we walking into?"** Okonkwo: "Unknown. Which is why you take all three weapons. Nobody in the Corps lands light."
- **Choice, "I'll take the helm."** Okonkwo: "Star map is yours. Fly close to anything and the scanners log it. Command likes a complete survey."

**Crew, before any mission.**

- **Reyes, greeting:** "Commander. She's holding orbit like she means it."
- **Reyes, on himself:** "Six years flying survey and never scratched a hull. I don't say that near the ship, so forget you heard it."
- **Reyes, on the system:** "Goliath's rings are the prettiest thing out here. Also the fastest way to lose a paint job."
- **Zhao, greeting:** "Commander. Bring me something I haven't seen."
- **Zhao, on the system:** "Two living worlds around one star. That isn't luck. That's a system worth fighting over, and somebody will."
- **Zhao, on resources:** "Alloy, biomass, isotopes. Bring samples and Brandt and I can make your kit slightly less likely to fail."
- **Brandt, greeting:** "Commander. Rack's loaded."
- **Brandt, on the weapons:** "Keeper never runs dry. Wasp is for anything close and fast. Longwatch is for anything far away or wearing plate."
- **Brandt, on the Corps:** "The first survey team we ever lost went down holding clipboards. Since then everybody lands armed. Cooks included."
- **Brandt, at the terminal:** "Bring me materials and I'll bolt on improvements. No materials, no miracles."
- **Okonkwo, on the Corps:** "We're not soldiers and we're not scientists. We're what you send before you know which one you need."
- **Okonkwo, on herself:** "I keep the list of what can go wrong. It's a long list. You're usually near the top."

**Crew, after a mission.**

- **Reyes, after Amara:** "I heard it was the size of a truck. I'll stay up here with the vacuum, thanks."
- **Zhao, after Amara:** "They stole the cores for the hum. An animal that collects machines. I want a year down there."
- **Zhao, after Korr:** "Those isotopes were already refined. The claim jumpers weren't prospecting. They were shipping."
- **Brandt, after Korr:** "A loader rig with a rotary cannon. Somebody down there had imagination. Glad it's scrap."

**Amara.**

- **Okonkwo, on landing:** "Station is seventy meters north-east. The beacon tower should be lit. It isn't."
- **Boateng:** "Corps? About time. I'd salute, but I've been holding this door shut for three weeks."
- **Boateng:** "The stalkers took our relay cores. They like the hum. Three cores, three nests, and the big one sleeps on the last."
- **Varga:** "The spitters aim with that throat sac. Pop it and they lose interest in everything."
- **Park:** "There's an old survey tunnel into the ravine. It comes out on the high ledge. I never said it was safe. I said it was high."
- **Okonkwo, at the Den:** "That is not on the species list. Use the pillars."
- **Boateng, at the end:** "Beacon's up. First clean signal in three weeks. Tell the Corps we're still here, and tell them to send coffee."

**Korr.**

- **Okonkwo, on landing:** "Team Cobalt's transponder is inside the old mine. So are a lot of heat signatures that aren't ours."
- **Lookout:** "Don't. Please. I just watch the road. I'm not paid enough to get shot twice."
- **Choice, reassure:** "Nobody shoots you again. Give me the gate code and my ship takes you out of here."
- **Lookout, reassured:** "Four, four, one, nine. Side door's unlocked too. They never fixed it."
- **Choice, threaten:** "The code. Now. Or I leave you out here for the cold."
- **Lookout, threatened:** "Fine. Fine!" He slaps the alarm. "They'd have killed me anyway."
- **Kwan:** "Commander. They made us show them the seams. When we ran out of seams, they ran out of patience."
- **Kwan:** "The Foreman's rig runs hot. Wait for the shoulders to open, then give it everything."
- **Okonkwo, after the Foreman:** "Dock is clear. Shuttle inbound. Bring Kwan home."

**Final debrief.** Okonkwo, at the map table, in this order.

1. "Landfall Station is transmitting. Team Cobalt has one survivor and a full report."
2. If all 15 planets are surveyed: "Fifteen planets logged. Command won't know what to complain about." Otherwise: "Not every planet got logged. Command will ask about the rest."
3. If the lookout was reassured: "The lookout is in our medbay asking for a lawyer. You kept your word. That gets around."
4. If the lookout was threatened: "The lookout didn't make it out of the yard. The alarm was his choice. The fear was ours."
5. "One world tried to eat our people. The other tried to sell them. I know which one I'd rather survey."
6. "Good work, Commander. The next system is a long burn. Get some sleep."
