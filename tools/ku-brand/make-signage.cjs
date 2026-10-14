// 로비 간판(client/public/assets/brand/signage*.png)을 "고려대학교" 글자로 다시 만든다. Windows의 굴림(Gulim) 11px 글꼴을 Chrome 캔버스로 찍어 이진화한다.
// 실행: node tools/ku-brand/make-signage.cjs (Chrome 경로는 아래 executablePath 확인)
const { createRequire } = require('module');
const req = createRequire(require('path').resolve(__dirname, '../../package.json'));
const { chromium } = req('playwright-core');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage();
  await p.setContent('<body></body>');
  const [u1, u4, info] = await p.evaluate(() => {
    const W = 64, H = 16;
    const m = document.createElement('canvas'); m.width = W; m.height = H;
    const g = m.getContext('2d'); g.font = '11px "Gulim"'; g.textBaseline = 'top'; g.fillStyle = '#fff';
    const text = '고려대학교';
    const tw = Math.round(g.measureText(text).width);
    const x0 = Math.round((W - tw) / 2);
    g.fillText(text, x0, 2);
    const d = g.getImageData(0, 0, W, H);
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d.data[(y * W + x) * 4 + 3] > 110;
    // bbox para centralizar na vertical
    let y0 = H, y1 = 0, xa = W, xb = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); xa = Math.min(xa, x); xb = Math.max(xb, x); }
    const dy = Math.round((H - (y1 - y0 + 1)) / 2) - y0;
    const dx = Math.round((W - (xb - xa + 1)) / 2) - xa;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const o = c.getContext('2d');
    const R = (x, y, w, h, col) => { o.fillStyle = col; o.fillRect(x, y, w, h); };
    R(0, 0, W, H, '#3a0a14');
    R(1, 1, W - 2, H - 2, '#8b0029');
    R(1, 1, W - 2, 1, '#b3304f');
    R(1, H - 2, W - 2, 1, '#6a001e');
    for (const [x, y] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) R(x, y, 1, 1, '#e8b4bf');
    // sombra
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) R(x + dx + 1, y + dy + 1, 1, 1, 'rgba(30,0,10,0.7)');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) R(x + dx, y + dy, 1, 1, x + dx < 24 ? '#f7f1e6' : '#f7f1e6');
    const c4 = document.createElement('canvas'); c4.width = W * 4; c4.height = H * 4;
    const o4 = c4.getContext('2d'); o4.imageSmoothingEnabled = false; o4.drawImage(c, 0, 0, W * 4, H * 4);
    return [c.toDataURL(), c4.toDataURL(), { tw, x0, dx, dy, w: xb - xa + 1, h: y1 - y0 + 1 }];
  });
  console.log(JSON.stringify(info));
  const dir = require('path').resolve(__dirname, '../../client/public/assets/brand') + '/';
  fs.writeFileSync(dir + 'signage.png', Buffer.from(u1.split(',')[1], 'base64'));
  fs.writeFileSync(dir + 'signage@4x.png', Buffer.from(u4.split(',')[1], 'base64'));
  await b.close();
})();
