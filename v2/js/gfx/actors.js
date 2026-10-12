'use strict';
// ============ 角色美术：BOSS 与统一绘制入口 ============
// 约定：局部坐标 y 向下；敌人默认面朝左（朝玩家），BOSS 面朝右。
// BART_PLACEHOLDER
// ---------- 统一绘制入口 ----------
function drawEnemies(c, t) {
  const P = Player;
  for (const e of Enemies.list) {
    const art = EART[e.type]; if (!art) continue;
    if (e.x < G.cam.x - 40 || e.x > G.cam.x + W + 50) continue;
    // 预警（世界坐标）
    if (e.aimT > 0) { const k = 1 - e.aimT / .8; c.globalAlpha = .3 + k * .6; c.setLineDash([3, 3]); line(c, e.x, e.y, e.x + Math.cos(e.aimA) * 420, e.y + Math.sin(e.aimA) * 420, '#e8452c', .5 + k); c.setLineDash([]); c.globalAlpha = 1; }
    if (e.dash && e.dash.t < .5) { c.globalAlpha = .45 + (e.dash.t * 16 | 0) % 2 * .4; c.setLineDash([2, 2.5]); line(c, e.x, e.y, e.dash.tx, e.dash.ty, '#ffcf3a', 1); c.setLineDash([]); c.globalAlpha = 1; }
    const fx = P.x < e.x ? 1 : -1, sc = e.elite ? 2.1 : 1.15;
    c.save(); c.translate(e.x, e.y); c.scale(sc * fx, sc);
    if (e.elite) { ART.stk = .7; ART.stkCol = '#ffcf4a'; art(c, e, t, P, fx); ART.stk = 0; }
    ART.flash = e.flash > 0 ? .6 : 0; art(c, e, t, P, fx); ART.flash = 0;
    c.restore();
    if (e.elite) {
      comic(c, '精英', e.x, e.y - e.r * 2 - 11, 6.5, '#ffcf4a', 'center', { thin: true });
      hpBar(c, e.x - 17, e.y - e.r * 2 - 6, 34, 2.6, e.hp / e.maxHp, '#ffcf4a');
    } else if (e.hp < e.maxHp && e.maxHp > 12) hpBar(c, e.x - 8, e.y - e.r - 6, 16, 1.8, e.hp / e.maxHp, '#ff3a4a');
  }
}
function hpBar(c, x, y, w, h, k, col) {
  c.fillStyle = INK; c.fillRect(x - .6, y - .6, w + 1.2, h + 1.2);
  c.fillStyle = '#2a1420'; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x, y, w * clamp(k, 0, 1), h);
}
function drawBoss(c, b, t) {
  if (b.state === 'dying' && ((t * 20) | 0) % 2 && b.dying < 1) return;
  const art = BART[b.def.id];
  c.save(); c.translate(b.x, b.y + Math.sin(t * 1.6) * 1.5); c.scale(1.3, 1.3); c.rotate(Math.sin(t * 1.3) * .05);
  const tint = b.enraged ? 'rgba(255,30,50,' + (.12 + Math.sin(t * 10) * .08).toFixed(3) + ')' : null;
  ART.stk = .9; ART.stkCol = b.enraged ? '#e8452c' : '#1b1633'; art(c, b, t); ART.stk = 0;
  ART.flash = b.flash > 0 ? .35 : 0; ART.tint = tint; art(c, b, t); ART.flash = 0; ART.tint = null;
  c.restore();
}
