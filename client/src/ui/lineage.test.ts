import { describe, expect, it } from 'vitest';
import type { AgentInfo } from '../../../shared/types';
import { forkInfo } from './lineage';

const a = (id: string, over: Partial<AgentInfo> = {}): AgentInfo => ({ id, kind: 'main', name: id, sessionId: `${id}-0000-aaaa`, ...over }) as AgentInfo;

describe('forkInfo', () => {
  it('quem não é fork nem tem fork não mostra nada (nem subagentes)', () => {
    expect(forkInfo(a('x'), [a('x'), a('y')])).toBeNull();
    expect(forkInfo(a('s', { kind: 'sub', forkOf: { sessionId: 'x-0000-aaaa' } }), [])).toBeNull();
  });

  it('fork cuja origem está no escritório: cita o nome e dá o agente para ir até ele', () => {
    const pai = a('Ana');
    const filho = a('Bia', { forkOf: { sessionId: pai.sessionId, title: 'Plano' } });
    const i = forkInfo(filho, [pai, filho])!;
    expect(i.text).toBe('↳ Fork de Ana');
    expect(i.parent?.id).toBe('Ana');
    expect(i.title).toContain('Ana');
    expect(i.title).toContain('Bia-0000'); // id curto da própria sessão
    const orig = forkInfo(pai, [pai, filho])!;
    expect(orig.text).toBe('↳ Origem de 1 fork(s)');
    expect(orig.children).toBe(1);
  });

  it('origem fora do escritório: usa o título; sem título, diz que é de outra sessão; cadeia mostra os dois lados', () => {
    const f1 = a('Bia', { forkOf: { sessionId: 'sumiu-1234', title: 'Plano da pesquisa' } });
    expect(forkInfo(f1, [f1])!.text).toBe('↳ Fork de “Plano da pesquisa”');
    expect(forkInfo(f1, [f1])!.parent).toBeUndefined();
    expect(forkInfo(a('Cai', { forkOf: { sessionId: 'sumiu-1234' } }), [])!.text).toBe('↳ Fork de outra sessão');
    const meio = a('Meio', { forkOf: { sessionId: 'raiz-1' } });
    // o pai imediato já fechou, mas um ancestral está no escritório: cita os dois
    const raiz = a('Raiz');
    const neto = a('Neto', { forkOf: { sessionId: 'meio-fechado', title: 'Plano (fork)', ancestors: [{ sessionId: raiz.sessionId, title: 'Plano' }] } });
    const n = forkInfo(neto, [raiz, neto])!;
    expect(n.text).toBe('↳ Fork de “Plano (fork)” (original: Raiz)');
    expect(n.parent?.id).toBe('Raiz');
    expect(n.title).toContain('Raiz → Plano (fork) → Neto');
    // a raiz conta o neto, mesmo com o fork do meio já fora do escritório
    expect(forkInfo(raiz, [raiz, neto])!.children).toBe(1);
    expect(forkInfo(raiz, [raiz, neto])!.text).toBe('↳ Origem de 1 fork(s)');
    const ponta = a('Ponta', { forkOf: { sessionId: meio.sessionId } });
    expect(forkInfo(meio, [meio, ponta])!.text).toBe('↳ Fork de outra sessão · Origem de 1 fork(s)');
  });
});
