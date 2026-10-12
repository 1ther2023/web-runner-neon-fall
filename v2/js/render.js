'use strict';
// ============ 渲染管线 + 漫画风 HUD ============
// 全部内容绘制在一张按显示分辨率缩放的 2D 画布上（矢量 → 任意分辨率清晰）。
function fitOverlay() {
  const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(W, Math.round(r.width * d)), h = Math.round(w * H / W);
  if (cv.width !== w) { cv.width = w; cv.height = h; }
  artResize(w / W);
}
window.addEventListener('resize', fitOverlay); fitOverlay();

// 弹幕压力：子弹越多，背景越暗，保证玩家与子弹始终可读
let danger = 0;
function render() {
  const k = cv.width / W, t = G.time, P = Player, play = G.state !== 'title';
  const shx = G.shake > 0 ? rand(-G.shake, G.shake) * .8 : 0, shy = G.shake > 0 ? rand(-G.shake, G.shake) * .8 : 0;
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.imageSmoothingEnabled = true;
  BG.draw(ctx, G.cam.x, t, G.cam.y);

  danger = lerp(danger, clamp((EB.list.length - 40) / 160, 0, 1) + (G.boss ? .25 : 0), .05);
  ctx.setTransform(k, 0, 0, k, (-G.cam.x + shx) * k, (-G.cam.y + shy) * k);
  drawWorld(ctx, G.cam.x, t);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  // 建筑之上压一层暗色：弹幕越密越暗（最多 38%）
  const dim = .06 + danger * .32 + (G.ultT > 0 ? .1 : 0);
  ctx.fillStyle = 'rgba(8,4,16,' + dim.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);

  ctx.setTransform(k, 0, 0, k, (-G.cam.x + shx) * k, (-G.cam.y + shy) * k);
  drawParticlesBack(ctx);
  drawRopes(ctx);
  if (play) {
    drawPickups(ctx, t);
    drawEnemies(ctx, t);
    if (G.boss) drawBoss(ctx, G.boss, t);
    drawSummons(ctx, t);
    drawBombs(ctx, t);
    if (P.alive) drawHeroFocus(ctx, P, t);
    drawShots(ctx);
    drawLasers(ctx, t);
  }
  drawParticles(ctx);
  if (play) { if (P.alive) drawHero(ctx, P, t); drawBullets(ctx, t); if (P.alive) drawHitbox(ctx, P, t); }
  drawPops(ctx);
  drawFloatTexts(ctx);

  // 墨潮与深渊固定在世界坐标：镜头居中后它们会随玩家位置在屏幕上移动
  ctx.setTransform(k, 0, 0, k, shx * k, (G.arenaY - G.cam.y + shy) * k);
  drawAbyss(ctx, G.cam.x, t);
  ctx.fillStyle = '#0c0614'; ctx.fillRect(-4, H - 1, W + 8, 400);
  if (play) {
    const tx = G.tideX - G.cam.x;
    ctx.setTransform(k, 0, 0, k, (tx + shx) * k, shy * k);
    drawTide(ctx, t);
    ctx.fillStyle = '#0c0614'; ctx.fillRect(-400, -4, 400.5, H + 8);
  }
  ctx.setTransform(k, 0, 0, k, 0, 0);

  // 速度线（漫画集中线，只在屏幕边缘）
  const sp = Math.hypot(P.vx, P.vy);
  if (G.state === 'play' && sp > 230) {
    const a = Math.min(.5, (sp - 230) / 260); ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; ctx.lineWidth = .7; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const y = rand(0, H), l = rand(24, 70), x = Math.random() < .5 ? rand(-10, 90) : rand(W - 160, W); ctx.moveTo(x, y); ctx.lineTo(x + l, y); }
    ctx.stroke();
  }
  if (G.ultT > 0) drawUltFrame(ctx, t);
  // 受击/击破闪光：只闪边框，不再整屏刷白
  if (G.flash > 0) {
    const a = Math.min(1, G.flash);
    ctx.lineWidth = 10 * a; ctx.strokeStyle = rgba(G.flashColor[0] === '#' ? G.flashColor : '#ffffff', .55 * a); ctx.strokeRect(0, 0, W, H);
    ctx.fillStyle = rgba(G.flashColor, .1 * a); ctx.fillRect(0, 0, W, H);
  }
  // 暗角
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, W * .64);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,2,10,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (play) { drawOffscreen(ctx, P, t); drawHUD(ctx); drawCursor(ctx); }
}

// 玩家定位：脚下聚光圈 + 判定点。背景再乱也能一眼找到自己。
function drawHeroFocus(c, P, t) {
  const r = 13 + Math.sin(t * 4) * .8;
  c.beginPath(); circ(c, P.x, P.y, r); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill();
  c.setLineDash([2.4, 2.4]); c.lineDashOffset = -t * 8;
  c.strokeStyle = G.ultT > 0 ? 'rgba(242,181,68,.85)' : 'rgba(255,255,255,.4)'; c.lineWidth = .6; c.stroke(); c.setLineDash([]);
}
function drawHitbox(c, P, t) {
  const hurt = P.inv > 0;
  c.beginPath(); circ(c, P.x, P.y, 1.9); c.fillStyle = INK; c.fill();
  c.beginPath(); circ(c, P.x, P.y, 1.1); c.fillStyle = hurt ? '#ff4a5a' : '#ffffff'; c.fill();
}
function drawOffscreen(c, P, t) {
  if (!P.alive) return;
  const sy = P.y - G.cam.y, sx = P.x - G.cam.x;
  if (sy > -4 && sy < H + 4) return;
  const y = sy < 0 ? 10 : H - 12, x = clamp(sx, 12, W - 12), up = sy < 0 ? -1 : 1;
  c.save(); c.translate(x, y + Math.sin(t * 10) * 1.2);
  flat(c, q => poly(q, [0, up * 6, -5, -up * 2, 5, -up * 2]), '#ff3a4a', 1);
  comic(c, Math.round(Math.abs(sy < 0 ? sy : sy - H) / 10) + '丈', 0, -up * 8, 6, '#fff', 'center', { thin: true, noDrop: true });
  c.restore();
}
function drawUltFrame(c, t) {
  // 漫画集中线 + 红色边框，替代原来整屏的强光
  c.save(); c.translate(Player.x - G.cam.x, Player.y - G.cam.y);
  c.fillStyle = 'rgba(242,181,68,.14)'; c.beginPath();
  const n = 28, ph = (t * 5 | 0) * .37;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + ph, w = .035 + (i * 7 % 5) * .01, r0 = 90 + (i * 13 % 7) * 8; c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a - w) * 600, Math.sin(a - w) * 600); c.lineTo(Math.cos(a + w) * 600, Math.sin(a + w) * 600); c.closePath(); }
  c.fill(); c.restore();
  c.lineWidth = 5; c.strokeStyle = 'rgba(242,181,68,' + (.5 + Math.sin(t * 20) * .2).toFixed(2) + ')'; c.strokeRect(0, 0, W, H);
}

// ---------- HUD ----------
function panel(c, x, y, w, h, fill) {
  c.beginPath(); poly(c, [x + 3, y, x + w, y, x + w - 3, y + h, x, y + h]);
  c.fillStyle = INK; c.fill();
  c.beginPath(); poly(c, [x + 3.6, y + .8, x + w - .9, y + .8, x + w - 3.5, y + h - .8, x + .9, y + h - .8]); c.fillStyle = fill || '#1a1024'; c.fill();
}
function gauge(c, x, y, w, h, k, col, bg, flash) {
  k = clamp(k, 0, 1);
  c.beginPath(); poly(c, [x + 2, y, x + w + 2, y, x + w, y + h, x, y + h]); c.fillStyle = INK; c.fill();
  c.save(); c.beginPath(); poly(c, [x + 2.6, y + .7, x + w + 1.2, y + .7, x + w - .6, y + h - .7, x + .7, y + h - .7]); c.clip();
  c.fillStyle = bg; c.fillRect(x, y, w + 2, h);
  c.fillStyle = flash ? '#ffffff' : col; c.fillRect(x, y, (w + 2) * k, h);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, (w + 2) * k, h * .35);
  c.fillStyle = 'rgba(11,6,18,.35)'; for (let i = 1; i < 10; i++) c.fillRect(x + (w + 2) * i / 10, y, .5, h);
  c.restore();
}
function drawHUD(c) {
  const P = Player, t = G.time;
  // ---- 左上：头像 + 生命 / 经验 / 风暴 ----
  panel(c, 4, 4, 146, 36, 'rgba(27,22,51,.88)');
  drawHeroPortrait(c, 19, 22, 11, P, t);
  c.beginPath(); circ(c, 19, 22, 11); c.strokeStyle = G.energy >= 100 ? ((t * 8 | 0) % 2 ? '#ffe04a' : '#ff4a5a') : '#ffffff'; c.lineWidth = 1.2; c.stroke();
  const low = P.hp / P.maxHp < .3;
  gauge(c, 33, 9, 86, 7, P.hp / P.maxHp, low ? '#e8452c' : '#ff6a4a', '#3a1420', low && (t * 6 | 0) % 2);
  comic(c, Math.ceil(P.hp) + '', 124, 12.6, 8, '#ffffff', 'left', { thin: true, noDrop: true });
  plain(c, '/' + P.maxHp, 124 + textW2(Math.ceil(P.hp) + '', 8), 13.3, 4.6, '#b8a8cc');
  gauge(c, 33, 19, 70, 3.6, G.xp / xpNeed(G.level), '#3fb8a8', '#10283a');
  comic(c, '境 ' + G.level, 107, 21, 6, '#7fd8ff', 'left', { thin: true, noDrop: true });
  const full = G.energy >= 100;
  gauge(c, 33, 26, 70, 3.6, G.energy / 100, full ? '#f2b544' : '#e8452c', '#300a14', full && (t * 10 | 0) % 2);
  comic(c, full ? '空格!' : '剑意', 107, 28, 6, full ? '#f2b544' : '#ff9a7a', 'left', { thin: true, noDrop: true });
  // 双手
  P.hands.forEach((h, i) => {
    const x = 34 + i * 13, y = 32.5, st = h.rope ? h.rope.state : null;
    flat(c, q => rrect(q, x, y, 11, 6, 1.5), st === 'stuck' ? '#3fb8a8' : st === 'fly' ? '#2a6f97' : '#2a2440', .7);
    comic(c, i ? 'R' : 'L', x + 5.5, y + 3.3, 5, st ? '#ffffff' : '#6a5a78', 'center', { thin: true, noDrop: true });
  });
  if (P.alive && G.started && !P.hands.some(h => h.rope && h.rope.state === 'stuck') && (t * 8 | 0) % 2) comic(c, '坠落!', 62, 35.5, 7, '#ff5a3a', 'left', { thin: true });
  else plain(c, '身法 ' + (Math.hypot(P.vx, P.vy) / 10).toFixed(0) + ' 丈/息', 62, 35.4, 4.6, '#8ad8f0', 'left', true);

  // ---- 顶部中央：计时 / 章节 ----
  const tt = Math.floor(G.runTime), over = Diff.over();
  panel(c, W / 2 - 34, 3, 68, 22, 'rgba(27,22,51,.88)');
  comic(c, Math.floor(tt / 60) + ':' + String(tt % 60).padStart(2, '0'), W / 2, 12, 12, over > 1 ? '#ff3a4a' : '#ffffff', 'center', { thin: true, noDrop: true });
  const ch = over > 1 ? '墨劫 ×' + over.toFixed(1) : BG.layers.T.cn;
  plain(c, ch, W / 2, 20.6, 4.6, over > 1 ? ((t * 4 | 0) % 2 ? '#ff3a4a' : '#ffe04a') : '#c8b0e0', 'center', true);

  // ---- 右上：距离 / 金币 / BOSS ----
  panel(c, W - 96, 4, 92, 30, 'rgba(27,22,51,.88)');
  comic(c, Math.floor(G.dist) + '丈', W - 10, 13, 12, '#ffffff', 'right', { thin: true, noDrop: true });
  flat(c, q => ell(q, W - 86, 13, 3, 3.2), '#ffc83a', .8);
  flat(c, q => ell(q, W - 86.6, 12.4, .8, 1.4), '#fff6c0', 0);
  comic(c, G.coins + '', W - 80, 13.3, 8, '#ffd34a', 'left', { thin: true, noDrop: true });
  if (!G.boss) { const bl = Math.max(0, Math.ceil(G.nextBossT - G.runTime)); plain(c, 'BOSS ' + (G.bosses % BOSS_ORDER + 1) + ' · ' + bl + 's', W - 10, 27, 5, '#f2b544', 'right', true); }
  else plain(c, '击破 ×' + G.bosses, W - 10, 27, 5, '#f2b544', 'right', true);
  // BOSS 进度点（本轮已击破的 BOSS）
  for (let i = 0; i < BOSS_ORDER; i++) flat(c, q => poly(q, [W - 92 + i * 5, 27, W - 90 + i * 5, 25, W - 88 + i * 5, 27, W - 90 + i * 5, 29]), i < G.bosses % BOSS_ORDER ? '#f2b544' : '#3a2a4a', .5);

  // ---- 连击 ----
  if (G.combo >= 5) {
    const big = G.combo >= 50, col = big ? '#ff3a4a' : G.combo >= 20 ? '#ffe04a' : '#ffffff', pulse = G.comboT > 2.05 ? 1.15 : 1;
    c.save(); c.translate(W - 12, 50); c.rotate(-.06); c.scale(pulse, pulse);
    comic(c, G.combo + '', 0, 0, big ? 20 : 15, col, 'right');
    comic(c, '连 斩', 0, big ? 12 : 10, 5.5, '#ffffff', 'right', { thin: true });
    c.restore();
  }
  // ---- BOSS 血条 ----
  const b = G.boss;
  if (b) {
    const bw = 220, bx = W / 2 - bw / 2, by = 30;
    panel(c, bx - 6, by - 2, bw + 12, 16, 'rgba(27,22,51,.9)');
    comic(c, b.name, bx, by + 2.5, 6.5, b.def.col, 'left', { thin: true, noDrop: true });
    plain(c, b.def.cn.split(' · ')[0], bx + bw, by + 2.8, 4.6, '#d8c8e8', 'right', true);
    gauge(c, bx, by + 6, bw, 5, b.hp / b.maxHp, b.enraged ? ((t * 8 | 0) % 2 ? '#ff3a4a' : '#ff8a2a') : b.def.col, '#2a0a14');
  }
  if (G.warnT > 0) {
    const a = (G.warnT * 4 | 0) % 2;
    c.fillStyle = a ? 'rgba(255,40,60,.85)' : 'rgba(11,6,18,.85)';
    for (const y of [0, H - 9]) { c.fillRect(0, y, W, 9); c.save(); c.beginPath(); c.rect(0, y, W, 9); c.clip(); c.fillStyle = a ? INK : '#ff3a4a'; for (let x = -20 + (G.time * 60 % 18); x < W; x += 18) { c.beginPath(); poly(c, [x, y + 9, x + 9, y, x + 14, y, x + 5, y + 9]); c.fill(); } c.restore(); }
    if (a) { c.save(); c.translate(W / 2, 66); c.rotate(-.04); comic(c, '将 至!!', 0, 0, 24, '#ff5a3a', 'center', { cn: true }); c.restore(); }
  }
  if (G.state === 'resume') {
    c.fillStyle = 'rgba(11,6,18,.7)'; c.fillRect(0, H / 2 - 20, W, 36);
    comic(c, '按住鼠标 继续飞荡', W / 2, H / 2 - 5, 12, (t * 3 | 0) % 2 ? '#ffffff' : '#ffe04a', 'center');
    plain(c, '按住鼠标继续 · 没有按住的那只手会松开钩索', W / 2, H / 2 + 9, 5.5, '#c8b8d8', 'center', true);
  }
  if (!G.started && P.alive) {
    c.save(); c.translate(W / 2, H * .72); c.rotate(-.03);
    comic(c, '按住鼠标左键 / 右键 · 钩住屋檐', 0, 0, 10, (t * 3 | 0) % 2 ? '#ffffff' : '#ffe04a', 'center', { cn: true });
    c.restore();
  }
}
const _tw2 = document.createElement('canvas').getContext('2d');
function textW2(s, size) { _tw2.font = size + 'px ' + COMIC; return _tw2.measureText(s).width; }

function drawCursor(c) {
  const P = Player; if (!P.alive) return;
  const mx = Input.mx, my = Input.my, hx = P.x - G.cam.x, hy = P.y - 2 - G.cam.y;
  const dx = mx - hx, dy = my - hy, d = Math.hypot(dx, dy) || 1, R = Stats.range, L = Math.min(d, R);
  let ok = false, tx = mx, ty = my;
  for (let s = L; s >= 22; s -= 6) { const px = hx + dx / d * s, py = hy + dy / d * s; if (World.anchorAt(px + G.cam.x, py + G.cam.y)) { ok = true; tx = px; ty = py; break; } }
  const col = ok ? '#7fffb0' : '#ff6a4a';
  const ex = ok ? tx : hx + dx / d * L, ey = ok ? ty : hy + dy / d * L;
  c.setLineDash([1.5, 3.5]); line(c, hx, hy, ex, ey, rgba(col, .6), .7); c.setLineDash([]);
  if (ok) { c.beginPath(); circ(c, tx, ty, 2.6); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke(); c.strokeStyle = col; c.lineWidth = .9; c.stroke(); }
  c.save(); c.translate(mx, my); c.rotate(G.time * 2);
  for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.beginPath(); c.moveTo(2.4, 0); c.lineTo(6, 0); c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.strokeStyle = col; c.lineWidth = .9; c.stroke(); }
  c.restore();
  if (d > R) { c.beginPath(); circ(c, hx, hy, R); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = .6; c.setLineDash([3, 4]); c.stroke(); c.setLineDash([]); }
}
