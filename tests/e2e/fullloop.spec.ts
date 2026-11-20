import { test, expect } from '@playwright/test';
import { newGame, runBot } from './loop';
import { errorsOf } from './helpers';

test.setTimeout(2400000);

for (const [order, lookout] of [[['amara', 'korr'], 'reassure'], [['korr', 'amara'], 'threaten']] as const) {
  test('full loop: ' + order.join(' then ') + ', lookout ' + lookout, async ({ page }) => {
    await newGame(page);
    const seen = await runBot(page, { order, lookout, tunnel: order[0] === 'amara' }, 'end', 4000);
    const state = await page.evaluate(() => (window as any).__game.state());
    expect(state.sceneId).toBe('end');
    expect(state.missions).toEqual({ amara: true, korr: true });
    expect(state.flags.briefed).toBe(true);
    expect(state.flags.debriefed).toBe(true);
    expect(state.choices.lookout).toBe(lookout);
    expect(seen).toContain('planet');
    expect(seen).toContain('systemMap');
    const log: string[] = await page.evaluate(() => (window as any).__game.bot.log);
    expect(log.filter((l) => l.startsWith('land ')).map((l) => l.slice(5))).toEqual([...order]);
    // Debrief variant for the lookout choice.
    expect(log).toContain('node okonkwo:debrief1');
    expect(log).toContain(lookout === 'reassure' ? 'node okonkwo:dReassure' : 'node okonkwo:dThreaten');
    expect(log).not.toContain(lookout === 'reassure' ? 'node okonkwo:dThreaten' : 'node okonkwo:dReassure');
    await expect(page.getByText('Keep exploring')).toBeVisible();
    await expect(page.getByText(lookout === 'reassure' ? 'Reassured the lookout' : 'Threatened the lookout')).toBeVisible();
    expect(errorsOf(page)).toEqual([]);
  });
}
