import type { Page } from '@playwright/test';
import { boot } from './helpers';

/** Land directly on a planet with a fresh state and let the bot play until the mission is extracted. */
export async function playPlanet(page: Page, planet: 'amara' | 'korr', script: Record<string, unknown>, watch?: () => Promise<void>): Promise<{ simSeconds: number; log: string[] }> {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((p) => {
    const g = (window as any).__game;
    g.game.state.reset();
    g.game.state.setFlag('briefed');
    g.game.landingSnapshot = g.game.state.snapshot();
    return g.goto('planet', { planet: p });
  }, planet);
  await page.waitForFunction(() => (window as any).__game.scene() === 'planet' && (window as any).__game.ready(), null, { timeout: 60000 });
  await page.evaluate((s) => (window as any).__game.bot.start(s), { order: [planet], choices: [], ...script });
  let sim = 0;
  while (sim < 1500) {
    const st = await page.evaluate(() => {
      const g = (window as any).__game;
      return { scene: g.scene(), ready: g.ready(), done: g.state().missions };
    });
    if (st.done[planet]) break;
    if (!st.ready || st.scene !== 'planet') {
      await page.waitForTimeout(150);
      continue;
    }
    await page.evaluate(() => (window as any).__game.step(2));
    sim += 2;
    if (watch) await watch();
  }
  await page.evaluate(() => (window as any).__game.bot.stop());
  const log: string[] = await page.evaluate(() => (window as any).__game.bot.log);
  return { simSeconds: sim, log };
}

export async function saveLayoutMap(page: Page, path: string): Promise<void> {
  const url: string = await page.evaluate(() => (window as any).__game.layoutMap());
  const b64 = url.split(',')[1];
  const fs = await import('node:fs');
  const full = 'tests/screenshots/' + path;
  fs.mkdirSync(full.slice(0, full.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(full, Buffer.from(b64, 'base64'));
}
