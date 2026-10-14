// Confere "só o dono acessa" (o que o chmod 600/700 garante no macOS e no Linux). No Windows o modo POSIX não existe;
// o equivalente é a ACL ter só o usuário atual, que é o que restrictToOwner grava.
import { statSync } from 'node:fs';
import { expect } from 'vitest';
import { aclPrincipals } from '../fs-private';

export function expectOwnerOnly(path: string, mode: 0o600 | 0o700): void {
  if (process.platform !== 'win32') {
    expect(statSync(path).mode & 0o777).toBe(mode);
    return;
  }
  const { USERDOMAIN = '', USERNAME = '' } = process.env;
  const me = (USERDOMAIN ? USERDOMAIN + '\\' + USERNAME : USERNAME).toLowerCase();
  expect(aclPrincipals(path).map((p) => p.toLowerCase()), path).toEqual([me]);
}
