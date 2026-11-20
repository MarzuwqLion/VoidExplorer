import type { Page } from '@playwright/test';
import { boot } from './helpers';

/** Start a new game through the title UI, skip the intro, then let the loop bot play. */
export async function newGame(page: Page): Promise<void> {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as any).__game?.ready?.());
  await page.getByText('New game').click();
  await page.locator('[data-screen=intro]').click();
  await page.waitForFunction(() => (window as any).__game.scene() === 'bridge' && (window as any).__game.ready(), null, { timeout: 30000 });
}

export async function runBot(page: Page, script: Record<string, unknown>, until: string, maxSimSeconds = 1800): Promise<string[]> {
  await page.evaluate((s) => (window as any).__game.bot.start(s), script);
  let sim = 0;
  const seen: string[] = [];
  while (sim < maxSimSeconds) {
    const st = await page.evaluate(() => {
      const g = (window as any).__game;
      return { scene: g.scene(), ready: g.ready(), active: g.bot.active };
    });
    if (seen[seen.length - 1] !== st.scene) seen.push(st.scene);
    if (st.scene === until && st.ready) break;
    if (!st.ready) {
      await page.waitForTimeout(150);
      continue;
    }
    await page.evaluate(() => (window as any).__game.step(2));
    sim += 2;
  }
  return seen;
}
