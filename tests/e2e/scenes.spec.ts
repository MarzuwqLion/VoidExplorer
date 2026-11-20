import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, litFraction, errorsOf } from './helpers';

const DIR = process.env.SHOTS ?? 'latest';

test('one screenshot per scene', async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(400);
  await shot(page, DIR + '/title.png');
  await gotoScene(page, 'bridge');
  await step(page, 0.5);
  await page.waitForTimeout(500);
  await shot(page, DIR + '/bridge.png');
  expect(await litFraction(page)).toBeGreaterThan(0.2);
  await gotoScene(page, 'systemMap');
  await step(page, 0.5);
  await page.waitForTimeout(500);
  await shot(page, DIR + '/systemMap.png');
  for (const planet of ['amara', 'korr']) {
    await gotoScene(page, 'planet', { planet });
    await step(page, 0.5);
    await page.waitForTimeout(500);
    await shot(page, DIR + '/planet-' + planet + '.png');
    expect(await litFraction(page)).toBeGreaterThan(0.2);
  }
  await gotoScene(page, 'end');
  await page.waitForTimeout(500);
  await shot(page, DIR + '/end.png');
  expect(errorsOf(page)).toEqual([]);
});
