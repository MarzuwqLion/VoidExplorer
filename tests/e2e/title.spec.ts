import { test, expect } from '@playwright/test';
import { boot, litFraction, shot, errorsOf } from './helpers';

test('title screen loads with WebGL and is not blank', async ({ page }) => {
  await boot(page);
  expect(await page.evaluate(() => (window as any).__game.scene())).toBe('title');
  expect(await page.evaluate(() => (window as any).__game.renderInfo().webgl)).toBe(true);
  await page.waitForTimeout(500);
  await expect(page.getByText('New game')).toBeVisible();
  await shot(page, 'M0/title.png');
  expect(await litFraction(page)).toBeGreaterThan(0.01);
  expect(errorsOf(page)).toEqual([]);
});
