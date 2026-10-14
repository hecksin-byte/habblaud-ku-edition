// Parentesco entre sessões do Claude Code: uma sessão bifurcada (fork, "Retomar como cópia", /branch...) começa com a
// CÓPIA do histórico da original, com os mesmos `uuid` nas mensagens. Comparando o começo do transcript com o das outras
// sessões da mesma pasta de projeto dá para dizer de qual sessão ela saiu, sem depender de um campo que o Claude Code
// pode mudar. Só lê o começo de cada arquivo (e o título no fim), e guarda o resultado até o arquivo mudar.
import { closeSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const HEAD_BYTES = 192 * 1024;
const TAIL_BYTES = 128 * 1024;
const HEAD_LINES = 80;
/** Mensagens em comum a partir das quais duas sessões contam como parentes (uma só pode ser coincidência de meta-registros). */
const MIN_SHARED = 3;

export interface SessionHead {
  sessionId: string;
  /**
   * Quando o arquivo foi criado (epoch ms). É o que separa o original da cópia: o fork copia as mensagens com os mesmos
   * `timestamp`, então o horário dentro do arquivo é igual nos dois. 0 se o sistema não informa.
   */
  bornAt: number;
  /** `uuid` das primeiras mensagens de conversa (usuário e assistente). */
  uuids: string[];
  title?: string;
}

export interface ForkOf {
  sessionId: string;
  title?: string;
  /** Os ancestrais acima do pai, do mais próximo ao mais antigo (a cadeia original → fork → fork do fork). */
  ancestors?: { sessionId: string; title?: string }[];
}

const MAX_ANCESTORS = 6;

function readRange(path: string, start: number, length: number): string {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(length);
    const n = readSync(fd, buf, 0, length, start);
    return buf.toString('utf8', 0, n);
  } finally {
    closeSync(fd);
  }
}

/** Primeiros uuids de conversa, primeiro timestamp e (se houver) o título dado pelo usuário ou pela IA. */
export function parseHead(sessionId: string, headText: string, tailText = '', bornAt = 0): SessionHead {
  const uuids: string[] = [];
  let title: string | undefined;
  const lines = headText.split('\n');
  for (const line of lines.slice(0, HEAD_LINES)) {
    if (!line.startsWith('{')) continue;
    try {
      const j = JSON.parse(line) as { type?: string; uuid?: string; isSidechain?: boolean };
      if ((j.type === 'user' || j.type === 'assistant') && typeof j.uuid === 'string' && !j.isSidechain) uuids.push(j.uuid);
    } catch {
      // linha cortada no fim da janela
    }
  }
  // O título pode estar em qualquer ponto: o último "customTitle"/"aiTitle" do fim do arquivo vale mais que o do começo.
  for (const text of [tailText, headText]) {
    const m = [...text.matchAll(/"(?:customTitle|aiTitle)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].pop();
    if (m) {
      try {
        title = JSON.parse(`"${m[1]}"`) as string;
      } catch {
        title = m[1];
      }
      break;
    }
  }
  return { sessionId, bornAt, uuids, ...(title ? { title } : {}) };
}

/**
 * De qual das `others` a sessão `me` foi bifurcada: a que começou antes e tem mais mensagens iguais às dela (a mais recente
 * em caso de empate, que é o elo imediato numa cadeia A → B → C). undefined se `me` não parece cópia de nenhuma.
 */
export function findParent(me: SessionHead, others: readonly SessionHead[]): SessionHead | undefined {
  const mine = new Set(me.uuids);
  let best: SessionHead | undefined;
  let bestShared = 0;
  for (const o of others) {
    if (o.sessionId === me.sessionId) continue;
    if (!(o.bornAt > 0 && me.bornAt > 0 && o.bornAt < me.bornAt)) continue; // o pai é sempre o arquivo mais antigo
    let shared = 0;
    for (const u of o.uuids) if (mine.has(u)) shared++;
    if (shared < MIN_SHARED) continue;
    if (shared > bestShared || (shared === bestShared && best && o.bornAt > best.bornAt)) {
      best = o;
      bestShared = shared;
    }
  }
  return best;
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  head: SessionHead;
}

/** Lê e guarda o começo dos transcripts de uma pasta de projeto e responde "de quem esta sessão é fork". */
export class SessionLineage {
  private cache = new Map<string, CacheEntry>();

  private headOf(path: string): SessionHead | undefined {
    let st;
    try {
      st = statSync(path);
    } catch {
      return undefined;
    }
    const hit = this.cache.get(path);
    if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.head;
    try {
      const sessionId = basename(path, '.jsonl');
      const head = readRange(path, 0, Math.min(st.size, HEAD_BYTES));
      const tail = st.size > HEAD_BYTES ? readRange(path, Math.max(0, st.size - TAIL_BYTES), TAIL_BYTES) : '';
      const parsed = parseHead(sessionId, head, tail, st.birthtimeMs || st.ctimeMs);
      this.cache.set(path, { mtimeMs: st.mtimeMs, size: st.size, head: parsed });
      return parsed;
    } catch {
      return undefined;
    }
  }

  /** `transcriptPath` = o .jsonl da sessão; compara com os outros .jsonl da mesma pasta. */
  forkOf(transcriptPath: string): ForkOf | undefined {
    const me = this.headOf(transcriptPath);
    if (!me || me.uuids.length < MIN_SHARED) return undefined;
    const dir = dirname(transcriptPath);
    let names: string[];
    try {
      names = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    } catch {
      return undefined;
    }
    const others: SessionHead[] = [];
    for (const f of names) {
      const p = join(dir, f);
      if (p === transcriptPath) continue;
      const h = this.headOf(p);
      if (h) others.push(h);
    }
    const parent = findParent(me, others);
    if (!parent) return undefined;
    const ancestors: { sessionId: string; title?: string }[] = [];
    let cur: SessionHead = parent;
    const seen = new Set([me.sessionId, parent.sessionId]);
    while (ancestors.length < MAX_ANCESTORS) {
      const up = findParent(cur, others.filter((o) => !seen.has(o.sessionId)));
      if (!up) break;
      seen.add(up.sessionId);
      ancestors.push({ sessionId: up.sessionId, ...(up.title ? { title: up.title } : {}) });
      cur = up;
    }
    return { sessionId: parent.sessionId, ...(parent.title ? { title: parent.title } : {}), ...(ancestors.length ? { ancestors } : {}) };
  }
}
