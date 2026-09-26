'use strict';
// ============ 基础常量与工具 ============
const W = 480, H = 270, TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.floor(Math.random() * a.length)];
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

// 全局游戏状态
const G = {
  state: 'title', time: 0, cam: { x: 0, y: 0 }, camDX: 0, camDY: 0, camSpeed: 40,
  shake: 0, flash: 0, flashColor: '#fff', hitstop: 0, slow: 1, slowT: 0,
  dist: 0, kills: 0, coins: 0, totalCoins: 0, energy: 0, bosses: 0,
  boss: null, nextBossDist: 700, combo: 0, comboT: 0, maxCombo: 0,
  startX: 0, started: false, grazes: 0,
};
function addShake(v) { G.shake = Math.max(G.shake, v); }
function hitStop(t) { G.hitstop = Math.max(G.hitstop, t); }
function screenFlash(a, c) { G.flash = Math.max(G.flash, a); G.flashColor = c || '#fff'; }
function slowMo(scale, t) { G.slow = scale; G.slowT = t; }

// ============ 输入 ============
const Input = { mx: W * 0.7, my: H * 0.3, L: false, R: false, keys: {}, pressed: {} };
(function () {
  const cv = document.getElementById('game');
  function pos(e) {
    const r = cv.getBoundingClientRect();
    Input.mx = (e.clientX - r.left) / r.width * W;
    Input.my = (e.clientY - r.top) / r.height * H;
  }
  window.addEventListener('mousemove', pos);
  cv.addEventListener('mousedown', e => {
    pos(e); Sfx.init();
    if (e.button === 0) Input.L = true;
    if (e.button === 2) Input.R = true;
    e.preventDefault();
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) Input.L = false;
    if (e.button === 2) Input.R = false;
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('blur', () => { Input.L = Input.R = false; Input.keys = {}; });
  window.addEventListener('keydown', e => {
    if (!Input.keys[e.code]) Input.pressed[e.code] = true;
    Input.keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => { Input.keys[e.code] = false; });
})();
function keyHit(c) { const v = Input.pressed[c]; Input.pressed[c] = false; return v; }
// 键盘替代：A=左手 D=右手（同样瞄准鼠标）
function handDown(i) { return i === 0 ? (Input.L || !!Input.keys.KeyA) : (Input.R || !!Input.keys.KeyD); }

// ============ 音效（WebAudio 合成） ============
const Sfx = {
  ctx: null, master: null, sfxBus: null, musBus: null, last: {}, noiseBuf: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.55;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master);
    this.musBus = c.createGain(); this.musBus.gain.value = 0.32; this.musBus.connect(this.master);
    const len = c.sampleRate; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
  },
  ok(name, gap) {
    const t = this.ctx.currentTime;
    if (gap && this.last[name] && t - this.last[name] < gap) return false;
    this.last[name] = t; return true;
  },
  tone(f, dur, type, vol, f2, bus, when) {
    const c = this.ctx, t = when || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, q, freq2, bus, when, type) {
    const c = this.ctx, t = when || c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(n) {
    if (!this.ctx || this.muted) return;
    try { this._play(n); } catch (e) { }
  },
  _play(n) {
    switch (n) {
      case 'thwip': if (this.ok(n, .04)) { this.noise(.18, .5, 3000, 2, 900); this.tone(1400, .08, 'triangle', .15, 500); } break;
      case 'stick': if (this.ok(n, .04)) { this.tone(180, .07, 'square', .18, 90); } break;
      case 'miss': if (this.ok(n, .1)) { this.tone(300, .1, 'sawtooth', .08, 120); } break;
      case 'release': if (this.ok(n, .05)) { this.noise(.1, .25, 1500, 1, 4000); } break;
      case 'shoot': if (this.ok(n, .05)) { this.tone(880, .05, 'square', .05, 1600); } break;
      case 'hit': if (this.ok(n, .03)) { this.noise(.06, .35, 2400, 1.5); this.tone(220, .05, 'square', .1, 110); } break;
      case 'crit': if (this.ok(n, .05)) { this.noise(.1, .5, 5000, 1); this.tone(1200, .09, 'square', .12, 300); } break;
      case 'kill': if (this.ok(n, .03)) { this.noise(.3, .6, 900, .8, 120); this.tone(160, .25, 'square', .2, 40); } break;
      case 'bigkill': if (this.ok(n, .1)) { this.noise(.7, .9, 600, .6, 60); this.tone(90, .6, 'sawtooth', .35, 25); } break;
      case 'coin': if (this.ok(n, .035)) { const t = this.ctx.currentTime; this.tone(988, .06, 'square', .07, 0, 0, t); this.tone(1319, .12, 'square', .07, 0, 0, t + .055); } break;
      case 'energy': if (this.ok(n, .05)) { this.tone(600, .12, 'triangle', .12, 1500); } break;
      case 'graze': if (this.ok(n, .06)) { this.tone(2200, .04, 'sine', .06, 3000); } break;
      case 'hurt': if (this.ok(n, .1)) { this.noise(.3, .8, 400, .7, 100); this.tone(140, .3, 'sawtooth', .3, 50); } break;
      case 'eshoot': if (this.ok(n, .07)) { this.tone(500, .07, 'square', .035, 250); } break;
      case 'laser': if (this.ok(n, .2)) { this.tone(80, .8, 'sawtooth', .25, 60); this.noise(.8, .3, 1800, 3, 600); } break;
      case 'zap': if (this.ok(n, .06)) { this.noise(.12, .3, 6000, 4, 2000); } break;
      case 'slash': if (this.ok(n, .08)) { this.noise(.15, .4, 2500, 2, 6000); } break;
      case 'warn': { const t = this.ctx.currentTime; for (let i = 0; i < 6; i++) this.tone(i % 2 ? 660 : 880, .22, 'square', .15, 0, 0, t + i * .25); } break;
      case 'levelup': { const t = this.ctx.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .16, 'square', .12, 0, 0, t + i * .06)); } break;
      case 'pick': { const t = this.ctx.currentTime; [784, 1175, 1568].forEach((f, i) => this.tone(f, .2, 'triangle', .18, 0, 0, t + i * .05)); } break;
      case 'ult': { this.noise(1.4, 1, 200, .5, 4000); this.tone(60, 1.2, 'sawtooth', .5, 800); } break;
      case 'bossdie': { const t = this.ctx.currentTime; for (let i = 0; i < 8; i++) this.noise(.5, .8, 300 + i * 150, .7, 50, 0, t + i * .12); this.tone(50, 2, 'sawtooth', .5, 20); } break;
      case 'dead': { const t = this.ctx.currentTime; [392, 330, 262, 196].forEach((f, i) => this.tone(f, .3, 'square', .18, f * .7, 0, t + i * .2)); } break;
    }
  },
};

// ============ 芯片音乐 ============
const Music = {
  on: false, step: 0, nextT: 0, mode: 'normal',
  prog: {
    normal: [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]],
    boss: [[40, 52, 55, 59], [36, 48, 52, 55], [38, 50, 53, 57], [35, 47, 51, 54]],
  },
  mtof: m => 440 * Math.pow(2, (m - 69) / 12),
  start() { if (!Sfx.ctx) return; this.on = true; this.nextT = Sfx.ctx.currentTime + 0.05; },
  stop() { this.on = false; },
  update() {
    if (!this.on || !Sfx.ctx || Sfx.muted) return;
    const c = Sfx.ctx, bpm = this.mode === 'boss' ? 168 : 150, s16 = 60 / bpm / 4;
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.02;
    while (this.nextT < c.currentTime + 0.12) {
      const t = this.nextT, st = this.step, bar = Math.floor(st / 16) % 4, i = st % 16;
      const ch = this.prog[this.mode][bar], bus = Sfx.musBus;
      if (i % 4 === 0) Sfx.tone(150, .12, 'sine', .9, 40, bus, t);
      if (i === 4 || i === 12) Sfx.noise(.12, .5, 1800, .8, 900, bus, t);
      if (i % 2 === 1) Sfx.noise(.03, .18, 8000, 1, 0, bus, t, 'highpass');
      if (i % 2 === 0) Sfx.tone(this.mtof(ch[0] - 12 + ((i / 2) % 2 ? 12 : 0)), s16 * 1.6, 'sawtooth', .22, 0, bus, t);
      const arp = [ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[2], ch[1] + 12, ch[3]];
      Sfx.tone(this.mtof(arp[i % 8] + 12), s16 * .9, 'square', .05, 0, bus, t);
      if (this.mode === 'boss' ? i % 3 === 0 : (i === 0 || i === 6 || i === 10 || i === 14)) {
        const mel = ch[[3, 2, 3, 1][(i + bar) % 4]] + 12;
        Sfx.tone(this.mtof(mel), s16 * 2.4, 'triangle', .12, 0, bus, t);
      }
      this.nextT += s16; this.step++;
    }
  },
};

// ============ 像素字体 3x5 ============
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010',
  9: '010101011001110', '+': '000010111010000', '-': '000000111000000', '!': '010010010000010', '.': '000000000000010',
  ':': '000010000010000', '/': '001001010100100', '%': '101001010100101', '?': '110001010000010', '<': '001010100010001',
  '>': '100010001010100', '(': '010100100100010', ')': '010001001001010', '#': '101111101111101',
  '*': '000101010101000', '=': '000111000111000', ',': '000000000010100', ' ': '000000000000000',
};
function textW(s, sc) { return String(s).length * 4 * sc - sc; }
function drawText(ctx, s, x, y, col, sc, align, shadow) {
  sc = sc || 1; s = String(s).toUpperCase();
  if (align === 'center') x -= textW(s, sc) / 2; else if (align === 'right') x -= textW(s, sc);
  x = Math.round(x); y = Math.round(y);
  if (shadow !== false) drawTextRaw(ctx, s, x + sc, y + sc, shadow || '#000', sc);
  drawTextRaw(ctx, s, x, y, col, sc);
}
function drawTextRaw(ctx, s, x, y, col, sc) {
  ctx.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] || FONT[' '];
    for (let p = 0; p < 15; p++) if (g.charCodeAt(p) === 49) ctx.fillRect(x + (p % 3) * sc, y + ((p / 3) | 0) * sc, sc, sc);
    x += 4 * sc;
  }
}
