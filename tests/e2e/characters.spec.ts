import { test, expect, type Page } from '@playwright/test';
import { boot, gotoScene, step, shot, errorsOf, litFraction } from './helpers';

/** Line every character look up on the bridge and photograph full bodies and faces. */
async function lineup(page: Page, names: string[], cam: [number, number, number], look: [number, number, number], spacing: number): Promise<void> {
  await page.evaluate(
    async ([names, cam, look, spacing]) => {
      const g = (window as any).__game;
      const sc = g.game.scene;
      const H = await import('/src/world/models/humanoid.ts' as string);
      const C = await import('/src/data/characters.ts' as string);
      const face = await import('/src/world/models/humanoidHead.ts' as string);
      for (const o of sc.__lineup ?? []) sc.three.remove(o);
      sc.__lineup = [];
      (names as string[]).forEach((n, i) => {
        const h = H.buildHumanoid(C.LOOKS[n]);
        h.root.position.set((i - ((names as string[]).length - 1) / 2) * (spacing as number), 0, 3);
        h.root.rotation.y = Math.PI;
        H.applyPose(h, {});
        face.animateFace(h.face, 0.5, 1, 0);
        sc.three.add(h.root);
        sc.__lineup.push(h.root);
      });
      g.teleport(-5, 0.1, 7.5);
      sc.world.cam.apply = (c: any) => {
        c.position.set(...(cam as number[]));
        c.lookAt(...(look as number[]));
        c.fov = 40;
        c.updateProjectionMatrix();
      };
    },
    [names, cam, look, spacing] as const,
  );
  await step(page, 0.3);
}

test('character lineup: full bodies and faces render with detail', async ({ page }) => {
  await boot(page);
  await gotoScene(page, 'bridge');
  await step(page, 0.3);
  const crew = ['kade', 'okonkwo', 'reyes', 'zhao', 'brandt'];
  await lineup(page, crew, [0, 1.25, 7.2], [0, 1.0, 3], 1.1);
  await shot(page, 'M14/crew-lineup.png');
  expect(await litFraction(page)).toBeGreaterThan(0.5);
  await lineup(page, crew, [0, 1.62, 4.6], [0, 1.6, 3], 0.55);
  await shot(page, 'M14/crew-faces.png');
  const planet = ['boateng', 'varga', 'park', 'kwan'];
  await lineup(page, planet, [0, 1.2, 6.8], [0, 1.0, 3], 1.1);
  await shot(page, 'M14/planet-lineup.png');
  await lineup(page, planet, [0, 1.6, 4.5], [0, 1.58, 3], 0.55);
  await shot(page, 'M14/planet-faces.png');
  const raiders = ['lookout', 'rifleman', 'rusher', 'marksman'];
  await lineup(page, raiders, [0, 1.2, 6.8], [0, 1.0, 3], 1.1);
  await shot(page, 'M14/raider-lineup.png');
  expect(errorsOf(page)).toEqual([]);
});
