'use strict';
// ============ 主循环 / UI / 结算 ============
const cv = document.getElementById('game');
const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
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
      if (!cards.length) { Player.heal(30); addCoins(20); FX.text(Player.x, Player.y - 20, 'ALL MAX', '#ffe04a', 2); return false; }
    } else if (mode === 'chest') {
      if (Equip.owned.length < EQ_SLOTS) {
        title = '精英战利品！选择一件装备';
        const pool = EQUIPS.filter(e => !Equip.lv(e.id));
        while (cards.length < 3 && pool.length) { const e = pool.splice(randi(0, pool.length - 1), 1)[0]; cards.push({ kind: 'equip', id: e.id, ico: e.ico, nm: e.nm, tp: '新装备', cls: 'passive', ds: e.ds(1), lvl: 'NEW · Lv1' }); }
      } else {
        title = '精英战利品！免费强化一件装备';
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
      FX.text(Player.x, Player.y - 24, 'POWER UP', '#ffe04a', 2);
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
    xp: 0, level: 1, queue: [], upSkipAt: 0, overAnnounced: false, shieldT: 0, revived: false,
  });
  G.cam.x = 0; G.cam.y = 0; G.camDY = 0; BG.build(0); World.reset();
  [FX, Pickups, EB, Lasers, Enemies, Shots, Skills, Equip, Bombs].forEach(m => m.reset());
  Player.reset(); recalcStats(); Player.hp = Player.maxHp; G.startX = Player.x; G.state = 'play';
  UI.renderSlots(); UI.show('hud');
  UI.banner('按住 鼠标左键 / 右键', '向建筑发射蛛丝，开始飞荡！', 3);
  Music.mode = 'normal'; Music.start();
}
function startBoss() {
  G.boss = makeBoss(); G.warnT = 2.6; Music.mode = 'boss';
  Sfx.play('warn'); UI.banner('⚠ WARNING ⚠', G.boss.def.cn + ' 从后方追来！', 2.6);
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
  const best = Math.max(total, +(localStorage.getItem('webrunner_best') || 0));
  localStorage.setItem('webrunner_best', best);
  $('overTitle').textContent = Player.deadTitle || '阵亡';
  $('overSub').textContent = Player.deadSub;
  $('tally').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="v">+${r[2]}</td></tr>`).join('') +
    `<tr class="total"><td>总分</td><td>${total >= best ? 'NEW BEST!' : '最佳 ' + best}</td><td class="v">${total}</td></tr>`;
  $('rank').textContent = total >= 100000 ? 'S' : total >= 70000 ? 'A' : total >= 40000 ? 'B' : total >= 20000 ? 'C' : 'D';
  UI.show('over');
}

$('btnStart').addEventListener('click', () => { Sfx.init(); UI.hide('title'); newGame(); });
$('skipBtn').addEventListener('click', () => UI.choose(-1));
$('btnRetry').addEventListener('click', () => { Sfx.init(); UI.hide('over'); newGame(); });
$('bestLine').textContent = localStorage.getItem('webrunner_best') ? '最高分 ' + localStorage.getItem('webrunner_best') : '';

// ============ 更新 ============
function update(rdt) {
  if (keyHit('KeyM')) { Sfx.muted = !Sfx.muted; }
  if (G.state === 'pick') { for (let i = 0; i < 3; i++) if (keyHit('Digit' + (i + 1))) UI.choose(i); if (UI.mode === 'upgrade' && keyHit('KeyX')) UI.choose(-1); return; }
  if (G.state === 'play' && (keyHit('KeyP') || keyHit('Escape'))) { G.state = 'pause'; UI.show('pause'); return; }
  if (G.state === 'resume') { G.time += rdt; if (handDown(0) || handDown(1)) { G.state = 'play'; slowMo(.4, .6); } return; }
  if (G.state === 'pause') { if (keyHit('KeyP') || keyHit('Escape')) { G.state = 'play'; UI.hide('pause'); } return; }
  if (G.state === 'title') { const dx = 30 * rdt; G.cam.x += dx; G.camDX = dx; G.time += rdt; World.update(G.cam.x); return; }

  if (G.hitstop > 0) { G.hitstop -= rdt; return; }
  let sc = 1; if (G.slowT > 0) { G.slowT -= rdt; sc = G.slow; }
  const dt = rdt * sc;
  G.time += dt; G.inputLock -= rdt;
  const P = Player;

  // 镜头：自动卷轴 + 跟随
  let nx = G.cam.x;
  if (G.started && P.alive && G.state === 'play') {
    G.runTime += dt;
    G.camSpeed = Math.min(150, 45 + G.runTime * .12 + (Diff.over() - 1) * 12);
    nx += G.camSpeed * dt;
    const target = P.x - W * .45;
    if (target > nx) nx = lerp(nx, target, 1 - Math.exp(-5 * dt));
  }
  G.camDX = nx - G.cam.x; G.cam.x = nx;
  // 纵向镜头：向上飞出屏幕时抬升；抓着蛛丝下坠时下降；否则回到原位
  let ny = G.cam.y;
  if (G.state === 'play' && P.alive) {
    const holding = P.hands.some(h => h.rope && h.rope.state === 'stuck');
    const up = P.y - 45, down = P.y - (H - 45);
    let ty = 0;
    if (up < 0) ty = Math.max(-600, up);
    else if (holding && down > 0) ty = Math.min(down, 160);
    else if (!holding && G.cam.y > 0) ty = clamp(down, 0, G.cam.y);
    ny = lerp(G.cam.y, ty, 1 - Math.exp(-(ty < G.cam.y && up < G.cam.y ? 10 : 6) * dt));
  }
  G.camDY = ny - G.cam.y; G.cam.y = ny;

  if (G.state === 'play') {
    if (keyHit('Space')) ultimate();
    P.update(dt);
    if (P.alive && G.started) G.dist = Math.max(G.dist, (P.x - G.startX) / 10);
    if (!G.boss && G.started && G.runTime >= G.nextBossT) { startBoss(); G.nextBossT += G.bosses < 2 ? 120 : 75; }
    if (G.runTime > 360 && !G.overAnnounced) { G.overAnnounced = true; UI.banner('黑潮暴走！', '敌人将无止境地变强——撑得越久越好', 3); Sfx.play('warn'); BG.build(3); }
  }
  World.update(G.cam.x);
  Enemies.update(dt);
  if (G.boss) G.boss.update(dt);
  Shots.update(dt); EB.update(dt); Lasers.update(dt); Skills.update(dt); Bombs.update(dt); Pickups.update(dt); FX.update(dt);

  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  G.ultT = Math.max(0, G.ultT - dt); G.warnT = Math.max(0, G.warnT - rdt);
  G.shake = Math.max(0, G.shake - 30 * rdt); G.flash = Math.max(0, G.flash - 2.5 * rdt);

  // 环境余烬
  if (Math.random() < dt * 20) FX.p(G.cam.x + rand(0, W + 60), G.cam.y + H + 2, rand(-20, 10), rand(-60, -20), rand(1.5, 3.5), pick(['#ff8a1e', '#ffcf4a', '#ff3040', '#b070ff']), 1, 'sq', -5);

  if (G.state === 'play' && P.alive && G.started && G.hitstop <= 0 && !(G.boss && G.boss.state === 'dying')) {
    if (G.queue.length) UI.open(G.queue.shift());
    else if (G.coins >= Equip.cost() && G.coins >= G.upSkipAt && Equip.upgradable().length) UI.open('upgrade');
  }
  if (!P.alive && G.state === 'play') { G.deathT -= rdt; if (G.deathT <= 0) gameOver(); }
}

// ============ 渲染 ============
// 叠加层分辨率跟随显示尺寸（HUD 清晰）
function fitOverlay() {
  const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(W, Math.round(r.width * d)), h = Math.round(w * H / W);
  if (cv.width !== w) { cv.width = w; cv.height = h; }
}
window.addEventListener('resize', fitOverlay); fitOverlay();

function render() {
  const k = cv.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H);
  const shx = G.shake > 0 ? rand(-G.shake, G.shake) : 0, shy = G.shake > 0 ? rand(-G.shake, G.shake) : 0;
  if (window.R3D) R3D.render(shx, shy);
  else { ctx.fillStyle = '#07040d'; ctx.fillRect(0, 0, W, H); drawText(ctx, 'LOADING 3D...', W / 2, H / 2, '#fff', 2, 'center'); return; }
  ctx.save(); ctx.translate(shx, shy - G.cam.y);
  FX.drawTexts(ctx, G.cam.x);
  ctx.restore();

  // 速度线
  const sp = Math.hypot(Player.vx, Player.vy);
  if (G.state === 'play' && sp > 230) {
    ctx.globalAlpha = Math.min(.35, (sp - 230) / 300); ctx.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) { const y = rand(0, H), l = rand(20, 70); ctx.fillRect(rand(0, W), y, l, .4); }
    ctx.globalAlpha = 1;
  }
  // 暗角
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (G.ultT > 0) { ctx.globalAlpha = .1 + Math.sin(G.time * 30) * .04; ctx.fillStyle = '#ff2030'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.flash > 0) { ctx.globalAlpha = Math.min(1, G.flash) * .5; ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.state !== 'title') { drawHUD(ctx); drawCursor(ctx); }
}

function drawTide(c) {
  const t = G.time;
  for (let y = 0; y < H; y += 2) {
    const w = 7 + Math.sin(y * .15 + t * 5) * 3 + Math.sin(y * .05 - t * 2) * 2;
    c.fillStyle = '#07030c'; c.fillRect(0, y, Math.round(w), 2);
    c.fillStyle = '#5a2a8a'; c.fillRect(Math.round(w), y, 1, 2);
  }
}

function bar(c, x, y, w, h, k, col, bg) {
  c.fillStyle = '#000'; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = bg || '#2a1020'; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x, y, Math.round(w * clamp(k, 0, 1)), h);
  c.fillStyle = '#ffffff44'; c.fillRect(x, y, Math.round(w * clamp(k, 0, 1)), 1);
}
function drawHUD(c) {
  const P = Player;
  // 生命
  drawText(c, 'HP', 6, 6, '#ff5060');
  bar(c, 18, 6, 90, 5, P.hp / P.maxHp, P.hp / P.maxHp < .3 && (G.time * 6 | 0) % 2 ? '#fff' : '#ff3040');
  drawText(c, Math.ceil(P.hp) + '/' + P.maxHp, 112, 6, '#fff');
  // 经验
  drawText(c, 'LV' + G.level, 6, 14, '#4ad8ff');
  bar(c, 26, 15, 82, 3, G.xp / xpNeed(G.level), '#4ad8ff', '#0a1a2a');
  // 风暴
  const full = G.energy >= 100;
  drawText(c, 'ST', 112, 14, '#ff5a6a');
  bar(c, 122, 15, 40, 3, G.energy / 100, full ? ((G.time * 10 | 0) % 2 ? '#fff' : '#ff5a6a') : '#a02a3a', '#200a10');
  if (full) drawText(c, 'SPACE!', 166, 14, (G.time * 6 | 0) % 2 ? '#ffe04a' : '#ff5a6a');
  // 双手状态
  P.hands.forEach((h, i) => {
    const x = 6 + i * 14, y = 23, st = h.rope ? h.rope.state : null;
    c.fillStyle = '#000'; c.fillRect(x - 1, y - 1, 12, 9);
    c.fillStyle = st === 'stuck' ? '#e3263a' : st === 'fly' ? '#8a4050' : '#1a1020'; c.fillRect(x, y, 10, 7);
    drawText(c, i ? 'R' : 'L', x + 4, y + 1, st ? '#fff' : '#555', 1, 'left', false);
  });
  if (P.alive && G.started && !P.hands.some(h => h.rope && h.rope.state === 'stuck') && (G.time * 8 | 0) % 2) drawText(c, 'FALLING!', 36, 24, '#ff3040');
  // 右上：距离 / 金币
  drawText(c, Math.floor(G.dist) + 'M', W - 6, 5, '#fff', 2, 'right');
  { const cx0 = W - 10 - textW(String(G.coins), 1) - 4; c.fillStyle = '#a06000'; c.beginPath(); c.arc(cx0, 19.5, 3, 0, 7); c.fill(); c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(cx0, 19.5, 2.2, 0, 7); c.fill(); }
  drawText(c, G.coins, W - 6, 17, '#ffd23a', 1, 'right');
  const tt = Math.floor(G.runTime), over = Diff.over();
  drawText(c, Math.floor(tt / 60) + ':' + String(tt % 60).padStart(2, '0'), W / 2, 5, over > 1 ? '#ff3040' : '#fff', 2, 'center');
  drawText(c, over > 1 ? 'OVERDRIVE X' + over.toFixed(1) : ['WARM UP', 'CHAPTER 2', 'CHAPTER 3', ''][Diff.phase()], W / 2, 18, over > 1 ? ((G.time * 4 | 0) % 2 ? '#ff3040' : '#ffe04a') : '#a08ac0', 1, 'center');
  if (!G.boss && G.runTime < 360 || G.bosses >= 3 && !G.boss) { const bl = Math.max(0, Math.ceil(G.nextBossT - G.runTime)); drawText(c, 'BOSS IN ' + bl + 'S', W - 6, 27, '#b070ff', 1, 'right'); }
  drawText(c, 'BOSS X' + G.bosses, W - 6, 36, '#b070ff', 1, 'right');
  // 连击
  if (G.combo >= 5) {
    const s = G.combo >= 50 ? 3 : 2, col = G.combo >= 50 ? '#ff3040' : G.combo >= 20 ? '#ffe04a' : '#fff';
    drawText(c, G.combo + ' HIT', W - 8, 52, col, s, 'right');
    drawText(c, 'COMBO', W - 8, 52 + s * 6 + 1, '#aaa', 1, 'right');
  }
  // BOSS 血条
  const b = G.boss;
  if (b) {
    drawText(c, b.name, W / 2, 28, b.def.col, 1, 'center');
    bar(c, W / 2 - 100, 35, 200, 5, b.hp / b.maxHp, b.enraged ? ((G.time * 8 | 0) % 2 ? '#ff3040' : '#ff8a1e') : b.def.col, '#200');
  }
  if (G.warnT > 0 && (G.warnT * 4 | 0) % 2) {
    c.fillStyle = '#ff203066'; c.fillRect(0, 0, W, 8); c.fillRect(0, H - 8, W, 8);
    drawText(c, 'WARNING  WARNING  WARNING', W / 2, 60, '#ff3040', 2, 'center');
  }
  // 速度
  drawText(c, 'SPD ' + (Math.hypot(P.vx, P.vy) / 10).toFixed(0) + 'M/S', 6, 34, '#8af0ff');
  if (G.state === 'resume') {
    c.fillStyle = '#00000088'; c.fillRect(0, H / 2 - 16, W, 30);
    drawText(c, 'HOLD LMB / RMB TO RESUME', W / 2, H / 2 - 10, (G.time * 3 | 0) % 2 ? '#fff' : '#ffe04a', 2, 'center');
    drawText(c, 'ROPES WITHOUT A HELD BUTTON WILL BE RELEASED', W / 2, H / 2 + 5, '#aaa', 1, 'center');
  }
  if (!G.started && P.alive) drawText(c, 'HOLD LMB / RMB ON A BUILDING', W / 2, H * .72, (G.time * 3 | 0) % 2 ? '#fff' : '#ffe04a', 1, 'center');
}
function drawCursor(c) {
  const P = Player; if (!P.alive) return;
  const mx = Math.round(Input.mx), my = Math.round(Input.my);
  const hx = P.x - G.cam.x, hy = P.y - 2 - G.cam.y;
  let dx = mx - hx, dy = my - hy, d = Math.hypot(dx, dy) || 1, R = Stats.range;
  let ok = false, tx = mx, ty = my;
  const L = Math.min(d, R);
  for (let s = L; s >= 22; s -= 6) { const px = hx + dx / d * s, py = hy + dy / d * s; if (World.anchorAt(px + G.cam.x, py + G.cam.y)) { ok = true; tx = px; ty = py; break; } }
  const col = ok ? '#4aff8a' : '#ff4050';
  // 瞄准虚线
  c.fillStyle = col + '88';
  const ex = ok ? tx : hx + dx / d * L, ey = ok ? ty : hy + dy / d * L;
  const n = Math.floor(Math.hypot(ex - hx, ey - hy) / 6);
  for (let i = 1; i < n; i++) c.fillRect(Math.round(hx + (ex - hx) * i / n), Math.round(hy + (ey - hy) * i / n), 1, 1);
  if (ok) { c.fillStyle = col; c.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3); }
  // 准星
  c.fillStyle = '#000'; c.fillRect(mx - 5, my, 11, 1); c.fillRect(mx, my - 5, 1, 11);
  c.fillStyle = col;
  c.fillRect(mx - 5, my, 3, 1); c.fillRect(mx + 3, my, 3, 1); c.fillRect(mx, my - 5, 1, 3); c.fillRect(mx, my + 3, 1, 3);
  if (d > R) { c.globalAlpha = .15; pxRing(c, hx, hy, R, '#ffffff'); c.globalAlpha = 1; }
}

// ============ 启动 ============
BG.build(0); World.reset(); Player.reset(); Skills.reset(); Equip.reset(); recalcStats();
let last = performance.now();
function frame(now) {
  const rdt = Math.min(1 / 30, (now - last) / 1000); last = now;
  try { update(rdt); Music.update(); render(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
