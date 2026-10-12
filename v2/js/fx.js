'use strict';
// ============ 特效：粒子、飘字、冲击波、闪电、残留钩索 ============
const FX = {
  parts: [], texts: [], rings: [], bolts: [], strands: [],
  reset() { this.parts = []; this.texts = []; this.rings = []; this.bolts = []; this.strands = []; },
  p(x, y, vx, vy, life, col, size, type, grav) {
    if (this.parts.length > 900) this.parts.shift();
    this.parts.push({ x, y, vx, vy, life, max: life, col, size: size || 1, type: type || 'sq', grav: grav || 0 });
  },
  spark(x, y, n, col, spd, life, size, grav) {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(spd * .3, spd); this.p(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(life * .5, life), col, size, 'line', grav); }
  },
  dir(x, y, ang, spread, n, col, spd, life, size) {
    for (let i = 0; i < n; i++) { const a = ang + rand(-spread, spread), s = rand(spd * .4, spd); this.p(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(life * .5, life), col, size, 'line'); }
  },
  boom(x, y, scale, cols) {
    scale = scale || 1; cols = cols || ['#fff', '#ffe04a', '#ff8a1e', '#ff3040'];
    this.p(x, y, 0, 0, .12, '#ffffff', 26 * scale, 'flash');
    this.ring(x, y, 4, 26 * scale, .3, cols[1]);
    for (let i = 0; i < 16 * scale; i++) { const a = rand(0, TAU), s = rand(30, 170) * Math.sqrt(scale); this.p(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(.2, .6), pick(cols), randi(1, 3), 'sq', 200); }
    for (let i = 0; i < 8 * scale; i++) { const a = rand(0, TAU), s = rand(10, 50); this.p(x + rand(-4, 4), y + rand(-4, 4), Math.cos(a) * s, Math.sin(a) * s - 20, rand(.5, 1.1), '#2a1830', randi(3, 6) * scale, 'smoke'); }
    this.spark(x, y, 10 * scale, '#fff', 260 * scale, .25, 1);
  },
  ring(x, y, r0, r1, life, col, th) { this.rings.push({ x, y, r0, r1, life, max: life, col, th: th || 1 }); },
  text(x, y, s, col, sc, vy) { if (this.texts.length > 80) this.texts.shift(); this.texts.push({ x, y, s: String(s), col, sc: sc || 1, life: .8, max: .8, vy: vy === undefined ? -40 : vy }); },
  bolt(x0, y0, x1, y1, col) {
    const pts = [[x0, y0]], n = 6;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x0, x1, t) + rand(-6, 6), lerp(y0, y1, t) + rand(-6, 6)]); }
    pts.push([x1, y1]); this.bolts.push({ pts, life: .15, col: col || '#8af0ff' });
  },
  strand(ax, ay, px, py) { this.strands.push({ ax, ay, len: Math.min(60, Math.hypot(px - ax, py - ay)), a: Math.atan2(px - ax, py - ay), va: 0, life: 1.4 }); },
  update(dt) {
    const cdx = G.arDX, cdy = G.arDY;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt; if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'line') { p.vx *= 1 - 4 * dt; p.vy *= 1 - 4 * dt; }
      if (p.type === 'smoke') { p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.x += cdx; t.y += t.vy * dt + cdy; t.vy *= 1 - 3 * dt; if (t.life <= 0) this.texts.splice(i, 1); }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.life -= dt; r.x += cdx; r.y += cdy; if (r.life <= 0) this.rings.splice(i, 1); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.life -= dt; if (b.life <= 0) this.bolts.splice(i, 1); }
    for (let i = this.strands.length - 1; i >= 0; i--) {
      const s = this.strands[i]; s.life -= dt; s.va += -Math.sin(s.a) * 12 * dt; s.va *= 1 - 1.5 * dt; s.a += s.va * dt;
      if (s.life <= 0) this.strands.splice(i, 1);
    }
  },
};

// ============ 掉落物：金币 / 能量 / 血包 ============
const Pickups = {
  list: [],
  reset() { this.list = []; },
  spawn(x, y, type, val, n) {
    for (let i = 0; i < (n || 1); i++) {
      const a = rand(-Math.PI, 0), s = rand(40, 140);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, type, val, age: 0, ph: Math.random() * 6 });
    }
  },
  update(dt) {
    const P = Player, mag = Stats.magnet;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.age += dt; p.x += G.arDX; p.y += G.arDY;
      const dd = Math.sqrt(d2(p.x, p.y, P.x, P.y));
      if (p.age > .3 && (dd < mag || p.age > (p.type === 'chest' ? .6 : 1.6) || G.ultT > 0)) {
        const a = angTo(p.x, p.y, P.x, P.y), sp = 260 + p.age * 200;
        p.vx = lerp(p.vx, Math.cos(a) * sp, 10 * dt); p.vy = lerp(p.vy, Math.sin(a) * sp, 10 * dt);
      } else { p.vy += 160 * dt; p.vx *= 1 - 2 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (dd < 9 && P.alive) {
        this.list.splice(i, 1);
        if (p.type === 'coin') { gainCoin(p.val); Sfx.play('coin'); FX.spark(p.x, p.y, 3, '#ffd23a', 60, .2); }
        else if (p.type === 'energy') { addXP(p.val); Sfx.play('energy'); FX.spark(p.x, p.y, 4, '#4ad8ff', 80, .25); }
        else if (p.type === 'chest') { G.queue.push('chest'); Sfx.play('levelup'); FX.ring(p.x, p.y, 3, 40, .4, '#ffcf4a', 2); FX.text(P.x, P.y - 20, '补给!', '#ffcf4a', 2); }
        else if (p.type === 'heart') { P.heal(p.val); Sfx.play('pick'); }
        continue;
      }
      if (p.y > G.arenaY + H + 30 || p.x < G.tideX - 40) this.list.splice(i, 1);
    }
  },
};
