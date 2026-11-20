import type { PlanetScene } from '../scenes/planet';
import { AMARA, KORR, type Place } from '../data/layouts';
import { NODE_COLORS } from '../world/nodes';

/** Top-down map of a planet from layouts.ts and the live scene: walkable cells, cover, places, spawns, nodes, triggers, checkpoints. */
export function drawLayoutMap(s: PlanetScene, size = 880): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const nav = s.world.nav;
  const k = size / (nav.w * nav.cell);
  const X = (x: number) => (x - nav.minX) * k;
  const Z = (z: number) => (z - nav.minZ) * k;
  g.fillStyle = '#0a0d12';
  g.fillRect(0, 0, size, size);
  // Walkable cells shaded by height.
  const img = g.createImageData(nav.w, nav.h);
  for (let j = 0; j < nav.h; j++)
    for (let i = 0; i < nav.w; i++) {
      const idx = j * nav.w + i;
      const o = idx * 4;
      if (nav.walk[idx] && !nav.closed[idx]) {
        const h = nav.height[idx];
        const v = Math.max(0, Math.min(1, (h + 8) / 28));
        img.data[o] = 40 + v * 90;
        img.data[o + 1] = 70 + v * 110;
        img.data[o + 2] = 60 + v * 60;
      } else if (nav.closed[idx]) {
        img.data[o] = 200;
        img.data[o + 1] = 80;
        img.data[o + 2] = 40;
      } else {
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 18;
      }
      img.data[o + 3] = 255;
    }
  const tmp = document.createElement('canvas');
  tmp.width = nav.w;
  tmp.height = nav.h;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(tmp, 0, 0, size, size);
  // Cover pieces.
  for (const cv of s.world.level.covers) {
    g.save();
    g.translate(X(cv.x), Z(cv.z));
    g.rotate(-cv.rotY);
    g.fillStyle = cv.h <= 1.45 ? '#e0a040' : '#8090a0';
    g.fillRect(-cv.hw * k, -cv.hd * k, cv.hw * 2 * k, cv.hd * 2 * k);
    g.restore();
  }
  // Grid.
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let v = -100; v <= 100; v += 20) {
    g.beginPath();
    g.moveTo(X(v), 0);
    g.lineTo(X(v), size);
    g.moveTo(0, Z(v));
    g.lineTo(size, Z(v));
    g.stroke();
  }
  const L = s.planet === 'amara' ? AMARA : KORR;
  g.font = '12px system-ui, sans-serif';
  // Places with 5 m tolerance circles.
  for (const p of Object.values(L.places) as Place[]) {
    g.strokeStyle = '#ffffff';
    g.beginPath();
    g.arc(X(p.x), Z(p.z), 5 * k, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.fillText(p.name + ' (' + p.h + ' m)', X(p.x) + 6, Z(p.z) - 6);
  }
  // Encounters: triggers, spawns, checkpoints, crates.
  for (const e of s.director.encounters) {
    for (const t of [e.trigger, ...(e.alt ?? [])]) {
      g.strokeStyle = '#ffdd33';
      g.setLineDash([4, 3]);
      g.beginPath();
      g.arc(X(t.x), Z(t.z), t.r * k, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    g.fillStyle = '#ff4433';
    for (const w of e.waves) for (const sp of w) g.fillRect(X(sp.x) - 3, Z(sp.z) - 3, 6, 6);
    g.fillStyle = '#33ddff';
    g.beginPath();
    g.arc(X(e.checkpoint.x), Z(e.checkpoint.z), 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#44ff66';
    g.fillRect(X(e.crate.x) - 3, Z(e.crate.z) - 2, 6, 4);
  }
  // Resource nodes.
  for (const n of L.nodes) {
    g.fillStyle = '#' + NODE_COLORS[n.type].toString(16).padStart(6, '0');
    g.beginPath();
    g.moveTo(X(n.x), Z(n.z) - 5);
    g.lineTo(X(n.x) + 5, Z(n.z));
    g.lineTo(X(n.x), Z(n.z) + 5);
    g.lineTo(X(n.x) - 5, Z(n.z));
    g.fill();
  }
  // Shuttle and spawn.
  const sh = s.shuttlePoint();
  g.fillStyle = '#ffffff';
  g.fillRect(X(sh.x) - 4, Z(sh.z) - 4, 8, 8);
  // Legend.
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(8, size - 92, 300, 84);
  const leg: [string, string][] = [['#e0a040', 'low cover 1.0-1.4 m'], ['#8090a0', 'tall cover'], ['#ff4433', 'enemy spawn'], ['#ffdd33', 'trigger'], ['#33ddff', 'checkpoint'], ['#44ff66', 'ammo crate']];
  leg.forEach(([col, t], i) => {
    g.fillStyle = col;
    g.fillRect(16 + (i % 2) * 150, size - 82 + Math.floor(i / 2) * 22, 10, 10);
    g.fillStyle = '#fff';
    g.fillText(t, 32 + (i % 2) * 150, size - 73 + Math.floor(i / 2) * 22);
  });
  g.fillStyle = '#fff';
  g.font = 'bold 16px system-ui, sans-serif';
  g.fillText(s.planet.toUpperCase() + ' layout (north up, 20 m grid)', 12, 22);
  return c.toDataURL('image/png');
}
