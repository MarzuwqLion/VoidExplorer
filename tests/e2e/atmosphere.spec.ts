import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf, litFraction } from './helpers';

/** Look from a spot toward a target with the gameplay camera overridden. */
async function view(page: import('@playwright/test').Page, from: [number, number, number], to: [number, number, number]): Promise<void> {
  await page.evaluate(([f, t]) => {
    const sc = (window as any).__game.game.scene;
    sc.world.cam.apply = (c: any) => {
      c.position.set(...f);
      c.lookAt(...t);
      c.fov = 60;
      c.updateProjectionMatrix();
    };
  }, [from, to] as const);
  await step(page, 0.4);
}

test('planet atmosphere and ground detail render within budget', async ({ page }) => {
  await boot(page);
  const calls = async () => page.evaluate(() => { (window as any).__game.game.renderNow(); return (window as any).__game.renderInfo().calls; });
  await gotoScene(page, 'planet', { planet: 'amara' });
  await step(page, 2);
  await view(page, [10, 6, 70], [35, 2, 50]);
  await shot(page, 'M17/amara-grove.png');
  expect(await litFraction(page)).toBeGreaterThan(0.5);
  await view(page, [70, 2, 40], [70, -6, 0]);
  await shot(page, 'M17/amara-ravine.png');
  await view(page, [-60, 5, 70], [-20, 2, 45]);
  await shot(page, 'M17/amara-meadow.png');
  expect(await calls()).toBeLessThanOrEqual(300);
  await gotoScene(page, 'planet', { planet: 'korr' });
  await step(page, 2);
  await view(page, [-70, 4, 70], [-50, 1, 40]);
  await shot(page, 'M17/korr-canyon.png');
  await view(page, [-10, 6, 10], [25, 0, -20]);
  await shot(page, 'M17/korr-yard.png');
  await view(page, [62, 2.5, -22], [80, 1, -38]);
  await shot(page, 'M17/korr-hall.png');
  expect(await calls()).toBeLessThanOrEqual(300);
  await gotoScene(page, 'bridge');
  await step(page, 1);
  await view(page, [0, 1.7, 2], [0, 0.6, -14]);
  await shot(page, 'M19/bridge-viewport.png');
  await view(page, [-2.2, 1.6, -2], [-5.8, 1.5, -2]);
  await shot(page, 'M19/bridge-science-screen.png');
  expect(await calls()).toBeLessThanOrEqual(300);
  expect(errorsOf(page)).toEqual([]);
});
