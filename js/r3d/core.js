// ============ 3D 渲染核心：渲染器 / 相机 / 灯光 / 后期 / 通用工具 ============
// 约定：游戏逻辑坐标 (x, y↓) → 三维 (x, -y, z)。玩法平面 z=0，相机正对该平面，
// 视场标定为平面上恰好 480×270，因此 2D 逻辑、鼠标与 HUD 叠加层完全对齐。
import * as THREE from 'three';
import { EffectComposer } from '../../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/jsm/postprocessing/OutputPass.js';

export { THREE };
const FOV = 40, DIST = (270 / 2) / Math.tan(FOV / 2 * Math.PI / 180);

export const gl = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x120a1e, 700, 2600);
export const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 2, 4000);
camera.position.set(240, -135, DIST);

// 灯光：半球环境光 + 月光主光 + 跟随玩家的补光
export const hemi = new THREE.HemisphereLight(0x9a8ac8, 0x2a1428, 1.6);
export const moonLight = new THREE.DirectionalLight(0xffd8b0, 2.2);
moonLight.position.set(300, 400, 300);
export const rimLight = new THREE.DirectionalLight(0x4ad8ff, 1.2);
rimLight.position.set(-300, 100, -200);
export const heroLight = new THREE.PointLight(0xff6a70, 900, 140, 1.8);
scene.add(hemi, moonLight, moonLight.target, rimLight, heroLight);

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(960, 540), 0.7, 0.45, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

export function resize() {
  const r = gl.parentElement.getBoundingClientRect();
  const w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

export function placeCamera(camX, camY, shx, shy) {
  camera.position.set(camX + 240 + shx, -(camY + 135) - shy, DIST);
  camera.lookAt(camX + 240 + shx, -(camY + 135) - shy, 0);
}

// ---------- 颜色 / 材质缓存 ----------
const colCache = new Map();
export function col(hex) { let c = colCache.get(hex); if (!c) { c = new THREE.Color(hex.length > 7 ? hex.slice(0, 7) : hex); colCache.set(hex, c); } return c; }
export function std(o) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: .5, metalness: .3 }, o)); }
export function glow(hex, k) { const m = new THREE.MeshBasicMaterial({ color: col(hex).clone().multiplyScalar(k || 3) }); m.toneMapped = false; return m; }
export function additive(hex, k, opacity) {
  const m = new THREE.MeshBasicMaterial({ color: col(hex).clone().multiplyScalar(k || 2), transparent: true, opacity: opacity === undefined ? 1 : opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  m.toneMapped = false; return m;
}

// ---------- 几何缓存 ----------
const geoCache = new Map();
export function geo(key, make) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; }
export const G3 = {
  box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  sph: (d) => geo('sph' + (d || 16), () => new THREE.SphereGeometry(1, d || 16, Math.max(6, (d || 16) * .75 | 0))),
  cyl: (d) => geo('cyl' + (d || 12), () => new THREE.CylinderGeometry(1, 1, 1, d || 12)),
  cone: (d) => geo('cone' + (d || 12), () => new THREE.ConeGeometry(1, 1, d || 12)),
  cap: () => geo('cap', () => new THREE.CapsuleGeometry(1, 1, 6, 12)),
  tor: () => geo('tor', () => new THREE.TorusGeometry(1, .12, 8, 32)),
  ico: (d) => geo('ico' + (d || 1), () => new THREE.IcosahedronGeometry(1, d || 1)),
  oct: () => geo('oct', () => new THREE.OctahedronGeometry(1, 0)),
};
export function mesh(g, m, sx, sy, sz, x, y, z) {
  const o = new THREE.Mesh(g, m); o.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
  o.position.set(x || 0, y || 0, z || 0); return o;
}
// 将一个沿 +Y 的单位几何（圆柱/胶囊）拉伸到两点之间
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
export function stretch(o, x0, y0, z0, x1, y1, z1, r) {
  _d.set(x1 - x0, y1 - y0, z1 - z0); const len = _d.length() || .001;
  o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  o.quaternion.setFromUnitVectors(_up, _d.multiplyScalar(1 / len));
  o.scale.set(r, len, r);
}

// ---------- 画布纹理 ----------
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const texCache = new Map();
export function textTex(txt, color) {
  const k = txt + color; let t = texCache.get(k); if (t) return t;
  t = canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = '#05030a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = color; x.lineWidth = 5; x.shadowColor = color; x.shadowBlur = 14; x.strokeRect(6, 6, w - 12, h - 12);
    x.font = '900 40px "Orbitron","Arial Black",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ffffff'; x.shadowBlur = 20; x.fillText(txt, w / 2, h / 2 + 2);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.globalAlpha = .55; x.fillRect(0, 0, w, h);
  });
  texCache.set(k, t); return t;
}

// ---------- 实体同步：逻辑对象 ↔ 三维对象 ----------
// 每帧遍历逻辑列表；新对象创建模型，消失的对象回收模型。
export class Sync {
  constructor(parent, create, update, dispose) { this.map = new Map(); this.parent = parent; this.create = create; this.update = update; this.dispose = dispose; this.frame = 0; }
  run(list, ctx) {
    const f = ++this.frame;
    for (const o of list) {
      let v = this.map.get(o);
      if (!v) { v = this.create(o); if (!v) continue; this.map.set(o, v); this.parent.add(v.root || v); }
      v._f = f; this.update(o, v, ctx);
    }
    for (const [o, v] of this.map) if (v._f !== f) { this.parent.remove(v.root || v); if (this.dispose) this.dispose(v); this.map.delete(o); }
  }
  clear() { for (const [, v] of this.map) { this.parent.remove(v.root || v); if (this.dispose) this.dispose(v); } this.map.clear(); }
}
export function disposeMats(v) { if (v.mats) for (const m of v.mats) m.dispose(); }

// 菲涅尔轮廓光：让角色从暗色城市中跳出来
export function applyRim(root, hex, k) {
  const c = new THREE.Color(hex).multiplyScalar(k || 1);
  root.traverse(o => {
    const m = o.material; if (!m || !m.isMeshStandardMaterial || m.userData.rim) return;
    m.userData.rim = true;
    m.onBeforeCompile = sh => {
      sh.uniforms.uRim = { value: c };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform vec3 uRim;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float frs = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.2);
        totalEmissiveRadiance += uRim * frs;`);
    };
  });
}

// 模型受击闪白 / 发光强调
export function setFlash(v, k, tint) {
  if (!v.mats) return;
  for (const m of v.mats) {
    if (!m.emissive) continue;
    if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.clone(); m.userData.ei0 = m.emissiveIntensity; }
    if (k > 0) { m.emissive.set(tint || 0xffffff); m.emissiveIntensity = k; }
    else { m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.ei0; }
  }
}
