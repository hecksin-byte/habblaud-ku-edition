// Cenários de simulação do campus "KU Edition": carros, ônibus e pessoas juntos, com os invariantes que não podem quebrar
// (nada de atropelamento nem de carro parado sobre a faixa de pedestres, ninguém preso para sempre, bancos sem dois
// ocupantes, ninguém andando por onde não dá) e as combinações pedidas: atravessar com ônibus parado, fila chegando à
// faixa, entrar e sair de edifícios, sentar e levantar, embarcar e desembarcar.
import { describe, expect, it } from 'vitest';
import { findPath, nearestWalkable, walkable, type KuMap } from './ku-map';
import { KuPeople, type VehicleInfo } from './ku-people';
import { KuTraffic, halfLen, peoplePhase, type Car, type TrafficEnv } from './ku-traffic';

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELL = 8;
const W = 1024;
const H = 560;

interface TestWorld {
  map: KuMap;
  lanes: { y: number; dir: 1 | -1 }[];
  busStopX: number;
}

/** Mundo de teste: praça ao norte (com um edifício e bancos), calçada, rua de duas pistas com faixa de pedestres, calçada sul. */
function makeWorld(busStopX: number): TestWorld {
  const cols = W / CELL;
  const rows = H / CELL;
  const walk = new Uint8Array(cols * rows);
  const set = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let cy = Math.floor(y0 / CELL); cy < Math.ceil(y1 / CELL); cy++) for (let cx = Math.floor(x0 / CELL); cx < Math.ceil(x1 / CELL); cx++) walk[cy * cols + cx] = v;
  };
  const streetY0 = 280;
  const streetY1 = 360;
  set(0, 0, W, streetY0, 1); // praça + calçada norte
  set(0, streetY1, W, H - 8, 1); // calçada sul
  const cross = { x0: 496, x1: 536, y0: streetY0, y1: streetY1 };
  set(cross.x0, streetY0, cross.x1, streetY1, 1); // faixa de pedestres
  set(100, 40, 260, 120, 0); // edifício
  const benches = [
    { x: 340, y: 150, w: 48 },
    { x: 700, y: 180, w: 48 },
  ];
  for (const b of benches) set(b.x - 2, b.y - 8, b.x + b.w + 2, b.y + 14, 0);
  set(380, 60, 400, 80, 0); // um poste/árvore
  const doors = [
    { id: 'hall', x: 180, y: 128 },
    { id: 'station', x: 800, y: 386 },
  ];
  const portals = [
    { x: 6, y: 200 },
    { x: W - 6, y: 200 },
    { x: 6, y: 262 },
    { x: W - 6, y: 262 },
    { x: 6, y: 380 },
    { x: W - 6, y: 380 },
  ];
  const pois = [
    { x: 300, y: 100 },
    { x: 560, y: 120 },
    { x: 620, y: 220 },
    { x: 420, y: 230 },
    { x: 840, y: 100 },
    { x: 240, y: 240 },
    { x: 600, y: 400 },
    { x: 300, y: 400 },
  ];
  const map: KuMap = {
    cell: CELL,
    ox: 0,
    oy: 0,
    cols,
    rows,
    walk,
    doors,
    benches,
    crossing: cross,
    busStop: { x: busStopX, y: streetY1 + 14 },
    portals,
    pois,
  };
  return { map, lanes: [{ y: 300, dir: 1 }, { y: 342, dir: -1 }], busStopX };
}

interface Report {
  maxCarOverlap: number;
  carWalkerHits: number;
  boxBlockSeconds: number;
  maxStationary: number;
  maxWalkerAge: number;
  walkersInBlocked: number;
  seatConflicts: number;
  maxSeated: number;
  maxQueueOnCross: number;
  busesStopped: number;
}

function simulate(world: TestWorld, seed: number, seconds: number): { report: Report; people: KuPeople; traffic: KuTraffic } {
  const rnd = mulberry32(seed);
  const traffic = new KuTraffic(rnd);
  const people = new KuPeople(world.map, W * 2, rnd);
  const cross = world.map.crossing;
  const env = (crowded: boolean): TrafficEnv => ({ lanes: world.lanes, x0: -40, x1: W + 40, crossing: { x0: cross.x0, x1: cross.x1 }, crowded, busStopX: world.busStopX });
  const rep: Report = { maxCarOverlap: 0, carWalkerHits: 0, boxBlockSeconds: 0, maxStationary: 0, maxWalkerAge: 0, walkersInBlocked: 0, seatConflicts: 0, maxSeated: 0, maxQueueOnCross: 0, busesStopped: 0 };
  const stationary = new WeakMap<Car, number>();
  const seenStopped = new WeakSet<Car>();
  const dt = 1 / 20;
  let now = 0;
  const infos = (): VehicleInfo[] => traffic.cars.map((c) => ({ x: c.x, y: c.y, halfLen: halfLen(c), moving: !c.stopped && c.speed > 0.5 }));
  for (let step = 0; step < seconds / dt; step++) {
    now += dt * 1000;
    const phase = peoplePhase(now);
    traffic.update(now, dt, env(people.onCrossing(phase)), (x, y) => people.busArrived(x, y));
    people.update(dt, infos(), traffic.dwelling, phase);
    // invariantes de veículos
    const byLane = new Map<number, Car[]>();
    for (const c of traffic.cars) {
      (byLane.get(c.y) ?? byLane.set(c.y, []).get(c.y)!).push(c);
      if (c.bus && c.stopped && !seenStopped.has(c)) {
        seenStopped.add(c);
        rep.busesStopped++;
      }
      const stuck = c.speed < 0.5 && !(c.stopped && c.dwell > 0);
      const t = stuck ? (stationary.get(c) ?? 0) + dt : 0;
      stationary.set(c, t);
      rep.maxStationary = Math.max(rep.maxStationary, t);
      // parado em cima da faixa (corpo sobre ela por mais de 6 px)?
      const overlapDepth = Math.min(c.x + halfLen(c), cross.x1) - Math.max(c.x - halfLen(c), cross.x0);
      if (c.speed < 0.5 && overlapDepth > 6 && !(c.bus && c.dwell > 0)) rep.boxBlockSeconds += dt;
    }
    for (const list of byLane.values()) {
      list.sort((a, b) => a.x - b.x);
      for (let i = 0; i + 1 < list.length; i++) {
        const overlap = list[i].x + halfLen(list[i]) - (list[i + 1].x - halfLen(list[i + 1]));
        rep.maxCarOverlap = Math.max(rep.maxCarOverlap, overlap);
      }
      // fila que alcança a faixa
      const queued = list.filter((c) => c.speed < 0.5 && c.x + halfLen(c) > cross.x0 - 4 && c.x - halfLen(c) < cross.x1 + 4);
      rep.maxQueueOnCross = Math.max(rep.maxQueueOnCross, queued.length);
    }
    // invariantes de pessoas
    const seated: Record<string, number> = {};
    let seatedNow = 0;
    for (const w of people.walkers) {
      rep.maxWalkerAge = Math.max(rep.maxWalkerAge, w.age);
      const special = ['enter', 'exitDoor', 'toBus', 'alight', 'sitDown', 'seated', 'standUp', 'fade', 'waitBus'].includes(w.state);
      if (!special && !walkable(world.map, w.x, w.y)) rep.walkersInBlocked++;
      if (w.state === 'seated') {
        seatedNow++;
        const key = w.seat!.key;
        seated[key] = (seated[key] ?? 0) + 1;
        if (seated[key] > 1) rep.seatConflicts++;
      }
      // atropelamento = o centro da pessoa dentro do corpo do veículo (a pista vizinha não conta)
      if (w.state === 'walk' && w.x >= cross.x0 && w.x <= cross.x1 && w.y >= cross.y0 && w.y <= cross.y1) {
        for (const c of traffic.cars) {
          if (Math.abs(w.y - c.y) < 9 && Math.abs(w.x - c.x) < halfLen(c) - 2) rep.carWalkerHits++;
        }
      }
    }
    rep.maxSeated = Math.max(rep.maxSeated, seatedNow);
  }
  return { report: rep, people, traffic };
}

describe('mapa de caminhada', () => {
  it('encontra caminhos livres, atravessando a rua só pela faixa', () => {
    const { map } = makeWorld(300);
    const p = findPath(map, { x: 20, y: 200 }, { x: 900, y: 420 });
    expect(p).not.toBeNull();
    expect(p!.every((q) => walkable(map, q.x, q.y))).toBe(true);
    // o trecho que vai da calçada norte à sul fica dentro da faixa
    const inStreet = p!.filter((q) => q.y > map.crossing.y0 && q.y < map.crossing.y1);
    expect(inStreet.every((q) => q.x >= map.crossing.x0 && q.x <= map.crossing.x1)).toBe(true);
    expect(findPath(map, { x: 20, y: 200 }, { x: 150, y: 80 })).not.toBeNull(); // destino dentro de um obstáculo: usa a célula livre mais próxima
    expect(nearestWalkable(map, 150, 80)).not.toBeNull();
  });

  it('nenhum ponto de um caminho calculado fica numa célula bloqueada, nem a linha entre dois pontos', () => {
    const { map } = makeWorld(300);
    const rnd = mulberry32(99);
    for (let n = 0; n < 200; n++) {
      const a = { x: 10 + rnd() * (W - 20), y: 10 + rnd() * (H - 30) };
      const b = { x: 10 + rnd() * (W - 20), y: 10 + rnd() * (H - 30) };
      const pa = nearestWalkable(map, a.x, a.y);
      const pb = nearestWalkable(map, b.x, b.y);
      if (!pa || !pb) continue;
      const path = findPath(map, pa, pb);
      if (!path) continue;
      let prev = pa;
      for (const q of path) {
        const len = Math.hypot(q.x - prev.x, q.y - prev.y);
        for (let i = 0; i <= Math.ceil(len / 2); i++) {
          const t = len === 0 ? 0 : i / Math.ceil(len / 2);
          expect(walkable(map, prev.x + (q.x - prev.x) * t, prev.y + (q.y - prev.y) * t), `de ${prev.x},${prev.y} para ${q.x},${q.y}`).toBe(true);
        }
        prev = q;
      }
    }
  });
});

describe('trânsito e pedestres juntos', () => {
  // [nome, x do ponto de ônibus, máximo de desistências em 900 s]: nos dois últimos o ponto fica quase em cima da faixa (caso extremo)
  const cases: [string, number, number][] = [
    ['ponto de ônibus longe da faixa', 200, 12],
    ['ponto de ônibus colado na faixa (a fila chega nela)', 420, 40],
    ['ponto de ônibus logo depois da faixa', 380, 40],
  ];
  for (const [name, stopX, maxGiveUp] of cases) {
    it(`${name}: sem colisão, sem carro parado sobre a faixa, sem ninguém preso`, { timeout: 120_000 }, () => {
      const world = makeWorld(stopX);
      for (const seed of [1, 2, 3, 4]) {
        const { report, people } = simulate(world, seed * 7919, 900);
        expect(report.maxCarOverlap, `seed ${seed} veículos se sobrepõem`).toBeLessThan(1);
        expect(report.carWalkerHits, `seed ${seed} veículo passou por cima de pedestre`).toBe(0);
        expect(report.boxBlockSeconds, `seed ${seed} veículo parado em cima da faixa`).toBeLessThan(2);
        expect(report.maxStationary, `seed ${seed} veículo preso`).toBeLessThan(45);
        expect(report.walkersInBlocked, `seed ${seed} pessoa andando por obstáculo`).toBe(0);
        expect(report.seatConflicts, `seed ${seed} dois ocupantes no mesmo assento`).toBe(0);
        expect(report.maxWalkerAge, `seed ${seed} pedestre preso`).toBeLessThan(400);
        expect(people.stats.gaveUp, `seed ${seed} pedestres desistiram demais de atravessar`).toBeLessThanOrEqual(maxGiveUp);
      }
    });
  }

  it('exercita todas as combinações pedidas (parar no ponto, atravessar durante a parada, sentar, entrar, embarcar, desembarcar)', { timeout: 240_000 }, () => {
    const world = makeWorld(380);
    let crossingsDuringDwell = 0;
    let busesStopped = 0;
    let boarded = 0;
    let alighted = 0;
    let sat = 0;
    let entered = 0;
    let fromDoors = 0;
    for (const seed of [11, 22, 33, 44, 55, 66]) {
      const { report, people } = simulate(world, seed * 104729, 1800);
      crossingsDuringDwell += people.stats.crossingsDuringDwell;
      busesStopped += report.busesStopped;
      boarded += people.stats.boarded;
      alighted += people.stats.alighted;
      sat += people.stats.sat;
      entered += people.stats.entered;
      fromDoors += people.stats.fromDoors;
      expect(report.maxCarOverlap).toBeLessThan(1);
      expect(report.carWalkerHits).toBe(0);
      expect(report.boxBlockSeconds).toBeLessThan(2);
      expect(report.seatConflicts).toBe(0);
    }
    expect(busesStopped).toBeGreaterThan(5);
    expect(crossingsDuringDwell).toBeGreaterThan(0); // atravessaram com um ônibus parado no ponto
    expect(boarded).toBeGreaterThan(0);
    expect(alighted).toBeGreaterThan(0);
    expect(sat).toBeGreaterThan(10);
    expect(entered).toBeGreaterThan(10);
    expect(fromDoors).toBeGreaterThan(10);
  });

  it('quem não consegue atravessar não fica parado para sempre', () => {
    const world = makeWorld(200);
    // tráfego sem trégua: um veículo sempre sobre a faixa
    const people = new KuPeople(world.map, W * 2, mulberry32(5));
    const cross = world.map.crossing;
    const veh = (): VehicleInfo[] => [{ x: (cross.x0 + cross.x1) / 2, y: 300, halfLen: 18, moving: true }];
    for (let i = 0; i < 20 * 120; i++) people.update(1 / 20, veh(), null, false);
    expect(Math.max(0, ...people.walkers.map((w) => w.waitT))).toBeLessThanOrEqual(25.1);
  });
});
