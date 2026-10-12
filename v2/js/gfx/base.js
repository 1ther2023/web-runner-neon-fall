'use strict';
// ============ 美术基础：国潮扁平风 · 《钩影 · 云阙坠墨》 ============
// 画面层级（美术总监规则）：
//   1. 背景：云海、远山、楼阁剪影——低饱和、雾化，永远不抢戏
//   2. 可抓楼阁：中明度，屋脊一条藤黄金线 = “这里能挂钩”
//   3. 角色 / 弹幕：最高对比——靛墨描边 + 两阶平涂 + 月白贴纸描边
// 不用大面积辉光；强调靠描边、色块对比与金线完成。
const INK = '#1b1633';
// 国潮色板（所有美术共用）
const PAL = {
  ink: INK, zhu: '#e8452c', zhuS: '#9a2418', qing: '#2a6f97', qingS: '#17405e', song: '#3fb8a8', songS: '#1e7468',
  gold: '#f2b544', goldS: '#b07a1c', paper: '#f4ecd8', paperS: '#c9bc9a', dai: '#5a3f7a', daiS: '#33214d',
  skin: '#f6d6b4', skinS: '#d9a57e', mo: '#120d1c', moS: '#060409', moRim: '#6a5a9a', wood: '#a0643a', woodS: '#5e3418', jade: '#7fd8b0',
};
// flash: 受击闪白程度；tint: 叠加色；stk/stkCol: “贴纸描边”模式（只画外扩轮廓，用于主角与精英）
const ART = { k: 1, gen: 0, flash: 0, tint: null, stk: 0, stkCol: '#fff' };
// 数字 / 短标签字体（ZCOOL 庆科黄油体）；标题书法字体（马善政）
const COMIC = '"ZCOOL QingKe HuangYou","Microsoft YaHei","PingFang SC",sans-serif';
const BRUSH = '"Ma Shan Zheng","STXingkai","KaiTi","STKaiti",serif';
const CNF = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';

function mkCv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext('2d')]; }

// 可复现随机数（建筑、招牌等按坐标生成，重建缓存时外观不变）
function srand(seed) { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }

// 光源固定在屏幕左上：求该方向在当前局部坐标中的向量（兼容旋转与镜像）
function lightVec(c, d) {
  const m = c.getTransform(), det = m.a * m.d - m.b * m.c || 1;
  const lx = (m.c - m.d) / det, ly = (m.b - m.a) / det, l = Math.hypot(lx, ly) || 1;
  return [lx / l * d, ly / l * d];
}

// ---------- 路径 ----------
function circ(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
function ell(c, x, y, rx, ry, rot) { rot = rot || 0; c.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function rrect(c, x, y, w, h, r) { if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
// 两端半径不同的胶囊（肌肉 / 机械臂段）
function bone(c, ax, ay, bx, by, ra, rb) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  if (d <= Math.abs(ra - rb) + .01) { const r = Math.max(ra, rb); circ(c, ra > rb ? ax : bx, ra > rb ? ay : by, r); return; }
  const a = Math.atan2(dy, dx), ph = Math.acos((ra - rb) / d);
  c.moveTo(ax + Math.cos(a + ph) * ra, ay + Math.sin(a + ph) * ra);
  c.arc(ax, ay, ra, a + ph, a + TAU - ph);
  c.arc(bx, by, rb, a - ph, a + ph);
  c.closePath();
}
// 仅在正常上色时绘制的细节（贴纸描边模式下跳过）
function detail(fn) { if (!ART.stk) fn(); }
function inkLines(c, a, w, pts) {
  if (ART.stk) return;
  c.beginPath(); for (let i = 0; i < pts.length; i += 4) { c.moveTo(pts[i], pts[i + 1]); c.lineTo(pts[i + 2], pts[i + 3]); }
  c.strokeStyle = 'rgba(11,6,18,' + a + ')'; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
}
function poly(c, a) { c.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) c.lineTo(a[i], a[i + 1]); c.closePath(); }
function star(c, x, y, n, r0, r1, rot) {
  for (let i = 0; i <= n * 2; i++) { const a = (rot || 0) + i / (n * 2) * TAU, r = i % 2 ? r0 : r1; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
// 不规则团块（墨妖）：n 个起伏，ph 为动画相位
function blobPath(c, x, y, r, n, amp, ph, sy) {
  sy = sy || 1;
  for (let i = 0; i <= n * 3; i++) {
    const a = i / (n * 3) * TAU, rr = r + Math.sin(a * n + ph) * amp + Math.sin(a * 3 - ph * .7) * amp * .5;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * sy;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

// ---------- 上色 ----------
// 两阶赛璐璐：整体填暗部 → 向光源平移后填亮部（剩下背光侧阴影）→ 高光 → 墨线
function cel(c, path, base, shade, o) {
  const lw = o && o.lw !== undefined ? o.lw : 1, off = (o && o.off) || 1.2;
  if (ART.stk) { stkPath(c, path, lw); return; }
  if (ART.flash) { base = mixHex(base, '#ffffff', ART.flash); shade = mixHex(shade, '#ffffff', ART.flash * .8); }
  c.beginPath(); path(c); c.fillStyle = shade; c.fill();
  c.save(); c.clip();
  const [lx, ly] = lightVec(c, off);
  c.translate(lx, ly); c.beginPath(); path(c); c.fillStyle = base; c.fill();
  if (o && o.hi) { c.translate(-lx, -ly); const h = o.hi; c.beginPath(); ell(c, h[0], h[1], h[2], h[3], h[4] || 0); c.fillStyle = 'rgba(255,255,255,' + (h[5] || .45) + ')'; c.fill(); }
  c.restore();
  if (ART.tint) { c.beginPath(); path(c); c.fillStyle = ART.tint; c.fill(); }
  if (lw) { c.beginPath(); path(c); c.lineWidth = lw; c.strokeStyle = (o && o.ink) || INK; c.lineJoin = 'round'; c.stroke(); }
}
// 单色平涂 + 墨线
function stkPath(c, path, lw) {
  c.beginPath(); path(c); c.fillStyle = c.strokeStyle = ART.stkCol; c.lineJoin = 'round';
  c.lineWidth = (lw || 0) + ART.stk * 2; c.stroke(); c.fill();
}
function flat(c, path, col, lw, ink) {
  if (ART.stk) { if (col) stkPath(c, path, lw); return; }
  c.beginPath(); path(c);
  if (col) { c.fillStyle = ART.flash ? mixHex(col, '#ffffff', ART.flash) : col; c.fill(); if (ART.tint) { c.fillStyle = ART.tint; c.fill(); } }
  if (lw) { c.lineWidth = lw; c.strokeStyle = ink || INK; c.lineJoin = 'round'; c.stroke(); }
}
// 粗线肢体：先铺墨线再铺颜色，得到带轮廓的圆头管状肢体
function limb(c, pts, w, col, lw, ink) {
  lw = lw === undefined ? .9 : lw;
  c.lineCap = c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (ART.stk) { c.strokeStyle = ART.stkCol; c.lineWidth = w + lw * 2 + ART.stk * 2; c.stroke(); return; }
  if (lw) { c.strokeStyle = ink || INK; c.lineWidth = w + lw * 2; c.stroke(); }
  c.strokeStyle = ART.flash ? mixHex(col, '#ffffff', ART.flash) : col; c.lineWidth = w; c.stroke();
  if (ART.tint) { c.strokeStyle = ART.tint; c.stroke(); }
}
function line(c, x0, y0, x1, y1, col, w) { if (ART.stk) return; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }

// ---------- 颜色 ----------
const _hx = new Map();
function hexRgb(h) {
  let v = _hx.get(h); if (v) return v;
  const s = h.replace('#', ''), n = parseInt(s.length === 3 ? s.split('').map(ch => ch + ch).join('') : s.slice(0, 6), 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; _hx.set(h, v); return v;
}
function rgbHex(r, g, b) { return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1); }
const _mix = new Map();
function mixHex(a, b, t) {
  if (a[0] !== '#') return a;
  const k = a + b + (t * 100 | 0); let v = _mix.get(k); if (v) return v;
  const A = hexRgb(a), B = hexRgb(b); v = rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  if (_mix.size > 4000) _mix.clear(); _mix.set(k, v); return v;
}
function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

// ---------- 半调网点（仅用于缓存图层） ----------
// 在矩形内按行绘制圆点，半径随 y 从 r0 线性过渡到 r1
function halftone(c, x, y, w, h, col, step, r0, r1, clipPath) {
  c.save(); if (clipPath) { c.beginPath(); clipPath(c); c.clip(); }
  c.fillStyle = col; c.beginPath();
  for (let j = 0, yy = y; yy < y + h; yy += step, j++) {
    const r = lerp(r0, r1, (yy - y) / h) * step * .5; if (r < .05) continue;
    for (let xx = x + (j % 2 ? step / 2 : 0); xx < x + w; xx += step) { c.moveTo(xx + r, yy); c.arc(xx, yy, r, 0, TAU); }
  }
  c.fill(); c.restore();
}

// ---------- 国潮纹样 ----------
// 祥云卷：一个主卷 + 两个小卷的云头
function cloudCurl(c, x, y, r, dir) {
  dir = dir || 1;
  c.moveTo(x - r * 2.2 * dir, y + r * .9);
  c.bezierCurveTo(x - r * 2.6 * dir, y - r * .2, x - r * 1.4 * dir, y - r * .9, x - r * .8 * dir, y - r * .3);
  c.bezierCurveTo(x - r * .6 * dir, y - r * 1.5, x + r * 1.2 * dir, y - r * 1.6, x + r * 1.1 * dir, y - r * .2);
  c.bezierCurveTo(x + r * 2 * dir, y - r * .5, x + r * 2.6 * dir, y + r * .4, x + r * 2 * dir, y + r * .9);
  c.closePath();
}
function curlLine(c, x, y, r, dir) {
  // 云头里的螺旋线
  dir = dir || 1; c.moveTo(x + r * .55 * dir, y - r * .15);
  c.arc(x, y - r * .15, r * .55, 0, Math.PI * 1.5 * dir, dir < 0);
  c.arc(x - r * .12 * dir, y - r * .1, r * .3, Math.PI * 1.5, Math.PI * .5, dir > 0);
}
// 海水江崖纹：一排同心半圆浪
function waveRow(c, x0, x1, y, r, col, line, lw) {
  for (let x = x0; x < x1 + r; x += r * 2) {
    c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.lineTo(x + r, y + r); c.lineTo(x - r, y + r); c.closePath(); c.fillStyle = col; c.fill();
    c.beginPath(); for (const k of [1, .68, .36]) { c.moveTo(x + r * k, y); c.arc(x, y, r * k, 0, Math.PI, true); }
    c.strokeStyle = line; c.lineWidth = lw || .5; c.stroke();
  }
}
// 印章：朱红方块 + 反白字
function seal(c, x, y, s, txt, col) {
  c.save(); c.translate(x, y); c.rotate(-.06);
  c.fillStyle = col || PAL.zhu; c.beginPath(); rrect(c, -s / 2, -s / 2, s, s, s * .12); c.fill();
  c.strokeStyle = PAL.paper; c.lineWidth = s * .05; c.beginPath(); rrect(c, -s * .4, -s * .4, s * .8, s * .8, s * .08); c.stroke();
  c.font = (s * .55) + 'px ' + BRUSH; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = PAL.paper; c.fillText(txt, 0, s * .04);
  c.restore();
}

// ---------- 文字 ----------
function comic(c, s, x, y, size, fill, align, o) {
  c.font = (o && o.cn ? size + 'px ' + BRUSH : size + 'px ' + COMIC);
  c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (!(o && o.noDrop)) { c.fillStyle = INK; c.fillText(s, x + size * .07, y + size * .09); }
  c.lineWidth = size * (o && o.thin ? .14 : .22) + .4; c.strokeStyle = (o && o.ink) || INK; c.strokeText(s, x, y);
  c.fillStyle = fill; c.fillText(s, x, y);
}
function plain(c, s, x, y, size, fill, align, bold) {
  c.font = (bold ? '700 ' : '600 ') + size + 'px ' + CNF; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.fillStyle = fill; c.fillText(s, x, y);
}

// ---------- 精灵缓存（按当前屏幕缩放 k 渲染，窗口缩放时失效） ----------
const SPRC = new Map();
function spr(key, w, h, draw) {
  let s = SPRC.get(key); if (s && s.gen === ART.gen) return s;
  const kk = Math.min(ART.k, 4), [cv, x] = mkCv(w * kk, h * kk);
  x.scale(kk, kk); x.translate(w / 2, h / 2); draw(x);
  s = { cv, w, h, gen: ART.gen }; SPRC.set(key, s); return s;
}
function blit(c, s, x, y, sc) { sc = sc || 1; c.drawImage(s.cv, x - s.w * sc / 2, y - s.h * sc / 2, s.w * sc, s.h * sc); }
function artResize(k) { if (Math.abs(k - ART.k) < .001) return false; ART.k = k; ART.gen++; SPRC.clear(); return true; }
