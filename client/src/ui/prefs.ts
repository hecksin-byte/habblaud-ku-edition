// Preferências da interface, persistidas em localStorage ('habblaud:prefs').
// Puro: o armazenamento é injetado (testável em node).
import { IDLE_HIDE_DAYS, type ArchivedEntry, type HideFilter, type IdleHideDays } from '../net/hidden';
import { DEFAULT_SOUND_SETTINGS, sanitizeSoundSettings, type SoundSettings } from '../audio/scheduler';
import type { DaylightMode, WorldOptions } from '../world/api';
import { DEFAULT_WORLD_OPTIONS } from '../world/api';

export const PREFS_KEY = 'habblaud:prefs';

export interface UiPrefs {
  showNames: boolean;
  bubbles: WorldOptions['bubbles'];
  liveliness: WorldOptions['liveliness'];
  /** Ciclo dia/noite: automático (hora local), sempre dia ou sempre noite. */
  daylight: DaylightMode;
  theme: NonNullable<WorldOptions['theme']>;
  /** Sons sintetizados (interruptor geral; desligado por padrão). */
  sound: boolean;
  /** Volume mestre e categorias dos sons. */
  sounds: SoundSettings;
  /** Notification do navegador para alertas com a aba oculta. */
  browserNotifications: boolean;
  sidebarOpen: boolean;
  feedOpen: boolean;
  /** Contas ocultas na barra lateral (AccountInfo.id). */
  hiddenAccounts: string[];
  /** Ocultar da tela os agentes parados há N dias ou mais (0 = nunca). A sessão não é tocada. */
  hideIdleDays: IdleHideDays;
  /** Agentes arquivados pelo botão do agente (só somem da tela; dá para trazer de volta nas configurações). */
  archived: ArchivedEntry[];
  /** Nomes escolhidos para as contas (AccountInfo.id -> nome), mostrados no lugar de "Conta A" etc. */
  accountNames: Record<string, string>;
}

export const DEFAULT_PREFS: UiPrefs = {
  showNames: DEFAULT_WORLD_OPTIONS.showNames,
  bubbles: DEFAULT_WORLD_OPTIONS.bubbles,
  liveliness: DEFAULT_WORLD_OPTIONS.liveliness,
  daylight: 'auto',
  theme: 'auto',
  sound: false,
  sounds: DEFAULT_SOUND_SETTINGS,
  browserNotifications: false,
  sidebarOpen: true,
  feedOpen: true,
  hiddenAccounts: [],
  hideIdleDays: 0,
  archived: [],
  accountNames: {},
};

export const ACCOUNT_NAME_MAX = 24;

function sanitizeAccountNames(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!id || id.length > 120 || typeof v !== 'string') continue;
    const name = [...v.replace(/\s+/g, ' ').trim()].slice(0, ACCOUNT_NAME_MAX).join('');
    if (name) out[id] = name;
    if (Object.keys(out).length >= 20) break;
  }
  return out;
}

const MAX_ARCHIVED = 300;

function sanitizeArchived(raw: unknown): ArchivedEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ArchivedEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (typeof o.key !== 'string' || !o.key || out.some((x) => x.key === o.key)) continue;
    out.push({
      key: o.key.slice(0, 300),
      name: typeof o.name === 'string' ? o.name.slice(0, 80) : '',
      room: typeof o.room === 'string' ? o.room.slice(0, 120) : '',
      at: typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : 0,
    });
    if (out.length >= MAX_ARCHIVED) break;
  }
  return out;
}

function sanitizeIdleDays(raw: unknown): IdleHideDays {
  return (IDLE_HIDE_DAYS as readonly unknown[]).includes(raw) ? (raw as IdleHideDays) : 0;
}

/** O filtro do escritório (net/hidden.ts) a partir das preferências. */
export function hideFilterFrom(p: UiPrefs): HideFilter {
  return { archived: new Set(p.archived.map((e) => e.key)), idleDays: p.hideIdleDays, accountNames: p.accountNames };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Valida campo a campo: valores desconhecidos ou corrompidos caem no padrão. */
export function sanitizePrefs(raw: unknown): UiPrefs {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_PREFS;
  return {
    showNames: bool(o.showNames, d.showNames),
    bubbles: oneOf(o.bubbles, ['all', 'important', 'none'] as const, d.bubbles),
    liveliness: oneOf(o.liveliness, ['calm', 'normal', 'lively'] as const, d.liveliness),
    // preferências antigas: o interruptor "dia e noite" desligado vira "sempre dia"
    daylight: oneOf(o.daylight, ['auto', 'day', 'night'] as const, o.dayNight === false ? 'day' : d.daylight),
    theme: oneOf(o.theme, ['auto', 'none', 'christmas', 'halloween'] as const, d.theme),
    sound: bool(o.sound, d.sound),
    sounds: sanitizeSoundSettings(o.sounds),
    browserNotifications: bool(o.browserNotifications, d.browserNotifications),
    sidebarOpen: bool(o.sidebarOpen, d.sidebarOpen),
    feedOpen: bool(o.feedOpen, d.feedOpen),
    hiddenAccounts: Array.isArray(o.hiddenAccounts) ? o.hiddenAccounts.filter((x): x is string => typeof x === 'string').slice(0, 20) : [],
    hideIdleDays: sanitizeIdleDays(o.hideIdleDays),
    archived: sanitizeArchived(o.archived),
    accountNames: sanitizeAccountNames(o.accountNames),
  };
}

export function loadPrefs(storage: StorageLike | null): UiPrefs {
  if (!storage) return { ...DEFAULT_PREFS };
  try {
    const raw = storage.getItem(PREFS_KEY);
    return sanitizePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(storage: StorageLike | null, prefs: UiPrefs): void {
  if (!storage) return;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Armazenamento cheio ou bloqueado (aba anônima): as preferências valem só nesta sessão.
  }
}

/** Parte das preferências que o mundo (canvas) consome. */
export function worldOptionsFrom(p: UiPrefs): Partial<WorldOptions> {
  return { showNames: p.showNames, bubbles: p.bubbles, liveliness: p.liveliness, dayNight: p.daylight !== 'day', daylight: p.daylight, theme: p.theme };
}

/** localStorage com proteção contra navegadores que lançam exceção ao acessá-lo. */
export function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Migração do nome antigo (CodeTown, até a 0.3.2): as chaves eram `codetown:prefs`,
 * `codetown:update-seen`, `codetown.wallets.v1`... e passaram a começar com `habblaud`.
 */
const LEGACY_NAME = 'codetown';
const LEGACY_PREFIXES = [`${LEGACY_NAME}:`, `${LEGACY_NAME}.`];
const NAME = 'habblaud';

type ListableStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/**
 * Renomeia as chaves do nome antigo para quem atualiza não perder as preferências nem as moedinhas.
 * Roda no boot, antes de qualquer leitura. Se a chave nova já existe, ela vale e a antiga só é apagada.
 * Retorna quantas chaves copiou.
 */
export function migrateLegacyKeys(storage: ListableStorage | null): number {
  if (!storage) return 0;
  const legacy: string[] = [];
  try {
    // Lista antes de mexer: apagar durante a varredura muda os índices de key(i).
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && LEGACY_PREFIXES.some((p) => key.startsWith(p))) legacy.push(key);
    }
  } catch {
    return 0;
  }
  let copied = 0;
  for (const old of legacy) {
    try {
      const value = storage.getItem(old);
      const key = NAME + old.slice(LEGACY_NAME.length);
      if (value !== null && storage.getItem(key) === null) {
        storage.setItem(key, value);
        copied++;
      }
      // Só apaga depois de copiar: se a gravação falhar (cota cheia), a antiga fica para a próxima vez.
      storage.removeItem(old);
    } catch {
      // segue com as outras chaves
    }
  }
  return copied;
}
