// Mapa de caminhada do campus "KU Edition": uma grade de células (px de mundo) que diz onde dá para andar, com portas,
// bancos e a faixa de pedestres, mais a busca de caminho (A*) usada pelas pessoas. Lógica pura, sem DOM (testada em
// ku-sim.test.ts); ku.ts monta a grade enquanto desenha a cena.

export interface Pt {
  x: number;
  y: number;
}

export interface KuDoor {
  id: string;
  /** Ponto livre diante da porta (px de mundo): quem entra some aqui, quem sai aparece aqui. */
  x: number;
  y: number;
}

export interface KuBench {
  /** Canto superior esquerdo do assento e largura (px de mundo). */
  x: number;
  y: number;
  w: number;
}

/** Ponto de ônibus: onde se espera (calçada) e o sentido da pista que para aqui (+1 = leste, -1 = oeste). */
export interface BusStop extends Pt {
  dir: 1 | -1;
}

export interface KuMap {
  cell: number;
  ox: number;
  oy: number;
  cols: number;
  rows: number;
  /** 1 = dá para andar. */
  walk: Uint8Array;
  doors: KuDoor[];
  benches: KuBench[];
  /** Faixa de pedestres sobre a pista (px de mundo). */
  crossing: { x0: number; x1: number; y0: number; y1: number };
  /** Pontos de ônibus: um em cada calçada, atendidos pela pista que passa rente a ela. */
  busStops: BusStop[];
  /** Pontos de entrada/saída nas bordas do mundo. */
  portals: Pt[];
  /** Pontos para passear (praça, gramados, calçadas). */
  pois: Pt[];
}

export function cellX(m: KuMap, x: number): number {
  return Math.floor((x - m.ox) / m.cell);
}

export function cellY(m: KuMap, y: number): number {
  return Math.floor((y - m.oy) / m.cell);
}

export function inGrid(m: KuMap, cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < m.cols && cy < m.rows;
}

export function walkableCell(m: KuMap, cx: number, cy: number): boolean {
  return inGrid(m, cx, cy) && m.walk[cy * m.cols + cx] === 1;
}

export function walkable(m: KuMap, x: number, y: number): boolean {
  return walkableCell(m, cellX(m, x), cellY(m, y));
}

function center(m: KuMap, cx: number, cy: number): Pt {
  return { x: m.ox + (cx + 0.5) * m.cell, y: m.oy + (cy + 0.5) * m.cell };
}

/** Célula livre mais próxima de (x, y), procurando em anéis crescentes; -1 se não houver. */
function nearestCell(m: KuMap, x: number, y: number, maxR = 10): number {
  const cx = cellX(m, x);
  const cy = cellY(m, y);
  if (walkableCell(m, cx, cy)) return cy * m.cols + cx;
  for (let r = 1; r <= maxR; r++) {
    let best = -1;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (!walkableCell(m, cx + dx, cy + dy)) continue;
        const p = center(m, cx + dx, cy + dy);
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = (cy + dy) * m.cols + cx + dx;
        }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

export function nearestWalkable(m: KuMap, x: number, y: number, maxR = 10): Pt | null {
  const i = nearestCell(m, x, y, maxR);
  return i < 0 ? null : center(m, i % m.cols, Math.floor(i / m.cols));
}

const penCache = new WeakMap<Uint8Array, Uint8Array>();

/** Custo extra para células coladas em obstáculos, para os caminhos não rasparem nas paredes. */
function penalty(m: KuMap): Uint8Array {
  let p = penCache.get(m.walk);
  if (p) return p;
  p = new Uint8Array(m.walk.length);
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      if (!m.walk[cy * m.cols + cx]) continue;
      let near = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!walkableCell(m, cx + dx, cy + dy)) near++;
      p[cy * m.cols + cx] = near > 0 ? 2 : 0;
    }
  }
  penCache.set(m.walk, p);
  return p;
}

/** Há linha reta livre entre duas células (Bresenham)? */
function lineOfSight(m: KuMap, a: number, b: number): boolean {
  let x0 = a % m.cols;
  let y0 = Math.floor(a / m.cols);
  const x1 = b % m.cols;
  const y1 = Math.floor(b / m.cols);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    if (!walkableCell(m, x0, y0)) return false;
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    let nx = x0;
    let ny = y0;
    if (e2 > -dy) {
      err -= dy;
      nx += sx;
    }
    if (e2 < dx) {
      err += dx;
      ny += sy;
    }
    // passo na diagonal: as duas células vizinhas também precisam estar livres (a linha real passa por uma delas)
    if (nx !== x0 && ny !== y0 && (!walkableCell(m, nx, y0) || !walkableCell(m, x0, ny))) return false;
    x0 = nx;
    y0 = ny;
  }
}

const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.4142],
  [1, -1, 1.4142],
  [-1, 1, 1.4142],
  [-1, -1, 1.4142],
];

/**
 * Caminho de `from` até `to` pelas células livres (A* com suavização por linha reta). Devolve os pontos a seguir, sem o
 * ponto de partida; null se não houver caminho.
 */
export function findPath(m: KuMap, from: Pt, to: Pt): Pt[] | null {
  const s = nearestCell(m, from.x, from.y);
  const g = nearestCell(m, to.x, to.y);
  if (s < 0 || g < 0) return null;
  if (s === g) return [to];
  const n = m.walk.length;
  const pen = penalty(m);
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const gx = g % m.cols;
  const gy = Math.floor(g / m.cols);
  const h = (i: number) => {
    const dx = Math.abs((i % m.cols) - gx);
    const dy = Math.abs(Math.floor(i / m.cols) - gy);
    return dx + dy + (1.4142 - 2) * Math.min(dx, dy);
  };
  // fila de prioridade (heap binário)
  const heapI: number[] = [];
  const heapF: number[] = [];
  const push = (i: number, f: number) => {
    let k = heapI.length;
    heapI.push(i);
    heapF.push(f);
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapF[p] <= heapF[k]) break;
      [heapF[p], heapF[k]] = [heapF[k], heapF[p]];
      [heapI[p], heapI[k]] = [heapI[k], heapI[p]];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heapI[0];
    const li = heapI.pop()!;
    const lf = heapF.pop()!;
    if (heapI.length) {
      heapI[0] = li;
      heapF[0] = lf;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let sm = k;
        if (l < heapI.length && heapF[l] < heapF[sm]) sm = l;
        if (r < heapI.length && heapF[r] < heapF[sm]) sm = r;
        if (sm === k) break;
        [heapF[sm], heapF[k]] = [heapF[k], heapF[sm]];
        [heapI[sm], heapI[k]] = [heapI[k], heapI[sm]];
        k = sm;
      }
    }
    return top;
  };
  gScore[s] = 0;
  push(s, h(s));
  let found = false;
  while (heapI.length) {
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === g) {
      found = true;
      break;
    }
    const cx = cur % m.cols;
    const cy = Math.floor(cur / m.cols);
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!walkableCell(m, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!walkableCell(m, cx + dx, cy) || !walkableCell(m, cx, cy + dy))) continue;
      const ni = ny * m.cols + nx;
      if (closed[ni]) continue;
      const ng = gScore[cur] + cost + pen[ni] * 0.35;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        came[ni] = cur;
        push(ni, ng + h(ni));
      }
    }
  }
  if (!found) return null;
  const cells: number[] = [];
  for (let k = g; k !== -1; k = came[k]) cells.push(k);
  cells.reverse();
  // suavização: pula células enquanto houver linha reta livre
  const out: number[] = [cells[0]];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    while (j > i + 1 && !lineOfSight(m, cells[i], cells[j])) j--;
    out.push(cells[j]);
    i = j;
  }
  // começa pelo centro da célula de saída e termina no centro da célula de chegada (esses dois movimentos ficam dentro
  // da própria célula, então são seguros); o ponto exato pedido vem por último
  const pts = out.map((c) => center(m, c % m.cols, Math.floor(c / m.cols)));
  if (Math.hypot(pts[0].x - from.x, pts[0].y - from.y) < 0.5) pts.shift();
  if (walkableCell(m, cellX(m, to.x), cellY(m, to.y)) && cellX(m, to.x) === g % m.cols && cellY(m, to.y) === Math.floor(g / m.cols)) pts.push({ x: to.x, y: to.y });
  return pts;
}
