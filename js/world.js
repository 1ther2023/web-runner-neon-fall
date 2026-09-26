'use strict';
// ============ 城市：可粘附的建筑与浮空广告艇 ============
const SIGNS = ['HOTEL', 'BAR', 'RAMEN', '2099', 'NEON', 'CLUB', '24H', 'CYBER', 'SUSHI', 'WEB', 'ARCADE', 'OPEN'];
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
      this.renderBld(b); this.blds.push(b);
      let gap = Math.random() < .2 ? randi(46, 80) : randi(4, 34);
      if (start) gap = randi(4, 16);
      if (gap > 40) this.floats.push(this.renderFloat({ x: this.genX + w + gap / 2 - 16, y: randi(28, 70), w: 32, h: 13, ph: Math.random() * TAU }));
      this.genX += w + gap;
    }
  },
  renderBld(b) {
    const T = b.T, top = 26, h = H - b.y + 4; b.top = top;
    const [c, x] = mkCanvas(b.w, h + top); b.c = c;
    const base = pick(T.bld); const Y = top;
    x.fillStyle = base; x.fillRect(0, Y, b.w, h);
    x.fillStyle = '#00000055'; x.fillRect(b.w - 4, Y, 4, h);
    x.fillStyle = T.sky[3] + '66'; x.fillRect(0, Y, 1, h);
    // 屋檐
    x.fillStyle = '#ffffff22'; x.fillRect(0, Y, b.w, 2);
    x.fillStyle = '#00000066'; x.fillRect(0, Y + 2, b.w, 1);
    const style = randi(0, 2), lit = rand(.2, .5);
    if (style === 0) {
      for (let wy = Y + 6; wy < Y + h; wy += 7) for (let wx = 4; wx < b.w - 6; wx += 6) {
        x.fillStyle = Math.random() < lit ? pick(T.win) : '#00000055'; x.fillRect(wx, wy, 3, 4);
        if (x.fillStyle !== '#00000055') { x.fillStyle = '#ffffff55'; x.fillRect(wx, wy, 1, 1); }
      }
    } else if (style === 1) {
      for (let wy = Y + 6; wy < Y + h; wy += 5) {
        let wx = 3; while (wx < b.w - 5) { const len = randi(3, 12); x.fillStyle = Math.random() < lit ? pick(T.win) + 'cc' : '#00000044'; x.fillRect(wx, wy, Math.min(len, b.w - 5 - wx), 2); wx += len + 1; }
      }
    } else {
      for (let wx = 4; wx < b.w - 6; wx += 8) { x.fillStyle = '#00000044'; x.fillRect(wx, Y + 6, 4, h); for (let wy = Y + 6; wy < Y + h; wy += 3) if (Math.random() < lit * .6) { x.fillStyle = pick(T.win); x.fillRect(wx + 1, wy, 2, 2); } }
    }
    // 屋顶装饰
    const f = Math.random();
    if (f < .3) { // 水塔
      const tx = randi(4, b.w - 18);
      x.fillStyle = '#4a2a1a'; x.fillRect(tx, Y - 14, 12, 10); x.fillStyle = '#6a3a22'; x.fillRect(tx, Y - 14, 12, 2);
      x.fillStyle = '#2a1a10'; x.fillRect(tx - 1, Y - 16, 14, 2); x.fillRect(tx + 1, Y - 4, 1, 4); x.fillRect(tx + 10, Y - 4, 1, 4);
    } else if (f < .6) { // 天线
      const ax = randi(6, b.w - 6);
      x.fillStyle = '#556'; x.fillRect(ax, Y - 22, 1, 22); x.fillRect(ax - 3, Y - 14, 7, 1); x.fillRect(ax - 2, Y - 18, 5, 1);
      b.light = { x: ax, y: Y - 23 };
    } else if (f < .9 && b.w > 50) { // 霓虹招牌
      const txt = pick(SIGNS), tw = textW(txt, 1) + 6, sx = randi(2, Math.max(2, b.w - tw - 2)), nc = pick(T.neon);
      x.fillStyle = '#111'; x.fillRect(sx, Y - 13, tw, 11); x.fillStyle = nc; x.fillRect(sx, Y - 13, tw, 1); x.fillRect(sx, Y - 3, tw, 1);
      x.fillRect(sx, Y - 13, 1, 11); x.fillRect(sx + tw - 1, Y - 13, 1, 11);
      drawText(x, txt, sx + 3, Y - 10, nc, 1, 'left', false);
      x.fillStyle = '#333'; x.fillRect(sx + 3, Y - 2, 1, 2); x.fillRect(sx + tw - 4, Y - 2, 1, 2);
      b.sign = { x: sx, y: Y - 13, w: tw, c: nc };
    }
  },
  renderFloat(f) {
    const [c, x] = mkCanvas(f.w, f.h + 6); f.c = c;
    x.fillStyle = '#2a2a3a'; x.fillRect(2, 0, f.w - 4, f.h); x.fillRect(0, 2, f.w, f.h - 4);
    x.fillStyle = '#5a5a7a'; x.fillRect(2, 0, f.w - 4, 1);
    const col = pick(BG.layers.T.neon); x.fillStyle = col; x.fillRect(3, 3, f.w - 6, f.h - 6);
    x.fillStyle = '#000'; x.fillRect(4, 4, f.w - 8, f.h - 8);
    drawText(x, pick(['BUY', 'EAT', 'RUN', 'FLY', 'JOY']), f.w / 2, 4, col, 1, 'center', false);
    x.fillStyle = '#ff3040'; x.fillRect(f.w / 2 - 1, f.h, 2, 2);
    x.fillStyle = '#446'; x.fillRect(6, f.h, 3, 3); x.fillRect(f.w - 9, f.h, 3, 3);
    return f;
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
  draw(ctx, camX, t) {
    for (const b of this.blds) {
      const sx = Math.round(b.x - camX); if (sx > W || sx + b.w < 0) continue;
      ctx.drawImage(b.c, sx, b.y - b.top);
      if (b.light && Math.sin(t * 4 + b.x) > 0) { ctx.fillStyle = '#ff2030'; ctx.fillRect(sx + b.light.x - 1, b.y - b.top + b.light.y, 3, 2); }
      if (b.sign && Math.sin(t * 9 + b.x * .1) > -.8) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + Math.sin(t * 3 + b.x) * .1;
        ctx.drawImage(glowSpr(b.sign.c, 12), sx + b.sign.x + b.sign.w / 2 - 38, b.y - b.top + b.sign.y - 32, 76, 76);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    for (const f of this.floats) {
      const sx = Math.round(f.x - camX); if (sx > W || sx + f.w < 0) continue;
      ctx.drawImage(f.c, sx, Math.round(f.y));
    }
  },
};
