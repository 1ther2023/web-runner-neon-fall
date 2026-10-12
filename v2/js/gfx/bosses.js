'use strict';
// ============ 六位 BOSS：“墨灾六将”（面朝右） ============
// 每位都有独立剪影 + 主色（与弹幕色一致），并共享国潮元素：云纹、金饰、朱漆。
function feather(c, x, y, a, len, w, col, sh) {
  c.save(); c.translate(x, y); c.rotate(a);
  cel(c, p => { p.moveTo(0, -w * .4); p.quadraticCurveTo(len * .5, -w, len, 0); p.quadraticCurveTo(len * .5, w * .6, 0, w * .4); p.closePath(); }, col, sh, { lw: .8 });
  c.restore();
}
function chain(c, pts, w0, w1, col, colS, joint) {
  for (let i = 0; i < pts.length - 2; i += 2) cel(c, q => bone(q, pts[i], pts[i + 1], pts[i + 2], pts[i + 3], lerp(w0, w1, i / pts.length), lerp(w0, w1, (i + 2) / pts.length)), col, colS, { lw: .8, off: .6 });
  if (joint) for (let i = 2; i < pts.length - 2; i += 4) flat(c, x => circ(x, pts[i], pts[i + 1], lerp(w0, w1, i / pts.length) * .45), joint, .45);
}
const BART = {
  // ① 赤焰金乌（朱雀系）：三足火鸟机关，展开的焰羽 + 金冠 + 胸口日轮
  vulture(c, b, t) {
    const fl = Math.sin(t * 9);
    for (let i = 0; i < 7; i++) feather(c, -3, -6, -2.35 + fl * .45 + i * .18, 28 - i * 2.4, 5.4, i % 2 ? '#e8452c' : '#ff7a3a', '#9a2418');
    // 尾羽：三条长卷羽
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + .25 - i * .25 + Math.sin(t * 3 + i) * .08, L = 22 - i * 2;
      c.save(); c.translate(-12, 0); c.rotate(a);
      cel(c, q => { q.moveTo(0, -1.2); q.bezierCurveTo(L * .4, -4, L * .8, 2, L, -1); q.quadraticCurveTo(L * .9, 2.5, L * .7, 1.6); q.bezierCurveTo(L * .4, 3, L * .2, 1, 0, 1.2); q.closePath(); }, '#f2b544', '#b07a1c', { lw: .8 });
      detail(() => { c.beginPath(); curlLine(c, L * .9, .2, 1.8, 1); c.strokeStyle = '#9a2418'; c.lineWidth = .5; c.stroke(); });
      c.restore();
    }
    for (const s of [-4, 0, 4]) { limb(c, [-1 + s, 6, -2 + s, 12, 0 + s, 15], 1.4, '#b07a1c', .7); for (const k of [-1, 0, 1]) limb(c, [s, 15, 2 + s + k * 1.4, 17], .7, '#f2b544', .45); }
    const body = q => { q.moveTo(-15, -1); q.quadraticCurveTo(-8, -10, 6, -8.5); q.quadraticCurveTo(16, -6, 13, 2); q.quadraticCurveTo(4, 9, -10, 6); q.quadraticCurveTo(-16, 4, -15, -1); q.closePath(); };
    cel(c, body, '#e8452c', '#9a2418', { lw: 1.1, hi: [-2, -6, 7, 1.4, 0, .3] });
    detail(() => { c.save(); c.beginPath(); body(c); c.clip(); c.strokeStyle = 'rgba(154,36,24,.7)'; c.lineWidth = .5; c.beginPath(); for (let y = -6; y < 7; y += 2.4) for (let x = -14 + (y % 4.8 ? 1.2 : 0); x < 14; x += 2.4) { c.moveTo(x + 1.2, y); c.arc(x, y, 1.2, 0, Math.PI); } c.stroke(); c.restore(); });
    // 胸口日轮
    flat(c, q => circ(q, 2, 0, 4), '#f2b544', .8);
    detail(() => { c.save(); c.translate(2, 0); c.rotate(t * 2); c.beginPath(); star(c, 0, 0, 8, 1.8, 3.4, 0); c.fillStyle = '#ffe8a0'; c.fill(); c.restore(); });
    flat(c, q => circ(q, 2, 0, 1.4), b.enraged ? '#ffffff' : '#e8452c', .5);
    // 头：金冠 + 弯喙
    for (let i = 0; i < 3; i++) flat(c, q => { const x0 = 10 + i * 2.6; q.moveTo(x0, -13); q.quadraticCurveTo(x0 - 1.2, -19 - i, x0 + 1, -21 - i * 1.5); q.quadraticCurveTo(x0 + 1.2, -17, x0 + 2.2, -13.4); q.closePath(); }, '#f2b544', .7);
    cel(c, q => circ(q, 14, -9, 5.6), '#e8452c', '#9a2418', { lw: 1, hi: [12.5, -11.5, 1.8, 1, -.4, .35] });
    cel(c, q => { q.moveTo(18, -11); q.quadraticCurveTo(26, -11.5, 27.5, -6); q.quadraticCurveTo(23, -7.5, 18, -6); q.closePath(); }, '#f2b544', '#b07a1c', { lw: .9 });
    flat(c, q => ell(q, 15.6, -10.2, 1.9, 1.3, -.2), '#ffe8a0', .7); flat(c, q => ell(q, 15.9, -10.2, .5, 1.1), INK, 0);
    detail(() => { c.strokeStyle = INK; c.lineWidth = .6; c.beginPath(); c.moveTo(13, -12.4); c.lineTo(18, -11.6); c.stroke(); });
    for (let i = 0; i < 5; i++) feather(c, 2, -5, -2.6 - fl * .55 + i * .2, 32 - i * 3, 5.8, i % 2 ? '#ff9a4a' : '#ffcf6a', '#c8561c');
  },
  // ② 千机傀师（机关师）：悬浮莲座上的傀儡师，背后八条榫卯机关臂，额前一枚“天眼”
  octo(c, b, t) {
    const T = [];
    for (let k = 0; k < 4; k++) {
      let x = 0, y = 6; const base = [.4, 1.2, 2.0, 2.8][k] + Math.sin(t * 2 + k) * .3, pts = [x, y];
      for (let s = 0; s < 7; s++) { const a = base + Math.sin(t * 3 + s * .6 + k) * .5; x += Math.cos(a) * 5.2; y += Math.sin(a) * 5.2; pts.push(x, y); }
      T.push({ pts, a: base + Math.sin(t * 3 + 4.2 + k) * .5 });
    }
    const blade = (x, y, a, back) => {
      c.save(); c.translate(x, y); c.rotate(a);
      cel(c, p => { p.moveTo(-1, -1.4); p.lineTo(4.5, -2.2); p.lineTo(7.5, 0); p.lineTo(4.5, 2.2); p.lineTo(-1, 1.4); p.closePath(); }, back ? '#8a9ab0' : '#d8e4f0', '#5a6a80', { lw: .75 });
      flat(c, p => circ(p, 0, 0, 1.2), '#f2b544', .5);
      c.restore();
    };
    for (const k of [0, 3]) { chain(c, T[k].pts, 3.2, 2, '#8a6a3a', '#4a3418', '#f2b544'); blade(T[k].pts[14], T[k].pts[15], T[k].a, 1); }
    // 莲座
    for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; c.save(); c.translate(0, 8); c.rotate(a + Math.PI / 2); cel(c, q => { q.moveTo(0, 0); q.quadraticCurveTo(-3, -5, 0, -9); q.quadraticCurveTo(3, -5, 0, 0); q.closePath(); }, i % 2 ? '#e8a0b0' : '#f4c8d0', '#b06070', { lw: .7 }); c.restore(); }
    // 躯干：宽袍 + 金纹
    const robe = q => { q.moveTo(-9, 8); q.quadraticCurveTo(-11, -4, -5, -9); q.lineTo(5, -9); q.quadraticCurveTo(11, -4, 9, 8); q.closePath(); };
    cel(c, robe, '#5a3f7a', '#33214d', { lw: 1.1, hi: [-4, -4, 2, 5, 0, .25] });
    detail(() => { c.save(); c.beginPath(); robe(c); c.clip(); c.strokeStyle = '#f2b544'; c.lineWidth = .5; for (const [x, y, d] of [[-5, 2, 1], [5, 4, -1], [0, -3, 1]]) { c.beginPath(); curlLine(c, x, y, 2, d); c.stroke(); } c.fillStyle = '#f2b544'; c.fillRect(-9, 5.6, 18, 1); c.restore(); });
    // 头：傀儡面 + 高冠 + 天眼
    cel(c, q => ell(q, 0, -13, 5, 5.4), '#f4ecd8', '#c9bc9a', { lw: 1, off: 1 });
    cel(c, q => { q.moveTo(-5.4, -15.4); q.lineTo(-3.6, -22); q.lineTo(3.6, -22); q.lineTo(5.4, -15.4); q.quadraticCurveTo(0, -17, -5.4, -15.4); q.closePath(); }, '#1b1633', '#0c0a18', { lw: .9 });
    flat(c, q => q.rect(-4, -20.4, 8, 1.2), '#f2b544', .5);
    flat(c, q => ell(q, 0, -16.6, 1.2, 1.8), b.enraged ? '#e8452c' : '#3fb8a8', .6);
    flat(c, q => ell(q, 0, -16.6, .35, 1.2), INK, 0);
    for (const s of [-1, 1]) flat(c, q => { q.moveTo(s * .8, -13.2); q.quadraticCurveTo(s * 2.4, -14.4, s * 3.6, -13); q.quadraticCurveTo(s * 2.2, -12.6, s * .8, -13.2); q.closePath(); }, INK, 0);
    for (const s of [-1, 1]) flat(c, q => circ(q, s * 3, -11, 1), '#e8a0b0', 0);
    detail(() => { c.strokeStyle = INK; c.lineWidth = .5; c.beginPath(); c.moveTo(-1.6, -9.6); c.quadraticCurveTo(0, -8.8, 1.6, -9.6); c.stroke(); c.strokeStyle = 'rgba(27,22,51,.5)'; c.lineWidth = .35; c.beginPath(); c.moveTo(-3, -9.5); c.lineTo(-3, -8); c.moveTo(3, -9.5); c.lineTo(3, -8); c.stroke(); });
    for (const k of [1, 2]) { chain(c, T[k].pts, 3.2, 2, '#c9a25a', '#7a5a2a', '#e8452c'); blade(T[k].pts[14], T[k].pts[15], T[k].a); }
  },
  // ③ 墨魇（墨灾之源）：巨大的墨色饕餮面——青铜兽面纹 + 金瞳 + 獠牙，身后墨焰翻卷
  venom(c, b, t) {
    for (let k = 0; k < 7; k++) {
      let x = -8, y = 0; const base = Math.PI * .6 + k * .3, pts = [x, y];
      for (let s = 0; s < 6; s++) { const a = base + Math.sin(t * 4 + s + k) * .6; x += Math.cos(a) * 6; y += Math.sin(a) * 6; pts.push(x, y); }
      for (let i = 0; i < pts.length - 2; i += 2) limb(c, [pts[i], pts[i + 1], pts[i + 2], pts[i + 3]], lerp(3.4, 1, i / pts.length), PAL.mo, .8);
    }
    const k = 1 + Math.sin(t * 5) * .05;
    c.save(); c.scale(k, 1 / k);
    cel(c, x => blobPath(x, 0, 0, 20, 7, 1.3, t * 4), '#2a2040', PAL.moS, { lw: 1.4, hi: [-6, -11, 7, 2.6, -.35, .25] });
    c.restore();
    // 饕餮纹：对称的卷角 + 眉 + 鼻梁（青铜色）
    const TT = '#c9a25a', TS = '#7a5a2a';
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1);
      cel(c, q => { q.moveTo(2, -12); q.bezierCurveTo(6, -22, 17, -20, 15, -12); q.quadraticCurveTo(13, -8, 9, -10); q.quadraticCurveTo(12, -14, 9, -15); q.quadraticCurveTo(5, -15, 4, -10); q.closePath(); }, TT, TS, { lw: .9 });
      cel(c, q => { q.moveTo(2, -7.5); q.lineTo(13, -9.5); q.lineTo(12, -6.5); q.lineTo(3, -5.2); q.closePath(); }, TT, TS, { lw: .8 });
      c.restore();
    }
    cel(c, q => { q.moveTo(-2, -9); q.lineTo(2, -9); q.lineTo(3, 1); q.lineTo(-3, 1); q.closePath(); }, TT, TS, { lw: .8 });
    for (const s of [-1, 1]) {
      flat(c, q => { q.moveTo(s * 3.5, -4); q.quadraticCurveTo(s * 8, -7, s * 12.5, -3.6); q.quadraticCurveTo(s * 8, -.6, s * 3.5, -4); q.closePath(); }, '#ffcf4a', 1);
      flat(c, q => ell(q, s * 8.2, -3.8, .9, 2.2), INK, 0);
    }
    // 巨口
    flat(c, x => { x.moveTo(-12, 3); x.quadraticCurveTo(0, 6, 12, 3); x.quadraticCurveTo(8, 14, 0, 14); x.quadraticCurveTo(-8, 14, -12, 3); x.closePath(); }, '#5a0a18', 1.1);
    if (!ART.stk) {
      c.fillStyle = PAL.paper; c.strokeStyle = INK; c.lineWidth = .4; c.beginPath();
      for (let i = 0; i < 8; i++) { const x0 = -10 + i * 2.6, y0 = 3.4 + Math.sin(i / 7 * Math.PI) * 1.5; poly(c, [x0, y0, x0 + 2.2, y0 + .3, x0 + 1.1, y0 + 3.2]); }
      for (let i = 0; i < 7; i++) { const x0 = -8.5 + i * 2.6, y0 = 13.4 - Math.sin(i / 6 * Math.PI) * 1; poly(c, [x0, y0, x0 + 2.2, y0 - .2, x0 + 1.1, y0 - 3]); }
      c.fill(); c.stroke();
      for (const s of [-1, 1]) { c.beginPath(); poly(c, [s * 9, 4, s * 7, 4.4, s * 8.6, 10]); c.fill(); c.stroke(); }
    }
  },
  // ④ 镰刃螳螂 → 刀螂将军：身披青铜札甲的螳螂武将，双臂为弯刀，背插令旗
  mantis(c, b, t) {
    const fw = Math.abs(Math.sin(t * 30));
    for (const s of [0, 1]) { c.save(); c.translate(-8 + s * 3, -9 - s * 2); c.rotate(-.35 - s * .25); limb(c, [0, 0, 0, -12], .6, '#5e3418', .4); flat(c, q => { q.moveTo(.3, -12); q.lineTo(7, -10.5 + fw); q.lineTo(7, -6 + fw); q.lineTo(.3, -7); q.closePath(); }, s ? '#3fb8a8' : '#e8452c', .6); c.restore(); }
    for (const [x0, y0, a] of [[-2, 5, .5], [2, 6, .2], [-8, 6, .9]]) limb(c, [x0, y0, x0 + Math.cos(a) * 7, y0 + 7, x0 + Math.cos(a) * 9 - 2, y0 + 13], 1.2, '#1e7468', .6);
    cel(c, x => ell(x, -12, 4, 12, 5, .3), '#3fb8a8', '#1e7468', { lw: 1, hi: [-14, 1.5, 5, 1, .3, .3] });
    detail(() => { c.save(); c.beginPath(); ell(c, -12, 4, 12, 5, .3); c.clip(); c.strokeStyle = 'rgba(30,116,104,.9)'; c.lineWidth = .5; c.beginPath(); for (const x0 of [-17, -13, -9]) { c.moveTo(x0, -.5); c.lineTo(x0 - 1.8, 8.5); } c.stroke(); c.restore(); });
    const sw = (i) => Math.sin(t * 2.6 + i * 1.6) * .35 + (b.dash ? -.6 : 0);
    const arm = (i, dark) => {
      c.save(); c.translate(4, -5); c.rotate(sw(i) - .3 * i);
      limb(c, [0, 0, 7, -8], 2.4, dark ? '#1e7468' : '#4ac8a0', .8);
      limb(c, [7, -8, 12, -3], 2, dark ? '#1e7468' : '#4ac8a0', .8);
      cel(c, x => { x.moveTo(12, -3); x.quadraticCurveTo(24, -8, 26, 6); x.quadraticCurveTo(20, -2, 11.5, -.5); x.closePath(); }, dark ? '#a8bccc' : '#eef4f8', '#7a90a8', { lw: .9 });
      detail(() => { c.strokeStyle = '#f2b544'; c.lineWidth = .6; c.beginPath(); c.moveTo(12, -3); c.lineTo(12.4, -.6); c.stroke(); });
      c.restore();
    };
    arm(1, true);
    const torso = x => rrect(x, -4, -9, 10, 15, 5);
    cel(c, torso, BRONZE[0], BRONZE[1], { lw: 1, hi: [-1, -6, 2, 3, 0, .35] });
    detail(() => { c.save(); c.beginPath(); torso(c); c.clip(); c.strokeStyle = 'rgba(74,52,24,.8)'; c.lineWidth = .35; c.beginPath(); for (let y = -8; y < 6; y += 1.6) for (let x = -4 + (y * 10 % 2 ? 1 : 0); x < 6; x += 2) { c.moveTo(x, y); c.lineTo(x, y + 1.4); c.lineTo(x + 2, y + 1.4); } c.stroke(); c.fillStyle = PAL.zhu; c.fillRect(-4, 1.5, 10, 1.4); c.restore(); });
    // 头盔 + 复眼 + 触须
    cel(c, x => poly(x, [3, -17, 15, -13, 7, -7]), '#4ac8a0', '#248058', { lw: 1 });
    flat(c, q => { q.moveTo(2, -16); q.quadraticCurveTo(6, -21, 11, -17.5); q.lineTo(7, -15); q.closePath(); }, '#f2b544', .7);
    limb(c, [7, -16, 5, -24, 1, -27], .5, '#1e7468', .3); limb(c, [9, -15, 10, -23, 14, -26], .5, '#1e7468', .3);
    flat(c, x => ell(x, 9, -13.6, 2.6, 1.8, .2), b.enraged ? '#ffffff' : '#e8452c', .7);
    flat(c, x => circ(x, 8.3, -14.2, .5), '#ffffff', 0);
    arm(0, false);
  },
  // ⑤ 蜂巢女王 → 金蜂娘娘：头戴凤冠的金色巨蜂，腹部是雕花蜂巢宫灯
  hive(c, b, t) {
    const bz = Math.abs(Math.sin(t * 50));
    for (const s of [0, 1]) flat(c, x => ell(x, -2 + s * 5, -12 - s, 10, 3 + bz * 2.5, -.6 + s * .4), 'rgba(255,245,210,.5)', .6);
    flat(c, x => poly(x, [-22, 10, -30, 15, -21, 13.5]), '#f4ecd8', .7);
    const abd = x => ell(x, -10, 5, 13, 9.5, .25);
    cel(c, abd, '#f2b544', '#b07a1c', { lw: 1.1 });
    if (!ART.stk) {
      c.save(); c.beginPath(); abd(c); c.clip();
      c.fillStyle = INK; for (const x0 of [-18, -11, -4]) { c.beginPath(); c.ellipse(x0, 5, 2, 12, .25, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(120,70,0,.55)'; c.lineWidth = .4; c.beginPath();
      for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) { const hx = -22 + i * 4 + (j % 2) * 2, hy = -3 + j * 3.6; for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU; k ? c.lineTo(hx + Math.cos(a) * 1.9, hy + Math.sin(a) * 1.9) : c.moveTo(hx + 1.9, hy); } }
      c.stroke(); c.restore();
    }
    // 腹下垂挂的流苏
    for (let i = 0; i < 4; i++) { const x0 = -16 + i * 4; limb(c, [x0, 12 + i * .3, x0 + Math.sin(t * 3 + i) * .8, 17], .6, PAL.zhu, .3); }
    for (const [x0, a] of [[-1, .3], [3, .1], [6, -.1]]) limb(c, [x0, 5, x0 + Math.sin(a) * 4, 11, x0 - 2, 15], 1.1, '#2a2040', .6);
    cel(c, x => circ(x, 3, -3, 7), '#5a3f7a', '#33214d', { lw: 1, hi: [1, -6, 2.4, 1.3, -.4, .3] });
    detail(() => { c.strokeStyle = '#f2b544'; c.lineWidth = .5; c.beginPath(); curlLine(c, 3, -2, 2.6, 1); c.stroke(); });
    cel(c, x => circ(x, 11, -9, 5.4), '#f2b544', '#b07a1c', { lw: 1 });
    // 凤冠
    flat(c, x => poly(x, [6.5, -13.5, 7.2, -19.5, 9.4, -15.4, 11, -21, 12.6, -15.4, 14.8, -19.5, 15.4, -13]), '#f2b544', .8);
    for (const [x0, y0] of [[9.4, -17.6], [11, -19.4], [12.8, -17.6]]) flat(c, x => circ(x, x0, y0, .7), PAL.zhu, 0);
    for (let i = 0; i < 3; i++) limb(c, [7 + i * 1.5, -13.4, 6.4 + i * 1.5, -10 + Math.sin(t * 4 + i) * .5], .35, '#f4ecd8', .2);
    flat(c, x => ell(x, 13.2, -9, 2.6, 3.2, .2), b.enraged ? '#e8452c' : INK, .7);
    if (!ART.stk) { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); ell(c, 12.6, -10.4, .9, .6); c.fill(); }
    limb(c, [15, -6, 17.5, -3.8], .8, '#33214d', .45);
  },
  // ⑥ 幽灵程序 → 皮影判官：巨大的皮影戏偶，由三根操纵杆悬吊；镂空纹样与关节铆钉
  ghost(c, b, t) {
    const gl = ((t * 7) | 0) % 6 === 0;
    // 操纵杆（从画面外伸入）
    for (const [x0, y0] of [[-4, -12], [8, 3], [-10, 6]]) line(c, x0, y0, x0 + 8, y0 - 40, rgba(PAL.woodS, .9), .8);
    const leather = '#d8a860', leatherS = '#8a5a28';
    // 后臂
    const arm = (x0, y0, ph, dark) => { const a = Math.sin(t * 3 + ph) * .5; c.save(); c.translate(x0, y0); c.rotate(.8 + a); cel(c, q => bone(q, 0, 0, 7, 0, 1.6, 1.2), dark ? leatherS : leather, '#5a3418', { lw: .7 }); c.translate(7, 0); c.rotate(-.8 + a * .6); cel(c, q => bone(q, 0, 0, 6, 0, 1.2, 1), dark ? leatherS : leather, '#5a3418', { lw: .7 }); flat(c, q => circ(q, 0, 0, .6), '#f2b544', .3); cel(c, q => ell(q, 7, 0, 1.8, 1.2), dark ? leatherS : leather, '#5a3418', { lw: .6 }); c.restore(); };
    arm(-8, -4, 0, true);
    c.save(); if (gl) c.translate(rand(-1.5, 1.5), 0);
    // 官袍：镂空花纹
    const robe = q => { q.moveTo(-12, -8); q.lineTo(10, -8); q.lineTo(14, 16); q.lineTo(-16, 16); q.closePath(); };
    cel(c, robe, '#8a1e2a', '#4a0c16', { lw: 1.2 });
    if (!ART.stk) {
      c.save(); c.beginPath(); robe(c); c.clip();
      c.fillStyle = 'rgba(18,13,28,.75)';
      for (let y = -4; y < 16; y += 5) for (let x = -14 + (y % 10 ? 2.5 : 0); x < 14; x += 5) { c.beginPath(); star(c, x, y, 4, .7, 1.8, .4); c.fill(); }
      c.fillStyle = '#f2b544'; c.fillRect(-14, 3, 28, 1.6); c.restore();
    }
    // 腰带玉牌
    flat(c, q => rrect(q, -2, 1.6, 4, 4.4, .6), '#7fd8b0', .6);
    // 头：判官脸谱 + 乌纱帽（左右展翅）
    cel(c, q => ell(q, 0, -14, 6, 6.6), '#e8452c', '#9a2418', { lw: 1.1 });
    detail(() => {
      c.fillStyle = INK; c.beginPath();
      for (const s of [-1, 1]) { c.moveTo(s * .8, -16); c.quadraticCurveTo(s * 4, -19, s * 5.6, -15.4); c.quadraticCurveTo(s * 3.6, -14, s * .8, -16); }
      c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); ell(c, 0, -10, 2.2, 1.4); c.fill();
      c.strokeStyle = INK; c.lineWidth = .7; c.beginPath(); c.moveTo(0, -13.6); c.lineTo(0, -11.2); c.stroke();
      // 胡须
      c.lineWidth = .6; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(i * 1.2, -8.2); c.quadraticCurveTo(i * 1.8, -4, i * 1.4 + Math.sin(t * 3 + i) * .6, -1); } c.stroke();
    });
    const ec = b.enraged ? '#ffffff' : '#ffcf4a', blinkE = ((t * 1.3) % 3) < .12;
    for (const s of [-1, 1]) flat(c, q => ell(q, s * 2.6, -15, 1.2, blinkE ? .15 : .9), ec, .4);
    cel(c, q => { q.moveTo(-6, -18); q.lineTo(-4.6, -24.6); q.lineTo(4.6, -24.6); q.lineTo(6, -18); q.closePath(); }, INK, '#000', { lw: .9 });
    for (const s of [-1, 1]) { const fl = Math.sin(t * 4 + s) * .6; flat(c, q => ell(q, s * 10, -21 + fl * s, 4.6, 1.3, s * .12), INK, .7); flat(c, q => ell(q, s * 10, -21 + fl * s, 3.4, .5, s * .12), '#f2b544', 0); }
    flat(c, q => q.rect(-4.6, -20.6, 9.2, 1), '#f2b544', 0);
    if (gl && !ART.stk) { c.fillStyle = 'rgba(232,69,44,.35)'; c.fillRect(-16, rand(-24, 12), 30, rand(1, 3)); }
    c.restore();
    arm(8, -5, 2, false);
    // 判官笔
    const pa = Math.sin(t * 3 + 2) * .5;
    c.save(); c.translate(8, -5); c.rotate(.8 + pa); c.translate(7, 0); c.rotate(-.8 + pa * .6); c.translate(7, 0); c.rotate(-1.2);
    limb(c, [0, 0, 10, 0], 1, PAL.wood, .5); flat(c, q => { q.moveTo(10, -1.1); q.quadraticCurveTo(13, 0, 14.5, 0); q.quadraticCurveTo(13, 0, 10, 1.1); q.closePath(); }, INK, .4);
    c.restore();
  },
};
