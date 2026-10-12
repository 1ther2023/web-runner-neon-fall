'use strict';
// ============ 激光 ============
const Lasers = {
  list: [],
  reset() { this.list = []; },
  add(o) { this.list.push(Object.assign({ warn: .8, on: .5, w: 7, col: '#ff3060', dmg: 18, av: 0, len: 700, t: 0 }, o)); Sfx.play('eshoot'); },
  update(dt) {
    const P = Player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const L = this.list[i]; L.t += dt; L.x += G.arDX; L.y += G.arDY;
      if (L.src) { L.x = L.src.x; L.y = L.src.y; }
      if (L.t > L.warn) {
        if (!L.fired) { L.fired = true; Sfx.play('laser'); addShake(4); }
        L.ang += L.av * dt;
        if (P.alive) {
          const dx = Math.cos(L.ang), dy = Math.sin(L.ang), px = P.x - L.x, py = P.y - L.y, proj = px * dx + py * dy;
          if (proj > 0 && proj < L.len && Math.abs(px * dy - py * dx) < L.w / 2 + 1.5) P.hurt(L.dmg);
        }
      } else if (L.track) L.ang = lerpAng(L.ang, angTo(L.x, L.y, P.x, P.y), 2 * dt);
      if (L.t > L.warn + L.on) this.list.splice(i, 1);
    }
  },
};

// ============ BOSS ============
const BOSSDEF = [
  { id: 'vulture', name: '赤焰金乌', cn: '赤焰金乌 · 墨灾第一将', hp: 900, col: '#ff7a3a', pats: ['fan', 'feather', 'dive', 'fan', 'wingstorm'] },
  { id: 'octo', name: '千机傀师', cn: '千机傀师 · 墨灾第二将', hp: 1150, col: '#c890ff', pats: ['spiral', 'rings', 'lasers', 'spiral', 'sweep'] },
  { id: 'venom', name: '墨魇饕餮', cn: '墨魇饕餮 · 墨灾第三将', hp: 1400, col: '#ffcf4a', pats: ['flower', 'summon', 'wave', 'homing', 'flower'] },
  { id: 'mantis', name: '刀螂将军', cn: '刀螂将军 · 墨灾第四将', hp: 1500, col: '#4ae0a0', pats: ['scythe', 'cross', 'dive', 'scythe', 'guillotine'] },
  { id: 'hive', name: '金蜂娘娘', cn: '金蜂娘娘 · 墨灾第五将', hp: 1650, col: '#ffcf3a', pats: ['stinger', 'swarmCall', 'honey', 'stinger', 'hexstorm'] },
  { id: 'ghost', name: '皮影判官', cn: '皮影判官 · 墨灾第六将', hp: 1800, col: '#ff6a5a', pats: ['grid', 'blink', 'glitch', 'grid', 'overflow'] },
];
const BOSS_ORDER = BOSSDEF.length;
function makeBoss() {
  const lv = G.bosses, def = BOSSDEF[lv % BOSS_ORDER], mul = (1 + lv * 1.3) * Diff.over();
  return {
    isBoss: true, alive: true, targetable: false, def, lv, name: def.name + (lv >= BOSS_ORDER ? ' · ' + '零壹贰叁肆伍陆柒捌玖'[Math.min(9, Math.floor(lv / BOSS_ORDER) + 1)] + '式' : ''),
    x: G.tideX - 70, y: G.arenaY + H / 2, vx: 0, vy: 0, hp: def.hp * mul, maxHp: def.hp * mul, r: 20, t: 0, flash: 0,
    state: 'enter', patT: 1.6, patI: 0, timers: [], sx: -70, tsx: 80, dying: 0, dash: null, enraged: false,
    after(d, fn) { this.timers.push({ t: d, fn }); },
    hitTest(x, y, r) { const rr = this.r + r; return d2(x, y, this.x, this.y) < rr * rr; },
    onHit() {
      if (!this.enraged && this.hp < this.maxHp * .5) {
        this.enraged = true; FX.text(this.x, this.y - 34, '狂暴!', '#ff3040', 2); addShake(8); Sfx.play('warn');
        ringShot(this.x, this.y, 36, 90, this.def.col, 4, 0, 12);
      }
      if (this.hp <= 0 && this.state !== 'dying') {
        this.state = 'dying'; this.dying = 2.2; this.targetable = false; this.timers = [];
        EB.clear(true); Lasers.reset(); slowMo(.25, 1.4); hitStop(.2); screenFlash(.8, '#fff'); Sfx.play('bossdie');
      }
    },
    update(dt) {
      this.t += dt; this.flash -= dt; this.y += G.arDY;
      const P = Player;
      if (this.state === 'enter') {
        this.sx = lerp(this.sx, this.tsx, 1 - Math.exp(-2 * dt));
        if (this.sx > this.tsx - 6) { this.state = 'fight'; this.targetable = true; }
      } else if (this.state === 'fight') {
        // 追击：左侧徘徊，跟随玩家高度，周期性逼近
        if (this.warp) { const Wp = this.warp; Wp.t += dt; if (Wp.t > .35 && !Wp.done) { Wp.done = true; this.sx = Wp.sx; this.y = Wp.y; FX.ring(this.x, this.y, 4, 40, .3, this.def.col, 2); } if (Wp.t > .7) this.warp = null; }
        else if (!this.dash) {
          this.tsx = 70 + Math.sin(this.t * .7) * 40 + (this.enraged ? 30 : 0);
          this.sx = lerp(this.sx, this.tsx, 1 - Math.exp(-1.5 * dt));
          this.y = lerp(this.y, clamp(P.y + Math.sin(this.t * 1.3) * 40, G.arenaY + 40, G.arenaY + 200), 1 - Math.exp(-1.2 * dt));
        } else {
          const D = this.dash; D.t += dt;
          if (D.t < .45) { this.sx = lerp(this.sx, D.sx0 - 20, 6 * dt); }
          else if (D.t < 1.0) { this.sx = lerp(this.sx, D.tx, 7 * dt); this.y = lerp(this.y, D.ty, 7 * dt); if (((D.t * 30) | 0) % 2) EB.add({ x: this.x, y: this.y + rand(-8, 8), vx: rand(-20, 20), vy: rand(-20, 20), acc: 60, col: this.def.col, r: 3, dmg: 10, maxSp: 120 }); }
          else if (D.t < 1.8) this.sx = lerp(this.sx, 80, 3 * dt);
          else this.dash = null;
        }
        for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
        this.patT -= dt;
        if (this.patT <= 0 && P.alive) {
          const pats = this.def.pats, p = pats[this.patI++ % (this.enraged ? pats.length : pats.length - 1)];
          BPAT[p](this); this.patT = (this.enraged ? 1.9 : 2.6) - Math.min(.8, this.lv * .15);
        }
        if (P.alive && this.hitTest(P.x, P.y, 2)) P.hurt(20);
      } else if (this.state === 'dying') {
        this.dying -= dt; this.sx += rand(-1, 1); this.y += 20 * dt;
        if (Math.random() < dt * 14) { FX.boom(this.x + rand(-20, 20), this.y + rand(-18, 18), rand(.6, 1.2)); addShake(5); Sfx.play('kill'); }
        if (this.dying <= 0) bossDefeated(this);
      }
      this.x = G.tideX + this.sx;
    },
  };
}
function bossDefeated(b) {
  b.alive = false; G.boss = null; G.bosses++;
  FX.boom(b.x, b.y, 3.5, ['#fff', b.def.col, '#ffe04a', '#ff3040']);
  for (let i = 0; i < 4; i++) FX.ring(b.x, b.y, 5, 60 + i * 40, .5 + i * .15, i % 2 ? '#fff' : b.def.col, 2);
  addShake(16); screenFlash(1, '#fff'); hitStop(.25);
  Pickups.spawn(b.x, b.y, 'coin', 3, 30 + b.lv * 10); Pickups.spawn(b.x, b.y, 'energy', 20 * (1 + b.lv), 10); Pickups.spawn(b.x, b.y, 'heart', 25, 2);
  G.nextBossT = Math.max(G.nextBossT, G.runTime + 40);
  Music.mode = 'normal';
  if (G.bosses >= BOSS_ORDER && G.endlessT == null) { // 全部 BOSS 击败 → 进入无尽
    G.endlessT = G.runTime; G.overAnnounced = true;
    UI.banner('墨劫降临！', '全部将首已斩——敌人将无止境地变强', 3); Sfx.play('warn'); BG.build(3); return;
  }
  UI.banner('将首已斩！', b.def.name + ' 坠入墨海' + (G.bosses === BOSS_ORDER - 1 ? ' · 最后一将即将到来！' : ''), 2.6);
  BG.build(G.bosses % THEMES.length);
}

// ============ BOSS 弹幕模式 ============
const BPAT = {
  fan(b) {
    for (let w = 0; w < (b.enraged ? 4 : 3); w++) b.after(w * .28, () => { aimed(b.x + 14, b.y, 9, .14, 130 + w * 15, '#ff7a3a', 3, 11); Sfx.play('eshoot'); });
  },
  feather(b) {
    for (let i = 0; i < (b.enraged ? 30 : 20); i++) b.after(i * .05, () => EB.add({ x: b.x, y: b.y - 10, vx: rand(60, 230), vy: rand(-230, -80), grav: 140, col: '#ffcf6a', r: 2, dmg: 9 }));
  },
  dive(b) {
    b.dash = { t: 0, sx0: b.sx, tx: clamp(Player.x - G.tideX - 10, 120, 330), ty: Player.y };
    FX.text(b.x, b.y - 30, '!!', '#ff3040', 3); Sfx.play('warn');
  },
  wingstorm(b) {
    for (let i = 0; i < 40; i++) b.after(i * .05, () => { const a = i * .35; for (const s of [1, -1]) EB.add({ x: b.x, y: b.y, vx: Math.cos(a * s) * 100, vy: Math.sin(a * s) * 100, col: s > 0 ? '#ff7a3a' : '#ffe04a', r: 3, dmg: 10 }); });
  },
  spiral(b) {
    const n = b.enraged ? 5 : 4, dir = Math.random() < .5 ? 1 : -1;
    for (let i = 0; i < 45; i++) b.after(i * .055, () => { for (let k = 0; k < n; k++) { const a = dir * i * .2 + k * TAU / n; EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, col: '#c890ff', r: 3, dmg: 10 }); } });
  },
  rings(b) {
    for (let w = 0; w < 4; w++) b.after(w * .35, () => { ringShot(b.x, b.y, 26, 80 + w * 8, w % 2 ? '#f2b544' : '#c890ff', w % 2 ? 3 : 4, w * .12, 11); Sfx.play('eshoot'); });
  },
  lasers(b) {
    const a = angTo(b.x, b.y, Player.x, Player.y), n = b.enraged ? 5 : 3;
    for (let i = 0; i < n; i++) Lasers.add({ x: b.x, y: b.y, ang: a + (i - (n - 1) / 2) * .32, src: b, warn: .9, on: .45, col: '#c890ff' });
  },
  sweep(b) {
    const a = angTo(b.x, b.y, Player.x, Player.y) - .9;
    Lasers.add({ x: b.x, y: b.y, ang: a, av: 1.1, src: b, warn: .8, on: 1.6, w: 9, col: '#c890ff' });
    b.after(.9, () => ringShot(b.x, b.y, 20, 70, '#f2b544', 3, 0, 10));
  },
  flower(b) {
    const n = b.enraged ? 7 : 5;
    for (let w = 0; w < 6; w++) b.after(w * .22, () => { for (let k = 0; k < n; k++) { const a = k / n * TAU + w * .3; for (const s of [1, -1]) EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, av: s * .9, col: s > 0 ? '#ffcf4a' : '#e8452c', r: 3, dmg: 10, life: 6 }); } });
  },
  summon(b) {
    for (let i = 0; i < 6 + b.lv; i++) b.after(i * .1, () => Enemies.spawn('blob', b.sx + 10, b.y - G.arenaY + rand(-30, 30)));
    aimed(b.x, b.y, 7, .2, 120, '#ffcf4a', 4, 12);
  },
  wave(b) {
    for (let w = 0; w < 2; w++) b.after(w * .6, () => { const gap = angTo(b.x, b.y, Player.x, Player.y) + rand(-.5, .5); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; if (Math.abs(((a - gap) % TAU + TAU * 1.5) % TAU - Math.PI) < .28) continue; EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, acc: 40, maxSp: 170, col: '#e8452c', r: 4, dmg: 12 }); } addShake(4); });
  },
  // ---- 刀螂将军 ----
  scythe(b) {
    for (let w = 0; w < (b.enraged ? 3 : 2); w++) b.after(w * .45, () => {
      const a0 = angTo(b.x, b.y, Player.x, Player.y), dir = w % 2 ? 1 : -1;
      for (let i = 0; i < 13; i++) { const a = a0 + dir * (i - 6) * .13; EB.add({ x: b.x + 10, y: b.y, vx: Math.cos(a) * (90 + i * 6), vy: Math.sin(a) * (90 + i * 6), av: -dir * .5, col: '#4ae0a0', r: 3, dmg: 11 }); }
      Sfx.play('slash'); addShake(2);
    });
  },
  cross(b) {
    for (let w = 0; w < 5; w++) b.after(w * .2, () => { const off = w * .16 + (b.enraged ? .08 : 0); for (let k = 0; k < 8; k++) { const a = off + k * TAU / 8; EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, col: k % 2 ? '#eef8ff' : '#4ae0a0', r: 3, dmg: 10 }); } });
  },
  guillotine(b) {
    const n = b.enraged ? 5 : 4;
    for (let i = 0; i < n; i++) Lasers.add({ x: G.tideX + 90 + i * 85 + rand(-10, 10), y: G.arenaY - 10, ang: Math.PI / 2, warn: .9 + i * .12, on: .35, w: 8, len: 320, col: '#4ae0a0', dmg: 18 });
    b.after(1.2, () => aimed(b.x, b.y, 5, .2, 130, '#eef8ff', 3, 10));
  },
  // ---- 金蜂娘娘 ----
  stinger(b) {
    for (let i = 0; i < (b.enraged ? 14 : 10); i++) b.after(i * .08, () => { const a = angTo(b.x, b.y, Player.x, Player.y) + rand(-.35, .35); EB.add({ x: b.x - 8, y: b.y + 8, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, acc: 220, maxSp: 240, col: '#ffcf3a', r: 2, dmg: 9 }); });
  },
  swarmCall(b) {
    for (let i = 0; i < 4 + Math.min(4, b.lv); i++) b.after(i * .15, () => Enemies.spawn('wasp', b.sx + 10, b.y - G.arenaY + rand(-40, 40), { fireT: rand(.3, .9) }));
    ringShot(b.x, b.y, 16, 70, '#ffcf3a', 3, 0, 10);
  },
  honey(b) {
    for (let i = 0; i < (b.enraged ? 12 : 8); i++) b.after(i * .1, () => EB.add({ x: b.x, y: b.y - 6, vx: rand(40, 200), vy: rand(-200, -90), grav: 170, col: '#ff9a2a', r: 5, dmg: 12, life: 5 }));
  },
  hexstorm(b) {
    for (let w = 0; w < 6; w++) b.after(w * .3, () => ringShot(b.x, b.y, 6, 75 + w * 6, w % 2 ? '#ffcf3a' : '#ff9a2a', 4, w * .26, 11, { av: w % 2 ? .6 : -.6 }));
  },
  // ---- 皮影判官 ----
  grid(b) {
    const cols = b.enraged ? 7 : 5;
    for (let i = 0; i < cols; i++) EB.add({ x: G.tideX + 60 + i * (380 / cols), y: G.arenaY - 6, vx: 0, vy: 95, delay: .5 + i * .05, col: '#ff6a5a', r: 3, dmg: 10 });
    for (let j = 0; j < 4; j++) EB.add({ x: G.tideX + W + 6, y: G.arenaY + 30 + j * 60, vx: -110, vy: 0, delay: .6, col: '#f2b544', r: 3, dmg: 10 });
  },
  blink(b) {
    b.warp = { t: 0, sx: rand(60, 380), y: clamp(Player.y + rand(-80, 80), G.arenaY + 30, G.arenaY + 220) };
    b.after(.75, () => { ringShot(b.x, b.y, 20, 90, '#ff6a5a', 3, 0, 11); Sfx.play('zap'); });
  },
  glitch(b) {
    for (let i = 0; i < (b.enraged ? 18 : 12); i++) b.after(i * .06, () => EB.add({ x: G.tideX + rand(40, W - 20), y: G.arenaY + rand(20, H - 30), vx: 0, vy: 0, delay: .55, acc: 160, maxSp: 170, col: '#f2b544', r: 3, dmg: 10, life: 4, hom: .2 }));
  },
  overflow(b) {
    for (let i = 0; i < 40; i++) b.after(i * .04, () => { const a = i * .5; EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, col: i % 3 ? '#ff6a5a' : '#ffffff', r: 2, dmg: 9 }); });
    const a = angTo(b.x, b.y, Player.x, Player.y);
    Lasers.add({ x: b.x, y: b.y, ang: a, src: b, warn: 1, on: .5, w: 10, col: '#ff6a5a' });
  },
  homing(b) {
    for (let i = 0; i < 8; i++) b.after(i * .12, () => { const a = rand(-1.2, 1.2); EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, hom: 1.4, col: '#e8e0ff', r: 5, dmg: 14, maxSp: 150 }); });
  },
};
// 追踪弹支持（嵌入 EB 更新）
(function () {
  const orig = EB.update.bind(EB);
  EB.update = function (dt) {
    for (const b of this.list) if (b.hom > 0 && b.delay <= 0) {
      b.hom -= dt; const sp = Math.hypot(b.vx, b.vy), a = lerpAng(Math.atan2(b.vy, b.vx), angTo(b.x, b.y, Player.x, Player.y), 2.5 * dt);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
    }
    orig(dt);
  };
})();

