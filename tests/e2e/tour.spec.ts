import { test, expect, type Page } from '@playwright/test';
import { boot, gotoScene, step, shot, litFraction, errorsOf } from './helpers';

test.setTimeout(600000);
const run = (page: Page, js: string) => page.evaluate(js);

/** Start a conversation from a given spot and report the dialogue camera's framing. */
async function talkFrom(page: Page, id: string, x: number, z: number) {
  return page.evaluate(([id, x, z]) => {
    const g = (window as any).__game;
    const sc = g.game.scene;
    if (sc.dialogue) sc.endDialogue();
    g.teleport(x, sc.world.ground(x, z) + 0.1, z);
    sc.world.interactables.find((i: any) => i.id === id).onUse();
    const cam = sc.world.cam.dialogue;
    const me = sc.world.head();
    const npc = sc.npcs.find((n: any) => 'talk-' + n.id === id);
    const them = npc.head();
    return { back: cam.pos.distanceTo(me), sees: sc.world.physics.clear(cam.pos, them) };
  }, [id, x, z] as const);
}

test('M12 polish: framing, snow, map scale and screens', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await gotoScene(page, 'title');
  await page.waitForTimeout(300);
  expect(await litFraction(page)).toBeGreaterThan(0.02);
  await shot(page, 'M12/title.png');

  // Bridge: the shoulder camera starts clear of the aft wall.
  await gotoScene(page, 'bridge', { fresh: true });
  await step(page, 0.5);
  expect(await run(page, '__game.game.scene.world.cam.headDist')).toBeGreaterThan(1.8);
  await shot(page, 'M12/bridge-spawn.png');

  // Dialogue camera: over the shoulder, never inside a wall, with a clear view of the speaker.
  const spots: [string, number, number][] = [['talk-xo', 1.8, 0.2], ['talk-helm', 0, -4.7], ['talk-science', -2.6, -2], ['talk-quartermaster', 4.0, 7.2]];
  for (const [id, x, z] of spots) {
    const f = await talkFrom(page, id, x, z);
    expect(f.back, id).toBeGreaterThan(0.6);
    expect(f.sees, id).toBe(true);
    await step(page, 1.2);
    await shot(page, 'M12/dialogue-' + id.slice(5) + '.png');
  }

  // System map: closer start, distant planets drawn at a readable size, particle trail.
  await gotoScene(page, 'systemMap', { fromBridge: true });
  await run(page, '__game.input.move(0.2, 1)');
  await step(page, 2);
  await shot(page, 'M12/map-flying.png');
  await run(page, '__game.input.clear()');
  for (let i = 0; i < 25; i++) {
    await run(page, "__game.input.tap('zoomOut')");
    await step(page, 1 / 30);
  }
  const inflated = await page.evaluate(() => {
    const sc = (window as any).__game.game.scene;
    return [...sc.planets.values()].filter((m: any) => m.scale.x > 1.01).length;
  });
  expect(inflated).toBeGreaterThan(5);
  await shot(page, 'M12/map-system.png');

  // Korr: no snowflake drawn under a roof inside the Processing Hall; work lights on.
  await gotoScene(page, 'planet', { planet: 'korr' });
  await run(page, '__game.god(true)');
  await run(page, "__game.jumpTo('hall')");
  await run(page, '__game.teleport(63, 0.2, -30)');
  await run(page, '__game.game.scene.world.cam.yaw = -90');
  await run(page, '__game.game.scene.world.cam.pitch = 2');
  await step(page, 4);
  const snow = await page.evaluate(() => {
    const s = (window as any).__game.game.scene.snow;
    const a = s.points.geometry.attributes.position;
    let under = 0, shown = 0;
    for (let i = 0; i < a.count; i++) {
      const y = a.getY(i);
      if (y < -1000) continue;
      shown++;
      if (y < s.roofAt(a.getX(i), a.getZ(i))) under++;
    }
    return { under, shown, roof: s.roofAt(75, -27) };
  });
  expect(snow.roof).toBeGreaterThan(2);
  expect(snow.under).toBe(0);
  await shot(page, 'M12/korr-hall.png');

  // Combat HUD: labelled vitals and medkit pips under fire, raiders in rust-orange.
  await run(page, "__game.jumpTo('yard')");
  await run(page, "__game.spawn('rifleman', 3)");
  await step(page, 2);
  await run(page, '__game.god(false)');
  await step(page, 1.2);
  await run(page, '__game.god(true)');
  expect(await run(page, "document.querySelectorAll('.hud-bars .pip').length")).toBeGreaterThanOrEqual(2);
  await shot(page, 'M12/combat-hud.png');

  await gotoScene(page, 'end');
  await page.waitForTimeout(2500);
  await shot(page, 'M12/end.png');
  expect(errorsOf(page)).toEqual([]);
});
