// ============ 3D 特效：弹幕 / 粒子 / 光环 / 闪电 / 激光 / 蛛丝 / 掉落物 / 召唤物 ============
import { THREE, scene, renderer, std, glow, additive, mesh, G3, col, stretch, Sync } from './core.js';

const DIST = 270 / 2 / Math.tan(20 * Math.PI / 180);
const _o = new THREE.Object3D(), _c = new THREE.Color();
function inst(g, m, n) { const im = new THREE.InstancedMesh(g, m, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.count = 0; scene.add(im); return im; }
function hdr(hex, k) { return _c.copy(col(hex)).multiplyScalar(k); }

// ---------- 弹幕（实例化：白色核心 + 彩色辉光） ----------
const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.3, 1.3) }); coreMat.toneMapped = false;
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }); haloMat.toneMapped = false;
const ebCore = inst(G3.sph(10), coreMat, 900), ebHalo = inst(G3.sph(10), haloMat, 900);
const shotMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); shotMat.toneMapped = false;
const shots = inst(G3.sph(8), shotMat, 500);
ebCore.renderOrder = 6; ebHalo.renderOrder = 5;

// ---------- 粒子 ----------
const PMAX = 1400;
function pointsLayer(blend) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(PMAX), 1).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 4 } }, transparent: true, depthWrite: false, blending: blend,
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float uPx;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uPx * ${DIST.toFixed(2)} / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: blend === THREE.AdditiveBlending
      ? `varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(vC * a * (1.0 + (1.0 - d) * 1.5), a); }`
      : `varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(vC, (1.0 - d) * .8); }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
}
const glowPts = pointsLayer(THREE.AdditiveBlending), smokePts = pointsLayer(THREE.NormalBlending);
glowPts.renderOrder = 8;
const LMAX = 6000;
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(LMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); lineMat.toneMapped = false;
const lines = new THREE.LineSegments(lineGeo, lineMat); lines.frustumCulled = false; lines.renderOrder = 9; scene.add(lines);

// 线段缓冲写入器（火花拖尾 / 闪电 / 光环 / 瞄准线共用）
const LB = { n: 0, p: lineGeo.attributes.position.array, c: lineGeo.attributes.color.array,
  seg(x0, y0, z0, x1, y1, z1, r, g, b) { if (this.n >= LMAX - 2) return; let i = this.n * 3; const p = this.p, c = this.c; p[i] = x0; p[i + 1] = y0; p[i + 2] = z0; c[i] = r; c[i + 1] = g; c[i + 2] = b; i += 3; p[i] = x1; p[i + 1] = y1; p[i + 2] = z1; c[i] = r; c[i + 1] = g; c[i + 2] = b; this.n += 2; },
  ring(x, y, rad, r, g, b, n) { n = n || Math.min(64, 16 + rad | 0); let px = x + rad, py = y; for (let k = 1; k <= n; k++) { const a = k / n * Math.PI * 2, nx = x + Math.cos(a) * rad, ny = y + Math.sin(a) * rad; this.seg(px, py, 2, nx, ny, 2, r, g, b); px = nx; py = ny; } },
};

// ---------- 网格池 ----------
function pool(make) { const P = { list: [], i: 0, get() { let o = this.list[this.i]; if (!o) { o = make(); this.list.push(o); scene.add(o.root || o); } this.i++; (o.root || o).visible = true; return o; }, begin() { this.i = 0; }, end() { for (let k = this.i; k < this.list.length; k++) (this.list[k].root || this.list[k]).visible = false; } }; return P; }
const ropeMat = glow('#dfeaff', 1.6);
const ropes = pool(() => mesh(G3.cyl(6), ropeMat, .45));
const splats = pool(() => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const m = mesh(G3.box(), ropeMat, 5, .35, .35); m.rotation.z = i * Math.PI / 4; g.add(m); } return g; });
const beams = pool(() => { const root = new THREE.Group(); const halo = mesh(G3.cyl(12), additive('#ffffff', 1, .6)); const core = mesh(G3.cyl(12), glow('#ffffff', 3)); root.add(halo, core); return { root, halo, core }; });
const bombs = pool(() => { const g = new THREE.Group(); g.add(mesh(G3.sph(12), std({ color: 0xeef4ff, roughness: .5 }), 2.6, 3.4, 2.6)); g.add(mesh(G3.sph(8), glow('#ff5a6a', 3), 1, 1, 1, 0, 0, 2.4)); return g; });
const blades = pool(() => { const g = new THREE.Group(); const m = glow('#8af0ff', 2.5); for (let i = 0; i < 3; i++) { const b = mesh(G3.box(), m, 9, 1.2, .6); b.rotation.z = i * Math.PI / 3; g.add(b); } g.add(mesh(G3.sph(10), glow('#ffffff', 3), 1.6)); g.add(mesh(G3.sph(12), additive('#4ad8ff', 1.5, .35), 6)); return g; });
const bots = pool(() => {
  const g = new THREE.Group(), m = std({ color: 0x2a2a30, metalness: .8, roughness: .3 });
  g.add(mesh(G3.sph(12), m, 3, 2, 2.4)); g.add(mesh(G3.sph(10), glow('#ffe04a', 2.5), 1.4, .8, 1.4, 0, 1.6, 0)); g.add(mesh(G3.sph(6), glow('#ff3040', 4), .6, .6, .6, -2.8, 0, 1));
  const legs = []; for (let i = 0; i < 4; i++) { const l = mesh(G3.cyl(4), m, .35, 4.5, .35); g.add(l); legs.push(l); } g.userData.legs = legs; return g;
});
const claws = pool(() => { const root = new THREE.Group(); const a = mesh(G3.cyl(8), std({ color: 0x8a8a9a, metalness: .9, roughness: .25 })); const b = mesh(G3.cyl(8), std({ color: 0xffcf4a, metalness: .9, roughness: .25, emissive: 0x6a4000 })); const tip = mesh(G3.cone(8), glow('#ffcf4a', 3)); root.add(a, b, tip); return { root, a, b, tip }; });

// ---------- 掉落物 ----------
const coinMat = std({ color: 0xffc83a, metalness: 1, roughness: .22, emissive: 0x6a3a00, emissiveIntensity: .8 });
const coins = inst(geoCoin(), coinMat, 400);
function geoCoin() { const g = new THREE.CylinderGeometry(2.6, 2.6, .8, 20); g.rotateX(Math.PI / 2); return g; }
const enMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 2.2, 3) }); enMat.toneMapped = false;
const energy = inst(G3.oct(), enMat, 400);
const hearts = pool(() => { const g = new THREE.Group(), m = glow('#ff3050', 2.2); g.add(mesh(G3.sph(10), m, 1.8, 1.8, 1.4, -1.2, .8, 0), mesh(G3.sph(10), m, 1.8, 1.8, 1.4, 1.2, .8, 0)); const c = mesh(G3.cone(10), m, 2.6, 3.6, 1.4, 0, -1.5, 0); c.rotation.z = Math.PI; g.add(c); return g; });
const chests = pool(() => { const g = new THREE.Group(); g.add(mesh(G3.box(), std({ color: 0x6a3410, roughness: .6 }), 10, 7, 7)); g.add(mesh(G3.box(), std({ color: 0xffc83a, metalness: 1, roughness: .25, emissive: 0x805000 }), 10.6, 1.2, 7.6, 0, 1, 0)); g.add(mesh(G3.sph(16), additive('#ffcf4a', .5, .25), 8)); return g; });

const ultAura = mesh(G3.sph(24), additive('#ff3040', .6, .18), 1); scene.add(ultAura);

export const FX3D = {
  update(t, cx, cy) {
    const P = Player;
    // 敌弹
    let n = 0;
    for (const b of EB.list) {
      if (n >= 900) break;
      const warn = b.delay > 0, r = b.r;
      _o.position.set(b.x, -b.y, 1); _o.rotation.set(0, 0, 0);
      _o.scale.setScalar(warn ? .01 : r * .5); _o.updateMatrix(); ebCore.setMatrixAt(n, _o.matrix);
      _o.scale.setScalar(warn ? r * .8 : r * 1.25); _o.updateMatrix(); ebHalo.setMatrixAt(n, _o.matrix);
      ebHalo.setColorAt(n, hdr(b.col, warn ? .3 : .95)); n++;
    }
    ebCore.count = ebHalo.count = n; ebCore.instanceMatrix.needsUpdate = ebHalo.instanceMatrix.needsUpdate = true; if (ebHalo.instanceColor) ebHalo.instanceColor.needsUpdate = true;
    // 玩家弹
    n = 0;
    for (const s of Shots.list) {
      if (n >= 500) break;
      _o.position.set(s.x, -s.y, 1.5); _o.rotation.set(0, 0, Math.atan2(-s.vy, s.vx));
      _o.scale.set(s.kind === 'web' ? 4.2 : 3, s.kind === 'web' ? 1.4 : 1, 1.2); _o.updateMatrix(); shots.setMatrixAt(n, _o.matrix); shots.setColorAt(n, hdr(s.col, 1.6)); n++;
    }
    shots.count = n; shots.instanceMatrix.needsUpdate = true; if (shots.instanceColor) shots.instanceColor.needsUpdate = true;

    // 粒子
    const gp = glowPts.geometry.attributes, sp = smokePts.geometry.attributes;
    let ng = 0, ns = 0; LB.n = 0;
    const pxk = renderer.domElement.height / 270; glowPts.material.uniforms.uPx.value = pxk; smokePts.material.uniforms.uPx.value = pxk;
    for (const p of FX.parts) {
      const k = p.life / p.max, c = col(p.col);
      if (p.type === 'line') { const m = 1.6 * k + .3; LB.seg(p.x, -p.y, 3, p.x - p.vx * .035, -(p.y - p.vy * .035), 3, c.r * m * 2, c.g * m * 2, c.b * m * 2); continue; }
      if (p.type === 'smoke') {
        if (ns >= PMAX) continue; const i = ns++;
        sp.position.array.set([p.x, -p.y, -1], i * 3); sp.color.array.set([c.r * .6, c.g * .6, c.b * .6], i * 3); sp.size.array[i] = p.size * (1.8 - k) * 1.6; continue;
      }
      if (ng >= PMAX) continue; const i = ng++;
      const m = p.type === 'flash' ? .9 * k : 1.1 + k * .8;
      gp.position.array.set([p.x, -p.y, 4], i * 3); gp.color.array.set([c.r * m, c.g * m, c.b * m], i * 3);
      gp.size.array[i] = p.type === 'flash' ? p.size * (2.2 - k) * .8 : Math.max(1.2, p.size * 1.8 * (k > .5 ? 1 : k * 2 + .2));
    }
    // 拾取物光点
    for (const p of Pickups.list) if (p.type === 'energy' && ng < PMAX) { const i = ng++; gp.position.array.set([p.x, -p.y, 3], i * 3); gp.color.array.set([.25, .9, 1.3], i * 3); gp.size.array[i] = 9; }
    glowPts.geometry.setDrawRange(0, ng); smokePts.geometry.setDrawRange(0, ns);
    for (const a of [gp.position, gp.color, gp.size, sp.position, sp.color, sp.size]) a.needsUpdate = true;
    // 光环 / 闪电
    for (const r of FX.rings) {
      const k = 1 - r.life / r.max, rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)), c = col(r.col), m = (1 - k) * 2.2;
      LB.ring(r.x, -r.y, rad, c.r * m, c.g * m, c.b * m); if (r.th > 1) LB.ring(r.x, -r.y, rad * .94, c.r * m * .6, c.g * m * .6, c.b * m * .6);
    }
    for (const b of FX.bolts) { const c = col(b.col); for (let i = 0; i < b.pts.length - 1; i++) { const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1]; const k = Math.min(1, b.life / .15); LB.seg(x0, -y0, 3, x1, -y1, 3, c.r * 1.3 * k, c.g * 1.3 * k, c.b * 1.3 * k); LB.seg(x0 + .6, -y0, 3, x1 + .6, -y1, 3, .7 * k, .7 * k, .7 * k); } }
    // 激光预警线
    for (const L of Lasers.list) if (L.t < L.warn && ((L.t * 16) | 0) % 2) { const c = col(L.col); LB.seg(L.x, -L.y, 2, L.x + Math.cos(L.ang) * L.len, -(L.y + Math.sin(L.ang) * L.len), 2, c.r * 1.5, c.g * 1.5, c.b * 1.5); }
    lineGeo.setDrawRange(0, LB.n); lineGeo.attributes.position.needsUpdate = lineGeo.attributes.color.needsUpdate = true;

    // 激光与光束
    beams.begin();
    const beam = (x0, y0, x1, y1, w, hex, k) => { const B = beams.get(); stretch(B.core, x0, -y0, 1, x1, -y1, 1, Math.max(.3, w * .28 * k)); stretch(B.halo, x0, -y0, 1, x1, -y1, 1, w * .8 * k + 1); B.halo.material.color.copy(col(hex)).multiplyScalar(1.6); B.core.material.color.copy(col(hex)).lerp(new THREE.Color(1, 1, 1), .6).multiplyScalar(3); };
    for (const L of Lasers.list) if (L.t >= L.warn) { const k = 1 - (L.t - L.warn) / L.on; beam(L.x, L.y, L.x + Math.cos(L.ang) * L.len, L.y + Math.sin(L.ang) * L.len, L.w, L.col, (k < .2 ? k * 5 : 1) * (1 + Math.sin(t * 60) * .1)); }
    for (const B of PBeams) beam(B.x, B.y, B.x + Math.cos(B.a) * 600, B.y + Math.sin(B.a) * 600, B.w, '#ffe04a', B.life / .3);
    beams.end();
    bombs.begin(); for (const b of Bombs.list) { const g = bombs.get(); g.position.set(b.x, -b.y, 2); g.rotation.z = t * 10; } bombs.end();

    // 蛛丝
    ropes.begin(); splats.begin();
    if (P.alive && G.state !== 'title') P.hands.forEach((h, i) => {
      const r = h.rope; if (!r) return; const [hx, hy] = P.handWorld(i);
      let ex = r.ax, ey = r.ay, ez = -6; if (r.state === 'fly') { ex = hx + (r.ax - hx) * r.t; ey = hy + (r.ay - hy) * r.t; ez = -6 * r.t; }
      stretch(ropes.get(), hx, -hy, i ? 1.4 : -1.4, ex, -ey, ez, .45);
      if (r.state === 'stuck') { const s = splats.get(); s.position.set(ex, -ey, ez + .5); }
    });
    for (const s of FX.strands) {
      const ex = s.ax + Math.sin(s.a) * s.len, ey = s.ay + Math.cos(s.a) * s.len, m = ropes.get();
      stretch(m, s.ax, -s.ay, -6, ex, -ey, -3, .35 * Math.min(1, s.life));
      const sp2 = splats.get(); sp2.position.set(s.ax, -s.ay, -5.5);
    }
    ropes.end(); splats.end();

    // 掉落物
    let nc = 0, ne = 0; hearts.begin(); chests.begin();
    for (const p of Pickups.list) {
      if (p.type === 'coin' && nc < 400) { _o.position.set(p.x, -p.y, 2); _o.rotation.set(0, t * 6 + p.ph, 0); _o.scale.setScalar(.85); _o.updateMatrix(); coins.setMatrixAt(nc++, _o.matrix); }
      else if (p.type === 'energy' && ne < 400) { _o.position.set(p.x, -p.y, 2); _o.rotation.set(t * 3 + p.ph, t * 4, 0); _o.scale.setScalar(1.7); _o.updateMatrix(); energy.setMatrixAt(ne++, _o.matrix); }
      else if (p.type === 'heart') { const g = hearts.get(); g.position.set(p.x, -p.y, 2); g.rotation.y = t * 3; }
      else if (p.type === 'chest') { const g = chests.get(); g.position.set(p.x, -p.y, 2); g.rotation.set(Math.sin(t * 3) * .3, t * 2, 0); }
    }
    coins.count = nc; energy.count = ne; coins.instanceMatrix.needsUpdate = energy.instanceMatrix.needsUpdate = true; hearts.end(); chests.end();

    // 召唤物（与 2D 逻辑位置完全一致）
    blades.begin(); bots.begin(); claws.begin();
    if (P.alive && G.state !== 'title') for (const o of Skills.owned) {
      const S = SKMAP[o.id];
      if (o.id === 'orbit') { const st = S.st(o.lv); for (let i = 0; i < st.n; i++) { const [x, y] = S.pos(i, st.n, st.r), g = blades.get(); g.position.set(x, -y, 2); g.rotation.z = t * 18; } }
      else if (o.id === 'bot') { const st = S.st(o.lv); for (let i = 0; i < st.n; i++) { const [x, y] = S.pos(i, st.n), g = bots.get(); g.position.set(x, -y, 3); g.rotation.set(.3, -.4, Math.sin(t * 6 + i) * .2); g.userData.legs.forEach((l, j) => { const a = j * Math.PI / 2 + .6 + Math.sin(t * 20 + j) * .2; l.position.set(Math.cos(a) * 2.8, -1.2, Math.sin(a) * 2.4); l.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); }); } }
      else if (o.id === 'claw') {
        const st = S.st(o.lv), s = o.s, k = (s.a || 0) / .25;
        for (let i = 0; i < 4; i++) {
          const base = -Math.PI / 2 + (i - 1.5) * .5, a = s.a > 0 ? base + (1 - k) * Math.PI * 2 * (i % 2 ? 1 : -1) : base + Math.sin(t * 3 + i) * .2;
          const len = s.a > 0 ? st.r : 12, C = claws.get(), x0 = P.x, y0 = P.y - 4, mx = x0 + Math.cos(a) * len * .5, my = y0 + Math.sin(a) * len * .5 - 4, ex = x0 + Math.cos(a) * len, ey = y0 + Math.sin(a) * len;
          stretch(C.a, x0, -y0, -2, mx, -my, -2, 1); stretch(C.b, mx, -my, -2, ex, -ey, -2, .7);
          C.tip.position.set(ex, -ey, -2); C.tip.rotation.z = -a - Math.PI / 2; C.tip.scale.set(1.2, 3, 1.2);
        }
        if (s.a > 0) { const c = col('#ffcf4a'); LB.ring(P.x, -P.y, st.r * (1.2 - k * .2), c.r * 2 * k, c.g * 2 * k, c.b * 2 * k); }
      }
    }
    blades.end(); bots.end(); claws.end();
    lineGeo.setDrawRange(0, LB.n);

    ultAura.visible = G.ultT > 0 && P.alive;
    if (ultAura.visible) { ultAura.position.set(P.x, -P.y, 0); ultAura.scale.setScalar(20 + Math.sin(t * 20) * 3); }
  },
};
