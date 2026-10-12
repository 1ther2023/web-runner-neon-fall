'use strict';
// ============ 特效美术：弹幕 / 玩家弹 / 钩索 / 粒子 / 掉落物 / 召唤物 / 激光 ============
// 读图规则：敌弹 = 白芯 + 彩色环 + 墨线（亮），玩家弹 = 钩白色小十字（不抢敌弹）。
// 背景之上最亮的只有：主角白描边、敌弹白芯。

function bulletSpr(col, r) {
  return spr('b' + col + r, r * 2 + 4, r * 2 + 4, c => {
    c.beginPath(); circ(c, 0, 0, r + .5); c.fillStyle = INK; c.fill();
    c.beginPath(); circ(c, 0, 0, r - .1); c.fillStyle = col; c.fill();
    c.beginPath(); circ(c, 0, 0, Math.max(.8, r * .55)); c.fillStyle = '#ffffff'; c.fill();
  });
}
function drawBullets(c, t) {
  const L = EB.list;
  // 生成中（预警）
  for (const b of L) if (b.delay > 0) { c.globalAlpha = .6; c.beginPath(); circ(c, b.x, b.y, b.r + b.delay * 20); c.strokeStyle = b.col; c.lineWidth = .7; c.stroke(); c.globalAlpha = 1; }
  for (const b of L) {
    if (b.delay > 0) continue;
    const s = bulletSpr(b.col, b.r);
    if (b.r >= 4 || b.hom > 0) { const sp = Math.hypot(b.vx, b.vy) || 1; line(c, b.x, b.y, b.x - b.vx / sp * b.r * 2.2, b.y - b.vy / sp * b.r * 2.2, rgba(b.col, .5), b.r * 1.1); }
    c.drawImage(s.cv, b.x - s.w / 2, b.y - s.h / 2, s.w, s.h);
  }
}
function drawShots(c) {
  for (const s of Shots.list) {
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    if (s.kind === 'web') {
      // 云纹飞镖：旋转的四角镖 + 淡青拖尾
      line(c, s.x, s.y, s.x - ux * 7, s.y - uy * 7, 'rgba(127,216,255,.4)', 1);
      c.save(); c.translate(s.x, s.y); c.rotate(G.time * 30);
      c.beginPath(); star(c, 0, 0, 4, .7, 2.6, 0); c.fillStyle = INK; c.fill();
      c.beginPath(); star(c, 0, 0, 4, .5, 2.1, 0); c.fillStyle = '#f4ecd8'; c.fill();
      c.beginPath(); circ(c, 0, 0, .55); c.fillStyle = s.col; c.fill();
      c.restore();
    } else {
      line(c, s.x, s.y, s.x - ux * 5, s.y - uy * 5, rgba(s.col, .55), 1.1);
      c.beginPath(); circ(c, s.x, s.y, 1.5); c.fillStyle = s.col; c.fill(); c.strokeStyle = INK; c.lineWidth = .5; c.stroke();
    }
  }
}
// 钩索：玉质飞钩 + 朱红流苏
function webSplat(c, x, y, s, a) {
  c.save(); c.translate(x, y); c.rotate(a || 0); c.scale(s, s);
  c.lineCap = 'round';
  for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(2.2, k * 1.6, 2.6, k * 2.6 - (k ? 0 : .1)); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke(); c.strokeStyle = '#7fd8b0'; c.lineWidth = .7; c.stroke(); }
  c.beginPath(); circ(c, 0, 0, 1.1); c.fillStyle = '#7fd8b0'; c.fill(); c.strokeStyle = INK; c.lineWidth = .5; c.stroke();
  c.beginPath(); c.moveTo(-.6, .4); c.quadraticCurveTo(-1.6, 1.8 + Math.sin(G.time * 6) * .4, -1.2, 3); c.strokeStyle = '#e8452c'; c.lineWidth = .6; c.stroke();
  c.restore();
}
function ropeLine(c, x0, y0, x1, y1, sag, a) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  c.globalAlpha = a === undefined ? 1 : a; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1);
  c.strokeStyle = INK; c.lineWidth = 1.7; c.stroke(); c.strokeStyle = '#f4ecd8'; c.lineWidth = .8; c.stroke();
  c.globalAlpha = 1;
}
function drawRopes(c) {
  const P = Player;
  for (const s of FX.strands) {
    const ex = s.ax + Math.sin(s.a) * s.len, ey = s.ay + Math.cos(s.a) * s.len;
    ropeLine(c, s.ax, s.ay, ex, ey, 2, clamp(s.life, 0, 1) * .8); webSplat(c, s.ax, s.ay, .7, s.a + Math.PI / 2);
  }
  if (!P.alive || G.state === 'title') return;
  P.hands.forEach((h, i) => {
    const r = h.rope; if (!r) return;
    const [hx, hy] = heroHandWorld(P, i, G.time); let ex = r.ax, ey = r.ay;
    if (r.state === 'fly') { ex = lerp(hx, r.ax, r.t); ey = lerp(hy, r.ay, r.t); }
    const d = Math.hypot(ex - hx, ey - hy), taut = r.state === 'stuck' && Math.hypot(P.x - r.ax, P.y - r.ay) >= r.len - 2;
    ropeLine(c, hx, hy, ex, ey, taut ? 0 : Math.min(6, d * .05));
    webSplat(c, ex, ey, r.state === 'stuck' ? 1 : .8, Math.atan2(ey - hy, ex - hx));
  });
}

// 粒子：碎块带墨边、烟雾为墨色团块、闪光为金色“爆点”
function drawParticlesBack(c) {
  for (const p of FX.parts) if (p.type === 'smoke') {
    const k = p.life / p.max, s = p.size * (1.7 - k) * .55;
    c.globalAlpha = k * .75; c.beginPath(); circ(c, p.x, p.y, s); c.fillStyle = '#1b1633'; c.fill(); c.globalAlpha = 1;
  }
}
function drawParticles(c) {
  for (const p of FX.parts) {
    const k = p.life / p.max;
    if (p.type === 'smoke') continue;
    if (p.type === 'flash') {
      const s = p.size * (1.1 - k * .5);
      c.save(); c.translate(p.x, p.y); c.rotate(p.x * .1);
      c.globalAlpha = Math.min(1, k * 1.6);
      c.beginPath(); star(c, 0, 0, 7, s * .45, s, 0); c.fillStyle = INK; c.fill();
      c.beginPath(); star(c, 0, 0, 7, s * .36, s * .86, 0); c.fillStyle = '#f2b544'; c.fill();
      c.beginPath(); star(c, 0, 0, 7, s * .22, s * .5, .2); c.fillStyle = '#ffffff'; c.fill();
      c.restore(); c.globalAlpha = 1; continue;
    }
    if (p.type === 'line') { line(c, p.x, p.y, p.x - p.vx * .03, p.y - p.vy * .03, p.col, Math.max(.5, p.size * .7 * (k + .3))); continue; }
    const s = Math.max(.6, p.size * (k > .5 ? 1 : k * 2) * .8);
    c.save(); c.translate(p.x, p.y); c.rotate(p.life * 9);
    c.fillStyle = p.col; c.fillRect(-s / 2, -s / 2, s, s);
    if (s > 1.3) { c.strokeStyle = INK; c.lineWidth = .4; c.strokeRect(-s / 2, -s / 2, s, s); }
    c.restore();
  }
  for (const r of FX.rings) {
    const k = 1 - r.life / r.max, rad = lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 3));
    c.globalAlpha = 1 - k; c.beginPath(); circ(c, r.x, r.y, rad);
    c.strokeStyle = INK; c.lineWidth = r.th * 1.1 + 1; c.stroke(); c.strokeStyle = r.col; c.lineWidth = r.th * 1.1; c.stroke();
    c.globalAlpha = 1;
  }
  for (const b of FX.bolts) {
    c.beginPath(); c.moveTo(b.pts[0][0], b.pts[0][1]); for (let i = 1; i < b.pts.length; i++) c.lineTo(b.pts[i][0], b.pts[i][1]);
    c.lineJoin = 'miter'; c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = b.col; c.lineWidth = 1.4; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = .5; c.stroke();
  }
}

function drawPickups(c, t) {
  for (const p of Pickups.list) {
    const x = p.x, y = p.y;
    if (p.type === 'coin') {
      const w = Math.abs(Math.cos(t * 6 + p.ph));
      flat(c, q => ell(q, x, y, .6 + 2 * w, 2.6), '#f2b544', .7);
      if (w > .4) { c.fillStyle = INK; c.fillRect(x - .7 * w, y - .7, 1.4 * w, 1.4); }
    } else if (p.type === 'energy') {
      c.save(); c.translate(x, y); c.rotate(t * 3 + p.ph);
      flat(c, q => circ(q, 0, 0, 2.3), '#7fd8ff', .7);
      flat(c, q => ell(q, -.7, -.7, .8, .5, -.6), '#ffffff', 0);
      detail(() => { c.beginPath(); curlLine(c, .3, .4, 1.1, 1); c.strokeStyle = '#2a6f97'; c.lineWidth = .35; c.stroke(); });
      c.restore();
    } else if (p.type === 'heart') {
      const s = 1 + Math.sin(t * 8) * .08;
      c.save(); c.translate(x, y); c.scale(s, s);
      cel(c, q => { q.moveTo(0, 3); q.bezierCurveTo(-5, -.5, -2.6, -4.6, 0, -1.8); q.bezierCurveTo(2.6, -4.6, 5, -.5, 0, 3); q.closePath(); }, '#ff3a5a', '#a01a30', { lw: .8, hi: [-1.6, -1.8, .9, .6, -.5, .6] });
      c.restore();
    } else if (p.type === 'chest') {
      const bob = Math.sin(t * 4) * 1.2;
      c.save(); c.translate(x, y + bob);
      c.globalAlpha = .6 + Math.sin(t * 6) * .3; c.beginPath(); star(c, 0, 0, 8, 7, 12, t); c.fillStyle = 'rgba(255,207,74,.35)'; c.fill(); c.globalAlpha = 1;
      cel(c, q => rrect(q, -6, -3, 12, 7.5, 1.2), '#8a4a1a', '#52280c', { lw: .9 });
      cel(c, q => { q.moveTo(-6, -2.5); q.quadraticCurveTo(0, -8, 6, -2.5); q.closePath(); }, '#a85a22', '#6a3410', { lw: .9 });
      flat(c, q => q.rect(-6.2, -3.2, 12.4, 1.4), '#ffcf4a', .5);
      flat(c, q => rrect(q, -1.3, -2.4, 2.6, 3.4, .5), '#ffcf4a', .5);
      c.restore();
    }
  }
}

function drawBombs(c, t) {
  for (const b of Bombs.list) {
    c.save(); c.translate(b.x, b.y); c.rotate(t * 10);
    cel(c, q => ell(q, 0, 0, 2.6, 3.4), '#eef2ff', '#9aa4c0', { lw: .8 });
    if (!ART.stk) { c.strokeStyle = 'rgba(11,6,18,.5)'; c.lineWidth = .35; c.beginPath(); for (const y of [-1.6, 0, 1.6]) { c.moveTo(-2.4, y); c.quadraticCurveTo(0, y + 1, 2.4, y); } c.stroke(); }
    flat(c, q => circ(q, 0, -1.4, .9), '#ff4a5a', .4);
    c.restore();
  }
}
// 激光：预警为虚线，发射为“墨边 + 彩色 + 白芯”的实体光柱
function beamDraw(c, x0, y0, a, len, w, col) {
  const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
  c.lineCap = 'butt';
  line(c, x0, y0, x1, y1, INK, w + 2.2); line(c, x0, y0, x1, y1, col, w); line(c, x0, y0, x1, y1, '#ffffff', Math.max(.6, w * .38));
  flat(c, q => circ(q, x0, y0, w * .75 + 1), col, 1);
  flat(c, q => circ(q, x0, y0, w * .4 + .5), '#ffffff', 0);
}
function drawLasers(c, t) {
  for (const L of Lasers.list) {
    if (L.t < L.warn) {
      const k = L.t / L.warn;
      c.globalAlpha = .35 + k * .55; c.setLineDash([4, 3]); c.lineDashOffset = -t * 30;
      line(c, L.x, L.y, L.x + Math.cos(L.ang) * L.len, L.y + Math.sin(L.ang) * L.len, L.col, .6 + k * 1.2);
      c.setLineDash([]); c.globalAlpha = 1;
    } else {
      const k = 1 - (L.t - L.warn) / L.on, w = L.w * (k < .2 ? k * 5 : 1) * (1 + Math.sin(t * 60) * .08);
      beamDraw(c, L.x, L.y, L.ang, L.len, w, L.col);
    }
  }
  for (const B of PBeams) beamDraw(c, B.x, B.y, B.a, 600, B.w * (B.life / .3), '#f2b544');
}

function drawSummons(c, t) {
  const P = Player; if (!P.alive || G.state === 'title') return;
  for (const o of Skills.owned) {
    const S = SKMAP[o.id];
    if (o.id === 'orbit') {
      // 绕身飞剑：剑尖沿切线方向
      const st = S.st(o.lv);
      for (let i = 0; i < st.n; i++) {
        const [x, y] = S.pos(i, st.n, st.r), a = G.time * 4.2 + i * TAU / st.n + Math.PI / 2;
        c.save(); c.translate(x, y); c.rotate(a);
        cel(c, q => { q.moveTo(-4.5, 0); q.lineTo(3, -.9); q.lineTo(5.5, 0); q.lineTo(3, .9); q.closePath(); }, '#e4f0f8', '#8aa0b8', { lw: .55 });
        flat(c, q => q.rect(-4.7, -1.6, .9, 3.2), '#f2b544', .4);
        limb(c, [-4.6, 0, -6.4, 0], .7, '#1b1633', .3);
        flat(c, q => { q.moveTo(-6.4, 0); q.quadraticCurveTo(-8, 1 + Math.sin(t * 8 + i) * .6, -9, .4); q.lineTo(-6.4, .3); q.closePath(); }, '#e8452c', 0);
        c.restore();
      }
    } else if (o.id === 'bot') {
      // 机关木鸢
      const st = S.st(o.lv);
      for (let i = 0; i < st.n; i++) {
        const [x, y] = S.pos(i, st.n), fl = Math.sin(t * 16 + i) * .6;
        c.save(); c.translate(x, y);
        for (const s of [-1, 1]) flat(c, q => { q.moveTo(0, -.2); q.quadraticCurveTo(s * 2.4, -2 - fl, s * 4.6, -1.2 - fl * 1.4); q.lineTo(s * 3.6, .2); q.closePath(); }, s > 0 ? '#c9a25a' : '#8a6a3a', .45);
        cel(c, q => ell(q, 0, 0, 2.2, 1.3), '#a0643a', '#5e3418', { lw: .55 });
        flat(c, q => poly(q, [-2.2, -.2, -3.6, .1, -2.2, .5]), '#f2b544', .3);
        flat(c, q => circ(q, -1.2, -.3, .4), '#e8452c', 0);
        c.restore();
      }
    } else if (o.id === 'claw') {
      // 铁扇横扫：四片扇骨展开成扇面
      const st = S.st(o.lv), s = o.s, k = (s.a || 0) / .25;
      for (let i = 0; i < 4; i++) {
        const base = -Math.PI / 2 + (i - 1.5) * .5, a = s.a > 0 ? base + (1 - k) * TAU * (i % 2 ? 1 : -1) : base + Math.sin(t * 3 + i) * .2;
        const len = s.a > 0 ? st.r : 11, x0 = P.x, y0 = P.y - 4, ex = x0 + Math.cos(a) * len, ey = y0 + Math.sin(a) * len;
        c.save(); c.translate(x0, y0); c.rotate(a);
        cel(c, q => { q.moveTo(0, 0); q.lineTo(len, -len * .16); q.quadraticCurveTo(len * 1.05, 0, len, len * .16); q.closePath(); }, i % 2 ? '#e8452c' : '#f4ecd8', i % 2 ? '#9a2418' : '#c9bc9a', { lw: .6 });
        limb(c, [0, 0, len, 0], .4, '#1b1633', 0);
        c.restore();
        if (s.a <= 0) flat(c, q => circ(q, ex, ey, .6), '#f2b544', .3);
      }
      if (s.a > 0) { c.globalAlpha = k; c.beginPath(); circ(c, P.x, P.y, st.r * (1.2 - k * .2)); c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = '#f2b544'; c.lineWidth = 1.4; c.stroke(); c.globalAlpha = 1; }
    }
  }
}

// 拟声飘字（击杀大敌 / BOSS 用）
const POPS = [];
function popWord(x, y, s, col, size) { POPS.push({ x, y, s, col, size: size || 12, life: .7, max: .7, rot: rand(-.25, .25) }); if (POPS.length > 12) POPS.shift(); }
function updatePops(dt) { for (let i = POPS.length - 1; i >= 0; i--) { const p = POPS[i]; p.life -= dt; p.x += G.arDX; p.y += G.arDY - 10 * dt; if (p.life <= 0) POPS.splice(i, 1); } }
function drawPops(c) {
  for (const p of POPS) {
    const k = p.life / p.max, sc = k > .8 ? 1 + (k - .8) * 3 : 1;
    c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(sc, sc); c.globalAlpha = Math.min(1, k * 3);
    comic(c, p.s, 0, 0, p.size, p.col, 'center'); c.restore(); c.globalAlpha = 1;
  }
}
function drawFloatTexts(c) {
  for (const t of FX.texts) {
    const k = t.life / t.max, pop = k > .8 ? 1 + (k - .8) * 2.5 : 1;
    c.globalAlpha = k < .25 ? k * 4 : 1;
    const big = t.sc >= 2, size = (big ? 8.5 : 6) * pop;
    comic(c, t.s, t.x, t.y, size, t.col, 'center', { thin: !big, noDrop: !big });
    c.globalAlpha = 1;
  }
}
