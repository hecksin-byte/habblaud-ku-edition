// Equivalente do `chmod 600/700` no Windows. O NTFS não guarda o modo POSIX (o chmod do Node só mexe no atributo
// "somente leitura"), então o que era "só o dono lê" fica com a ACL herdada da pasta. Aqui trocamos por uma ACL só do
// usuário atual, via icacls (já vem no Windows). Fora do Windows não faz nada: o chmod normal já basta.
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

type Run = (file: string, args: string[]) => string;

const defaultRun: Run = (file, args) => execFileSync(file, args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

/** O usuário atual no formato que o icacls aceita (DOMÍNIO\usuário). */
function currentUser(env: NodeJS.ProcessEnv): string | undefined {
  const name = env.USERNAME;
  if (!name) return undefined;
  return env.USERDOMAIN ? `${env.USERDOMAIN}\\${name}` : name;
}

/**
 * Deixa o arquivo ou a pasta só com o usuário atual (sem herdar da pasta de cima). Só no Windows, e só faz sentido
 * para modos sem acesso de grupo/outros (0o600, 0o700). Devolve false se não deu certo (ou se não é o caso); quem chama
 * segue em frente, como já acontece com o chmod, que também é "melhor esforço".
 */
export function restrictToOwner(
  path: string,
  mode: number,
  opts: { platform?: NodeJS.Platform; env?: NodeJS.ProcessEnv; run?: Run } = {},
): boolean {
  if ((opts.platform ?? process.platform) !== 'win32') return false;
  if (mode & 0o077) return false;
  const user = currentUser(opts.env ?? process.env);
  if (!user) return false;
  try {
    const isDir = statSync(path).isDirectory();
    // (OI)(CI): arquivos e subpastas criados depois herdam a mesma regra.
    const grant = `${user}:${isDir ? '(OI)(CI)F' : 'F'}`;
    (opts.run ?? defaultRun)('icacls', [path, '/inheritance:r', '/grant:r', grant]);
    return true;
  } catch {
    return false;
  }
}

/** Quem consta na ACL (os nomes, sem as permissões), como o icacls mostra. Só faz sentido no Windows. */
export function aclPrincipals(path: string, run: Run = defaultRun): string[] {
  // O 1º registro vem na mesma linha do caminho (que também tem ":"): tira o caminho antes de ler.
  const out = run('icacls', [path]).split(path).join('');
  return [...out.matchAll(/^\s*(\S.*?):\(/gm)].map((m) => m[1].trim());
}
