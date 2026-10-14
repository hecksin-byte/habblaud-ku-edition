// 로고(고려대 본관 풍 고딕 석조 건물)를 픽셀 아트로 그려 client/public/assets/brand/*.png 와 .ico 를 다시 만든다.
//   node tools/ku-brand/make-brand.cjs [--ico <출력 .ico 경로>]
// 헤드리스 Chrome(playwright-core + 설치된 Chrome)의 canvas로 그린다. 그림은 이 파일의 drawBuilding()이 전부다.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '..', '..');
const brand = path.join(root, 'client', 'public', 'assets', 'brand');
const req = createRequire(path.join(root, 'package.json'));
const { chromium } = req('playwright-core');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const args = process.argv.slice(2);
const icoOut = args.includes('--ico') ? args[args.indexOf('--ico') + 1] : null;

const pageCode = () => {
  const C = {
    stoneL: '#d4d4da', stone: '#aeb1b8', stoneD: '#82868f', roof: '#4a4f5c', roofL: '#626877',
    crim: '#8b0029', crimD: '#5c001b', gold: '#f2c14e', glass: '#2b3050', door: '#3b2b24', grass: '#5f9142', grassD: '#4a7733', path: '#cdbf9f',
  };
  /** Desenha o prédio numa grade de 32x32 com o canto superior esquerdo em (ox, oy). */
  function drawBuilding(ctx, ox, oy) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
    // torre central com ameias
    for (const x of [12, 15, 18]) R(x, 3, 2, 2, C.stoneL);
    R(12, 5, 8, 1, C.stoneL);
    R(12, 6, 8, 22, C.stone);
    R(12, 6, 1, 22, C.stoneL);
    R(19, 6, 1, 22, C.stoneD);
    for (let y = 8; y < 28; y += 4) R(13, y, 6, 1, C.stoneD); // fiadas de pedra
    // faixa vermelha com o brasão dourado
    R(14, 8, 4, 11, C.crim);
    R(14, 8, 1, 11, C.crimD);
    R(15, 19, 2, 1, C.crim);
    R(15, 11, 2, 2, C.gold);
    R(15, 14, 2, 1, C.gold);
    // janelas altas da torre e porta em arco
    R(14, 21, 1, 3, C.glass); R(17, 21, 1, 3, C.glass);
    R(14, 25, 4, 3, C.door);
    R(15, 24, 2, 1, C.door);
    // alas com telhado de duas águas
    for (const [x0, mirror] of [[2, false], [20, true]]) {
      R(x0, 15, 10, 13, C.stone);
      R(x0, 15, 1, 13, C.stoneL); R(x0 + 9, 15, 1, 13, C.stoneD);
      const roof = [[x0 - 1, 14, 12], [x0, 13, 10], [x0 + 1, 12, 8], [x0 + 2, 11, 6], [x0 + 3, 10, 4]];
      for (const [x, y, w] of roof) R(x, y, w, 1, C.roof);
      R(mirror ? x0 + 4 : x0 + 3, 10, 1, 1, C.roofL);
      for (const wx of [x0 + 2, x0 + 5, x0 + 7]) {
        R(wx, 17, 1, 3, C.glass); R(wx, 22, 1, 3, C.glass);
      }
      R(x0 + 5, 17, 1, 1, C.gold); R(x0 + 2, 22, 1, 1, C.gold); R(x0 + 7, 22, 1, 1, C.gold);
    }
    // gramado e caminho
    R(0, 28, 32, 4, C.grass);
    R(0, 30, 32, 2, C.grassD);
    R(14, 28, 4, 4, C.path);
  }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const scaled = (src, size) => { const [c, x] = mk(size, size); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, size, size); return c; };
  const png = (c) => c.toDataURL('image/png').split(',')[1];

  // logo da barra superior: só o prédio, fundo transparente
  const [mark, mx] = mk(32, 32);
  drawBuilding(mx, 0, 0);
  // ícone do app: céu de entardecer em faixas, estrelas e o prédio, numa grade de 48x48
  const [icon, ix] = mk(48, 48);
  const sky = ['#1d1f3d', '#2b2850', '#3a3260', '#4d3a6a', '#6a4772', '#8f5a78', '#b97080', '#d98a82'];
  sky.forEach((c, i) => { ix.fillStyle = c; ix.fillRect(0, i * 5, 48, i === sky.length - 1 ? 8 : 5); });
  ix.fillStyle = '#ffffff';
  for (const [x, y] of [[5, 4], [14, 9], [38, 6], [43, 14], [8, 18], [30, 3], [24, 11]]) ix.fillRect(x, y, 1, 1);
  drawBuilding(ix, 8, 12);
  return {
    mark: png(mark), mark4: png(scaled(mark, 128)),
    fav32: png(scaled(mark, 32)), fav16: png(scaled(mark, 16)),
    i192: png(scaled(icon, 192)), i512: png(scaled(icon, 512)), i180: png(scaled(icon, 180)),
    i256: png(scaled(icon, 256)), i64: png(scaled(icon, 64)), i48: png(scaled(icon, 48)),
  };
};

/** .ico com imagens PNG dentro (aceito pelo Windows desde o Vista). */
function makeIco(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = [];
  for (const { size, data } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0); d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(data.length, 8); d.writeUInt32LE(offset, 12);
    offset += data.length;
    dir.push(d);
  }
  return Buffer.concat([head, ...dir, ...entries.map((e) => e.data)]);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const out = await page.evaluate(`(${pageCode.toString()})()`);
  await browser.close();
  const w = (name, b64) => fs.writeFileSync(path.join(brand, name), Buffer.from(b64, 'base64'));
  w('logo-mark.png', out.mark); w('logo-mark@4x.png', out.mark4);
  w('favicon-32.png', out.fav32); w('favicon-16.png', out.fav16);
  w('icon-192.png', out.i192); w('icon-512.png', out.i512); w('apple-touch-icon.png', out.i180);
  console.log('PNG 기록:', brand);
  if (icoOut) {
    const entries = [[16, out.fav16], [32, out.fav32], [48, out.i48], [64, out.i64], [256, out.i256]].map(([size, b]) => ({ size, data: Buffer.from(b, 'base64') }));
    fs.writeFileSync(icoOut, makeIco(entries));
    console.log('ICO 기록:', icoOut);
  }
})();
