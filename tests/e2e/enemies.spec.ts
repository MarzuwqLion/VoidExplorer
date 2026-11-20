import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

test('every enemy type spawns, fights and dies in the gym', async ({ page }) => {
  await boot(page);
  await gotoScene(page, 'gym');
  await page.evaluate(() => (window as any).__game.god(true));
  await page.evaluate(() => (window as any).__game.teleport(-30, 0.05, 30));
  await step(page, 0.3);
  for (const type of ['stalker', 'spitter', 'rifleman', 'rusher', 'marksman', 'alpha', 'foreman']) {
    await page.evaluate((t) => (window as any).__game.spawn(t, t === 'stalker' ? 4 : 1), type);
    await step(page, type === 'alpha' || type === 'foreman' ? 2.5 : 1.5);
    await page.waitForTimeout(250);
    await shot(page, 'M4/' + type + '.png');
    const n = await page.evaluate(() => (window as any).__game.game.scene.director.activeCount());
    expect(n).toBeGreaterThan(0);
    await page.evaluate(() => (window as any).__game.killAll());
    await step(page, 1.0);
    expect(await page.evaluate(() => (window as any).__game.game.scene.director.activeCount())).toBe(0);
  }
  expect(await page.evaluate(() => (window as any).__game.state().stats.kills)).toBeGreaterThanOrEqual(10);
  expect(errorsOf(page)).toEqual([]);
});
