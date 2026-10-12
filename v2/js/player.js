'use strict';
const GRAV = 560, DRIVE = 70, ROPE_SPEED = 1300;

// ============ 玩家：青鸢（钩影客） ============
const Player = {
  reset() {
    Object.assign(this, {
      x: G.tideX + W / 2, y: 118, vx: 0, vy: 0, hp: 100, maxHp: 100, deadTitle: '', deadSub: '', alive: true, inv: 0, rot: 0, spin: 0,
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
    Sfx.play('hook');
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
    if (!G.started) { this.x += G.arDX; return; } // 等待第一根钩索
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
    // 边界：顶部 / 左侧墨潮 / 坠落
    if (this.y < 6) { this.y = 6; if (this.vy < 0) this.vy = 0; }  // 顶部封顶，不能飞出屏幕
    const left = G.tideX + 8;
    if (this.x < left) {
      this.x = left; this.vx = Math.max(this.vx, G.camSpeed + 60);
      this.edgeT -= dt;
      if (this.edgeT <= 0) { this.edgeT = .35; this.hurt(3 + Diff.over() * 2, true); FX.spark(this.x, this.y, 8, '#b070ff', 120, .3); }
    }
    if (this.y > H + 10) { this.die('坠入黑潮', '掉出了屏幕底部……黑潮吞没了你'); return; }  // 掉出底边即死，抓着钩索也救不回
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
    if (Stats.shieldCD) G.shieldT -= dt;
  },
  hurt(dmg, silentEdge) {
    if (!this.alive || this.inv > 0 || G.ultT > 0) return false;
    if (Stats.shieldCD && G.shieldT <= 0) {
      G.shieldT = Stats.shieldCD; this.inv = .6; FX.ring(this.x, this.y, 4, 26, .35, '#8af0ff', 2); FX.text(this.x, this.y - 14, '格挡', '#8af0ff'); Sfx.play('stick'); return false;
    }
    if (Stats.dodge && Math.random() < Stats.dodge) { FX.text(this.x, this.y - 14, '闪避', '#8af0ff'); this.inv = .3; return false; }
    dmg = Math.max(1, Math.round(dmg * Diff.edmg() * (1 - Stats.armor)));
    this.hp -= dmg; this.inv = (silentEdge ? .3 : 1.1) + (silentEdge ? 0 : Stats.invBonus);
    if (Stats.thorns && !silentEdge) {
      FX.ring(this.x, this.y, 4, 55, .3, '#ff8a3a', 2); splash(this.x, this.y, 55, Stats.thorns, null);
      for (let j = EB.list.length - 1; j >= 0; j--) if (d2(this.x, this.y, EB.list[j].x, EB.list[j].y) < 55 * 55) EB.list.splice(j, 1);
    }
    addShake(silentEdge ? 3 : 7); screenFlash(.35, '#ff2030'); if (!silentEdge) hitStop(.06);
    Sfx.play('hurt'); FX.spark(this.x, this.y, 12, '#ff3040', 150, .35);
    FX.text(this.x, this.y - 14, '-' + dmg, '#ff4050', 1);
    G.combo = 0;
    if (this.hp <= 0 && Stats.revive && !G.revived) {
      G.revived = true; this.hp = Math.round(this.maxHp * Stats.revive); this.inv = 2.5; EB.clear(false);
      FX.ring(this.x, this.y, 4, 120, .6, '#ffd23a', 3); screenFlash(.8, '#ffd23a'); slowMo(.3, 1); UI.banner('涅槃重生！', '长生玉佩之力', 1.6); Sfx.play('levelup');
    }
    if (this.hp <= 0) { this.hp = 0; this.die('力竭阵亡', '青鸢力竭，坠入了墨海'); }
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
};
function lerpAng(a, b, t) { let d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI; return a + d * t; }

// ============ 玩家弹药 ============
const Shots = {
  list: [],
  reset() { this.list = []; },
  fire(x, y, a, dmg, o) {
    o = o || {};
    const sp = (o.speed || 380) * Stats.shotSpd;
    this.list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, pierce: (o.pierce || 0) + Stats.pierceBonus, hit: [], life: o.life || .9, kind: o.kind || 'web', homing: o.homing || 0, r: o.r || 3, col: o.col || '#8af0ff' });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i]; s.life -= dt;
      if (s.homing) {
        const t = findTarget(s.x, s.y, 220);
        if (t) { const a = angTo(s.x, s.y, t.x, t.y), sp = Math.hypot(s.vx, s.vy); const ca = Math.atan2(s.vy, s.vx); const na = lerpAng(ca, a, Math.min(1, s.homing * dt)); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
      }
      s.x += s.vx * dt + G.arDX; s.y += s.vy * dt + G.arDY;
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
        if (s.cancel === undefined) s.cancel = 2 + s.pierce + Stats.cancelBonus;
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
};
