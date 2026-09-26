'use strict';
// ============ 特效：粒子、飘字、冲击波、闪电、残留蛛丝 ============
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
    const cdx = G.camDX;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt; if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'line') { p.vx *= 1 - 4 * dt; p.vy *= 1 - 4 * dt; }
      if (p.type === 'smoke') { p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.x += cdx; t.y += t.vy * dt + G.camDY; t.vy *= 1 - 3 * dt; if (t.life <= 0) this.texts.splice(i, 1); }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.life -= dt; r.x += cdx; r.y += G.camDY; if (r.life <= 0) this.rings.splice(i, 1); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.life -= dt; if (b.life <= 0) this.bolts.splice(i, 1); }
    for (let i = this.strands.length - 1; i >= 0; i--) {
      const s = this.strands[i]; s.life -= dt; s.va += -Math.sin(s.a) * 12 * dt; s.va *= 1 - 1.5 * dt; s.a += s.va * dt;
      if (s.life <= 0) this.strands.splice(i, 1);
    }
  },
  drawBack(ctx, cx) {
    for (const s of this.strands) {
      ctx.globalAlpha = clamp(s.life, 0, 1) * .8;
      const ex = s.ax + Math.sin(s.a) * s.len, ey = s.ay + Math.cos(s.a) * s.len;
      pxLine(ctx, s.ax - cx, s.ay, (s.ax + ex) / 2 - cx + Math.sin(s.a * 2) * 3, (s.ay + ey) / 2, '#e8f4ff');
      pxLine(ctx, (s.ax + ex) / 2 - cx + Math.sin(s.a * 2) * 3, (s.ay + ey) / 2, ex - cx, ey, '#e8f4ff');
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.ax - cx) - 1, Math.round(s.ay) - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) if (p.type === 'smoke') {
      const k = p.life / p.max; ctx.globalAlpha = k * .7; ctx.fillStyle = p.col;
      const s = Math.round(p.size * (1.6 - k)); ctx.fillRect(Math.round(p.x - cx - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
  },
  draw(ctx, cx) {
    for (const p of this.parts) {
      if (p.type === 'smoke') continue;
      const k = p.life / p.max, x = p.x - cx, y = p.y;
      if (p.type === 'flash') {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
        const s = p.size * (2 - k); ctx.drawImage(glowSpr(p.col, 16), x - s, y - s, s * 2, s * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; continue;
      }
      ctx.fillStyle = p.col;
      if (p.type === 'line') { pxLine(ctx, x, y, x - p.vx * .03, y - p.vy * .03, p.col, p.size); }
      else { const s = Math.max(1, Math.round(p.size * (k > .5 ? 1 : k * 2))); ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max, rad = lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 3));
      ctx.globalAlpha = 1 - k; pxRing(ctx, r.x - cx, r.y, rad, r.col, r.th); ctx.globalAlpha = 1;
    }
    for (const b of this.bolts) {
      for (let i = 0; i < b.pts.length - 1; i++) {
        pxLine(ctx, b.pts[i][0] - cx, b.pts[i][1], b.pts[i + 1][0] - cx, b.pts[i + 1][1], b.col, 2);
        pxLine(ctx, b.pts[i][0] - cx, b.pts[i][1], b.pts[i + 1][0] - cx, b.pts[i + 1][1], '#fff', 1);
      }
    }
  },
  drawTexts(ctx, cx) {
    for (const t of this.texts) {
      const k = t.life / t.max; const pop = k > .8 ? 1 + (k - .8) * 3 : 1;
      if (k < .25 && ((t.life * 30) | 0) % 2) continue;
      drawText(ctx, t.s, t.x - cx, t.y, t.col, Math.round(t.sc * pop), 'center');
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
      const p = this.list[i]; p.age += dt; p.x += G.camDX; p.y += G.camDY;
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
        else if (p.type === 'chest') { G.queue.push('chest'); Sfx.play('levelup'); FX.ring(p.x, p.y, 3, 40, .4, '#ffcf4a', 2); FX.text(P.x, P.y - 20, 'EQUIP!', '#ffcf4a', 2); }
        else if (p.type === 'heart') { P.heal(p.val); Sfx.play('pick'); }
        continue;
      }
      if (p.y > G.cam.y + H + 30 || p.x < G.cam.x - 40) this.list.splice(i, 1);
    }
  },
  draw(ctx, cx) {
    for (const p of this.list) {
      const x = Math.round(p.x - cx), y = Math.round(p.y);
      if (p.type === 'coin') { const s = ((G.time * 8 + p.ph) | 0) % 2 ? SPR.coin : SPR.coin2; ctx.drawImage(s.c, x - (s.w >> 1), y - 2); }
      else if (p.type === 'energy') {
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSpr('#4ad8ff', 5), x - 8, y - 8, 16, 16); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#dff8ff'; ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (p.type === 'heart') ctx.drawImage(SPR.heart.c, x - 2, y - 2);
      else if (p.type === 'chest') {
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSpr('#ffcf4a', 8), x - 16, y - 16, 32, 32); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#5a2a0a'; ctx.fillRect(x - 5, y - 4, 11, 8); ctx.fillStyle = '#ffcf4a'; ctx.fillRect(x - 5, y - 4, 11, 1); ctx.fillRect(x - 5, y - 1, 11, 1); ctx.fillRect(x, y - 2, 1, 3);
      }
    }
  },
};
