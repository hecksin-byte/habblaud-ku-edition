// Pessoas e ônibus do campus "KU Edition": estudantes e moradores que passeiam pela praça, pelos gramados e pelas calçadas,
// entram e saem dos edifícios, sentam e levantam dos bancos, atravessam a rua na faixa de pedestres e pegam o ônibus.
// O mapa de caminhada vem de ku.ts (KuMap); o renderer chama update() a cada quadro e desenha tudo junto, ordenado por y.
import { findPath, type BusStop, type KuBench, type KuDoor, type KuMap, type Pt } from './ku-map';
import { BUS_KINDS, busLength, type BusKind } from './ku-traffic';

export { BUS_KINDS, busLength };
export type { BusKind };

export interface PersonSprite {
  canvas: HTMLCanvasElement;
  ax: number;
  ay: number;
}

type Facing = 'l' | 'r' | 'u' | 'd';
type Kind = 'student' | 'citizen' | 'elder' | 'worker';

interface Look {
  skin: string;
  hair: string;
  hairStyle: number;
  top: string;
  accent: string;
  bottom: string;
  shoes: string;
  bag: number;
  bagColor: string;
  cane: boolean;
}

const CRIMSON = '#8b0029';
const SKIN = ['#f7dcc4', '#f2d1b6', '#edc7aa', '#e7bd9d', '#e0b392'];
const HAIR = ['#17120f', '#1f1814', '#2b1d14', '#2b1d14', '#4a2a1a'];
const TOPS = ['#d9534a', '#3f7fd8', '#4cae6a', '#f2c14e', '#8d66cf', '#e2e2e0', '#2fb3a3', '#c9713f', '#f08aa0'];
const SCHOOL_TOPS = ['#2c3550', '#7a7f8a', '#2a2a30', '#c9b79a', '#4f7fa8'];
const BOTTOMS = ['#2c3550', '#3a3f48', '#6b5b4a', '#7a7f8a', '#1f2a44', '#4a5468', '#e3dfd3'];
const BAGS = ['#333333', '#b8860b', '#2b6cb0', '#d94f4f', '#444444', '#2f7d4f'];

function makeLook(kind: Kind, rnd: () => number): Look {
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
  const student = kind === 'student';
  const crimson = student && rnd() < 0.62;
  return {
    skin: pick(SKIN),
    hair: kind === 'elder' ? '#9a9aa0' : pick(HAIR),
    hairStyle: Math.floor(rnd() * 4),
    top: crimson ? CRIMSON : student ? pick(SCHOOL_TOPS) : kind === 'worker' ? pick(['#2c3550', '#3a3f48', '#e2e2e0', '#4a5468']) : pick(TOPS),
    accent: crimson ? '#f4efe2' : '#00000022',
    bottom: kind === 'worker' ? pick(['#1f2a44', '#2a2a30', '#4a5468']) : pick(BOTTOMS),
    shoes: pick(['#26262c', '#f2f2ee', '#5b3a24']),
    bag: student ? (rnd() < 0.7 ? 1 : 0) : kind === 'worker' ? 2 : rnd() < 0.25 ? 2 : 0,
    bagColor: pick(BAGS),
    cane: kind === 'elder' && rnd() < 0.6,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Sprites (só usados ao desenhar; a simulação abaixo não precisa de DOM)

const spriteCache = new Map<string, PersonSprite>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function lookKey(look: Look): string {
  return [look.skin, look.hair, look.hairStyle, look.top, look.bottom, look.shoes, look.bag, look.bagColor, look.cane ? 1 : 0].join('|');
}

/** Pessoa de 14x26 px de mundo, com os pés na linha 25; 4 quadros de caminhada por direção. */
function personSprite(look: Look, facing: Facing, frame: number): PersonSprite {
  const key = `${lookKey(look)}|${facing}|${frame}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(14, 26);
  if (facing === 'l') {
    ctx.translate(14, 0);
    ctx.scale(-1, 1);
  }
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  const swing = [0, 1, 0, -1][frame];
  const outline = '#2e3648';
  ctx.fillStyle = 'rgba(28,36,52,0.25)';
  ctx.fillRect(2, 24, 10, 2);
  if (facing === 'l' || facing === 'r') {
    const legA = swing * 2;
    const legB = -swing * 2;
    if (look.bag === 1) {
      R(2, 9, 3, 7, look.bagColor);
      R(2, 9, 1, 7, outline);
    }
    R(6 + legB, 17, 2, 7, look.bottom);
    R(5 + legA, 17, 2, 7, look.bottom);
    R(6 + legB, 24, 3, 1, look.shoes);
    R(5 + legA, 24, 3, 1, look.shoes);
    R(4, 9, 6, 8, look.top);
    R(4, 9, 6, 1, 'rgba(255,255,255,0.28)');
    if (look.accent === '#f4efe2') R(4, 14, 6, 1, look.accent);
    R(6 + swing, 10, 2, 6, look.top);
    R(6 + swing, 16, 2, 1, look.skin);
    if (look.cane) R(9 + swing, 15, 1, 9, '#6a4a2a');
    if (look.bag === 2) R(8 + swing, 15, 3, 3, look.bagColor);
    R(5, 3, 5, 5, look.skin);
    R(8, 5, 1, 1, '#222');
    R(6, 8, 3, 1, look.skin);
    R(5, 2, 5, 2, look.hair);
    if (look.hairStyle === 1) R(3, 3, 3, 8, look.hair);
    else if (look.hairStyle === 2) {
      R(3, 1, 3, 3, look.hair);
      R(4, 3, 2, 3, look.hair);
    } else R(4, 3, 2, 4, look.hair);
  } else {
    const back = facing === 'u';
    const lh = [7, 6, 7, 7][frame];
    const rh = [7, 7, 7, 6][frame];
    R(4, 17, 2, lh, look.bottom);
    R(8, 17, 2, rh, look.bottom);
    R(4, 17 + lh, 2, 1, look.shoes);
    R(8, 17 + rh, 2, 1, look.shoes);
    R(3, 9, 8, 8, look.top);
    R(3, 9, 8, 1, 'rgba(255,255,255,0.28)');
    if (look.accent === '#f4efe2') {
      R(3, 14, 8, 1, look.accent);
      R(3, 9, 1, 8, look.accent);
      R(10, 9, 1, 8, look.accent);
    }
    const la = swing > 0 ? 9 : swing < 0 ? 11 : 10;
    const ra = swing > 0 ? 11 : swing < 0 ? 9 : 10;
    R(1, la, 2, 6, look.top);
    R(11, ra, 2, 6, look.top);
    R(1, la + 6, 2, 1, look.skin);
    R(11, ra + 6, 2, 1, look.skin);
    if (back && look.bag === 1) {
      R(3, 9, 8, 7, look.bagColor);
      R(3, 9, 8, 1, 'rgba(255,255,255,0.2)');
    }
    if (!back && look.bag === 2) R(11, ra + 5, 3, 3, look.bagColor);
    R(4, 3, 6, 5, back ? look.hair : look.skin);
    R(6, 8, 2, 1, look.skin);
    R(4, 2, 6, 2, look.hair);
    if (!back) {
      R(5, 5, 1, 1, '#222');
      R(8, 5, 1, 1, '#222');
      if (look.hairStyle === 1) {
        R(3, 3, 1, 8, look.hair);
        R(10, 3, 1, 8, look.hair);
      }
    } else if (look.hairStyle === 1) R(4, 8, 6, 3, look.hair);
    else if (look.hairStyle === 2) R(5, 1, 4, 2, look.hair);
  }
  const s = { canvas: c, ax: 7, ay: 25 };
  spriteCache.set(key, s);
  return s;
}

/**
 * Sentado de frente num banco (14x30, pés na linha 28; os quadris ficam 12 px acima dos pés, na altura do assento):
 * coxas largas, canelas curtas e pés afastados, para a pose ler como "sentado".
 */
function sitSprite(look: Look): PersonSprite {
  const key = `${lookKey(look)}|sit`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(14, 30);
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  ctx.fillStyle = 'rgba(28,36,52,0.22)';
  ctx.fillRect(1, 27, 12, 2);
  R(3, 19, 3, 7, look.bottom);
  R(8, 19, 3, 7, look.bottom);
  R(2, 26, 4, 2, look.shoes);
  R(8, 26, 4, 2, look.shoes);
  R(3, 16, 8, 3, look.bottom);
  R(3, 16, 8, 1, 'rgba(255,255,255,0.18)');
  R(3, 8, 8, 8, look.top);
  R(3, 8, 8, 1, 'rgba(255,255,255,0.28)');
  if (look.accent === '#f4efe2') {
    R(3, 13, 8, 1, look.accent);
    R(3, 8, 1, 8, look.accent);
    R(10, 8, 1, 8, look.accent);
  }
  R(1, 9, 2, 5, look.top);
  R(11, 9, 2, 5, look.top);
  R(2, 14, 3, 2, look.skin);
  R(9, 14, 3, 2, look.skin);
  if (look.bag === 2) R(10, 17, 3, 3, look.bagColor);
  R(4, 2, 6, 5, look.skin);
  R(6, 7, 2, 1, look.skin);
  R(4, 1, 6, 2, look.hair);
  R(5, 4, 1, 1, '#222');
  R(8, 4, 1, 1, '#222');
  if (look.hairStyle === 1) {
    R(3, 2, 1, 8, look.hair);
    R(10, 2, 1, 8, look.hair);
  } else if (look.hairStyle === 2) R(5, 0, 4, 2, look.hair);
  const s = { canvas: c, ax: 7, ay: 28 };
  spriteCache.set(key, s);
  return s;
}

/** Agachando/levantando: a pessoa de frente, um pouco mais baixa e curvada. */
function crouchSprite(look: Look): PersonSprite {
  const key = `${lookKey(look)}|crouch`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const base = personSprite(look, 'd', 0);
  const [c, ctx] = makeCanvas(14, 26);
  ctx.drawImage(base.canvas, 0, 0, 14, 26, 0, 5, 14, 21);
  const s = { canvas: c, ax: 7, ay: 25 };
  spriteCache.set(key, s);
  return s;
}

const busCache = new Map<string, PersonSprite>();

/** Ônibus visto de lado, virado para a direita; `flip` desenha para a esquerda. */
export function busSprite(kind: BusKind, flip: boolean): PersonSprite {
  const key = `${kind}:${flip ? 1 : 0}`;
  const hit = busCache.get(key);
  if (hit) return hit;
  const L = busLength(kind);
  const H = 38;
  const [c, ctx] = makeCanvas(L + 2, H);
  if (flip) {
    ctx.translate(L + 2, 0);
    ctx.scale(-1, 1);
  }
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  const pal = {
    trunk: { body: '#2e6fd0', dark: '#1f4f9a', light: '#6fa3ec', stripe: '#f4f4f6' },
    branch: { body: '#3a9d3a', dark: '#277027', light: '#7bd07b', stripe: '#f4f4f6' },
    village: { body: '#86c63f', dark: '#5e9a2a', light: '#c3ec84', stripe: '#f08c2c' },
    shuttle: { body: CRIMSON, dark: '#5e0a1f', light: '#c23a58', stripe: '#f4efe2' },
  }[kind];
  const small = kind === 'village';
  const top = small ? 9 : 6;
  const bodyH = small ? 21 : 24;
  const o = '#2e3648';
  ctx.fillStyle = 'rgba(28,36,52,0.3)';
  ctx.fillRect(3, 33, L - 4, 3);
  R(1, top, L, bodyH, o);
  R(2, top + 1, L - 2, bodyH - 2, pal.body);
  R(2, top + 1, L - 2, 2, pal.light);
  R(2, top + bodyH - 6, L - 2, 5, pal.dark);
  R(2, top + 12, L - 2, 2, pal.stripe);
  const wEnd = L - (small ? 30 : 38);
  for (let wx = 6; wx + 11 <= wEnd; wx += 14) {
    R(wx, top + 4, 11, 7, '#3a5f86');
    R(wx, top + 4, 4, 2, '#9cc7ec');
  }
  const dx = L - (small ? 26 : 32);
  R(dx, top + 4, 11, bodyH - 8, '#2f4f6f');
  R(dx + 5, top + 4, 1, bodyH - 8, '#9cc7ec');
  R(dx, top + 4, 4, 2, '#9cc7ec');
  R(L - 14, top + 3, 11, 12, '#3a5f86');
  R(L - 14, top + 3, 4, 2, '#9cc7ec');
  R(L - 14, top - 1, 10, 3, '#111');
  R(L - 12, top, 6, 1, '#ffb347');
  R(L - 2, top + bodyH - 9, 2, 3, '#fff3c4');
  R(2, top + bodyH - 9, 1, 3, '#e04a3a');
  for (const wx of [20, L - 24]) {
    R(wx - 5, 26, 10, 9, o);
    R(wx - 4, 27, 8, 7, '#1b1b20');
    R(wx - 2, 29, 4, 4, '#8a8a92');
  }
  if (kind === 'shuttle') {
    const glyph: Record<string, string[]> = {
      K: ['10010', '10100', '11000', '11000', '10100', '10010', '10001'],
      U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    };
    let gx = Math.round(L / 2 - 17);
    for (const ch of 'KU') {
      glyph[ch].forEach((row, j) => [...row].forEach((v, i) => v === '1' && R(gx + i, top + 14 + Math.min(j, 6) - 1, 1, 1, '#fff')));
      gx += 7;
    }
  }
  const s = { canvas: c, ax: Math.round((L + 2) / 2), ay: 34 };
  busCache.set(key, s);
  return s;
}

// ---------------------------------------------------------------------------------------------------------------------
// Simulação dos pedestres

export interface VehicleInfo {
  x: number;
  y: number;
  halfLen: number;
  moving: boolean;
}

export interface Walker {
  x: number;
  y: number;
  look: Look;
  facing: Facing;
  frame: number;
  alpha: number;
  pose: 'stand' | 'crouch' | 'sit';
  /** Linha usada para ordenar com os demais objetos (y dos pés; sentado, um pouco à frente do banco). */
  depth: number;
  /** Escada da estação: o corpo afunda `drop` px abaixo da borda `lip` (y), e o que passa dela fica escondido. */
  drop?: number;
  lip?: number;
}

type Goal =
  | { k: 'point'; x: number; y: number; pause: number }
  | { k: 'door'; door: KuDoor }
  | { k: 'bench'; bench: KuBench }
  | { k: 'bus'; stop: BusStop }
  | { k: 'leave'; x: number; y: number };

type State = 'walk' | 'idle' | 'enter' | 'descend' | 'ascend' | 'exitDoor' | 'sitDown' | 'seated' | 'standUp' | 'waitBus' | 'toBus' | 'fade' | 'alight';

interface Seat {
  bench: KuBench;
  idx: number;
  key: string;
  feet: Pt;
  approach: Pt;
  /** Profundidade (y) do assento: logo à frente do sprite do banco, para a pessoa aparecer sentada nele. */
  depth: number;
}

export interface WalkerState extends Walker {
  goals: Goal[];
  cur: Goal | null;
  path: Pt[];
  speed: number;
  phase: number;
  state: State;
  t: number;
  waitT: number;
  crossOk: boolean;
  direct: Pt | null;
  seat: Seat | null;
  dead: boolean;
  age: number;
  /** y da porta da estação, de onde a escada começa. */
  sy: number;
}

export interface PeopleStats {
  spawned: number;
  fromDoors: number;
  entered: number;
  sat: number;
  boarded: number;
  alighted: number;
  crossings: number;
  crossingsDuringDwell: number;
  gaveUp: number;
}

/** Escada da estação: anda até a borda da escada, desce afundando (altura do corpo) e some; a subida faz o inverso. */
const STAIR_UP = 16;
const STAIR_DEPTH = 32;
const STAIR_WALK = 0.8;
const STAIR_SINK = 1.4;

const SEAT_FEET = 12;
/** O sprite do banco usa a profundidade bench.y + 14 (sua linha de apoio); quem senta fica 0,6 px à frente. */
const SEAT_DEPTH = 14.6;
const SEAT_APPROACH = 21;

export class KuPeople {
  walkers: WalkerState[] = [];
  readonly stats: PeopleStats = { spawned: 0, fromDoors: 0, entered: 0, sat: 0, boarded: 0, alighted: 0, crossings: 0, crossingsDuringDwell: 0, gaveUp: 0 };
  private spawnT = 0;
  private target: number;
  private seats = new Set<string>();
  private dwell: { x: number; y: number; dir: 1 | -1 }[] = [];
  private phase = false;

  constructor(
    readonly map: KuMap,
    worldWidth: number,
    private readonly rnd: () => number = Math.random,
  ) {
    this.target = Math.max(12, Math.min(56, Math.round(worldWidth / 44)));
  }

  /** Há alguém na faixa (ou, na fase dos pedestres, esperando na beira dela)? Os carros esperam. */
  onCrossing(peoplePhase: boolean): boolean {
    const c = this.map.crossing;
    const pad = peoplePhase ? 4 : 0;
    return this.walkers.some((w) => w.state !== 'fade' && w.state !== 'seated' && w.x >= c.x0 - pad && w.x <= c.x1 + pad && w.y >= c.y0 - pad && w.y <= c.y1 + pad);
  }

  private pick<T>(a: readonly T[]): T {
    return a[Math.floor(this.rnd() * a.length)];
  }

  private makeWalker(x: number, y: number, kind: Kind): WalkerState {
    const runner = this.rnd() < 0.04;
    return {
      x,
      y,
      look: makeLook(kind, this.rnd),
      facing: 'd',
      frame: 0,
      alpha: 0,
      pose: 'stand',
      depth: y,
      goals: [],
      cur: null,
      path: [],
      speed: (kind === 'elder' ? 16 : runner ? 52 : 24) + this.rnd() * 10,
      phase: this.rnd() * 4,
      state: 'walk',
      t: 0,
      waitT: 0,
      crossOk: false,
      direct: null,
      seat: null,
      dead: false,
      sy: y,
      age: 0,
    };
  }

  private plan(excludeDoor?: string): Goal[] {
    const m = this.map;
    const goals: Goal[] = [];
    const legs = 1 + Math.floor(this.rnd() * 3);
    let ended = false;
    for (let i = 0; i < legs && !ended; i++) {
      const r = this.rnd();
      if (r < 0.34 && m.pois.length) {
        const p = this.pick(m.pois);
        goals.push({ k: 'point', x: p.x, y: p.y, pause: 1.5 + this.rnd() * 4 });
      } else if (r < 0.56 && m.benches.length) {
        goals.push({ k: 'bench', bench: this.pick(m.benches) });
      } else if (r < 0.8) {
        const doors = m.doors.filter((d) => d.id !== excludeDoor);
        if (doors.length) {
          goals.push({ k: 'door', door: this.pick(doors) });
          ended = true;
        }
      } else if (r < 0.9 && i === legs - 1 && m.busStops.length) {
        goals.push({ k: 'bus', stop: this.pick(m.busStops) });
        ended = true;
      } else if (m.pois.length) {
        const p = this.pick(m.pois);
        goals.push({ k: 'point', x: p.x, y: p.y, pause: 1 + this.rnd() * 3 });
      }
    }
    if (!ended && m.portals.length) {
      const p = this.pick(m.portals);
      goals.push({ k: 'leave', x: p.x, y: p.y });
    }
    return goals;
  }

  private spawn(): void {
    const m = this.map;
    if (this.rnd() < 0.3 && m.doors.length) {
      // sai de um edifício
      const door = this.pick(m.doors);
      const station = door.id.startsWith('station');
      const kind: Kind = station ? (this.rnd() < 0.4 ? 'student' : this.rnd() < 0.5 ? 'worker' : 'citizen') : this.rnd() < 0.7 ? 'student' : this.rnd() < 0.4 ? 'worker' : 'citizen';
      const stairs = door.id.startsWith('station');
      const w = this.makeWalker(door.x, stairs ? door.y - STAIR_UP : door.y - 6, kind);
      w.state = stairs ? 'ascend' : 'exitDoor';
      w.t = 0;
      if (stairs) {
        // sobe a escada: começa afundado na borda e vai emergindo
        w.sy = door.y;
        w.alpha = 1;
        w.depth = door.y;
        w.lip = w.y;
        w.drop = STAIR_DEPTH;
      }
      w.goals = this.plan(door.id);
      this.walkers.push(w);
      this.stats.spawned++;
      this.stats.fromDoors++;
      return;
    }
    if (!m.portals.length) return;
    const p = this.pick(m.portals);
    const south = p.y > m.crossing.y0 - 40;
    const kind: Kind = this.rnd() < (south ? 0.3 : 0.6) ? 'student' : this.rnd() < 0.15 ? 'elder' : this.rnd() < 0.3 ? 'worker' : 'citizen';
    const w = this.makeWalker(p.x, p.y, kind);
    w.goals = this.plan();
    this.walkers.push(w);
    this.stats.spawned++;
    this.nextGoal(w);
  }

  /** Um ônibus parou no ponto: desce gente (quem espera embarca; ver `dwell` em update). */
  busArrived(doorX: number, laneY: number, dir: 1 | -1 = -1): void {
    const stop = this.map.busStops.find((s) => s.dir === dir) ?? this.map.busStops[0];
    if (!stop) return;
    const n = Math.floor(this.rnd() * 4);
    for (let k = 0; k < n; k++) {
      const w = this.makeWalker(doorX + (this.rnd() - 0.5) * 10, laneY + (dir > 0 ? -6 : 6), this.rnd() < 0.45 ? 'student' : this.rnd() < 0.15 ? 'elder' : 'citizen');
      w.alpha = 1;
      w.state = 'alight';
      w.direct = { x: stop.x + (this.rnd() - 0.5) * 20, y: stop.y };
      w.goals = this.plan();
      this.walkers.push(w);
      this.stats.alighted++;
    }
  }

  update(dt: number, vehicles: VehicleInfo[], dwell: { x: number; y: number; dir: 1 | -1 }[], peoplePhase = true): void {
    dt = Math.min(dt, 0.1);
    this.dwell = dwell;
    this.phase = peoplePhase;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.walkers.length < this.target) {
      this.spawn();
      this.spawnT = 0.5 + this.rnd() * 1.3;
    }
    for (const w of this.walkers) this.step(w, dt, vehicles);
    this.walkers = this.walkers.filter((w) => {
      if (w.dead && w.seat) this.seats.delete(w.seat.key);
      return !w.dead;
    });
  }

  private blocked(vehicles: VehicleInfo[]): boolean {
    const c = this.map.crossing;
    const cx = (c.x0 + c.x1) / 2;
    const half = (c.x1 - c.x0) / 2;
    // veículo com o corpo sobre a faixa sempre impede; na fase dos veículos, os que esperam para passar também (mesmo parados)
    const onZone = (v: VehicleInfo) => Math.min(v.x + v.halfLen, c.x1) - Math.max(v.x - v.halfLen, c.x0) > 2; // o mesmo limiar do carro: com a frente a mais de 2 px dentro da faixa ele já não consegue parar
    return vehicles.some((v) => onZone(v) || (!this.phase && Math.abs(v.x - cx) < v.halfLen + half + 64));
  }

  private insideCross(x: number, y: number, pad = 0): boolean {
    const c = this.map.crossing;
    return x >= c.x0 - pad && x <= c.x1 + pad && y >= c.y0 - pad && y <= c.y1 + pad;
  }

  /** Ponto de p→q logo antes de entrar na faixa de pedestres (a beira da calçada); null se o trecho não a cruza. */
  private crossEntry(p: Pt, q: Pt): Pt | null {
    if (this.insideCross(p.x, p.y)) return null;
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const n = Math.max(1, Math.ceil(len));
    let prev = p;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const pt = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
      if (this.insideCross(pt.x, pt.y)) return prev;
      prev = pt;
    }
    return null;
  }

  private freeSeat(bench: KuBench): Seat | null {
    const order = this.rnd() < 0.5 ? [0, 1] : [1, 0];
    const bi = this.map.benches.indexOf(bench);
    for (const idx of order) {
      const key = `${bi}:${idx}`;
      if (this.seats.has(key)) continue;
      const sx = bench.x + bench.w * (idx === 0 ? 0.28 : 0.72);
      return { bench, idx, key, feet: { x: sx, y: bench.y + SEAT_FEET }, approach: { x: sx, y: bench.y + SEAT_APPROACH }, depth: bench.y + SEAT_DEPTH };
    }
    return null;
  }

  private nextGoal(w: WalkerState): void {
    while (w.goals.length) {
      const g = w.goals.shift()!;
      let target: Pt | null = null;
      if (g.k === 'point' || g.k === 'leave') target = { x: g.x, y: g.y };
      else if (g.k === 'door') target = { x: g.door.x, y: g.door.y };
      else if (g.k === 'bus') target = g.stop;
      else if (g.k === 'bench') {
        const seat = this.freeSeat(g.bench);
        if (!seat) continue;
        this.seats.add(seat.key);
        w.seat = seat;
        target = seat.approach;
      }
      if (!target) continue;
      const path = findPath(this.map, w, target);
      if (!path) {
        if (w.seat) {
          this.seats.delete(w.seat.key);
          w.seat = null;
        }
        continue;
      }
      w.cur = g;
      w.path = path;
      w.state = 'walk';
      return;
    }
    w.cur = null;
    w.state = 'fade';
  }

  /** Cansou de esperar para atravessar: segue para a borda do mundo do mesmo lado da rua. */
  private giveUpCrossing(w: WalkerState): void {
    const c = this.map.crossing;
    const north = w.y < (c.y0 + c.y1) / 2;
    const same = this.map.portals.filter((p) => p.y < (c.y0 + c.y1) / 2 === north);
    w.goals = same.length ? [{ k: 'leave', x: this.pick(same).x, y: this.pick(same).y }] : [];
    w.path = [];
    w.crossOk = false;
    w.waitT = 0;
    this.stats.gaveUp++;
    this.nextGoal(w);
  }

  private face(w: WalkerState, dx: number, dy: number): void {
    w.facing = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'd' : 'u';
  }

  private moveTo(w: WalkerState, q: Pt, dt: number): boolean {
    const dx = q.x - w.x;
    const dy = q.y - w.y;
    const dist = Math.hypot(dx, dy);
    const step = w.speed * dt;
    if (dist <= step) {
      w.x = q.x;
      w.y = q.y;
      return true;
    }
    w.x += (dx / dist) * step;
    w.y += (dy / dist) * step;
    this.face(w, dx, dy);
    w.phase += dt * (w.speed / 5.5);
    w.frame = Math.floor(w.phase) & 3;
    return false;
  }

  private arrive(w: WalkerState): void {
    const g = w.cur;
    if (!g) {
      w.state = 'fade';
      return;
    }
    w.frame = 0;
    if (g.k === 'point') {
      w.state = 'idle';
      w.t = g.pause;
    } else if (g.k === 'door') {
      w.t = 0;
      if (g.door.id.startsWith('station')) {
        // escada da estação: anda até a borda e desce
        w.state = 'descend';
        w.sy = w.y;
        w.depth = w.sy;
      } else w.state = 'enter';
    } else if (g.k === 'bench' && w.seat) {
      w.state = 'sitDown';
      w.t = 0;
      w.facing = 'd';
      this.stats.sat++;
    } else if (g.k === 'bus') {
      w.state = 'waitBus';
      w.waitT = 0;
    } else {
      w.state = 'fade';
    }
  }

  private step(w: WalkerState, dt: number, vehicles: VehicleInfo[]): void {
    w.age += dt;
    if (w.alpha < 1 && w.state !== 'fade' && w.state !== 'enter') w.alpha = Math.min(1, w.alpha + dt * 2);
    switch (w.state) {
      case 'fade':
        w.alpha -= dt * 2.2;
        if (w.alpha <= 0) w.dead = true;
        break;
      case 'enter':
        w.t += dt;
        w.alpha = Math.max(0, 1 - w.t / 0.5);
        w.y -= 8 * dt;
        w.frame = Math.floor(w.t * 8) & 3;
        w.facing = 'u';
        if (w.t >= 0.5) {
          w.dead = true;
          this.stats.entered++;
        }
        break;
      case 'descend': {
        w.t += dt;
        w.facing = 'u';
        w.frame = Math.floor(w.t * 8) & 3;
        if (w.t < STAIR_WALK) {
          w.y = w.sy - STAIR_UP * (w.t / STAIR_WALK);
        } else {
          w.y = w.sy - STAIR_UP;
          w.lip = w.y;
          w.drop = Math.min(STAIR_DEPTH, ((w.t - STAIR_WALK) / STAIR_SINK) * STAIR_DEPTH);
          if (w.drop >= STAIR_DEPTH) {
            w.dead = true;
            this.stats.entered++;
          }
        }
        break;
      }
      case 'ascend': {
        w.t += dt;
        w.facing = 'd';
        w.frame = Math.floor(w.t * 8) & 3;
        if (w.t < STAIR_SINK) {
          w.drop = STAIR_DEPTH * (1 - w.t / STAIR_SINK);
        } else {
          w.drop = 0;
          w.lip = undefined;
          const k = Math.min(1, (w.t - STAIR_SINK) / STAIR_WALK);
          w.y = w.sy - STAIR_UP + STAIR_UP * k;
          if (k >= 1) {
            w.y = w.sy;
            this.nextGoal(w);
          }
        }
        break;
      }
      case 'exitDoor':
        w.t += dt;
        w.alpha = Math.min(1, w.t / 0.4);
        w.y += 12 * dt;
        w.facing = 'd';
        w.frame = Math.floor(w.t * 8) & 3;
        if (w.t >= 0.5) this.nextGoal(w);
        break;
      case 'idle':
        w.t -= dt;
        w.frame = 0;
        if (w.t <= 0) this.nextGoal(w);
        break;
      case 'sitDown': {
        w.t += dt;
        const s = w.seat!;
        if (w.t < 0.35) w.pose = 'crouch';
        else {
          w.pose = 'sit';
          const k = Math.min(1, (w.t - 0.35) / 0.25);
          w.x = s.approach.x + (s.feet.x - s.approach.x) * k;
          w.y = s.approach.y + (s.feet.y - s.approach.y) * k;
        }
        w.depth = w.pose === 'sit' ? s.depth : w.y;
        if (w.t >= 0.7) {
          w.state = 'seated';
          w.t = 8 + this.rnd() * 18;
        }
        break;
      }
      case 'seated':
        w.pose = 'sit';
        w.x = w.seat!.feet.x;
        w.y = w.seat!.feet.y;
        w.depth = w.seat!.depth;
        w.t -= dt;
        if (w.t <= 0) {
          w.state = 'standUp';
          w.t = 0;
        }
        break;
      case 'standUp': {
        w.t += dt;
        const s = w.seat!;
        if (w.t < 0.3) w.pose = 'crouch';
        else {
          const k = Math.min(1, (w.t - 0.3) / 0.25);
          w.x = s.feet.x + (s.approach.x - s.feet.x) * k;
          w.y = s.feet.y + (s.approach.y - s.feet.y) * k;
          w.pose = k >= 1 ? 'stand' : 'crouch';
        }
        w.depth = w.y;
        if (w.t >= 0.7) {
          w.pose = 'stand';
          w.depth = w.y;
          this.seats.delete(s.key);
          w.seat = null;
          this.nextGoal(w);
        }
        break;
      }
      case 'waitBus':
        w.waitT += dt;
        w.frame = 0;
        const stop = w.cur && w.cur.k === 'bus' ? w.cur.stop : null;
        const bus = stop ? this.dwell.find((d) => d.dir === stop.dir) : undefined;
        if (bus) {
          w.direct = { x: bus.x + (this.rnd() - 0.5) * 8, y: bus.y + (bus.dir > 0 ? -6 : 6) };
          w.state = 'toBus';
        } else if (w.waitT > 45) {
          w.goals = this.plan().filter((g) => g.k !== 'bus');
          if (!w.goals.length && this.map.portals.length) {
            const p = this.pick(this.map.portals);
            w.goals.push({ k: 'leave', x: p.x, y: p.y });
          }
          this.nextGoal(w);
        }
        break;
      case 'toBus':
        if (this.moveTo(w, w.direct!, dt)) {
          w.state = 'fade';
          this.stats.boarded++;
        }
        break;
      case 'alight':
        if (this.moveTo(w, w.direct!, dt)) {
          w.direct = null;
          this.nextGoal(w);
        }
        break;
      case 'walk': {
        const q = w.path[0];
        if (!q) {
          this.arrive(w);
          break;
        }
        let target = q;
        if (!w.crossOk) {
          const e = this.crossEntry(w, q);
          if (e) {
            if (Math.hypot(e.x - w.x, e.y - w.y) <= 1) {
              // na beira da faixa: espera os veículos passarem (e quem já está na faixa tem preferência)
              if (w.waitT >= 25) {
                this.giveUpCrossing(w);
                break;
              }
              if (this.blocked(vehicles)) {
                w.waitT += dt;
                w.frame = 0;
                break;
              }
              w.crossOk = true;
              w.waitT = 0;
              this.stats.crossings++;
              if (this.dwell.length) this.stats.crossingsDuringDwell++;
            } else target = e;
          }
        }
        if (this.moveTo(w, target, dt) && target === q) {
          w.path.shift();
          w.crossOk = false;
          if (!w.path.length) this.arrive(w);
        }
        break;
      }
    }
    if (w.pose === 'stand' && w.state !== 'descend' && w.state !== 'ascend') w.depth = w.y;
  }

  sprite(w: Walker): PersonSprite {
    if (w.pose === 'sit') return sitSprite(w.look);
    if (w.pose === 'crouch') return crouchSprite(w.look);
    return personSprite(w.look, w.facing, w.frame);
  }
}
