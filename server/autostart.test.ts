import { describe, expect, it } from 'vitest';
import { createAutostart, findAutostartScript, parseState } from './autostart';

describe('inicialização automática (Windows)', () => {
  it('fora do Windows, no Docker ou sem o script não há o que ligar', async () => {
    const run = async () => {
      throw new Error('não deveria rodar');
    };
    for (const opts of [{ platform: 'darwin' as const }, { platform: 'linux' as const }, { platform: 'win32' as const, inDocker: true }, { platform: 'win32' as const, script: null }]) {
      const a = createAutostart({ script: 'x.ps1', run, ...opts });
      expect(await a.get()).toEqual({ supported: false, installed: false, enabled: false });
      expect(await a.set(true)).toEqual({ supported: false, installed: false, enabled: false });
    }
  });

  it('chama o autostart.ps1 com a ação certa e lê o JSON da última linha', async () => {
    const calls: string[][] = [];
    const run = async (file: string, args: string[]) => {
      calls.push([file, ...args]);
      const on = args[args.length - 1] !== 'off';
      return `ruído\r\n{"supported":true,"installed":true,"enabled":${on}}\r\n`;
    };
    const a = createAutostart({ platform: 'win32', script: 'C:\\h\\autostart.ps1', run });
    expect(await a.get()).toEqual({ supported: true, installed: true, enabled: true });
    expect(await a.set(false)).toEqual({ supported: true, installed: true, enabled: false });
    expect(await a.set(true)).toEqual({ supported: true, installed: true, enabled: true });
    expect(calls.map((c) => c[c.length - 1])).toEqual(['status', 'off', 'on']);
    expect(calls[0].slice(0, 7)).toEqual(['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\h\\autostart.ps1']);
  });

  it('o erro do PowerShell sobe para quem chamou', async () => {
    const a = createAutostart({ platform: 'win32', script: 'x.ps1', run: async () => Promise.reject(new Error('acesso negado')) });
    await expect(a.set(true)).rejects.toThrow('acesso negado');
  });

  it('parseState só aceita true de verdade', () => {
    expect(parseState('{"supported":"yes","installed":1,"enabled":true}')).toEqual({ supported: false, installed: false, enabled: true });
    expect(() => parseState('nada')).toThrow();
  });

  it('acha o script na pasta do repositório (dist/server ou código-fonte)', () => {
    const p = findAutostartScript(process.cwd() + '/dist/server/index.js', process.cwd());
    expect(p).toMatch(/scripts[\\/]windows[\\/]autostart\.ps1$/);
    expect(findAutostartScript('/nao/existe/dist/server/index.js', '/nao/existe')).toBeUndefined();
  });
});
