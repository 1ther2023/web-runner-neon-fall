'use strict';
// ============ v0.4 手绘贴图层：雨夜霓虹城（奥日风） ============
// 本文件在其它 gfx 之后加载，覆盖旧国潮的程序化绘制：主角、敌人、BOSS、背景、楼体。
// 贴图来源：art/*.png（AI 生成的手绘风设定，已抠图）。
const SPR = {};
const SPR_LIST = ['hero_swing', 'hero_double', 'hero_fall', 'hero_idle',
  'en_drone', 'en_thug', 'en_blob', 'en_eye', 'en_gunship', 'en_mine', 'en_wasp', 'en_sniper',
  'el_thug', 'el_drone', 'el_wasp', 'el_eye', 'el_sniper', 'el_gunship',
  'bs_vulture', 'bs_octo', 'bs_venom', 'bs_mantis', 'bs_hive', 'bs_ghost', 'bs_ring', 'bs_doom', 'bg_mid'];
for (const n of SPR_LIST) { const im = new Image(); im.src = 'art/' + n + '.png'; SPR[n] = im; }
SPR.bg_far = new Image(); SPR.bg_far.src = 'art/bg_far.jpg';
const sprOk = im => im && im.complete && im.naturalWidth > 0;

// 受击闪白：按需生成白色剪影
const _white = {};
function whiteOf(n) {
  if (_white[n]) return _white[n];
  const im = SPR[n]; if (!sprOk(im)) return null;
  const [cv, c] = mkCv(im.naturalWidth, im.naturalHeight);
  c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
  return (_white[n] = cv);
}
// 以 (0,0) 为中心绘制；size = 最长边的逻辑像素；flip = 水平镜像
function sprDraw(c, n, size, flip, flash, glow) {
  const im = SPR[n]; if (!sprOk(im)) return false;
  const iw = im.naturalWidth, ih = im.naturalHeight, s = size / Math.max(iw, ih), w = iw * s, h = ih * s;
  c.save(); if (flip) c.scale(-1, 1);
  if (glow) { c.shadowColor = glow; c.shadowBlur = 8 * ART.k; }
  c.drawImage(im, -w / 2, -h / 2, w, h);
  c.shadowBlur = 0;
  if (flash > 0) { const wcv = whiteOf(n); if (wcv) { c.globalAlpha = flash; c.drawImage(wcv, -w / 2, -h / 2, w, h); c.globalAlpha = 1; } }
  c.restore(); return true;
}

// ---------- 主角：兜帽信使 ----------
const HERO_H = 40; // 屏幕上的高度（逻辑像素）
function heroPose(P) {
  const n = P.hands.filter(h => h.rope && h.rope.state === 'stuck').length;
  return n >= 2 ? 'hero_double' : n === 1 ? 'hero_swing' : 'hero_fall';
}
function heroHandWorld(P, i) {
  const pose = heroPose(P);
  const lx = pose === 'hero_fall' ? 9 : (i ? 4 : -4), ly = pose === 'hero_fall' ? -3 : -HERO_H * .46;
  const c = Math.cos(P.rot), s = Math.sin(P.rot);
  return [P.x + lx * c - ly * s, P.y + lx * s + ly * c];
}
function drawHero(c, P, t) {
  const pose = heroPose(P), flip = P.vx < -60 && pose === 'hero_fall';
  const rot = pose === 'hero_fall' ? clamp(P.vx * .0015, -.35, .35) + (Math.abs(P.spin) > 1 ? P.rot : 0) : P.rot;
  const sp = Math.hypot(P.vx, P.vy);
  // 高速残影（青色）
  if (sp > 220 && P.trail.length > 2) {
    for (let i = 0; i < P.trail.length - 1; i += 2) {
      const tr = P.trail[i];
      c.save(); c.translate(tr.x, tr.y); c.rotate(tr.rot);
      c.globalAlpha = (i + 1) / P.trail.length * .28 * Math.min(1, (sp - 220) / 120);
      const wcv = whiteOf(pose); if (wcv) { const im = SPR[pose], s = HERO_H / Math.max(im.naturalWidth, im.naturalHeight); c.filter = 'none'; c.drawImage(wcv, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
      c.restore();
    }
    c.globalAlpha = 1;
  }
  const blink = P.inv > 0 && ((G.time * 20) | 0) % 2;
  c.save(); c.translate(P.x, P.y); c.rotate(rot);
  // 琥珀色目镜辉光
  const g = c.createRadialGradient(0, -HERO_H * .28, 0, 0, -HERO_H * .28, 9);
  g.addColorStop(0, G.ultT > 0 ? 'rgba(255,200,80,.45)' : 'rgba(255,170,60,.22)'); g.addColorStop(1, 'rgba(255,170,60,0)');
  c.fillStyle = g; c.fillRect(-10, -HERO_H * .28 - 10, 20, 20);
  if (!sprDraw(c, pose, HERO_H, flip, blink ? .8 : 0, G.ultT > 0 ? '#ffcf4a' : 'rgba(80,220,255,.55)')) { c.restore(); return; }
  c.restore();
}
function drawHeroPortrait(c, x, y, r) {
  c.save(); c.translate(x, y);
  c.beginPath(); circ(c, 0, 0, r); c.fillStyle = '#16233a'; c.fill();
  c.beginPath(); circ(c, 0, 0, r * .93); c.clip();
  const im = SPR.hero_idle;
  if (sprOk(im)) { const s = r * 4.2 / im.naturalHeight; c.drawImage(im, -im.naturalWidth * s / 2, -r * 1.05, im.naturalWidth * s, im.naturalHeight * s); }
  c.restore();
}

// ---------- 敌人 / 精英 ----------
const EN_SIZE = { drone: 4.4, thug: 4.4, blob: 4.0, eye: 4.6, gunship: 4.4, mine: 4.0, wasp: 4.4, sniper: 4.8 };
function drawEnemies(c, t) {
  const P = Player;
  for (const e of Enemies.list) {
    if (e.x < G.cam.x - 60 || e.x > G.cam.x + W + 70) continue;
    if (e.aimT > 0) { const k = 1 - e.aimT / .8; c.globalAlpha = .3 + k * .6; c.setLineDash([3, 3]); line(c, e.x, e.y, e.x + Math.cos(e.aimA) * 420, e.y + Math.sin(e.aimA) * 420, '#ff3060', .5 + k); c.setLineDash([]); c.globalAlpha = 1; }
    if (e.dash && e.dash.t < .5) { c.globalAlpha = .45 + (e.dash.t * 16 | 0) % 2 * .4; c.setLineDash([2, 2.5]); line(c, e.x, e.y, e.dash.tx, e.dash.ty, '#ffcf3a', 1); c.setLineDash([]); c.globalAlpha = 1; }
    const flip = P.x > e.x; // 贴图默认面朝左
    let n = 'en_' + e.type, size = e.r * (EN_SIZE[e.type] || 4.4);
    if (e.elite && SPR['el_' + e.type]) { n = 'el_' + e.type; size = e.r * 3.2; }
    const bob = Math.sin(t * 3 + e.t) * (e.type === 'thug' ? .4 : 1.2);
    c.save(); c.translate(e.x, e.y + bob);
    if (e.type === 'blob') c.scale(1 + Math.sin(t * 6 + e.t) * .06, 1 - Math.sin(t * 6 + e.t) * .06);
    if (!sprDraw(c, n, size, flip, e.flash > 0 ? .7 : 0, e.elite ? 'rgba(255,200,80,.8)' : null)) {
      const art = EART[e.type]; if (art) { c.scale(1.15 * (flip ? -1 : 1), 1.15); art(c, e, t, P, flip ? -1 : 1); }
    }
    c.restore();
    if (e.elite) {
      comic(c, '精英', e.x, e.y - size * .55 - 9, 6.5, '#ffcf4a', 'center', { thin: true });
      hpBar(c, e.x - 17, e.y - size * .55 - 4, 34, 2.6, e.hp / e.maxHp, '#ffcf4a');
    } else if (e.hp < e.maxHp && e.maxHp > 12) hpBar(c, e.x - 8, e.y - size * .5 - 4, 16, 1.8, e.hp / e.maxHp, '#ff3a4a');
  }
}

// ---------- BOSS ----------
const BOSS_SPR = { vulture: 'bs_vulture', octo: 'bs_octo', venom: 'bs_venom', mantis: 'bs_mantis', hive: 'bs_hive', ghost: 'bs_ghost', ring: 'bs_ring', doom: 'bs_doom' };
function drawBoss(c, b, t) {
  if (b.state === 'dying' && ((t * 20) | 0) % 2 && b.dying < 1) return;
  const n = BOSS_SPR[b.def.id];
  c.save(); c.translate(b.x, b.y + Math.sin(t * 1.6) * 2); c.rotate(Math.sin(t * 1.3) * .04);
  const glow = b.enraged ? 'rgba(255,40,70,' + (.6 + Math.sin(t * 10) * .3).toFixed(2) + ')' : rgba(b.def.col, .6);
  const ok = n && sprDraw(c, n, (b.def.size || 92) * (b.enraged ? 1.08 : 1), Player.x < b.x, b.flash > 0 ? .45 : 0, glow);
  if (!ok) { const art = BART[b.def.id]; if (art) { c.scale(1.3, 1.3); art(c, b, t); } }
  c.restore();
}

// ---------- 背景：远景雨夜城 + 中景剪影 + 雨 ----------
const THEME_TINT = ['rgba(120,60,160,.10)', 'rgba(30,60,140,.12)', 'rgba(20,120,120,.12)', 'rgba(160,20,40,.16)'];
BG.drawLayers = function (c, L, camX, camY, a) {
  c.globalAlpha = a;
  const far = SPR.bg_far, mid = SPR.bg_mid;
  if (sprOk(far)) {
    const h = H, w = far.naturalWidth * h / far.naturalHeight; let ox = -((camX * .08) % w); if (ox > 0) ox -= w;
    for (let x = ox; x < W; x += w) c.drawImage(far, x, 0, w + .5, h);
  } else { c.fillStyle = '#141a3a'; c.fillRect(0, 0, W, H); }
  // 体积光柱
  const ti = BG.theme | 0;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = ((i * 190 - camX * .05) % 640 + 640) % 640 - 80, g = c.createLinearGradient(x, 0, x + 60, H);
    g.addColorStop(0, 'rgba(120,180,255,.10)'); g.addColorStop(1, 'rgba(120,180,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 26, 0); c.lineTo(x + 110, H); c.lineTo(x + 50, H); c.closePath(); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  if (sprOk(mid)) {
    const h = 190, w = mid.naturalWidth * h / mid.naturalHeight; let ox = -((camX * .25) % w); if (ox > 0) ox -= w;
    c.globalAlpha = a * .85;
    for (let x = ox; x < W; x += w) c.drawImage(mid, x, H - h + 18, w + .5, h);
    c.globalAlpha = a;
  }
  // 雾 + 章节色调
  const fg = c.createLinearGradient(0, H * .45, 0, H); fg.addColorStop(0, 'rgba(40,30,80,0)'); fg.addColorStop(1, 'rgba(40,30,90,.45)');
  c.fillStyle = fg; c.fillRect(0, 0, W, H);
  c.fillStyle = THEME_TINT[ti] || THEME_TINT[0]; c.fillRect(0, 0, W, H);
  c.globalAlpha = 1;
};
BG.draw = function (c, camX, t, camY) {
  this.drawLayers(c, this.layers, camX, camY, 1);
  // 雨（屏幕空间，斜落）
  c.strokeStyle = 'rgba(170,200,255,.22)'; c.lineWidth = .5; c.beginPath();
  for (let i = 0; i < 90; i++) {
    const sx = (i * 97.3 + t * 40 - camX * .6) % (W + 40), x = (sx + W + 40) % (W + 40) - 20, y = (i * 53.7 + t * 420) % (H + 20) - 10;
    c.moveTo(x, y); c.lineTo(x - 3, y + 9);
  }
  c.stroke();
};

// ---------- 可挂楼体：深色高楼 + 霓虹窗 + 琥珀屋顶线（= 可以挂钩） ----------
const NEON = ['#ff3fa4', '#3fe0ff', '#ffb347', '#a070ff'];
function bldCanvas(b) {
  if (b.cv && b.gen === ART.gen) return b.cv;
  const R = srand(b.x * 7.13 + b.w * 131 + 17), bk = Math.min(ART.k, 3);
  const top = 30, pad = 7, h = H + 240 - b.y, w = b.w;
  const [cv, c] = mkCv((w + pad * 2) * bk, (h + top) * bk); c.scale(bk, bk); c.translate(pad, top);
  b.light = null;
  const neon = NEON[(R() * NEON.length) | 0];
  // 屋顶道具
  const f = R();
  if (f < .3) { c.fillStyle = '#0c0a18'; c.fillRect(w * .3, -14, 1.2, 14); c.fillRect(w * .3 - 3, -6, 7, 1); b.light = { x: w * .3 + .6, y: -14, col: '#ff3050' }; }
  else if (f < .5) { const tx = 4 + R() * (w - 18); c.fillStyle = '#141024'; c.fillRect(tx, -10, 12, 8); c.fillRect(tx + 1, -2, 1.2, 2); c.fillRect(tx + 9.8, -2, 1.2, 2); c.beginPath(); c.moveTo(tx - 1, -10); c.lineTo(tx + 6, -14); c.lineTo(tx + 13, -10); c.closePath(); c.fill(); }
  else if (f < .7) { for (let i = 0; i < 2; i++) { const ax = 3 + R() * (w - 12); c.fillStyle = '#1a1630'; c.fillRect(ax, -5, 8, 5); c.fillStyle = '#2a2648'; c.fillRect(ax + 1, -4, 6, 1); } }
  // 楼体
  const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#242446'); g.addColorStop(.25, '#1a1a36'); g.addColorStop(1, '#0e0d20');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // 左缘冷色轮廓光
  c.fillStyle = 'rgba(90,200,255,.35)'; c.fillRect(0, 0, .8, h);
  // 窗格
  const cw = 5 + ((R() * 2) | 0), ch = 7 + ((R() * 3) | 0), lit = .14 + R() * .2, warm = R() < .5;
  for (let y = 6; y < h; y += ch) for (let x = 3; x < w - 4; x += cw) {
    if (R() < lit) { const col = R() < .75 ? (warm ? '#ffcc7a' : '#9fe8ff') : NEON[(R() * 4) | 0]; c.fillStyle = rgba(col, .55 + R() * .35); }
    else c.fillStyle = 'rgba(40,40,80,.55)';
    c.fillRect(x, y, cw - 2.4, ch - 3.6);
  }
  // 竖向霓虹灯条（无字）
  if (R() < .55 && w > 30) {
    const sx = R() < .5 ? 2.5 : w - 7, sy = 14 + R() * 30, sh = 26 + R() * 40;
    c.fillStyle = '#0a0814'; c.fillRect(sx - 1, sy - 1, 6, sh + 2);
    c.shadowColor = neon; c.shadowBlur = 6; c.fillStyle = neon; c.fillRect(sx, sy, 4, sh); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(sx + 1.6, sy + 2, .8, sh - 4);
  }
  // 越往下越暗（沉入雾与黑潮）
  const dg = c.createLinearGradient(0, 40, 0, 220); dg.addColorStop(0, 'rgba(8,6,18,0)'); dg.addColorStop(1, 'rgba(8,6,18,.85)');
  c.fillStyle = dg; c.fillRect(0, 0, w, h);
  // 屋顶护栏 + 琥珀挂点线
  c.fillStyle = '#2c2a50'; c.fillRect(-1.5, -2, w + 3, 3.5);
  c.shadowColor = '#ffb347'; c.shadowBlur = 5; c.fillStyle = '#ffc261'; c.fillRect(-1, -2.2, w + 2, 1.1); c.shadowBlur = 0;
  b.cv = cv; b.gen = ART.gen; b.pad = pad; b.topPad = top; b.cw = w + pad * 2; b.ch = h + top;
  return cv;
}
// 浮空平台：金属悬浮板 + 青色推进光
function floatCanvas(f) {
  if (f.cv && f.gen === ART.gen) return f.cv;
  const bk = Math.min(ART.k, 3), pw = f.w + 12, ph = f.h + 16, [cv, c] = mkCv(pw * bk, ph * bk);
  c.scale(bk, bk); c.translate(pw / 2, f.h / 2 + 3);
  const g = c.createLinearGradient(0, -f.h / 2, 0, f.h / 2); g.addColorStop(0, '#3a3866'); g.addColorStop(1, '#141228');
  c.fillStyle = g; c.beginPath(); c.moveTo(-f.w / 2 - 2, -f.h / 2); c.lineTo(f.w / 2 + 2, -f.h / 2); c.lineTo(f.w / 2 - 3, f.h / 2); c.lineTo(-f.w / 2 + 3, f.h / 2); c.closePath(); c.fill();
  c.shadowColor = '#ffb347'; c.shadowBlur = 5; c.fillStyle = '#ffc261'; c.fillRect(-f.w / 2 - 2, -f.h / 2 - .6, f.w + 4, 1.1); c.shadowBlur = 0;
  c.fillStyle = 'rgba(90,220,255,.8)'; for (const k of [-1, 1]) c.fillRect(k * f.w * .28 - 2, f.h / 2 - 1, 4, 1.4);
  f.gen = ART.gen; f.cv = cv; f.pw = pw; f.ph = ph;
  return cv;
}
function drawWorld(c, camX, t) {
  for (const b of World.blds) {
    if (b.x > camX + W + 10 || b.x + b.w < camX - 10) continue;
    c.drawImage(bldCanvas(b), b.x - b.pad, b.y - b.topPad, b.cw, b.ch);
    const by = b.y - b.topPad + b.ch - .5; if (by < G.cam.y + H) { c.fillStyle = '#08060f'; c.fillRect(b.x, by, b.w, G.cam.y + H - by + 2); }
    if (b.light && ((t * 1.5 + b.x) % 2) < 1.2) { c.fillStyle = b.light.col; c.beginPath(); circ(c, b.x + b.light.x, b.y + b.light.y, 1.3); c.fill(); c.fillStyle = 'rgba(255,48,80,.25)'; c.beginPath(); circ(c, b.x + b.light.x, b.y + b.light.y, 3.5); c.fill(); }
  }
  for (const f of World.floats) {
    if (f.x > camX + W + 10 || f.x + f.w < camX - 10) continue;
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2 + Math.sin(t * 2 + f.ph) * 1.2;
    c.drawImage(floatCanvas(f), cx - f.pw / 2, cy - f.h / 2 - 3, f.pw, f.ph);
    c.globalCompositeOperation = 'lighter';
    for (const k of [-1, 1]) { const gx = cx + k * f.w * .28, g = c.createLinearGradient(0, cy + f.h / 2, 0, cy + f.h / 2 + 10); g.addColorStop(0, 'rgba(90,220,255,.5)'); g.addColorStop(1, 'rgba(90,220,255,0)'); c.fillStyle = g; c.fillRect(gx - 2.5, cy + f.h / 2, 5, 10 + Math.sin(t * 20 + k) * 1.5); }
    c.globalCompositeOperation = 'source-over';
  }
}

// ---------- 底部黑潮：发紫光的黏液海 ----------
function drawAbyss(c, camX, t) {
  const g = c.createLinearGradient(0, H - 80, 0, H); g.addColorStop(0, 'rgba(120,40,200,0)'); g.addColorStop(1, 'rgba(140,50,220,.35)');
  c.fillStyle = g; c.fillRect(0, H - 80, W, 80);
  // 黑潮触须
  for (let i = 0; i < 5; i++) {
    const wx = Math.floor(camX / 140) * 140 + i * 140 + 40, x = wx - camX, ph = Math.sin(t * 1.3 + wx), hh = 12 + ph * 14;
    if (hh < 2) continue;
    const by = H - gooY(wx, t) + 3, sw = Math.sin(t * 2 + wx) * 4;
    c.beginPath(); c.moveTo(x - 4, by); c.quadraticCurveTo(x - 2 + sw, by - hh * .6, x + sw * 1.5, by - hh); c.quadraticCurveTo(x + 2 + sw, by - hh * .5, x + 4, by); c.closePath();
    c.fillStyle = '#07040e'; c.fill(); c.strokeStyle = 'rgba(170,90,255,.6)'; c.lineWidth = .6; c.stroke();
  }
  c.beginPath(); c.moveTo(-4, H + 2);
  for (let x = -4; x <= W + 8; x += 4) c.lineTo(x, H - gooY(x + camX, t));
  c.lineTo(W + 8, H + 2); c.closePath();
  const sg = c.createLinearGradient(0, H - 26, 0, H); sg.addColorStop(0, '#120a24'); sg.addColorStop(1, '#030207');
  c.fillStyle = sg; c.fill();
  c.save(); c.shadowColor = '#b060ff'; c.shadowBlur = 6 * ART.k;
  c.beginPath(); for (let x = -4; x <= W + 8; x += 4) { const y = H - gooY(x + camX, t) + .6; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
  c.strokeStyle = 'rgba(190,120,255,.9)'; c.lineWidth = .9; c.stroke(); c.restore();
  // 高光与气泡
  c.fillStyle = 'rgba(200,150,255,.5)';
  for (let i = 0; i < 14; i++) { const wx = Math.floor(camX / 36) * 36 + i * 36 + 10, x = wx - camX, ph = (t * .8 + wx * .37) % 1, y = H - gooY(wx, t) + 4 + (1 - ph) * 10; c.beginPath(); circ(c, x + Math.sin(ph * 6) * 1.5, y, .5 + ph * .9); c.fill(); }
  // 黑潮里的眼睛
  for (let i = 0; i < 4; i++) {
    const wx = Math.floor(camX / 110) * 110 + i * 110 + 70, x = wx - camX, ph = (t * .6 + wx * .013) % 1;
    if (ph > .55) continue;
    const y = H - 6, o = ph < .06 ? ph / .06 : ph > .49 ? (.55 - ph) / .06 : 1;
    c.fillStyle = '#c070ff'; for (const s of [-1, 1]) { c.beginPath(); ell(c, x + s * 3, y, 1.8, .9 * o + .1, s * .3); c.fill(); }
  }
}
function drawTide(c, t) {
  c.beginPath(); c.moveTo(-2, -2);
  for (let y = -2; y <= H + 2; y += 4) c.lineTo(8 + Math.sin(y * .15 + t * 5) * 3 + Math.sin(y * .05 - t * 2) * 2, y);
  c.lineTo(-2, H + 2); c.closePath();
  c.fillStyle = '#06030c'; c.fill();
  c.save(); c.shadowColor = '#b060ff'; c.shadowBlur = 6 * ART.k; c.strokeStyle = 'rgba(190,120,255,.85)'; c.lineWidth = .8; c.beginPath();
  for (let y = -2; y <= H + 2; y += 4) { const x = 7 + Math.sin(y * .15 + t * 5) * 3 + Math.sin(y * .05 - t * 2) * 2; y < 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
  c.stroke(); c.restore();
  c.fillStyle = '#06030c';
  for (let i = 0; i < 6; i++) { const y = ((i * 53 + t * 40) % (H + 20)) - 10, x = 12 + Math.sin(i * 3 + t * 3) * 4; c.beginPath(); circ(c, x, y, 1 + (i % 3) * .5); c.fill(); }
}
