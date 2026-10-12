'use strict';
// ============ 主循环 / UI / 结算 ============
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);

const UI = {
  bt: 0,
  show(id) { $(id).classList.add('show'); }, hide(id) { $(id).classList.remove('show'); },
  banner(t, sub, dur) {
    const b = $('banner'); b.innerHTML = t + (sub ? '<small>' + sub + '</small>' : ''); b.classList.add('show');
    clearTimeout(this.bt); this.bt = setTimeout(() => b.classList.remove('show'), (dur || 2) * 1000);
  },
  cards: [], mode: '',
  lvTxt(lv, max) { return lv >= max ? 'MAX' : 'Lv' + lv; },
  // 打开选择：lvl=技能升级(经验) chest=精英装备 upgrade=金币强化装备
  open(mode) {
    let cards = [], title = '';
    if (mode === 'lvl') {
      title = '等级提升 LV ' + G.level + '！选择技能';
      cards = Skills.roll().map(c => {
        const d = SKMAP[c.id], nl = c.lv + 1;
        return { ...c, ico: d.ico, nm: d.nm, tp: c.lv ? '技能升级' : '新技能', cls: c.lv ? '' : 'summon', ds: d.ds, lvl: c.lv ? `Lv${c.lv} → ${nl >= SK_MAX ? 'MAX' : 'Lv' + nl}` : 'NEW · Lv1' };
      });
      if (!cards.length) { Player.heal(30); addCoins(20); FX.text(Player.x, Player.y - 20, '全满', '#ffe04a', 2); return false; }
    } else if (mode === 'chest') {
      if (Equip.owned.length < EQ_SLOTS) {
        title = '精英补给！选择一件装备';
        const pool = EQUIPS.filter(e => !Equip.lv(e.id));
        while (cards.length < 3 && pool.length) { const e = pool.splice(randi(0, pool.length - 1), 1)[0]; cards.push({ kind: 'equip', id: e.id, ico: e.ico, nm: e.nm, tp: '新装备', cls: 'passive', ds: e.ds(1), lvl: 'NEW · Lv1' }); }
      } else {
        title = '精英补给！免费强化一件装备';
        cards = this.upCards(true);
      }
      if (!cards.length) { addCoins(60); FX.text(Player.x, Player.y - 20, '+60', '#ffd23a', 2); return false; }
    } else if (mode === 'upgrade') {
      title = '金币 ' + G.coins + '！花费 ' + Equip.cost() + ' 强化装备';
      cards = this.upCards(false);
      if (!cards.length) return false;
    }
    G.state = 'pick'; this.mode = mode; this.cards = cards; Sfx.play('levelup'); $('banner').classList.remove('show');
    $('pickTitle').textContent = title;
    $('cards').innerHTML = cards.map((c, i) => `<div class="card" data-i="${i}"><div class="key">[${i + 1}]</div><div class="ico">${c.ico}</div><div class="nm">${c.nm}</div><div class="tp ${c.cls}">${c.tp}</div><div class="ds">${c.ds}</div><div class="lv">${c.lvl}</div></div>`).join('');
    $('cards').querySelectorAll('.card').forEach(c => c.addEventListener('click', () => this.choose(+c.dataset.i)));
    $('skipBtn').style.display = mode === 'upgrade' ? '' : 'none';
    this.show('pick'); return true;
  },
  openRoutes(id, free) {
    const e = EQUIPS.find(x => x.id === id);
    this.mode = 'route';
    this.cards = EQ_ROUTES[id].map((R, i) => ({ kind: 'route', id, route: i, free, ico: e.ico, nm: R.nm, tp: '路线 ' + ROUTE_TAG[i], cls: ['', 'summon', 'passive'][i],
      ds: e.ds(2) + '<br><b style="color:#ffd23a">Lv2</b> ' + R.ds(1) + '<br><b style="color:#ffd23a">Lv3</b> ' + R.ds(2) + '<br><b style="color:#ffd23a">MAX</b> ' + R.ds(3), lvl: 'Lv1 → Lv2' }));
    $('pickTitle').textContent = e.nm + ' · 选择升级路线（选定后不可更改）';
    $('cards').innerHTML = this.cards.map((c, i) => `<div class="card route r${i}" data-i="${i}"><div class="key">[${i + 1}]</div><div class="ico">${c.ico}</div><div class="nm">${c.nm}</div><div class="tp ${c.cls}">${c.tp}</div><div class="ds">${c.ds}</div><div class="lv">${c.lvl}</div></div>`).join('');
    $('cards').querySelectorAll('.card').forEach(c => c.addEventListener('click', () => this.choose(+c.dataset.i)));
    $('skipBtn').style.display = 'none';
    Sfx.play('pick');
  },
  upCards(free) {
    const pool = Equip.upgradable().slice(), out = [];
    while (out.length < 3 && pool.length) {
      const o = pool.splice(randi(0, pool.length - 1), 1)[0], e = EQUIPS.find(x => x.id === o.id), nl = o.lv + 1;
      const R = o.route >= 0 ? EQ_ROUTES[o.id][o.route] : null;
      const ds = e.ds(nl) + (R ? '<br><b style="color:#ffd23a">路线 ' + ROUTE_TAG[o.route] + '·' + R.nm + '</b>：' + R.ds(nl - 1) : '<br><b style="color:#4ad8ff">选择后进入三选一升级路线</b>');
      out.push({ kind: 'equipUp', id: o.id, free, ico: e.ico, nm: e.nm, tp: free ? '免费强化' : '💰 ' + Equip.cost(), cls: 'passive', ds, lvl: `Lv${o.lv} → ${nl >= EQ_MAX ? 'MAX' : 'Lv' + nl}` });
    }
    return out;
  },
  choose(i) {
    if (G.state !== 'pick') return;
    const c = this.cards[i];
    if (c) {
      if (c.kind === 'skill') Skills.take(c.id);
      else if (c.kind === 'equip') Equip.add(c.id);
      else if (c.kind === 'equipUp' && Equip.get(c.id).route < 0) { this.openRoutes(c.id, c.free); return; }
      else if (c.kind === 'equipUp' || c.kind === 'route') { if (!c.free) { G.coins -= Equip.cost(); Equip.ups++; } Equip.up(c.id, c.route); }
      Sfx.play('pick');
      FX.text(Player.x, Player.y - 24, '能力提升', '#ffe04a', 2);
      FX.ring(Player.x, Player.y, 4, 40, .4, '#ffe04a', 2);
    } else if (this.mode === 'upgrade' || this.mode === 'route') G.upSkipAt = G.coins + Equip.cost();
    this.hide('pick'); this.renderSlots();
    // 选完后暂停，等玩家重新按住鼠标再继续；未按住的手会立即松开
    G.state = handDown(0) || handDown(1) ? 'play' : 'resume';
    if (G.state === 'play') slowMo(.4, .6);
  },
  renderSlots() {
    let h = '';
    for (let i = 0; i < SK_SLOTS; i++) { const o = Skills.owned[i]; h += o ? `<div class="slot sk ${o.lv >= SK_MAX ? 'max' : ''}"><span>${SKMAP[o.id].ico}</span><b>${this.lvTxt(o.lv, SK_MAX)}</b></div>` : '<div class="slot empty"></div>'; }
    $('skSlots').innerHTML = h; h = '';
    for (let i = 0; i < EQ_SLOTS; i++) { const o = Equip.owned[i]; h += o ? `<div class="slot eq ${o.lv >= EQ_MAX ? 'max' : ''}"><span>${EQUIPS.find(e => e.id === o.id).ico}</span>${o.route >= 0 ? '<i>' + ROUTE_TAG[o.route] + '</i>' : ''}<b>${this.lvTxt(o.lv, EQ_MAX)}</b></div>` : '<div class="slot empty"></div>'; }
    $('eqSlots').innerHTML = h;
  },
};

function newGame() {
  Object.assign(G, {
    time: 0, camDX: 0, camSpeed: 45, shake: 0, flash: 0, hitstop: 0, slow: 1, slowT: 0, dist: 0, kills: 0, coins: 0,
    totalCoins: 0, energy: 0, bosses: 0, boss: null, nextBossT: 120, combo: 0, comboT: 0, maxCombo: 0,
    started: false, grazes: 0, ultT: 0, inputLock: .15, deathT: 0, runTime: 0, warnT: 0,
    xp: 0, level: 1, queue: [], upSkipAt: 0, overAnnounced: false, endlessT: null, shieldT: 0, revived: false,
  });
  G.cam.x = 0; G.cam.y = 0; G.camDY = 0; G.carryX = 0; G.tideX = 0; G.arenaY = 0; G.arDX = G.arDY = 0; BG.build(0); World.reset();
  [FX, Pickups, EB, Lasers, Enemies, Shots, Skills, Equip, Bombs].forEach(m => m.reset());
  Player.reset(); recalcStats(); Player.hp = Player.maxHp; G.startX = Player.x; G.state = 'play';
  UI.renderSlots(); UI.show('hud');
  UI.banner('按住 鼠标左键 / 右键', '向楼顶射出钩索，开始摆荡！', 3);
  Music.mode = 'normal'; Music.start();
}
function startBoss() {
  G.boss = makeBoss(); G.warnT = 2.6; Music.mode = 'boss';
  Sfx.play('warn'); UI.banner('⚠ BOSS 接近 ⚠', G.boss.def.cn + ' 从后方追来！', 2.6);
}
function gameOver() {
  G.state = 'over'; Music.stop(); UI.hide('hud');
  const dist = Math.floor(G.dist), tm = Math.max(1, G.runTime), spd = dist / tm;
  const rows = [
    ['存活时间', Math.floor(tm / 60) + ':' + String(Math.floor(tm % 60)).padStart(2, '0'), Math.floor(tm) * 20],
    ['前进距离', dist + ' M', dist * 5],
    ['击败 BOSS', G.bosses + ' 个', G.bosses * 5000],
    ['平均速度', spd.toFixed(1) + ' M/S', Math.round(spd * 300)],
    ['击杀敌人', G.kills, G.kills * 10],
    ['累计金币', G.totalCoins, G.totalCoins * 2],
    ['角色等级', 'LV ' + G.level, G.level * 200],
    ['最大连击', G.maxCombo, G.maxCombo * 10],
    ['擦弹', G.grazes, G.grazes * 5],
  ];
  const total = rows.reduce((a, r) => a + r[2], 0);
  const best = Math.max(total, +(localStorage.getItem('gouying_best') || 0));
  localStorage.setItem('gouying_best', best);
  $('overTitle').textContent = Player.deadTitle || '信号中断';
  $('overSub').textContent = Player.deadSub;
  $('tally').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="v">+${r[2]}</td></tr>`).join('') +
    `<tr class="total"><td>总分</td><td>${total >= best ? 'NEW BEST!' : '最佳 ' + best}</td><td class="v">${total}</td></tr>`;
  $('rank').textContent = total >= 100000 ? 'S' : total >= 70000 ? 'A' : total >= 40000 ? 'B' : total >= 20000 ? 'C' : 'D';
  UI.show('over');
}

$('btnStart').addEventListener('click', () => { Sfx.init(); UI.hide('title'); newGame(); });
$('skipBtn').addEventListener('click', () => UI.choose(-1));
$('btnRetry').addEventListener('click', () => { Sfx.init(); UI.hide('over'); newGame(); });
$('bestLine').textContent = localStorage.getItem('gouying_best') ? '最高分 ' + localStorage.getItem('gouying_best') : '';

// ============ 更新 ============
function update(rdt) {
  if (keyHit('KeyM')) { Sfx.muted = !Sfx.muted; }
  if (G.state === 'pick') { for (let i = 0; i < 3; i++) if (keyHit('Digit' + (i + 1))) UI.choose(i); if (UI.mode === 'upgrade' && keyHit('KeyX')) UI.choose(-1); return; }
  if (G.state === 'play' && (keyHit('KeyP') || keyHit('Escape'))) { G.state = 'pause'; UI.show('pause'); return; }
  if (G.state === 'resume') { G.time += rdt; if (handDown(0) || handDown(1)) { G.state = 'play'; slowMo(.4, .6); } return; }
  if (G.state === 'pause') { if (keyHit('KeyP') || keyHit('Escape')) { G.state = 'play'; UI.hide('pause'); } return; }
  if (G.state === 'title') { const dx = 30 * rdt; G.cam.x += dx; G.camDX = G.carryX = G.arDX = dx; G.arDY = 0; G.tideX = G.cam.x; G.time += rdt; World.update(G.cam.x); return; }

  if (G.hitstop > 0) { G.hitstop -= rdt; return; }
  let sc = 1; if (G.slowT > 0) { G.slowT -= rdt; sc = G.slow; }
  const dt = rdt * sc;
  G.time += dt; G.inputLock -= rdt;
  const P = Player;

  // 横向自动卷轴：画面左边缘 = 墨潮（tideX），按卷轴速度推进；玩家越过画面 65% 才轻推
  G.carryX = 0; const tx0 = G.tideX;
  if (G.started && P.alive && G.state === 'play') {
    G.runTime += dt;
    G.camSpeed = Math.min(150, 45 + G.runTime * .12 + (Diff.over() - 1) * 12);
    G.carryX = G.camSpeed * dt; G.tideX += G.carryX;
    const target = P.x - W * .65;
    if (target > G.tideX) G.tideX = lerp(G.tideX, target, 1 - Math.exp(-4 * dt));
    if (P.x > G.tideX + W - 14) G.tideX = P.x - W + 14; // 右边缘硬限制，主角不会冲出画面
  }
  // 纵向固定一屏：深渊永远在屏幕底边，不随玩家移动
  G.arenaY = 0; G.arDX = G.tideX - tx0; G.arDY = 0;
  // 镜头：不锁主角，x 跟随卷轴，y 固定
  if (G.state !== 'title') {
    const vx = G.tideX;
    G.camDX = vx - G.cam.x; G.camDY = -G.cam.y; G.cam.x = vx; G.cam.y = 0;
  } else { G.camDX = G.camDY = 0; }

  if (G.state === 'play') {
    if (keyHit('Space')) ultimate();
    P.update(dt);
    if (P.alive && G.started) G.dist = Math.max(G.dist, (P.x - G.startX) / 10);
    if (!G.boss && G.started && G.runTime >= G.nextBossT) { startBoss(); G.nextBossT += 120; }
  }
  World.update(G.cam.x);
  Enemies.update(dt);
  if (G.boss) G.boss.update(dt);
  Shots.update(dt); EB.update(dt); Lasers.update(dt); Skills.update(dt); Bombs.update(dt); Pickups.update(dt); FX.update(dt);

  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  G.ultT = Math.max(0, G.ultT - dt); G.warnT = Math.max(0, G.warnT - rdt);
  G.shake = Math.max(0, G.shake - 30 * rdt); G.flash = Math.max(0, G.flash - 2.5 * rdt);

  // 环境余烬
  if (Math.random() < dt * 20) FX.p(G.cam.x + rand(0, W + 60), G.arenaY + H + 2, rand(-20, 10), rand(-60, -20), rand(1.5, 3.5), pick(['#ff8a1e', '#ffcf4a', '#ff3040', '#b070ff']), 1, 'sq', -5);

  if (G.state === 'play' && P.alive && G.started && G.hitstop <= 0 && !(G.boss && G.boss.state === 'dying')) {
    if (G.queue.length) UI.open(G.queue.shift());
    else if (G.coins >= Equip.cost() && G.coins >= G.upSkipAt && Equip.upgradable().length) UI.open('upgrade');
  }
  if (!P.alive && G.state === 'play') { G.deathT -= rdt; if (G.deathT <= 0) gameOver(); }
}

// ============ 启动 ============
BG.build(0); World.reset(); Player.reset(); Skills.reset(); Equip.reset(); recalcStats();
let last = performance.now();
function frame(now) {
  const rdt = Math.min(1 / 30, (now - last) / 1000); last = now;
  try { update(rdt); updatePops(rdt); Music.update(); render(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
