import { test, expect } from '@playwright/test';
import { newGame, runBot } from './loop';
import { errorsOf } from './helpers';

for (const order of [['amara', 'korr'], ['korr', 'amara']]) {
  test('full loop: ' + order.join(' then '), async ({ page }) => {
    await newGame(page);
    const seen = await runBot(page, { order, choices: ["I'll take the helm."] }, 'end');
    const state = await page.evaluate(() => (window as any).__game.state());
    expect(state.sceneId).toBe('end');
    expect(state.missions).toEqual({ amara: true, korr: true });
    expect(state.flags.briefed).toBe(true);
    expect(state.flags.debriefed).toBe(true);
    expect(seen).toContain('planet');
    expect(seen).toContain('systemMap');
    const log: string[] = await page.evaluate(() => (window as any).__game.bot.log);
    const lands = log.filter((l) => l.startsWith('land '));
    expect(lands.map((l) => l.slice(5))).toEqual(order);
    await expect(page.getByText('Keep exploring')).toBeVisible();
    expect(errorsOf(page)).toEqual([]);
  });
}
