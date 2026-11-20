import { test, expect, type Page } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf } from './helpers';

test.setTimeout(600000);

async function calls(page: Page): Promise<number> {
  await page.evaluate(() => (window as any).__game.game.renderNow());
  return page.evaluate(() => (window as any).__game.renderInfo().calls);
}

test('draw calls at a busy moment stay within budget in every scene', async ({ page }) => {
  await boot(page);
  const out: Record<string, number> = {};
  await gotoScene(page, 'title');
  out.title = await calls(page);
  await gotoScene(page, 'bridge');
  out.bridge = await calls(page);
  await gotoScene(page, 'systemMap');
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => (window as any).__game.input.tap('zoomOut'));
    await step(page, 1 / 30);
  }
  out.systemMap = await calls(page);
  for (const [planet, beat, spawns] of [['amara', 'grove', ['stalker', 'spitter']], ['korr', 'yard', ['rifleman', 'rusher', 'marksman']]] as const) {
    await gotoScene(page, 'planet', { planet });
    await page.evaluate((b) => (window as any).__game.jumpTo(b), beat);
    await page.evaluate(() => (window as any).__game.god(true));
    for (const s of spawns) await page.evaluate((t) => (window as any).__game.spawn(t, 3), s);
    await page.evaluate(() => (window as any).__game.input.hold('fire'));
    await step(page, 1.5);
    out[planet] = await calls(page);
    await page.evaluate(() => (window as any).__game.input.clear());
  }
  await gotoScene(page, 'end');
  out.end = await calls(page);
  console.log('draw calls', JSON.stringify(out));
  for (const [k, v] of Object.entries(out)) expect(v, k).toBeLessThanOrEqual(300);
  expect(errorsOf(page)).toEqual([]);
});

/** Every visible UI element inside the viewport, and key HUD boxes not overlapping. */
async function checkLayout(page: Page, label: string): Promise<void> {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const bad: string[] = [];
    for (const el of document.querySelectorAll('#ui *')) {
      const e = el as HTMLElement;
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      if (e.closest('[style*="display: none"]')) continue;
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0 || !e.textContent?.trim()) continue;
      if (b.left < -1 || b.top < -1 || b.right > vw + 1 || b.bottom > vh + 1) bad.push('overflow ' + e.className + ' ' + e.textContent!.slice(0, 30));
    }
    const sel = ['.hud-obj', '.hud-comms.on', '.hud-compass', '.hud-bars', '.hud-wpn', '.hud-prompt', '.dlg', '.survey.on', '.map-hud', '.map-help'];
    const boxes = sel
      .map((s) => [s, document.querySelector(s) as HTMLElement | null] as const)
      .filter(([, e]) => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0 && e.offsetParent !== null)
      .map(([s, e]) => [s, e!.getBoundingClientRect()] as const);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, A] = boxes[i], [bb, B] = boxes[j];
        if (A.left < B.right - 2 && B.left < A.right - 2 && A.top < B.bottom - 2 && B.top < A.bottom - 2) bad.push('overlap ' + a + ' ' + bb);
      }
    return bad;
  });
  expect(r, label).toEqual([]);
}

for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  test('every UI screen at ' + w + 'x' + h + ' has no overflow or overlap', async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    await page.evaluate(() => localStorage.clear());
    const tag = w + 'x' + h;
    await gotoScene(page, 'title');
    await page.waitForTimeout(300);
    await checkLayout(page, 'title');
    await shot(page, 'M10/' + tag + '-title.png');
    await page.getByText('Controls').click();
    await checkLayout(page, 'controls');
    await shot(page, 'M10/' + tag + '-controls.png');
    await page.getByText('Back', { exact: true }).click();
    await page.getByText('Settings').click();
    await checkLayout(page, 'settings');
    await shot(page, 'M10/' + tag + '-settings.png');
    await page.getByText('Back', { exact: true }).click();
    await gotoScene(page, 'bridge');
    await step(page, 0.3);
    await checkLayout(page, 'bridge');
    await shot(page, 'M10/' + tag + '-bridge.png');
    await page.evaluate(() => {
      const g = (window as any).__game;
      g.teleport(1.6, 0.05, 0.2);
    });
    await step(page, 0.2);
    await page.evaluate(() => {
      const sc = (window as any).__game.game.scene;
      const it = sc.world.interactables.find((i: any) => i.id === 'talk-xo');
      it.onUse();
    });
    await step(page, 3);
    await checkLayout(page, 'dialogue');
    await shot(page, 'M10/' + tag + '-dialogue.png');
    await page.evaluate(() => (window as any).__game.input.tap('pause'));
    await step(page, 0.1);
    await checkLayout(page, 'pause');
    await shot(page, 'M10/' + tag + '-pause.png');
    await gotoScene(page, 'bridge');
    await page.evaluate(() => (window as any).__game.give('alloy', 9));
    await page.evaluate(() => (window as any).__game.game.scene.world.interactables.find((i: any) => i.id === 'terminal').onUse());
    await step(page, 0.1);
    await checkLayout(page, 'terminal');
    await shot(page, 'M10/' + tag + '-terminal.png');
    await gotoScene(page, 'systemMap', { fromBridge: true });
    await page.evaluate(() => (window as any).__game.teleportShipTo('vesper'));
    await step(page, 0.5);
    await page.waitForTimeout(1200);
    await checkLayout(page, 'map');
    await shot(page, 'M10/' + tag + '-map.png');
    await gotoScene(page, 'planet', { planet: 'korr' });
    await page.evaluate(() => (window as any).__game.jumpTo('yard'));
    await page.evaluate(() => (window as any).__game.spawn('foreman', 1));
    await page.evaluate(() => (window as any).__game.god(true));
    await step(page, 2);
    await page.waitForTimeout(300);
    await checkLayout(page, 'planet hud');
    await shot(page, 'M10/' + tag + '-hud.png');
    await gotoScene(page, 'end');
    await page.waitForTimeout(300);
    await checkLayout(page, 'end');
    await shot(page, 'M10/' + tag + '-end.png');
    expect(errorsOf(page)).toEqual([]);
  });
}

test('injected gamepad completes a bridge conversation and a kill', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { connected: true, id: 'test pad', index: 0, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    (window as any).__pad = pad;
    (navigator as any).getGamepads = () => [pad];
  });
  const press = async (i: number, seconds = 0.05) => {
    await page.evaluate((b) => {
      const p = (window as any).__pad;
      p.buttons[b] = { pressed: true, touched: true, value: 1 };
    }, i);
    await step(page, seconds);
    await page.evaluate((b) => {
      const p = (window as any).__pad;
      p.buttons[b] = { pressed: false, touched: false, value: 0 };
    }, i);
    await step(page, 1 / 30);
  };
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await gotoScene(page, 'bridge');
  // Start a few metres from the XO and walk up to her with the left stick.
  await page.evaluate(() => (window as any).__game.teleport(1.8, 0.05, 2.5));
  await step(page, 0.2);
  await page.evaluate(() => ((window as any).__pad.axes = [0, -1, 0, 0]));
  await step(page, 1.1);
  await page.evaluate(() => ((window as any).__pad.axes = [0, 0, 0, 0]));
  await step(page, 0.3);
  expect(await page.evaluate(() => (window as any).__game.input.device())).toBe('pad');
  const focus = await page.evaluate(() => (window as any).__game.info().focus);
  expect(focus).toBe('talk-xo');
  const prompt = await page.locator('.hud-prompt .key').innerText();
  expect(prompt).toBe('X');
  await press(2); // X: talk
  for (let i = 0; i < 60; i++) {
    const info = await page.evaluate(() => (window as any).__game.info());
    if (!info.inDialogue) break;
    if (info.choices.length && info.choices.includes("I'll take the helm.")) {
      // D-pad down to the last choice, then A.
      for (let k = 0; k < 3; k++) await press(13);
    }
    await press(0); // A
  }
  expect(await page.evaluate(() => (window as any).__game.info().inDialogue)).toBe(false);
  expect(await page.evaluate(() => (window as any).__game.state().flags.briefed)).toBe(true);
  // A kill in the gym with triggers.
  await gotoScene(page, 'gym');
  await page.evaluate(() => (window as any).__game.god(true));
  await page.evaluate(() => (window as any).__game.teleport(-30, 0.05, 30));
  await step(page, 0.3);
  await page.evaluate(() => (window as any).__game.spawn('spitter', 1));
  const before = await page.evaluate(() => (window as any).__game.state().stats.kills);
  await page.evaluate(() => ((window as any).__pad.buttons[6] = { pressed: true, touched: true, value: 1 }));
  for (let i = 0; i < 200; i++) {
    const kills = await page.evaluate(() => (window as any).__game.state().stats.kills);
    if (kills > before) break;
    // Steer the right stick toward the nearest enemy.
    await page.evaluate((pulse) => {
      const g = (window as any).__game;
      const sc = g.game.scene;
      const e = sc.director.enemies.find((x: any) => x.alive);
      const pad = (window as any).__pad;
      if (!e) return;
      const cam = sc.world.cam;
      const dx = e.pos.x - cam.pos.x, dy = e.pos.y + 0.85 - cam.pos.y, dz = e.pos.z - cam.pos.z;
      let dyaw = (Math.atan2(-dx, -dz) * 180) / Math.PI - cam.yaw;
      while (dyaw > 180) dyaw -= 360;
      while (dyaw < -180) dyaw += 360;
      const dp = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI - cam.pitch;
      const sx = Math.abs(dyaw) < 1 ? 0 : Math.sign(-dyaw) * Math.min(1, 0.3 + Math.abs(dyaw) / 25);
      const sy = Math.abs(dp) < 1 ? 0 : Math.sign(-dp) * Math.min(1, 0.3 + Math.abs(dp) / 20);
      pad.axes = [0, 0, sx, sy];
      // Semi-auto rifle: pulse the trigger so every pull is a fresh press.
      const onTarget = Math.abs(dyaw) < 5 && Math.abs(dp) < 5 && pulse;
      pad.buttons[7] = { pressed: onTarget, touched: true, value: onTarget ? 1 : 0 };
    }, i % 2 === 0);
    await step(page, 0.05);
  }
  const kills = await page.evaluate(() => (window as any).__game.state().stats.kills);
  expect(kills).toBeGreaterThan(before);
  expect(errorsOf(page)).toEqual([]);
});

test('changing a value in the tuning panel changes the game live', async ({ page }) => {
  await boot(page);
  await gotoScene(page, 'gym');
  await step(page, 0.5);
  await page.keyboard.press('Backquote');
  await page.getByText('Tuning').click();
  const before = await page.evaluate(() => (window as any).__game.info().fov);
  await page.locator('input[data-key=camFov]').evaluate((el: HTMLInputElement) => {
    el.value = '90';
    el.dispatchEvent(new Event('input'));
  });
  await step(page, 1);
  const after = await page.evaluate(() => (window as any).__game.info().fov);
  expect(before).toBeLessThan(75);
  expect(after).toBeGreaterThan(85);
  await page.locator('input[data-key=jogSpeed]').evaluate((el: HTMLInputElement) => {
    el.value = '9';
    el.dispatchEvent(new Event('input'));
  });
  await page.evaluate(() => (window as any).__game.input.move(1, 0));
  await step(page, 1);
  expect(await page.evaluate(() => (window as any).__game.info().speed)).toBeGreaterThan(8.5);
  await page.locator('[data-action=copy-json]').click();
  const json = await page.evaluate(() => (window as any).__tuningJson);
  expect(JSON.parse(json).camFov).toBe(90);
  await shot(page, 'M10/tuning-panel.png');
  expect(errorsOf(page)).toEqual([]);
});
