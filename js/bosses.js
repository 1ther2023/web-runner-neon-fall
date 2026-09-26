'use strict';
// ============ 激光 ============
const Lasers = {
  list: [],
  reset() { this.list = []; },
  add(o) { this.list.push(Object.assign({ warn: .8, on: .5, w: 7, col: '#ff3060', dmg: 18, av: 0, len: 700, t: 0 }, o)); Sfx.play('eshoot'); },
  update(dt) {
    const P = Player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const L = this.list[i]; L.t += dt; L.x += G.camDX; L.y += G.camDY;
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
  draw(ctx, cx) {
    for (const L of this.list) {
      const x0 = L.x - cx, y0 = L.y, x1 = x0 + Math.cos(L.ang) * L.len, y1 = y0 + Math.sin(L.ang) * L.len;
      if (L.t < L.warn) {
        if (((L.t * 16) | 0) % 2) pxLine(ctx, x0, y0, x1, y1, L.col, 1);
      } else {
        const k = 1 - (L.t - L.warn) / L.on, w = Math.max(1, Math.round(L.w * (k < .2 ? k * 5 : 1) + Math.sin(G.time * 60)));
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5;
        pxLine(ctx, x0, y0, x1, y1, L.col, w + 6); ctx.globalAlpha = 1;
        pxLine(ctx, x0, y0, x1, y1, L.col, w); ctx.globalCompositeOperation = 'source-over';
        pxLine(ctx, x0, y0, x1, y1, '#fff', Math.max(1, w - 4));
      }
    }
  },
};

// ============ BOSS ============
const BOSSDEF = [
  { id: 'vulture', name: 'VULTURE-X', cn: '钢翼秃鹫 · VULTURE-X', hp: 900, col: '#8aff5a', pats: ['fan', 'feather', 'dive', 'fan', 'wingstorm'] },
  { id: 'octo', name: 'OCTO-PRIME', cn: '八爪博士 · OCTO-PRIME', hp: 1150, col: '#ffb03a', pats: ['spiral', 'rings', 'lasers', 'spiral', 'sweep'] },
  { id: 'venom', name: 'VENOM KING', cn: '黑潮之王 · VENOM KING', hp: 1400, col: '#b070ff', pats: ['flower', 'summon', 'wave', 'homing', 'flower'] },
];
function makeBoss() {
  const lv = G.bosses, def = BOSSDEF[lv % 3], mul = (1 + lv * 1.3) * Diff.over();
  return {
    isBoss: true, alive: true, targetable: false, def, lv, name: def.name + (lv >= 3 ? ' MK' + (Math.floor(lv / 3) + 1) : ''),
    x: G.cam.x - 70, y: G.cam.y + H / 2, vx: 0, vy: 0, hp: def.hp * mul, maxHp: def.hp * mul, r: 20, t: 0, flash: 0,
    state: 'enter', patT: 1.6, patI: 0, timers: [], sx: -70, tsx: 80, dying: 0, dash: null, enraged: false,
    after(d, fn) { this.timers.push({ t: d, fn }); },
    hitTest(x, y, r) { const rr = this.r + r; return d2(x, y, this.x, this.y) < rr * rr; },
    onHit() {
      if (!this.enraged && this.hp < this.maxHp * .5) {
        this.enraged = true; FX.text(this.x, this.y - 34, 'ENRAGED!', '#ff3040', 2); addShake(8); Sfx.play('warn');
        ringShot(this.x, this.y, 36, 90, this.def.col, 4, 0, 12);
      }
      if (this.hp <= 0 && this.state !== 'dying') {
        this.state = 'dying'; this.dying = 2.2; this.targetable = false; this.timers = [];
        EB.clear(true); Lasers.reset(); slowMo(.25, 1.4); hitStop(.2); screenFlash(.8, '#fff'); Sfx.play('bossdie');
      }
    },
    update(dt) {
      this.t += dt; this.flash -= dt; this.y += G.camDY;
      const P = Player;
      if (this.state === 'enter') {
        this.sx = lerp(this.sx, this.tsx, 1 - Math.exp(-2 * dt));
        if (this.sx > this.tsx - 6) { this.state = 'fight'; this.targetable = true; }
      } else if (this.state === 'fight') {
        // 追击：左侧徘徊，跟随玩家高度，周期性逼近
        if (!this.dash) {
          this.tsx = 70 + Math.sin(this.t * .7) * 40 + (this.enraged ? 30 : 0);
          this.sx = lerp(this.sx, this.tsx, 1 - Math.exp(-1.5 * dt));
          this.y = lerp(this.y, clamp(P.y + Math.sin(this.t * 1.3) * 40, G.cam.y + 40, G.cam.y + 200), 1 - Math.exp(-1.2 * dt));
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
      this.x = G.cam.x + this.sx;
    },
    draw(ctx, cx) { BDRAW[this.def.id](ctx, this, Math.round(this.x - cx), Math.round(this.y)); },
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
  UI.banner('BOSS 击破！', b.def.cn + ' 已坠入黑潮' + (G.bosses === 3 ? ' · 黑潮即将暴走！' : ''), 2.6);
  BG.build(G.bosses % THEMES.length);
}

// ============ BOSS 弹幕模式 ============
const BPAT = {
  fan(b) {
    for (let w = 0; w < (b.enraged ? 4 : 3); w++) b.after(w * .28, () => { aimed(b.x + 14, b.y, 9, .14, 130 + w * 15, '#8aff5a', 3, 11); Sfx.play('eshoot'); });
  },
  feather(b) {
    for (let i = 0; i < (b.enraged ? 30 : 20); i++) b.after(i * .05, () => EB.add({ x: b.x, y: b.y - 10, vx: rand(60, 230), vy: rand(-230, -80), grav: 140, col: '#e8ffb0', r: 2, dmg: 9 }));
  },
  dive(b) {
    b.dash = { t: 0, sx0: b.sx, tx: clamp(Player.x - G.cam.x - 10, 120, 330), ty: Player.y };
    FX.text(b.x, b.y - 30, '!!', '#ff3040', 3); Sfx.play('warn');
  },
  wingstorm(b) {
    for (let i = 0; i < 40; i++) b.after(i * .05, () => { const a = i * .35; for (const s of [1, -1]) EB.add({ x: b.x, y: b.y, vx: Math.cos(a * s) * 100, vy: Math.sin(a * s) * 100, col: s > 0 ? '#8aff5a' : '#ffe04a', r: 3, dmg: 10 }); });
  },
  spiral(b) {
    const n = b.enraged ? 5 : 4, dir = Math.random() < .5 ? 1 : -1;
    for (let i = 0; i < 45; i++) b.after(i * .055, () => { for (let k = 0; k < n; k++) { const a = dir * i * .2 + k * TAU / n; EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, col: '#ffb03a', r: 3, dmg: 10 }); } });
  },
  rings(b) {
    for (let w = 0; w < 4; w++) b.after(w * .35, () => { ringShot(b.x, b.y, 26, 80 + w * 8, w % 2 ? '#ff4a6a' : '#ffb03a', w % 2 ? 3 : 4, w * .12, 11); Sfx.play('eshoot'); });
  },
  lasers(b) {
    const a = angTo(b.x, b.y, Player.x, Player.y), n = b.enraged ? 5 : 3;
    for (let i = 0; i < n; i++) Lasers.add({ x: b.x, y: b.y, ang: a + (i - (n - 1) / 2) * .32, src: b, warn: .9, on: .45, col: '#ff3060' });
  },
  sweep(b) {
    const a = angTo(b.x, b.y, Player.x, Player.y) - .9;
    Lasers.add({ x: b.x, y: b.y, ang: a, av: 1.1, src: b, warn: .8, on: 1.6, w: 9, col: '#ffb03a' });
    b.after(.9, () => ringShot(b.x, b.y, 20, 70, '#ffe04a', 3, 0, 10));
  },
  flower(b) {
    const n = b.enraged ? 7 : 5;
    for (let w = 0; w < 6; w++) b.after(w * .22, () => { for (let k = 0; k < n; k++) { const a = k / n * TAU + w * .3; for (const s of [1, -1]) EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, av: s * .9, col: s > 0 ? '#b070ff' : '#ff5ab0', r: 3, dmg: 10, life: 6 }); } });
  },
  summon(b) {
    for (let i = 0; i < 6 + b.lv; i++) b.after(i * .1, () => Enemies.spawn('blob', b.sx + 10, b.y - G.cam.y + rand(-30, 30)));
    aimed(b.x, b.y, 7, .2, 120, '#b070ff', 4, 12);
  },
  wave(b) {
    for (let w = 0; w < 2; w++) b.after(w * .6, () => { const gap = angTo(b.x, b.y, Player.x, Player.y) + rand(-.5, .5); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; if (Math.abs(((a - gap) % TAU + TAU * 1.5) % TAU - Math.PI) < .28) continue; EB.add({ x: b.x, y: b.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, acc: 40, maxSp: 170, col: '#ff5ab0', r: 4, dmg: 12 }); } addShake(4); });
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

// ============ BOSS 像素绘制 ============
function bR(ctx, b, x, y, w, h, col) { ctx.fillStyle = b.flash > 0 ? '#fff' : col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
const BDRAW = {
  vulture(ctx, b, x, y) {
    const fl = Math.sin(b.t * 9) * .5, c = b.flash > 0 ? '#fff' : null;
    // 翅膀
    for (let i = 0; i < 6; i++) {
      const a = -2.2 + fl + i * .18, len = 30 - i * 2;
      pxLine(ctx, x - 4, y - 6, x - 4 + Math.cos(a) * len, y - 6 + Math.sin(a) * len, c || (i % 2 ? '#4a6a3a' : '#6a8a4a'), 3);
    }
    // 喷射尾焰
    const fz = (b.t * 30 | 0) % 2;
    bR(ctx, b, x - 24 - fz * 3, y - 2, 6 + fz * 3, 4, '#ff8a1e'); bR(ctx, b, x - 20, y - 1, 4, 2, '#ffe04a');
    // 躯干
    bR(ctx, b, x - 16, y - 8, 26, 16, '#2a3a2a'); bR(ctx, b, x - 14, y - 6, 22, 12, '#4a5a4a');
    bR(ctx, b, x - 10, y - 2, 14, 2, '#8aff5a');
    // 头
    bR(ctx, b, x + 8, y - 14, 12, 10, '#2a3a2a'); bR(ctx, b, x + 10, y - 12, 8, 6, '#6a7a6a');
    bR(ctx, b, x + 14, y - 11, 4, 2, (b.t * 6 | 0) % 2 ? '#ff3040' : '#ffe04a');
    bR(ctx, b, x + 20, y - 10, 6, 3, '#ffcf4a'); bR(ctx, b, x + 24, y - 8, 3, 2, '#c08a1a');
    // 爪
    bR(ctx, b, x - 6, y + 8, 2, 8, '#6a6a7a'); bR(ctx, b, x + 4, y + 8, 2, 8, '#6a6a7a');
    bR(ctx, b, x - 8, y + 15, 6, 2, '#aab'); bR(ctx, b, x + 2, y + 15, 6, 2, '#aab');
    // 前翼
    for (let i = 0; i < 5; i++) { const a = -2.5 - fl * .8 + i * .2, len = 34 - i * 3; pxLine(ctx, x, y - 8, x + Math.cos(a) * len, y - 8 + Math.sin(a) * len, c || (i % 2 ? '#8aa06a' : '#aac08a'), 2); }
  },
  octo(ctx, b, x, y) {
    const c = b.flash > 0 ? '#fff' : null;
    // 触手
    for (let k = 0; k < 4; k++) {
      let px = x, py = y + 6;
      const base = [.4, 1.2, 2.0, 2.8][k] + Math.sin(b.t * 2 + k) * .3;
      for (let s = 0; s < 7; s++) {
        const a = base + Math.sin(b.t * 3 + s * .6 + k) * .5, nx = px + Math.cos(a) * 5, ny = py + Math.sin(a) * 5;
        pxLine(ctx, px, py, nx, ny, c || (s % 2 ? '#5a5a6a' : '#8a8a9a'), 3); px = nx; py = ny;
      }
      bR(ctx, b, px - 2, py - 2, 5, 5, '#ffb03a'); bR(ctx, b, px - 1, py - 1, 3, 3, '#ff3060');
    }
    // 身体 & 头罩
    pxCircle(ctx, x, y, 14, c || '#3a3a4a'); pxCircle(ctx, x, y - 2, 11, c || '#5a5a6a');
    pxCircle(ctx, x + 2, y - 5, 7, c || '#8af0ff'); pxCircle(ctx, x + 2, y - 5, 5, c || '#ff8ab0');
    bR(ctx, b, x - 1, y - 7, 2, 4, '#c05a80'); bR(ctx, b, x + 3, y - 8, 2, 5, '#c05a80');
    // 护目镜
    bR(ctx, b, x + 4, y + 2, 10, 4, '#222'); bR(ctx, b, x + 5, y + 3, 3, 2, '#ffe04a'); bR(ctx, b, x + 10, y + 3, 3, 2, '#ffe04a');
    bR(ctx, b, x - 12, y + 10, 24, 3, '#ffb03a');
  },
  venom(ctx, b, x, y) {
    const c = b.flash > 0 ? '#fff' : null;
    // 触须
    for (let k = 0; k < 7; k++) {
      let px = x - 8, py = y; const base = Math.PI * .6 + k * .3;
      for (let s = 0; s < 6; s++) { const a = base + Math.sin(b.t * 4 + s + k) * .6, nx = px + Math.cos(a) * 6, ny = py + Math.sin(a) * 6; pxLine(ctx, px, py, nx, ny, c || '#1a0f26', 3 - (s > 3)); px = nx; py = ny; }
    }
    // 身体（蠕动）
    ctx.fillStyle = c || '#0e0816';
    for (let yy = -20; yy <= 20; yy++) { const w = Math.sqrt(400 - yy * yy) * (1 + Math.sin(b.t * 5 + yy * .3) * .08); ctx.fillRect(Math.round(x - w), y + yy, Math.round(w * 2), 1); }
    ctx.fillStyle = c || '#3b2358'; for (let yy = -18; yy < 0; yy += 3) { const w = Math.sqrt(400 - yy * yy) * .8; ctx.fillRect(Math.round(x - w), y + yy, 3, 1); }
    // 眼睛
    const eo = Math.sin(b.t * 2) * 1;
    for (const s of [-1, 1]) { ctx.fillStyle = c || '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 4 + s * 3 + (s > 0 ? i : -i) + (s > 0 ? 2 : -3), y - 12 + i + eo, 4 - (i >> 1), 2); }
    // 嘴
    bR(ctx, b, x - 6, y + 2, 20, 8, '#300010');
    for (let i = 0; i < 6; i++) { bR(ctx, b, x - 5 + i * 3, y + 2, 2, 3, '#fff'); bR(ctx, b, x - 4 + i * 3, y + 7, 2, 3, '#fff'); }
    bR(ctx, b, x + 12, y + 6 + Math.round(Math.sin(b.t * 8) * 2), 8, 2, '#ff3060');
  },
};
