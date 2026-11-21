import type { Page } from '@playwright/test';

export async function boot(page: Page, url = '/'): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  (page as unknown as { __errors: string[] }).__errors = errors;
  await page.goto(url);
  await page.waitForFunction(() => (window as any).__game?.ready?.(), null, { timeout: 60000 });
  // The loading card fades out once the title is up.
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 10000 });
}
export function errorsOf(page: Page): string[] {
  return (page as unknown as { __errors: string[] }).__errors ?? [];
}
export async function gotoScene(page: Page, scene: string, opts: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(([s, o]) => (window as any).__game.goto(s, o), [scene, opts] as const);
  await page.waitForFunction((s) => (window as any).__game.scene() === s && (window as any).__game.ready(), scene, { timeout: 60000 });
}
export async function step(page: Page, seconds: number): Promise<void> {
  await page.evaluate((s) => (window as any).__game.step(s), seconds);
}
/** Fraction of sampled pixels that are not near-black, as a blank-screen check. */
export async function litFraction(page: Page): Promise<number> {
  const buf = await page.screenshot();
  return await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 90;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, 160, 90);
    const d = g.getImageData(0, 0, 160, 90).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 45) lit++;
    return lit / (d.length / 4);
  }, buf.toString('base64'));
}
/** Screenshot to tests/screenshots; retries when Windows briefly locks the file (indexer or antivirus scan). */
export async function shot(page: Page, path: string): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      await page.screenshot({ path: 'tests/screenshots/' + path });
      return;
    } catch (e) {
      if (i >= 4 || !/UNKNOWN|EBUSY|EPERM/.test(String(e))) throw e;
      await page.waitForTimeout(400);
    }
  }
}
