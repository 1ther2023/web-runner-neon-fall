'use strict';
// ============ 普通敌人：“墨灾”阵营（面朝左 = 朝向玩家） ============
// 统一语言：
//   · 机关造物（木 + 青铜 + 朱漆）——被墨灾附身的城防傀儡，关节处渗出墨色
//   · 墨妖（墨色躯体 + 金色妖瞳 + 月白獠牙）——从云海墨潮中孵出
// 每种敌人都有一眼可认的剪影：风筝 / 傀儡兵 / 墨团 / 铜镜 / 楼船 / 爆竹灯 / 墨蝠 / 机关鹤

const BRONZE = ['#c9a25a', '#7a5a2a'], DBRONZE = ['#8a6a3a', '#4a3418'], WOOD = ['#a0643a', '#5e3418'], LAC = ['#c8402a', '#7a1e14'];
function moEye(c, x, y, r, blink) {
  // 墨妖的金色竖瞳
  flat(c, q => ell(q, x, y, r, r * .8), '#ffcf4a', .5);
  flat(c, q => ell(q, x, y, r * .28, blink ? .1 : r * .7), INK, 0);
  detail(() => { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); circ(c, x - r * .4, y - r * .35, r * .22); c.fill(); });
}
function inkDrip(c, x, y, t, ph, len) {
  const l = len * (.5 + .5 * Math.sin(t * 3 + ph));
  flat(c, q => { q.moveTo(x - .6, y); q.quadraticCurveTo(x - .5, y + l * .7, x, y + l); q.quadraticCurveTo(x + .5, y + l * .7, x + .6, y); q.closePath(); }, PAL.mo, .35);
}
function talisman(c, x, y, a, s) {
  // 黄符：贴在机关上的“驱动符”
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  flat(c, q => q.rect(-1.2, -2.2, 2.4, 4.4), '#f2d06a', .4);
  detail(() => { c.strokeStyle = '#c8402a'; c.lineWidth = .3; c.beginPath(); c.moveTo(0, -1.8); c.lineTo(0, 1.8); c.moveTo(-.7, -1); c.lineTo(.7, -1); c.moveTo(-.6, .2); c.quadraticCurveTo(0, .8, .6, .2); c.stroke(); });
  c.restore();
}

const EART = {
  // 纸鸢哨：被墨染的菱形风筝，中央一只妖瞳，尾部飘带；绕线处有金色竹骨
  drone(c, e, t) {
    const bob = Math.sin(e.t * 6) * .8; c.translate(0, bob); c.rotate(clamp(e.vx * -.003, -.3, .3) + Math.sin(e.t * 3) * .08);
    // 尾带
    const pts = []; for (let i = 0; i <= 6; i++) pts.push(3.5 + i * 1.6, 3.5 + i * 1.1 + Math.sin(t * 8 - i * .9) * 1.2);
    for (let i = 0; i < pts.length - 2; i += 2) limb(c, [pts[i], pts[i + 1], pts[i + 2], pts[i + 3]], .8, i % 4 ? PAL.zhu : PAL.gold, .35);
    const kite = q => poly(q, [-6.5, 0, 0, -5.4, 6, 0, 0, 5.4]);
    cel(c, kite, PAL.paper, PAL.paperS, { lw: .9, off: 1.2 });
    detail(() => {
      c.save(); c.beginPath(); kite(c); c.clip();
      c.fillStyle = rgba(PAL.mo, .85); c.beginPath(); blobPath(c, 1.5, 1.2, 4.2, 5, .8, e.t * 2); c.fill();
      c.fillStyle = PAL.zhu; c.beginPath(); poly(c, [-6.5, 0, -3.8, -2.2, -3.8, 2.2]); c.fill();
      c.restore();
      c.strokeStyle = PAL.goldS; c.lineWidth = .45; c.beginPath(); c.moveTo(-6.5, 0); c.lineTo(6, 0); c.moveTo(0, -5.4); c.lineTo(0, 5.4); c.stroke();
    });
    moEye(c, .2, 0, 1.9, (e.t * 2.2 | 0) % 5 === 0);
    for (const s of [-1, 1]) inkDrip(c, 2 + s * 1.2, 2.6, t, s + e.t, 2);
  },
  // 墨甲卫：机关傀儡兵——木制躯干 + 青铜胸甲 + 斗笠 + 连弩；背后驱动符
  thug(c, e, t, P, fx) {
    const ga = Math.atan2(P.y - e.y, (P.x - e.x) * fx), fl = 3 + Math.sin(t * 50) * 1.2;
    // 背负的机关飞轮（喷出墨烟推进）
    for (const z of [0, 1]) { const jx = 2.4 + z * 1.6; flat(c, q => poly(q, [jx - .9, 3.8, jx + .9, 3.8, jx, 4.2 + fl]), rgba(PAL.moRim, .9), .45); }
    cel(c, q => circ(q, 3, 0, 3), WOOD[0], WOOD[1], { lw: .75 });
    detail(() => { c.strokeStyle = INK; c.lineWidth = .35; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + e.t * 4; c.moveTo(3, 0); c.lineTo(3 + Math.cos(a) * 2.7, Math.sin(a) * 2.7); } c.stroke(); });
    talisman(c, 3.4, -3.2, .3, .9);
    for (const z of [1, 0]) {
      const k = z ? 1 : 0;
      cel(c, q => bone(q, -.3 + k * .9, 2.8, -1.3 + k * .7, 6.1, 1.2, .9), z ? WOOD[0] : WOOD[1], '#3a1e0c', { lw: .7, off: .6 });
      cel(c, q => ell(q, -2.1 + k * .9, 6.9, 1.6, .9, -.1), INK, '#000', { lw: .5 });
    }
    // 躯干 + 青铜胸甲（鳞纹）
    const body = q => { q.moveTo(-3.2, -2.6); q.quadraticCurveTo(-.3, -4.4, 2.8, -2.8); q.lineTo(2.4, 3.4); q.quadraticCurveTo(-.3, 4.4, -2.9, 3.2); q.closePath(); };
    cel(c, body, BRONZE[0], BRONZE[1], { lw: .85, off: 1, hi: [-1.4, -1.8, 1, 1.4, 0, .35] });
    detail(() => { c.save(); c.beginPath(); body(c); c.clip(); c.strokeStyle = 'rgba(74,52,24,.7)'; c.lineWidth = .3; c.beginPath(); for (let y = -2.4; y < 3.6; y += 1.2) for (let x = -3.4 + (y * 1.6 % 1.2); x < 3; x += 1.4) { c.moveTo(x + .7, y); c.arc(x, y, .7, 0, Math.PI); } c.stroke(); c.restore(); });
    flat(c, q => q.rect(-3, 1.6, 5.6, 1), LAC[0], .5);
    // 头 + 斗笠 + 面甲缝里的妖光
    cel(c, q => circ(q, -.6, -5, 2.2), WOOD[0], WOOD[1], { lw: .8 });
    flat(c, q => q.rect(-2.8, -5.5, 3, .9), INK, 0);
    flat(c, q => q.rect(-2.6, -5.35, 1.4, .6), '#ffcf4a', 0);
    cel(c, q => { q.moveTo(-5.4, -6.2); q.quadraticCurveTo(-.6, -10, 4.2, -6.2); q.quadraticCurveTo(-.6, -7.1, -5.4, -6.2); q.closePath(); }, '#d8b870', '#8a6a30', { lw: .8, off: .6 });
    detail(() => { c.strokeStyle = 'rgba(90,60,20,.6)'; c.lineWidth = .25; c.beginPath(); for (let i = -4; i <= 3; i += 1.3) { c.moveTo(-.6, -8.7); c.lineTo(i, -6.5); } c.stroke(); });
    // 连弩 + 手臂
    c.save(); c.translate(-.6, -1.2); c.rotate(ga);
    cel(c, q => { q.moveTo(.4, -.8); q.lineTo(8, -.8); q.lineTo(8, .8); q.lineTo(.4, .8); q.closePath(); }, WOOD[0], WOOD[1], { lw: .65 });
    cel(c, q => { q.moveTo(6.6, -3.6); q.quadraticCurveTo(5.4, 0, 6.6, 3.6); q.lineTo(7.2, 3.4); q.quadraticCurveTo(6.1, 0, 7.2, -3.4); q.closePath(); }, DBRONZE[0], DBRONZE[1], { lw: .5 });
    detail(() => { c.strokeStyle = PAL.paper; c.lineWidth = .25; c.beginPath(); c.moveTo(6.8, -3.4); c.lineTo(3, 0); c.lineTo(6.8, 3.4); c.stroke(); });
    cel(c, q => rrect(q, 2, -2, 3, 1.2, .3), DBRONZE[0], DBRONZE[1], { lw: .4 });
    flat(c, q => poly(q, [8, -.4, 9.6, 0, 8, .4]), '#e8e8f0', .35);
    cel(c, q => bone(q, -1.6, 0, 1.6, .6, 1.15, .95), WOOD[0], WOOD[1], { lw: .6 });
    c.restore();
    cel(c, q => ell(q, -1.4, -2.6, 1.9, 1.5, -.3), BRONZE[0], BRONZE[1], { lw: .7, off: .6 });
  },
  // 墨魉：墨团小妖——云头般的尖角、两只金瞳、一口月白尖牙；身后甩出墨滴
  blob(c, e, t) {
    const k = 1 + Math.sin(e.t * 12) * .12;
    for (let i = 0; i < 3; i++) { const a = .1 + i * .5 + Math.sin(e.t * 6 + i) * .2, l = 3 + Math.sin(e.t * 8 + i * 2) * 1.2; limb(c, [Math.cos(a) * 4, Math.sin(a) * 3.6, Math.cos(a) * (5 + l), Math.sin(a) * (4 + l)], 1.1 - i * .15, PAL.mo, .6); }
    c.save(); c.scale(k, 1 / k);
    cel(c, q => { blobPath(q, 0, .6, 4.8, 5, .8, e.t * 5); }, '#2a2040', PAL.moS, { lw: 1, off: 1.4, hi: [-1.6, -2, 1.6, .7, -.4, .35] });
    // 头顶两只云角
    for (const s of [-1, 1]) flat(c, q => { q.moveTo(s * 1, -3.6); q.quadraticCurveTo(s * 2.6, -7, s * 4, -6.2); q.quadraticCurveTo(s * 3, -5, s * 3.2, -3.4); q.closePath(); }, '#2a2040', .8);
    detail(() => { c.strokeStyle = rgba(PAL.moRim, .9); c.lineWidth = .45; c.beginPath(); curlLine(c, 1.6, 2.6, 1.3, 1); c.stroke(); });
    c.restore();
    moEye(c, -2.1, -.9, 1.35, false); moEye(c, 1.1, -1.1, 1.1, false);
    flat(c, q => { q.moveTo(-3.4, 1.2); q.quadraticCurveTo(-.4, 4, 2.4, 1.2); q.quadraticCurveTo(-.5, 2, -3.4, 1.2); q.closePath(); }, '#5a0a18', .55);
    detail(() => { c.fillStyle = PAL.paper; c.beginPath(); for (let i = 0; i < 5; i++) { const x0 = -3 + i * 1.1, y0 = 1.3 + Math.sin(i / 4 * Math.PI) * .6; poly(c, [x0, y0, x0 + .9, y0 + .1, x0 + .45, y0 + 1.2]); } c.fill(); });
  },
  // 铜镜妖：一面青铜古镜，镜钮处睁开巨眼；外圈八卦纹与旋转的镜齿
  eye(c, e, t, P, fx) {
    for (let i = 0; i < 8; i++) {
      const a = t * .6 + i * Math.PI / 4;
      c.save(); c.rotate(a);
      cel(c, q => poly(q, [8, -1.2, 11, 0, 8, 1.2]), i % 2 ? BRONZE[0] : PAL.song, i % 2 ? BRONZE[1] : PAL.songS, { lw: .6, off: .5 });
      c.restore();
    }
    // 镜背外环：青铜 + 铜绿锈 + 八卦刻线
    flat(c, q => { circ(q, 0, 0, 9); circ(q, 0, 0, 6.6); }, BRONZE[0], .9);
    detail(() => {
      c.save(); c.beginPath(); circ(c, 0, 0, 9); circ(c, 0, 0, 6.6); c.clip('evenodd');
      c.fillStyle = BRONZE[1]; c.beginPath(); c.arc(0, 0, 9.5, Math.PI * .1, Math.PI * .8); c.lineTo(0, 0); c.fill();
      c.fillStyle = rgba(PAL.song, .7); for (let i = 0; i < 5; i++) { const a = i * 1.3 + 2; c.beginPath(); circ(c, Math.cos(a) * 7.8, Math.sin(a) * 7.8, .8); c.fill(); }
      c.restore();
      c.strokeStyle = INK; c.lineWidth = .4; c.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * .4, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, br = i % 3 === 0;
        for (let j = 0; j < 3; j++) { const r = 7.1 + j * .55, l = br && j === 1 ? .35 : .9; c.moveTo(ca * r - px * l, sa * r - py * l); c.lineTo(ca * r + px * l, sa * r + py * l); if (br && j === 1) { c.moveTo(ca * r + px * .6, sa * r + py * .6); c.lineTo(ca * r + px * .9, sa * r + py * .9); } } }
      c.stroke();
    });
    // 镜面：墨色 + 映出的眼白
    cel(c, q => circ(q, 0, 0, 6.3), '#2a2040', PAL.moS, { lw: .85, off: 1.2 });
    cel(c, q => ell(q, 0, 0, 5.2, 3.9), '#f4ecd8', '#c9bc9a', { lw: .6, off: .9 });
    const dx = (P.x - e.x) * fx, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, ix = dx / d * 2.1, iy = dy / d * 1.2;
    const firing = e.burst > 0;
    flat(c, q => circ(q, ix, iy, 2.6), firing ? '#e8452c' : '#ffcf4a', .55);
    flat(c, q => ell(q, ix, iy, firing ? .5 : .75, 2.1), INK, 0);
    flat(c, q => circ(q, ix - .8, iy - .8, .5), '#ffffff', 0);
    detail(() => { c.strokeStyle = 'rgba(200,64,42,.5)'; c.lineWidth = .25; c.beginPath(); for (let i = 0; i < 4; i++) { const a = i * 1.5 + .4; c.moveTo(Math.cos(a) * 5, Math.sin(a) * 3.7); c.lineTo(Math.cos(a + .25) * 3.4, Math.sin(a + .25) * 2.5); } c.stroke(); });
    const bl = ((e.t * .7) % 3) < .1;
    if (bl) flat(c, q => ell(q, 0, 0, 5.2, 3.9), '#2a2040', .6);
    detail(() => { c.beginPath(); c.arc(0, 0, 5.6, Math.PI * 1.1, Math.PI * 1.4); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = .7; c.stroke(); });
  },
  // 机关楼船：会飞的楼船——木船身 + 朱漆船楼 + 帆 + 船头兽首炮；尾部螺旋桨推动墨烟
  gunship(c, e, t, P, fx) {
    const fl = 4 + Math.sin(t * 40) * 1.5;
    for (const y of [-2, 3]) flat(c, q => ell(q, 11 + fl * .6, y, fl * .7 + 1, 1.3), rgba(PAL.moRim, .8), .4);
    // 帆（竹篾撑开的扇形帆）
    cel(c, q => { q.moveTo(1, -5); q.lineTo(3.5, -15); q.quadraticCurveTo(8, -12, 9, -5.5); q.closePath(); }, PAL.paper, PAL.paperS, { lw: .75, off: .8 });
    detail(() => { c.strokeStyle = PAL.woodS; c.lineWidth = .35; c.beginPath(); for (let i = 1; i < 5; i++) { c.moveTo(1.2 + i * .1, -5); c.lineTo(3.5 + i * 1.3, -15 + i * 2.3); } c.stroke(); c.fillStyle = PAL.zhu; c.beginPath(); circ(c, 5, -9.5, 1.6); c.fill(); });
    limb(c, [2, -4, 3.5, -15.5], .6, WOOD[1], .4);
    // 船楼
    cel(c, q => q.rect(-4, -6.2, 9, 5), LAC[0], LAC[1], { lw: .75 });
    drawRoof(c, -4.6, 5.6, -9, 2.8, 2.4, '#3a2a50', '#1e1430', null, true);
    for (const x0 of [-2.6, .4, 3.2]) flat(c, q => q.rect(x0, -5, 1.6, 2.4), '#ffcf6a', .35);
    // 船身
    const hull = q => { q.moveTo(-13, -2); q.quadraticCurveTo(-10, -1.4, -6, -1.2); q.lineTo(10, -1.2); q.quadraticCurveTo(10.4, 2.6, 8, 5); q.bezierCurveTo(0, 6.6, -7, 6, -10.6, 2.6); q.closePath(); };
    cel(c, hull, WOOD[0], WOOD[1], { lw: .95, off: 1.3, hi: [-2, -.2, 7, .5, 0, .35] });
    detail(() => { c.save(); c.beginPath(); hull(c); c.clip(); c.fillStyle = PAL.gold; c.fillRect(-13, .6, 24, .8); c.strokeStyle = 'rgba(40,20,8,.5)'; c.lineWidth = .3; c.beginPath(); for (let y = 2.4; y < 6; y += 1.3) { c.moveTo(-12, y); c.lineTo(10, y); } c.stroke(); c.restore(); });
    for (const x0 of [-5, -1, 3]) flat(c, q => circ(q, x0, 3.2, .8), INK, .35);
    // 船头兽首
    cel(c, q => { q.moveTo(-10.5, -1.6); q.quadraticCurveTo(-14, -5, -16, -3); q.quadraticCurveTo(-14.6, -1.8, -15.4, .2); q.quadraticCurveTo(-13, .2, -11, 1.2); q.closePath(); }, PAL.gold, PAL.goldS, { lw: .75 });
    moEye(c, -14, -2.8, .7, false);
    // 腹部旋转炮
    const ga = Math.atan2(P.y - e.y - 5, (P.x - e.x) * fx);
    c.save(); c.translate(-1.5, 5.4); c.rotate(ga);
    cel(c, q => q.rect(1, -.8, 6.6, 1.6), DBRONZE[0], DBRONZE[1], { lw: .55 });
    flat(c, q => q.rect(6.8, -1.1, 1, 2.2), BRONZE[0], .4);
    cel(c, q => circ(q, 0, 0, 2.2), BRONZE[0], BRONZE[1], { lw: .7 });
    c.restore();
    // 船尾灯笼
    lanternShape(c, 9.6, -1.8, .55, PAL.zhu);
  },
  // 雷火灯：塞满火药的红灯笼，引信嘶嘶作响；靠近后剧烈膨胀
  mine(c, e, t) {
    const near = e.fuse !== undefined, sh = near ? Math.sin(t * 60) * .4 : 0, sw = near ? 1 + (1 - Math.max(0, e.fuse) / .55) * .18 : 1;
    c.translate(sh, Math.sin(e.t * 1.5) * .5); c.rotate(Math.sin(e.t * 1.2) * .1); c.scale(sw, sw);
    // 引信 + 火花
    limb(c, [0, -6.6, .8, -8.6, .2, -10], .4, '#5a3a2a', .3);
    const fk = ((t * 20) | 0) % 2;
    detail(() => { c.save(); c.translate(.2, -10); c.rotate(t * 10); c.beginPath(); star(c, 0, 0, 5, .5, fk ? 1.8 : 1.3, 0); c.fillStyle = near ? '#ffffff' : '#ffcf4a'; c.fill(); c.restore(); });
    flat(c, q => q.rect(-2.2, -6.8, 4.4, 1.3), PAL.gold, .5);
    const body = q => ell(q, 0, 0, 5.6, 5.8);
    cel(c, body, near && fk ? '#ff6a4a' : '#d8402a', '#7a1a10', { lw: .95, off: 1.3, hi: [-2, -2.4, 1.4, 1.1, -.5, .4] });
    detail(() => {
      c.save(); c.beginPath(); body(c); c.clip(); c.strokeStyle = 'rgba(60,10,6,.6)'; c.lineWidth = .35; c.beginPath();
      for (const k of [-.6, 0, .6]) { c.moveTo(k * 5.6, -5.8); c.quadraticCurveTo(k * 9, 0, k * 5.6, 5.8); } c.stroke(); c.restore();
    });
    // “雷”字贴 + 流苏
    flat(c, q => circ(q, 0, 0, 2.4), PAL.gold, .5);
    c.font = '3.4px ' + BRUSH; c.textAlign = 'center'; c.textBaseline = 'middle'; if (!ART.stk) { c.fillStyle = '#7a1a10'; c.fillText('雷', 0, .2); }
    flat(c, q => q.rect(-2.2, 5.4, 4.4, 1.2), PAL.gold, .5);
    for (const x0 of [-1.2, 0, 1.2]) limb(c, [x0, 6.6, x0 + Math.sin(t * 5 + x0) * .4, 9], .45, PAL.zhu, .25);
    if (near) comic(c, '!', 6, -7, 6, '#ffcf4a', 'center', { thin: true });
  },
  // 墨蝠：墨色蝙蝠，翼膜上有月白云纹；俯冲前双翼收拢、眼睛变白
  wasp(c, e, t) {
    const ch = e.dash && e.dash.t < .5, dive = e.dash && e.dash.t >= .5;
    if (ch) c.translate(rand(-.7, .7), rand(-.7, .7));
    if (dive) c.rotate(Math.atan2(e.vy, -e.vx) * .8);
    const fl = ch ? -.9 : dive ? -1.1 : Math.sin(t * 22) * .9;
    for (const s of [-1, 1]) {
      c.save(); c.scale(1, s > 0 ? 1 : .85); c.translate(s > 0 ? 0 : .6, 0);
      const wing = q => { q.moveTo(0, -.5); q.quadraticCurveTo(2 + s, -3.4 - fl * 2.4, 6.4, -2.6 - fl * 3.4); q.lineTo(5.6, -1 - fl * 2); q.lineTo(4.6, -.6 - fl * 1.2); q.lineTo(3.2, .2 - fl * .8); q.lineTo(1.6, .4); q.closePath(); };
      c.save(); c.scale(s, 1); cel(c, wing, s > 0 ? '#3a2e58' : '#241a3a', PAL.moS, { lw: .75, off: .6 }); c.restore();
      c.restore();
    }
    const body = q => ell(q, 0, .3, 2.4, 2.8);
    cel(c, body, '#2e2448', PAL.moS, { lw: .85, off: .8, hi: [-.8, -.6, .6, .8, 0, .35] });
    for (const s of [-1, 1]) flat(c, q => poly(q, [s * .6 - .6, -2, s * 1.6 - .6, -4.6, s * 2 - .6, -1.8]), '#2e2448', .6);
    for (const s of [-1, 1]) flat(c, q => ell(q, -.9 + s * .9, -.4, .6, .75), ch ? '#ffffff' : '#ffcf4a', .35);
    detail(() => { c.fillStyle = PAL.paper; c.beginPath(); poly(c, [-1.4, 1.2, -1, 2.2, -.7, 1.2]); poly(c, [-.3, 1.2, .1, 2.2, .4, 1.2]); c.fill(); });
  },
  // 机关鹤：青铜仙鹤机关，长喙改装成弩机长管；丹顶是瞄准晶石
  sniper(c, e, t, P, fx) {
    const aiming = e.aimT > 0, ga = aiming ? Math.atan2(Math.sin(e.aimA), Math.cos(e.aimA) * fx) : Math.atan2(P.y - e.y, (P.x - e.x) * fx);
    const fw = Math.sin(t * 5) * .4;
    // 翅膀（叠羽）
    for (let i = 0; i < 4; i++) { c.save(); c.translate(2, -1); c.rotate(-.5 - i * .28 + fw); cel(c, q => { q.moveTo(0, -.7); q.quadraticCurveTo(4, -1.5, 8 - i, 0); q.quadraticCurveTo(4, 1, 0, .7); q.closePath(); }, i % 2 ? PAL.paper : '#e0d6c0', PAL.paperS, { lw: .55, off: .4 }); c.restore(); }
    for (let i = 0; i < 3; i++) { c.save(); c.translate(4.8, 0); c.rotate(.5 + i * .25); flat(c, q => { q.moveTo(0, -.5); q.quadraticCurveTo(2.5, -1, 4.6 - i * .6, 0); q.quadraticCurveTo(2.5, .8, 0, .5); q.closePath(); }, INK, .4); c.restore(); }
    // 腿
    limb(c, [1, 2.4, 1.6, 6.2, .8, 8.2], .45, '#c8402a', .3);
    const body = q => { q.moveTo(-2.6, -.6); q.bezierCurveTo(-1.6, -3, 4, -3, 5.4, -.4); q.bezierCurveTo(4.6, 2.2, -.4, 3, -2.6, -.6); q.closePath(); };
    cel(c, body, PAL.paper, PAL.paperS, { lw: .85, off: 1, hi: [1, -1.8, 2, .5, 0, .45] });
    detail(() => { c.strokeStyle = 'rgba(122,90,42,.7)'; c.lineWidth = .3; c.beginPath(); for (const x0 of [0, 1.8, 3.4]) { c.moveTo(x0, -2.3); c.quadraticCurveTo(x0 + .6, 0, x0, 2.1); } c.stroke(); });
    // 颈 + 头 + 弩管喙
    c.save(); c.translate(-2, -.6);
    limb(c, [0, 0, -1.8, -3.6], 1.3, PAL.paper, .6);
    c.translate(-1.9, -4.1); c.rotate(ga);
    cel(c, q => ell(q, 0, 0, 1.9, 1.5), PAL.paper, PAL.paperS, { lw: .7 });
    flat(c, q => circ(q, -.4, -1.3, .9), aiming && ((e.aimT * 14) | 0) % 2 ? '#ffffff' : PAL.zhu, .45);
    cel(c, q => { q.moveTo(1.2, -.55); q.lineTo(11.5, -.3); q.lineTo(11.5, .3); q.lineTo(1.2, .6); q.closePath(); }, BRONZE[0], BRONZE[1], { lw: .5 });
    for (const x0 of [4, 6.5, 9]) flat(c, q => q.rect(x0, -.7, .5, 1.4), PAL.zhu, .3);
    flat(c, q => circ(q, .5, -.2, .45), INK, 0);
    if (aiming && ((e.aimT * 20) | 0) % 2) { flat(c, q => circ(q, 11.8, 0, 1.2), '#e8452c', .45); flat(c, q => circ(q, 11.8, 0, .5), '#ffffff', 0); }
    c.restore();
    talisman(c, 2.6, 1.2, -.2, .7);
  },
};
