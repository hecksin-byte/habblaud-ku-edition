import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aclPrincipals, restrictToOwner } from './fs-private';
import { tempDir } from './test/fixtures';
import { expectOwnerOnly } from './test/private';

const BS = '\\';

describe('restrictToOwner', () => {
  const env = { USERNAME: 'ana', USERDOMAIN: 'PC' };

  it('só age no Windows e só para modos sem acesso de grupo/outros', () => {
    const calls: string[][] = [];
    const run = (_f: string, a: string[]) => (calls.push(a), '');
    const tmp = tempDir();
    const file = join(tmp.dir, 'f');
    writeFileSync(file, 'x');
    expect(restrictToOwner(file, 0o600, { platform: 'linux', env, run })).toBe(false);
    expect(restrictToOwner(file, 0o644, { platform: 'win32', env, run })).toBe(false);
    expect(restrictToOwner(file, 0o600, { platform: 'win32', env: {}, run })).toBe(false);
    expect(calls).toEqual([]);
    expect(restrictToOwner(file, 0o600, { platform: 'win32', env, run })).toBe(true);
    expect(calls[0]).toEqual([file, '/inheritance:r', '/grant:r', 'PC' + BS + 'ana:F']);
    expect(restrictToOwner(tmp.dir, 0o700, { platform: 'win32', env, run })).toBe(true);
    expect(calls[1]).toEqual([tmp.dir, '/inheritance:r', '/grant:r', 'PC' + BS + 'ana:(OI)(CI)F']);
    const boom = () => {
      throw new Error('icacls falhou');
    };
    expect(restrictToOwner(file, 0o600, { platform: 'win32', env, run: boom })).toBe(false);
    tmp.cleanup();
  });

  it('aclPrincipals lê os nomes da saída do icacls, mesmo com o caminho na 1ª linha', () => {
    const path = ['C:', 'x', 'a.txt'].join(BS);
    const out = [
      path + ' PC' + BS + 'ana:(F)',
      '              NT AUTHORITY' + BS + 'SYSTEM:(I)(F)',
      '              BUILTIN' + BS + 'Users:(I)(RX)',
      '',
      'OK',
      '',
    ].join('\r\n');
    expect(aclPrincipals(path, () => out)).toEqual(['PC' + BS + 'ana', 'NT AUTHORITY' + BS + 'SYSTEM', 'BUILTIN' + BS + 'Users']);
  });

  it.skipIf(process.platform !== 'win32')('no Windows de verdade: arquivo e pasta ficam só com o usuário atual', () => {
    const tmp = tempDir();
    const dir = join(tmp.dir, 'privada');
    mkdirSync(dir);
    expect(restrictToOwner(dir, 0o700)).toBe(true);
    expectOwnerOnly(dir, 0o700);
    const file = join(dir, 'segredo');
    writeFileSync(file, 'x');
    expect(restrictToOwner(file, 0o600)).toBe(true);
    expectOwnerOnly(file, 0o600);
    tmp.cleanup();
  });
});
