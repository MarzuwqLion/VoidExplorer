import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

const PLANETS = ['cinder', 'anvil', 'shroud', 'amara', 'korr', 'ochre', 'goliath', 'pale', 'tempest', 'azure', 'vesper', 'flint', 'hollow', 'drift', 'terminus'];

test('panels for the sun and all 15 planets; only Amara and Korr offer Land', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await gotoScene(page, 'systemMap');
  await page.evaluate(() => (window as any).__game.teleportShipTo('oriel'));
  await step(page, 0.1);
  let info = await page.evaluate(() => (window as any).__game.info());
  expect(info.panel.name).toBe('Oriel');
  expect(info.panel.className).toContain('K1');
  const landable: string[] = [];
  const shots: Record<string, string> = { amara: 'panel-amara', goliath: 'panel-goliath', cinder: 'panel-cinder' };
  for (const id of PLANETS) {
    await page.evaluate((p) => (window as any).__game.teleportShipTo(p), id);
    await step(page, 0.1);
    info = await page.evaluate(() => (window as any).__game.info());
    expect(info.panel, id).toBeTruthy();
    expect(info.panel.name.toLowerCase()).toBe(id);
    expect(info.panel.className.length).toBeGreaterThan(3);
    if (info.panel.canLand) landable.push(id);
    const text = await page.locator('[data-ui=survey]').innerText();
    expect(text.toLowerCase()).toContain(info.panel.className.toLowerCase());
    expect(text).toMatch(id === 'amara' || id === 'korr' ? /Landing: viable/ : /Landing: not viable/);
    if (shots[id]) {
      await page.waitForTimeout(450);
      await shot(page, 'M6/' + shots[id] + '.png');
    }
  }
  expect(landable).toEqual(['amara', 'korr']);
  expect(info.surveyed).toBe(15);
  await expect(page.getByText('Surveyed 15 / 15')).toBeVisible();
  expect(errorsOf(page)).toEqual([]);
});

test('fly to a planet using inputs only, then zoom out', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await gotoScene(page, 'systemMap');
  await step(page, 0.2);
  await page.waitForTimeout(300);
  await shot(page, 'M6/zoomed-in.png');
  let near = null;
  for (let i = 0; i < 300 && near !== 'korr'; i++) {
    const info = await page.evaluate(() => (window as any).__game.info());
    const q = info.planets.korr;
    const dx = q.x - info.x, dz = q.z - info.z;
    const d = Math.hypot(dx, dz) || 1;
    await page.evaluate(([mx, my, boost]) => {
      const g = (window as any).__game;
      g.input.move(mx, my);
      if (boost) g.input.hold('boost');
      else g.input.release('boost');
    }, [dx / d, -dz / d, d > 25 ? 1 : 0]);
    await step(page, 0.1);
    near = info.near;
  }
  expect(near).toBe('korr');
  const info = await page.evaluate(() => (window as any).__game.info());
  expect(info.panel.canLand).toBe(true);
  await page.evaluate(() => (window as any).__game.input.clear());
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => (window as any).__game.input.tap('zoomOut'));
    await step(page, 1 / 30);
  }
  await page.waitForTimeout(300);
  await shot(page, 'M6/zoomed-out.png');
  expect((await page.evaluate(() => (window as any).__game.info())).zoom).toBeGreaterThan(600);
  expect(errorsOf(page)).toEqual([]);
});

test('abort round trip: bridge, map, land, abort, map, bridge', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await gotoScene(page, 'bridge');
  await page.evaluate(() => (window as any).__game.goto('systemMap', { fromBridge: true }));
  await page.waitForFunction(() => (window as any).__game.scene() === 'systemMap' && (window as any).__game.ready());
  await page.evaluate(() => (window as any).__game.teleportShipTo('amara'));
  await page.evaluate(() => (window as any).__game.give('alloy', 3));
  await step(page, 0.1);
  await page.evaluate(() => (window as any).__game.input.tap('land'));
  await step(page, 1.5);
  await page.waitForTimeout(200);
  await shot(page, 'M6/landing.png');
  await step(page, 3);
  await page.waitForFunction(() => (window as any).__game.scene() === 'planet' && (window as any).__game.ready(), null, { timeout: 30000 });
  // Gather something after landing so the snapshot restore is observable.
  await page.evaluate(() => (window as any).__game.give('alloy', 5));
  expect((await page.evaluate(() => (window as any).__game.state())).resources.alloy).toBe(8);
  const sh = await page.evaluate(() => (window as any).__game.info().shuttle);
  await page.evaluate(([x, y, z]) => (window as any).__game.teleport(x + 1.2, y + 0.1, z + 1.2), [sh.x, sh.y, sh.z]);
  await step(page, 0.3);
  await page.evaluate(([x, z]) => {
    const g = (window as any).__game;
    const i = g.info();
    const yaw = (Math.atan2(-(x - i.x), -(z - i.z)) * 180) / Math.PI;
    let d = yaw - i.yaw;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    g.input.look(-d, 0);
  }, [sh.x, sh.z]);
  await step(page, 0.2);
  const prompt = await page.evaluate(() => (window as any).__game.info().prompt);
  expect(prompt).toBe('Abort mission');
  await page.evaluate(() => (window as any).__game.input.tap('interact'));
  await step(page, 0.1);
  await page.waitForFunction(() => (window as any).__game.scene() === 'systemMap' && (window as any).__game.ready(), null, { timeout: 30000 });
  const st = await page.evaluate(() => (window as any).__game.state());
  expect(st.resources.alloy).toBe(3);
  expect(st.missions.amara).toBe(false);
  await step(page, 3.2);
  expect((await page.evaluate(() => (window as any).__game.info())).phase).toBe('fly');
  await page.evaluate(() => (window as any).__game.input.hold('returnBridge'));
  await step(page, 0.7);
  await page.evaluate(() => (window as any).__game.input.release('returnBridge'));
  await page.waitForFunction(() => (window as any).__game.scene() === 'bridge' && (window as any).__game.ready(), null, { timeout: 30000 });
  expect(errorsOf(page)).toEqual([]);
});
