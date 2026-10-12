'use strict';
// ============ 主角「青鸢」：角色设计 ============
// 云阙城最后的钩影客。设计要点：
//   · 剪影：高马尾 + 迎风飘带 + 短斗篷，飞荡时后两者形成动势曲线
//   · 配色：松石青短打 + 朱红束腰飘带 + 月白护臂，与城市的暖紫/金主色对冲
//   · 面部：白色半面具（护眼纹为金色云纹），露出下半张脸 → 有“人”的亲和力
//   · 道具：双手腕间的“玉钩”——绳索末端是玉质飞钩与流苏
const HERO = { cloth: '#3fb8a8', clothS: '#1e7468', coat: '#23405e', coatS: '#122438', sash: '#e8452c', sashS: '#9a2418',
  guard: '#f4ecd8', guardS: '#c9bc9a', hair: '#1b1633', hairS: '#0c0a18', skin: '#f6d6b4', skinS: '#d9a57e', mask: '#fbf6ea', maskS: '#d2c8b0', gold: '#f2b544' };
const HERO_SC = 1.15;

function heroArm(P, i, t) {
  const sx = i ? 2.7 : -2.4, sy = -4, r = P.hands[i].rope;
  let a, bend;
  if (r) {
    const ex = r.state === 'fly' ? P.x + (r.ax - P.x) * r.t : r.ax, ey = r.state === 'fly' ? P.y + (r.ay - P.y) * r.t : r.ay;
    a = Math.atan2(ey - P.y, ex - P.x) - P.rot; bend = .16;
  } else { a = i === 0 ? 2.3 + Math.sin(t * 10) * .2 : (P.alive ? -.35 : .5); bend = i ? -.95 : .85; }
  const ex = sx + Math.cos(a + bend) * 3.4, ey = sy + Math.sin(a + bend) * 3.4;
  return [sx, sy, ex, ey, ex + Math.cos(a - bend * .5) * 3.4, ey + Math.sin(a - bend * .5) * 3.4];
}
function heroLeg(P, s) {
  const tuck = Math.abs(P.spin) > 3, sw = clamp(-P.vx * .004, -.8, .8);
  const hx = s * 1.25, hy = 3.6, a = Math.PI / 2 + sw + s * .22 + (tuck ? -1.25 * s : 0), a2 = a + (tuck ? 2.1 : .45 * s);
  const kx = hx + Math.cos(a) * 4.3, ky = hy + Math.sin(a) * 4.3;
  return [hx, hy, kx, ky, kx + Math.cos(a2) * 4.4, ky + Math.sin(a2) * 4.4, a2];
}
function heroHandWorld(P, i, t) {
  const p = heroArm(P, i, t), c = Math.cos(P.rot), s = Math.sin(P.rot), x = p[4] * HERO_SC, y = p[5] * HERO_SC;
  return [P.x + x * c - y * s, P.y + x * s + y * c];
}

// 飘带 / 马尾 / 斗篷：随速度方向拖曳的曲线（局部坐标，已抵消身体旋转）
function trailDir(P) {
  const vx = P.vx, vy = P.vy, sp = Math.hypot(vx, vy) || 1, k = Math.min(1, sp / 260);
  const a = Math.atan2(-vy, -vx) - P.rot;   // 速度反方向
  const rest = Math.PI / 2 + .9 - P.rot * 0;  // 静止时下垂偏后
  const ang = lerpAng(rest, a, .35 + k * .6);
  return [Math.cos(ang), Math.sin(ang), k];
}
function ribbon(c, x0, y0, len, w0, P, t, ph, col, colS) {
  const [dx, dy, k] = trailDir(P), nx = -dy, ny = dx, N = 7, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, wave = Math.sin(t * (9 + k * 8) - u * 5 + ph) * (1 + u * 2.2) * (.5 + k * .5);
    pts.push([x0 + dx * len * u + nx * wave, y0 + dy * len * u + ny * wave + u * u * (1 - k) * 3]);
  }
  const path = q => {
    q.moveTo(pts[0][0] + nx * w0, pts[0][1] + ny * w0);
    for (let i = 1; i <= N; i++) { const w = w0 * (1 - i / N * .75); q.lineTo(pts[i][0] + nx * w, pts[i][1] + ny * w); }
    for (let i = N; i >= 0; i--) { const w = w0 * (1 - i / N * .75); q.lineTo(pts[i][0] - nx * w, pts[i][1] - ny * w); }
    q.closePath();
  };
  cel(c, path, col, colS, { lw: .7, off: .6 });
  return pts[N];
}

function heroLimbLeg(c, p, dark) {
  const C = dark ? HERO.coatS : HERO.coat, CS = dark ? '#070e18' : HERO.coatS;
  const [hx, hy, kx, ky, fx, fy, a2] = p, bx = lerp(kx, fx, .45), by = lerp(ky, fy, .45);
  cel(c, q => bone(q, hx, hy, kx, ky, 1.55, 1.1), C, CS, { lw: .8, off: .8 });
  // 绑腿（月白布缠）
  cel(c, q => bone(q, kx, ky, bx, by, 1.15, 1.05), C, CS, { lw: .8, off: .7 });
  cel(c, q => bone(q, bx, by, fx, fy, 1.05, .82), dark ? HERO.guardS : HERO.guard, dark ? '#8a8068' : HERO.guardS, { lw: .8, off: .6 });
  inkLines(c, .45, .25, [lerp(bx, fx, .3) - .9, lerp(by, fy, .3) - .3, lerp(bx, fx, .3) + .9, lerp(by, fy, .3) + .3, lerp(bx, fx, .65) - .8, lerp(by, fy, .65) - .3, lerp(bx, fx, .65) + .8, lerp(by, fy, .65) + .3]);
  const n = a2 - Math.PI / 2;
  cel(c, q => ell(q, fx + Math.cos(n) * .6, fy + Math.sin(n) * .6, 1.45, .8, n), HERO.hair, HERO.hairS, { lw: .7, off: .5 });
}
function heroLimbArm(c, p, dark) {
  const C = dark ? HERO.clothS : HERO.cloth, CS = dark ? '#0e4038' : HERO.clothS;
  const [sx, sy, ex, ey, hx, hy] = p, gx = lerp(ex, hx, .25), gy = lerp(ey, hy, .25);
  cel(c, q => bone(q, sx, sy, ex, ey, 1.2, .95), C, CS, { lw: .75, off: .7 });
  // 护臂（月白 + 金扣）
  cel(c, q => bone(q, ex, ey, hx, hy, 1.05, .95), dark ? HERO.guardS : HERO.guard, dark ? '#8a8068' : HERO.guardS, { lw: .75, off: .6 });
  flat(c, q => circ(q, gx, gy, .45), HERO.gold, .35);
  cel(c, q => circ(q, hx, hy, 1.02), dark ? HERO.skinS : HERO.skin, dark ? '#a8785a' : HERO.skinS, { lw: .7, off: .5 });
  // 腕间玉钩
  if (!dark) detail(() => { flat(c, q => ell(q, lerp(ex, hx, .7), lerp(ey, hy, .7), .75, .5), '#7fd8b0', .4); });
}

function heroBody(c, P, t) {
  const hurt = P.inv > .3, ult = G.ultT > 0;
  // ---- 背后：斗篷 / 马尾 / 飘带 ----
  ribbon(c, -1.6, -4.4, 9, 2.4, P, t, 0, HERO.coat, HERO.coatS);
  ribbon(c, .2, 2.6, 11, .9, P, t, 1.7, HERO.sash, HERO.sashS);
  ribbon(c, 1.2, 2.8, 8.5, .75, P, t, 3.1, HERO.sash, HERO.sashS);
  const tip = ribbon(c, -.6, -11.2, 7.5, 1.35, P, t, 2.4, HERO.hair, HERO.hairS);
  flat(c, q => circ(q, tip[0], tip[1], .5), HERO.gold, 0);
  heroLimbLeg(c, heroLeg(P, -1), true);
  heroLimbArm(c, heroArm(P, 0, t), true);
  // ---- 躯干：交领短打 ----
  const torso = q => { q.moveTo(-3.3, -4.9); q.quadraticCurveTo(0, -6, 3.5, -4.9); q.quadraticCurveTo(3.8, -1.2, 2.4, 2.6); q.lineTo(-2.3, 2.6); q.quadraticCurveTo(-3.7, -1.2, -3.3, -4.9); q.closePath(); };
  cel(c, torso, HERO.cloth, HERO.clothS, { lw: .85, off: 1, hi: [-1.4, -3.6, 1.1, 1.6, -.3, .3] });
  // 交领（右衽）：月白领缘斜切
  flat(c, q => { q.moveTo(-1.4, -5.6); q.lineTo(.4, -5.6); q.lineTo(2.6, -.6); q.lineTo(1.6, -.2); q.closePath(); }, HERO.guard, .6);
  flat(c, q => { q.moveTo(2, -5.4); q.lineTo(3.2, -5); q.lineTo(1.4, -2.4); q.closePath(); }, HERO.guardS, .5);
  detail(() => {
    // 胸前云纹刺绣
    c.strokeStyle = HERO.gold; c.lineWidth = .35; c.beginPath(); curlLine(c, -1.4, -1.6, 1.3, -1); c.stroke();
  });
  // 束腰：朱红宽腰带 + 金扣
  cel(c, q => { q.moveTo(-2.5, 1); q.lineTo(2.6, 1); q.lineTo(2.5, 3.1); q.lineTo(-2.4, 3.1); q.closePath(); }, HERO.sash, HERO.sashS, { lw: .7, off: .5 });
  flat(c, q => rrect(q, -.5, 1.3, 1.6, 1.5, .4), HERO.gold, .45);
  // 下摆
  cel(c, q => { q.moveTo(-2.4, 3); q.lineTo(2.5, 3); q.quadraticCurveTo(3.1, 4.8, 2.1, 5.6); q.lineTo(-2.1, 5.6); q.quadraticCurveTo(-3.1, 4.8, -2.4, 3); q.closePath(); }, HERO.coat, HERO.coatS, { lw: .8 });
  // ---- 头：黑发 + 半面具 ----
  cel(c, q => bone(q, .15, -4.6, .35, -6.3, 1, .95), HERO.skin, HERO.skinS, { lw: .65 });
  const head = q => { q.moveTo(.3, -12); q.bezierCurveTo(3.2, -12, 3.9, -9.4, 3.4, -7.6); q.bezierCurveTo(2.9, -6, 1.6, -5.4, .6, -5.4); q.bezierCurveTo(-1.6, -5.4, -2.8, -7, -2.8, -8.8); q.bezierCurveTo(-2.8, -10.9, -1.6, -12, .3, -12); q.closePath(); };
  cel(c, head, HERO.skin, HERO.skinS, { lw: .9, off: 1 });
  // 头发：后脑 + 刘海（锯齿发束）
  cel(c, q => { q.moveTo(-2.9, -8.2); q.bezierCurveTo(-3.3, -11.4, -.6, -12.9, 1.6, -12.4); q.bezierCurveTo(3.6, -12, 4.2, -10, 3.6, -9.2);
    q.lineTo(2.6, -9.8); q.lineTo(2.2, -8.9); q.lineTo(1.2, -9.8); q.lineTo(.4, -8.7); q.lineTo(-.4, -9.9); q.lineTo(-1.2, -8.4); q.lineTo(-1.9, -7.4); q.closePath(); }, HERO.hair, HERO.hairS, { lw: .85, off: .8, hi: [-.4, -11.6, 1.6, .45, -.25, .3] });
  // 发冠（金色小冠 + 簪）
  flat(c, q => { q.moveTo(-1.1, -12.3); q.lineTo(.9, -12.8); q.lineTo(.8, -13.9); q.lineTo(-.9, -13.5); q.closePath(); }, HERO.gold, .55);
  limb(c, [-2.6, -13.2, 2.4, -13.6], .35, HERO.gold, .3);
  flat(c, q => circ(q, 2.6, -13.6, .5), HERO.sash, .35);
  // 半面具：覆盖眼部，金色云纹眼线；受伤时面具裂纹 / 大招时眼线变红
  const mask = q => { q.moveTo(-2.2, -9.4); q.quadraticCurveTo(.8, -10.2, 3.6, -9.6); q.lineTo(3.7, -8); q.quadraticCurveTo(3, -7, 2.2, -7.3); q.quadraticCurveTo(1.3, -7.8, .6, -7.2); q.quadraticCurveTo(-1, -6.8, -2.3, -7.8); q.closePath(); };
  cel(c, mask, HERO.mask, HERO.maskS, { lw: .75, off: .6 });
  const eyeC = ult ? '#e8452c' : hurt ? '#9a2418' : INK, sq = hurt ? .35 : 1;
  flat(c, q => { q.moveTo(1.3, -8.6); q.quadraticCurveTo(2.2, -8.6 - .9 * sq, 3.2, -8.5); q.quadraticCurveTo(2.3, -8.1, 1.3, -8.6); q.closePath(); }, eyeC, .3);
  flat(c, q => { q.moveTo(-.4, -8.5); q.quadraticCurveTo(.2, -8.5 - .7 * sq, .8, -8.4); q.quadraticCurveTo(.3, -8.1, -.4, -8.5); q.closePath(); }, eyeC, .3);
  detail(() => {
    c.strokeStyle = ult ? '#e8452c' : HERO.gold; c.lineWidth = .3; c.beginPath();
    c.moveTo(3.3, -8.3); c.quadraticCurveTo(3.9, -7.6, 3.4, -7.1); c.moveTo(-1.8, -8.3); c.quadraticCurveTo(-2.4, -7.7, -1.9, -7.2); c.stroke();
    if (hurt) { c.strokeStyle = INK; c.lineWidth = .25; c.beginPath(); c.moveTo(2.8, -9.6); c.lineTo(2.3, -8.9); c.lineTo(2.7, -8.4); c.stroke(); }
    // 嘴
    c.strokeStyle = HERO.skinS; c.lineWidth = .3; c.beginPath(); c.moveTo(1.4, -6.2); c.quadraticCurveTo(2, ult ? -6.4 : -6, 2.4, -6.2); c.stroke();
  });
  heroLimbLeg(c, heroLeg(P, 1), false);
  heroLimbArm(c, heroArm(P, 1, t), false);
}

function drawHero(c, P, t) {
  const sp = Math.hypot(P.vx, P.vy);
  if (sp > 200 && P.trail.length > 2) {
    for (let i = 0; i < P.trail.length - 1; i += 2) {
      const tr = P.trail[i];
      c.save(); c.translate(tr.x, tr.y); c.rotate(tr.rot); c.scale(HERO_SC, HERO_SC);
      c.globalAlpha = (i + 1) / P.trail.length * .35 * Math.min(1, (sp - 200) / 120);
      ART.stk = .3; ART.stkCol = '#3fb8a8'; heroBody(c, P, t); ART.stk = 0;
      c.restore();
    }
    c.globalAlpha = 1;
  }
  c.save(); c.translate(P.x, P.y); c.rotate(P.rot); c.scale(HERO_SC, HERO_SC);
  const blink = P.inv > 0 && ((G.time * 20) | 0) % 2;
  ART.stk = 1.25; ART.stkCol = G.ultT > 0 ? '#f2b544' : '#fbf6ea'; heroBody(c, P, t); ART.stk = 0;
  ART.flash = blink ? .85 : 0; heroBody(c, P, t); ART.flash = 0;
  c.restore();
}

// HUD 头像
function drawHeroPortrait(c, x, y, r, P, t) {
  c.save(); c.translate(x, y);
  flat(c, q => circ(q, 0, 0, r), '#23405e', 1);
  c.beginPath(); circ(c, 0, 0, r * .93); c.clip();
  c.scale(r / 5.4, r / 5.4); c.translate(-.5, 9.2);
  const fake = Object.assign({}, P, { vx: -60, vy: 0, rot: 0, inv: P.hp / P.maxHp < .3 && (t * 6 | 0) % 2 ? 1 : 0 });
  cel(c, q => bone(q, .1, -2.4, .35, -6.3, 2.6, 1), HERO.cloth, HERO.clothS, { lw: .5 });
  flat(c, q => { q.moveTo(-1.4, -5.6); q.lineTo(.4, -5.6); q.lineTo(2, -2); q.lineTo(1, -1.6); q.closePath(); }, HERO.guard, .4);
  const tip = ribbon(c, -.6, -11.2, 6, 1.35, fake, t, 2.4, HERO.hair, HERO.hairS);
  const head = q => { q.moveTo(.3, -12); q.bezierCurveTo(3.2, -12, 3.9, -9.4, 3.4, -7.6); q.bezierCurveTo(2.9, -6, 1.6, -5.4, .6, -5.4); q.bezierCurveTo(-1.6, -5.4, -2.8, -7, -2.8, -8.8); q.bezierCurveTo(-2.8, -10.9, -1.6, -12, .3, -12); q.closePath(); };
  cel(c, head, HERO.skin, HERO.skinS, { lw: .5, off: .8 });
  cel(c, q => { q.moveTo(-2.9, -8.2); q.bezierCurveTo(-3.3, -11.4, -.6, -12.9, 1.6, -12.4); q.bezierCurveTo(3.6, -12, 4.2, -10, 3.6, -9.2); q.lineTo(2.6, -9.8); q.lineTo(2.2, -8.9); q.lineTo(1.2, -9.8); q.lineTo(.4, -8.7); q.lineTo(-.4, -9.9); q.lineTo(-1.2, -8.4); q.lineTo(-1.9, -7.4); q.closePath(); }, HERO.hair, HERO.hairS, { lw: .5 });
  flat(c, q => { q.moveTo(-1.1, -12.3); q.lineTo(.9, -12.8); q.lineTo(.8, -13.9); q.lineTo(-.9, -13.5); q.closePath(); }, HERO.gold, .4);
  const mask = q => { q.moveTo(-2.2, -9.4); q.quadraticCurveTo(.8, -10.2, 3.6, -9.6); q.lineTo(3.7, -8); q.quadraticCurveTo(3, -7, 2.2, -7.3); q.quadraticCurveTo(1.3, -7.8, .6, -7.2); q.quadraticCurveTo(-1, -6.8, -2.3, -7.8); q.closePath(); };
  cel(c, mask, HERO.mask, HERO.maskS, { lw: .5, off: .5 });
  const eyeC = fake.inv ? '#e8452c' : INK;
  flat(c, q => { q.moveTo(1.3, -8.6); q.quadraticCurveTo(2.2, -9.5, 3.2, -8.5); q.quadraticCurveTo(2.3, -8.1, 1.3, -8.6); q.closePath(); }, eyeC, .2);
  flat(c, q => { q.moveTo(-.4, -8.5); q.quadraticCurveTo(.2, -9.2, .8, -8.4); q.quadraticCurveTo(.3, -8.1, -.4, -8.5); q.closePath(); }, eyeC, .2);
  c.restore();
}
