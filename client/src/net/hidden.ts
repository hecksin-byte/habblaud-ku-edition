// Agentes que o escritório tira da tela sem mexer na sessão: os arquivados (um clique no botão do agente) e, se o usuário
// quiser, os que estão parados há dias. É só uma visão: o servidor, a sessão do Claude Code e o histórico não mudam, e
// o agente volta sozinho quando fizer algo de novo (parado há muito tempo) ou quando for trazido de volta (arquivado).
import type { AgentInfo, OfficeSnapshot } from '../../../shared/types';

const DAY_MS = 86_400_000;

/** Opções de "ocultar parados há N dias" (0 = nunca). */
export const IDLE_HIDE_DAYS = [0, 1, 3, 7] as const;
export type IdleHideDays = (typeof IDLE_HIDE_DAYS)[number];

/** Um agente arquivado (guardamos o nome para listá-lo mesmo quando a sessão não está mais no escritório). */
export interface ArchivedEntry {
  key: string;
  name: string;
  room: string;
  at: number;
}

export interface HideFilter {
  archived: ReadonlySet<string>;
  idleDays: number;
  /** Nomes que o usuário deu às contas (AccountInfo.id -> nome): só a tela muda, o servidor segue mandando o nome dele. */
  accountNames?: Readonly<Record<string, string>>;
}

export const NO_HIDE: HideFilter = { archived: new Set(), idleDays: 0 };

/** Nome de uma conta que o usuário escolheu (sem espaços sobrando), ou undefined. */
export function customAccountName(names: HideFilter['accountNames'], id: string): string | undefined {
  const n = names?.[id]?.trim();
  return n ? n : undefined;
}

/** Aplica os nomes escolhidos às contas; devolve o mesmo array se nenhuma foi renomeada. */
function renameAccounts(accounts: OfficeSnapshot['accounts'], names: HideFilter['accountNames']): OfficeSnapshot['accounts'] {
  if (!names || !accounts.some((a) => customAccountName(names, a.id))) return accounts;
  return accounts.map((a) => {
    const n = customAccountName(names, a.id);
    return n ? { ...a, name: n } : a;
  });
}

/** Chave estável da sessão: o id do agente principal muda quando o processo reinicia, a sessão não. */
export function sessionKey(a: Pick<AgentInfo, 'account' | 'sessionId'>): string {
  return `${a.account}|${a.sessionId}`;
}

/**
 * Quando o agente fez algo de verdade pela última vez. `lastEventAt` não serve: o servidor o atualiza sempre que relê a
 * sessão (ao reiniciar, por exemplo), e todo agente pareceria ter acabado de agir.
 */
export function lastActiveAt(a: AgentInfo): number {
  return a.activity?.at ?? a.lastEventAt;
}

/** Só agentes principais parados (nada de trabalhando, esperando você ou rodando um shell) podem ser arquivados. */
export function canArchive(a: AgentInfo): boolean {
  return !a.parentId && (a.status === 'idle' || a.status === 'done' || a.status === 'offline');
}

export interface FilterResult {
  snap: OfficeSnapshot;
  /** Quantos agentes principais ficaram de fora por terem sido arquivados / por estarem parados há muito tempo. */
  archived: number;
  idle: number;
}

/**
 * O snapshot que o escritório mostra: sem os arquivados, sem os parados há `idleDays` dias ou mais (pela última atividade
 * da sessão), sem os subagentes deles e sem as salas que ficaram vazias por causa disso.
 */
export function filterSnapshot(snap: OfficeSnapshot, f: HideFilter): FilterResult {
  const limit = f.idleDays > 0 ? f.idleDays * DAY_MS : 0;
  const hiddenMain = new Set<string>();
  let archived = 0;
  let idle = 0;
  for (const a of snap.agents) {
    if (a.parentId) continue;
    if (f.archived.has(sessionKey(a))) {
      hiddenMain.add(a.id);
      archived++;
    } else if (limit && (a.status === 'idle' || a.status === 'done') && snap.serverTime - lastActiveAt(a) >= limit) {
      hiddenMain.add(a.id);
      idle++;
    }
  }
  const accounts = renameAccounts(snap.accounts, f.accountNames);
  if (!hiddenMain.size) return { snap: accounts === snap.accounts ? snap : { ...snap, accounts }, archived: 0, idle: 0 };
  const agents = snap.agents.filter((a) => !hiddenMain.has(a.id) && !(a.parentId && hiddenMain.has(a.parentId)));
  const roomsWithAgents = new Set(agents.map((a) => a.roomId));
  const hiddenRooms = new Set(snap.agents.filter((a) => !agents.includes(a)).map((a) => a.roomId));
  // Só some a sala que ficou vazia por causa do que foi escondido (uma sala sem ninguém desde o início continua como estava).
  const rooms = snap.rooms.filter((r) => roomsWithAgents.has(r.id) || !hiddenRooms.has(r.id));
  return { snap: { ...snap, agents, rooms, accounts }, archived, idle };
}
