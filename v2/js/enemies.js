'use strict';
// ============ 敌方弹幕 ============
const EB = {
  list: [],
  reset() { this.list = []; },
  add(o) {
    if (this.list.length > 700) return;
    this.list.push(Object.assign({ r: 3, col: '#ff4a6a', dmg: 10, life: 9, acc: 0, av: 0, grazed: false, delay: 0, maxSp: 400 }, o));
  },
  update(dt) {
    const P = Player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.x += G.arDX; b.y += G.arDY;
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.life -= dt;
      if (b.av) { const c = Math.cos(b.av * dt), s = Math.sin(b.av * dt); const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
      if (b.acc) { const sp = Math.hypot(b.vx, b.vy) || 1, ns = clamp(sp + b.acc * dt, 10, b.maxSp); b.vx *= ns / sp; b.vy *= ns / sp; }
      if (b.grav) b.vy += b.grav * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const sx = b.x - G.tideX;
      if (b.life <= 0 || sx < -30 || sx > W + 40 || b.y < G.arenaY - 40 || b.y > G.arenaY + H + 30) { this.list.splice(i, 1); continue; }
      if (!P.alive) continue;
      const dd = d2(b.x, b.y, P.x, P.y), hr = b.r * .7 + 1.5;
      if (dd < hr * hr) {
        if (P.hurt(b.dmg)) { this.list.splice(i, 1); continue; }
      } else if (!b.grazed && dd < (b.r + Stats.grazeR) * (b.r + Stats.grazeR)) {
        b.grazed = true; G.grazes++; addStorm(1.2); if (Stats.grazeHeal) P.hp = Math.min(P.maxHp, P.hp + Stats.grazeHeal);
        Sfx.play('graze'); FX.spark(P.x, P.y, 2, '#8af0ff', 90, .2);
        if (G.grazes % 10 === 0) FX.text(P.x, P.y - 18, '擦身 ×' + G.grazes, '#8af0ff');
      }
    }
  },
  clear(toCoins) {
    let n = 0;
    for (const b of this.list) {
      FX.spark(b.x, b.y, 1, b.col, 60, .3);
      if (toCoins && n++ < 50 && Math.random() < .5) Pickups.spawn(b.x, b.y, 'coin', 1);
    }
    this.list = [];
  }
};
// ============ 难度曲线（按时间） ============
// 0-2分: 热身 | 2-6分: 三位BOSS逐步压上 | 6分后: 墨劫暴走，指数增长，目标一局 6-8 分钟
// 无尽：打完全部 BOSS（BOSS_ORDER 位）后才开启（用户 2026-10-12 定），之后敌人按进入无尽后的时间循环强化
const Diff = {
  T() { return G.runTime || 0; },
  over() { return G.endlessT != null ? Math.pow(1.5, (this.T() - G.endlessT) / 30) : 1; },  // 全部 BOSS 之后的无尽强化
  hp() { return (1 + this.T() / 38 + Math.pow(this.T() / 120, 2)) * this.over(); },
  edmg() { return .8 * (1 + this.T() / 300) * Math.pow(this.over(), .85); },
  spd() { return 1 + Math.min(.45, this.T() / 700) + Math.min(.45, (this.over() - 1) * .12); },
  interval() { return clamp(2.4 - this.T() / 170, .7, 2.4) / Math.sqrt(this.over()); },
  phase() { const t = this.T(); return t > 450 ? 3 : t > 300 ? 2 : t > 150 ? 1 : 0; },
};
const bspd = () => Diff.spd();
function aimed(x, y, n, spread, spd, col, r, dmg, o) {
  const a = angTo(x, y, Player.x, Player.y);
  for (let i = 0; i < n; i++) { const aa = a + (n > 1 ? (i - (n - 1) / 2) * spread : 0); EB.add(Object.assign({ x, y, vx: Math.cos(aa) * spd * bspd(), vy: Math.sin(aa) * spd * bspd(), col, r, dmg }, o || {})); }
}
function ringShot(x, y, n, spd, col, r, off, dmg, o) {
  for (let i = 0; i < n; i++) { const a = (off || 0) + i / n * TAU; EB.add(Object.assign({ x, y, vx: Math.cos(a) * spd * bspd(), vy: Math.sin(a) * spd * bspd(), col, r, dmg }, o || {})); }
}

// ============ 普通敌人 ============
const EDEF = {
  drone: { hp: 5, r: 6, coin: 1, en: 3, spd: 110, cd: [1.5, 2.4], fire(e) { aimed(e.x, e.y, 1, 0, 105, '#ff4a6a', 3, 9); } },
  thug: { hp: 13, r: 7, coin: 2, en: 4, spd: 80, cd: [1.9, 2.7], fire(e) { aimed(e.x - 4, e.y, 3, .22, 115, '#ffb03a', 3, 10); } },
  blob: { hp: 4, r: 5, coin: 1, en: 5, spd: 95, cd: [99, 99], kamikaze: true },
  eye: { hp: 32, r: 8, coin: 4, en: 8, spd: 60, cd: [2.4, 3.2], fire(e) { e.burst = 14; e.burstT = 0; } },
  gunship: { hp: 80, r: 12, coin: 9, en: 14, spd: 45, cd: [2.6, 3.4], fire(e) { ringShot(e.x, e.y, 18, 70, '#b070ff', 4, e.t, 12); aimed(e.x, e.y + 4, 5, .12, 140, '#ff4a6a', 2, 9); } },
  // 漂浮水雷：缓慢漂移，玩家靠近后引爆成一圈弹幕
  mine: { hp: 10, r: 6, coin: 2, en: 4, spd: 22, cd: [99, 99], mine: true },
  // 刺蜂：蓄力后沿直线高速突刺
  wasp: { hp: 9, r: 5, coin: 2, en: 5, spd: 90, cd: [2.2, 3], fire(e) { e.dash = { t: 0, tx: Player.x + Player.vx * .4, ty: Player.y + Player.vy * .2 }; } },
  // 狙击无人机：红色瞄准线锁定后射出高速弹
  sniper: { hp: 22, r: 7, coin: 4, en: 7, spd: 50, cd: [3, 3.8], fire(e) { e.aimT = .8; e.aimA = angTo(e.x, e.y, Player.x, Player.y); } },
};
const Enemies = {
  list: [], waveT: 2,
  reset() { this.list = []; this.waveT = 2.5; this.eliteT = 35; },
  diff() { return Diff.hp(); },
  spawn(type, sx, y, o) {
    const d = EDEF[type], D = this.diff();
    const e = Object.assign({
      type, d, x: G.tideX + sx, y, vx: 0, vy: 0, hp: d.hp * D, maxHp: d.hp * D, r: d.r, t: rand(0, 5), flash: 0,
      fireT: rand(.8, 1.6), tx: rand(250, 440), ty: clamp(y + rand(-40, 40), 22, 200), life: rand(9, 14), burst: 0, burstT: 0,
    }, o || {});
    e.y += G.arenaY; e.ty += G.arenaY;
    this.list.push(e); return e;
  },
  spawnElite() {
    const T = Diff.T(), type = T < 100 ? pick(['thug', 'drone', 'wasp']) : T < 200 ? pick(['thug', 'eye', 'sniper']) : pick(['eye', 'gunship', 'sniper']);
    const d = EDEF[type], hp = Math.max(160, d.hp * Diff.hp() * 9);
    const e = this.spawn(type, W + 30, rand(50, 150), { elite: true, hp, maxHp: hp, r: d.r * 2, tx: 360, life: 22, fireT: 1.2 });
    FX.text(e.x - 30, e.y - 30, '精英!', '#ffcf4a', 2, 0);
    UI.banner('精英来袭', '击败它获取装备！', 1.6); Sfx.play('warn');
    return e;
  },
  wave() {
    const T = Diff.T(), r = Math.random(), sx = W + 24;
    if (T > 150 && r < .12) { this.spawn('gunship', sx + 10, rand(40, 110)); return; }
    if (T > 60 && r < .28) { this.spawn('eye', sx, rand(30, 160)); return; }
    if (T > 40 && r < .36) { for (let i = 0; i < 3; i++) this.spawn('wasp', sx + i * 14, rand(30, 170)); return; }
    if (T > 90 && r < .42) { this.spawn('sniper', sx, rand(24, 70)); if (T > 200) this.spawn('sniper', sx + 20, rand(150, 200)); return; }
    if (T > 25 && r < .5) { const y = rand(40, 180); for (let i = 0; i < 3 + (T > 200 ? 2 : 0); i++) this.spawn('mine', sx + i * 30, y + rand(-30, 30), { tx: rand(120, 420) }); return; }
    if (r < .45) { const y = rand(40, 170); for (let i = 0; i < 5; i++) this.spawn('drone', sx + Math.abs(i - 2) * 16, y + (i - 2) * 14, { tx: 300 + Math.abs(i - 2) * 22 + rand(0, 60), ty: y + (i - 2) * 16 }); return; }
    if (r < .62) { for (let i = 0; i < 3; i++) this.spawn('thug', sx + i * 20, rand(40, 190)); return; }
    if (r < .8) { const y = rand(30, 180); for (let i = 0; i < 4 + (T > 90 ? 3 : 0) + (T > 300 ? 3 : 0); i++) this.spawn('blob', sx + i * 14, y + rand(-20, 20)); return; }
    for (let i = 0; i < 2; i++) this.spawn('drone', sx, rand(30, 190));
    this.spawn('thug', sx + 12, rand(40, 180));
  },
  update(dt) {
    if (G.started && Player.alive) {
      this.waveT -= dt;
      if (this.waveT <= 0) {
        this.wave();
        const base = Diff.interval();
        this.waveT = G.boss ? base * 2.5 : base * rand(.8, 1.2);
      }
      this.eliteT -= dt;
      if (this.eliteT <= 0) {
        if (G.boss) this.eliteT = 5; else { this.spawnElite(); this.eliteT = rand(42, 52); }
      }
    }
    const P = Player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.dead) { this.list.splice(i, 1); continue; }
      e.t += dt; e.flash -= dt; e.life -= dt; e.x += G.arDX; e.y += G.arDY; e.ty += G.arDY;
      const d = e.d;
      if (d.mine) {
        e.vx = lerp(e.vx, -G.camSpeed * .15, dt); e.vy = Math.sin(e.t * 1.5) * 12;
        const dd = Math.hypot(P.x - e.x, P.y - e.y);
        if (e.fuse === undefined && dd < 46 && P.alive) { e.fuse = .55; Sfx.play('warn'); }
        if (e.fuse !== undefined) { e.fuse -= dt; if (e.fuse <= 0) { ringShot(e.x, e.y, 12 + Diff.phase() * 2, 85, '#ff6a3a', 3, e.t, 10); killEnemy(e, true); continue; } }
      } else if (e.dash) {
        const D = e.dash; D.t += dt;
        if (D.t < .5) { e.vx *= 1 - 6 * dt; e.vy *= 1 - 6 * dt; }
        else if (!D.go) { D.go = true; const a = angTo(e.x, e.y, D.tx, D.ty); e.vx = Math.cos(a) * 330 * bspd(); e.vy = Math.sin(a) * 330 * bspd(); Sfx.play('slash'); }
        else if (D.t > 1.1) e.dash = null;
      } else if (d.kamikaze) {
        const a = angTo(e.x, e.y, P.x, P.y), sp = d.spd + e.t * 15;
        e.vx = lerp(e.vx, Math.cos(a) * sp, 3 * dt); e.vy = lerp(e.vy, Math.sin(a) * sp, 3 * dt);
      } else {
        if (e.life < 0) e.tx = -80;
        const gx = G.tideX + e.tx, gy = e.ty + Math.sin(e.t * 2) * 10;
        e.vx = lerp(e.vx, clamp((gx - e.x) * 2, -d.spd * 1.5, d.spd), 3 * dt);
        e.vy = lerp(e.vy, clamp((gy - e.y) * 2, -d.spd, d.spd), 3 * dt);
        if (e.x - G.tideX < W - 10) {
          e.fireT -= dt;
          if (e.fireT <= 0 && P.alive) {
            e.fireT = rand(d.cd[0], d.cd[1]) / Math.min(1.8, .8 + Diff.T() / 200) * (e.elite ? .7 : 1); d.fire(e); Sfx.play('eshoot');
            if (e.elite) { ringShot(e.x, e.y, 14 + Diff.phase() * 4, 75, '#ffcf4a', 3, e.t, 11); }
          }
        }
        if (e.aimT > 0) { e.aimT -= dt; e.vx *= 1 - 5 * dt; e.vy *= 1 - 5 * dt; if (e.aimT <= 0) { EB.add({ x: e.x, y: e.y, vx: Math.cos(e.aimA) * 300 * bspd(), vy: Math.sin(e.aimA) * 300 * bspd(), col: '#ff3a8a', r: 3, dmg: 14, maxSp: 600 }); Sfx.play('laser'); } }
        if (e.burst > 0) { e.burstT -= dt; if (e.burstT <= 0) { e.burstT = .07; e.burst--; const a = e.t * 5; for (let k = 0; k < 3; k++) { const aa = a + k * TAU / 3; EB.add({ x: e.x, y: e.y, vx: Math.cos(aa) * 80 * bspd(), vy: Math.sin(aa) * 80 * bspd(), col: '#2fd0c0', r: 3, dmg: 9 }); } } }
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < G.tideX - 60 || e.y > G.arenaY + H + 40) { this.list.splice(i, 1); continue; }
      if (P.alive && d2(e.x, e.y, P.x, P.y) < (e.r + 4) * (e.r + 4)) {
        if (P.hurt(d.kamikaze || e.dash ? 8 : 6) && d.kamikaze) killEnemy(e, true);
      }
    }
  }
};

// ============ 伤害结算 ============
function allTargets() { const a = Enemies.list.filter(e => !e.dead); if (G.boss && G.boss.alive && G.boss.targetable) a.push(G.boss); return a; }
function onScreen(e) { const sx = e.x - G.cam.x; const sy = e.y - G.cam.y; return sx > -10 && sx < W + 10 && sy > -10 && sy < H + 10; }
function findTarget(x, y, range) {
  let best = null, bd = range * range;
  for (const e of allTargets()) { if (!onScreen(e)) continue; const dd = d2(x, y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
  return best;
}
function hitTest(x, y, r, exclude) {
  for (const e of allTargets()) {
    if (exclude && exclude.includes(e)) continue;
    if (e.isBoss) { if (e.hitTest(x, y, r)) return e; continue; }
    const rr = e.r + r; if (d2(x, y, e.x, e.y) < rr * rr) return e;
  }
  return null;
}
function damageEnemy(e, dmg, crit, kvx, kvy) {
  if (e.dead || !e.alive && e.isBoss) return;
  dmg *= Stats.dmgMul * (crit ? Stats.critMul : 1);
  if (Stats.lowHpDmg && Player.hp < Player.maxHp * .5) dmg *= 1 + Stats.lowHpDmg;
  if (Stats.bossDmg && (e.isBoss || e.elite)) dmg *= 1 + Stats.bossDmg;
  if (G.ultT > 0) dmg *= 1.5;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.flash = .07;
  if (!e.isBoss && kvx !== undefined) { const k = Math.hypot(kvx, kvy) || 1; e.x += kvx / k * 2; e.y += kvy / k * 2; }
  if (!(G.ultT > 0 && G.ultBurst)) FX.text(e.x + rand(-4, 4), e.y - (e.r || 16) - 4, crit ? dmg + '!' : dmg, crit ? '#ffe04a' : '#ffffff', crit ? 2 : 1);
  else FX.text(e.x + rand(-6, 6), e.y - (e.r || 16) - 4, dmg, '#ff9a9a', 1);
  Sfx.play(crit ? 'crit' : 'hit');
  if (crit) { addShake(1.5); }
  G.combo++; G.comboT = 2.2; G.maxCombo = Math.max(G.maxCombo, G.combo);
  if (e.isBoss) e.onHit(dmg);
  else if (e.hp <= 0) killEnemy(e);
  else if (Stats.execute && !e.elite && e.hp < e.maxHp * Stats.execute) { FX.text(e.x, e.y - 12, '处决!', '#ff3040'); killEnemy(e); }
}
function killEnemy(e, noReward) {
  if (e.dead) return; e.dead = true;
  const big = e.r >= 8 || e.elite, d = e.d;
  FX.boom(e.x, e.y, big ? 1.4 : .8, e.type === 'blob' ? ['#fff', '#b070ff', '#3b2358', '#1a0f26'] : undefined);
  addShake(big ? 5 : 2.5); if (big) { hitStop(.05); Sfx.play('bigkill'); } else Sfx.play('kill');
  if (noReward) return;
  G.kills++; addStorm(big ? 3 : 1.2); if (Stats.killHeal) Player.heal(Stats.killHeal);
  const T = Diff.T();
  const cv = Math.ceil(d.coin * (1 + T / 260) * (e.elite ? 8 : 1));
  Pickups.spawn(e.x, e.y, 'coin', 1, Math.min(cv, 12));
  if (cv > 12) Pickups.spawn(e.x, e.y, 'coin', cv - 12, 1);
  Pickups.spawn(e.x, e.y, 'energy', d.en * (1 + T / 200) * (e.elite ? 6 : 1));
  if (e.elite) { Pickups.spawn(e.x, e.y, 'chest', 1); Pickups.spawn(e.x, e.y, 'heart', 20); FX.boom(e.x, e.y, 2.2); hitStop(.1); }
  else if (Math.random() < .03) Pickups.spawn(e.x, e.y, 'heart', 15);
}
function splash(x, y, rad, dmg, except) {
  for (const e of allTargets()) { if (e === except) continue; const rr = rad + (e.r || 20); if (d2(x, y, e.x, e.y) < rr * rr) damageEnemy(e, dmg, false); }
}
function chainZap(from, dmg, n) {
  const hit = [from]; let cur = from;
  for (let k = 0; k < n; k++) {
    let best = null, bd = 90 * 90;
    for (const e of allTargets()) { if (hit.includes(e)) continue; const dd = d2(cur.x, cur.y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
    if (!best) break;
    FX.bolt(cur.x, cur.y, best.x, best.y); hit.push(best); damageEnemy(best, dmg, false); cur = best;
  }
  if (hit.length > 1) Sfx.play('zap');
}
