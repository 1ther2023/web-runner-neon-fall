'use strict';
// ============ 场景美术：天空 / 远山云海 / 可挂钩楼阁 / 浮空灯舫 / 墨灾 ============
// 章节配色：背景只用低饱和同类色，唯一高饱和的是屋脊“可挂钩”金线 edge
const THEMES = [
  { name: 'DUSK', cn: '第一章 · 霓虹街区', sky: ['#2a1e4a', '#5a3466', '#a8506a', '#e8826a', '#f6c08a'], far: '#5a3a6a', mid: '#3a2650', fog: '#8a5a7a', hor: '#f6c08a',
    bld: ['#4a3060', '#56345e', '#40285a', '#5a3a66'], wall: '#e8d8c0', edge: '#f2b544', win: ['#ffd27a', '#ff9a5a', '#fff0c0'], neon: ['#e8452c', '#f2b544', '#3fb8a8'], moon: '#fff0d0', sun: true },
  { name: 'NIGHT', cn: '第二章 · 雨夜高架', sky: ['#0c1030', '#16204e', '#243474', '#3a4a8a', '#6a5a9a'], far: '#1e2a5a', mid: '#141c42', fog: '#34407a', hor: '#8a7ab0',
    bld: ['#1e2650', '#242c58', '#1a2046', '#2a2e5e'], wall: '#b8c0d8', edge: '#7fd8ff', win: ['#ffcf6a', '#ff8a4a', '#ffe8b0'], neon: ['#e8452c', '#ffcf6a', '#7fd8ff'], moon: '#eef4ff' },
  { name: 'JADE', cn: '第三章 · 地下工厂', sky: ['#0e2426', '#1a4040', '#2e6a5a', '#6a9a6a', '#c8d89a'], far: '#1e4a44', mid: '#123430', fog: '#3a6a5a', hor: '#c8d89a',
    bld: ['#1e3a38', '#24443e', '#183430', '#2a4a3a'], wall: '#d0dcc0', edge: '#b8f07a', win: ['#f0e07a', '#ffb05a', '#e0ffd0'], neon: ['#e8452c', '#f0e07a', '#7fd8b0'], moon: '#f4ffe0' },
  { name: 'INK', cn: '终章 · 黑潮核心', sky: ['#0a0406', '#2a0a10', '#5a1418', '#9a2a1e', '#e0602a'], far: '#2a0e14', mid: '#18080c', fog: '#5a1a18', hor: '#e0602a',
    bld: ['#2c161c', '#341a20', '#241218', '#3a1c24'], wall: '#d8b8a8', edge: '#ff8a3a', win: ['#ff6a3a', '#ffcf6a', '#fff0e0'], neon: ['#e8452c', '#ffcf6a', '#ffffff'], moon: '#ff7a4a', sun: true },
];

const BG = {
  theme: 0, layers: null, prev: null, fade: 0, cache: {},
  build(ti) {
    const next = this.cache[ti] || (this.cache[ti] = { T: THEMES[ti], gen: -1 });
    if (this.layers && this.layers !== next && G.state === 'play') { this.prev = this.layers; this.fade = 1; }
    this.theme = ti; this.layers = next;
  },
  ensure(L) {
    if (L.gen === ART.gen) return L;
    const bk = Math.min(ART.k, 2.5);
    L.sky = this.paintSky(L.T, bk); L.far = this.paintMountains(L.T, bk); L.mid = this.paintSkyline(L.T, bk); L.gen = ART.gen;
    return L;
  },
  paintSky(T, bk) {
    const [cv, c] = mkCv(W * bk, H * bk); c.scale(bk, bk);
    const N = 8, st = T.sky, bh = H / N;
    const colAt = f => { const u = clamp(f, 0, 1) * (st.length - 1), i = Math.min(st.length - 2, Math.floor(u)); return mixHex(st[i], st[i + 1], u - i); };
    // 分层色带：年画式的平涂渐变
    for (let i = 0; i < N; i++) { c.fillStyle = colAt(i / (N - 1)); c.fillRect(0, i * bh, W, bh + 1); }
    const R = srand(51 + T.name.length * 7);
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H * .4, s = R() < .15 ? 1.1 : .55; c.fillRect(x, y, s, s); }
    // 日 / 月：平涂圆 + 两圈光晕 + 飘过的云带
    const mx = 368, my = 66, mr = 30;
    for (const [k, a] of [[2.3, .06], [1.6, .1]]) { c.fillStyle = rgba(T.moon, a); c.beginPath(); circ(c, mx, my, mr * k); c.fill(); }
    c.fillStyle = T.moon; c.beginPath(); circ(c, mx, my, mr); c.fill();
    if (!T.sun) { c.fillStyle = mixHex(T.moon, st[2], .18); [[-9, -8, 6], [8, 6, 4], [-3, 12, 3]].forEach(([a, b, r]) => { c.beginPath(); circ(c, mx + a, my + b, r); c.fill(); }); }
    else { c.strokeStyle = mixHex(T.moon, st[3], .35); c.lineWidth = .8; for (const r of [.5, .78]) { c.beginPath(); c.arc(mx, my, mr * r, Math.PI * .9, Math.PI * 1.7); c.stroke(); } }
    // 祥云：平涂云头 + 细线卷纹
    const cloud = (x, y, r, dir, col, lineCol) => {
      c.beginPath(); cloudCurl(c, x, y, r, dir); c.fillStyle = col; c.fill();
      c.beginPath(); curlLine(c, x, y, r, dir); c.strokeStyle = lineCol; c.lineWidth = .7; c.stroke();
      c.beginPath(); c.moveTo(x - r * 2.2 * dir, y + r * .9); c.lineTo(x - r * 2.2 * dir - r * 3 * dir, y + r * .9); c.stroke();
    };
    const cc = mixHex(st[2], st[4], .35), cl = mixHex(st[2], '#ffffff', .35);
    cloud(330, 96, 7, 1, cc, cl); cloud(410, 84, 5, -1, cc, cl); cloud(70, 52, 6, -1, mixHex(st[1], st[3], .4), mixHex(st[1], '#ffffff', .3)); cloud(190, 112, 5, 1, cc, cl);
    return { cv };
  },
  // 远景：水墨层峦 + 远塔剪影（循环平铺）
  paintMountains(T, bk) {
    const tw = 640, [cv, c] = mkCv(tw * bk, H * bk); c.scale(bk, bk);
    const R = srand(313 + T.name.charCodeAt(0) * 11);
    for (const [base, amp, col, n] of [[150, 46, mixHex(T.far, T.fog, .45), 5], [178, 36, T.far, 7]]) {
      const pk = []; for (let i = 0; i <= n; i++) pk.push([i / n * tw, base - R() * amp]);
      pk[n][1] = pk[0][1];
      c.beginPath(); c.moveTo(0, H);
      for (let i = 0; i < n; i++) {
        const [x0, y0] = pk[i], [x1, y1] = pk[i + 1], mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 16 + R() * 14;
        c.quadraticCurveTo(x0 + (mx - x0) * .5, y0 - 4, mx, my); c.quadraticCurveTo(mx + (x1 - mx) * .5, y1 - 4, x1, y1);
      }
      c.lineTo(tw, H); c.closePath(); c.fillStyle = col; c.fill();
    }
    // 远塔
    c.fillStyle = mixHex(T.far, '#000000', .15);
    for (let i = 0; i < 3; i++) {
      const x = 80 + i * 210 + R() * 40, base = 170, lv = 5 + (R() * 3 | 0);
      for (let k = 0; k < lv; k++) { const y = base - k * 9, w = 12 - k * 1.1; c.fillRect(x - w / 2 + 1, y - 6, w - 2, 6); c.beginPath(); poly(c, [x - w / 2 - 3, y - 6, x + w / 2 + 3, y - 6, x + w / 2, y - 9, x - w / 2, y - 9]); c.fill(); }
      c.fillRect(x - .5, base - lv * 9 - 6, 1, 6);
    }
    // 雾带
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(0, 120, 0, H); g.addColorStop(0, rgba(T.fog, 0)); g.addColorStop(1, rgba(T.fog, .55));
    c.fillStyle = g; c.fillRect(0, 0, tw, H); c.globalCompositeOperation = 'source-over';
    return { cv, w: tw };
  },
  // 中景：楼阁剪影 + 灯笼窗（循环平铺）
  paintSkyline(T, bk) {
    const tw = 800, [cv, c] = mkCv(tw * bk, H * bk); c.scale(bk, bk);
    const R = srand(977 + T.name.charCodeAt(0) * 13);
    let x = 0;
    while (x < tw) {
      const w = 22 + R() * 30, top = 150 + R() * 70, ww = Math.min(w, tw - x);
      c.fillStyle = T.mid; c.fillRect(x + 2, top, ww - 4, H - top);
      // 层层飞檐
      for (let y = top; y < H; y += 22 + R() * 8) {
        c.beginPath(); c.moveTo(x - 3, y + 1); c.quadraticCurveTo(x + 2, y - 1, x + ww * .5, y - 4); c.quadraticCurveTo(x + ww - 2, y - 1, x + ww + 3, y + 1); c.lineTo(x + ww, y + 3); c.lineTo(x, y + 3); c.closePath(); c.fill();
        for (let wx = x + 5; wx < x + ww - 5; wx += 5) if (R() < .35) { c.fillStyle = rgba(T.win[(R() * 3) | 0], .55); c.fillRect(wx, y + 6, 2, 3); c.fillStyle = T.mid; }
      }
      if (R() < .4) { c.fillRect(x + ww / 2 - .5, top - 12, 1, 9); c.beginPath(); circ(c, x + ww / 2, top - 12, 1.5); c.fill(); }
      x += w + R() * 6;
    }
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(0, 150, 0, H); g.addColorStop(0, rgba(T.fog, 0)); g.addColorStop(1, rgba(T.fog, .35));
    c.fillStyle = g; c.fillRect(0, 0, tw, H); c.globalCompositeOperation = 'source-over';
    return { cv, w: tw };
  },
  drawLayers(c, L, camX, camY, a) {
    this.ensure(L);
    c.globalAlpha = a;
    c.drawImage(L.sky.cv, 0, 0, W, H);
    const tile = (img, f, yo) => { const tw = img.w; let ox = -((camX * f) % tw); if (ox > 0) ox -= tw; for (let x = ox; x < W; x += tw) c.drawImage(img.cv, x, yo, tw + .6, H); };
    const fy = -camY * .08; tile(L.far, .1, fy);
    if (fy < 0) { c.fillStyle = mixHex(L.T.far, L.T.fog, .5); c.fillRect(0, fy + H - .5, W, -fy + 1); }
    const my = 12 - camY * .2; tile(L.mid, .3, my);
    if (my < 0) { c.fillStyle = mixHex(L.T.mid, L.T.fog, .3); c.fillRect(0, my + H - .5, W, -my + 1); }
    c.globalAlpha = 1;
  },
  draw(c, camX, t, camY) {
    this.drawLayers(c, this.layers, camX, camY, 1);
    if (this.prev && this.fade > 0) { this.drawLayers(c, this.prev, camX, camY, this.fade); this.fade -= 1 / 90; if (this.fade <= 0) this.prev = null; }
  },
};

// ---------- 可挂钩楼阁（按坐标确定性生成，缓存为高分辨率位图） ----------
// 歇山屋顶：屋脊在 y=0，两端起翘的飞檐
function roofPath(c, x0, x1, y, h, over) {
  const w = x1 - x0;
  c.moveTo(x0 - over, y + h + 1.6);
  c.quadraticCurveTo(x0 - over * .3, y + h - .4, x0 + w * .16, y + h * .35);
  c.lineTo(x0 + w * .22, y); c.lineTo(x1 - w * .22, y); c.lineTo(x1 - w * .16, y + h * .35);
  c.quadraticCurveTo(x1 + over * .3, y + h - .4, x1 + over, y + h + 1.6);
  c.lineTo(x1 + over * .4, y + h + 1.2); c.lineTo(x0 - over * .4, y + h + 1.2); c.closePath();
}
function drawRoof(c, x0, x1, y, h, over, col, colS, T, tiles) {
  cel(c, q => roofPath(q, x0, x1, y, h, over), col, colS, { lw: .9, off: 1 });
  if (tiles) detail(() => {
    c.save(); c.beginPath(); roofPath(c, x0, x1, y, h, over); c.clip();
    c.strokeStyle = 'rgba(27,22,51,.35)'; c.lineWidth = .35; c.beginPath();
    for (let x = x0 - over; x < x1 + over; x += 2.2) { c.moveTo(x, y); c.lineTo(x + (x - (x0 + x1) / 2) * .06, y + h + 2); }
    c.stroke(); c.restore();
  });
  // 瓦当边 + 金色屋脊线
  c.fillStyle = mixHex(colS, '#000000', .2); c.fillRect(x0 - over * .4, y + h + .6, x1 - x0 + over * .8, .8);
}
function propFinial(c, x, y, T) {
  limb(c, [x, y, x, y - 7], .7, PAL.goldS, .45);
  for (const [yy, r] of [[-2.2, 1.5], [-4.6, 1.1], [-7.2, .8]]) flat(c, q => circ(q, x, y + yy, r), PAL.gold, .5);
}
function propChiwen(c, x, y, dir) {
  // 屋脊两端的鸱吻（卷尾螭首）
  flat(c, q => { q.moveTo(x, y + .5); q.quadraticCurveTo(x + dir * .5, y - 5, x + dir * 3, y - 5.5); q.quadraticCurveTo(x + dir * 1.4, y - 3.4, x + dir * 2.4, y - 1.8); q.quadraticCurveTo(x + dir * 1.4, y - .6, x + dir * 2.6, y + .5); q.closePath(); }, PAL.gold, .55);
}
function propBanner(c, x, y, T, R) {
  limb(c, [x, y, x, y - 18], .5, PAL.woodS, .35);
  const col = T.neon[(R() * 3) | 0], wv = R() * 6;
  flat(c, q => { q.moveTo(x + .3, y - 17.5); q.quadraticCurveTo(x + 4, y - 18.5 + Math.sin(wv), x + 8, y - 17); q.lineTo(x + 7, y - 13.5); q.quadraticCurveTo(x + 4, y - 14.5, x + .3, y - 13.5); q.closePath(); }, col, .5);
}
function propPlaque(c, b, R, x, y) {
  const txt = SIGNS[(R() * SIGNS.length) | 0], vert = txt.length > 1 || R() < .5;
  const w = vert ? 7 : 9, h = vert ? 5.5 + txt.length * 5.2 : 8;
  flat(c, q => rrect(q, x - w / 2 - .8, y - .8, w + 1.6, h + 1.6, 1), PAL.gold, .7);
  flat(c, q => rrect(q, x - w / 2, y, w, h, .6), '#2a1a3a', 0);
  c.font = '5.2px ' + BRUSH; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = PAL.gold;
  if (vert) for (let i = 0; i < txt.length; i++) c.fillText(txt[i], x, y + 3.2 + i * 5.2);
  else c.fillText(txt, x, y + h / 2 + .3);
  b.sign = { x: x - w / 2, y, w, h };
}
function lanternShape(c, x, y, s, col) {
  limb(c, [x, y - 2.8 * s, x, y - 4.2 * s], .3 * s, INK, 0);
  flat(c, q => q.rect(x - 1 * s, y - 2.9 * s, 2 * s, .7 * s), PAL.goldS, .35);
  cel(c, q => ell(q, x, y, 1.9 * s, 2.3 * s), col, mixHex(col, '#000000', .45), { lw: .55, off: .6 * s, hi: [x - .7 * s, y - .8 * s, .45 * s, 1 * s, 0, .4] });
  detail(() => { c.strokeStyle = 'rgba(27,22,51,.45)'; c.lineWidth = .25; c.beginPath(); c.moveTo(x, y - 2.2 * s); c.lineTo(x, y + 2.2 * s); c.moveTo(x - 1.1 * s, y - 1.9 * s); c.quadraticCurveTo(x - 1.9 * s, y, x - 1.1 * s, y + 1.9 * s); c.moveTo(x + 1.1 * s, y - 1.9 * s); c.quadraticCurveTo(x + 1.9 * s, y, x + 1.1 * s, y + 1.9 * s); c.stroke(); });
  flat(c, q => q.rect(x - .8 * s, y + 2.2 * s, 1.6 * s, .6 * s), PAL.goldS, .3);
  limb(c, [x, y + 2.8 * s, x, y + 4.4 * s], .45 * s, PAL.gold, 0);
}

function bldCanvas(b) {
  if (b.cv && b.gen === ART.gen) return b.cv;
  const T = b.T, R = srand(b.x * 7.13 + b.w * 131 + 17), bk = Math.min(ART.k, 3);
  const top = 30, pad = 7, h = H + 240 - b.y, w = b.w;
  const [cv, c] = mkCv((w + pad * 2) * bk, (h + top) * bk); c.scale(bk, bk); c.translate(pad, top);
  const roofC = T.bld[(R() * T.bld.length) | 0], roofS = mixHex(roofC, '#000000', .4);
  const wall = mixHex(T.wall, T.bld[0], .35), wallS = mixHex(wall, T.bld[1], .45);
  const pillar = mixHex(PAL.zhu, T.bld[0], .3), pillarS = mixHex(PAL.zhuS, T.bld[0], .3);
  b.light = null; b.sign = null;
  const RH = 9, bodyY = RH + 1, sw = Math.max(6, w * .18);
  // ---- 屋顶道具（先画，屋顶会覆盖其底部）----
  const f = R();
  if (f < .3) propFinial(c, w / 2, 0, T);
  else if (f < .55) { const bx = 6 + R() * (w - 18); propBanner(c, bx, .5, T, R); }
  else if (f < .75) { const lx = w * .25 + R() * w * .5; limb(c, [lx, 0, lx, -9], .45, PAL.woodS, .3); b.light = { x: lx, y: -9 }; }
  // ---- 墙体：月白墙 + 朱红柱 + 花窗 ----
  c.fillStyle = wall; c.fillRect(0, bodyY, w, h);
  c.fillStyle = wallS; c.fillRect(w - sw, bodyY, sw, h);
  const floorH = 26 + ((R() * 3) | 0) * 2, lit = .3 + R() * .25, style = (R() * 2) | 0;
  for (let fy = bodyY; fy < h; fy += floorH) {
    // 柱
    for (let px = 1.5; px < w; px += Math.max(12, w / Math.round(w / 16))) { c.fillStyle = px > w - sw ? pillarS : pillar; c.fillRect(px - 1.2, fy, 2.4, floorH); }
    c.fillStyle = pillar; c.fillRect(w - 2.6, fy, 2.4, floorH); c.fillStyle = pillarS; c.fillRect(w - 2.6, fy, 2.4, floorH);
    // 窗
    const nwin = Math.max(1, Math.floor((w - 6) / 14));
    for (let i = 0; i < nwin; i++) {
      const wx = 4 + i * ((w - 8) / nwin) + 1.5, ww = (w - 8) / nwin - 3, wy = fy + 5, wh = floorH - 11, side = wx > w - sw;
      const on = R() < lit, wc = T.win[(R() * 3) | 0];
      c.fillStyle = on ? (side ? mixHex(wc, wallS, .4) : wc) : mixHex(T.bld[2], '#000000', .25); c.fillRect(wx, wy, ww, wh);
      c.strokeStyle = on ? 'rgba(120,40,20,.55)' : 'rgba(0,0,0,.35)'; c.lineWidth = .35; c.beginPath();
      if (style === 0) { for (let gx = wx + 2; gx < wx + ww; gx += 2) { c.moveTo(gx, wy); c.lineTo(gx, wy + wh); } c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); }
      else { for (let gy = wy + 2; gy < wy + wh; gy += 2.4) { c.moveTo(wx, gy); c.lineTo(wx + ww, gy); } for (let gx = wx + 3; gx < wx + ww; gx += 3) { c.moveTo(gx, wy); c.lineTo(gx, wy + wh); } }
      c.stroke(); c.strokeStyle = INK; c.lineWidth = .5; c.strokeRect(wx, wy, ww, wh);
    }
    // 栏杆 + 腰檐
    const ry = fy + floorH - 4.5;
    c.fillStyle = mixHex(pillar, '#000000', .1); c.fillRect(-1, ry, w + 2, .9); c.fillRect(-1, ry + 3, w + 2, .9);
    c.fillStyle = mixHex(pillarS, '#000000', .1); for (let x = 1; x < w; x += 2.4) c.fillRect(x, ry, .7, 3.4);
    if (fy + floorH < h) drawRoof(c, 0, w, fy + floorH - .5, 3.6, 3.2, roofC, roofS, T, false);
  }
  // 牌匾 & 灯笼
  if (R() < .6 && w > 34) propPlaque(c, b, R, w * (.3 + R() * .4), bodyY + 3);
  const nl = R() < .7 ? 1 + ((R() * 2) | 0) : 0;
  for (let i = 0; i < nl; i++) lanternShape(c, w * (i ? .82 : .18) + (R() - .5) * 4, bodyY + 6.5, 1, T.neon[0]);
  // 越往下越沉入云墨：半调暗部
  c.save(); c.beginPath(); c.rect(-2, bodyY, w + 4, h); c.clip();
  halftone(c, -2, 60, w + 4, 140, 'rgba(18,13,28,.55)', 3, 0, .9);
  c.fillStyle = 'rgba(18,13,28,.55)'; c.fillRect(-2, 200, w + 4, h);
  c.restore();
  c.beginPath(); c.rect(0, bodyY, w, h); c.strokeStyle = INK; c.lineWidth = .9; c.stroke();
  // 主屋顶 + 金色屋脊（可挂钩提示）
  drawRoof(c, 0, w, 0, RH, 6, roofC, roofS, T, true);
  propChiwen(c, w * .22, 0, -1); propChiwen(c, w * .78, 0, 1);
  c.fillStyle = T.edge; c.fillRect(w * .22, -.5, w * .56, 1);
  b.cv = cv; b.gen = ART.gen; b.pad = pad; b.topPad = top; b.cw = w + pad * 2; b.ch = h + top;
  return cv;
}

// 浮空灯舫：木平台 + 朱栏 + 两盏悬灯 + 托底祥云
function floatCanvas(f) {
  if (f.cv && f.gen === ART.gen) return f.cv;
  const bk = Math.min(ART.k, 3), pw = f.w + 12, ph = f.h + 16, [cv, c] = mkCv(pw * bk, ph * bk);
  c.scale(bk, bk); c.translate(pw / 2, f.h / 2 + 3);
  const R = srand(f.x * 3.7), T = BG.layers.T, txt = ['福', '云', '渡', '仙', '缘', '月'][(R() * 6) | 0];
  // 顶棚
  drawRoof(c, -f.w / 2 + 3, f.w / 2 - 3, -f.h / 2 - 1.5, 4.2, 4, T.bld[0], mixHex(T.bld[0], '#000000', .4), T, true);
  for (const k of [-1, 1]) cel(c, q => q.rect(k * (f.w / 2 - 5) - .9, -f.h / 2 + 3, 1.8, f.h - 4), PAL.zhu, PAL.zhuS, { lw: .5 });
  // 船身
  cel(c, q => { q.moveTo(-f.w / 2 - 2, f.h / 2 - 4); q.lineTo(f.w / 2 + 2, f.h / 2 - 4); q.quadraticCurveTo(f.w / 2, f.h / 2 + 1, f.w / 2 - 4, f.h / 2 + 1.5); q.lineTo(-f.w / 2 + 4, f.h / 2 + 1.5); q.quadraticCurveTo(-f.w / 2, f.h / 2 + 1, -f.w / 2 - 2, f.h / 2 - 4); q.closePath(); }, PAL.wood, PAL.woodS, { lw: .8 });
  c.fillStyle = PAL.gold; c.fillRect(-f.w / 2, f.h / 2 - 3.2, f.w, .7);
  // 挂幡
  flat(c, q => rrect(q, -3.6, -f.h / 2 + 3, 7.2, 6.4, .8), PAL.zhu, .6);
  c.font = '5.4px ' + BRUSH; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = PAL.paper; c.fillText(txt, 0, -f.h / 2 + 6.4);
  // 托底祥云
  c.save(); c.translate(0, f.h / 2 + 3.5);
  flat(c, q => cloudCurl(q, 0, 0, 2.4, 1), mixHex(T.wall, '#ffffff', .3), .6);
  detail(() => { c.beginPath(); curlLine(c, 0, 0, 2.4, 1); c.strokeStyle = 'rgba(27,22,51,.5)'; c.lineWidth = .4; c.stroke(); });
  c.restore();
  f.cv = cv; f.gen = ART.gen; f.pw = pw; f.ph = ph;
  return cv;
}

function drawWorld(c, camX, t) {
  for (const b of World.blds) {
    if (b.x > camX + W + 10 || b.x + b.w < camX - 10) continue;
    c.drawImage(bldCanvas(b), b.x - b.pad, b.y - b.topPad, b.cw, b.ch);
    const by = b.y - b.topPad + b.ch - .5; if (by < G.cam.y + H) { c.fillStyle = '#120d1c'; c.fillRect(b.x, by, b.w, G.cam.y + H - by + 2); }
    if (b.light) {
      const x = b.x + b.light.x, y = b.y + b.light.y + 4.4, sw = Math.sin(t * 2 + b.x) * .12;
      c.save(); c.translate(x, y - 4.4); c.rotate(sw); lanternShape(c, 0, 4.4, 1.1, b.T.neon[0]); c.restore();
    }
  }
  for (const f of World.floats) {
    if (f.x > camX + W + 10 || f.x + f.w < camX - 10) continue;
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2 + Math.sin(t * 2 + f.ph) * 1.2;
    c.drawImage(floatCanvas(f), cx - f.pw / 2, cy - f.h / 2 - 3, f.pw, f.ph);
    for (const k of [-1, 1]) { c.save(); c.translate(cx + k * (f.w / 2 - 1), cy + f.h / 2 - 2.5); c.rotate(Math.sin(t * 2.4 + k + f.ph) * .15); lanternShape(c, 0, 4, .75, PAL.zhu); c.restore(); }
  }
}

// ---------- 墨灾：底部云海被墨染 + 左侧推进的墨潮 ----------
function gooY(wx, t) { return 12 + Math.sin(wx * .045 + t * 1.8) * 3 + Math.sin(wx * .12 - t * 2.6) * 2 + Math.sin(wx * .02 + t) * 4; }
function drawAbyss(c, camX, t) {
  const T = BG.layers.T;
  const g = c.createLinearGradient(0, H - 70, 0, H); g.addColorStop(0, rgba(T.hor, 0)); g.addColorStop(1, rgba(T.hor, .22));
  c.fillStyle = g; c.fillRect(0, H - 70, W, 70);
  // 远处浅色云海（被墨吞没之前的云）
  c.fillStyle = rgba(mixHex(T.wall, T.fog, .5), .35);
  for (let i = -1; i < 8; i++) { const wx = Math.floor(camX * .6 / 70) * 70 + i * 70, x = wx - camX * .6, y = H - 24 + Math.sin(wx) * 3; c.beginPath(); cloudCurl(c, x, y, 8, i % 2 ? 1 : -1); c.fill(); }
  // 墨色触须
  for (let i = 0; i < 5; i++) {
    const wx = Math.floor(camX / 140) * 140 + i * 140 + 40, x = wx - camX, ph = Math.sin(t * 1.3 + wx), hh = 10 + ph * 12;
    if (hh < 2) continue;
    const by = H - gooY(wx, t) + 3, sw = Math.sin(t * 2 + wx) * 4;
    flat(c, p => { p.moveTo(x - 3.5, by); p.quadraticCurveTo(x - 2 + sw, by - hh * .6, x + sw * 1.5, by - hh); p.quadraticCurveTo(x + 2 + sw, by - hh * .5, x + 3.5, by); p.closePath(); }, PAL.mo, .9);
  }
  // 墨云主体：一串云头组成的边缘
  c.beginPath(); c.moveTo(-4, H + 2);
  for (let x = -4; x <= W + 8; x += 4) c.lineTo(x, H - gooY(x + camX, t));
  c.lineTo(W + 8, H + 2); c.closePath();
  c.fillStyle = PAL.mo; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  c.beginPath(); for (let x = -4; x <= W + 8; x += 4) { const y = H - gooY(x + camX, t) + 1.2; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
  c.strokeStyle = PAL.moRim; c.lineWidth = .8; c.stroke();
  // 墨云里的卷纹与妖眼
  c.strokeStyle = rgba(PAL.moRim, .7); c.lineWidth = .6;
  for (let i = 0; i < 8; i++) { const wx = Math.floor(camX / 60) * 60 + i * 60 + 20, x = wx - camX, y = H - gooY(wx, t) + 6; c.beginPath(); curlLine(c, x, y, 3.2, i % 2 ? 1 : -1); c.stroke(); }
  for (let i = 0; i < 4; i++) {
    const wx = Math.floor(camX / 110) * 110 + i * 110 + 70, x = wx - camX, ph = (t * .6 + wx * .013) % 1;
    if (ph > .55) continue;
    const y = H - 5, o = ph < .06 ? ph / .06 : ph > .49 ? (.55 - ph) / .06 : 1;
    for (const s of [-1, 1]) flat(c, p => ell(p, x + s * 3, y, 2.2, 1.1 * o + .1, s * .35), '#ffcf6a', 0);
  }
}
function drawTide(c, t) {
  // 墨潮：粗笔触边缘 + 飞白 + 墨点
  c.beginPath(); c.moveTo(-2, -2);
  for (let y = -2; y <= H + 2; y += 4) c.lineTo(8 + Math.sin(y * .15 + t * 5) * 3 + Math.sin(y * .05 - t * 2) * 2, y);
  c.lineTo(-2, H + 2); c.closePath();
  c.fillStyle = PAL.mo; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
  c.strokeStyle = rgba(PAL.moRim, .8); c.lineWidth = .7; c.beginPath();
  for (let y = -2; y <= H + 2; y += 4) { const x = 7 + Math.sin(y * .15 + t * 5) * 3 + Math.sin(y * .05 - t * 2) * 2; y < 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
  c.stroke();
  c.fillStyle = PAL.mo;
  for (let i = 0; i < 6; i++) { const y = ((i * 53 + t * 40) % (H + 20)) - 10, x = 12 + Math.sin(i * 3 + t * 3) * 4; c.beginPath(); circ(c, x, y, 1 + (i % 3) * .5); c.fill(); }
}
