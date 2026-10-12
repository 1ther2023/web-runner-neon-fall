'use strict';
// ============ v0.5 霓虹特效层：子弹 / 钩索 / 粒子 / 掉落 / 召唤物 / 激光 / 大招 ============
// 统一语言：深色底 + 霓虹发光（lighter 叠加）+ 白色高光芯。没有墨线描边。
const GLOW = (c, col, b) => { c.shadowColor = col; c.shadowBlur = b * ART.k; };
const NOGLOW = c => { c.shadowBlur = 0; };

// ---------- 敌弹：外发光 + 彩色核 + 白芯（缓存成位图） ----------
function bulletSpr(col, r) {
  return spr('nb' + col + r, r * 2 + 10, r * 2 + 10, c => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r + 4.5);
    g.addColorStop(0, rgba(col, .9)); g.addColorStop(.45, rgba(col, .45)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); circ(c, 0, 0, r + 4.5); c.fill();
    c.beginPath(); circ(c, 0, 0, r); c.fillStyle = col; c.fill();
    c.beginPath(); circ(c, 0, 0, Math.max(.8, r * .55)); c.fillStyle = '#ffffff'; c.fill();
  });
}
function drawBullets(c, t) {
  const L = EB.list;
  for (const b of L) if (b.delay > 0) { c.globalAlpha = .7; c.beginPath(); circ(c, b.x, b.y, b.r + b.delay * 20); c.strokeStyle = b.col; c.lineWidth = .6; c.stroke(); c.globalAlpha = 1; }
  c.globalCompositeOperation = 'lighter';
  for (const b of L) {
    if (b.delay > 0) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    if (sp > 40) line(c, b.x, b.y, b.x - b.vx / sp * b.r * 3, b.y - b.vy / sp * b.r * 3, rgba(b.col, .35), b.r * 1.2);
  }
  c.globalCompositeOperation = 'source-over';
  for (const b of L) {
    if (b.delay > 0) continue;
    const s = bulletSpr(b.col, b.r), pul = 1 + Math.sin(t * 14 + b.x * .1) * .08;
    c.drawImage(s.cv, b.x - s.w / 2 * pul, b.y - s.h / 2 * pul, s.w * pul, s.h * pul);
  }
}
// ---------- 玩家弹：钩刃镖（旋转三刃）/ 微型追踪弹 ----------
function drawShots(c) {
  c.globalCompositeOperation = 'lighter';
  for (const s of Shots.list) {
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    line(c, s.x, s.y, s.x - ux * 9, s.y - uy * 9, rgba(s.kind === 'web' ? '#3fe0ff' : s.col, .45), 1.4);
  }
  c.globalCompositeOperation = 'source-over';
  for (const s of Shots.list) {
    if (s.kind === 'web') {
      c.save(); c.translate(s.x, s.y); c.rotate(G.time * 28);
      GLOW(c, '#3fe0ff', 4);
      c.fillStyle = '#d8f6ff';
      for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.moveTo(0, -.6); c.quadraticCurveTo(2.4, -1.4, 3.2, .4); c.quadraticCurveTo(1.6, -.2, 0, .6); c.closePath(); c.fill(); }
      NOGLOW(c); c.beginPath(); circ(c, 0, 0, .8); c.fillStyle = '#ffb347'; c.fill();
      c.restore();
    } else {
      c.save(); GLOW(c, s.col, 4); c.beginPath(); circ(c, s.x, s.y, 1.3); c.fillStyle = '#fff'; c.fill(); c.beginPath(); circ(c, s.x, s.y, 2); c.strokeStyle = s.col; c.lineWidth = .6; c.stroke(); c.restore();
    }
  }
}
// ---------- 钩索：发光能量缆 + 金属三爪钩 ----------
function webSplat(c, x, y, s, a) {
  c.save(); c.translate(x, y); c.rotate(a || 0); c.scale(s, s);
  GLOW(c, '#ffb347', 4); c.lineCap = 'round';
  for (const k of [-1, 1]) { c.beginPath(); c.moveTo(-.5, 0); c.quadraticCurveTo(1.6, k * 2.6, 3, k * 1.4); c.strokeStyle = '#c9d4e8'; c.lineWidth = .8; c.stroke(); }
  c.beginPath(); c.moveTo(-.5, 0); c.lineTo(3.2, 0); c.stroke();
  NOGLOW(c); c.beginPath(); circ(c, 0, 0, 1.1); c.fillStyle = '#ffb347'; c.fill();
  c.restore();
}
function ropeLine(c, x0, y0, x1, y1, sag, a) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  c.save(); c.globalAlpha = a === undefined ? 1 : a; c.lineCap = 'round';
  c.globalCompositeOperation = 'lighter';
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.strokeStyle = 'rgba(63,224,255,.35)'; c.lineWidth = 2.6; c.stroke();
  c.globalCompositeOperation = 'source-over';
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.strokeStyle = '#e8fbff'; c.lineWidth = .7; c.stroke();
  // 沿缆流动的光点
  const k = (G.time * 2.2) % 1, px = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1, py = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1;
  GLOW(c, '#3fe0ff', 4); c.beginPath(); circ(c, px, py, .9); c.fillStyle = '#fff'; c.fill();
  c.restore();
}
function drawRopes(c) {
  const P = Player;
  for (const s of FX.strands) {
    const ex = s.ax + Math.sin(s.a) * s.len, ey = s.ay + Math.cos(s.a) * s.len;
    ropeLine(c, s.ax, s.ay, ex, ey, 2, clamp(s.life, 0, 1) * .6); webSplat(c, s.ax, s.ay, .7, s.a + Math.PI / 2);
  }
  if (!P.alive || G.state === 'title') return;
  P.hands.forEach((h, i) => {
    const r = h.rope; if (!r) return;
    const [hx, hy] = heroHandWorld(P, i, G.time); let ex = r.ax, ey = r.ay;
    if (r.state === 'fly') { ex = lerp(hx, r.ax, r.t); ey = lerp(hy, r.ay, r.t); }
    const d = Math.hypot(ex - hx, ey - hy), taut = r.state === 'stuck' && Math.hypot(P.x - r.ax, P.y - r.ay) >= r.len - 2;
    ropeLine(c, hx, hy, ex, ey, taut ? 0 : Math.min(6, d * .05));
    webSplat(c, ex, ey, r.state === 'stuck' ? 1 : .8, Math.atan2(ey - hy, ex - hx));
    // 枪口火光
    if (r.state === 'fly' && r.t < .35) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(hx, hy, 0, hx, hy, 6); g.addColorStop(0, 'rgba(255,200,120,.9)'); g.addColorStop(1, 'rgba(255,140,40,0)'); c.fillStyle = g; c.beginPath(); circ(c, hx, hy, 6); c.fill(); c.restore(); }
  });
}

// ---------- 粒子：发光火花 / 烟 / 闪光 ----------
function drawParticlesBack(c) {
  for (const p of FX.parts) if (p.type === 'smoke') {
    const k = p.life / p.max, s = p.size * (1.7 - k) * .6;
    c.globalAlpha = k * .5; c.beginPath(); circ(c, p.x, p.y, s); c.fillStyle = '#1a1230'; c.fill(); c.globalAlpha = 1;
  }
}
function drawParticles(c) {
  c.globalCompositeOperation = 'lighter';
  for (const p of FX.parts) {
    const k = p.life / p.max;
    if (p.type === 'smoke') continue;
    if (p.type === 'flash') {
      const s = p.size * (1.2 - k * .5), g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
      g.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, k * 1.6).toFixed(2) + ')'); g.addColorStop(.35, 'rgba(255,190,120,' + (k * .8).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,60,160,0)');
      c.fillStyle = g; c.beginPath(); circ(c, p.x, p.y, s); c.fill(); continue;
    }
    if (p.type === 'line') { line(c, p.x, p.y, p.x - p.vx * .035, p.y - p.vy * .035, p.col, Math.max(.5, p.size * .8 * (k + .3))); continue; }
    const s = Math.max(.6, p.size * (k > .5 ? 1 : k * 2) * .8);
    c.globalAlpha = Math.min(1, k * 2);
    c.fillStyle = p.col; c.beginPath(); circ(c, p.x, p.y, s * .7); c.fill();
    c.globalAlpha = 1;
  }
  for (const r of FX.rings) {
    const k = 1 - r.life / r.max, rad = lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 3));
    c.globalAlpha = (1 - k) * .9; c.beginPath(); circ(c, r.x, r.y, rad);
    c.strokeStyle = r.col; c.lineWidth = r.th * 2.4; c.globalAlpha = (1 - k) * .3; c.stroke();
    c.globalAlpha = 1 - k; c.lineWidth = r.th * .9; c.stroke();
    c.globalAlpha = 1;
  }
  for (const b of FX.bolts) {
    c.beginPath(); c.moveTo(b.pts[0][0], b.pts[0][1]); for (let i = 1; i < b.pts.length; i++) c.lineTo(b.pts[i][0], b.pts[i][1]);
    c.lineJoin = 'round'; c.strokeStyle = rgba(b.col, .4); c.lineWidth = 3; c.stroke(); c.strokeStyle = b.col; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = .45; c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  drawShards(c);
}

// ---------- 死亡碎裂：敌人贴图切成碎片飞散 ----------
const SHARDS = []; let _shT = 0;
function shatter(n, x, y, size, flip, col) {
  const im = SPR[n]; if (!sprOk(im)) return;
  const iw = im.naturalWidth, ih = im.naturalHeight, s = size / Math.max(iw, ih), N = size > 60 ? 6 : 4;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const ox = (i + .5) / N - .5, oy = (j + .5) / N - .5, a = Math.atan2(oy, ox) + rand(-.5, .5), sp = rand(40, 120) * (size > 60 ? 1.3 : 1);
    SHARDS.push({ n, im, sx: i * iw / N, sy: j * ih / N, sw: iw / N, sh: ih / N, w: iw / N * s, h: ih / N * s, x: x + ox * iw * s * (flip ? -1 : 1), y: y + oy * ih * s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, r: 0, vr: rand(-8, 8), life: rand(.5, .9), max: .9, flip, col });
  }
  if (SHARDS.length > 500) SHARDS.splice(0, SHARDS.length - 500);
}
function drawShards(c) {
  const now = G.time, dt = Math.min(.05, Math.max(0, now - _shT)); _shT = now;
  for (let i = SHARDS.length - 1; i >= 0; i--) {
    const s = SHARDS[i]; s.life -= dt; if (s.life <= 0) { SHARDS.splice(i, 1); continue; }
    s.vy += 260 * dt; s.x += s.vx * dt + G.arDX; s.y += s.vy * dt + G.arDY; s.r += s.vr * dt;
    const k = s.life / s.max;
    c.save(); c.translate(s.x, s.y); c.rotate(s.r); if (s.flip) c.scale(-1, 1); c.globalAlpha = Math.min(1, k * 1.5);
    c.drawImage(s.im, s.sx, s.sy, s.sw, s.sh, -s.w / 2, -s.h / 2, s.w, s.h);
    if (k > .6) { const wc = whiteOf(s.n); if (wc) { c.globalAlpha = (k - .6) * 2; c.drawImage(wc, s.sx, s.sy, s.sw, s.sh, -s.w / 2, -s.h / 2, s.w, s.h); } }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * .8; c.fillStyle = s.col || '#ff3fa4'; c.beginPath(); circ(c, s.w * .4, s.h * .4, .8); c.fill();
    c.restore();
  }
}

// ---------- 掉落：数据芯片金币 / 能量球 / 医疗包 / 补给箱 ----------
function drawPickups(c, t) {
  for (const p of Pickups.list) {
    const x = p.x, y = p.y;
    if (p.type === 'coin') {
      const w = Math.abs(Math.cos(t * 6 + p.ph));
      c.save(); c.translate(x, y); c.scale(.4 + w * .6, 1); GLOW(c, '#ffb347', 4);
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; i ? c.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6) : c.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); } c.closePath();
      c.fillStyle = '#ffc261'; c.fill(); NOGLOW(c); c.fillStyle = '#8a4a10'; c.fillRect(-.9, -.9, 1.8, 1.8);
      c.restore();
    } else if (p.type === 'energy') {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, 0, x, y, 4.5); g.addColorStop(0, 'rgba(220,250,255,1)'); g.addColorStop(.35, 'rgba(63,224,255,.8)'); g.addColorStop(1, 'rgba(63,224,255,0)');
      c.fillStyle = g; c.beginPath(); circ(c, x, y, 4.5); c.fill(); c.restore();
    } else if (p.type === 'heart') {
      const s = 1 + Math.sin(t * 8) * .08;
      c.save(); c.translate(x, y); c.scale(s, s); GLOW(c, '#ff3f6a', 6);
      c.fillStyle = '#eef2ff'; rrPath(c, -3.4, -3.4, 6.8, 6.8, 1.4); c.fill(); NOGLOW(c);
      c.fillStyle = '#ff3f6a'; c.fillRect(-.9, -2.4, 1.8, 4.8); c.fillRect(-2.4, -.9, 4.8, 1.8);
      c.restore();
    } else if (p.type === 'chest') {
      const bob = Math.sin(t * 4) * 1.2;
      c.save(); c.translate(x, y + bob);
      c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 0, 0, 0, 14); g.addColorStop(0, 'rgba(255,190,90,.5)'); g.addColorStop(1, 'rgba(255,190,90,0)'); c.fillStyle = g; c.beginPath(); circ(c, 0, 0, 14); c.fill(); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#23224a'; rrPath(c, -6, -4, 12, 8, 1.2); c.fill();
      GLOW(c, '#ffb347', 5); c.strokeStyle = '#ffc261'; c.lineWidth = .7; rrPath(c, -6, -4, 12, 8, 1.2); c.stroke();
      c.fillStyle = '#3fe0ff'; c.fillRect(-4.5, -.5, 9, 1); NOGLOW(c);
      c.restore();
    }
  }
}
function rrPath(c, x, y, w, h, r) { c.beginPath(); rrect(c, x, y, w, h, r); }
function drawBombs(c, t) {
  for (const b of Bombs.list) {
    c.save(); c.translate(b.x, b.y); c.rotate(t * 10);
    c.fillStyle = '#2a2850'; c.beginPath(); circ(c, 0, 0, 3); c.fill();
    GLOW(c, '#ff7a3a', 6); c.strokeStyle = '#ffb347'; c.lineWidth = .8; c.beginPath(); circ(c, 0, 0, 2.2); c.stroke();
    c.fillStyle = (t * 10 | 0) % 2 ? '#fff' : '#ff3f6a'; c.beginPath(); circ(c, 0, 0, .9); c.fill();
    c.restore();
  }
}
// ---------- 激光：预警细线 → 发光光柱 ----------
function beamDraw(c, x0, y0, a, len, w, col) {
  const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
  c.save(); c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
  line(c, x0, y0, x1, y1, rgba(col, .25), w * 2.6); line(c, x0, y0, x1, y1, rgba(col, .8), w); line(c, x0, y0, x1, y1, '#ffffff', Math.max(.6, w * .35));
  const g = c.createRadialGradient(x0, y0, 0, x0, y0, w * 2 + 3); g.addColorStop(0, '#fff'); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); circ(c, x0, y0, w * 2 + 3); c.fill();
  c.restore();
}
function drawLasers(c, t) {
  for (const L of Lasers.list) {
    if (L.t < L.warn) {
      const k = L.t / L.warn;
      c.globalAlpha = .3 + k * .6; c.setLineDash([4, 3]); c.lineDashOffset = -t * 30;
      line(c, L.x, L.y, L.x + Math.cos(L.ang) * L.len, L.y + Math.sin(L.ang) * L.len, L.col, .5 + k * 1.2);
      c.setLineDash([]); c.globalAlpha = 1;
    } else {
      const k = 1 - (L.t - L.warn) / L.on, w = L.w * (k < .2 ? k * 5 : 1) * (1 + Math.sin(t * 60) * .08);
      beamDraw(c, L.x, L.y, L.ang, L.len, w, L.col);
    }
  }
  for (const B of PBeams) beamDraw(c, B.x, B.y, B.a, 600, B.w * (B.life / .3), '#3fe0ff');
}

// ---------- 召唤物：环身光刃 / 浮游炮台 / 电弧扇刃 ----------
function drawSummons(c, t) {
  const P = Player; if (!P.alive || G.state === 'title') return;
  for (const o of Skills.owned) {
    const S = SKMAP[o.id];
    if (o.id === 'orbit') {
      const st = S.st(o.lv);
      c.save(); c.globalCompositeOperation = 'lighter';
      c.beginPath(); circ(c, P.x, P.y, st.r); c.strokeStyle = 'rgba(63,224,255,.12)'; c.lineWidth = 1; c.stroke();
      for (let i = 0; i < st.n; i++) {
        const [x, y] = S.pos(i, st.n, st.r), a = G.time * 4.2 + i * TAU / st.n + Math.PI / 2;
        for (let k = 1; k <= 4; k++) { const ta = G.time * 4.2 + i * TAU / st.n - k * .13; c.globalAlpha = .3 / k; c.beginPath(); circ(c, P.x + Math.cos(ta) * st.r, P.y + Math.sin(ta) * st.r, 2.2); c.fillStyle = '#3fe0ff'; c.fill(); }
        c.globalAlpha = 1;
        c.save(); c.translate(x, y); c.rotate(a);
        c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(0, -2.2, 5.5, 0); c.quadraticCurveTo(0, 2.2, -5, 0); c.closePath();
        c.fillStyle = 'rgba(63,224,255,.7)'; c.fill();
        c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(4.5, 0); c.strokeStyle = '#fff'; c.lineWidth = .6; c.stroke();
        c.restore();
      }
      c.restore();
    } else if (o.id === 'bot') {
      const st = S.st(o.lv);
      for (let i = 0; i < st.n; i++) {
        const [x, y] = S.pos(i, st.n), bob = Math.sin(t * 5 + i) * .8;
        c.save(); c.translate(x, y + bob);
        c.fillStyle = '#2c2a54'; c.beginPath(); ell(c, 0, 0, 3.4, 1.8); c.fill();
        c.strokeStyle = '#8a8ec8'; c.lineWidth = .4; c.stroke();
        GLOW(c, '#ffb347', 4); c.fillStyle = '#ffb347'; c.beginPath(); circ(c, -1.4, -.2, .7); c.fill(); NOGLOW(c);
        c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(63,224,255,.6)'; for (const s of [-1, 1]) c.fillRect(s * 2 - .6, 1.6, 1.2, 1.6 + Math.sin(t * 30 + i) * .5);
        c.restore();
      }
    } else if (o.id === 'claw') {
      const st = S.st(o.lv), s = o.s, k = (s.a || 0) / .25;
      c.save(); c.globalCompositeOperation = 'lighter';
      if (s.a > 0) {
        for (let i = 0; i < 3; i++) {
          const a0 = (1 - k) * TAU * 1.2 + i * TAU / 3;
          c.beginPath(); c.arc(P.x, P.y, st.r * (.6 + i * .15), a0, a0 + 1.6);
          c.strokeStyle = rgba(i % 2 ? '#ff3fa4' : '#3fe0ff', .8 * k + .2); c.lineWidth = 2.4 - i * .5; c.stroke();
        }
        c.beginPath(); circ(c, P.x, P.y, st.r * (1.2 - k * .2)); c.strokeStyle = rgba('#3fe0ff', k * .6); c.lineWidth = 1; c.stroke();
      } else {
        for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; c.beginPath(); c.arc(P.x, P.y, 12, a, a + .9); c.strokeStyle = 'rgba(255,63,164,.45)'; c.lineWidth = 1.2; c.stroke(); }
      }
      c.restore();
    }
  }
}
// ---------- 大招框：霓虹扫描线 + 色差边框 ----------
function drawUltFrame(c, t) {
  c.save(); c.globalCompositeOperation = 'lighter';
  const px = Player.x - G.cam.x, py = Player.y - G.cam.y;
  for (let i = 0; i < 3; i++) { const r = ((t * 160 + i * 90) % 270); c.beginPath(); circ(c, px, py, r); c.strokeStyle = 'rgba(255,63,164,' + (.35 * (1 - r / 270)).toFixed(3) + ')'; c.lineWidth = 2; c.stroke(); }
  c.fillStyle = 'rgba(63,224,255,.05)'; for (let y = (t * 60) % 6; y < H; y += 6) c.fillRect(0, y, W, 1);
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,63,164,' + (.5 + Math.sin(t * 20) * .2).toFixed(2) + ')'; c.strokeRect(1, 1, W - 2, H - 2);
  c.strokeStyle = 'rgba(63,224,255,.5)'; c.lineWidth = 1; c.strokeRect(4, 4, W - 8, H - 8);
  c.restore();
}

// ---------- HUD：玻璃面板 + 霓虹描边，文字发光 ----------
function panel(c, x, y, w, h, fill) {
  c.save();
  c.beginPath(); poly(c, [x + 3, y, x + w, y, x + w, y + h - 3, x + w - 3, y + h, x, y + h, x, y + 3]);
  c.fillStyle = 'rgba(10,9,26,.72)'; c.fill();
  c.strokeStyle = 'rgba(63,224,255,.45)'; c.lineWidth = .5; c.stroke();
  c.fillStyle = '#ff3fa4'; c.fillRect(x, y + 3, .8, Math.min(10, h - 6));
  c.restore();
}
function gauge(c, x, y, w, h, k, col, bg, flash) {
  k = clamp(k, 0, 1);
  c.save();
  c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = .4; c.strokeRect(x, y, w, h);
  c.shadowColor = col; c.shadowBlur = 5 * ART.k;
  c.fillStyle = flash ? '#ffffff' : col; c.fillRect(x + .6, y + .6, (w - 1.2) * k, h - 1.2);
  c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + .6, y + .6, (w - 1.2) * k, (h - 1.2) * .35);
  c.fillStyle = 'rgba(7,6,15,.5)'; for (let i = 1; i < 10; i++) c.fillRect(x + w * i / 10, y, .4, h);
  c.restore();
}
function comic(c, s, x, y, size, fill, align, o) {
  c.font = size + 'px ' + COMIC; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = size * (o && o.thin ? .12 : .18) + .3; c.strokeStyle = 'rgba(7,6,15,.85)'; c.strokeText(s, x, y);
  if (!(o && o.noDrop)) { c.save(); c.shadowColor = fill; c.shadowBlur = size * .5 * ART.k; c.fillStyle = fill; c.fillText(s, x, y); c.restore(); }
  c.fillStyle = fill; c.fillText(s, x, y);
}
