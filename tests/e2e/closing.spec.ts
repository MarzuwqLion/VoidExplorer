import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

test('save and continue restores a mid-game state', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    const g = (window as any).__game;
    const s = g.game.state;
    s.reset();
    s.setFlag('briefed');
    s.setFlag('amaraDone');
    s.data.missions.amara = true;
    s.give('biomass', 7, true);
    s.give('isotopes', 3, true);
    s.buy('medic');
    s.survey('cinder');
    s.survey('amara');
  });
  await gotoScene(page, 'systemMap');
  await step(page, 0.5);
  const saved = await page.evaluate(() => (window as any).__game.state());
  await page.reload();
  await page.waitForFunction(() => (window as any).__game?.ready?.());
  await expect(page.getByText('Continue')).toBeEnabled();
  await page.getByText('Continue').click();
  await page.waitForFunction(() => (window as any).__game.scene() === 'systemMap' && (window as any).__game.ready(), null, { timeout: 30000 });
  const st = await page.evaluate(() => (window as any).__game.state());
  expect(st.missions).toEqual({ amara: true, korr: false });
  expect(st.upgrades).toEqual(['medic']);
  expect(st.resources).toEqual(saved.resources);
  expect(st.surveyed).toEqual(saved.surveyed);
  expect(st.flags.briefed).toBe(true);
  expect(Math.abs(st.ship.x - saved.ship.x)).toBeLessThan(0.01);
  expect(errorsOf(page)).toEqual([]);
});

test('five scene round trips do not leak geometry or textures', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  const round = async () => {
    for (const [s, o] of [['bridge', {}], ['systemMap', {}], ['planet', { planet: 'amara' }], ['planet', { planet: 'korr' }], ['end', {}], ['title', {}]] as const) {
      await gotoScene(page, s, o);
      await step(page, 0.3);
      await page.waitForTimeout(100);
    }
  };
  await round();
  const base = await page.evaluate(() => (window as any).__game.renderInfo());
  for (let i = 0; i < 5; i++) await round();
  const after = await page.evaluate(() => (window as any).__game.renderInfo());
  expect(after.geometries).toBeLessThanOrEqual(Math.ceil(base.geometries * 1.05));
  expect(after.textures).toBeLessThanOrEqual(Math.ceil(base.textures * 1.05));
  expect(errorsOf(page)).toEqual([]);
});

test('intro card, pause, settings and controls menus work', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as any).__game?.ready?.());
  await page.getByText('Controls').click();
  await expect(page.getByText('Keyboard and mouse')).toBeVisible();
  await shot(page, 'M9/controls.png');
  await page.getByText('Back').click();
  await page.getByText('Settings').click();
  await expect(page.getByText('Mouse sensitivity')).toBeVisible();
  await shot(page, 'M9/settings.png');
  await page.getByText('Back', { exact: true }).click();
  await page.getByText('New game').click();
  await expect(page.getByText('The Armed Survey Corps charts worlds nobody has claimed')).toBeVisible();
  await page.waitForTimeout(2500);
  await shot(page, 'M9/intro.png');
  await page.locator('[data-screen=intro]').click();
  await page.waitForFunction(() => (window as any).__game.scene() === 'bridge' && (window as any).__game.ready());
  await page.evaluate(() => (window as any).__game.input.tap('pause'));
  await step(page, 0.1);
  await expect(page.getByText('Paused')).toBeVisible();
  await shot(page, 'M9/pause.png');
  await page.getByText('Resume').click();
  await expect(page.getByText('Paused')).toHaveCount(0);
  expect(errorsOf(page)).toEqual([]);
});
