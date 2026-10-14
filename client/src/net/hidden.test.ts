import { describe, expect, it } from 'vitest';
import type { AgentInfo, OfficeSnapshot, RoomInfo } from '../../../shared/types';
import { canArchive, filterSnapshot, NO_HIDE, sessionKey } from './hidden';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

function agent(id: string, over: Partial<AgentInfo> = {}): AgentInfo {
  return {
    id,
    kind: 'main',
    roomId: 'r1',
    name: id,
    look: 'f',
    role: 'Agente principal',
    sessionId: `s-${id}`,
    account: '.claude',
    status: 'idle',
    recent: [],
    tasks: [],
    startedAt: NOW - 10 * DAY,
    lastEventAt: NOW - 10 * DAY,
    statusSince: NOW - 10 * DAY,
    stats: {},
    ...over,
  } as AgentInfo;
}

const room = (id: string): RoomInfo => ({ id, name: id, path: `/p/${id}`, slot: 0, seed: 1, createdAt: NOW - 20 * DAY });

function snap(agents: AgentInfo[], rooms: RoomInfo[] = [room('r1')]): OfficeSnapshot {
  return { rev: 1, serverTime: NOW, rooms, agents, accounts: [], meta: { demo: false, sources: [], startedAt: 1, version: '0' } } as OfficeSnapshot;
}

describe('agentes fora da tela', () => {
  it('sem filtro nada muda (e devolve o mesmo snapshot)', () => {
    const s = snap([agent('a')]);
    const r = filterSnapshot(s, NO_HIDE);
    expect(r.snap).toBe(s);
    expect([r.archived, r.idle]).toEqual([0, 0]);
  });

  it('arquivado some pela sessão (não pelo id, que muda quando o processo reinicia) e leva os subagentes', () => {
    const a = agent('.claude:100');
    const sub = agent('s-.claude:100:x', { kind: 'sub', parentId: a.id, sessionId: a.sessionId });
    const other = agent('.claude:200', { roomId: 'r2' });
    const s = snap([a, sub, other], [room('r1'), room('r2')]);
    const archived = new Set([sessionKey(a)]);
    const r = filterSnapshot(s, { archived, idleDays: 0 });
    expect(r.snap.agents.map((x) => x.id)).toEqual(['.claude:200']);
    expect(r.snap.rooms.map((x) => x.id)).toEqual(['r2']); // a sala que ficou vazia sai junto
    expect(r.archived).toBe(1);
    // o processo reiniciou: outro id, mesma sessão, continua arquivado
    const again = filterSnapshot(snap([agent('.claude:999', { sessionId: a.sessionId })]), { archived, idleDays: 0 });
    expect(again.snap.agents).toEqual([]);
  });

  it('parado há N dias some; trabalhando, esperando você ou recém-ativo, não', () => {
    const old = (id: string, over: Partial<AgentInfo>) => agent(id, { lastEventAt: NOW - 4 * DAY, ...over });
    const s = snap([
      old('idle-old', { status: 'idle' }),
      old('done-old', { status: 'done' }),
      old('working-old', { status: 'working' }),
      old('waiting-old', { status: 'waiting' }),
      agent('idle-recent', { status: 'idle', lastEventAt: NOW - 2 * DAY }),
    ]);
    const r = filterSnapshot(s, { archived: new Set(), idleDays: 3 });
    expect(r.snap.agents.map((a) => a.id)).toEqual(['working-old', 'waiting-old', 'idle-recent']);
    expect(r.idle).toBe(2);
    expect(filterSnapshot(s, { archived: new Set(), idleDays: 7 }).snap.agents).toHaveLength(5);
  });

  it('a idade vem da última atividade, não do último evento (que o servidor renova ao reler a sessão)', () => {
    const act = (days: number) => ({ at: NOW - days * DAY, kind: 'text', label: 'x' }) as unknown as AgentInfo['activity'];
    const s = snap([
      agent('velho', { lastEventAt: NOW, activity: act(5) }),
      agent('novo', { lastEventAt: NOW, activity: act(0.5) }),
      agent('sem-atividade', { lastEventAt: NOW - 5 * DAY }),
    ]);
    const r = filterSnapshot(s, { archived: new Set(), idleDays: 3 });
    expect(r.snap.agents.map((x) => x.id)).toEqual(['novo']);
  });

  it('sala que já estava vazia não é tocada; sala com agente que sobrou fica', () => {
    const s = snap(
      [agent('a', { lastEventAt: NOW - 9 * DAY }), agent('b', { roomId: 'r2', lastEventAt: NOW }), agent('c', { roomId: 'r3', lastEventAt: NOW - 9 * DAY })],
      [room('r1'), room('r2'), room('r3'), room('r4')],
    );
    const r = filterSnapshot(s, { archived: new Set(), idleDays: 1 });
    expect(r.snap.agents.map((a) => a.id)).toEqual(['b']);
    // r1 só tinha 'a' e r3 só tinha 'c' (os dois escondidos): saem; r2 tem 'b'; r4 estava vazia desde o início e fica
    expect(r.snap.rooms.map((x) => x.id)).toEqual(['r2', 'r4']);
  });

  it('só agentes principais parados podem ser arquivados', () => {
    expect(canArchive(agent('a', { status: 'idle' }))).toBe(true);
    expect(canArchive(agent('a', { status: 'done' }))).toBe(true);
    expect(canArchive(agent('a', { status: 'offline' }))).toBe(true);
    expect(canArchive(agent('a', { status: 'working' }))).toBe(false);
    expect(canArchive(agent('a', { status: 'waiting' }))).toBe(false);
    expect(canArchive(agent('a', { status: 'idle', parentId: 'p' }))).toBe(false);
  });
});
