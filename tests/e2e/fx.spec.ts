import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

test('combat effects: impacts, casings, marks, blast, shield shell and grade render cleanly', async ({ page }) => {
  await boot(page);
  await gotoScene(page, 'gym');
  await step(page, 0.4);
  await page.evaluate(() => { const g = (window as any).__game; g.god(true); g.game.scene.combat.weapons.swap('smg'); });
  await step(page, 0.6);
  await page.evaluate(() => { const g = (window as any).__game; g.input.hold('aim'); g.input.hold('fire'); });
  await step(page, 0.5);
  await shot(page, 'M16/firing.png');
  const live = await page.evaluate(() => {
    const fx = (window as any).__game.game.scene.fx;
    return { decals: fx.decals.active, casings: fx.casings.mesh.visible, chips: fx.chips.mesh.visible };
  });
  expect(live.decals).toBeGreaterThan(0);
  expect(live.casings).toBe(true);
  await page.evaluate(() => (window as any).__game.input.clear());
  await step(page, 0.4);
  await shot(page, 'M16/marks.png');
  await page.evaluate(() => {
    const sc = (window as any).__game.game.scene;
    const p = sc.world.player.pos;
    const f = sc.world.cam.forward();
    sc.fx.blast(p.clone().addScaledVector(f.setY(0).normalize(), 7));
    sc.fx.shieldHit();
  });
  await step(page, 0.12);
  await page.waitForTimeout(100);
  await shot(page, 'M16/blast.png');
  const calls = await page.evaluate(() => { (window as any).__game.game.renderNow(); return (window as any).__game.renderInfo().calls; });
  expect(calls).toBeLessThanOrEqual(300);
  await step(page, 1.2);
  await shot(page, 'M16/blast-after.png');
  expect(errorsOf(page)).toEqual([]);
});
