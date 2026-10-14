// De qual sessão cada agente principal saiu (fork) e quantos forks saíram dele, para a lista e a gaveta. O servidor só manda
// `forkOf` (sessão de origem e o título dela, AgentInfo.forkOf); aqui se junta com os agentes que estão no escritório.
import type { AgentInfo } from '../../../shared/types';
import { tr } from '../../../shared/i18n';

export interface ForkInfo {
  /** Texto curto: "↳ Fork de Han Ji-su · Origem de 2 forks". */
  text: string;
  /** Detalhe para a dica: título da origem e os ids de sessão. */
  title: string;
  /** O agente de origem mais próximo que está no escritório (o pai ou um ancestral), para ir até ele. */
  parent?: AgentInfo;
  /** Quantos agentes do escritório saíram desta sessão (fork direto ou fork de fork). */
  children: number;
}

export const shortSessionId = (a: Pick<AgentInfo, 'sessionId'>): string => a.sessionId.slice(0, 8);

/** null quando o agente não é fork nem tem fork (ou não é principal). */
export function forkInfo(a: AgentInfo, agents: readonly AgentInfo[]): ForkInfo | null {
  if (a.kind !== 'main') return null;
  const chain = a.forkOf ? [a.forkOf, ...(a.forkOf.ancestors ?? [])] : [];
  const open = (sessionId: string) => agents.find((x) => x.kind === 'main' && x.id !== a.id && x.sessionId === sessionId);
  // O pai (ou, se ele já não está no escritório, o ancestral mais próximo que está).
  const parentIdx = chain.findIndex((c) => open(c.sessionId));
  const parent = parentIdx >= 0 ? open(chain[parentIdx].sessionId) : undefined;
  // Todos os que saíram desta sessão, direto ou por forks no meio (a cadeia de cada um traz os ancestrais).
  const children = agents.filter(
    (x) => x.kind === 'main' && x.id !== a.id && !!x.forkOf && (x.forkOf.sessionId === a.sessionId || !!x.forkOf.ancestors?.some((s) => s.sessionId === a.sessionId)),
  ).length;
  if (!a.forkOf && !children) return null;
  const parts: string[] = [];
  const lines: string[] = [];
  if (a.forkOf) {
    const origin = a.forkOf.title?.trim();
    if (parent && parentIdx === 0) parts.push(tr('Fork de {0}', [parent.name]));
    else if (parent) parts.push(origin ? tr('Fork de “{0}” (original: {1})', [origin, parent.name]) : tr('Fork de outra sessão (original: {0})', [parent.name]));
    else parts.push(origin ? tr('Fork de “{0}”', [origin]) : tr('Fork de outra sessão'));
    lines.push(
      tr('Começou como cópia da sessão {0}{1}.', [a.forkOf.sessionId.slice(0, 8), origin ? ` (“${origin}”)` : '']) + (parent && parentIdx === 0 ? ` ${tr('É {0}.', [parent.name])}` : ''),
    );
    if (chain.length > 1) {
      const names = chain.map((c) => open(c.sessionId)?.name ?? c.title?.trim() ?? c.sessionId.slice(0, 8));
      lines.push(tr('Cadeia de forks: {0}', [[...names.reverse(), a.name].join(' → ')]));
    }
  }
  if (children) {
    parts.push(tr('Origem de {0} fork(s)', [children]));
    lines.push(tr('{0} sessão(ões) do escritório começaram como cópia desta.', [children]));
  }
  lines.push(tr('Sessão {0}', [shortSessionId(a)]));
  return { text: `↳ ${parts.join(' · ')}`, title: lines.join('\n'), ...(parent ? { parent } : {}), children };
}
