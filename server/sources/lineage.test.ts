import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../test/fixtures';
import { findParent, parseHead, SessionLineage, type SessionHead } from './lineage';

const line = (type: string, uuid: string, extra: object = {}) => JSON.stringify({ type, uuid, timestamp: '2026-10-05T05:05:34.495Z', ...extra });
const convo = (ids: string[]) => ids.map((id, i) => line(i % 2 ? 'assistant' : 'user', id)).join('\n') + '\n';
const head = (sessionId: string, bornAt: number, uuids: string[]): SessionHead => ({ sessionId, bornAt, uuids });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('parentesco entre sessões', () => {
  it('parseHead pega só as mensagens de conversa (nada de subagentes) e o último título', () => {
    const text = [line('queue-operation', 'q1'), line('user', 'u1'), line('attachment', 'a1'), line('assistant', 'm1'), line('assistant', 'side', { isSidechain: true }), 'linha cortada {"ty'].join('\n');
    const tail = `${JSON.stringify({ type: 'ai-title', aiTitle: 'Título velho' })}\n${JSON.stringify({ type: 'custom-title', customTitle: 'Título “novo”' })}\n`;
    const h = parseHead('s1', text, tail, 42);
    expect(h).toEqual({ sessionId: 's1', bornAt: 42, uuids: ['u1', 'm1'], title: 'Título “novo”' });
    expect(parseHead('s2', text).title).toBeUndefined();
  });

  it('o pai é o arquivo mais antigo com mais mensagens em comum; cadeia A → B → C acha o elo imediato', () => {
    const A = head('A', 1, ['1', '2', '3', '4']);
    const B = head('B', 2, ['1', '2', '3', '4', '5', '6']);
    const C = head('C', 3, ['1', '2', '3', '4', '5', '6', '7']);
    expect(findParent(A, [B, C])).toBeUndefined(); // o original não é fork de ninguém
    expect(findParent(B, [A, C])?.sessionId).toBe('A');
    expect(findParent(C, [A, B])?.sessionId).toBe('B');
  });

  it('poucas mensagens em comum, ou sem data de criação, não contam como fork', () => {
    const me = head('me', 5, ['1', '2', '3']);
    expect(findParent(me, [head('x', 1, ['1', '2', '9'])])).toBeUndefined();
    expect(findParent(me, [head('y', 0, ['1', '2', '3'])])).toBeUndefined();
    expect(findParent(me, [head('z', 9, ['1', '2', '3'])])).toBeUndefined(); // mais novo que eu
  });

  it('SessionLineage lê a pasta de projeto: o fork aponta a original e leva o título dela', async () => {
    const tmp = tempDir();
    const base = ['a1', 'a2', 'a3', 'a4', 'a5'];
    const titled = convo(base) + JSON.stringify({ type: 'custom-title', customTitle: 'Plano da pesquisa' }) + '\n';
    writeFileSync(join(tmp.dir, 'orig.jsonl'), titled);
    await sleep(30); // o arquivo do fork é criado depois: é o que separa original e cópia
    writeFileSync(join(tmp.dir, 'fork.jsonl'), convo([...base, 'f6', 'f7']));
    writeFileSync(join(tmp.dir, 'outra.jsonl'), convo(['z1', 'z2', 'z3', 'z4']));
    const lin = new SessionLineage();
    expect(lin.forkOf(join(tmp.dir, 'fork.jsonl'))).toEqual({ sessionId: 'orig', title: 'Plano da pesquisa' });
    await sleep(30);
    writeFileSync(join(tmp.dir, 'neto.jsonl'), convo([...base, 'f6', 'f7', 'n8']));
    // cadeia orig → fork → neto: o pai do neto é o fork e o ancestral é a original
    expect(lin.forkOf(join(tmp.dir, 'neto.jsonl'))).toEqual({ sessionId: 'fork', ancestors: [{ sessionId: 'orig', title: 'Plano da pesquisa' }] });
    expect(lin.forkOf(join(tmp.dir, 'orig.jsonl'))).toBeUndefined();
    expect(lin.forkOf(join(tmp.dir, 'outra.jsonl'))).toBeUndefined();
    expect(lin.forkOf(join(tmp.dir, 'nao-existe.jsonl'))).toBeUndefined();
    tmp.cleanup();
  });
});
