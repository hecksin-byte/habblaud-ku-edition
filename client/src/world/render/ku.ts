// Campus "KU Edition": pinta, na camada base, o entorno do prédio como um campus de pedra gótica
// (bosque ao fundo, fileira de edifícios com o prédio principal no centro, praça, edifícios laterais).
// Desenha em "pixel de arte" de 2x2 px de mundo numa tela pequena e amplia sem suavizar; o retângulo do
// prédio fica transparente, então salas, jardins dos slots, rua e calçada continuam como antes.
import { mulberry32 } from '../../../../shared/hash';
import type { KuBench, KuDoor, KuMap, Pt } from './ku-map';

/** Tamanho, em px de mundo, de um pixel de arte desta cena. */
export const KU_SCALE = 2;
const S = KU_SCALE;

const CRIMSON = '#8b0029';
const CRIM = ['#c23a58', '#9c1236', '#6f0a27', '#4a0618'];
const GRASS = ['#6fae52', '#66a64b', '#5b9a42', '#7bbb5d'];
const GINKGO = ['#f3d34a', '#e0b72d', '#b98a1c', '#7a5710'];
const MAPLE = ['#e0603a', '#bf3b2a', '#8e2420', '#561514'];
const GREEN = ['#4f8f45', '#3d7a3c', '#2c5f31', '#1c3f22'];
const DEEP = ['#356b38', '#2a5a30', '#1f4526', '#14301a'];
const STONE = ['#cbcfd2', '#b1b6ba', '#90969b'];
const PAVE = ['#d2cdc2', '#c9c4b9', '#bdb8ad'];
const MOUND = ['#6aa653', '#4f8a3f', '#3b6e32', '#2b5226'];
const PINE = ['#4a7a42', '#34603a', '#244a2c', '#15301b'];

export interface KuGeometry {
  /** Origem e tamanho da camada base (px de mundo). */
  bx: number;
  by: number;
  bw: number;
  bh: number;
  /** Retângulo do prédio (px de mundo). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Topo da calçada sul (px de mundo): o campus termina aqui. */
  sidewalkY: number;
  /** Início da faixa ao sul da rua (px de mundo). */
  southStripY: number;
  /** Topo e base da pista da rua (px de mundo), para a faixa de pedestres. */
  streetY0: number;
  streetY1: number;
}

/** Objeto em pé (árvore, banco, mastro...) desenhado em tempo real, na ordem de profundidade com pessoas e veículos. */
export interface KuSprite {
  canvas: HTMLCanvasElement;
  /** Canto superior esquerdo e profundidade (y dos pés), em px de mundo. */
  x: number;
  y: number;
  depth: number;
}

export interface KuScene {
  lo: HTMLCanvasElement;
  sprites: KuSprite[];
  /** Onde se pode andar, portas, bancos e a faixa de pedestres (ver ku-map.ts). */
  map: KuMap;
}

const cache = new Map<string, KuScene>();

/** Pinta o campus na camada base (ctx já transladado para coordenadas de mundo) e devolve o que é desenhado em tempo real. */
export function paintKuCampus(ctx: CanvasRenderingContext2D, g: KuGeometry): KuScene {
  const key = [g.bx, g.by, g.bw, g.bh, g.x0, g.x1, g.y0, g.y1, g.sidewalkY, g.southStripY, g.streetY0, g.streetY1].join(',');
  let scene = cache.get(key);
  if (!scene) {
    scene = renderScene(g);
    if (cache.size >= 2) cache.clear();
    cache.set(key, scene);
  }
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene.lo, g.bx, g.by, scene.lo.width * S, scene.lo.height * S);
  ctx.imageSmoothingEnabled = smooth;
  return scene;
}

function renderScene(g: KuGeometry): KuScene {
  const LW = Math.ceil(g.bw / S);
  const LH = Math.ceil(g.bh / S);
  const lo = document.createElement('canvas');
  lo.width = LW;
  lo.height = LH;
  let c = lo.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const rnd = mulberry32(0x4b55);

  // Geometria em pixels de arte: prédio, topo da calçada e centro da fileira de edifícios.
  const xL = (g.x0 - g.bx) / S;
  const xR = (g.x1 - g.bx) / S;
  const yT = (g.y0 - g.by) / S;
  const sidewalkA = (g.sidewalkY - g.by) / S;
  const cxA = (xL + xR) / 2;
  // a cena foi desenhada com o centro em x=400 e o topo do prédio em y=350
  const ox = cxA - 400;
  const oy = yT - 350;
  const HB = 240;


  function blob(cx: number, cy: number, rx: number, ry: number, pal: string[], seed: number, n = 7) {
    const r = mulberry32(seed), cs = [];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, d = r() * 0.55;
      cs.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.9, rx * (0.45 + r() * 0.3), ry * (0.45 + r() * 0.3)]);
    }
    const x0 = Math.floor(cx - rx * 1.3), y0 = Math.floor(cy - ry * 1.3);
    const w = Math.ceil(rx * 2.6) + 2, h = Math.ceil(ry * 2.6) + 2;
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x0 + x, Y = y0 + y;
      for (const [a, b, rx2, ry2] of cs) if (((X - a) / rx2) ** 2 + ((Y - b) / ry2) ** 2 <= 1) { m[y * w + x] = 1; break; }
    }
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const X = x0 + x, Y = y0 + y;
      const t = ((X - cx) / rx) * 0.55 + ((Y - cy) / ry) * 0.9;
      let k = t < -0.3 ? 0 : t > 0.35 ? 2 : 1;
      if (r() < 0.14) k = Math.max(0, Math.min(2, k + (r() < 0.5 ? -1 : 1)));
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) k = 3;
      R(X, Y, 1, 1, pal[k]);
    }
  }
  function shadow(cx: number, cy: number, rx: number, ry: number, a = 0.2) {
    c.fillStyle = `rgba(20,30,20,${a})`;
    for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); }
  }
  function disc(cx: number, cy: number, r: number, col: string) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); R(cx - w, cy + y, w * 2, 1, col); } }
  function tree(x: number, y: number, pal: string[], s = 1, seed = 1) {
    shadow(x + 3, y, 14 * s, 4 * s);
    R(x - 1, y - 15 * s, 3, 15 * s, '#5b3a24'); R(x - 1, y - 15 * s, 1, 15 * s, '#74502f');
    blob(x, y - 28 * s, 17 * s, 15 * s, pal, seed, 8);
  }
  function hedge(x: number, y: number, w: number, h = 6, pal: string[] = GREEN, seed = 5) { for (let i = 0; i < w; i += 6) blob(x + i + 3, y + h / 2, 5, h / 2 + 1, pal, seed + i, 3); }
  const GLY: Record<string, string[]> = { K: ['10010', '10100', '11000', '11000', '10100', '10010', '10001'], U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'] };
  function letters(str: string, x: number, y: number, col: string) { let cx = x; for (const ch of str) { GLY[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') R(cx + i, y + j, 1, 1, col); })); cx += 6; } }
  function ashlar(x: number, y: number, w: number, h: number, base = STONE[1]) {
    R(x, y, w, h, base);
    for (let yy = y; yy < y + h; yy += 5) {
      R(x, yy, w, 1, STONE[2]);
      const off = (((yy - y) / 5) % 2) * 6;
      for (let xx = x + off; xx < x + w; xx += 12) R(xx, yy, 1, 5, STONE[2]);
    }
    for (let i = 0; i < w * h / 70; i++) R(x + rnd() * w, y + rnd() * h, 5, 3, STONE[0]);
    R(x, y, w, 1, STONE[0]);
  }
  function arch(x: number, y: number, w: number, h: number, glass = '#27384f') {
    R(x - 1, y - 1, w + 2, h + 2, '#d9d5c9');
    const half = Math.ceil(w / 2);
    for (let r = 0; r < half; r++) { const inset = half - 1 - r; R(x + inset - 1, y - 1 + r - half + 1, w - 2 * inset + 2, 1, '#d9d5c9'); }
    for (let r = 0; r < half; r++) { const inset = half - 1 - r; R(x + inset, y + r - half + 1, w - 2 * inset, 1, glass); }
    R(x, y, w, h, glass); R(Math.floor(x + w / 2), y - half + 3, 1, h + half - 3, '#d9d5c9'); R(x + 1, y + 2, 1, 3, 'rgba(255,255,255,.35)');
  }
  function rect(x: number, y: number, w: number, h: number, glass = '#27384f') {
    R(x - 1, y - 1, w + 2, h + 2, '#d9d5c9'); R(x, y, w, h, glass);
    R(x + Math.floor(w / 2), y, 1, h, '#d9d5c9'); R(x, y + Math.floor(h / 2), w, 1, '#d9d5c9');
  }
  function roof(x: number, y: number, w: number, h: number) {
    R(x - 2, y, w + 4, h, '#3d4656');
    for (let yy = y + 3; yy < y + h; yy += 4) R(x - 2, yy, w + 4, 1, '#2f3745');
    for (let xx = x; xx < x + w; xx += 7) R(xx, y + 2, 1, h - 2, 'rgba(0,0,0,.12)');
    R(x - 2, y, w + 4, 2, '#5f6c82'); R(x - 2, y + h - 2, w + 4, 2, '#2f3745');
  }
  function dormer(cx: number, y: number) {
    ashlar(cx - 6, y, 12, 12);
    for (let r = 0; r < 8; r++) R(cx - 8 + r, y - 8 + r, 16 - 2 * r, 1, '#3d4656');
    R(cx - 3, y + 2, 6, 8, '#27384f'); R(cx - 3, y + 2, 6, 1, '#d9d5c9'); R(cx, y + 2, 1, 8, '#d9d5c9');
  }
  function gable(px: number, top: number, w: number, h: number) {
    for (let r = 0; r < h; r++) { const inset = (h - 1 - r) * (w / 2 / h); R(px - 3 + inset, top + r, w + 6 - inset * 2, 1, r % 4 === 3 ? '#2f3745' : '#3d4656'); R(px - 3 + inset, top + r, 1, 1, '#5f6c82'); R(px + w + 2 - inset, top + r, 1, 1, '#2f3745'); }
  }
  function ivy(x: number, y: number, p: string[], seed: number) { blob(x, y, 7, 6, p, seed, 4); }

  function gothicHall(x: number, w: number, base: number, floors: number, o: { door?: boolean; gable?: number; spire?: boolean; spireRight?: boolean } = {}) {
    const fh = 28, top = base - floors * fh;
    shadow(x + w / 2, base + 3, w / 2 + 4, 3, 0.28);
    roof(x, top - 28, w, 28);
    const nd = Math.max(2, Math.floor(w / 32));
    for (let i = 0; i < nd; i++) dormer(x + (w / nd) * (i + 0.5), top - 20);
    ashlar(x, top, w, base - top);
    for (let f = 0; f < floors; f++) R(x, top + f * fh, w, 2, STONE[0]);
    const cols = Math.floor((w - 8) / 18);
    for (let f = 0; f < floors; f++) for (let i = 0; i < cols; i++) {
      const wx = x + 8 + i * 18 + (w - 8 - cols * 18) / 2, wy = top + f * fh + 8;
      if (f === 0 && o.door && Math.abs(wx + 5 - (x + w / 2)) < 12) continue;
      (f % 2 === 0) ? arch(wx, wy + 4, 8, 12) : rect(wx - 1, wy + 2, 10, 14);
    }
    if (o.gable) { const gx = o.gable; ashlar(gx, top - 12, 44, base - top + 12); gable(gx, top - 38, 44, 26); arch(gx + 11, top + 14, 9, 14); arch(gx + 26, top + 14, 9, 14); }
    if (o.spire) { const sx = o.spireRight ? x + w - 26 : x + 4; ashlar(sx, top - 40, 22, 40); for (let r = 0; r < 24; r++) R(sx + 11 - (r * 0.46), top - 64 + r, r * 0.92 + 1, 1, '#3d4656'); arch(sx + 7, top - 30, 8, 12); }
    if (o.door) { const dx = (o.gable ? o.gable + 22 : x + w / 2) - 11; R(dx - 2, base - 28, 26, 28, '#d9d5c9'); R(dx + 1, base - 25, 20, 25, '#5a3b25'); R(dx + 10, base - 25, 2, 25, '#3a2616'); R(dx + 5, base - 12, 2, 2, '#e3c26a'); R(dx + 15, base - 12, 2, 2, '#e3c26a'); R(dx - 4, base, 30, 3, STONE[0]); }
    for (const [ix, iy, p] of [[x + 12, base - 6, CRIM], [x + w - 14, base - 4, MAPLE], [x + w * 0.45, base - 5, GREEN]] as [number, number, string[]][]) ivy(ix, iy, p, ix * 3 + iy);
  }
  function tiger(x: number, y: number) {
    const O = '#e49b2d', D = '#2a1a10', Wt = '#f6f0e0';
    R(x + 4, y + 7, 17, 9, O); R(x + 5, y + 6, 15, 1, O);
    R(x + 5, y + 15, 3, 5, O); R(x + 17, y + 15, 3, 5, O); R(x + 5, y + 19, 3, 1, Wt); R(x + 17, y + 19, 3, 1, Wt);
    R(x + 7, y + 13, 11, 3, Wt);
    R(x + 15, y + 1, 10, 9, O); R(x + 15, y, 2, 2, O); R(x + 23, y, 2, 2, O); R(x + 16, y, 1, 1, D); R(x + 24, y, 1, 1, D);
    R(x + 19, y + 6, 6, 4, Wt); R(x + 18, y + 4, 2, 2, D); R(x + 23, y + 4, 2, 2, D); R(x + 21, y + 6, 2, 1, D);
    R(x + 8, y + 7, 1, 5, D); R(x + 12, y + 7, 1, 6, D); R(x + 16, y + 7, 1, 4, D); R(x + 17, y + 1, 1, 2, D); R(x + 21, y + 1, 1, 2, D);
    R(x + 1, y + 9, 4, 2, O); R(x, y + 6, 2, 4, O); R(x, y + 6, 2, 1, D); R(x + 2, y + 9, 1, 2, D);
  }
  function bench(x: number, y: number, w = 24) { R(x, y, w, 3, '#8a5a34'); R(x, y + 3, 2, 4, '#4a3020'); R(x + w - 2, y + 3, 2, 4, '#4a3020'); R(x, y - 4, w, 2, '#6f4627'); }
  function lamp(x: number, y: number) {
    R(x, y - 26, 2, 26, '#2a2a32'); R(x - 3, y - 29, 8, 3, '#f2d27a'); R(x - 2, y - 30, 6, 1, '#fff2b8');
    R(x + 2, y - 24, 8, 16, CRIMSON); R(x + 2, y - 10, 8, 2, CRIM[2]); R(x + 4, y - 20, 4, 1, '#fff'); R(x + 4, y - 17, 4, 1, '#fff'); R(x + 4, y - 14, 3, 1, '#fff');
  }
  function bikeRack(x: number, y: number) { for (let i = 0; i < 4; i++) { R(x + i * 6, y, 1, 6, '#55585f'); R(x + i * 6 - 1, y + 5, 3, 1, '#55585f'); } R(x, y, 19, 1, '#55585f'); R(x + 2, y - 3, 4, 3, '#2d6cdf'); R(x + 12, y - 3, 4, 3, CRIMSON); }
  function bin(x: number, y: number) { R(x, y, 5, 7, '#3f6f4a'); R(x - 1, y - 1, 7, 2, '#2a4a32'); R(x + 1, y + 2, 3, 1, '#9bc7a6'); }

  function student(x: number, y: number, jacket = CRIMSON, o: { skin?: string; hair?: string; pants?: string; bag?: string } = {}) {
    const skin = o.skin || '#f1c9a0', hair = o.hair || '#2b1d14';
    shadow(x + 2, y + 11, 4, 1.5, 0.28);
    R(x, y, 5, 3, hair); R(x + 1, y + 3, 3, 3, skin); R(x, y + 3, 1, 1, hair);
    R(x - 1, y + 6, 7, 6, jacket); R(x - 1, y + 6, 7, 1, 'rgba(255,255,255,.25)');
    if (jacket === CRIMSON) { R(x + 1, y + 8, 3, 1, '#fff'); R(x - 1, y + 6, 1, 6, '#f4efe2'); R(x + 5, y + 6, 1, 6, '#f4efe2'); }
    R(x, y + 12, 2, 4, o.pants || '#2c3550'); R(x + 3, y + 12, 2, 4, o.pants || '#2c3550');
    if (o.bag) R(x - 3, y + 7, 3, 6, o.bag);
  }

  function stoneGable(px: number, top: number, w: number, h: number) {
    for (let r = 0; r < h; r++) {
      const inset = (h - 1 - r) * (w / 2 / h);
      R(px + inset, top + r, w - inset * 2, 1, r % 5 === 4 ? STONE[2] : STONE[1]);
      R(px + inset - 1, top + r, 2, 1, '#3d4656'); R(px + w - inset - 1, top + r, 2, 1, '#2f3745');
    }
    for (let i = 0; i < w * h / 90; i++) R(px + w / 2 + (rnd() - 0.5) * w * 0.6, top + 6 + rnd() * (h - 8), 4, 2, STONE[0]);
  }
  function mound(cx: number, cy: number, rx: number, ry: number, seed: number) { shadow(cx + 2, cy + ry * 0.75, rx * 0.95, ry * 0.45, 0.28); blob(cx, cy, rx, ry, MOUND, seed, 3); }
  function pine(x: number, y: number, seed: number) {
    shadow(x + 2, y, 16, 4, 0.25);
    R(x, y - 26, 3, 26, '#7a4526'); R(x, y - 26, 1, 26, '#94593a'); R(x + 1, y - 34, 3, 10, '#7a4526');
    blob(x - 7, y - 28, 11, 5, PINE, seed, 4); blob(x + 9, y - 33, 10, 5, PINE, seed + 1, 4);
    blob(x + 1, y - 40, 13, 6, PINE, seed + 2, 4); blob(x - 4, y - 49, 9, 5, PINE, seed + 3, 4); blob(x + 6, y - 52, 7, 4, PINE, seed + 4, 3);
  }

  function libraryHall(x: number, w: number, base: number) {
    const WARM = '#b9b3a6', fh = 28, top = base - 3 * fh, cx = x + w / 2;
    shadow(cx, base + 3, w / 2 + 4, 3, 0.28);
    roof(x, top - 36, w, 36);
    for (const dx of [-52, 52]) { ashlar(cx + dx - 9, top - 22, 18, 22, WARM); gable(cx + dx - 9, top - 36, 18, 14); rect(cx + dx - 3, top - 15, 6, 8); }
    ashlar(x, top, w, base - top, WARM);
    for (let f = 0; f < 3; f++) R(x, top + f * fh, w, 2, STONE[0]);
    const cols = 8;
    for (let f = 0; f < 3; f++) for (let i = 0; i < cols; i++) {
      const wx = x + 8 + i * ((w - 20) / (cols - 1)), wy = top + f * fh + 8;
      if (Math.abs(wx + 4 - cx) < 24) continue;
      f === 2 ? arch(wx, wy + 8, 8, 12) : rect(wx - 1, wy + 3, 10, 13);
    }

    const bw = 46, bx = cx - bw / 2;
    ashlar(bx, top - 14, bw, base - top + 14, '#c3bdb0');
    stoneGable(bx - 2, top - 44, bw + 4, 30);
    R(bx - 2, top - 15, bw + 4, 3, STONE[0]);
    arch(cx - 5, top - 8, 10, 22);
    R(cx - 1, top - 30, 2, 8, '#d9dcde'); R(cx - 2, top - 33, 4, 3, '#d9dcde');
    rect(bx + 6, top + 14, 9, 12); rect(bx + bw - 15, top + 14, 9, 12);
    R(bx + 5, base - 34, bw - 10, 34, '#d9dcde'); R(bx + 9, base - 30, bw - 18, 30, '#5a3b25');
    for (let r = 0; r < 8; r++) { R(bx + 9 + r, base - 30 - 0, 1, 0, '#000'); }
    R(cx - 1, base - 30, 2, 30, '#3a2616'); R(bx + 5, base, bw - 10, 3, STONE[0]);
    R(bx + 12, base - 38, 3, 8, '#8a8f94'); R(bx + bw - 15, base - 38, 3, 8, '#8a8f94');
    for (const [ix, iy, p] of [[x + 10, base - 6, MAPLE], [x + w - 12, base - 5, CRIM], [x + 40, base - 4, GREEN]] as [number, number, string[]][]) ivy(ix, iy, p, ix * 3 + iy);
  }

  function castleHall(x: number, w: number, base: number) {
    const COOL = '#a9aeb3', fh = 30, top = base - 4 * fh, cx = x + w / 2;
    shadow(cx, base + 3, w / 2 + 4, 3, 0.28);
    ashlar(x + 10, top, w - 20, base - top, COOL);
    for (let f = 1; f < 4; f++) R(x + 10, top + f * fh, w - 20, 2, STONE[0]);
    R(x + 8, top - 4, w - 16, 6, STONE[0]); R(x + 8, top + 1, w - 16, 2, STONE[2]);
    for (let mx = x + 10; mx < x + w - 14; mx += 10) { R(mx, top - 11, 6, 8, STONE[0]); R(mx, top - 11, 6, 1, '#e6e9eb'); R(mx + 5, top - 11, 1, 8, STONE[2]); }
    const cols = 7;
    for (let f = 0; f < 3; f++) for (let i = 0; i < cols; i++) {
      const wx = x + 22 + i * ((w - 50) / (cols - 1)), wy = top + f * fh + 9;
      rect(wx, wy, 9, 14);
    }

    R(x + 10, base - 30, w - 20, 30, '#8f9499');
    for (let i = 0; i < 5; i++) { const ax = x + 16 + i * ((w - 40) / 4); arch(ax, base - 14, 14, 14, '#23303f'); }
    R(x + 10, base - 32, w - 20, 3, STONE[0]);

    for (const tx of [x, x + w - 22]) {
      ashlar(tx, top - 18, 22, base - top + 18, '#b3b8bd');
      R(tx, top - 18, 4, base - top + 18, STONE[0]); R(tx + 18, top - 18, 4, base - top + 18, STONE[2]);
      for (let r = 0; r < 26; r++) R(tx + 11 - r * 0.5 - 1, top - 44 + r, r * 1.0 + 4, 1, r % 4 === 3 ? '#2f3745' : '#3d4656');
      R(tx + 10, top - 52, 2, 9, '#6a6a70'); R(tx + 12, top - 52, 7, 4, CRIMSON);
      arch(tx + 7, top - 6, 8, 14); rect(tx + 6, top + 22, 10, 13); rect(tx + 6, top + 52, 10, 13);
    }
    for (const [ix, iy, p] of [[x + 40, base - 5, CRIM], [x + w - 44, base - 4, GREEN]] as [number, number, string[]][]) ivy(ix, iy, p, ix * 5 + iy);
  }

  function tigerEmblem(cx: number, cy: number) {
    const K = '#2a1408', O = '#f2ab2c', Y = '#ffd569', B = '#b8641a', Wt = '#f8f1e0', P = '#d9707a', E = '#fff3a0';
    const widths = [8, 14, 18, 20, 22, 22, 22, 22, 22, 22, 22, 20, 18, 14, 8];
    const top = cy - 9;
    const M = (dx: number, y: number, w: number, h: number, col: string) => { R(cx + dx, y, w, h, col); R(cx - dx - w + 1, y, w, h, col); };

    for (const sg of [-1, 1]) { const ex = cx + sg * 9; disc(ex, top + 1, 4, K); disc(ex, top + 1, 3, O); disc(ex, top + 2, 1, K); }

    widths.forEach((w, i) => { R(cx - w / 2 - 1, top + 1 + i, w + 2, 1, K); });
    widths.forEach((w, i) => { R(cx - w / 2, top + 1 + i, w, 1, i < 2 ? Y : O); });
    R(cx - 9, top + 2, 18, 1, Y);

    R(cx - 1, top + 2, 2, 7, K); R(cx - 3, top + 3, 6, 1, K); R(cx - 4, top + 5, 8, 1, K);
    M(6, top + 3, 2, 1, K); M(8, top + 5, 2, 1, K);

    for (const dy of [7, 9, 11]) M(8 + (dy === 11 ? 1 : 0), top + dy, 3, 1, K);

    M(3, top + 6, 5, 1, K); M(2, top + 7, 2, 1, K);
    M(3, top + 8, 4, 2, E); M(3, top + 8, 4, 1, K); M(5, top + 9, 1, 2, K);

    R(cx - 5, top + 10, 10, 5, Wt); R(cx - 2, top + 9, 4, 2, P); R(cx - 1, top + 11, 2, 1, K);
    R(cx, top + 11, 1, 2, K); M(1, top + 13, 3, 1, K);
    M(2, top + 14, 1, 2, Wt); R(cx - 3, top + 15, 6, 1, K);
    for (const dy of [11, 12]) M(5, top + dy, 1, 1, B);
  }
  function statue(cx: number, base: number) {

    R(cx - 11, base - 2, 22, 4, '#a9aeb2'); R(cx - 9, base - 22, 18, 21, '#cdd1d4'); R(cx + 4, base - 22, 5, 21, '#a9aeb2');
    R(cx - 10, base - 25, 20, 3, '#dfe2e4'); R(cx - 10, base - 23, 20, 1, '#8a9095'); R(cx - 4, base - 14, 8, 5, '#8a9095');

    const B = '#3b6b58', L = '#5f9a82', Dk = '#25483a', y0 = base - 25 - 36;
    shadow(cx + 2, base + 3, 14, 3, 0.3);
    R(cx - 4, y0, 8, 8, Dk); R(cx - 3, y0 + 1, 6, 7, L);
    R(cx - 3, y0, 6, 2, Dk);
    R(cx - 6, y0 + 9, 12, 18, B); R(cx - 6, y0 + 9, 3, 18, L); R(cx + 3, y0 + 9, 3, 18, Dk);
    R(cx - 8, y0 + 10, 3, 14, B); R(cx + 5, y0 + 10, 3, 14, Dk);
    R(cx - 4, y0 + 27, 4, 9, Dk); R(cx + 1, y0 + 27, 4, 9, B); R(cx - 5, y0 + 35, 5, 2, Dk); R(cx + 1, y0 + 35, 5, 2, Dk);
    R(cx - 1, y0 + 9, 2, 12, '#9ec8b4');
  }

  /* ---- Elementos do campus de ciências, do portão e da rua em frente (referências: fotos do campus, da estação Anam e do bairro) ---- */
  function bigLetters(str: string, x: number, y: number, s: number, col: string, shade: string) {
    let cx = x;
    for (const ch of str) {
      GLY[ch].forEach((row, j) => [...row].forEach((v, i) => {
        if (v === '1') {
          R(cx + i * s + s, y + j * s + s, s, s, shade);
        }
      }));
      GLY[ch].forEach((row, j) => [...row].forEach((v, i) => {
        if (v === '1') R(cx + i * s, y + j * s, s, s, col);
      }));
      cx += 6 * s;
    }
  }
  function scienceHall(x: number, w: number, base: number, drumLeft: boolean) {
    const fh = 20;
    const floors = 4;
    const top = base - floors * fh - 6;
    shadow(x + w / 2, base + 3, w / 2 + 4, 3, 0.28);
    R(x, top, w, base - top, '#bcc0c4');
    R(x, top, w, 3, '#e1e4e6');
    R(x, base - 3, w, 3, '#8f9499');
    for (let f = 0; f < floors; f++) {
      const wy = top + 8 + f * fh;
      R(x + 4, wy, w - 8, 11, '#5e8ea6');
      R(x + 4, wy, w - 8, 3, '#a5cbdc');
      R(x + 4, wy + 8, w - 8, 3, '#4a7890');
      for (let mx = x + 4; mx < x + w - 4; mx += 12) R(mx, wy, 1, 11, '#dfe3e6');
      R(x, wy + 12, w, 2, '#9ea3a8');
    }
    R(x + 4, top - 3, w - 8, 3, '#dfe3e6');
    for (let bx = x + 8; bx < x + w - 6; bx += 12) blob(bx, top - 7, 7, 5, GREEN, bx * 3 + base, 3);
    const dw = 26;
    const dx = drumLeft ? x - 6 : x + w - dw + 6;
    R(dx, top - 14, dw, base - top + 14, '#cfd5da');
    R(dx, top - 14, dw, 3, '#f0f2f4');
    R(dx + dw - 4, top - 14, 4, base - top + 14, '#a9b0b6');
    for (let f = 0; f < floors; f++) {
      R(dx + 3, top + 4 + f * fh, dw - 8, 11, '#6fa3b9');
      R(dx + 3, top + 4 + f * fh, dw - 8, 3, '#b1d3e2');
    }
    R(x + w / 2 - 12, base - 16, 24, 16, '#7fb0d0');
    R(x + w / 2 - 12, base - 16, 24, 3, '#bfdceb');
    R(x + w / 2 - 1, base - 16, 2, 16, '#dfe3e6');
    R(x + w / 2 - 15, base - 21, 30, 4, CRIMSON);
  }
  function glassPavilion(x: number, y: number, w: number) {
    shadow(x + w / 2, y + 4, w / 2, 4, 0.22);
    R(x, y - 4, w, 6, '#cfcabf');
    R(x, y - 4, w, 1, '#e8e2d2');
    for (let px = x + 4; px < x + w - 2; px += 14) R(px, y - 26, 2, 24, '#dfe3e6');
    R(x - 2, y - 32, w + 4, 8, '#8fc1d8');
    R(x - 2, y - 32, w + 4, 2, '#e8f4fa');
    for (let tx = x; tx < x + w; tx += 7) R(tx, y - 32, 1, 8, '#f2f6f8');
    R(x - 2, y - 24, w + 4, 2, '#7d8890');
  }
  function gateUnit(x: number, base: number, dir: number) {
    c.save();
    c.translate(x, 0);
    c.scale(dir, 1);
    const pier = (px: number, w: number, h: number) => {
      ashlar(px, base - h, w, h);
      R(px, base - h, 3, h, STONE[0]);
      R(px + w - 3, base - h, 3, h, STONE[2]);
      R(px + w / 2 - 1, base - h + 8, 2, h - 20, STONE[2]);
      for (let mx = px; mx < px + w - 2; mx += 8) {
        R(mx, base - h - 8, 6, 8, STONE[0]);
        R(mx, base - h - 8, 6, 1, '#e6e9eb');
        R(mx + 5, base - h - 8, 1, 8, STONE[2]);
      }
      R(px - 2, base - h - 1, w + 4, 3, STONE[0]);
      R(px - 2, base - 5, w + 4, 5, STONE[0]);
    };
    pier(0, 24, 76);
    pier(60, 18, 58);
    ashlar(24, base - 46, 36, 46);
    R(24, base - 48, 36, 3, STONE[0]);
    for (let mx = 24; mx < 58; mx += 8) { R(mx, base - 54, 6, 6, STONE[0]); R(mx + 5, base - 54, 1, 6, STONE[2]); }
    arch(36, base - 32, 12, 26, '#8aa3b4');
    R(78, base - 52, 6, 52, '#2f8f86');
    R(78, base - 52, 6, 3, '#1f6f68');
    for (let ly = base - 48; ly < base - 4; ly += 6) R(78, ly, 6, 1, '#1f6f68');
    R(80, base - 52, 1, 52, '#6cc2b8');
    c.restore();
  }
  function bushPot(x: number, y: number) {
    R(x - 5, y - 6, 11, 6, '#8a8f94');
    R(x - 5, y - 6, 11, 1, '#b5babe');
    blob(x, y - 11, 6, 6, MOUND, x * 5 + y, 3);
  }
  const SHOP_COLORS = ['#e6dccb', '#cfd8dc', '#e8d3c8', '#d6e0cf', '#e9e2c4', '#c9d4e3', '#e3cfd6'];
  const AWNING = [CRIMSON, '#2c5aa0', '#2f7d4f', '#d8802c', '#7a3f9d'];
  function shop(x: number, w: number, h: number, base: number, ci: number) {
    const top = base - h;
    shadow(x + w / 2, base + 2, w / 2, 2, 0.25);
    R(x, top, w, h, SHOP_COLORS[ci % SHOP_COLORS.length]);
    R(x, top, w, 2, '#f4f1ea');
    R(x, top + 2, w, 1, 'rgba(0,0,0,.12)');
    const floorsN = Math.max(2, Math.floor((h - 22) / 13));
    for (let f = 0; f < floorsN; f++) {
      const wy = top + 6 + f * 13;
      for (let wx = x + 5; wx < x + w - 8; wx += 11) {
        R(wx, wy, 7, 8, '#4f6a84');
        R(wx, wy, 7, 2, '#8fb0c8');
        R(wx - 1, wy + 8, 9, 1, '#cfc8bb');
      }
    }
    const awn = AWNING[ci % AWNING.length];
    R(x + 3, base - 14, w - 6, 12, '#2c3a4c');
    R(x + 4, base - 13, w - 8, 8, '#a8c9d8');
    R(x + 2, base - 19, w - 4, 5, awn);
    for (let sx = x + 2; sx < x + w - 2; sx += 6) R(sx, base - 19, 3, 5, '#f4f1ea');
    R(x + 4, base - 25, Math.min(w - 8, 30), 5, awn);
    for (let k = 0; k < 3; k++) R(x + 7 + k * 5, base - 24, 3, 3, '#fff');
    if (ci % 3 === 0) {
      R(x + w - 9, top - 14, 6, 17, awn);
      for (let k = 0; k < 3; k++) R(x + w - 8, top - 12 + k * 4, 4, 2, '#fff');
    }
  }
  function subwayEntrance(x: number, base: number) {
    shadow(x + 24, base + 2, 30, 3, 0.25);
    R(x, base - 22, 48, 22, '#9a958b');
    for (let i = 0; i < 6; i++) R(x + 5, base - 20 + i * 3, 38, 2, i % 2 ? '#6b675f' : '#80796e');
    R(x + 2, base - 24, 3, 24, '#26262c');
    R(x + 43, base - 24, 3, 24, '#26262c');
    R(x - 2, base - 38, 52, 5, '#3a3f48');
    R(x - 2, base - 38, 52, 1, '#6a727e');
    R(x + 4, base - 34, 2, 12, '#3a3f48');
    R(x + 42, base - 34, 2, 12, '#3a3f48');
    R(x + 52, base - 44, 6, 44, '#d9d4c7');
    disc(x + 55, base - 36, 6, '#c9792f');
    R(x + 53, base - 38, 5, 1, '#fff');
    R(x + 53, base - 35, 5, 1, '#fff');
    R(x + 53, base - 38, 1, 4, '#fff');
    R(x + 53, base - 34, 5, 1, '#fff');
    R(x + 57, base - 35, 1, 3, '#fff');
    R(x + 50, base - 19, 10, 8, '#c9792f');
    R(x + 52, base - 17, 6, 1, '#fff');
    R(x + 52, base - 15, 6, 1, '#fff');
  }
  function busStop(x: number, base: number) {
    shadow(x + 18, base + 2, 22, 3, 0.25);
    R(x, base - 26, 3, 26, '#3a3f48');
    R(x + 33, base - 26, 3, 26, '#3a3f48');
    R(x - 2, base - 30, 40, 5, '#4f5662');
    R(x + 3, base - 24, 30, 16, '#a8d0e0');
    R(x + 3, base - 24, 30, 2, '#e8f4fa');
    R(x + 6, base - 8, 24, 3, '#8a5a34');
    R(x + 42, base - 40, 2, 40, '#3a3f48');
    R(x + 38, base - 46, 10, 8, '#2c5aa0');
    R(x + 40, base - 44, 6, 3, '#fff');
    R(x + 40, base - 40, 6, 1, '#fff');
  }


  // Fila de desenho: objetos em pé são ordenados pela linha do chão (y). Os "dinâmicos" (árvores, bancos, mastros...)
  // viram sprites separados, desenhados em tempo real junto com pessoas e veículos; os demais são pintados na camada base.
  // Grade de caminhada (células de GC px de arte; 1 = dá para andar): começa tudo bloqueado, abrimos a praça e as calçadas
  // e vamos bloqueando cada objeto; portas e bancos são registrados à medida que aparecem.
  const GC = 4;
  const gcols = Math.ceil(LW / GC);
  const grows = Math.ceil(LH / GC);
  const walk = new Uint8Array(gcols * grows);
  const setCells = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    const cx0 = Math.max(0, Math.floor(x0 / GC));
    const cy0 = Math.max(0, Math.floor(y0 / GC));
    const cx1 = Math.min(gcols, Math.ceil(x1 / GC));
    const cy1 = Math.min(grows, Math.ceil(y1 / GC));
    for (let yy = cy0; yy < cy1; yy++) for (let xx = cx0; xx < cx1; xx++) walk[yy * gcols + xx] = v;
  };
  const openA = (x0: number, y0: number, x1: number, y1: number) => setCells(x0, y0, x1, y1, 1);
  const blk = (x0: number, y0: number, x1: number, y1: number) => setCells(x0, y0, x1, y1, 0);
  // Edifícios de verdade (não jardins): nenhuma árvore das laterais pode ter a copa por cima deles.
  const bldgs: number[][] = [];
  const bld = (x0: number, y0: number, x1: number, y1: number) => {
    bldgs.push([x0, y0, x1, y1]);
    blk(x0, y0, x1, y1);
  };
  const onBldg = (x: number, y: number, hw: number, h: number) => bldgs.some(([x0, y0, x1, y1]) => x + hw > x0 && x - hw < x1 && y > y0 && y - h < y1 - 6);
  const PINE_BOX: [number, number] = [15, 58];
  const treeBox = (sc: number): [number, number] => [16 * sc, 52 * sc];
  const doors: KuDoor[] = [];
  const benches: KuBench[] = [];
  const addDoor = (id: string, ax: number, ay: number) => void doors.push({ id, x: g.bx + ax * S, y: g.by + ay * S });
  const addBench = (ax: number, ay: number, w = 24) => {
    blk(ax - 1, ay - 5, ax + w + 1, ay + 7);
    benches.push({ x: g.bx + ax * S, y: g.by + ay * S, w: w * S });
  };

  type Block = [number, number, number, number] | null;
  type Dyn = { ax: number; w: number; h: number; block: Block };
  /** Bloqueio padrão: o tronco. Medidas relativas ao ponto (ax, y) do objeto. */
  const dyn = (ax: number, w = 72, h = 84, block: Block = [-3, -4, 3, 1]): Dyn => ({ ax, w, h, block });
  const sprites: KuSprite[] = [];
  const toSprite = (y: number, draw: () => void, d: Dyn, offX: number, offY: number): KuSprite => {
    const sc = document.createElement('canvas');
    sc.width = d.w;
    sc.height = d.h;
    const sctx = sc.getContext('2d')!;
    const bx = Math.round(d.ax + offX - d.w / 2);
    const by = Math.round(y + offY - (d.h - 12));
    sctx.translate(offX - bx, offY - by);
    const prev = c;
    c = sctx;
    draw();
    c = prev;
    // recorta a caixa útil do desenho
    const px = sctx.getImageData(0, 0, d.w, d.h).data;
    let x0 = d.w;
    let y0 = d.h;
    let x1 = -1;
    let y1 = -1;
    for (let yy = 0; yy < d.h; yy++) {
      for (let xx = 0; xx < d.w; xx++) {
        if (px[(yy * d.w + xx) * 4 + 3] > 0) {
          if (xx < x0) x0 = xx;
          if (xx > x1) x1 = xx;
          if (yy < y0) y0 = yy;
          if (yy > y1) y1 = yy;
        }
      }
    }
    const cw = Math.max(1, x1 - x0 + 1);
    const ch = Math.max(1, y1 - y0 + 1);
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d')!.drawImage(sc, x0, y0, cw, ch, 0, 0, cw, ch);
    return { canvas: out, x: g.bx + (bx + x0) * S, y: g.by + (by + y0) * S, depth: g.by + (y + offY) * S };
  };
  const makeQueue = (offX = 0, offY = 0) => {
    const items: { y: number; draw: () => void; d?: Dyn }[] = [];
    return {
      put: (y: number, draw: () => void, d?: Dyn) => {
        if (d && d.block) blk(d.ax + offX + d.block[0], y + offY + d.block[1], d.ax + offX + d.block[2], y + offY + d.block[3]);
        items.push({ y, draw, d });
      },
      flush: () => {
        items.sort((p, q) => p.y - q.y);
        for (const it of items) {
          if (it.d) sprites.push(toSprite(it.y, it.draw, it.d, offX, offY));
          else it.draw();
        }
        items.length = 0;
      },
    };
  };

  // ------------------------------------------------------------------ gramado e bosque
  for (let y = 0; y < sidewalkA; y++) R(0, y, LW, 1, Math.floor(y / 14) % 2 ? GRASS[0] : GRASS[1]);
  for (let i = 0; i < LW * 3; i++) R(rnd() * LW, rnd() * (sidewalkA - 4), 1, rnd() < 0.5 ? 2 : 1, rnd() < 0.5 ? GRASS[2] : GRASS[3]);
  R(0, 0, LW, 70, '#6d9a7f');
  for (let x = 0; x < LW; x += 2) R(x, 0, 2, 14 + Math.sin(x / 41) * 6 + Math.sin(x / 17) * 3, '#86b09a');
  for (let i = 0; i < LW * 0.6; i++) R(rnd() * LW, rnd() * 70, 2, 1, rnd() < 0.5 ? '#5b8a70' : '#7fa98f');
  let fs = 100;
  const MIX = [DEEP, GREEN, DEEP, GREEN, GREEN];
  for (const [y, step, r0, tint] of [[18, 10, 11, 0.5], [32, 11, 13, 0.25], [46, 12, 15, 0.08]]) {
    for (let x = -8; x < LW + 12; x += step + Math.floor(rnd() * 5)) {
      blob(x, y + rnd() * 5, r0 * (1.0 + rnd() * 0.25), r0 * 0.95, MIX[Math.floor(rnd() * MIX.length)], fs++, 9);
      if (tint > 0.1) {
        c.fillStyle = `rgba(130,170,150,${tint * 0.55})`;
        c.fillRect(x - r0, y - r0, r0 * 2, r0 * 2);
      }
    }
  }
  const frontXs: number[] = [];
  for (let x = -4; x < LW + 12; x += 15 + Math.floor(rnd() * 8)) frontXs.push(x);
  for (const x of frontXs) {
    R(x - 1, 56, 3, 14, '#4a3322');
    R(x - 1, 56, 1, 14, '#6a4a30');
    shadow(x + 2, 70, 7, 2, 0.3);
  }
  const frontTrees = frontXs.map((x) => {
    const q = rnd();
    return { x, y: 56 + rnd() * 4, rx: 13 + rnd() * 5, ry: 12 + rnd() * 3, col: q < 0.14 ? GINKGO : q < 0.22 ? MAPLE : null, pal: q < 0.6 ? GREEN : DEEP };
  });
  for (const t of frontTrees) if (!t.col) blob(t.x, t.y, t.rx, t.ry, t.pal, fs++, 9);
  for (const t of frontTrees) if (t.col) blob(t.x, t.y, t.rx, t.ry, t.col, fs++, 9);

  // ------------------------------------------------------------------ praça de pedra
  const PY0 = 270 + oy;
  for (let y = PY0; y < sidewalkA; y += 8) {
    for (let x = ((y - PY0) / 8 % 2) * 8 - 16; x < LW; x += 16) {
      const k = Math.floor(rnd() * 3);
      R(x, y, 15, 7, PAVE[k === 2 ? 1 : k]);
      R(x, y + 7, 16, 1, PAVE[2]);
      R(x + 15, y, 1, 8, PAVE[2]);
    }
  }
  R(0, PY0 - 2, LW, 2, STONE[2]);
  R(0, PY0, LW, 1, '#e8e2d2');
  R(0, PY0 + 5, LW, 2, CRIM[1]);
  R(0, PY0 + 7, LW, 1, '#e8e2d2');

  // canteiros de gramado com flores (ao lado do prédio, abaixo da fileira de edifícios)
  const parterre = (x: number, y: number, w: number, h: number, seed: number) => {
    blk(x - 3, y - 4, x + w + 3, y + h + 4);
    R(x - 2, y - 2, w + 4, h + 4, STONE[2]);
    R(x - 1, y - 1, w + 2, h + 2, STONE[0]);
    R(x, y, w, h, GRASS[1]);
    for (let i = 0; i < (w * h) / 12; i++) R(x + rnd() * w, y + rnd() * h, 1, 2, GRASS[3]);
    for (let fx = x + 6; fx < x + w - 4; fx += 7) for (let fy = y + 6; fy < y + h - 4; fy += 7) R(fx, fy, 2, 2, (((fx + fy) / 7) | 0) % 2 ? CRIM[0] : '#f6f0e0');
    hedge(x, y - 3, w, 6, GREEN, seed);
    hedge(x, y + h - 3, w, 6, GREEN, seed + 7);
  };
  parterre(xL - 206, PY0 + 18, 76, 36, 11);
  parterre(xL - 118, PY0 + 18, 76, 36, 13);
  parterre(xR + 42, PY0 + 18, 76, 36, 17);
  parterre(xR + 130, PY0 + 18, 76, 36, 19);

  // faixa de pedestres no eixo central
  const sY0 = (g.streetY0 - g.by) / S;
  const sY1 = (g.streetY1 - g.by) / S;
  for (let y = sY0 + 1; y < sY1 - 1; y += 4) R(cxA - 16, y, 32, 2, '#f1ede0');
  const southA = (g.southStripY - g.by) / S;
  openA(0, HB + oy + 3, LW, sY0); // jardim da frente, praça e calçada norte
  openA(0, sY1, LW, southA); // calçada sul
  openA(cxA - 16, sY0 - 1, cxA + 16, sY1 + 1); // faixa de pedestres
  blk(xL - 2, yT, xR + 2, sidewalkA + 2); // o prédio e seus jardins

  // folhas caídas (no chão, antes dos objetos em pé)
  for (let i = 0; i < LW * 0.28; i++) {
    const x = rnd() * LW;
    const y = 90 + rnd() * (sidewalkA - 90);
    if (x > xL && x < xR && y > yT) continue;
    R(x, y, 2, 1, rnd() < 0.5 ? '#e0b72d' : rnd() < 0.5 ? '#bf3b2a' : '#c23a58');
  }

  // ------------------------------------------------------------------ fileira de edifícios (centro em cxA)
  c.save();
  c.translate(ox, oy);
  const north = makeQueue(ox, oy);
  const MX = 400;
  const MY = 308;
  blk(0, 0, LW, HB + oy + 3); // bosque e fileira de edifícios
  blk(MX - 13 + ox, MY - 21 + oy, MX + 15 + ox, MY + 4 + oy); // o tigre da medalha
  addDoor('hall-l', 400 - 15 + ox, HB + oy + 6);
  addDoor('hall-r', 400 + 15 + ox, HB + oy + 6);
  R(381, 240, 38, 30, '#d8d1c0');
  for (let y = 240; y < 270; y += 4) R(381, y, 38, 1, '#bdb6a5');
  R(379, 240, 2, 30, STONE[2]);
  R(419, 240, 2, 30, STONE[2]);
  disc(MX, MY, 33, '#a9a398');
  disc(MX, MY, 31, '#e3ddcf');
  disc(MX, MY, 27, CRIMSON);
  disc(MX, MY, 24, '#e3ddcf');
  for (let a2 = 0; a2 < 360; a2 += 30) {
    const r = (a2 * Math.PI) / 180;
    R(MX + Math.cos(r) * 29 - 1, MY + Math.sin(r) * 29 - 1, 3, 3, '#e3ddcf');
  }
  disc(MX, MY, 17, '#b6b0a4');
  disc(MX, MY, 15, '#8d8a80');
  disc(MX, MY, 13, '#a9a69c');
  shadow(MX + 2, MY + 3, 14, 4, 0.3);
  tiger(MX - 13, MY - 21);
  R(MX - 6, MY + 1, 14, 3, CRIMSON);

  shadow(400, HB + 3, 250, 4, 0.28);
  // edifícios laterais da fileira: biblioteca à esquerda, castelo à direita, e mais, se a faixa for larga
  const sideKinds: ((x: number) => void)[] = [
    (x) => libraryHall(x, 154, HB),
    (x) => gothicHall(x, 154, HB, 3, { door: true, spire: true }),
    (x) => gothicHall(x, 156, HB, 3, { door: true, gable: x + 68 }),
  ];
  let leftEdge = 14 + ox;
  for (let i = 0, lx = 14; lx + ox >= 0 && i < 6; i++, lx -= 158) {
    sideKinds[i % 3](lx);
    leftEdge = lx + ox;
    addDoor(`row-l${i}`, lx + ox + (i % 3 === 2 ? 90 : 77), HB + oy + 6);
  }
  const rightKinds: ((x: number) => void)[] = [
    (x) => castleHall(x, 156, HB),
    (x) => gothicHall(x, 156, HB, 3, { door: true, gable: x + 68 }),
    (x) => gothicHall(x, 154, HB, 3, { door: true, spire: true }),
  ];
  let rightEdge = 632 + ox + 156;
  for (let i = 0, rx = 632; rx + 156 + ox <= LW && i < 6; i++, rx += 160) {
    rightKinds[i % 3](rx);
    rightEdge = rx + 156 + ox;
    addDoor(`row-r${i}`, rx + ox + (i % 3 === 0 ? 78 : i % 3 === 1 ? 90 : 77), HB + oy + 6);
  }

  for (const wx of [200, 444]) {
    const WW = 156;
    roof(wx, 148, WW, 34);
    for (let i = 0; i < 5; i++) dormer(wx + 16 + i * 31, 160);
    ashlar(wx, 182, WW, HB - 182);
    R(wx, 182, WW, 2, STONE[0]);
    R(wx, 208, WW, 2, STONE[0]);
    for (let i = 0; i < 9; i++) rect(wx + 6 + i * 16, 192, 9, 11);
    for (let i = 0; i < 9; i++) {
      if (i % 2 === 0) arch(wx + 7 + i * 16, 220, 8, 11);
      else rect(wx + 6 + i * 16, 216, 9, 13);
    }
  }
  for (const px of [172, 578]) {
    ashlar(px, 160, 50, HB - 160);
    stoneGable(px, 126, 50, 34);
    R(px - 2, 158, 54, 3, STONE[0]);
    R(px, 205, 50, 2, STONE[0]);
    rect(px + 20, 140, 10, 9);
    rect(px + 9, 172, 11, 12);
    rect(px + 30, 172, 11, 12);
    rect(px + 9, 190, 11, 12);
    rect(px + 30, 190, 11, 12);
    arch(px + 10, 222, 9, 11);
    arch(px + 31, 222, 9, 11);
    R(px, 160, 4, HB - 160, STONE[0]);
    R(px + 46, 160, 4, HB - 160, STONE[2]);
  }
  // torre central, baixa e larga, com ameias, duas hastes e o grande estandarte carmesim
  const TW = 88;
  const TX = 400 - TW / 2;
  ashlar(TX, 112, TW, HB - 112);
  R(TX, 112, 9, HB - 112, STONE[0]);
  R(TX + TW - 9, 112, 9, HB - 112, STONE[2]);
  R(TX + 9, 112, 1, HB - 112, STONE[2]);
  R(TX + TW - 10, 112, 1, HB - 112, STONE[0]);
  R(TX - 3, 102, TW + 6, 11, STONE[0]);
  R(TX - 3, 111, TW + 6, 2, STONE[2]);
  for (let x = TX - 3; x < TX + TW + 3; x += 11) {
    R(x, 94, 7, 9, STONE[0]);
    R(x, 94, 7, 1, '#e6e9eb');
    R(x + 6, 94, 1, 9, STONE[2]);
  }
  R(TX, 118, TW, 2, STONE[0]);
  R(TX + 18, 58, 2, 40, '#e8e8ea');
  R(TX + 66, 58, 2, 40, '#e8e8ea');
  R(TX + 68, 60, 11, 7, '#c9272f');
  R(TX + 68, 60, 11, 1, '#e5555c');
  R(TX + 20, 60, 8, 5, '#f4f4f6');
  R(TX + 31, HB - 32, 26, 32, '#d9dcde');
  R(TX + 34, HB - 29, 20, 29, '#4a3322');
  R(TX + 43, HB - 29, 2, 29, '#2e1f14');
  for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2]]) {
    R(TX + 34 + dx, HB - 29 + dy, 1, 1, '#d9dcde');
    R(TX + 53 - dx, HB - 29 + dy, 1, 1, '#d9dcde');
  }
  const BX = TX + 21;
  const BW = 46;
  const BT = 122;
  const BB = 214;
  R(BX - 1, BT - 2, BW + 2, 3, '#4a4a52');
  R(BX, BT, BW, BB - BT, CRIMSON);
  R(BX, BT, 3, BB - BT, CRIM[0]);
  R(BX + BW - 3, BT, 3, BB - BT, CRIM[2]);
  for (const fx of [12, 24, 36]) R(BX + fx, BT + 2, 1, BB - BT - 4, CRIM[1]);
  R(BX, BB - 4, BW, 4, CRIM[2]);
  for (let x = BX; x < BX + BW; x += 3) R(x, BB, 1, 2, CRIM[2]);
  tigerEmblem(BX + BW / 2, BT + 12);
  for (const [x, y, p] of [[207, 228, CRIM], [326, 232, GREEN], [470, 230, CRIM], [598, 226, GREEN]] as [number, number, string[]][]) ivy(x, y, p, x * 7 + y);

  // jardim em frente: estátua, arbustos redondos, pinheiros, árvores, mastros e estudantes (do fundo para a frente)
  north.put(HB + 16, () => statue(400, HB + 14), dyn(400, 60, 100, [-11, -27, 11, 1]));
  for (const side of [0, 1]) {
    const m = (x: number) => (side ? 800 - x : x);
    for (const [x, yy, rx, ry, sd] of [[198, 251, 14, 9, 11], [232, 250, 15, 9, 12], [266, 251, 15, 9, 13], [300, 250, 14, 9, 14], [336, 251, 14, 9, 15], [216, 264, 17, 10, 16], [254, 265, 17, 10, 17], [292, 264, 17, 10, 18], [332, 265, 16, 10, 19]]) {
      north.put(yy + ry, () => mound(m(x), yy, rx, ry, sd + side * 40), dyn(m(x), 60, 40, [-(rx - 2), -(2 * ry - 2), rx - 2, -1]));
    }
  }
  for (const [x, y, pal, s, seed] of [[150, 258, GINKGO, 0.9, 301], [650, 258, GINKGO, 0.9, 311], [100, 262, MAPLE, 0.85, 305], [700, 262, MAPLE, 0.85, 317]] as [number, number, string[], number, number][]) {
    north.put(y, () => tree(x, y, pal, s, seed), dyn(x));
  }
  for (const fx of [262, 538]) {
    north.put(346, () => {
      R(fx, 294, 2, 52, '#6a6a70');
      R(fx + 2, 296, 24, 14, CRIMSON);
      R(fx + 2, 296, 24, 2, CRIM[0]);
      R(fx + 2, 308, 24, 2, CRIM[2]);
      letters('KU', fx + 8, 299, '#fff');
      R(fx - 3, 344, 8, 3, STONE[1]);
    }, dyn(fx + 12, 56, 84, [-13, -3, -9, 1]));
  }
  north.flush();
  c.restore();

  // ------------------------------------------------------------------ praça: edifícios laterais, árvores e bancos
  const side = makeQueue();
  const baseSide = sidewalkA - 100;
  const lx0 = xL - 54 - 142;
  const rx0 = xR + 54;
  // campus de ciências: edifícios de vidro e concreto nas pontas da fileira de edifícios
  if (leftEdge - 120 >= 0) {
    side.put(HB + oy, () => scienceHall(leftEdge - 120, 114, HB + oy, false));
    addDoor('sci-row-l', leftEdge - 120 + 57, HB + oy + 6);
  }
  if (rightEdge + 120 <= LW) {
    side.put(HB + oy, () => scienceHall(rightEdge + 6, 114, HB + oy, true));
    addDoor('sci-row-r', rightEdge + 6 + 57, HB + oy + 6);
  }
  if (lx0 >= 0) {
    side.put(baseSide, () => gothicHall(lx0, 142, baseSide, 4, { door: true, gable: lx0 + 48 }));
    bld(lx0 - 2, baseSide - 170, lx0 + 144, baseSide + 3);
    addDoor('bld-l', lx0 + 70, baseSide + 6);
  }
  if (rx0 + 142 <= LW) {
    bld(rx0 - 2, baseSide - 184, rx0 + 144, baseSide + 3);
    addDoor('bld-r', rx0 + 71, baseSide + 6);
    side.put(baseSide, () => {
      gothicHall(rx0, 142, baseSide, 4, { door: true, gable: rx0 + 49, spire: true, spireRight: true });
      for (const bx of [rx0 + 34, rx0 + 96]) {
        R(bx, baseSide - 66, 8, 30, CRIMSON);
        R(bx, baseSide - 38, 8, 2, CRIM[2]);
        R(bx + 1, baseSide - 58, 6, 1, '#fff');
        R(bx + 1, baseSide - 55, 6, 1, '#fff');
      }
    });
  }
  // blocos do campus de ciências nos cantos de fora: edifício, gramado com o letreiro "KU" e pavilhão de vidro (como o Hana Square)
  const sciW = 112;
  if (lx0 - 8 >= sciW) {
    bld(2, baseSide + 2 - 100, sciW + 16, baseSide + 5);
    blk(4, baseSide + 12, sciW + 12, baseSide + 48);
    addDoor('sci-l', 8 + 56, baseSide + 10);
    side.put(baseSide + 2, () => scienceHall(8, sciW, baseSide + 2, false));
    side.put(baseSide + 40, () => {
      R(6, baseSide + 6, sciW + 4, 40, STONE[2]);
      R(8, baseSide + 8, sciW, 36, GRASS[1]);
      for (let i = 0; i < 70; i++) R(8 + rnd() * sciW, baseSide + 8 + rnd() * 36, 1, 2, GRASS[3]);
      hedge(8, baseSide + 6, sciW, 6, GREEN, 301);
      bigLetters('KU', 8 + sciW / 2 - 22, baseSide + 14, 4, '#f4f4f6', '#8f969c');
    });
  }
  const sciRX = LW - 8 - sciW;
  if (rx0 + 142 + 8 + sciW <= LW) {
    bld(sciRX - 8, baseSide + 4 - 100, LW - 2, baseSide + 7);
    blk(sciRX + 6, baseSide + 12, sciRX + sciW - 4, baseSide + 46);
    addDoor('sci-r', sciRX + 56, baseSide + 10);
    side.put(baseSide + 4, () => scienceHall(sciRX, sciW, baseSide + 4, true));
    side.put(baseSide + 46, () => glassPavilion(sciRX + 8, baseSide + 40, sciW - 16));
  }
  // bosques de pinheiros, ginkgos e bordos nas laterais da praça
  const grove = (gx0: number, gx1: number, gy0: number, gy1: number, n: number, seedBase: number) => {
    for (let i = 0; i < n; i++) {
      let gx = gx0 + rnd() * (gx1 - gx0);
      let gy = gy0 + rnd() * (gy1 - gy0);
      const kind = rnd();
      const sc = 0.85 + rnd() * 0.25;
      const [hw, h] = kind < 0.38 ? PINE_BOX : treeBox(sc);
      for (let k = 0; k < 12 && onBldg(gx, gy, hw, h); k++) {
        gx = gx0 + rnd() * (gx1 - gx0);
        gy = gy0 + rnd() * (gy1 - gy0);
      }
      if (onBldg(gx, gy, hw, h)) continue;
      if (kind < 0.38) side.put(gy, () => pine(gx, gy, seedBase + i), dyn(gx, 60, 84));
      else side.put(gy, () => tree(gx, gy, kind < 0.62 ? GINKGO : kind < 0.85 ? MAPLE : GREEN, sc, seedBase + i), dyn(gx));
    }
  };
  grove(6, 100, PY0 + 24, baseSide - 70, 11, 700);
  grove(LW - 100, LW - 6, PY0 + 24, baseSide - 70, 11, 800);
  // árvores ao lado do prédio; o banco fica atrás da copa (y menor)
  for (const [x, y, pal, s, seed] of [[xL - 21, yT + 54, GINKGO, 1.0, 421], [xR + 22, yT + 54, GINKGO, 1.0, 423], [xL - 93, yT + 70, MAPLE, 0.95, 425], [xR + 94, yT + 70, MAPLE, 0.95, 427]] as [number, number, string[], number, number][]) {
    if (onBldg(x, y, ...treeBox(s))) continue;
    side.put(y, () => tree(x, y, pal, s, seed), dyn(x));
  }
  addBench(xL - 49, yT + 16);
  addBench(xR + 26, yT + 16);
  side.put(yT + 23, () => bench(xL - 49, yT + 16), dyn(xL - 37, 40, 24, null));
  side.put(yT + 23, () => bench(xR + 26, yT + 16), dyn(xR + 38, 40, 24, null));
  side.put(yT - 13, () => bin(xL - 7, yT - 20), dyn(xL - 4, 20, 20, [-3, -8, 4, 1]));
  side.put(yT - 13, () => bin(xR + 4, yT - 20), dyn(xR + 7, 20, 20, [-3, -8, 4, 1]));
  side.put(baseSide + 20, () => bikeRack(xL - 29, baseSide + 14), dyn(xL - 19, 32, 20, [-11, -9, 11, 1]));
  side.put(baseSide + 26, () => bikeRack(xR + 16, baseSide + 20), dyn(xR + 26, 32, 20, [-11, -9, 11, 1]));
  // canto de fora dos edifícios laterais: pinheiros
  if (!onBldg(22, baseSide + 4, ...PINE_BOX)) side.put(baseSide + 4, () => pine(22, baseSide + 4, 91), dyn(22, 60, 84));
  if (!onBldg(LW - 22, baseSide + 10, ...PINE_BOX)) side.put(baseSide + 10, () => pine(LW - 22, baseSide + 10, 93), dyn(LW - 22, 60, 84));
  // aleia de ginkgos e bordo ao longo da calçada, com bancos atrás dos troncos
  const lowY = sidewalkA - 20;
  const lowXs: number[] = [];
  for (let x = 24; x < xL - 24; x += 50) lowXs.push(x);
  for (let x = xR + 40; x < LW - 20; x += 50) lowXs.push(x);
  lowXs.forEach((x, i) => {
    if ((x >= xL - 160 && x <= xL - 4) || (x >= xR + 4 && x <= xR + 160) || x < 130 || x > sciRX - 8) return;
    if (onBldg(x, lowY, ...treeBox(0.95))) return;
    side.put(lowY, () => tree(x, lowY, i % 3 === 0 ? MAPLE : GINKGO, 0.95, 500 + i), dyn(x));
    if (i % 2 === 0) {
      addBench(x - 12, lowY - 12);
      side.put(lowY - 5, () => bench(x - 12, lowY - 12), dyn(x, 40, 24, null));
    }
  });
  // portão principal: dois conjuntos de pilares de pedra com portões de ferro verde-azulados, emoldurando o caminho até o prédio
  const gateY = sidewalkA - 6;
  side.put(gateY, () => gateUnit(xL - 150, gateY, 1));
  side.put(gateY, () => gateUnit(xR + 150, gateY, -1));
  bld(xL - 152, gateY - 86, xL - 150 + 86, gateY + 1);
  bld(xR + 150 - 86, gateY - 86, xR + 152, gateY + 1);
  for (const x of [xL - 40, xL - 28, xR + 28, xR + 40]) side.put(sidewalkA - 14, () => bushPot(x, sidewalkA - 14), dyn(x, 24, 30, [-6, -8, 6, 1]));
  side.put(sidewalkA - 2, () => {
    hedge(0, sidewalkA - 12, xL - 68, 9, GREEN, 61);
    hedge(xR + 68, sidewalkA - 12, LW - xR - 68, 9, GREEN, 63);
  });
  // a cerca viva deixa uma passagem de cada lado do prédio, entre o portão e a fachada
  blk(0, sidewalkA - 12, xL - 68, sidewalkA - 2);
  blk(xR + 68, sidewalkA - 12, LW, sidewalkA - 2);
  for (const x of [xL - 210, xL - 14, xR + 14, xR + 210]) {
    blk(x - 1, sidewalkA - 16, x + 3, sidewalkA - 13);
    side.put(sidewalkA - 14, () => lamp(x, sidewalkA - 14));
  }
  // ------------------------------------------------------------------ rua em frente: lojas, estação (linha 6) e ponto de ônibus
  for (let y = southA; y < LH; y += 8) {
    for (let x = (((y - southA) / 8) % 2) * 8 - 16; x < LW; x += 16) {
      const k = Math.floor(rnd() * 3);
      R(x, y, 15, 7, PAVE[k === 2 ? 1 : k]);
      R(x, y + 7, 16, 1, PAVE[2]);
      R(x + 15, y, 1, 8, PAVE[2]);
    }
  }
  R(0, southA, LW, 2, STONE[2]);
  const shopBase = LH - 8;
  const stationX = Math.round(cxA + 190);
  const busX = Math.round(cxA - 230);
  let sx2 = -4;
  let si = 0;
  while (sx2 < LW) {
    const sw = 44 + Math.floor(rnd() * 28);
    const sh = 44 + Math.floor(rnd() * 26);
    const idx = si++;
    const hitsStation = sx2 + sw > stationX - 6 && sx2 < stationX + 66;
    const hitsBus = sx2 + sw > busX - 6 && sx2 < busX + 52;
    if (!hitsStation && !hitsBus) {
      const x0s = sx2;
      side.put(southA + 8, () => shop(x0s, sw, sh, shopBase, idx));
    }
    sx2 += sw + 2;
  }
  openA(stationX - 2, southA, stationX + 60, shopBase - 12); // a boca da estação fica acessível
  addDoor('station', stationX + 24, shopBase - 14);
  side.put(southA + 10, () => subwayEntrance(stationX, shopBase));
  side.put(southA + 10, () => busStop(busX, shopBase));
  let ti = 0;
  for (let x = 30; x < LW - 10; x += 70 + Math.floor(rnd() * 20), ti++) {
    const ty = LH - 4;
    const pal = [GINKGO, GINKGO, MAPLE, GINKGO][ti % 4];
    if ((x > stationX - 14 && x < stationX + 74) || (x > busX - 14 && x < busX + 56)) continue;
    side.put(ty, () => tree(x, ty, pal, 0.78, 600 + ti), dyn(x));
  }
  side.put(LH, () => hedge(0, LH - 9, LW, 8, GREEN, 81));
  side.flush();

  // O prédio e a faixa até a calçada ficam transparentes: salas, jardins e cercas vivas vêm da camada base.
  c.clearRect(xL, yT, xR - xL, sidewalkA - yT);

  // ------------------------------------------------------------------ mapa de caminhada (px de mundo)
  const WX = (a: number) => g.bx + a * S;
  const WY = (a: number) => g.by + a * S;
  const open = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < gcols && cy < grows && walk[cy * gcols + cx] === 1;
  const roomy = (cx: number, cy: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!open(cx + dx, cy + dy)) return false;
    return true;
  };
  // pontos para passear: células livres com folga em volta, sorteadas
  const cand: { x: number; y: number }[] = [];
  for (let cy = 0; cy < grows; cy += 3) {
    for (let cx = 0; cx < gcols; cx += 3) {
      if (roomy(cx, cy)) cand.push({ x: g.bx + (cx + 0.5) * GC * S, y: g.by + (cy + 0.5) * GC * S });
    }
  }
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  const pois: Pt[] = cand.slice(0, 160);
  // entradas e saídas nas bordas do mundo (praça, fachada, calçada norte, calçada sul)
  const portals: Pt[] = [];
  for (const ay of [PY0 + 14, yT - 6, sidewalkA + 8, sY1 + 8]) {
    for (const ax of [3, LW - 3]) {
      if (open(Math.floor(ax / GC), Math.floor(ay / GC))) portals.push({ x: WX(ax), y: WY(ay) });
    }
  }
  const map: KuMap = {
    cell: GC * S,
    ox: g.bx,
    oy: g.by,
    cols: gcols,
    rows: grows,
    walk,
    doors,
    benches,
    crossing: { x0: WX(cxA - 16), x1: WX(cxA + 16), y0: g.streetY0, y1: g.streetY1 },
    busStop: { x: WX(busX + 18), y: WY(sY1 + 8) },
    portals,
    pois,
  };
  return { lo, sprites, map };
}
