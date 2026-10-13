'use strict';
// ============ v0.6 大招「万丝风暴」+ 敌弹/掉落物辨识度重做 ============
// 大招：主角身边卷起钩索漩涡，千条钩索射向全场锁住敌人，能量脉冲沿索输送伤害，结束时全部绷断爆开。
// 敌弹：暗芯 + 亮环（空心危险弹），统一偏红/紫，不再与金币、能量撞色。
// 掉落：金币 = 带黑描边的翻转金币；能量 = 绿色晶体。都是“实体物件”，不发光成球。

const ULT = { cables: [], webs: [], fireT: 0, t: 0, was: false, dur: 1 };
const ULT_COL = ['#3fe0ff', '#ffcf4a', '#e8fbff'];

function ultBase() { return (40 + G.level * 8) * (1 + Stats.ultDmg); }
function ultCable(e, x, y, delay, burst) {
  const P = Player;
  ULT.cables.push({ e, x: e ? e.x : x, y: e ? e.y : y, age: -(delay || 0), shoot: .1 + Math.random() * .06, life: burst ? .45 : .95,
    col: ULT_COL[ULT.cables.length % 3], wob: rand(-1, 1) * 14, ph: rand(0, TAU), hit: false, burst: !!burst, ox: P.x, oy: P.y });
}
function ultHit(cb) {
  const e = cb.e; if (!e || e.dead || (e.isBoss && !e.alive)) return;
  const b = ultBase();
  G.ultBurst = true;
  damageEnemy(e, e.isBoss ? Math.min(e.maxHp * .006, b * .5) : b * .55 * Diff.hp(), Math.random() < .3);
  G.ultBurst = false;
  FX.spark(e.x, e.y, 5, cb.col, 140, .25, 1);
  FX.ring(e.x, e.y, 2, 14, .25, cb.col, 1);
}

// ---------- 发动：在原有清屏伤害之后接上钩索风暴 ----------
const _ultimateOld = ultimate;
ultimate = function () {
  if (G.energy < 100 || !Player.alive) return;
  _ultimateOld();
  UI.banner('万丝风暴！', '千条钩索 · 锁定全场', 1.2);
  const P = Player; ULT.cables = []; ULT.t = 0; ULT.dur = G.ultT; ULT.fireT = .25;
  // 初始一圈：32 条钩索放射到屏幕边缘，屏内敌人每个先锁一条
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU + rand(-.05, .05), L = 320;
    ultCable(null, P.x + Math.cos(a) * L, P.y + Math.sin(a) * L, i % 4 * .02, true);
  }
  for (const e of allTargets()) if (onScreen(e)) ultCable(e, 0, 0, rand(0, .1), false);
  // 收束粒子
  for (let i = 0; i < 40; i++) { const a = rand(0, TAU), r = rand(40, 90); FX.p(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, -Math.cos(a) * r * 4, -Math.sin(a) * r * 4, .22, pick(ULT_COL), 1.2, 'line'); }
};

// ---------- 持续：每 0.12 秒补射钩索，锁定、输送、绷断 ----------
const _skUpdOld = Skills.update.bind(Skills);
Skills.update = function (dt) {
  _skUpdOld(dt);
  const P = Player, on = G.ultT > 0 && P.alive;
  if (on) {
    ULT.t += dt; ULT.fireT -= dt;
    if (ULT.fireT <= 0) {
      ULT.fireT = .12;
      const ts = allTargets().filter(onScreen);
      for (let k = 0; k < 2; k++) {
        if (ts.length) ultCable(pick(ts), 0, 0, 0, false);
        else { const a = rand(0, TAU); ultCable(null, P.x + Math.cos(a) * 260, P.y + Math.sin(a) * 260, 0, true); }
      }
    }
  }
  for (let i = ULT.cables.length - 1; i >= 0; i--) {
    const cb = ULT.cables[i]; cb.age += dt;
    if (cb.e && !cb.e.dead && !(cb.e.isBoss && !cb.e.alive)) { cb.x = cb.e.x; cb.y = cb.e.y; }
    else { cb.x += G.arDX; cb.y += G.arDY; }
    if (!cb.hit && cb.age >= cb.shoot) { cb.hit = true; if (cb.e) ultHit(cb); else FX.spark(cb.x, cb.y, 2, cb.col, 80, .2, 1); }
    // 锁住后第二次脉冲
    if (cb.hit && !cb.hit2 && cb.age >= cb.shoot + .4 && cb.e) { cb.hit2 = true; ultHit(cb); }
    if (cb.age > cb.life || (!on && cb.age > 0)) {
      if (cb.age > 0) { FX.spark(cb.x, cb.y, 3, '#ffffff', 120, .2, 1); const mx = (P.x + cb.x) / 2, my = (P.y + cb.y) / 2; FX.spark(mx, my, 2, cb.col, 90, .25, 1); }
      ULT.cables.splice(i, 1);
    }
  }
  if (ULT.was && !on) { // 收尾：漩涡炸开
    FX.ring(P.x, P.y, 6, 120, .45, '#3fe0ff', 2); FX.ring(P.x, P.y, 4, 70, .35, '#ffcf4a', 1.5); addShake(6);
  }
  ULT.was = on;
};

// ---------- 绘制（世界坐标，挂在敌弹之后） ----------
function cablePath(c, x0, y0, x1, y1, wob, k) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const mx = x0 + dx * .5 + nx * wob, my = y0 + dy * .5 + ny * wob;
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
  return [mx, my];
}
function qpt(x0, y0, mx, my, x1, y1, k) { const u = 1 - k; return [u * u * x0 + 2 * u * k * mx + k * k * x1, u * u * y0 + 2 * u * k * my + k * k * y1]; }
function drawClaw(c, x, y, a, s, col) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  c.strokeStyle = col; c.lineWidth = .9; c.lineCap = 'round';
  for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(-1, 0); c.quadraticCurveTo(1.5, k * 2.4, 3, k * 1.2 + (k ? 0 : 0)); c.stroke(); }
  c.fillStyle = '#fff'; c.beginPath(); circ(c, 0, 0, 1); c.fill(); c.restore();
}
function drawUltWorld(c, t) {
  const P = Player, on = G.ultT > 0;
  if (!ULT.cables.length && !on) return;
  c.save(); c.lineCap = 'round';
  // 钩索之间的网：锁住的目标彼此相连
  const latched = ULT.cables.filter(cb => cb.hit && cb.e);
  if (latched.length > 1) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35; c.strokeStyle = '#3fe0ff'; c.lineWidth = .5; c.beginPath();
    for (let i = 0; i < latched.length; i++) { const a = latched[i], b = latched[(i + 1) % latched.length]; c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    c.stroke(); c.globalAlpha = 1;
  }
  for (const cb of ULT.cables) {
    if (cb.age < 0) continue;
    const k = clamp(cb.age / cb.shoot, 0, 1), fade = clamp((cb.life - cb.age) / .2, 0, 1);
    const wob = cb.wob * (1 - k * .6) + Math.sin(t * 30 + cb.ph) * (cb.hit ? 1.2 : 3);
    const ang0 = Math.atan2(cb.y - P.y, cb.x - P.x), x0 = P.x + Math.cos(ang0) * 9, y0 = P.y + Math.sin(ang0) * 9;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (cb.burst ? .22 : .45) * fade; c.strokeStyle = cb.col; c.lineWidth = cb.burst ? 1.2 : 2.6; const [mx, my] = cablePath(c, x0, y0, cb.x, cb.y, wob, k); c.stroke();
    c.globalAlpha = (cb.burst ? .55 : 1) * fade; c.strokeStyle = '#ffffff'; c.lineWidth = cb.burst ? .35 : .7; cablePath(c, x0, y0, cb.x, cb.y, wob, k); c.stroke();
    const [tx, ty] = qpt(x0, y0, mx, my, cb.x, cb.y, k);
    if (!cb.hit) drawClaw(c, tx, ty, Math.atan2(cb.y - y0, cb.x - x0), .9, cb.col);
    else {
      // 能量脉冲：两颗光点沿索冲向目标
      for (let j = 0; j < 2; j++) {
        const pk = ((cb.age - cb.shoot) * 3.2 + j * .5) % 1, [px, py] = qpt(x0, y0, mx, my, cb.x, cb.y, pk);
        c.globalAlpha = fade; c.fillStyle = '#fff'; c.beginPath(); circ(c, px, py, 1.2); c.fill();
        c.globalAlpha = .5 * fade; c.fillStyle = cb.col; c.beginPath(); circ(c, px, py, 2.8); c.fill();
      }
      if (cb.e) { c.globalAlpha = .7 * fade; c.strokeStyle = cb.col; c.lineWidth = .8; c.beginPath(); circ(c, cb.x, cb.y, 6 + Math.sin(t * 20 + cb.ph) * 1.5); c.stroke(); }
    }
  }
  // 主角身边的钩索漩涡
  if (on) {
    const r0 = 14, k0 = clamp(ULT.t / .25, 0, 1);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const r = (r0 + i * 7) * k0, a = t * (6 - i * 1.5) * (i % 2 ? -1 : 1);
      c.globalAlpha = .55 - i * .12; c.strokeStyle = ULT_COL[i]; c.lineWidth = 1.4 - i * .3;
      c.beginPath(); c.arc(P.x, P.y, r, a, a + 2.2); c.stroke();
      c.beginPath(); c.arc(P.x, P.y, r, a + Math.PI, a + Math.PI + 1.4); c.stroke();
    }
    // 螺旋丝线
    c.globalAlpha = .35; c.strokeStyle = '#e8fbff'; c.lineWidth = .4;
    for (let s = 0; s < 6; s++) { c.beginPath(); for (let j = 0; j <= 12; j++) { const rr = 4 + j * 2.6 * k0, aa = t * 5 + s * TAU / 6 + j * .32; j ? c.lineTo(P.x + Math.cos(aa) * rr, P.y + Math.sin(aa) * rr) : c.moveTo(P.x + Math.cos(aa) * rr, P.y + Math.sin(aa) * rr); } c.stroke(); }
    const g = c.createRadialGradient(P.x, P.y, 0, P.x, P.y, 26); g.addColorStop(0, 'rgba(255,240,200,.16)'); g.addColorStop(1, 'rgba(63,224,255,0)');
    c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); circ(c, P.x, P.y, 26); c.fill();
  }
  c.restore();
}

// ---------- 屏幕框：去掉粉色闪框，换成四角拉出的钩索网 + 轻微压暗 ----------
drawUltFrame = function (c, t) {
  const k = clamp(G.ultT / .4, 0, 1);
  c.save();
  c.fillStyle = 'rgba(4,6,20,' + (.18 * k).toFixed(3) + ')'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const corners = [[0, 0], [W, 0], [0, H], [W, H]], px = Player.x - G.cam.x, py = Player.y - G.cam.y;
  for (const [cx, cy] of corners) {
    for (let i = 0; i < 5; i++) {
      const a = Math.atan2(py - cy, px - cx) + (i - 2) * .16, L = 60 + i % 3 * 22 + Math.sin(t * 6 + i) * 6;
      c.strokeStyle = 'rgba(63,224,255,' + (.28 * k).toFixed(3) + ')'; c.lineWidth = .7;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); c.stroke();
    }
    for (let j = 1; j <= 3; j++) {
      const a0 = Math.atan2(py - cy, px - cx) - .32, R = j * 22;
      c.strokeStyle = 'rgba(255,207,74,' + (.18 * k).toFixed(3) + ')'; c.lineWidth = .5;
      c.beginPath(); for (let i = 0; i <= 4; i++) { const a = a0 + i * .16; i ? c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } c.stroke();
    }
  }
  c.strokeStyle = 'rgba(63,224,255,' + (.35 * k).toFixed(3) + ')'; c.lineWidth = 1.2; c.strokeRect(2, 2, W - 4, H - 4);
  c.restore();
};

// ---------- 敌弹：暗芯亮环，统一危险色 ----------
const _hueCache = {};
function hostileCol(col) {
  if (_hueCache[col]) return _hueCache[col];
  const n = parseInt(col.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0;
  if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  let out = col;
  if (mx - mn < .15) out = '#ff4a8a';                 // 白/灰 → 洋红
  else if (h >= 22 && h < 75) out = '#ff4a3a';       // 黄/橙/金 → 红（金币专用金色）
  else if (h >= 75 && h < 200) out = '#c060ff';      // 绿/青 → 紫（能量专用绿，玩家专用青）
  return (_hueCache[col] = out);
}
function hostileSpr(col, r) {
  return spr('hb' + col + r, r * 2 + 12, r * 2 + 12, c => {
    const g = c.createRadialGradient(0, 0, r * .5, 0, 0, r + 5);
    g.addColorStop(0, rgba(col, .0)); g.addColorStop(.35, rgba(col, .55)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); circ(c, 0, 0, r + 5); c.fill();
    c.beginPath(); circ(c, 0, 0, r); c.fillStyle = col; c.fill();
    c.beginPath(); circ(c, 0, 0, r * .62); c.fillStyle = '#16061a'; c.fill();          // 暗芯
    c.beginPath(); circ(c, 0, 0, r * .82); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(.35, r * .14); c.stroke();
  });
}
drawBullets = function (c, t) {
  const L = EB.list;
  for (const b of L) if (b.delay > 0) { const col = hostileCol(b.col); c.globalAlpha = .7; c.setLineDash([1.5, 1.5]); c.beginPath(); circ(c, b.x, b.y, b.r + b.delay * 20); c.strokeStyle = col; c.lineWidth = .6; c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  c.globalCompositeOperation = 'lighter';
  for (const b of L) {
    if (b.delay > 0) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    if (sp > 40) line(c, b.x, b.y, b.x - b.vx / sp * b.r * 3.2, b.y - b.vy / sp * b.r * 3.2, rgba(hostileCol(b.col), .4), b.r * 1.1);
  }
  c.globalCompositeOperation = 'source-over';
  for (const b of L) {
    if (b.delay > 0) continue;
    const col = hostileCol(b.col), s = hostileSpr(col, b.r), pul = 1 + Math.sin(t * 16 + b.x * .1) * .1;
    c.drawImage(s.cv, b.x - s.w / 2 * pul, b.y - s.h / 2 * pul, s.w * pul, s.h * pul);
  }
  drawUltWorld(c, t);
};

// ---------- 掉落：实体金币 / 绿色能量晶体 ----------
const _pickOld = drawPickups;
drawPickups = function (c, t) {
  const P = Player;
  for (const p of Pickups.list) {
    const x = p.x, y = p.y, sp = Math.hypot(p.vx, p.vy), pop = Math.min(1, p.age * 6);
    if (p.type === 'coin') {
      if (sp > 150) { c.globalAlpha = .5; line(c, x, y, x - p.vx * .03, y - p.vy * .03, '#ffd86a', 1.2); c.globalAlpha = 1; }
      const w = Math.cos(t * 7 + p.ph), aw = Math.abs(w);
      c.save(); c.translate(x, y); c.scale((.25 + aw * .75) * pop, pop);
      c.beginPath(); circ(c, 0, 0, 3.2); c.fillStyle = '#1a0f05'; c.fill();                  // 黑描边
      c.beginPath(); circ(c, 0, 0, 2.6); c.fillStyle = w > 0 ? '#ffc23a' : '#e09a1a'; c.fill();
      c.beginPath(); circ(c, 0, 0, 1.7); c.strokeStyle = '#a8620e'; c.lineWidth = .45; c.stroke();
      c.fillStyle = '#fff3c0'; c.fillRect(-1.6, -1.9, .9, 1.2);                                 // 高光
      c.restore();
      if (((t * 1.3 + p.ph) % 1.6) < .12) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#fff'; c.lineWidth = .4; line(c, x + 2, y - 4, x + 2, y - 1.5, '#fff', .4); line(c, x + .8, y - 2.8, x + 3.2, y - 2.8, '#fff', .4); c.restore(); }
    } else if (p.type === 'energy') {
      if (sp > 150) { c.globalAlpha = .45; line(c, x, y, x - p.vx * .035, y - p.vy * .035, '#8dff5a', 1.4); c.globalAlpha = 1; }
      const bob = Math.sin(t * 5 + p.ph) * .8, s = pop * (1 + Math.sin(t * 9 + p.ph) * .06);
      c.save(); c.translate(x, y + bob); c.rotate(Math.sin(t * 2 + p.ph) * .35); c.scale(s, s);
      const pts = [0, -4.2, 2.4, 0, 0, 4.2, -2.4, 0];
      c.beginPath(); poly(c, [0, -5, 3.1, 0, 0, 5, -3.1, 0]); c.fillStyle = '#071a08'; c.fill();       // 黑描边
      c.beginPath(); poly(c, pts); c.fillStyle = '#5ee83a'; c.fill();
      c.beginPath(); poly(c, [0, -4.2, 2.4, 0, 0, 0]); c.fillStyle = '#b8ff8a'; c.fill();             // 亮面
      c.beginPath(); poly(c, [0, 0, 2.4, 0, 0, 4.2]); c.fillStyle = '#2fa61e'; c.fill();             // 暗面
      c.fillStyle = '#fff'; c.fillRect(-.9, -2.6, .6, 1.4);
      c.restore();
    }
  }
  // 血包、补给箱沿用旧画法
  const keep = Pickups.list; Pickups.list = keep.filter(p => p.type !== 'coin' && p.type !== 'energy');
  try { _pickOld(c, t); } finally { Pickups.list = keep; }
};
