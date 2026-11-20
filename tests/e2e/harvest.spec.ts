import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

for (const [planet, node, type] of [['amara', { x: 0, z: 49 }, 'biomass'], ['korr', { x: -62, z: 59 }, 'alloy']] as const) {
  test('harvest a resource node on ' + planet, async ({ page }) => {
    await boot(page);
    await page.evaluate(() => localStorage.clear());
    await gotoScene(page, 'planet', { planet });
    await page.evaluate(([x, z]) => {
      const g = (window as any).__game;
      const sc = g.game.scene;
      const y = sc.world.nav.heightAt(x + 1.3, z);
      g.teleport(x + 1.3, y + 0.1, z);
    }, [node.x, node.z]);
    await step(page, 0.3);
    // Face the node.
    await page.evaluate(([x, z]) => {
      const g = (window as any).__game;
      const i = g.info();
      let d = (Math.atan2(-(x - i.x), -(z - i.z)) * 180) / Math.PI - i.yaw;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      g.input.look(-d, -20);
    }, [node.x, node.z]);
    await step(page, 0.2);
    const info = await page.evaluate(() => (window as any).__game.info());
    expect(info.prompt).toMatch(/^Harvest /);
    const before = await page.evaluate((t) => (window as any).__game.state().resources[t], type);
    await page.evaluate(() => (window as any).__game.input.hold('interact'));
    await step(page, 0.5);
    await page.waitForTimeout(150);
    await shot(page, 'M11/harvest-' + planet + '.png');
    await step(page, 0.7);
    await page.evaluate(() => (window as any).__game.input.release('interact'));
    const st = await page.evaluate(() => (window as any).__game.state());
    expect(st.resources[type]).toBe(before + 1);
    expect(st.gathered[type]).toBe(1);
    expect(errorsOf(page)).toEqual([]);
  });
}
