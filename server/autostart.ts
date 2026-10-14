// Inicialização automática no Windows: a tarefa agendada "Habblaud Server" sobe o servidor quando o usuário entra.
// Quem liga e desliga é scripts/windows/autostart.ps1 (o mesmo que a linha de comando usa); aqui só chamamos esse
// script e lemos o JSON dele. Fora do Windows (ou no Docker) não há o que ligar: `supported` vem false.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export interface AutostartState {
  supported: boolean;
  /** A tarefa existe no Agendador de Tarefas. */
  installed: boolean;
  /** A tarefa existe e não está desativada (Settings.Enabled; a tarefa pode estar rodando e mesmo assim desativada). */
  enabled: boolean;
}

export interface AutostartController {
  get(): Promise<AutostartState>;
  set(enabled: boolean): Promise<AutostartState>;
}

const OFF: AutostartState = { supported: false, installed: false, enabled: false };

type Run = (file: string, args: string[]) => Promise<string>;

const defaultRun: Run = (file, args) =>
  new Promise((ok, fail) => {
    execFile(file, args, { timeout: 20_000, windowsHide: true, encoding: 'utf8' }, (err, out, stderr) => {
      if (err) fail(new Error((String(stderr).trim().split('\n').pop() || err.message).slice(0, 300)));
      else ok(out);
    });
  });

/** Acha scripts/windows/autostart.ps1 a partir do servidor compilado (dist/server), do código-fonte ou da pasta atual. */
export function findAutostartScript(argv1: string = process.argv[1] ?? '', cwd: string = process.cwd()): string | undefined {
  const here = argv1 ? dirname(resolve(argv1)) : cwd;
  const candidates = [resolve(here, '..', '..'), resolve(here, '..'), cwd].map((d) => join(d, 'scripts', 'windows', 'autostart.ps1'));
  return candidates.find((p) => existsSync(p));
}

export function parseState(out: string): AutostartState {
  const line = out.trim().split(/\r?\n/).pop() ?? '';
  const j = JSON.parse(line) as Partial<AutostartState>;
  return { supported: j.supported === true, installed: j.installed === true, enabled: j.enabled === true };
}

export function createAutostart(opts: { platform?: NodeJS.Platform; inDocker?: boolean; script?: string | null; run?: Run } = {}): AutostartController {
  const platform = opts.platform ?? process.platform;
  const script = opts.script === undefined ? findAutostartScript() : opts.script ?? undefined;
  const run = opts.run ?? defaultRun;
  const usable = platform === 'win32' && !opts.inDocker && !!script;
  const call = async (action: 'status' | 'on' | 'off'): Promise<AutostartState> => {
    if (!usable || !script) return OFF;
    return parseState(await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action]));
  };
  return {
    get: () => call('status'),
    set: (enabled) => call(enabled ? 'on' : 'off'),
  };
}
