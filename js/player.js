'use strict';
const GRAV = 560, DRIVE = 70, ROPE_SPEED = 1300;

// ============ 玩家：蛛影 ============
const Player = {
  reset() {
    Object.assign(this, {
      x: G.cam.x + W / 2, y: 118, vx: 0, vy: 0, hp: 100, maxHp: 100, deadTitle: '', deadSub: '', alive: true, inv: 0, rot: 0, spin: 0,
      fireT: 0, hands: [{ rope: null, retry: 0, was: false }, { rope: null, retry: 0, was: false }], trail: [], dead: '',
      edgeT: 0,
    });
  },
  stuckRopes() { const r = []; for (const h of this.hands) if (h.rope && h.rope.state === 'stuck') r.push(h.rope); return r; },
  handWorld(i) {
    const lx = i === 0 ? -3 : 3, ly = -2, c = Math.cos(this.rot), s = Math.sin(this.rot);
    return [this.x + lx * c - ly * s, this.y + lx * s + ly * c];
  },
  shoot(i) {
    const h = this.hands[i]; const [hx, hy] = this.handWorld(i);
    let tx = G.cam.x + Input.mx, ty = Input.my + G.cam.y;
    let dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy) || 1;
    const R = Stats.range; if (d > R) { tx = hx + dx / d * R; ty = hy + dy / d * R; d = R; }
    // 从目标点向玩家回溯，寻找可粘附点（宽容判定）
    let ok = false, fx = tx, fy = ty;
    for (let s = d; s >= 22; s -= 4) {
      const px = hx + dx / (Math.hypot(dx, dy) || 1) * s, py = hy + dy / (Math.hypot(dx, dy) || 1) * s;
      if (World.anchorAt(px, py)) { ok = true; fx = px; fy = py; break; }
    }
    h.rope = { state: 'fly', t: 0, dur: Math.max(.04, d / ROPE_SPEED), ax: fx, ay: fy, ok, len: 0 };
    Sfx.play('thwip');
    FX.dir(hx, hy, Math.atan2(fy - hy, fx - hx), .3, 3, '#e8f4ff', 120, .15);
  },
  release(i, silent) {
    const h = this.hands[i]; if (!h.rope) return;
    const wasStuck = h.rope.state === 'stuck';
    if (wasStuck) FX.strand(h.rope.ax, h.rope.ay, this.x, this.y);
    h.rope = null;
    if (wasStuck && !silent && this.stuckRopes().length === 0) {
      // 放手时的甩出加速与翻滚
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 60) { this.vx *= 1.07; if (this.vy < 0) this.vy -= 45; }
      this.spin = (this.vx >= 0 ? 1 : -1) * 14;
      Sfx.play('release'); FX.ring(this.x, this.y, 2, 12, .2, '#e8f4ff');
      Skills.onRelease(sp);
    }
  },
  update(dt) {
    if (!this.alive) return;
    this.inv = Math.max(0, this.inv - dt);
    // 手部输入
    for (let i = 0; i < 2; i++) {
      const h = this.hands[i], down = handDown(i) && G.inputLock <= 0;
      h.retry -= dt;
      if (down && !h.rope && (!h.was || h.retry <= 0)) this.shoot(i);
      if (!down && h.rope) this.release(i);
      h.was = down;
      const r = h.rope;
      if (r && r.state === 'fly') {
        r.t += dt / r.dur;
        if (r.t >= 1) {
          if (r.ok) {
            r.state = 'stuck'; r.len = Math.max(18, Math.hypot(this.x - r.ax, this.y - r.ay) * .93);
            Sfx.play('stick'); FX.spark(r.ax, r.ay, 5, '#ffffff', 70, .2);
            if (!G.started) { G.started = true; }
          } else { h.rope = null; h.retry = .12; Sfx.play('miss'); FX.spark(r.ax, r.ay, 3, '#aab', 40, .2); }
        }
      }
    }
    if (!G.started) { this.x += G.camDX; return; } // 等待第一根蛛丝
    const ropes = this.stuckRopes();
    const steps = 3, sdt = dt / steps;
    for (let k = 0; k < steps; k++) {
      this.vy += GRAV * sdt;
      if (ropes.length) {
        this.vx += DRIVE * sdt;
        if (ropes.length === 1) { // 摆荡时顺势助推
          const r = ropes[0], dx = this.x - r.ax, dy = this.y - r.ay, d = Math.hypot(dx, dy) || 1;
          let tx = -dy / d, ty = dx / d; if (tx * this.vx + ty * this.vy < 0) { tx = -tx; ty = -ty; }
          if (dy > 0) { this.vx += tx * 90 * sdt; this.vy += ty * 90 * sdt; }
        }
        for (const r of ropes) r.len = Math.max(20, r.len - Stats.reel * sdt);
      } else this.vx += 10 * sdt;
      this.vx *= 1 - .08 * sdt;
      this.x += this.vx * sdt; this.y += this.vy * sdt;
      for (let it = 0; it < 3; it++) for (const r of ropes) {
        const dx = this.x - r.ax, dy = this.y - r.ay, d = Math.hypot(dx, dy);
        if (d > r.len && d > 0) {
          const nx = dx / d, ny = dy / d; this.x = r.ax + nx * r.len; this.y = r.ay + ny * r.len;
          const vr = this.vx * nx + this.vy * ny; if (vr > 0) { this.vx -= vr * nx; this.vy -= vr * ny; }
        }
      }
    }
    const sp = Math.hypot(this.vx, this.vy); if (sp > 400) { this.vx *= 400 / sp; this.vy *= 400 / sp; }
    // 边界：顶部 / 左侧黑潮 / 坠落
    if (this.y < -640) { this.y = -640; if (this.vy < 0) this.vy = 0; }
    const left = G.cam.x + 8;
    if (this.x < left) {
      this.x = left; this.vx = Math.max(this.vx, G.camSpeed + 60);
      this.edgeT -= dt;
      if (this.edgeT <= 0) { this.edgeT = .35; this.hurt(3 + Diff.over() * 2, true); FX.spark(this.x, this.y, 8, '#b070ff', 120, .3); }
    }
    if (this.y > G.cam.y + H + 14 && !ropes.length) { this.die('坠落阵亡', '双手都放开了蛛丝……黑潮吞没了你'); return; }
    // 姿态
    if (ropes.length) {
      let ax = 0, ay = 0; for (const r of ropes) { ax += r.ax; ay += r.ay; } ax /= ropes.length; ay /= ropes.length;
      const tr = Math.atan2(ay - this.y, ax - this.x) + Math.PI / 2;
      this.rot = lerpAng(this.rot, tr, 1 - Math.exp(-14 * dt)); this.spin = 0;
    } else if (Math.abs(this.spin) > 1) { this.rot += this.spin * dt; this.spin *= 1 - 2.2 * dt; }
    else this.rot = lerpAng(this.rot, clamp(this.vx * .002, -.5, .5), 1 - Math.exp(-6 * dt));
    // 残影
    this.trail.push({ x: this.x, y: this.y, rot: this.rot }); if (this.trail.length > 6) this.trail.shift();
    this.hp = Math.min(this.maxHp, this.hp + Stats.regen * dt);
  },
  hurt(dmg, silentEdge) {
    if (!this.alive || this.inv > 0 || G.ultT > 0) return false;
    if (Stats.dodge && Math.random() < Stats.dodge) { FX.text(this.x, this.y - 14, 'DODGE', '#8af0ff'); this.inv = .3; return false; }
    dmg = Math.max(1, Math.round(dmg * Diff.edmg() * (1 - Stats.armor)));
    this.hp -= dmg; this.inv = silentEdge ? .3 : 1.1;
    addShake(silentEdge ? 3 : 7); screenFlash(.35, '#ff2030'); if (!silentEdge) hitStop(.06);
    Sfx.play('hurt'); FX.spark(this.x, this.y, 12, '#ff3040', 150, .35);
    FX.text(this.x, this.y - 14, '-' + dmg, '#ff4050', 1);
    G.combo = 0;
    if (this.hp <= 0) { this.hp = 0; this.die('战斗阵亡', '蛛影力竭，坠入了黑潮'); }
    return true;
  },
  heal(v) { const o = this.hp; this.hp = Math.min(this.maxHp, this.hp + v); if (this.hp - o >= 1) FX.text(this.x, this.y - 16, '+' + Math.round(this.hp - o), '#4aff8a'); },
  die(title, sub) {
    if (!this.alive) return;
    this.alive = false; this.deadTitle = title; this.deadSub = sub;
    FX.boom(this.x, Math.min(this.y, H - 10), 1.5, ['#fff', '#ff3040', '#2c4fd6', '#ffe04a']);
    addShake(12); hitStop(.15); slowMo(.3, 1.2); Sfx.play('dead');
    this.hands.forEach((h, i) => this.release(i, true));
    G.deathT = 1.6;
  },
  draw(ctx, cx) {
    if (!this.alive) return;
    // 蛛丝
    this.hands.forEach((h, i) => {
      const r = h.rope; if (!r) return;
      const [hx, hy] = this.handWorld(i);
      let ex = r.ax, ey = r.ay;
      if (r.state === 'fly') { ex = lerp(hx, r.ax, r.t); ey = lerp(hy, r.ay, r.t); }
      pxLine(ctx, hx - cx, hy, ex - cx, ey, '#c8e0ff', 1);
      if (r.state === 'fly') { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(ex - cx) - 1, Math.round(ey) - 1, 3, 3); }
      else { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(ex - cx) - 2, Math.round(ey), 5, 1); ctx.fillRect(Math.round(ex - cx), Math.round(ey) - 2, 1, 5); }
    });
    // 残影
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 180) this.trail.forEach((t, i) => { ctx.globalAlpha = i / this.trail.length * .35; this.drawBody(ctx, t.x - cx, t.y, t.rot, '#ff3040'); });
    ctx.globalAlpha = 1;
    const blink = this.inv > 0 && ((G.time * 20) | 0) % 2;
    this.drawBody(ctx, this.x - cx, this.y, this.rot, blink ? '#fff' : null);
    // 判定点
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.x - cx) - 1, Math.round(this.y) - 1, 2, 2);
    if (G.ultT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSpr('#ff3040', 10), this.x - cx - 22, this.y - 22, 44, 44); ctx.globalCompositeOperation = 'source-over'; }
  },
  drawBody(ctx, sx, sy, rot, tint) {
    const [pc, px] = PCANVAS; px.clearRect(0, 0, 40, 40);
    const ox = 15, oy = 12; // 精灵左上角
    const ropes = this.hands.map(h => h.rope);
    const armCol = tint || '#e3263a', legCol = tint || '#2c4fd6', bootCol = tint || '#e3263a';
    // 手臂
    [[ox + 1, oy + 8, 0], [ox + 8, oy + 8, 1]].forEach(([shx, shy, i]) => {
      let a;
      const r = ropes[i];
      if (r) a = Math.atan2(r.ay - this.y, r.ax - this.x) - rot;
      else a = i === 0 ? 2.3 + Math.sin(G.time * 10) * .2 : (this.alive ? -.3 : .5);
      const ex = shx + Math.cos(a) * 6, ey = shy + Math.sin(a) * 6;
      pxLine(px, shx, shy, ex, ey, armCol, 2);
      px.fillStyle = tint || '#fff'; px.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
    });
    // 腿
    const tuck = Math.abs(this.spin) > 3 ? 1 : 0, sw = clamp(-this.vx * .004, -.8, .8);
    [[ox + 3, oy + 13, -1], [ox + 6, oy + 13, 1]].forEach(([hx, hy, s]) => {
      const a = Math.PI / 2 + sw + s * .25 + (tuck ? -1.2 * s : 0);
      const kx = hx + Math.cos(a) * 4, ky = hy + Math.sin(a) * 4;
      const a2 = a + (tuck ? 2 : .4 * s), fx = kx + Math.cos(a2) * 4, fy = ky + Math.sin(a2) * 4;
      pxLine(px, hx, hy, kx, ky, legCol, 2); pxLine(px, kx, ky, fx, fy, bootCol, 2);
    });
    px.drawImage(tint ? SPR.hero.white : SPR.hero.c, ox, oy);
    if (tint && tint !== '#fff') { px.globalCompositeOperation = 'source-atop'; px.fillStyle = tint; px.fillRect(0, 0, 40, 40); px.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.rotate(rot); ctx.drawImage(pc, -20, -20 - 0); ctx.restore();
  },
};
const PCANVAS = mkCanvas(40, 40);
function lerpAng(a, b, t) { let d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI; return a + d * t; }

// ============ 玩家弹药 ============
const Shots = {
  list: [],
  reset() { this.list = []; },
  fire(x, y, a, dmg, o) {
    o = o || {};
    const sp = o.speed || 380;
    this.list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, pierce: o.pierce || 0, hit: [], life: o.life || .9, kind: o.kind || 'web', homing: o.homing || 0, r: o.r || 3, col: o.col || '#8af0ff' });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i]; s.life -= dt;
      if (s.homing) {
        const t = findTarget(s.x, s.y, 220);
        if (t) { const a = angTo(s.x, s.y, t.x, t.y), sp = Math.hypot(s.vx, s.vy); const ca = Math.atan2(s.vy, s.vx); const na = lerpAng(ca, a, Math.min(1, s.homing * dt)); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
      }
      s.x += s.vx * dt + G.camDX; s.y += s.vy * dt + G.camDY;
      let dead = s.life <= 0 || s.x < G.cam.x - 20 || s.x > G.cam.x + W + 20 || s.y < G.cam.y - 20 || s.y > G.cam.y + H + 20;
      if (!dead) {
        const e = hitTest(s.x, s.y, s.r, s.hit);
        if (e) {
          s.hit.push(e);
          const crit = rollCrit();
          damageEnemy(e, s.dmg, crit, s.vx, s.vy);
          FX.spark(s.x, s.y, crit ? 6 : 3, crit ? '#ffe04a' : '#fff', 120, .15);
          if (s.pierce-- <= 0) dead = true;
        }
      }
      // 与敌方弹幕抵消：每枚弹药可抵消若干子弹，耗尽后消失
      if (!dead) {
        if (s.cancel === undefined) s.cancel = 2 + s.pierce;
        for (let j = EB.list.length - 1; j >= 0; j--) {
          const b = EB.list[j]; if (b.delay > 0) continue;
          const rr = s.r + b.r + 3;
          if (d2(s.x, s.y, b.x, b.y) < rr * rr) {
            EB.list.splice(j, 1); FX.spark(b.x, b.y, 4, b.col, 90, .2); FX.spark(b.x, b.y, 2, '#fff', 60, .15);
            Sfx.play('graze'); addStorm(.3);
            if (--s.cancel <= 0) { dead = true; break; }
          }
        }
      }
      if (dead) this.list.splice(i, 1);
    }
  },
  draw(ctx, cx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.list) ctx.drawImage(glowSpr(s.col, 4), s.x - cx - 8, s.y - 8, 16, 16);
    ctx.globalCompositeOperation = 'source-over';
    for (const s of this.list) {
      const x = s.x - cx, y = s.y;
      pxLine(ctx, x, y, x - s.vx * .025, y - s.vy * .025, s.col, 1);
      ctx.fillStyle = '#fff';
      if (s.kind === 'web') { ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillStyle = s.col; ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 5); }
      else ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
  },
};
