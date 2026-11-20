import { test, expect } from '@playwright/test';
import { playPlanet, saveLayoutMap } from './planets';
import { boot, step, shot, errorsOf } from './helpers';

test.setTimeout(900000);

test('Landfall: the loop bot completes the mission without the tunnel', async ({ page }) => {
  const r = await playPlanet(page, 'amara', { tunnel: false });
  const st = await page.evaluate(() => (window as any).__game.state());
  expect(st.missions.amara).toBe(true);
  expect(st.flags.amara_beacon).toBe(true);
  expect(st.flags.amara_tunnel).toBeUndefined();
  expect(st.resources.isotopes).toBeGreaterThanOrEqual(1);
  expect(r.simSeconds).toBeLessThan(1500);
  expect(errorsOf(page)).toEqual([]);
});

test('Landfall: the loop bot completes the mission through the tunnel shortcut', async ({ page }) => {
  let nearExit = 99;
  const r = await playPlanet(page, 'amara', { tunnel: true }, async () => {
    const i = await page.evaluate(() => (window as any).__game.info());
    if (i.x !== undefined) nearExit = Math.min(nearExit, Math.hypot(i.x - 58, i.z - 5));
  });
  const st = await page.evaluate(() => (window as any).__game.state());
  expect(st.missions.amara).toBe(true);
  expect(st.flags.amara_tunnel).toBe(true);
  expect(nearExit).toBeLessThan(8);
  expect(r.log.join(' ')).toContain('Is there another way into the ravine?');
  expect(errorsOf(page)).toEqual([]);
});

test('Landfall: layout map and a screenshot of every beat', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__game.goto('planet', { planet: 'amara' }));
  await page.waitForFunction(() => (window as any).__game.scene() === 'planet' && (window as any).__game.ready(), null, { timeout: 60000 });
  await saveLayoutMap(page, 'M7/amara-layout.png');
  const beats: string[] = await page.evaluate(() => (window as any).__game.beats());
  for (const b of beats) {
    await page.evaluate((x) => (window as any).__game.jumpTo(x), b);
    await step(page, 0.6);
    await page.waitForTimeout(250);
    await shot(page, 'M7/beat-' + b + '.png');
    const info = await page.evaluate(() => (window as any).__game.info());
    expect(info.beat).toBe(b);
  }
  expect(errorsOf(page)).toEqual([]);
});
