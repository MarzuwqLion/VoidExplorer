# Sojourner

A third-person sci-fi exploration shooter that runs in a desktop browser. You are Commander Kade of the ASV Sojourner, sent to the Oriel system to find two Armed Survey Corps teams that went silent. Walk the bridge and talk to the crew, fly the ship around a sun and 15 planets, land on Amara and Korr, and fight, talk and gather resources on each before the final debrief.

Built with TypeScript, Vite, Three.js and Rapier. Every model, texture and sound is generated in code. There are no asset files.

## Run it

```bash
npm install
npm run dev       # http://localhost:5199
npm run build     # static site in dist/ (relative paths, works from any folder)
npm run preview   # serves dist/ on http://localhost:5198
```

Checks:

```bash
npm run typecheck
npm run lint
npm test          # Vitest: logic and headless combat simulation
npm run e2e       # Playwright with headless Chromium and software WebGL
```

The end-to-end suite includes full playthroughs by the loop bot and takes about half an hour. To run part of it, use `npx playwright test title bridge systemmap`.

## Controls

Click the game to capture the mouse. If the pointer lock is lost, the game pauses and shows "Click to resume".

| Action | Keyboard and mouse | Gamepad (Xbox layout) |
| --- | --- | --- |
| Move | W A S D | Left stick |
| Look | Mouse | Right stick |
| Aim | Right mouse, hold | LT |
| Fire | Left mouse | RT |
| Reload | R | X |
| Interact, talk, harvest (hold) | E | X when a prompt shows |
| Sprint (roadie run) | Shift, hold | Click left stick (ends on stop or aim) |
| Dodge roll | Space | A |
| Crouch toggle | C | B |
| Melee | F | RB |
| Medkit | Q | LB |
| Keeper pistol, Wasp SMG, Longwatch rifle | 1, 2, 3 | D-pad left, up, right |
| Next weapon | Mouse wheel | Y |
| Shoulder swap | X | Click right stick |
| Objectives log | Tab | View |
| Pause | Esc | Menu |
| Menus and dialogue | W/S or arrows, E or Enter, click | Left stick or D-pad, A to confirm, B to go back |
| Debug panel | Backquote | none |

On the system map:

| Action | Keyboard and mouse | Gamepad |
| --- | --- | --- |
| Steer | W A S D | Left stick |
| Boost | Shift | RT |
| Zoom | Mouse wheel | Right stick up and down |
| Land (when offered) | E | A |
| Return to bridge | Hold Tab for 0.5 s | Hold B for 0.5 s |

Nothing is bound to Ctrl, so Ctrl+W can never close the tab by accident.

## Debug and tuning panels

Press Backquote, or add `?debug=1` to the URL (needed for a production build). The panel has two tabs.

- **Debug:** god mode, infinite ammo, collider wireframes, nav grid and cover points, AI state labels, give resources, kill all, jump to any scene (including the test gym, which is only reachable from here), jump to any mission beat or checkpoint, time scale, frame rate and draw calls.
- **Tuning:** a live slider for every feel value at the top of `src/data/tuning.ts`: camera offsets and fields of view, mouse and gamepad sensitivity, recoil and spread scale, move speeds, roll distance and timing. Changes apply at once. **Copy as JSON** copies the current values. Paste them back over the `FEEL` object in `tuning.ts` to keep them.

Tests and the console can also drive the game through `window.__game`: `state()`, `goto(scene, opts)`, `teleport(x, y, z)`, `teleportShipTo(id)`, `give(resource, n)`, `setFlag(name, value)`, `completeObjective()`, `god(on)`, `killAll()`, `spawn(type, n)`, `step(seconds)`, `seed(n)`, `layoutMap()`, plus `bot.start({ order: ['amara','korr'], lookout: 'reassure', tunnel: true })` to watch the loop bot play.

## Renaming things

Every proper name is defined once in `src/data/names.ts`: the game title, the ship, the Corps, the commander, crew and planet characters, planets, places, missions, weapons, enemies, resources and upgrades. Edit a value there and it changes everywhere in the game. Dialogue lines in `src/data/dialogue/` are written text, so a renamed character mentioned inside a line needs that line edited too. Search for the old name.

Other data lives next to it. `tuning.ts` holds feel values and rules, `weapons.ts` and `enemies.ts` hold combat numbers, `planets.ts` holds the 15 planets and their survey notes, `layouts.ts` holds every coordinate from the spec, and `dialogue/` holds every line.

## Deploying

`npm run build` writes a static site to `dist/` with relative paths, so any static host works. A GitHub Pages workflow is included in `.github/workflows/pages.yml`. Push to `main` and enable Pages with the source set to "GitHub Actions" in the repository settings.

## Project layout

```
src/core/     loop, input, state, save, audio engine and synth, dialogue runner
src/scenes/   title, bridge, system map, planet, end, test gym
src/player/   controller, camera, weapons, animation
src/ai/       nav grid, cover, enemy, brains, bosses, director, projectiles
src/world/    physics, level builder, terrain, sky, models, planets, effects
src/missions/ beat runner and the Landfall and Cold Seam missions
src/ui/       HUD, dialogue, menus, survey panel, upgrade terminal
src/data/     names, tuning, weapons, enemies, planets, layouts, dialogue
src/debug/    debug API, panel, loop bot, top-down layout map
tests/        unit, e2e, screenshots (one folder per milestone)
```

## 10-minute playtest checklist

Play in order with the tuning panel within reach (Backquote). Each step says what good looks like.

1. **Title and intro.** Choose New game and read or skip the three-line intro card. *Good:* the ship drifts toward the orange star and the bridge loads without a hitch.
2. **Walk the bridge and talk to all four crew.** Okonkwo at the map table gives the briefing. Then talk to Reyes at the helm, Zhao at the science station and Brandt in the armory. *Good:* the camera blends to a shot past your shoulder, text types out, each character turns toward you, and every conversation ends cleanly with Goodbye or B/Esc.
3. **Tune the feel.** Open the Tuning tab and adjust camera distance, field of view and mouse sensitivity until the shoulder camera feels right. *Good:* changes apply as you drag, and Copy as JSON gives values you can paste into `tuning.ts`.
4. **Fly to three planets and read their panels.** Use the star map. Visit Goliath, Cinder and one ice giant, then Amara or Korr. *Good:* steering is responsive, boost is clearly faster, panels slide in with stats and a short note, the surveyed counter goes up with a chime, and only Amara and Korr offer Land.
5. **Land on Amara and finish Landfall.** Talk to Boateng. Ask Park about the tunnel if you want the high-ledge route. Fight the stalkers in the Grove, the spitters in the Ravine and the Ridge, then the Alpha in the Den. *Good:* crouching behind 1.0-1.4 m cover keeps you safe and aiming pops you up over it. The roll gets you out of a stalker lunge. The camera never clips through walls. The Alpha's charge is readable, and steering it into a pillar stuns it and lights up its flank. The beacon fires a beam when you install the cores.
6. **Gather resources.** Hold E on glowing nodes. *Good:* a scanner beam, a "+1" toast and a chime. Varga can mark every Biomass bed on your compass.
7. **Extract and buy an upgrade.** Take the shuttle back, return to the bridge (hold Tab on the map) and use the armory terminal. *Good:* the crew have new topics about Amara, Okonkwo gives an after-action talk, and the upgrade applies on your next landing.
8. **Land on Korr, make the lookout choice and fight the Foreman.** Clear the canyon patrol, then question the wounded lookout. Reassure him for a quiet yard and an open side door, or threaten him for an alarm and an extra wave. Clear the Mining Yard and the Processing Hall, free Kwan, then fight the Foreman on the dock. *Good:* riflemen take cover and peek, rushers shout before they charge, the marksman's red laser warns before the shot, and the Foreman's yellow armor bar goes first. Hitting the glowing shoulder heat sinks after each cannon sweep does big damage. Cover stops the cannon.
9. **Sit through the debrief and the end screen.** Talk to Okonkwo on the bridge. *Good:* the debrief mentions the survey count and your lookout choice, and the end screen lists play time, kills, accuracy, resources, planets surveyed, upgrades and your choice.
10. **Gamepad pass (optional).** Repeat a conversation and a fight on a controller. *Good:* prompts show Xbox glyphs, aiming slows slightly over enemies, and the rumble fires on shots and hits.
