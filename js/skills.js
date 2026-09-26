'use strict';
// ============ 装备（精英掉落，金币强化，Lv4 MAX） ============
const EQUIPS = [
  { id: 'suit', ico: '🦺', nm: '纳米战衣', ds: lv => '最大生命 +' + [20, 40, 65, 100][lv - 1] },
  { id: 'armor', ico: '🛡️', nm: '凯夫拉护甲', ds: lv => '受到伤害 -' + [8, 15, 22, 30][lv - 1] + '%' },
  { id: 'helmet', ico: '🎯', nm: '蜘蛛感应头盔', ds: lv => '暴击率 +' + [6, 12, 18, 25][lv - 1] + '%，暴伤 +' + [20, 40, 60, 90][lv - 1] + '%' },
  { id: 'glove', ico: '🧲', nm: '磁力手套', ds: lv => '拾取范围 +' + [40, 80, 120, 180][lv - 1] + '%，经验 +' + [10, 20, 30, 45][lv - 1] + '%' },
  { id: 'charm', ico: '🩸', nm: '共生护符', ds: lv => '每秒额外回复 ' + [.4, .8, 1.2, 1.8][lv - 1] + ' 生命' },
  { id: 'shooter', ico: '⚙️', nm: '高速发射器', ds: lv => '所有技能冷却 -' + [8, 15, 22, 30][lv - 1] + '%' },
  { id: 'band', ico: '💪', nm: '力量腕带', ds: lv => '所有伤害 +' + [12, 25, 40, 60][lv - 1] + '%' },
  { id: 'core', ico: '🔋', nm: '风暴核心', ds: lv => '风暴充能 +' + [25, 50, 80, 120][lv - 1] + '%，擦弹范围扩大' },
];
const EQ_MAX = 4, EQ_SLOTS = 6, SK_MAX = 10, SK_SLOTS = 5;

// ============ 装备升级路线：Lv1→2 时三选一锁定，Lv3/Lv4 沿路线深化 ============
const pct = v => Math.round(v * 100) + '%';
const EQ_ROUTES = {
  suit: [
    { nm: '重装', ds: k => '最大生命额外 +' + [30, 60, 100][k - 1] + (k >= 3 ? '；受伤后无敌 +0.5 秒' : ''), ap: (S, k) => { S.hpAdd += [30, 60, 100][k - 1]; if (k >= 3) S.invBonus += .5; } },
    { nm: '再生', ds: k => '每秒额外回复 ' + [.5, 1, 1.6][k - 1] + ' 生命' + (k >= 3 ? '；击杀回复 1 生命' : ''), ap: (S, k) => { S.regen += [.5, 1, 1.6][k - 1]; if (k >= 3) S.killHeal += 1; } },
    { nm: '反应装甲', ds: k => '受击时爆发冲击，造成 ' + [20, 40, 70][k - 1] + ' 伤害并清除周围子弹', ap: (S, k) => { S.thorns += [20, 40, 70][k - 1]; } },
  ],
  armor: [
    { nm: '坚壁', ds: k => '受到伤害额外 -' + pct([.06, .12, .18][k - 1]), ap: (S, k) => { S.armor += [.06, .12, .18][k - 1]; } },
    { nm: '能量护盾', ds: k => '每 ' + [14, 11, 8][k - 1] + ' 秒生成护盾，完全抵挡一次伤害', ap: (S, k) => { S.shieldCD = [14, 11, 8][k - 1]; } },
    { nm: '闪避', ds: k => '闪避率 +' + pct([.06, .12, .2][k - 1]), ap: (S, k) => { S.dodge += [.06, .12, .2][k - 1]; } },
  ],
  helmet: [
    { nm: '致命', ds: k => '暴击伤害额外 +' + pct([.3, .6, 1][k - 1]), ap: (S, k) => { S.critMul += [.3, .6, 1][k - 1]; } },
    { nm: '精准', ds: k => '暴击率额外 +' + pct([.06, .12, .2][k - 1]), ap: (S, k) => { S.crit += [.06, .12, .2][k - 1]; } },
    { nm: '危险感知', ds: k => '擦弹范围 +' + [3, 6, 10][k - 1] + '，每次擦弹回复 ' + [.3, .6, 1][k - 1] + ' 生命', ap: (S, k) => { S.grazeR += [3, 6, 10][k - 1]; S.grazeHeal += [.3, .6, 1][k - 1]; } },
  ],
  glove: [
    { nm: '贪婪', ds: k => '金币获取 +' + pct([.2, .4, .7][k - 1]), ap: (S, k) => { S.coinMul += [.2, .4, .7][k - 1]; } },
    { nm: '学识', ds: k => '经验获取额外 +' + pct([.15, .3, .5][k - 1]), ap: (S, k) => { S.xpMul += [.15, .3, .5][k - 1]; } },
    { nm: '蛛丝强化', ds: k => '蛛丝射程 +' + pct([.1, .2, .35][k - 1]) + '，收丝速度提升', ap: (S, k) => { S.range *= 1 + [.1, .2, .35][k - 1]; S.reel += [8, 16, 28][k - 1]; } },
  ],
  charm: [
    { nm: '吸血', ds: k => '每次击杀回复 ' + [1, 2, 3][k - 1] + ' 生命', ap: (S, k) => { S.killHeal += [1, 2, 3][k - 1]; } },
    { nm: '狂怒', ds: k => '生命低于 50% 时伤害 +' + pct([.2, .4, .7][k - 1]), ap: (S, k) => { S.lowHpDmg += [.2, .4, .7][k - 1]; } },
    { nm: '涅槃', ds: k => '战斗阵亡时复活一次，恢复 ' + pct([.3, .5, .8][k - 1]) + ' 生命', ap: (S, k) => { S.revive = [.3, .5, .8][k - 1]; } },
  ],
  shooter: [
    { nm: '超频', ds: k => '技能冷却额外 -' + pct([.06, .12, .2][k - 1]), ap: (S, k) => { S.cdMul -= [.06, .12, .2][k - 1]; } },
    { nm: '穿甲', ds: k => '弹药穿透 +' + [1, 1, 2][k - 1] + '，抵消敌弹 +' + k, ap: (S, k) => { S.pierceBonus += [1, 1, 2][k - 1]; S.cancelBonus += k; } },
    { nm: '连发', ds: k => '弹速 +' + pct([.15, .3, .5][k - 1]) + (k >= 3 ? '；蛛网弹 +1 发' : ''), ap: (S, k) => { S.shotSpd += [.15, .3, .5][k - 1]; if (k >= 3) S.extraShot += 1; } },
  ],
  band: [
    { nm: '屠戮', ds: k => '所有伤害额外 +' + pct([.12, .25, .4][k - 1]), ap: (S, k) => { S.dmgMul += [.12, .25, .4][k - 1]; } },
    { nm: '猎首', ds: k => '对 BOSS 与精英伤害 +' + pct([.2, .4, .7][k - 1]), ap: (S, k) => { S.bossDmg += [.2, .4, .7][k - 1]; } },
    { nm: '处决', ds: k => '普通敌人生命低于 ' + pct([.15, .25, .4][k - 1]) + ' 时直接处决', ap: (S, k) => { S.execute = [.15, .25, .4][k - 1]; } },
  ],
  core: [
    { nm: '充能', ds: k => '风暴充能额外 +' + pct([.3, .6, 1][k - 1]), ap: (S, k) => { S.stormMul += [.3, .6, 1][k - 1]; } },
    { nm: '延时', ds: k => '万丝风暴持续 +' + [1, 2, 3.5][k - 1] + ' 秒', ap: (S, k) => { S.ultDur += [1, 2, 3.5][k - 1]; } },
    { nm: '余震', ds: k => '万丝风暴伤害 +' + pct([.4, .8, 1.5][k - 1]), ap: (S, k) => { S.ultDmg += [.4, .8, 1.5][k - 1]; } },
  ],
};
const ROUTE_TAG = ['A', 'B', 'C'];

const Equip = {
  owned: [], ups: 0,
  reset() { this.owned = []; this.ups = 0; },
  lv(id) { const e = this.owned.find(o => o.id === id); return e ? e.lv : 0; },
  get(id) { return this.owned.find(o => o.id === id); },
  add(id) { this.owned.push({ id, lv: 1, route: -1 }); recalcStats(); },
  up(id, route) { const e = this.get(id); if (e && e.lv < EQ_MAX) { if (e.route < 0) e.route = route; e.lv++; recalcStats(); } },
  upgradable() { return this.owned.filter(o => o.lv < EQ_MAX); },
  cost() { const u = this.ups; return 30 + u * 30 + u * u * 8; },
};

const Stats = {};
function recalcStats() {
  const L = id => Equip.lv(id), t = (arr, id) => L(id) ? arr[L(id) - 1] : 0;
  const oldMax = Player.maxHp || 100;
  Object.assign(Stats, {
    dmgMul: 1 + t([.12, .25, .4, .6], 'band'),
    cdMul: 1 - t([.08, .15, .22, .3], 'shooter'),
    crit: .06 + t([.06, .12, .18, .25], 'helmet'),
    critMul: 2 + t([.2, .4, .6, .9], 'helmet'),
    armor: t([.08, .15, .22, .3], 'armor'),
    magnet: 50 * (1 + t([.4, .8, 1.2, 1.8], 'glove')),
    xpMul: 1 + t([.1, .2, .3, .45], 'glove'),
    regen: .5 + t([.4, .8, 1.2, 1.8], 'charm'),
    stormMul: 1 + t([.25, .5, .8, 1.2], 'core'),
    grazeR: 13 + t([2, 4, 6, 9], 'core'),
    range: 190, reel: 20, dodge: 0,
    hpAdd: 0, invBonus: 0, killHeal: 0, thorns: 0, shieldCD: 0, grazeHeal: 0, coinMul: 1, lowHpDmg: 0, revive: 0,
    pierceBonus: 0, cancelBonus: 0, shotSpd: 1, extraShot: 0, bossDmg: 0, execute: 0, ultDur: 0, ultDmg: 0,
  });
  for (const o of Equip.owned) if (o.route >= 0 && o.lv > 1) EQ_ROUTES[o.id][o.route].ap(Stats, o.lv - 1);
  Stats.cdMul = Math.max(.35, Stats.cdMul);
  const newMax = 100 + t([20, 40, 65, 100], 'suit') + Stats.hpAdd;
  if (Player.maxHp !== undefined && newMax > oldMax) Player.hp += newMax - oldMax;
  Player.maxHp = newMax;
}

// ============ 技能（能量经验升级，Lv10 MAX） ============
const cd = base => base * Stats.cdMul;
const SKILLS = [
  { id: 'web', ico: '🕸️', nm: '蛛网弹', ds: '自动向最近敌人发射蛛网弹，高等级多发并穿透',
    st: lv => ({ rate: 2.6 + lv * .28, n: 1 + Math.floor(lv / 3) + Stats.extraShot, dmg: 4 + lv * 1.3, pierce: lv >= 10 ? 2 : lv >= 5 ? 1 : 0 }),
    update(s, lv, dt) {
      const P = Player, S = this.st(lv); s.t -= dt;
      if (s.t > 0) return;
      // 拦截：附近有来袭子弹时，交替优先射击子弹
      s.alt = !s.alt;
      if (s.alt) {
        let tb = null, bd = 85 * 85;
        for (const b of EB.list) { if (b.delay > 0) continue; const dd = d2(P.x, P.y, b.x, b.y); if (dd < bd && (P.x - b.x) * b.vx + (P.y - b.y) * b.vy > 0) { bd = dd; tb = b; } }
        if (tb) {
          s.t = cd(1 / S.rate) / (G.ultT > 0 ? 2 : 1);
          const tt = Math.sqrt(bd) / 380, a = angTo(P.x, P.y - 4, tb.x + tb.vx * tt, tb.y + tb.vy * tt);
          for (let i = 0; i < S.n; i++) Shots.fire(P.x, P.y - 4, a + (i - (S.n - 1) / 2) * .12, S.dmg, { pierce: S.pierce });
          Sfx.play('shoot'); return;
        }
      }
      const t = findTarget(P.x, P.y, 300); if (!t) { s.t = .05; return; }
      s.t = cd(1 / S.rate) / (G.ultT > 0 ? 2 : 1);
      const lead = Math.hypot(t.x - P.x, t.y - P.y) / 380, a = angTo(P.x, P.y - 4, t.x + (t.vx || 0) * lead, t.y + (t.vy || 0) * lead);
      for (let i = 0; i < S.n; i++) Shots.fire(P.x, P.y - 4, a + (i - (S.n - 1) / 2) * .12, S.dmg, { pierce: S.pierce });
      Sfx.play('shoot');
    } },
  { id: 'orbit', ico: '🌀', nm: '丝刃环', ds: '丝刃环绕身体旋转，切割敌人并抵消子弹',
    st: lv => ({ n: [2, 2, 3, 3, 3, 4, 4, 4, 5, 6][lv - 1], dmg: 4 + lv * 1.6, r: 24 + lv * 1.2 }),
    pos(i, n, r) { const a = G.time * 4.2 + i * TAU / n; return [Player.x + Math.cos(a) * r, Player.y + Math.sin(a) * r]; },
    update(s, lv) {
      const S = this.st(lv);
      for (let i = 0; i < S.n; i++) {
        const [ox, oy] = this.pos(i, S.n, S.r);
        for (const e of allTargets()) { const rr = (e.r || 20) + 5; if (d2(ox, oy, e.x, e.y) < rr * rr && !(e.orbCD > G.time)) { e.orbCD = G.time + .25; damageEnemy(e, S.dmg, rollCrit()); FX.spark(ox, oy, 4, '#8af0ff', 100, .2); } }
        for (let j = EB.list.length - 1; j >= 0; j--) { const b = EB.list[j]; if (d2(ox, oy, b.x, b.y) < 49) { FX.spark(b.x, b.y, 3, b.col, 60, .2); EB.list.splice(j, 1); } }
      }
    },
    draw(ctx, cx, lv) {
      const S = this.st(lv);
      for (let i = 0; i < S.n; i++) {
        const [x, y] = this.pos(i, S.n, S.r), a = G.time * 20;
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSpr('#8af0ff', 4), x - cx - 8, y - 8, 16, 16); ctx.globalCompositeOperation = 'source-over';
        pxLine(ctx, x - cx - Math.cos(a) * 4, y - Math.sin(a) * 4, x - cx + Math.cos(a) * 4, y + Math.sin(a) * 4, '#fff', 1);
        pxLine(ctx, x - cx + Math.sin(a) * 4, y - Math.cos(a) * 4, x - cx - Math.sin(a) * 4, y + Math.cos(a) * 4, '#8af0ff', 1);
      }
    } },
  { id: 'swarm', ico: '🕷️', nm: '追猎蛛群', ds: '周期放出一群自动追踪敌人的小蜘蛛',
    st: lv => ({ cd: 3.6 - lv * .16, n: 2 + lv, dmg: 5 + lv * 1.4 }),
    update(s, lv, dt) {
      const S = this.st(lv), P = Player; s.t -= dt;
      if (s.t > 0 || !findTarget(P.x, P.y, 300)) return;
      s.t = cd(S.cd);
      for (let k = 0; k < S.n; k++) Shots.fire(P.x, P.y, rand(0, TAU), S.dmg, { col: '#ff5a6a', kind: 'mini', speed: 220, homing: 7, life: 1.8, pierce: 0 });
    } },
  { id: 'claw', ico: '🦾', nm: '钢铁蛛爪', ds: '背后钢爪周期横扫周围敌人并清除子弹',
    st: lv => ({ cd: 2.4 - lv * .1, r: 40 + lv * 4, dmg: 10 + lv * 4 }),
    update(s, lv, dt) {
      const S = this.st(lv), P = Player; s.t -= dt; s.a = Math.max(0, (s.a || 0) - dt);
      if (s.t > 0 || !findTarget(P.x, P.y, S.r + 10)) return;
      s.t = cd(S.cd); s.a = .25; Sfx.play('slash'); addShake(2);
      for (const e of allTargets()) { const rr = S.r + (e.r || 20); if (d2(P.x, P.y, e.x, e.y) < rr * rr) damageEnemy(e, S.dmg, rollCrit()); }
      for (let j = EB.list.length - 1; j >= 0; j--) { const b = EB.list[j]; if (d2(P.x, P.y, b.x, b.y) < S.r * S.r) EB.list.splice(j, 1); }
    },
    draw(ctx, cx, lv, s) {
      const S = this.st(lv), P = Player, k = (s.a || 0) / .25;
      for (let i = 0; i < 4; i++) {
        const base = -Math.PI / 2 + (i - 1.5) * .5, a = s.a > 0 ? base + (1 - k) * TAU * (i % 2 ? 1 : -1) : base + Math.sin(G.time * 3 + i) * .2;
        const len = s.a > 0 ? S.r : 12, mx = P.x - cx + Math.cos(a) * len * .5, my = P.y - 8 + Math.sin(a) * len * .5;
        pxLine(ctx, P.x - cx, P.y - 4, mx, my, '#8a8a9a', 2); pxLine(ctx, mx, my, P.x - cx + Math.cos(a) * len, P.y - 4 + Math.sin(a) * len, '#ffcf4a', 1);
      }
      if (s.a > 0) { ctx.globalAlpha = k; pxRing(ctx, P.x - cx, P.y, S.r * (1.2 - k * .2), '#ffcf4a', 2); ctx.globalAlpha = 1; }
    } },
  { id: 'chain', ico: '🌩️', nm: '电光蛛网', ds: '周期释放连锁闪电，在敌人间跳跃',
    st: lv => ({ cd: 2.2 - lv * .1, jumps: 2 + Math.floor(lv / 2), dmg: 8 + lv * 3 }),
    update(s, lv, dt) {
      const S = this.st(lv), P = Player; s.t -= dt;
      if (s.t > 0) return;
      const t = findTarget(P.x, P.y, 220); if (!t) return;
      s.t = cd(S.cd); FX.bolt(P.x, P.y, t.x, t.y); damageEnemy(t, S.dmg, rollCrit()); chainZap(t, S.dmg * .8, S.jumps);
    } },
  { id: 'bot', ico: '🤖', nm: '机械蜘蛛', ds: '召唤环绕你的机械蜘蛛自动射击',
    st: lv => ({ n: 1 + Math.floor(lv / 4), iv: .62 - lv * .025, dmg: 3 + lv * 1.1 }),
    pos(i, n) { const a = G.time * 2.2 + i * TAU / n; return [Player.x + Math.cos(a) * 18, Player.y - 8 + Math.sin(a) * 9]; },
    update(s, lv, dt) {
      const S = this.st(lv); s.ts = s.ts || [0, .2, .4];
      for (let i = 0; i < S.n; i++) {
        s.ts[i] -= dt; if (s.ts[i] > 0) continue;
        const [bx, by] = this.pos(i, S.n), t = findTarget(bx, by, 260);
        if (t) { Shots.fire(bx, by, angTo(bx, by, t.x, t.y), S.dmg, { col: '#ffe04a', kind: 'mini', speed: 360, pierce: 0 }); s.ts[i] = cd(S.iv); } else s.ts[i] = .1;
      }
    },
    draw(ctx, cx, lv) {
      const S = this.st(lv);
      for (let i = 0; i < S.n; i++) {
        const [x, y] = this.pos(i, S.n), X = Math.round(x - cx), Y = Math.round(y);
        ctx.fillStyle = '#222'; ctx.fillRect(X - 2, Y - 1, 5, 3); ctx.fillStyle = '#ffe04a'; ctx.fillRect(X - 1, Y - 2, 3, 1);
        ctx.fillStyle = '#ff3040'; ctx.fillRect(X + 1, Y, 1, 1);
        ctx.fillStyle = '#888'; const l = (G.time * 20 | 0) % 2; ctx.fillRect(X - 3, Y + 1 + l, 1, 1); ctx.fillRect(X + 3, Y + 2 - l, 1, 1);
      }
    } },
  { id: 'cocoon', ico: '💣', nm: '爆裂蛛茧', ds: '向敌群投掷蛛茧炸弹，落地大范围爆炸',
    st: lv => ({ cd: 2.9 - lv * .12, n: 1 + Math.floor(lv / 4), r: 24 + lv * 2, dmg: 12 + lv * 4.5 }),
    update(s, lv, dt) {
      const S = this.st(lv), P = Player; s.t -= dt;
      if (s.t > 0) return;
      const ts = allTargets().filter(onScreen); if (!ts.length) return;
      s.t = cd(S.cd);
      for (let i = 0; i < S.n; i++) { const t = pick(ts); Bombs.add(P.x, P.y, t.x, t.y, S.r, S.dmg); }
    } },
  { id: 'beam', ico: '🔆', nm: '蛛丝激光', ds: '凝聚蛛丝发射贯穿一切的高能光束',
    st: lv => ({ cd: 3.6 - lv * .16, w: 4 + Math.floor(lv / 3), dmg: 16 + lv * 6 }),
    update(s, lv, dt) {
      const S = this.st(lv), P = Player; s.t -= dt;
      if (s.t > 0) return;
      const t = findTarget(P.x, P.y, 320); if (!t) return;
      s.t = cd(S.cd);
      const a = angTo(P.x, P.y, t.x, t.y), dx = Math.cos(a), dy = Math.sin(a);
      PBeams.push({ x: P.x, y: P.y, a, w: S.w, life: .3 });
      for (const e of allTargets()) { const px = e.x - P.x, py = e.y - P.y, pr = px * dx + py * dy; if (pr > 0 && Math.abs(px * dy - py * dx) < S.w / 2 + (e.r || 18)) damageEnemy(e, S.dmg, rollCrit()); }
      for (let j = EB.list.length - 1; j >= 0; j--) { const b = EB.list[j], px = b.x - P.x, py = b.y - P.y; if (px * dx + py * dy > 0 && Math.abs(px * dy - py * dx) < S.w / 2 + b.r + 3) { FX.spark(b.x, b.y, 3, b.col, 70, .2); EB.list.splice(j, 1); } }
      Sfx.play('laser'); addShake(3);
    } },
  { id: 'nova', ico: '✴️', nm: '蛛网新星', ds: '向四面八方爆发一圈蛛网弹幕',
    st: lv => ({ cd: 3.2 - lv * .13, n: 10 + lv * 2, dmg: 4 + lv * 1.3 }),
    update(s, lv, dt) {
      const S = this.st(lv), P = Player; s.t -= dt;
      if (s.t > 0 || !findTarget(P.x, P.y, 260)) return;
      s.t = cd(S.cd); const off = rand(0, TAU);
      for (let i = 0; i < S.n; i++) Shots.fire(P.x, P.y, off + i / S.n * TAU, S.dmg, { col: '#ff9ad0', speed: 300, life: .7, pierce: 1 });
      FX.ring(P.x, P.y, 3, 30, .25, '#ff9ad0'); Sfx.play('zap');
    } },
  { id: 'sonic', ico: '💨', nm: '荡击音爆', ds: '高速放手时释放音爆冲击波，粉碎周围子弹',
    st: lv => ({ r: 45 + lv * 5, dmg: 8 + lv * 3.5, cd: 1.6 - lv * .06 }),
    update(s, lv, dt) { s.t -= dt; },
    trigger(s, lv) {
      if (s.t > 0) return; const S = this.st(lv), P = Player; s.t = cd(S.cd);
      FX.ring(P.x, P.y, 4, S.r, .3, '#e8f4ff', 2); FX.ring(P.x, P.y, 2, S.r * .6, .2, '#8af0ff');
      for (const e of allTargets()) { const rr = S.r + (e.r || 20); if (d2(P.x, P.y, e.x, e.y) < rr * rr) damageEnemy(e, S.dmg, rollCrit()); }
      for (let j = EB.list.length - 1; j >= 0; j--) { const b = EB.list[j]; if (d2(P.x, P.y, b.x, b.y) < S.r * S.r) { FX.spark(b.x, b.y, 2, b.col, 60, .2); EB.list.splice(j, 1); } }
      addShake(3); Sfx.play('slash');
    } },
];
const SKMAP = {}; SKILLS.forEach(s => SKMAP[s.id] = s);
function rollCrit() { return Math.random() < Stats.crit; }

const Skills = {
  owned: [], // {id, lv, s:state}
  reset() { this.owned = [{ id: 'web', lv: 1, s: { t: 0 } }]; },
  lv(id) { const o = this.owned.find(o => o.id === id); return o ? o.lv : 0; },
  roll() {
    const pool = [];
    for (const o of this.owned) if (o.lv < SK_MAX) pool.push({ kind: 'skill', id: o.id, lv: o.lv });
    if (this.owned.length < SK_SLOTS) for (const s of SKILLS) if (!this.lv(s.id)) pool.push({ kind: 'skill', id: s.id, lv: 0 });
    const out = []; while (out.length < 3 && pool.length) out.push(pool.splice(randi(0, pool.length - 1), 1)[0]);
    return out;
  },
  take(id) {
    const o = this.owned.find(o => o.id === id);
    if (o) o.lv = Math.min(SK_MAX, o.lv + 1); else this.owned.push({ id, lv: 1, s: { t: .5 } });
  },
  update(dt) { if (!Player.alive || !G.started) return; for (const o of this.owned) SKMAP[o.id].update(o.s, o.lv, dt); },
  draw(ctx, cx) { if (!Player.alive) return; for (const o of this.owned) if (SKMAP[o.id].draw) SKMAP[o.id].draw(ctx, cx, o.lv, o.s); },
  onRelease(speed) { const o = this.owned.find(o => o.id === 'sonic'); if (o && speed > 150) SKMAP.sonic.trigger(o.s, o.lv); },
};

// ============ 技能附属物：炸弹、玩家光束 ============
const PBeams = [];
const Bombs = {
  list: [],
  reset() { this.list = []; PBeams.length = 0; },
  add(x, y, tx, ty, r, dmg) { const T = .45; this.list.push({ x, y, vx: (tx - x) / T, vy: (ty - y) / T - 120 * T, t: T, r, dmg }); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i]; b.t -= dt; b.vy += 240 * dt; b.x += b.vx * dt + G.camDX; b.y += b.vy * dt + G.camDY;
      if (b.t <= 0) {
        this.list.splice(i, 1); FX.boom(b.x, b.y, .9, ['#fff', '#e8f4ff', '#ffb050', '#ff5a6a']); FX.ring(b.x, b.y, 3, b.r, .3, '#ffb050', 2);
        splash(b.x, b.y, b.r, b.dmg, null); Sfx.play('kill'); addShake(2.5);
      }
    }
    for (let i = PBeams.length - 1; i >= 0; i--) { PBeams[i].life -= dt; PBeams[i].x += G.camDX; PBeams[i].y += G.camDY; if (PBeams[i].life <= 0) PBeams.splice(i, 1); }
  },
  draw(ctx, cx) {
    for (const b of this.list) { const x = Math.round(b.x - cx), y = Math.round(b.y); ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x - 2, y - 3, 5, 6); ctx.fillStyle = '#ff5a6a'; ctx.fillRect(x - 1, y - 1, 3, 2); }
    for (const L of PBeams) {
      const k = L.life / .3, x0 = L.x - cx, x1 = x0 + Math.cos(L.a) * 600, y1 = L.y + Math.sin(L.a) * 600, w = Math.max(1, Math.round(L.w * k));
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; pxLine(ctx, x0, L.y, x1, y1, '#ffe04a', w + 6); ctx.globalAlpha = 1;
      pxLine(ctx, x0, L.y, x1, y1, '#ffe04a', w); ctx.globalCompositeOperation = 'source-over'; pxLine(ctx, x0, L.y, x1, y1, '#fff', Math.max(1, w - 3));
    }
  },
};

// ============ 经验 / 金币 / 风暴 ============
function xpNeed(L) { return Math.round(8 + L * 6 + Math.pow(L, 1.6) * 1.6); }
function addXP(v) {
  G.xp += v * Stats.xpMul;
  while (G.xp >= xpNeed(G.level)) { G.xp -= xpNeed(G.level); G.level++; G.queue.push('lvl'); }
}
function addCoins(v) { G.coins += v; G.totalCoins += v; }
function gainCoin(v) { v *= Stats.coinMul; const n = Math.floor(v) + (Math.random() < v % 1 ? 1 : 0); addCoins(n); }
function addStorm(v) {
  if (G.ultT > 0) return;
  const was = G.energy; G.energy = Math.min(100, G.energy + v * Stats.stormMul);
  if (was < 100 && G.energy >= 100) { FX.text(Player.x, Player.y - 22, 'SPACE!', '#ff5a6a', 2); Sfx.play('levelup'); }
}
function ultimate() {
  if (G.energy < 100 || !Player.alive) return;
  G.energy = 0; G.ultT = 3.2 + Stats.ultDur; const P = Player;
  Sfx.play('ult'); slowMo(.35, .7); addShake(12); screenFlash(.9, '#ff2030'); hitStop(.08);
  UI.banner('万丝风暴！', 'SPIDER STORM', 1.2);
  EB.clear(true); Lasers.reset();
  for (let i = 0; i < 3; i++) FX.ring(P.x, P.y, 4, 120 + i * 80, .5 + i * .2, i % 2 ? '#ff3040' : '#fff', 2);
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; FX.bolt(P.x, P.y, P.x + Math.cos(a) * 160, P.y + Math.sin(a) * 160, i % 2 ? '#ffffff' : '#ff5a6a'); }
  const base = (40 + G.level * 8) * (1 + Stats.ultDmg);
  for (const e of allTargets()) {
    if (!onScreen(e)) continue;
    FX.bolt(P.x, P.y, e.x, e.y, '#fff');
    damageEnemy(e, e.isBoss ? Math.min(e.maxHp * .1, base * 2) : base * 3 * Diff.hp(), true);
  }
}
