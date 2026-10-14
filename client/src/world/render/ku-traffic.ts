// Trânsito do campus "KU Edition": carros e ônibus que passam pelas pistas, mantêm distância, cedem a vez a quem está na
// faixa de pedestres, não ficam parados em cima dela e param no ponto de ônibus. Lógica pura (testada em ku-sim.test.ts).

export type BusKind = 'trunk' | 'branch' | 'village' | 'shuttle';
export const BUS_KINDS: BusKind[] = ['trunk', 'branch', 'village', 'shuttle'];
const BUS_LEN: Record<BusKind, number> = { trunk: 112, branch: 104, village: 74, shuttle: 88 };
export const busLength = (k: BusKind): number => BUS_LEN[k];
const CAR_HALF = 18;

export interface Car {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  variant: number;
  /** Metade do comprimento (px). */
  half: number;
  /** Ônibus (carros comuns não têm). */
  bus?: BusKind;
  /** Velocidade de cruzeiro; `dwell` > 0 = parado no ponto; -1 = já parou lá. */
  cruise: number;
  dwell: number;
  stopped: boolean;
}

export interface TrafficEnv {
  lanes: { y: number; dir: 1 | -1 }[];
  x0: number;
  x1: number;
  /** Faixa de pedestres (px de mundo, em x) e se há gente nela. */
  crossing: { x0: number; x1: number } | null;
  crowded: boolean;
  /** Ponto de ônibus (x) ou null. */
  busStopX: number | null;
}

export const halfLen = (c: Car): number => c.half;

/** Ciclo da faixa de pedestres (s): os primeiros segundos são dos pedestres, o resto dos veículos. */
export const CROSSING_CYCLE = 16;
export const CROSSING_PEOPLE_SECONDS = 7;
export const peoplePhase = (nowMs: number): boolean => (nowMs / 1000) % CROSSING_CYCLE < CROSSING_PEOPLE_SECONDS;

export class KuTraffic {
  cars: Car[] = [];
  /** Ônibus parado no ponto agora (para quem espera embarcar). */
  dwelling: { x: number; y: number } | null = null;
  private nextCarAt = 0;

  constructor(private readonly rnd: () => number = Math.random) {}

  update(now: number, dt: number, env: TrafficEnv, onBusArrived: (x: number, y: number) => void): void {
    const step = Math.min(dt, 0.1);
    if (now >= this.nextCarAt) {
      this.nextCarAt = now + 3500 + this.rnd() * 7500;
      const lane = env.lanes[Math.floor(this.rnd() * env.lanes.length)];
      if (lane) {
        const sx = lane.dir > 0 ? env.x0 : env.x1;
        const bus: BusKind | undefined = this.rnd() < 0.4 ? BUS_KINDS[Math.floor(this.rnd() * BUS_KINDS.length)] : undefined;
        const clear = !this.cars.some((c) => c.y === lane.y && Math.abs(c.x - sx) < 150);
        if (clear) {
          const cruise = bus ? 30 + this.rnd() * 14 : 38 + this.rnd() * 30;
          this.cars.push({ x: sx, y: lane.y, dir: lane.dir, speed: cruise, cruise, variant: Math.floor(this.rnd() * 6), half: bus ? BUS_LEN[bus] / 2 : CAR_HALF, bus, dwell: 0, stopped: false });
        }
      }
    }
    let dwelling: Car | null = null;
    const cross = env.crossing;
    for (const car of this.cars) {
      const half = halfLen(car);
      // parada no ponto: ônibus da pista de baixo (sentido oeste) para, deixa e pega passageiros
      if (car.bus && env.busStopX !== null && car.dir < 0 && car.dwell >= 0) {
        const target = env.busStopX + 8;
        const dist = car.x - target;
        if (car.dwell === 0 && dist > 0 && dist < 70) car.speed = Math.min(car.speed, Math.max(6, car.cruise * (dist / 70)));
        if (car.dwell === 0 && dist <= 0) {
          car.x = target;
          car.stopped = true;
          car.speed = 0;
          car.dwell = 5 + this.rnd() * 3;
          onBusArrived(target, car.y);
        }
      }
      if (car.stopped) {
        if (car.dwell > 0) {
          car.dwell -= step;
          dwelling = car;
          if (car.dwell <= 0) {
            car.stopped = false;
            car.dwell = -1;
            car.speed = 4;
          }
        }
        continue;
      }
      // quem vem à frente na mesma pista
      let lead: Car | null = null;
      let gap = Infinity;
      for (const o of this.cars) {
        if (o === car || o.y !== car.y) continue;
        const d = (o.x - car.x) * car.dir;
        if (d <= 0) continue;
        const g = d - half - halfLen(o);
        if (g < gap) {
          gap = g;
          lead = o;
        }
      }
      let hold = false;
      if (cross) {
        const zStart = car.dir > 0 ? cross.x0 : cross.x1;
        const zEnd = car.dir > 0 ? cross.x1 : cross.x0;
        const frontToZone = (zStart - (car.x + car.dir * half)) * car.dir; // > 0: ainda não chegou na faixa
        // cede a vez a quem está na faixa
        if (env.crowded && frontToZone > -2 && frontToZone < 44) hold = true;
        // não entra na faixa se não houver espaço para sair dela do outro lado (nada de parar em cima da faixa)
        if (!hold && lead && frontToZone > -2 && frontToZone < 14) {
          const leadRear = lead.x - lead.dir * halfLen(lead);
          const room = (leadRear - zEnd) * car.dir;
          // o da frente está parado, devagar ou prestes a parar no ponto de ônibus
          const leadToStop = lead.bus && lead.dir < 0 && env.busStopX !== null && lead.dwell === 0 && lead.x - (env.busStopX + 8) > -2 && lead.x - (env.busStopX + 8) < 150;
          const leadSlow = lead.stopped || lead.speed < car.cruise * 0.9 || !!leadToStop;
          if (leadSlow && room < 2 * half + 8) hold = true;
        }
      }
      if (hold || (lead && gap < 10)) {
        car.speed = 0;
        continue;
      }
      if (lead && gap < 40) car.speed = Math.min(car.speed, car.cruise * (gap / 40));
      else if (car.speed < car.cruise) car.speed = Math.min(car.cruise, car.speed + 40 * step);
      car.x += car.dir * car.speed * step;
    }
    this.dwelling = dwelling ? { x: dwelling.x, y: dwelling.y } : null;
    if (this.cars.length) this.cars = this.cars.filter((c) => c.x >= env.x0 - 140 && c.x <= env.x1 + 140);
  }
}
