import { test, expect } from '@playwright/test';

// Runs only against a production preview: PREVIEW_URL=http://localhost:5198/
test('production build serves a working game', async ({ page }) => {
  test.skip(!process.env.PREVIEW_URL, 'set PREVIEW_URL to run against vite preview');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(process.env.PREVIEW_URL + '?debug=1');
  await page.waitForFunction(() => (window as any).__game?.ready?.(), null, { timeout: 60000 });
  await expect(page.getByText('New game')).toBeVisible();
  await page.evaluate(() => (window as any).__game.goto('planet', { planet: 'amara' }));
  await page.waitForFunction(() => (window as any).__game.scene() === 'planet' && (window as any).__game.ready(), null, { timeout: 60000 });
  await page.evaluate(() => (window as any).__game.step(1));
  expect(await page.evaluate(() => (window as any).__game.renderInfo().webgl)).toBe(true);
  expect(errors).toEqual([]);
});
