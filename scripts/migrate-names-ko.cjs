// 저장된 에이전트 이름(~/.habblaud/names.json 과 오늘의 타임라인)을 옛 브라질 이름에서 새 한국 이름으로 옮긴다.
// 옛 풀(git HEAD의 shared/names.ts)과 새 풀(작업 폴더)은 같은 순서라서, 같은 자리의 이름끼리 짝지어 바꾼다.
// 서버를 멈춘 상태에서 저장소 루트에서 실행한다: node scripts/migrate-names-ko.cjs [타임라인 날짜 YYYY-MM-DD ...]
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const home = path.join(process.env.USERPROFILE || process.env.HOME, '.habblaud');
const parse = (src) => {
  const take = (n) => {
    const m = src.match(new RegExp('const ' + n + ' = \\[([\\s\\S]*?)\\];'));
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };
  return { F: take('F'), M: take('M') };
};

const oldP = parse(cp.execSync('git show HEAD:shared/names.ts', { encoding: 'utf8' }));
const newP = parse(fs.readFileSync('shared/names.ts', 'utf8'));
const map = new Map();
for (const k of ['F', 'M']) oldP[k].forEach((n, i) => map.set(n.normalize('NFC'), newP[k][i]));

const dates = process.argv.slice(2);
const files = ['names.json', ...dates.map((d) => 'timeline/' + d + '.jsonl')];
const backup = path.join(home, 'backup-names-' + new Date().toISOString().slice(0, 10));
for (const f of files) {
  const p = path.join(home, f);
  if (!fs.existsSync(p)) continue;
  fs.mkdirSync(path.dirname(path.join(backup, f)), { recursive: true });
  fs.copyFileSync(p, path.join(backup, f));
}

const letters = '(?<![\\p{L}\\p{N}])';
const rest = '(?![\\p{L}])';
const replaceNames = (text) => {
  let count = 0;
  for (const [from, to] of map) {
    text = text.replace(new RegExp(letters + from + rest, 'gu'), () => (count++, to));
  }
  return [text, count];
};

for (const f of files) {
  const p = path.join(home, f);
  if (!fs.existsSync(p)) continue;
  const [out, n] = replaceNames(fs.readFileSync(p, 'utf8').normalize('NFC'));
  fs.writeFileSync(p, out);
  console.log(f, '바꾼 횟수:', n);
}

const j = JSON.parse(fs.readFileSync(path.join(home, 'names.json'), 'utf8'));
const stored = [...Object.values(j.names || {}), ...Object.values(j.rooms || {})].map((v) => v.name);
const left = stored.filter((n) => /[A-Za-zÀ-ÿ]/.test(n));
console.log('저장된 이름', stored.length, '개 / 한국 이름이 아닌 것:', left.length ? left.join(', ') : '없음');
console.log('백업:', backup);
