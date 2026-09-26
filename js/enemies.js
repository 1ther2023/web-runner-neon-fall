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
      b.x += G.camDX; b.y += G.camDY;
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.life -= dt;
      if (b.av) { const c = Math.cos(b.av * dt), s = Math.sin(b.av * dt); const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
      if (b.acc) { const sp = Math.hypot(b.vx, b.vy) || 1, ns = clamp(sp + b.acc * dt, 10, b.maxSp); b.vx *= ns / sp; b.vy *= ns / sp; }
      if (b.grav) b.vy += b.grav * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const sx = b.x - G.cam.x;
      if (b.life <= 0 || sx < -30 || sx > W + 40 || b.y < G.cam.y - 40 || b.y > G.cam.y + H + 30) { this.list.splice(i, 1); continue; }
      if (!P.alive) continue;
      const dd = d2(b.x, b.y, P.x, P.y), hr = b.r * .7 + 1.5;
      if (dd < hr * hr) {
        if (P.hurt(b.dmg)) { this.list.splice(i, 1); continue; }
      } else if (!b.grazed && dd < (b.r + Stats.grazeR) * (b.r + Stats.grazeR)) {
        b.grazed = true; G.grazes++; addStorm(1.2); if (Stats.grazeHeal) P.hp = Math.min(P.maxHp, P.hp + Stats.grazeHeal);
        Sfx.play('graze'); FX.spark(P.x, P.y, 2, '#8af0ff', 90, .2);
        if (G.grazes % 10 === 0) FX.text(P.x, P.y - 18, 'GRAZE x' + G.grazes, '#8af0ff');
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
  },
  draw(ctx, cx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.list) { if (b.delay > 0) continue; const g = glowSpr(b.col, b.r + 1), s = b.r * 3.2 + 4; ctx.drawImage(g, b.x - cx - s, b.y - s, s * 2, s * 2); }
    ctx.globalCompositeOperation = 'source-over';
    for (const b of this.list) {
      if (b.delay > 0) { ctx.globalAlpha = .5; pxRing(ctx, b.x - cx, b.y, b.r + b.delay * 20, b.col); ctx.globalAlpha = 1; continue; }
      const s = bulletSpr(b.col, b.r); ctx.drawImage(s, Math.round(b.x - cx - s.width / 2), Math.round(b.y - s.height / 2));
    }
  },
};
// ============ 难度曲线（按时间） ============
// 0-2分: 热身 | 2-6分: 三位BOSS逐步压上 | 6分后: 黑潮暴走，指数增长，目标一局 6-8 分钟
const Diff = {
  T() { return G.runTime || 0; },
  over() { const t = this.T(); return t > 360 ? Math.pow(1.6, (t - 360) / 25) : 1; },
  hp() { return (1 + this.T() / 38 + Math.pow(this.T() / 120, 2)) * this.over(); },
  edmg() { return .8 * (1 + this.T() / 300) * Math.pow(this.over(), .85); },
  spd() { return 1 + Math.min(.45, this.T() / 700) + Math.min(.45, (this.over() - 1) * .12); },
  interval() { return clamp(2.4 - this.T() / 170, .7, 2.4) / Math.sqrt(this.over()); },
  phase() { const t = this.T(); return t > 360 ? 3 : t > 240 ? 2 : t > 120 ? 1 : 0; },
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
};
const Enemies = {
  list: [], waveT: 2,
  reset() { this.list = []; this.waveT = 2.5; this.eliteT = 35; },
  diff() { return Diff.hp(); },
  spawn(type, sx, y, o) {
    const d = EDEF[type], D = this.diff();
    const e = Object.assign({
      type, d, x: G.cam.x + sx, y, vx: 0, vy: 0, hp: d.hp * D, maxHp: d.hp * D, r: d.r, t: rand(0, 5), flash: 0,
      fireT: rand(.8, 1.6), tx: rand(250, 440), ty: clamp(y + rand(-40, 40), 22, 200), life: rand(9, 14), burst: 0, burstT: 0,
    }, o || {});
    e.y += G.cam.y; e.ty += G.cam.y;
    this.list.push(e); return e;
  },
  spawnElite() {
    const T = Diff.T(), type = T < 100 ? pick(['thug', 'drone']) : T < 200 ? pick(['thug', 'eye']) : pick(['eye', 'gunship']);
    const d = EDEF[type], hp = Math.max(160, d.hp * Diff.hp() * 9);
    const e = this.spawn(type, W + 30, rand(50, 150), { elite: true, hp, maxHp: hp, r: d.r * 2, tx: 360, life: 22, fireT: 1.2 });
    FX.text(e.x - 30, e.y - 30, 'ELITE!', '#ffcf4a', 2, 0);
    UI.banner('精英来袭', '击败它获取装备！', 1.6); Sfx.play('warn');
    return e;
  },
  wave() {
    const T = Diff.T(), r = Math.random(), sx = W + 24;
    if (T > 150 && r < .12) { this.spawn('gunship', sx + 10, rand(40, 110)); return; }
    if (T > 60 && r < .28) { this.spawn('eye', sx, rand(30, 160)); return; }
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
      e.t += dt; e.flash -= dt; e.life -= dt; e.x += G.camDX; e.y += G.camDY; e.ty += G.camDY;
      const d = e.d;
      if (d.kamikaze) {
        const a = angTo(e.x, e.y, P.x, P.y), sp = d.spd + e.t * 15;
        e.vx = lerp(e.vx, Math.cos(a) * sp, 3 * dt); e.vy = lerp(e.vy, Math.sin(a) * sp, 3 * dt);
      } else {
        if (e.life < 0) e.tx = -80;
        const gx = G.cam.x + e.tx, gy = e.ty + Math.sin(e.t * 2) * 10;
        e.vx = lerp(e.vx, clamp((gx - e.x) * 2, -d.spd * 1.5, d.spd), 3 * dt);
        e.vy = lerp(e.vy, clamp((gy - e.y) * 2, -d.spd, d.spd), 3 * dt);
        if (e.x - G.cam.x < W - 10) {
          e.fireT -= dt;
          if (e.fireT <= 0 && P.alive) {
            e.fireT = rand(d.cd[0], d.cd[1]) / Math.min(1.8, .8 + Diff.T() / 200) * (e.elite ? .7 : 1); d.fire(e); Sfx.play('eshoot');
            if (e.elite) { ringShot(e.x, e.y, 14 + Diff.phase() * 4, 75, '#ffcf4a', 3, e.t, 11); }
          }
        }
        if (e.burst > 0) { e.burstT -= dt; if (e.burstT <= 0) { e.burstT = .07; e.burst--; const a = e.t * 5; for (let k = 0; k < 3; k++) { const aa = a + k * TAU / 3; EB.add({ x: e.x, y: e.y, vx: Math.cos(aa) * 80 * bspd(), vy: Math.sin(aa) * 80 * bspd(), col: '#2fd0c0', r: 3, dmg: 9 }); } } }
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < G.cam.x - 60 || e.y > G.cam.y + H + 40) { this.list.splice(i, 1); continue; }
      if (P.alive && d2(e.x, e.y, P.x, P.y) < (e.r + 4) * (e.r + 4)) {
        if (P.hurt(d.kamikaze ? 8 : 6) && d.kamikaze) killEnemy(e, true);
      }
    }
  },
  draw(ctx, cx) {
    for (const e of this.list) {
      const s = SPR[e.type]; const x = Math.round(e.x - cx), y = Math.round(e.y);
      let img = e.flash > 0 ? s.white : s.c;
      if (e.elite) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + Math.sin(G.time * 8) * .2;
        ctx.drawImage(glowSpr('#ffcf4a', 10), x - 30, y - 30, 60, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, x - s.w, y - s.h, s.w * 2, s.h * 2);
        drawText(ctx, 'ELITE', x, y - s.h - 12, '#ffcf4a', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(x - 16, y - s.h - 5, 32, 3); ctx.fillStyle = '#ffcf4a'; ctx.fillRect(x - 16, y - s.h - 5, Math.ceil(32 * e.hp / e.maxHp), 3);
        continue;
      }
      if (e.type === 'blob') { const k = 1 + Math.sin(e.t * 12) * .15; ctx.drawImage(img, x - s.w * k / 2, y - s.h / k / 2, s.w * k, s.h / k); }
      else ctx.drawImage(img, x - (s.w >> 1), y - (s.h >> 1) + (e.type === 'drone' ? Math.round(Math.sin(e.t * 8)) : 0));
      if (e.type === 'thug') { ctx.fillStyle = (G.time * 20 | 0) % 2 ? '#ffe04a' : '#ff8a1e'; ctx.fillRect(x - 4, y + 3, 2, 3 + randi(0, 2)); }
      if (e.type === 'drone') { ctx.fillStyle = '#ffffff88'; const w = (G.time * 30 | 0) % 2 ? 4 : 2; ctx.fillRect(x - 6, y - 5, w, 1); ctx.fillRect(x + 3, y - 5, w, 1); }
      if (e.hp < e.maxHp && e.maxHp > 12) { ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - e.r - 5, 16, 2); ctx.fillStyle = '#ff3040'; ctx.fillRect(x - 8, y - e.r - 5, Math.ceil(16 * e.hp / e.maxHp), 2); }
    }
  },
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
  else if (Stats.execute && !e.elite && e.hp < e.maxHp * Stats.execute) { FX.text(e.x, e.y - 12, 'EXECUTE', '#ff3040'); killEnemy(e); }
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
