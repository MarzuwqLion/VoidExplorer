import { test, expect } from '@playwright/test';
import { playPlanet, saveLayoutMap } from './planets';
import { boot, step, shot, errorsOf } from './helpers';

test.setTimeout(900000);

async function yardStart(page: any): Promise<{ alerted: number; total: number; waves: number } | null> {
  return page.evaluate(() => {
    const sc = (window as any).__game.game.scene;
    if (!sc.director || sc.director.status.get('yard') !== 'active') return null;
    const yard = sc.director.enemies.filter((e: any) => e.encounter === 'yard');
    const enc = sc.director.encounters.find((e: any) => e.id === 'yard');
    return { alerted: yard.filter((e: any) => e.alerted).length, total: yard.length, waves: enc.waves.length };
  });
}

for (const choice of ['reassure', 'threaten'] as const) {
  test('Cold Seam: the loop bot completes the mission after choosing to ' + choice, async ({ page }) => {
    let first: { alerted: number; total: number; waves: number } | null = null;
    const r = await playPlanet(page, 'korr', { lookout: choice }, async () => {
      if (!first) first = await yardStart(page);
    });
    const st = await page.evaluate(() => (window as any).__game.state());
    expect(st.missions.korr).toBe(true);
    expect(st.choices.lookout).toBe(choice);
    expect(st.flags.korr_foreman).toBe(true);
    expect(first).not.toBeNull();
    if (choice === 'threaten') {
      expect(first!.waves).toBe(3);
      expect(first!.alerted).toBe(first!.total);
    } else {
      expect(first!.waves).toBe(2);
      expect(first!.alerted).toBeLessThan(first!.total);
    }
    expect(r.simSeconds).toBeLessThan(1500);
    expect(errorsOf(page)).toEqual([]);
  });
}

test('Cold Seam: layout map and a screenshot of every beat', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__game.goto('planet', { planet: 'korr' }));
  await page.waitForFunction(() => (window as any).__game.scene() === 'planet' && (window as any).__game.ready(), null, { timeout: 60000 });
  await saveLayoutMap(page, 'M8/korr-layout.png');
  const beats: string[] = await page.evaluate(() => (window as any).__game.beats());
  for (const b of beats) {
    await page.evaluate((x) => (window as any).__game.jumpTo(x), b);
    await step(page, 0.6);
    await page.waitForTimeout(250);
    await shot(page, 'M8/beat-' + b + '.png');
  }
  expect(errorsOf(page)).toEqual([]);
});
