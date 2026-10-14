// Móveis e itens de parede da edição KU: o que aparece nas fotos do prédio (laboratório de pós-graduação, corredor, lounge
// "Open Library" e o hall da entrada): extintor, cabideiro, DEA e caixa de emergência, banner, quiosque de PC, guarda-corpo
// de vidro fosco com o escudo do tigre, divisórias pretas perfuradas, mesa de reunião escura, vitrine de troféus e o quadro
// dos tigres. Coordenadas de desenho como em office.ts (footprint 0,0 no canto superior esquerdo; base em y = h*TILE).
import { ramp, shade } from '../core/color';
import type { PixelBuf } from '../core/pixbuf';
import { floorSheet, rectAt, wallSheet, type BufFurniture } from '../core/sprite';
import { contact, frontFace, glass, rngOf, topFace, woodGrain, M } from './kit';

const MAROON = ramp('#7a2236', 0.06);
const TIGER = '#d98a3a';
const TIGER_DARK = '#7a4a1f';

/** Escudo do tigre (bem pequeno): losango vinho com contorno claro e uma mancha laranja. */
function shield(b: PixelBuf, x: number, y: number, w: number, h: number, ink = '#f2eee6'): void {
  b.rect(x, y, w, h, ink);
  b.rect(x + 1, y + 1, w - 2, h - 3, MAROON.base);
  b.hline(x + 1, x + w - 2, y + h - 2, MAROON.dk);
  b.set(x + Math.floor(w / 2), y + h - 1, ink);
  const cx = x + Math.floor(w / 2);
  b.rect(cx - 1, y + 2, 3, 2, TIGER);
  b.hline(cx - 1, cx + 1, y + 4, TIGER_DARK);
}

// ------------------------------------------------------------------ corredor, hall e laboratório

export function fireExtinguisher(): BufFurniture {
  const s = floorSheet(1, 1, 4);
  const b = s.buf;
  b.rect(5, 4, 6, 11, '#c9302c');
  b.vline(5, 5, 13, '#e0554f');
  b.vline(10, 5, 14, '#8f1f1c');
  b.hline(6, 9, 3, '#c9302c');
  b.rect(7, 1, 2, 2, '#2a2d35');
  b.hline(6, 10, 1, '#2a2d35');
  b.vline(11, 2, 8, '#2a2d35');
  b.rect(6, 7, 4, 3, '#f4f1ea');
  b.hline(6, 9, 8, '#c9302c');
  b.outline();
  contact(b, 3, 13, 10, 3, 0.25);
  return { base: s };
}

export function coatRack(): BufFurniture {
  const s = floorSheet(1, 1, 26);
  const b = s.buf;
  const steel = '#9aa3af';
  b.vline(8, -22, 13, steel);
  b.vline(9, -22, 13, '#6f7783');
  b.hline(2, 14, 13, steel);
  b.hline(4, 12, 14, '#6f7783');
  // ganchos
  b.hline(3, 13, -21, steel);
  b.set(3, -20, steel);
  b.set(13, -20, steel);
  // jaqueta bege
  b.rect(3, -20, 6, 13, '#cdb08a');
  b.rect(2, -19, 2, 9, '#bf9f77');
  b.hline(4, 8, -20, '#dfc6a2');
  b.vline(8, -19, -8, '#ab8c66');
  // moletom cinza
  b.rect(9, -18, 5, 11, '#a7adb7');
  b.rect(13, -17, 2, 8, '#979eaa');
  b.hline(10, 13, -18, '#c3c8d0');
  b.vline(9, -17, -8, '#8d94a0');
  // mochila preta pendurada mais embaixo
  b.rect(4, -5, 5, 9, '#2c2f37');
  b.hline(5, 7, -6, '#2c2f37');
  b.hline(5, 8, -2, '#454953');
  b.set(6, 1, '#454953');
  // guarda-chuva rosa
  b.vline(12, -4, 3, '#2b2d34');
  b.hline(12, 13, -5, '#e47aa8');
  b.set(13, -4, '#e47aa8');
  b.rect(11, 3, 2, 4, '#f08fb4');
  b.outline();
  contact(b, 1, 13, 14, 3, 0.22);
  return { base: s };
}

export function aedBox(): BufFurniture {
  const s = floorSheet(1, 1, 18);
  const b = s.buf;
  const g = ramp('#7ccf4e', 0.06);
  frontFace(b, 2, -17, 12, 31, g);
  topFace(b, 2, -18, 12, 2, g);
  b.vline(2, -17, 13, g.lt);
  // cabeçalho branco com coração e raio
  b.rect(3, -15, 10, 7, '#f6f9f4');
  b.rect(5, -14, 2, 2, '#2fa05a');
  b.rect(8, -14, 2, 2, '#2fa05a');
  b.rect(5, -12, 5, 2, '#2fa05a');
  b.hline(6, 8, -10, '#2fa05a');
  b.set(7, -9, '#2fa05a');
  b.set(8, -12, '#f6f9f4');
  // janela com o aparelho preto
  b.rect(3, -7, 10, 11, '#dfe9e2');
  b.rect(5, -6, 6, 8, '#2a2d35');
  b.rect(6, -3, 4, 3, '#3a3f4b');
  b.set(8, -5, '#7be08a');
  glass(b, 3, -7, 10, 11, { alpha: 0.2 });
  // painel de instruções
  b.rect(3, 5, 10, 8, '#f6f9f4');
  for (let i = 0; i < 3; i++) b.hline(4, 11, 6 + i * 2, '#9aa4a0');
  b.hline(3, 12, 14, g.dd);
  b.outline();
  contact(b, 1, 13, 14, 3, 0.26);
  return { base: s };
}

export function emergencyBox(): BufFurniture {
  const s = floorSheet(1, 1, 20);
  const b = s.buf;
  const y = ramp('#f2b81f', 0.06);
  frontFace(b, 1, -19, 14, 33, y);
  topFace(b, 1, -20, 14, 2, y);
  b.vline(1, -19, 13, y.lt);
  // faixa vermelha do cabeçalho
  b.rect(2, -18, 12, 4, '#cf3a2f');
  b.hline(4, 11, -17, '#fbe9e6');
  b.hline(5, 10, -15, '#fbe9e6');
  // prateleiras vistas pelo vidro
  b.rect(3, -13, 10, 24, '#fdf3cf');
  for (const [py, c] of [[-12, '#d9d4c8'], [-4, '#c9b88a'], [4, '#e8e4da']] as const) {
    b.rect(4, py, 8, 5, c);
    b.hline(3, 12, py + 6, y.dk);
  }
  b.set(6, -10, '#cf3a2f');
  b.set(9, -10, '#3f7fd8');
  // cruz verde
  b.ellipse(8, 7, 3, 3, '#4cae6a');
  b.hline(6, 10, 7, '#f4f9f2');
  b.vline(8, 5, 9, '#f4f9f2');
  glass(b, 3, -13, 10, 24, { alpha: 0.16 });
  b.outline();
  contact(b, 0, 13, 16, 3, 0.26);
  // faixa de segurança no chão (amarelo e preto)
  for (let x = 0; x < 16; x += 4) {
    b.hline(x, x + 1, 14, '#f2b81f');
    b.hline(x + 2, x + 3, 14, '#2a2d35');
  }
  return { base: s };
}

export function bannerStand(): BufFurniture {
  const s = floorSheet(1, 1, 18);
  const b = s.buf;
  b.hline(3, 12, 14, '#8e96a1');
  b.hline(4, 11, 15, '#5f6671');
  b.vline(4, -16, 13, '#b9c0ca');
  b.vline(11, -16, 13, '#b9c0ca');
  b.hline(4, 11, -17, '#d3d8de');
  // banner vinho com o escudo e linhas de texto
  b.rect(5, -16, 6, 29, MAROON.base);
  b.vline(5, -16, 12, MAROON.lt);
  b.vline(10, -16, 12, MAROON.dk);
  shield(b, 6, -13, 4, 6);
  for (const [py, w] of [[-5, 4], [-3, 3], [-1, 4], [3, 4], [5, 3]] as const) b.hline(6, 6 + w - 1, py, '#f2eee6');
  b.rect(6, 8, 4, 3, '#f2c14e');
  b.hline(5, 10, 13, MAROON.dd);
  b.outline();
  contact(b, 2, 13, 12, 3, 0.2);
  return { base: s };
}

export function pcKiosk(): BufFurniture {
  const s = floorSheet(1, 1, 22);
  const b = s.buf;
  const wood = ramp('#e0c08f', 0.05);
  const frame = ramp('#aeb4bd', 0.06);
  // corpo: armário de madeira clara com moldura cinza arredondada
  frontFace(b, 1, -3, 14, 17, wood);
  b.vline(1, -3, 13, frame.lt);
  b.vline(14, -3, 13, frame.dk);
  b.hline(1, 14, 13, frame.dd);
  woodGrain(b, 3, -1, 10, 12, wood, 3, true);
  // tampo de apoio com o teclado
  topFace(b, 0, -6, 16, 4, ramp('#e6e8eb', 0.04));
  b.rect(3, -5, 9, 2, '#9ba2ad');
  b.hline(3, 11, -5, '#c3c8d0');
  // monitor
  b.rect(3, -20, 11, 12, '#eef0f2');
  b.rect(4, -19, 9, 9, '#1f2937');
  b.line(5, -18, 9, -12, 'rgba(255,255,255,0.1)');
  b.rect(7, -8, 3, 2, '#c3c8d0');
  b.outline();
  contact(b, 0, 13, 16, 3, 0.24);
  return { base: s };
}

/** Guarda-corpo de vidro fosco verde com corrimão de madeira e o escudo do tigre gravado. h = de frente; v = de lado. */
export function glassRailing(variant: string | undefined): BufFurniture {
  const v = variant ?? 'h';
  const s = floorSheet(1, 1, 8);
  const b = s.buf;
  const wood = ramp('#d5a96b', 0.06);
  const steel = '#b9c0ca';
  if (v === 'v') {
    b.rect(6, -6, 4, 3, wood.lt);
    b.hline(6, 9, -6, wood.hi);
    b.hline(6, 9, -4, wood.dk);
    b.rect(6, -3, 4, 15, 'rgba(196,228,220,0.4)');
    b.vline(6, -3, 11, 'rgba(235,245,240,0.6)');
    b.vline(9, -3, 11, 'rgba(90,140,118,0.7)');
    b.rect(5, 12, 6, 2, steel);
    b.hline(5, 10, 14, '#6d7583');
      contact(b, 4, 13, 8, 3, 0.2);
    return { base: s };
  }
  // corrimão
  b.rect(0, -7, 16, 3, wood.lt);
  b.hline(0, 15, -7, wood.hi);
  b.hline(0, 15, -5, wood.dk);
  // vidro fosco
  b.rect(1, -4, 14, 15, 'rgba(196,228,220,0.38)');
  b.hline(1, 14, -4, 'rgba(245,252,250,0.85)');
  b.vline(3, -3, 12, 'rgba(255,255,255,0.45)');
  b.vline(12, -3, 12, 'rgba(255,255,255,0.3)');
  b.hline(1, 14, 10, 'rgba(120,170,160,0.7)');
  // escudo gravado (claro e fosco)
  shield(b, 6, 0, 5, 8, 'rgba(250,255,252,0.8)');
  // montantes de aço e base
  for (const x of [0, 15]) {
    b.rect(x, -7, 1, 19, steel);
    b.vline(x, -6, 11, '#e4e8ec');
  }
  b.rect(0, 11, 16, 2, steel);
  b.hline(0, 15, 12, '#6d7583');
  contact(b, 0, 13, 16, 3, 0.22);
  return { base: s };
}

/** Divisória preta perfurada (estilo pegboard) do canto de reunião do lounge. h = de frente; v = de lado; end = ponta. */
export function perforatedPartition(variant: string | undefined): BufFurniture {
  const v = variant ?? 'perf_h';
  const s = floorSheet(1, 1, 22);
  const b = s.buf;
  const panel = '#2a2c31';
  const hole = '#46494f';
  if (v === 'perf_v') {
    b.rect(6, -18, 4, 31, panel);
    b.vline(6, -18, 12, '#3c3f46');
    b.vline(9, -18, 12, '#1b1c20');
    b.rect(4, 12, 8, 2, '#4a505c');
    b.outline();
    contact(b, 3, 13, 10, 3, 0.22);
    return { base: s };
  }
  if (v === 'perf_end') {
    b.rect(7, -18, 2, 31, '#9aa3af');
    b.vline(7, -17, 12, '#d3d8de');
    b.rect(5, 12, 6, 2, '#4a505c');
    b.outline();
    contact(b, 3, 13, 10, 3, 0.2);
    return { base: s };
  }
  b.rect(0, -18, 16, 30, panel);
  b.hline(0, 15, -18, '#555960');
  b.hline(0, 15, -17, '#3c3f46');
  b.vline(15, -18, 11, '#1b1c20');
  for (let y = -14; y < 10; y += 3) for (let x = 2; x < 15; x += 3) b.set(x, y, hole);
  // pé de metal
  b.rect(1, 12, 3, 2, '#4a505c');
  b.rect(12, 12, 3, 2, '#4a505c');
  b.outline();
  contact(b, 0, 13, 16, 3, 0.24);
  return { base: s };
}

export function meetingTableDark(seed: number): BufFurniture {
  const s = floorSheet(3, 2, 10);
  const b = s.buf;
  const w = ramp('#4a3226', 0.07);
  // pés
  for (const x of [3, 41]) {
    b.rect(x, 24, 4, 7, '#7a828e');
    b.vline(x, 24, 30, '#a9b0ba');
  }
  topFace(b, 0, 4, 48, 22, w);
  woodGrain(b, 1, 5, 46, 20, w, seed + 3);
  b.hline(0, 47, 26, w.dd);
  b.hline(0, 47, 27, w.dk);
  // caixa de tomadas central (prata) e uma garrafinha
  b.rect(18, 13, 11, 4, '#c3c8d0');
  b.hline(18, 28, 13, '#e4e8ec');
  b.rect(20, 14, 2, 2, '#3a3f4b');
  b.rect(24, 14, 2, 2, '#3a3f4b');
  b.rect(31, 11, 2, 5, '#cde9f2');
  b.hline(31, 32, 10, '#e05a5a');
  b.outline();
  contact(b, 0, 28, 48, 5, 0.24);
  return { base: s };
}

export function vendingMachineVariant(variant: string): BufFurniture {
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = variant === 'pepsi' ? ramp('#2a63b8', 0.07) : ramp('#3fa05a', 0.07);
  topFace(b, 0, -23, 16, 3, m);
  frontFace(b, 0, -20, 16, 36, m);
  b.vline(0, -20, 15, m.lt);
  const gx = 2;
  const gy = -18;
  const gw = 9;
  const gh = 22;
  b.rect(gx, gy, gw, gh, '#f3f8ff');
  const r = rngOf(variant === 'pepsi' ? 11 : 12, 61);
  const drinks = variant === 'pepsi'
    ? ['#2a63b8', '#e05a5a', '#f2f4f7', '#2a63b8', '#3f8a62']
    : ['#e05a5a', '#f2c14e', '#3f7fd8', '#4cae6a', '#ec8a3c', '#8d66cf', '#3fb0d8'];
  for (let row = 0; row < 5; row++) {
    const yy = gy + 1 + row * 4;
    for (let k = 0; k < 3; k++) {
      const c = drinks[Math.floor(r() * drinks.length)];
      b.rect(gx + 1 + k * 3, yy, 2, 3, c);
      b.set(gx + 1 + k * 3, yy, shade(c, 0.25));
    }
    b.hline(gx, gx + gw - 1, yy + 3, '#b9c3cf');
  }
  glass(b, gx, gy, gw, gh, { alpha: 0.16 });
  if (variant === 'pepsi') {
    // faixa lateral com o círculo da marca (vermelho, branco e azul)
    b.ellipse(8, -21, 3, 1, '#f2f4f7');
    b.hline(5, 11, -21, '#e05a5a');
  }
  b.rect(12, -16, 3, 12, '#2f333d');
  b.rect(13, -15, 1, 2, '#7fd0ff');
  for (let i = 0; i < 4; i++) b.set(13, -11 + i * 2, '#d9dde3');
  b.rect(12, -2, 3, 2, '#22262f');
  b.rect(2, 7, 9, 4, '#22262f');
  b.hline(2, 10, 7, '#3a3f4b');
  b.outline();
  contact(b, 0, 13, 16, 4, 0.26);
  s.rects = { glow: rectAt(s, gx, gy, gw, gh) };
  return { base: s };
}

// ------------------------------------------------------------------ itens de parede

/** Vitrine do hall: moldura branca arredondada, fundo vinho e placas redondas de prêmios (uma coluna de 1 tile). */
export function displayCase(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const x = 1;
  const y = -29;
  const w = 14;
  const h = 26;
  b.rect(x, y, w, h, '#f1f1ee');
  b.hline(x + 1, x + w - 2, y, '#ffffff');
  b.rect(x + 2, y + 2, w - 4, h - 4, '#4a1a26');
  b.rect(x + 2, y + 2, w - 4, 1, '#2f0f18');
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const cx = x + 4 + col * 5;
      const cy = y + 6 + row * 5;
      b.ellipse(cx, cy, 2, 2, '#dcd8d0');
      b.set(cx, cy, '#a8a39a');
      b.set(cx - 1, cy - 1, '#ffffff');
    }
  }
  glass(b, x + 2, y + 2, w - 4, h - 4, { alpha: 0.1, period: 11 });
  b.outline();
  b.under(x + w, y + 2, 'rgba(30,34,52,0.16)');
  return { base: s };
}

/** Quadro dos tigres: moldura de madeira clara e pintura (paisagem nevada, dois tigres). */
export function paintingTiger(): BufFurniture {
  const s = wallSheet(2);
  const b = s.buf;
  const fr = ramp('#d9b27a', 0.06);
  const x = 2;
  const y = -27;
  const w = 28;
  const h = 18;
  b.rect(x, y, w, h, fr.base);
  b.hline(x, x + w - 1, y, fr.hi);
  b.vline(x, y, y + h - 1, fr.lt);
  b.vline(x + w - 1, y, y + h - 1, fr.dk);
  b.hline(x, x + w - 1, y + h - 1, fr.dk);
  const ax = x + 2;
  const ay = y + 2;
  const aw = w - 4;
  const ah = h - 4;
  for (let i = 0; i < ah; i++) b.hline(ax, ax + aw - 1, ay + i, shade('#e6e9e4', -i * 0.012));
  // rochas e pinheiro ao fundo
  b.rect(ax + 1, ay + 5, 5, ah - 5, '#8c8a85');
  b.rect(ax + aw - 7, ay + 7, 6, ah - 7, '#a09d97');
  b.vline(ax + 3, ay + 1, ay + 6, '#5f5648');
  b.hline(ax + 1, ax + 5, ay + 2, '#4a5f4c');
  // neve no chão
  b.rect(ax, ay + ah - 3, aw, 3, '#f4f6f5');
  // tigre grande e filhote
  const tiger = (tx: number, ty: number, sc: number) => {
    b.rect(tx, ty, 8 * sc, 4 * sc, TIGER);
    b.rect(tx + 7 * sc, ty - 2 * sc, 3 * sc, 3 * sc, TIGER);
    b.rect(tx - 2 * sc, ty + sc, 2 * sc, sc, TIGER_DARK);
    for (let k = 1; k < 4; k++) b.vline(tx + k * 2 * sc, ty, ty + 2 * sc, TIGER_DARK);
    b.hline(tx + sc, tx + 7 * sc, ty + 4 * sc, '#f4f6f5');
    b.rect(tx + sc, ty + 4 * sc, sc, 2 * sc, TIGER);
    b.rect(tx + 6 * sc, ty + 4 * sc, sc, 2 * sc, TIGER);
  };
  tiger(ax + 8, ay + 4, 2);
  tiger(ax + 19, ay + 8, 1);
  b.outline();
  b.under(x + w, y + 1, 'rgba(30,34,52,0.16)');
  s.rects = { art: rectAt(s, ax, ay, aw, ah) };
  return { base: s };
}

/** Cartazes das paredes e da faixa "INFORMATION" do prédio. */
export function posterKu(variant: string): { draw: (b: PixelBuf, ix: number, iy: number, iw: number, ih: number) => void } {
  return {
    draw(b, ix, iy, iw, ih) {
      if (variant === 'ku_tiger') {
        b.rect(ix, iy, iw, ih, MAROON.base);
        b.rect(ix + 2, iy + 2, 6, 6, '#f2eee6');
        b.ellipse(ix + 5, iy + 5, 2, 2, TIGER);
        b.hline(ix + 3, ix + 7, iy + 5, TIGER_DARK);
        b.hline(ix + 1, ix + 8, iy + ih - 3, '#f2eee6');
        b.hline(ix + 2, ix + 7, iy + ih - 1, '#c9a0a8');
      } else {
        // ku_notice: aviso em papel branco com título vinho
        b.rect(ix, iy, iw, ih, '#f6f4ee');
        b.rect(ix, iy, iw, 3, MAROON.base);
        for (let i = 0; i < 5; i++) b.hline(ix + 1, ix + iw - 2 - (i % 2) * 2, iy + 5 + i * 2, '#a9a49a');
        b.rect(ix + 1, iy + ih - 3, 4, 2, '#e8c37a');
      }
    },
  };
}

// ------------------------------------------------------------------ banheiro

/** Mictório de parede, de porcelana branca, entre divisórias cinzas (como nos banheiros do campus). */
export function urinal(): BufFurniture {
  const s = floorSheet(1, 1, 14);
  const b = s.buf;
  const panel = ramp('#9ca3aa', 0.06);
  const por = ramp('#f6f6f3', 0.045);
  // divisórias laterais
  for (const x of [0, 14]) {
    b.rect(x, -11, 2, 21, panel.base);
    b.vline(x, -11, 9, panel.lt);
    b.vline(x + 1, -11, 9, panel.dk);
    b.hline(x, x + 1, -11, '#d5dae0');
  }
  // placa de fundo na parede
  b.rect(2, -9, 12, 12, '#e4e8eb');
  // tigela
  b.rect(4, -8, 8, 3, por.lt);
  b.hline(4, 11, -8, por.hi);
  b.rect(3, -5, 10, 8, por.base);
  b.ellipse(8, 3, 5, 3, por.base);
  b.hline(4, 11, 5, por.dk);
  b.ellipse(8, -1, 2.5, 3.5, '#cfd8e0');
  b.vline(8, 1, 3, '#9aa6b0');
  // botão de descarga e cano
  b.rect(7, -11, 2, 2, '#c9ced6');
  b.vline(8, -9, -8, '#9aa2ae');
  b.outline();
  contact(b, 2, 9, 12, 3, 0.2);
  return { base: s };
}

/** Secador de mãos de parede: caixa branca com bocal e botão. */
export function handDryer(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const x = 3;
  const y = -22;
  const body = ramp('#eceff1', 0.05);
  b.rect(x, y, 10, 9, body.base);
  b.hline(x, x + 9, y, body.hi);
  b.vline(x + 9, y, y + 8, body.dk);
  b.hline(x, x + 9, y + 8, body.dk);
  b.rect(x + 3, y + 9, 4, 2, '#8d96a1');
  b.hline(x + 3, x + 6, y + 11, '#5f6772');
  b.rect(x + 7, y + 2, 2, 2, '#c9302c');
  b.rect(x + 1, y + 2, 4, 1, '#c3cad4');
  b.outline();
  for (let yy = y + 1; yy <= y + 12; yy++) b.under(x + 10, yy, 'rgba(30,34,52,0.16)');
  return { base: s };
}
