// ============ 3D 城市：玩法建筑 / 远景天际线 / 天空 / 黑潮 ============
import { THREE, scene, std, glow, additive, mesh, G3, canvasTex, textTex, col, Sync } from './core.js';

const DIST = 270 / 2 / Math.tan(20 * Math.PI / 180);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- 程序化窗户材质（按世界坐标生成，所有楼共享） ----------
const winMats = new Map();
function windowMat(base, T, bright, cell) {
  const k = base + T.name + bright + cell;
  let m = winMats.get(k); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color: col(base).clone().multiplyScalar(.9), roughness: .8, metalness: .25 });
  const cs = T.win.map(h => col(h).clone());
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uA: { value: cs[0] }, uB: { value: cs[1] }, uC: { value: cs[2] }, uBright: { value: bright }, uCell: { value: new THREE.Vector2(cell, cell * 1.35) } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vON;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        vWP = (modelMatrix * wp4).xyz; vON = normal;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vON; uniform vec3 uA, uB, uC; uniform float uBright; uniform vec2 uCell;
        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vON.y) < .5) {
          vec2 q = abs(vON.z) > .5 ? vWP.xy : vec2(vWP.z, vWP.y);
          vec2 g = q / uCell, c = floor(g), f = fract(g);
          float win = step(.18, f.x) * step(f.x, .78) * step(.22, f.y) * step(f.y, .8);
          float band = step(.93, f.y);
          float h = h21(c + floor(vWP.x / 400.0));
          float lit = step(.86, h);
          vec3 wc = mix(uA, uB, step(.5, fract(h * 7.13))); wc = mix(wc, uC, step(.85, fract(h * 3.71)));
          float flick = .55 + .45 * fract(h * 13.7);
          totalEmissiveRadiance += wc * win * lit * uBright * flick;
          diffuseColor.rgb *= 1.0 - win * .35 + band * .2;
        }`);
  };
  winMats.set(k, m); return m;
}

// ---------- 天空、月亮、星星 ----------
let skyT = null, moon, moonGlow, stars;
function dimHex(h, k) { const c = col(h).clone(); const l = c.r * .3 + c.g * .59 + c.b * .11; c.r = (l + (c.r - l) * .6) * k; c.g = (l + (c.g - l) * .6) * k; c.b = (l + (c.b - l) * .6) * k; return '#' + c.getHexString(); }
function setSky(T) {
  if (skyT === T) return; skyT = T;
  const tex = canvasTex(4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); T.sky.forEach((c, i) => g.addColorStop(i / (T.sky.length - 1), dimHex(c, .6))); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  if (scene.background && scene.background.dispose) scene.background.dispose();
  scene.background = tex;
  scene.fog.color.set(dimHex(T.sky[2], .45));
  moon.material.color.set(dimHex(T.moon, .6)); moonGlow.material.color.set(col(T.moon).clone().multiplyScalar(.18));
  Far.rebuild(T);
}
function initSky() {
  const mt = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(90,80,90,${Math.random() * .25})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 14, 0, 7); x.fill(); }
  });
  moon = new THREE.Mesh(G3.sph(40), new THREE.MeshBasicMaterial({ map: mt, fog: false })); moon.scale.setScalar(180);
  moonGlow = new THREE.Mesh(G3.sph(24), new THREE.MeshBasicMaterial({ transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  moonGlow.scale.setScalar(260);
  const n = 400, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 9000; p[i * 3 + 1] = Math.random() * 3000 - 400; p[i * 3 + 2] = -3200; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: true, fog: false, transparent: true, opacity: .8 }));
  scene.add(moon, moonGlow, stars);
}

// ---------- 远景天际线（实例化，两个周期无缝平铺） ----------
const Far = {
  layers: [],
  rebuild(T) {
    for (const L of this.layers) { scene.remove(L.mesh); L.mesh.dispose(); }
    this.layers = [];
    const cfg = [{ z0: -260, z1: -420, P: 2600, n: 70, wmin: 40, wmax: 110, top: [-40, 120], b: .16, c: 7, dark: .5 },
                 { z0: -800, z1: -1200, P: 4200, n: 80, wmin: 70, wmax: 190, top: [-60, 140], b: .1, c: 10, dark: .35 }];
    for (const C of cfg) {
      const m = windowMat(dimHex(T.bld[0], C.dark), T, C.b, C.c);
      const im = new THREE.InstancedMesh(G3.box(), m, C.n * 2);
      const o = new THREE.Object3D(); let x = 0;
      for (let i = 0; i < C.n; i++) {
        const w = C.wmin + Math.random() * (C.wmax - C.wmin), top = C.top[0] + Math.random() * (C.top[1] - C.top[0]), z = C.z0 + Math.random() * (C.z1 - C.z0);
        const h = 1400 - top; const d = 40 + Math.random() * 80;
        for (let k = 0; k < 2; k++) { o.position.set(x + w / 2 + k * C.P - C.P, -top - h / 2, z); o.scale.set(w, h, d); o.updateMatrix(); im.setMatrixAt(i * 2 + k, o.matrix); }
        x += w + Math.random() * 30; if (x > C.P) break;
      }
      im.instanceMatrix.needsUpdate = true; scene.add(im);
      this.layers.push({ mesh: im, P: C.P, z: (C.z0 + C.z1) / 2 });
    }
  },
  update(camX) { for (const L of this.layers) L.mesh.position.x = Math.floor(camX / L.P) * L.P + L.P; },
};

// ---------- 玩法建筑 ----------
const FRONT = -6;
const propMats = {
  wood: std({ color: 0x4a2a1a, roughness: .8 }), rim: std({ color: 0x2a1a10, roughness: .7, metalness: .3 }),
  steel: std({ color: 0x5a5e6a, roughness: .4, metalness: .8 }), ac: std({ color: 0x6a6e78, roughness: .6, metalness: .4 }),
  red: glow('#ff2030', 3),
};
const cornice = new Map();
function corniceMat(T) { let m = cornice.get(T.name); if (!m) { m = std({ color: col(dimHex(T.bld[1], 1.2)), roughness: .6, metalness: .4 }); cornice.set(T.name, m); } return m; }

function buildBuilding(b) {
  const T = b.T, s = hash(b.x * .37 + b.w), s2 = hash(b.x * .91), root = new THREE.Group();
  const hgt = 900 - b.y, d = 60 + s * 70;
  const base = dimHex(T.bld[Math.floor(s2 * T.bld.length)], .95);
  const body = mesh(G3.box(), windowMat(base, T, .32, 5 + Math.floor(s * 3)), b.w, hgt, d, b.x + b.w / 2, -b.y - hgt / 2, FRONT - d / 2);
  root.add(body);
  root.add(mesh(G3.box(), corniceMat(T), b.w + 2, 2.2, d + 2, b.x + b.w / 2, -b.y + 1, FRONT - d / 2));
  // 霓虹竖条
  if (s2 > .55) { const nc = T.neon[Math.floor(s * 3)]; root.add(mesh(G3.box(), glow(nc, .9), 1, Math.min(160, hgt), 1.2, b.x + (s > .5 ? 1 : b.w - 1), -b.y - 90, FRONT + .8)); }
  // 屋顶道具
  const top = -b.y, cx = b.x, zc = FRONT - d / 2, r = hash(b.x * 1.7);
  let blink = null;
  if (r < .28) {
    const tx = cx + 10 + s * (b.w - 24);
    root.add(mesh(G3.cyl(16), propMats.wood, 6, 11, 6, tx, top + 13, zc));
    root.add(mesh(G3.cone(16), propMats.rim, 7, 5, 7, tx, top + 21, zc));
    for (const [a, c] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) root.add(mesh(G3.cyl(6), propMats.rim, .6, 8, .6, tx + a, top + 4, zc + c));
  } else if (r < .55) {
    const ax = cx + 8 + s * (b.w - 16);
    root.add(mesh(G3.cyl(6), propMats.steel, .6, 34, .6, ax, top + 17, zc + 10));
    root.add(mesh(G3.box(), propMats.steel, 10, .6, .6, ax, top + 24, zc + 10), mesh(G3.box(), propMats.steel, 7, .6, .6, ax, top + 29, zc + 10));
    blink = mesh(G3.sph(8), propMats.red, 1.4, 1.4, 1.4, ax, top + 35, zc + 10); root.add(blink);
  } else if (r < .9 && b.w > 50) {
    const txt = typeof SIGNS !== 'undefined' ? SIGNS[Math.floor(s * SIGNS.length)] : 'NEON', nc = T.neon[Math.floor(s2 * 3)];
    const sw = Math.min(b.w - 6, 16 + txt.length * 8), sh = sw / 4;
    const mat = new THREE.MeshBasicMaterial({ map: textTex(txt, nc), toneMapped: false, color: new THREE.Color(.75, .75, .75) });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat); sign.position.set(cx + b.w / 2, top + sh / 2 + 4, FRONT - 2); root.add(sign);
    for (const k of [-1, 1]) root.add(mesh(G3.cyl(6), propMats.steel, .5, 5, .5, cx + b.w / 2 + k * sw * .35, top + 2.5, FRONT - 3));
    b._sign = mat;
  }
  for (let i = 0; i < 2; i++) if (hash(b.x + i * 9) > .5) root.add(mesh(G3.box(), propMats.ac, 7, 4, 6, cx + 6 + hash(b.x * 3 + i) * (b.w - 14), top + 2, zc + (i ? -12 : 12)));
  return { root, blink, b };
}
function buildFloat(f) {
  const root = new THREE.Group(), z = FRONT - 5, nc = (BG.layers.T.neon)[Math.floor(hash(f.x) * 3)];
  root.add(mesh(G3.box(), propMats.steel, f.w + 2, f.h + 2, 6, 0, 0, z));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(f.w - 2, f.h - 2), new THREE.MeshBasicMaterial({ map: textTex(['BUY', 'EAT', 'RUN', 'FLY', 'JOY'][Math.floor(hash(f.x * 3) * 5)], nc), toneMapped: false, color: new THREE.Color(.7, .7, .7) }));
  scr.position.z = z + 3.1; root.add(scr);
  const thr = [];
  for (const k of [-1, 1]) { root.add(mesh(G3.cyl(10), propMats.ac, 2, 4, 2, k * (f.w / 2 - 4), -f.h / 2 - 2, z)); const fl = mesh(G3.cone(10), additive('#4ad8ff', 3), 1.4, 4, 1.4, k * (f.w / 2 - 4), -f.h / 2 - 6, z); fl.rotation.z = Math.PI; thr.push(fl); root.add(fl); }
  root.add(mesh(G3.sph(6), propMats.red, .9, .9, .9, 0, -f.h / 2 - 1, z + 3));
  return { root, thr };
}

// ---------- 黑潮（底部与左侧） ----------
const tideMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: { uT: { value: 0 }, uX: { value: 0 }, uSide: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `varying vec2 vUv; uniform float uT, uX, uSide;
    void main(){
      float a = uSide > .5 ? vUv.y * 60.0 : (vUv.x * 480.0 + uX);
      float edge = .55 + sin(a * .05 + uT * 2.2) * .08 + sin(a * .13 - uT * 3.1) * .05 + sin(a * .021 + uT) * .1;
      float d = uSide > .5 ? (1.0 - vUv.x) : vUv.y;
      if (d > edge + .02) discard;
      float rim = smoothstep(edge - .06, edge, d);
      vec3 c = mix(vec3(.02, .005, .04), vec3(.6, .2, 1.2), rim);
      float eyes = step(.985, fract(sin(floor(a * .25) * 91.7) * 4375.5)) * step(.3, d) * step(d, .4) * step(.5, fract(uT * .5 + a));
      gl_FragColor = vec4(c + eyes * vec3(2.0), 1.0);
    }`,
});
let tideB, tideL, abyssGlow;

export const World3D = {
  group: new THREE.Group(),
  init() {
    initSky(); scene.add(this.group);
    this.bs = new Sync(this.group, b => buildBuilding(b), () => { });
    this.fs = new Sync(this.group, f => buildFloat(f), (f, v) => { v.root.position.set(f.x + f.w / 2, -f.y - f.h / 2, 0); });
    tideB = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tideMat); tideB.renderOrder = 10;
    const mL = tideMat.clone(); mL.uniforms = { uT: tideMat.uniforms.uT, uX: { value: 0 }, uSide: { value: 1 } };
    tideL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mL); tideL.renderOrder = 10;
    abyssGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      map: canvasTex(4, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,90,40,.5)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }) }));
    scene.add(tideB, tideL, abyssGlow);
  },
  update(camX, camY, t) {
    setSky(BG.layers.T);
    const cx = camX + 240, cy = -(camY + 135);
    moon.position.set(cx + 900, cy + 480, -2600); moonGlow.position.copy(moon.position); moonGlow.position.z -= 60;
    stars.position.set(cx * .9, cy * .5, 0);
    Far.update(camX);
    this.bs.run(World.blds); this.fs.run(World.floats);
    for (const [, v] of this.bs.map) if (v.blink) v.blink.visible = Math.sin(t * 4 + v.b.x) > 0;
    for (const [, v] of this.fs.map) for (const f of v.thr) f.scale.y = 3 + Math.sin(t * 40 + f.position.x) * 1;
    // 黑潮贴合屏幕：z 平面上的可视宽度随深度变化
    const zB = 30, kB = (DIST - zB) / DIST;
    tideB.position.set(cx, cy - 135 * kB + 14 * kB, zB); tideB.scale.set(490 * kB, 34 * kB, 1);
    tideMat.uniforms.uT.value = t; tideMat.uniforms.uX.value = camX;
    abyssGlow.position.set(cx, cy - 135 * kB + 30 * kB, zB - 1); abyssGlow.scale.set(490 * kB, 60 * kB, 1);
    const zL = 26, kL = (DIST - zL) / DIST;
    tideL.position.set(cx - 240 * kL + 9 * kL, cy, zL); tideL.scale.set(22 * kL, 280 * kL, 1);
    tideL.visible = G.state !== 'title';
  },
};
