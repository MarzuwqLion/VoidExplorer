import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

test('kills a dummy with each weapon and shows the HUD', async ({ page }) => {
  await boot(page);
  await gotoScene(page, 'gym');
  await page.evaluate(() => (window as any).__game.seed(7));
  // Stand in front of the flesh dummy at (-6, -14) and aim at its chest.
  await page.evaluate(() => (window as any).__game.teleport(-6, 0.05, -9.5));
  await step(page, 0.3);
  const aimAt = async (x: number, y: number, z: number) => {
    for (let i = 0; i < 2; i++) {
      await page.evaluate(([tx, ty, tz]) => {
        const g = (window as any).__game;
        const cam = g.game.scene.world.cam;
        const dx = tx - cam.pos.x, dy = ty - cam.pos.y, dz = tz - cam.pos.z;
        const yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
        const pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
        let d = yaw - cam.yaw;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        g.input.look(-d, pitch - cam.pitch);
      }, [x, y, z]);
      await step(page, 1 / 60);
      await page.evaluate(() => (window as any).__game.input.look(0, 0));
      await step(page, 0.05);
    }
  };
  for (const [key, weapon] of [['weapon1', 'pistol'], ['weapon2', 'smg'], ['weapon3', 'rifle']] as const) {
    await page.evaluate((k) => (window as any).__game.input.tap(k), key);
    await step(page, 0.6);
    expect(await page.evaluate(() => (window as any).__game.info().weapon)).toBe(weapon);
    const before = await page.evaluate(() => (window as any).__game.info().dummies[0].kills);
    await page.evaluate(() => (window as any).__game.input.hold('aim'));
    let kills = before;
    for (let i = 0; i < 80 && kills === before; i++) {
      await aimAt(-6, 1.0, -14);
      await page.evaluate(() => (window as any).__game.input.tap('fire'));
      if (weapon === 'smg') await page.evaluate(() => (window as any).__game.input.hold('fire'));
      await step(page, weapon === 'smg' ? 0.1 : 0.3);
      await page.evaluate(() => (window as any).__game.input.release('fire'));
      kills = await page.evaluate(() => (window as any).__game.info().dummies[0].kills);
      if (i === 1 && weapon === 'rifle') await shot(page, 'M3/hud-aiming.png');
    }
    expect(kills).toBe(before + 1);
    await page.evaluate(() => (window as any).__game.input.release('aim'));
    await step(page, 3.2);
  }
  const fired = await page.evaluate(() => (window as any).__game.state().stats.shotsFired);
  expect(fired).toBeGreaterThan(10);
  await page.evaluate(() => (window as any).__game.input.hold('fire'));
  await step(page, 0.5);
  await shot(page, 'M3/hud.png');
  expect(errorsOf(page)).toEqual([]);
});
