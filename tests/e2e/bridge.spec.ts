import { test, expect } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

/** Walk up to a point through the input layer and face it. */
async function walkTo(page: any, x: number, z: number, stopAt = 1.4): Promise<void> {
  for (let i = 0; i < 300; i++) {
    const info = await page.evaluate(() => (window as any).__game.info());
    const dx = x - info.x, dz = z - info.z;
    const d = Math.hypot(dx, dz);
    const yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    let diff = yaw - info.yaw;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    await page.evaluate(([lx, mv]: number[]) => {
      const g = (window as any).__game;
      g.input.look(lx, 0);
      g.input.move(0, mv);
    }, [-diff, d > stopAt && Math.abs(diff) < 40 ? 1 : 0]);
    await step(page, 1 / 15);
    if (d <= stopAt && Math.abs(diff) < 10) break;
  }
  await page.evaluate(() => (window as any).__game.input.clear());
}

test('talk to every crew member and buy an upgrade', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await gotoScene(page, 'bridge');
  await step(page, 0.5);
  await shot(page, 'M5/bridge.png');
  const crew = [
    { id: 'xo', x: 1.8, z: -1.5 },
    { id: 'helm', x: 0, z: -6.5 },
    { id: 'science', x: -4.4, z: -2 },
    { id: 'quartermaster', x: 4.5, z: 5.5 },
  ];
  for (const c of crew) {
    // Approach from the open side of the room.
    const ax = c.id === 'science' ? -2.6 : c.id === 'quartermaster' ? 3.0 : c.id === 'helm' ? 0 : 1.6;
    const az = c.id === 'helm' ? -4.6 : c.id === 'xo' ? 0.4 : c.z;
    await walkTo(page, ax, az, 0.5);
    await walkTo(page, c.x, c.z, 2.0);
    const focus = await page.evaluate(() => (window as any).__game.info().focus);
    expect(focus).toBe('talk-' + c.id);
    await page.evaluate(() => (window as any).__game.input.tap('interact'));
    await step(page, 0.6);
    expect(await page.evaluate(() => (window as any).__game.info().inDialogue)).toBe(true);
    if (c.id === 'xo') {
      await page.waitForTimeout(200);
      await shot(page, 'M5/dialogue-camera.png');
    }
    let picked = 0;
    for (let i = 0; i < 200; i++) {
      const info = await page.evaluate(() => (window as any).__game.info());
      if (!info.inDialogue) break;
      if (info.choices.length) {
        const label = picked < 1 ? info.choices[0] : info.choices.includes('Goodbye') ? 'Goodbye' : info.choices.includes("I'll take the helm.") ? "I'll take the helm." : info.choices[info.choices.length - 1];
        await page.evaluate((l: string) => (window as any).__game.game.scene.dialogue.chooseLabel(l), label);
        picked++;
      } else await page.evaluate(() => (window as any).__game.input.tap('confirm'));
      await step(page, 0.2);
    }
    expect(await page.evaluate(() => (window as any).__game.info().inDialogue)).toBe(false);
    // Terminal may have opened from Brandt's upgrades topic; close it.
    await page.evaluate(() => (window as any).__game.input.tap('back'));
    await step(page, 0.2);
  }
  expect(await page.evaluate(() => (window as any).__game.state().flags.briefed)).toBe(true);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.give('alloy', 10);
    g.give('biomass', 10);
    g.give('isotopes', 10);
  });
  await walkTo(page, 4.2, 6.5, 0.4);
  await walkTo(page, 5.5, 6.5, 1.5);
  expect(await page.evaluate(() => (window as any).__game.info().focus)).toBe('terminal');
  await page.evaluate(() => (window as any).__game.input.tap('interact'));
  await step(page, 0.3);
  await expect(page.locator('[data-screen=terminal]')).toBeVisible();
  await shot(page, 'M5/terminal.png');
  await page.locator('[data-upgrade=shield] button').click();
  await step(page, 0.2);
  const st = await page.evaluate(() => (window as any).__game.state());
  expect(st.upgrades).toContain('shield');
  expect(st.resources.alloy).toBe(4);
  expect(errorsOf(page)).toEqual([]);
});
