'use strict';
// ============ 像素美术：精灵、辉光、背景 ============
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }

function makeSprite(rows, pal) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const [c, x] = mkCanvas(w, h), [cw, xw] = mkCanvas(w, h);
  rows.forEach((r, y) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]; if (ch === '.' || !pal[ch]) continue;
      x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1);
      xw.fillStyle = '#fff'; xw.fillRect(i, y, 1, 1);
    }
  });
  return { c, white: cw, w, h };
}

const PAL = {
  K: '#140a14', R: '#e3263a', r: '#8e1224', B: '#2c4fd6', b: '#1a2a80', W: '#ffffff', S: '#9aa4b8', s: '#5a6278',
  G: '#4a5468', Y: '#ffe04a', O: '#ff8a1e', P: '#7a3cc8', p: '#4a1f88', V: '#1a0f26', v: '#3b2358', M: '#e8e0ff',
  C: '#2fd0c0', c: '#12806e', D: '#3a4050', E: '#ff3060', L: '#8af0ff',
};

const SPR = {};
SPR.hero = makeSprite([
  '...KKKK...',
  '..KRRRRK..',
  '.KRrRRrRK.',
  '.KWWRRWWK.',
  '.KWWrrWWK.',
  '..KRRRRK..',
  '...KRRK...',
  '..KBRRBK..',
  '.KBBRKBBK.',
  '.KBRKKRBK.',
  '.KBRRKRBK.',
  '..KRRRRK..',
  '..KrrrrK..',
  '..KBBBBK..',
], PAL);
SPR.drone = makeSprite([
  '.KK......KK.',
  'SSSS....SSSS',
  '...KKKKKK...',
  '..KGGGGGGK..',
  '.KGGKEEKGGK.',
  '.KGGKEWKGGK.',
  '..KGGGGGGK..',
  '...K.KK.K...',
], PAL);
SPR.thug = makeSprite([
  '...KKKK...',
  '..KPPPPK..',
  '.KPYYYYK..',
  '..KPPPPK..',
  '.KOKpPPKKK',
  '.KOKPPPSSS',
  '.KOKpPPKKK',
  '.KOKPPK...',
  '..KKPPK...',
  '...KP.PK..',
  '...KK.KK..',
], PAL);
SPR.gunship = makeSprite([
  '........KKKKKKKK........',
  '......KKSSSSSSSSKK......',
  '..KKKKSSSSEEEESSSSKKKK..',
  '.KSSSSSSSEEWWEESSSSSSSK.',
  'KSSSSSSSSSEEEESSSSSSSSSK',
  'KDDDDDDDDDDDDDDDDDDDDDDK',
  '.KDDKK.KDDDDDDK.KKDDDDK.',
  '..KK.....KKKK......KK...',
], PAL);
SPR.blob = makeSprite([
  '..VVVVV..',
  '.VvVVVvV.',
  'VVWWVWWVV',
  'VVWKVKWVV',
  'VvVVVVVvV',
  'VVMVMVMVV',
  '.VVVVVVV.',
  'V.V.V.V.V',
], PAL);
SPR.eye = makeSprite([
  '....KKKKKK....',
  '..KKCCCCCCKK..',
  '.KCCCCCCCCCCK.',
  '.KCCKKKKKKCCK.',
  'KCCKEEEEEEKCCK',
  'KCCKEYYYYEKCCK',
  'KCCKEYWWYEKCCK',
  'KCCKEYYYYEKCCK',
  'KCCKEEEEEEKCCK',
  '.KCCKKKKKKCCK.',
  '.KCCCCCCCCCCK.',
  '..KKCCCCCCKK..',
  '....KKKKKK....',
], PAL);
SPR.coin = makeSprite(['.KKK.', 'KYYYK', 'KYWYK', 'KYYYK', '.KKK.'], { K: '#a06000', Y: '#ffd23a', W: '#fff8c0' });
SPR.coin2 = makeSprite(['.K.', 'KYK', 'KWK', 'KYK', '.K.'], { K: '#a06000', Y: '#ffd23a', W: '#fff8c0' });
SPR.heart = makeSprite(['.K.K.', 'KRKRK', 'KRRRK', '.KRK.', '..K..'], { K: '#400', R: '#ff3050' });

// 像素直线
function pxLine(ctx, x0, y0, x1, y1, col, t) {
  t = t || 1; ctx.fillStyle = col;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, n = 0; const o = (t / 2) | 0;
  while (n++ < 2000) {
    ctx.fillRect(x0 - o, y0 - o, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pxCircle(ctx, cx, cy, r, col) {
  ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
function pxRing(ctx, cx, cy, r, col, th) {
  ctx.fillStyle = col; th = th || 1;
  const n = Math.max(12, Math.floor(r * 6.3));
  for (let i = 0; i < n; i++) { const a = i / n * TAU; ctx.fillRect(Math.round(cx + Math.cos(a) * r) - (th >> 1), Math.round(cy + Math.sin(a) * r) - (th >> 1), th, th); }
}

// 背景降饱和 + 压暗，突出角色与弹幕
function dimCanvas(c, sat, bri) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const r = p[i], g = p[i + 1], b = p[i + 2], l = r * .3 + g * .59 + b * .11;
    p[i] = (l + (r - l) * sat) * bri; p[i + 1] = (l + (g - l) * sat) * bri; p[i + 2] = (l + (b - l) * sat) * bri;
  }
  x.putImageData(d, 0, 0); return c;
}
const BG_SAT = .5, BG_BRI = .55;

// 弹幕辉光缓存
const GLOW = {};
function glowSpr(col, r) {
  const k = col + r; if (GLOW[k]) return GLOW[k];
  const s = Math.ceil(r * 3) * 2 + 2; const [c, x] = mkCanvas(s, s); const m = s / 2;
  const g = x.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, col); g.addColorStop(0.35, col + '88'); g.addColorStop(1, col + '00');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return (GLOW[k] = c);
}
const BULSPR = {};
function bulletSpr(col, r) {
  const k = col + r; if (BULSPR[k]) return BULSPR[k];
  const s = r * 2 + 3; const [c, x] = mkCanvas(s, s); const m = (s / 2) | 0;
  pxCircle(x, m, m, r, col); pxCircle(x, m, m, Math.max(0, r - 1.5) | 0, '#ffffff');
  if (r >= 4) pxRing(x, m, m, r, '#ffffff99', 1);
  return (BULSPR[k] = c);
}

// ============ 背景 ============
const THEMES = [
  { name: 'DUSK', sky: ['#1a0630', '#4a0c48', '#a01840', '#ff5a2a', '#ffb050'], moon: '#ffd8a0', far: '#2a0c30', mid: '#170820', win: ['#ffcf4a', '#ff6a3a', '#4ad8ff'], bld: ['#261a34', '#2e1c3a', '#1f1830', '#302040'], neon: ['#ff2a8a', '#4ad8ff', '#ffe04a'] },
  { name: 'NIGHT', sky: ['#02030e', '#08103a', '#142a6a', '#2a3a8a', '#6a3a8a'], moon: '#e8f4ff', far: '#0a1030', mid: '#060a1c', win: ['#8af0ff', '#ffe04a', '#ff5ab0'], bld: ['#141a30', '#1a2038', '#101428', '#1c1c3a'], neon: ['#4ad8ff', '#ff3aa0', '#8aff5a'] },
  { name: 'TOXIC', sky: ['#050a06', '#0e2a18', '#2a5a1a', '#8a9a1a', '#d0e060'], moon: '#f0ffb0', far: '#0c200e', mid: '#061208', win: ['#aaff4a', '#ffe04a', '#b070ff'], bld: ['#16221a', '#1a2a20', '#122016', '#20281c'], neon: ['#aaff4a', '#b070ff', '#ff4a4a'] },
  { name: 'BLOOD', sky: ['#0a0000', '#300008', '#700010', '#c02010', '#ff7020'], moon: '#ff4a3a', far: '#200408', mid: '#120204', win: ['#ff4a3a', '#ffcf4a', '#ffffff'], bld: ['#241216', '#2c141a', '#1c0e12', '#301820'], neon: ['#ff2a3c', '#ffcf4a', '#ffffff'] },
];
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const BG = {
  theme: 0, layers: null, cache: {},
  build(ti) {
    if (this.cache[ti]) return (this.layers = this.cache[ti]);
    const T = THEMES[ti];
    // 天空：分段抖动渐变
    const [sky, sx] = mkCanvas(W, H); const img = sx.createImageData(W, H); const stops = T.sky.map(hex2rgb);
    const bands = 18;
    for (let y = 0; y < H; y++) {
      const f = y / (H - 1) * bands; const b0 = Math.floor(f), fr = f - b0;
      const colAt = b => { const t = clamp(b / bands, 0, 1) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)); const u = t - i; return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * u); };
      const c0 = colAt(b0), c1 = colAt(b0 + 1);
      for (let x = 0; x < W; x++) {
        const c = fr * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? c1 : c0; const p = (y * W + x) * 4;
        img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]; img.data[p + 3] = 255;
      }
    }
    sx.putImageData(img, 0, 0);
    // 星星
    for (let i = 0; i < 70; i++) { sx.fillStyle = Math.random() < .3 ? '#fff' : '#ffffff66'; sx.fillRect(randi(0, W), randi(0, 110), 1, 1); }
    // 月亮
    const mx = 360, my = 58, mr = 30;
    sx.globalAlpha = .25; pxCircle(sx, mx, my, mr + 6, T.moon); sx.globalAlpha = 1;
    pxCircle(sx, mx, my, mr, T.moon);
    sx.fillStyle = '#00000022';
    [[-10, -8, 6], [8, 4, 8], [-4, 14, 4], [14, -12, 3]].forEach(([a, b, r]) => pxCircle(sx, mx + a, my + b, r, '#00000026'));
    // 远景天际线
    const far = this.skyline(640, T.far, 120, 205, [T.win[0] + '55'], .04, 3);
    const mid = this.skyline(800, T.mid, 150, 225, T.win, .12, 5);
    [sky, far, mid].forEach(c => dimCanvas(c, BG_SAT, BG_BRI));
    this.layers = this.cache[ti] = { sky, far, mid, T };
    return this.layers;
  },
  skyline(tw, col, ymin, ymax, wins, lit, gw) {
    const [c, x] = mkCanvas(tw, H); let px = 0;
    while (px < tw) {
      const w = randi(18, 46); const top = randi(ymin, ymax); const ww = Math.min(w, tw - px);
      x.fillStyle = col; x.fillRect(px, top, ww, H - top);
      if (Math.random() < .4) { x.fillRect(px + (w >> 1), top - randi(6, 18), 1, 20); }
      if (Math.random() < .3) x.fillRect(px + 3, top - 4, ww - 6, 4);
      for (let wy = top + 4; wy < H; wy += gw) for (let wx = px + 2; wx < px + ww - 2; wx += 3)
        if (Math.random() < lit) { x.fillStyle = pick(wins); x.fillRect(wx, wy, 1, 1); }
      px += w + randi(0, 3);
    }
    return c;
  },
  draw(ctx, camX, t, camY) {
    const L = this.layers; camY = camY || 0;
    ctx.drawImage(L.sky, 0, 0);
    const tile = (img, f, yo) => { const tw = img.width; let ox = -Math.floor((camX * f) % tw); if (ox > 0) ox -= tw; for (let x = ox; x < W; x += tw) ctx.drawImage(img, x, yo || 0); };
    tile(L.far, .12, Math.round(-camY * .08));
    // 远处探照灯
    ctx.globalAlpha = .035; ctx.fillStyle = L.T.win[2];
    for (let i = 0; i < 2; i++) {
      const bx = ((i * 260 - camX * .2) % 600 + 600) % 600 - 60, a = Math.sin(t * .5 + i * 2) * .5;
      ctx.beginPath(); ctx.moveTo(bx, H); ctx.lineTo(bx + Math.sin(a) * 300 - 20, 0); ctx.lineTo(bx + Math.sin(a) * 300 + 20, 0); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const my = Math.round(12 - camY * .2); tile(L.mid, .35, my);
    if (my + H < H) { ctx.fillStyle = L.T.mid; ctx.fillRect(0, my + H, W, -my); }
  },
  // 底部黑潮 & 火光
  drawAbyss(ctx, camX, t) {
    const T = this.layers.T;
    const g = ctx.createLinearGradient(0, H - 70, 0, H);
    g.addColorStop(0, '#00000000'); g.addColorStop(1, T.sky[3] + '66');
    ctx.fillStyle = g; ctx.fillRect(0, H - 70, W, 70);
    for (let x = 0; x < W; x += 2) {
      const wx = x + camX;
      const h = 10 + Math.sin(wx * .05 + t * 2.2) * 3 + Math.sin(wx * .13 - t * 3.1) * 2 + Math.sin(wx * .021 + t) * 4;
      ctx.fillStyle = '#0a0410'; ctx.fillRect(x, H - h, 2, h);
      ctx.fillStyle = '#3a1a5a'; ctx.fillRect(x, H - h, 2, 1);
    }
    // 气泡/眼睛
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 97 + Math.floor(t * 30) * 0 - camX) % W + W) % W, ph = (t * .8 + i * .37) % 1;
      if (ph < .5) { ctx.fillStyle = '#ffffffcc'; ctx.fillRect(bx, H - 6, 2, 1); ctx.fillRect(bx + 4, H - 6, 2, 1); }
    }
  },
};
