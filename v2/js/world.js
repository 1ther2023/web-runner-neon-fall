'use strict';
// ============ 云阙城：可挂钩的楼阁与浮空灯舫 ============
const SIGNS = ['24H', 'NEON', '雨夜', '便利店', '霓虹', 'BAR', '旅馆', '拉面', '修理', '药局', 'HOTEL', 'OPEN'];
const World = {
  blds: [], floats: [], genX: 0,
  reset() { this.blds = []; this.floats = []; this.genX = -60; this.gen(W + 600, true); },
  gen(upTo, start) {
    const T = BG.layers.T;
    while (this.genX < upTo) {
      const w = randi(46, 112);
      const tall = start || Math.random() < .62;
      const y = tall ? randi(8, 70) : randi(72, 150);
      const b = { x: this.genX, y, w, T };
      this.blds.push(b);
      let gap = Math.random() < .2 ? randi(46, 80) : randi(4, 34);
      if (start) gap = randi(4, 16);
      if (gap > 40) this.floats.push({ x: this.genX + w + gap / 2 - 16, y: randi(28, 70), w: 32, h: 13, ph: Math.random() * TAU });
      this.genX += w + gap;
    }
  },
  anchorAt(px, py) {
    for (const f of this.floats) if (px >= f.x - 2 && px <= f.x + f.w + 2 && py >= f.y - 2 && py <= f.y + f.h + 2) return true;
    for (const b of this.blds) if (px >= b.x && px <= b.x + b.w && py >= b.y - 1) return true;
    return false;
  },
  update(camX) {
    this.gen(camX + W + 300);
    while (this.blds.length && this.blds[0].x + this.blds[0].w < camX - 80) this.blds.shift();
    while (this.floats.length && this.floats[0].x + this.floats[0].w < camX - 80) this.floats.shift();
  },
};
