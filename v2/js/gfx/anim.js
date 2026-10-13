'use strict';
// ============ v0.5 动画层：在贴图上做程序化动作 ============
// 摆动（布料/黏液，横向切条）、拍翅（纵向切条）、故障（全息）、挤压拉伸、受击后仰、出生弹出、蓄力预警、死亡碎裂。
const _tint = {};
function tintOf(n, col) {
  const k = n + col; if (_tint[k]) return _tint[k];
  const im = SPR[n]; if (!sprOk(im)) return null;
  const [cv, c] = mkCv(im.naturalWidth, im.naturalHeight);
  c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
  return (_tint[k] = cv);
}
// o: { flip, flash, aura, auraA, wave, waveFrom, waveSpd, waveFreq, flap, flapSpd, glitch, ph, alpha }
function drawDeformed(c, im, iw, ih, w, h, o, k) {
  const t = G.time, ph = o.ph || 0; w *= k; h *= k;
  if (o.wave || o.glitch) {
    const N = 12;
    for (let j = 0; j < N; j++) {
      const f = clamp((j / N - (o.waveFrom || 0)) / (1 - (o.waveFrom || 0)), 0, 1);
      let dx = (o.wave || 0) * k * f * f * Math.sin(t * (o.waveSpd || 6) + j * (o.waveFreq || .8) + ph);
      if (o.glitch && Math.sin(t * 23 + j * 7.3 + ph) > .93) dx += (Math.sin(j * 91 + t * 50) > 0 ? 1 : -1) * o.glitch;
      c.drawImage(im, 0, j * ih / N, iw, ih / N + 1, -w / 2 + dx, -h / 2 + j * h / N, w, h / N + .35);
    }
  } else if (o.flap) {
    const N = 14;
    for (let i = 0; i < N; i++) {
      const f = Math.abs((i + .5) / N - .5) * 2, dy = -o.flap * k * f * f * Math.sin(t * (o.flapSpd || 10) + ph);
      c.drawImage(im, i * iw / N, 0, iw / N + 1, ih, -w / 2 + i * w / N, -h / 2 + dy, w / N + .35, h);
    }
  } else c.drawImage(im, -w / 2, -h / 2, w, h);
}
// o: { flip, flash, aura, auraA, wave, waveFrom, waveSpd, waveFreq, flap, flapSpd, glitch, ph, alpha }
function sprAnim(c, n, size, o) {
  const im = SPR[n]; if (!sprOk(im)) return false;
  const t = G.time, iw = im.naturalWidth, ih = im.naturalHeight, s = size / Math.max(iw, ih), w = iw * s, h = ih * s, ph = o.ph || 0;
  c.save(); if (o.flip) c.scale(-1, 1);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  const base = c.globalAlpha;
  if (o.aura) { const a = tintOf(n, o.aura); if (a) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = base * (o.auraA || .35) * .6; drawDeformed(c, a, iw, ih, w, h, o, 1.1); c.globalAlpha = base * (o.auraA || .35); drawDeformed(c, a, iw, ih, w, h, o, 1.04); c.restore(); } }
  if (o.glitch) {
    const cy = tintOf(n, '#3fe0ff'), mg = tintOf(n, '#ff3fa4'), j = Math.sin(t * 37 + ph) > .7 ? 2.5 : 1;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = base * .35;
    if (cy) c.drawImage(cy, -w / 2 - 1.5 * j, -h / 2, w, h); if (mg) c.drawImage(mg, -w / 2 + 1.5 * j, -h / 2, w, h);
    c.restore();
  }
  drawDeformed(c, im, iw, ih, w, h, o, 1);
  if (o.flash > 0) { const wc = whiteOf(n); if (wc) { c.globalAlpha = base * o.flash; drawDeformed(c, wc, iw, ih, w, h, o, 1); } }
  c.restore(); return true;
}

// ---------- 主角 ----------
const HA = { pose: null, prev: null, blend: 0, squash: 0, stuck: 0, lt: 0, lean: 0 };
function drawHero(c, P, t) {
  const dt = Math.min(.05, Math.max(0, t - HA.lt)); HA.lt = t;
  const stuck = P.hands.filter(h => h.rope && h.rope.state === 'stuck').length;
  const pose = stuck >= 2 ? 'hero_double' : stuck === 1 ? 'hero_swing' : 'hero_fall';
  if (pose !== HA.pose) { HA.prev = HA.pose; HA.pose = pose; HA.blend = HA.prev ? 1 : 0; }
  if (stuck > HA.stuck) HA.squash = 1;          // 钩住瞬间：拉伸回弹
  HA.stuck = stuck;
  HA.blend = Math.max(0, HA.blend - dt / .14); HA.squash = Math.max(0, HA.squash - dt / .3);
  const sp = Math.hypot(P.vx, P.vy);
  const targetLean = pose === 'hero_fall' ? clamp(P.vx * .0018, -.4, .4) + clamp(P.vy * .0008, -.2, .25) : P.rot;
  HA.lean = pose === 'hero_fall' && Math.abs(P.spin) > 3 ? P.rot : lerpAng(HA.lean, targetLean, 1 - Math.exp(-14 * dt));
  // 高速残影
  if (sp > 200 && P.trail.length > 2) {
    for (let i = 0; i < P.trail.length - 1; i += 2) {
      const tr = P.trail[i], a = tintOf(pose, '#3fe0ff'); if (!a) break;
      const im = SPR[pose], s = HERO_H / Math.max(im.naturalWidth, im.naturalHeight);
      c.save(); c.translate(tr.x, tr.y); c.rotate(tr.rot); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = (i + 1) / P.trail.length * .3 * Math.min(1, (sp - 200) / 120);
      c.drawImage(a, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
      c.restore();
    }
  }
  const blink = P.inv > 0 && ((G.time * 20) | 0) % 2;
  const sq = Math.sin(HA.squash * Math.PI) * .2, breathe = sp < 60 ? Math.sin(t * 3) * .02 : 0;
  const cloak = Math.min(2.6, .7 + sp / 160), aura = G.ultT > 0 ? '#ffcf4a' : '#3fe0ff';
  c.save(); c.translate(P.x, P.y); c.rotate(HA.lean); c.scale(1 - sq * .6 + breathe, 1 + sq - breathe);
  // 目镜辉光
  const gy = -HERO_H * .3, g = c.createRadialGradient(0, gy, 0, 0, gy, 10);
  g.addColorStop(0, G.ultT > 0 ? 'rgba(255,200,80,.5)' : 'rgba(255,170,60,.25)'); g.addColorStop(1, 'rgba(255,170,60,0)');
  c.fillStyle = g; c.fillRect(-10, gy - 10, 20, 20);
  const flip = pose === 'hero_fall' && P.vx < -80;
  const common = { flash: blink ? .8 : 0, aura, auraA: G.ultT > 0 ? .6 : .28, wave: cloak, waveFrom: .4, waveSpd: 10 + sp * .03, waveFreq: .9 };
  if (HA.blend > 0 && HA.prev) sprAnim(c, HA.prev, HERO_H, Object.assign({}, common, { alpha: HA.blend, flip: HA.prev === 'hero_fall' && P.vx < -80 }));
  sprAnim(c, pose, HERO_H, Object.assign({}, common, { alpha: 1 - HA.blend * .6, flip }));
  c.restore();
}

// ---------- 敌人 ----------
const EANIM = {
  drone: { tilt: 1, bob: 1.6 }, thug: { fly: 1, tilt: 1, bob: 2.2, wave: .9, waveFrom: .55, waveSpd: 11, grow: 1.25 }, blob: { squash: .12, wave: 1, waveSpd: 7 },
  eye: { spin: .15, pulse: .05, wave: 1.2, waveFrom: .55, waveSpd: 4 }, gunship: { tilt: 1, bob: 1 }, mine: { rot: 1.4, pulse: .04 },
  wasp: { flap: 3.5, flapSpd: 46, bob: 1.5 }, sniper: { flap: 4, flapSpd: 13, bob: 1.2 },
};
const ELANIM = {
  thug: { fly: 1.4, tilt: 1, bob: 2.4, wave: 1, waveFrom: .6, waveSpd: 10, grow: 1.15 }, drone: { bob: 1.4, pulse: .03 }, wasp: { fly: 1.2, tilt: 1, bob: 2.6, wave: .8, waveFrom: .55, waveSpd: 8, grow: 1.1 },
  eye: { wave: 2.4, waveFrom: .45, waveSpd: 3.5, pulse: .04 }, sniper: { flap: 6, flapSpd: 9, bob: 1.4 }, gunship: { tilt: 1, bob: 1 },
};
const _born = new WeakMap();
function enemyLook(e) {
  let n = 'en_' + e.type, size = e.r * (EN_SIZE[e.type] || 4.4), A = EANIM[e.type] || {};
  if (e.elite && SPR['el_' + e.type]) { n = 'el_' + e.type; size = e.r * 3.2; A = ELANIM[e.type] || {}; }
  if (A.grow) size *= A.grow;
  return { n, size, A };
}
function drawEnemies(c, t) {
  const P = Player;
  for (const e of Enemies.list) {
    if (e.x < G.cam.x - 60 || e.x > G.cam.x + W + 70) continue;
    if (!_born.has(e)) _born.set(e, t);
    const age = t - _born.get(e);
    if (e.aimT > 0) { const k = 1 - e.aimT / .8; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .3 + k * .6; c.setLineDash([3, 3]); line(c, e.x, e.y, e.x + Math.cos(e.aimA) * 420, e.y + Math.sin(e.aimA) * 420, '#ff3060', .5 + k); c.setLineDash([]); c.restore(); }
    if (e.dash && e.dash.t < .5) { c.save(); c.globalAlpha = .45 + (e.dash.t * 16 | 0) % 2 * .4; c.setLineDash([2, 2.5]); line(c, e.x, e.y, e.dash.tx, e.dash.ty, '#ffcf3a', 1); c.setLineDash([]); c.restore(); }
    const { n, size, A } = enemyLook(e), flip = P.x > e.x, ph = e.t * 1.7 + e.x * .01;
    const pop = age < .3 ? .35 + .65 * (1 - Math.pow(1 - age / .3, 3)) + Math.sin(age / .3 * Math.PI) * .15 : 1;
    const hit = e.flash > 0 ? clamp(e.flash / .1, 0, 1) : 0, charging = e.aimT > 0 || (e.dash && e.dash.t < .5);
    const kx = (P.x > e.x ? -1 : 1) * hit * 2;
    let rot = 0, sx = 1, sy = 1, dy = 0;
    if (A.bob) dy += Math.sin(t * 3 + ph) * A.bob;
    if (A.tilt) rot += clamp((e.vx || 0) * -.003, -.25, .25) + clamp((e.vy || 0) * .003, -.2, .2) * (flip ? -1 : 1) + Math.sin(t * 2 + ph) * .06;
    if (A.fly) { rot += Math.sin(t * 1.4 + ph) * .1; dy += Math.sin(t * 2.6 + ph) * 1.2; }
    if (A.spin) rot += Math.sin(t * 1.3 + ph) * A.spin;
    if (A.rot) rot += t * A.rot;
    if (A.squash) { const q = Math.sin(t * 6 + ph) * A.squash; sx += q; sy -= q; }
    if (A.breathe) { const q = Math.sin(t * 2.4 + ph) * A.breathe; sy += q; sx -= q * .5; }
    if (A.pulse) { const q = Math.sin(t * 5 + ph) * A.pulse; sx += q; sy += q; }
    if (A.fly) {  // 飞行：身后速度线 + 喷口光
      const dir = flip ? -1 : 1, bx = e.x + dir * size * .32, by = e.y + dy - size * .12;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) { const yy = e.y + dy + (k - 1.5) * size * .14, ln = size * (.35 + ((t * 3 + k * .37 + ph) % 1) * .4); c.globalAlpha = .18 + (k % 2) * .1; line(c, bx, yy, bx + dir * ln, yy + (k - 1.5) * 1.2, k % 2 ? '#3fe0ff' : '#ffffff', .5); }
      const fl = 1 + Math.sin(t * 40 + ph) * .25, gr = c.createRadialGradient(bx, by, 0, bx, by, size * .22 * fl * A.fly);
      gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(.4, e.elite ? 'rgba(255,120,200,.5)' : 'rgba(63,224,255,.5)'); gr.addColorStop(1, 'rgba(63,224,255,0)');
      c.globalAlpha = 1; c.fillStyle = gr; c.beginPath(); circ(c, bx, by, size * .22 * fl * A.fly); c.fill(); c.restore();
      if (Math.random() < .35) FX.p(bx, by, dir * rand(60, 120), rand(-15, 15), rand(.15, .3), e.elite ? '#ff7ad0' : '#3fe0ff', rand(.8, 1.6), 'line');
    }
    const jit = charging ? Math.sin(t * 60) * .8 : 0;
    c.save(); c.translate(e.x + kx + jit, e.y + dy); c.rotate(rot); c.scale(sx * pop * (1 + hit * .12), sy * pop * (1 - hit * .06));
    const ok = sprAnim(c, n, size, { flip, ph, flash: hit * .75, aura: charging ? '#ff3060' : e.elite ? '#ffb347' : null, auraA: charging ? .5 + Math.sin(t * 30) * .2 : .35,
      wave: A.wave, waveFrom: A.waveFrom, waveSpd: A.waveSpd, flap: A.flap, flapSpd: A.flapSpd });
    if (!ok) { const art = EART[e.type]; if (art) { c.scale(1.15 * (flip ? -1 : 1), 1.15); art(c, e, t, P, flip ? -1 : 1); } }
    c.restore();
    if (e.elite) {
      comic(c, '精英', e.x, e.y - size * .55 - 9, 6.5, '#ffcf4a', 'center', { thin: true });
      hpBar(c, e.x - 17, e.y - size * .55 - 4, 34, 2.6, e.hp / e.maxHp, '#ffcf4a');
    } else if (e.hp < e.maxHp && e.maxHp > 12) hpBar(c, e.x - 8, e.y - size * .5 - 4, 16, 1.8, e.hp / e.maxHp, '#ff3a4a');
  }
}
// 死亡碎裂
const _killEnemy0 = killEnemy;
killEnemy = function (e, noReward) {
  if (!e.dead) { const L = enemyLook(e); shatter(L.n, e.x, e.y, L.size, Player.x > e.x, e.elite ? '#ffb347' : '#ff3fa4'); }
  return _killEnemy0(e, noReward);
};

// ---------- BOSS ----------
const BANIM = {
  vulture: { flap: 11, flapSpd: 5 }, octo: { wave: 2.4, waveFrom: .35, waveSpd: 4, bob: 3, tilt: .05 }, venom: { wave: 4, waveFrom: 0, waveSpd: 2.4, squash: .04 },
  mantis: { wave: 2.4, waveFrom: .3, waveSpd: 7, bob: 3, tilt: .06 }, hive: { flap: 7, flapSpd: 34, bob: 3, tilt: .05 }, ghost: { glitch: 3, wave: 3, waveFrom: .2, waveSpd: 5, bob: 4, tilt: .06 },
  ring: { bob: 3.5, tilt: .1, wave: 1.2, waveFrom: .5, waveSpd: 14 }, doom: { flap: 5, flapSpd: 6, bob: 1.5 },
};
function drawBoss(c, b, t) {
  if (b.state === 'dying' && ((t * 20) | 0) % 2 && b.dying < 1) return;
  const n = BOSS_SPR[b.def.id], A = BANIM[b.def.id] || {}, P = Player;
  let dy = Math.sin(t * 1.6) * (A.bob || 2), rot = Math.sin(t * 1.3) * .04, sx = 1, sy = 1;
  if (A.bounce) { const q = Math.abs(Math.sin(t * 4)); dy -= q * A.bounce; sy += (1 - q) * .05; sx -= (1 - q) * .03; }
  if (A.tilt) rot += Math.sin(t * 2) * A.tilt;
  if (A.squash) { const q = Math.sin(t * 2.4) * A.squash; sx += q; sy -= q; }
  // 出招前 0.5 秒蓄力：放大 + 光晕脉冲 + 抖动
  const charge = b.state === 'fight' && b.patT < .55 ? 1 - b.patT / .55 : 0;
  const enter = b.state === 'enter' ? clamp((b.sx + 70) / 150, 0, 1) : 1;
  const hit = b.flash > 0 ? clamp(b.flash / .1, 0, 1) : 0;
  const shake = (b.state === 'dying' ? 3 : 0) + charge * 1.2;
  const size = (b.def.size || 92) * (b.enraged ? 1.08 : 1) * (1 + charge * .06);
  c.save(); c.translate(b.x + Math.sin(t * 57) * shake, b.y + dy + Math.cos(t * 49) * shake); c.rotate(rot); c.scale(sx * (1 + hit * .05), sy);
  // 蓄力地面光环
  if (charge > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = charge * .8; c.beginPath(); circ(c, 0, 0, size * (.75 - charge * .25)); c.strokeStyle = b.def.col; c.lineWidth = 1.5; c.stroke(); c.restore(); }
  const aura = b.state === 'dying' ? ((t * 16 | 0) % 2 ? '#ffffff' : '#ff3040') : b.enraged ? '#ff3050' : b.def.col;
  const ok = n && sprAnim(c, n, size, { flip: P.x < b.x, ph: 0, flash: hit * .5 + (b.state === 'dying' ? .25 : 0), alpha: enter,
    aura, auraA: .18 + charge * .5 + (b.enraged ? Math.sin(t * 10) * .15 + .15 : 0),
    wave: A.wave, waveFrom: A.waveFrom, waveSpd: A.waveSpd, flap: A.flap, flapSpd: A.flapSpd, glitch: A.glitch });
  if (!ok) { const art = BART[b.def.id]; if (art) { c.scale(1.3, 1.3); art(c, b, t); } }
  c.restore();
}
const _bossDefeated0 = bossDefeated;
bossDefeated = function (b) {
  const n = BOSS_SPR[b.def.id]; if (n) shatter(n, b.x, b.y, (b.def.size || 92) * (b.enraged ? 1.08 : 1), Player.x < b.x, b.def.col);
  return _bossDefeated0(b);
};

// ---------- 标题画面：主角在雨中摆荡的展示 ----------
