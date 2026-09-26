// ============ 程序化 3D 模型：蛛影、敌人、BOSS ============
import { THREE, std, glow, additive, mesh, G3, canvasTex, col } from './core.js';

// ---------- 纹理 ----------
const webTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#c81c2a'; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff18'); g.addColorStop(1, '#00000030'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#1a0508'; x.lineWidth = 2.2;
  for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo(i * w / 16, 0); x.lineTo(i * w / 16, h); x.stroke(); }
  for (let j = 1; j < 10; j++) { x.beginPath(); for (let i = 0; i <= 16; i++) { const xx = i * w / 16, yy = j * h / 10 + (i % 2 ? 5 : -5); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
});
const spiderTex = canvasTex(128, 128, (x) => {
  x.translate(64, 64); x.fillStyle = '#0a0204'; x.strokeStyle = '#0a0204'; x.lineWidth = 7; x.lineCap = 'round';
  x.beginPath(); x.ellipse(0, -8, 11, 14, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(0, 20, 9, 16, 0, 0, 7); x.fill();
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const a = -0.9 + k * .55; x.beginPath(); x.moveTo(s * 8, -4 + k * 5); x.lineTo(s * (30 + k * 3), -26 + k * 16); x.lineTo(s * (40 + k * 4), -8 + k * 22 + (k > 1 ? 14 : 0)); x.stroke(); }
});

function rot(o, ax, v) { o.rotation[ax] = v; return o; }
function limb(len, r, mat) {
  const g = new THREE.Group();
  const m = mesh(G3.cap(), mat, r, len / 3, r, len / 2, 0, 0); m.rotation.z = -Math.PI / 2; g.add(m);
  return g;
}

// ---------- 蛛影 ----------
export function buildHero() {
  const red = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: webTex, roughness: .35, metalness: .1, clearcoat: .6, clearcoatRoughness: .3, emissive: 0x500008, emissiveIntensity: .6 });
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x2a50e0, roughness: .4, metalness: .15, clearcoat: .4, emissive: 0x08124a, emissiveIntensity: .8 });
  const black = std({ color: 0x0b0508, roughness: .6 });
  const lens = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdde8ff, emissiveIntensity: .6, roughness: .2 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.rotation.y = -.55;
  // 躯干
  body.add(mesh(G3.sph(20), red, 3.1, 3.3, 2.3, 0, -.6, 0));
  body.add(mesh(G3.cyl(16), blue, 2.35, 3.2, 1.9, 0, -3.4, 0));
  body.add(mesh(G3.sph(16), blue, 2.5, 1.7, 1.95, 0, -5.1, 0));
  body.add(mesh(G3.cyl(16), red, 2.45, .7, 2.0, 0, -4.2, 0));
  const emb = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ map: spiderTex, transparent: true, roughness: .5 }));
  emb.position.set(0, -.4, 2.28); body.add(emb);
  // 头
  body.add(mesh(G3.cyl(10), red, .9, 1.4, .9, 0, 2.5, 0));
  const head = mesh(G3.sph(24), red, 2.6, 3.0, 2.6, 0, 4.9, 0); body.add(head);
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 1.05, 5.2, 2.2); e.rotation.set(0, s * .35, s * .55);
    e.add(mesh(G3.sph(16), black, 1.15, .82, .45, 0, 0, -.05)); e.add(mesh(G3.sph(16), lens, 1.0, .68, .42, 0, 0, .1));
    body.add(e);
  }
  // 四肢：挂在 root（只随屏幕平面旋转），便于精确指向蛛丝锚点
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 2.9, .6, s * 1.4); root.add(sh);
    sh.add(mesh(G3.sph(12), red, 1.35, 1.35, 1.35));
    const up = limb(3.8, 1.05, red); sh.add(up);
    const el = new THREE.Group(); el.position.x = 3.8; sh.add(el); el.add(limb(3.6, .95, blue));
    const hand = mesh(G3.sph(10), red, 1.05, .95, .95, 3.9, 0, 0); el.add(hand);
    arms.push({ sh, el });
    const hp = new THREE.Group(); hp.position.set(s * 1.35, -5.4, s * 1.0); root.add(hp);
    const th = limb(4.6, 1.3, blue); hp.add(th);
    const kn = new THREE.Group(); kn.position.x = 4.6; hp.add(kn);
    kn.add(limb(4.4, 1.1, red)); kn.add(mesh(G3.sph(10), red, 1.25, 1.1, 1.5, 4.5, 0, .3));
    legs.push({ hp, kn });
  }
  return { root, body, arms, legs, head, mats: [red, blue, black, lens] };
}

// ---------- 普通敌人 ----------
const metal = () => std({ color: 0x3a3f4e, roughness: .35, metalness: .75 });
export const ENEMY = {
  drone() {
    const m = metal(), dark = std({ color: 0x14161e, roughness: .2, metalness: .6 }), eye = glow('#ff2a4a', 4);
    const root = new THREE.Group();
    root.add(mesh(G3.box(), m, 9, 3.2, 6)); root.add(mesh(G3.sph(16), dark, 3, 1.8, 2.6, .5, 1.6, 0));
    root.add(mesh(G3.sph(12), eye, 1.3, 1.3, 1.3, -4.6, -.2, 0));
    const rotors = [];
    for (const [x, z] of [[-5, -3.5], [5, -3.5], [-5, 3.5], [5, 3.5]]) {
      root.add(rot(mesh(G3.box(), m, Math.abs(x) * .9, .7, .7, x / 2, .8, z / 2), 'y', Math.atan2(-z, x)));
      root.add(mesh(G3.cyl(10), dark, .8, 1.4, .8, x, 1.3, z));
      const r = mesh(G3.cyl(20), additive('#9ab0d0', .5, .45), 3.4, .15, 3.4, x, 2.1, z); rotors.push(r); root.add(r);
    }
    root.add(mesh(G3.sph(6), glow('#40ff80', 3), .5, .5, .5, 4.6, 0, 3), mesh(G3.sph(6), glow('#ff3040', 3), .5, .5, .5, 4.6, 0, -3));
    return { root, mats: [m, dark], anim(e, t) { for (const r of rotors) r.rotation.y = t * 40; root.rotation.z = Math.sin(t * 3) * .12 + e.vx * -.002; } };
  },
  thug() {
    const armor = std({ color: 0x6a34b8, roughness: .45, metalness: .35 }), dark = std({ color: 0x2a1a40, roughness: .6 }), m = metal();
    const visor = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb000, emissiveIntensity: 1.6, roughness: .2 });
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.rotation.y = .5;
    body.add(mesh(G3.cap(), armor, 2.6, 1.3, 2.1, 0, 0, 0));
    body.add(mesh(G3.sph(16), armor, 2.3, 2.3, 2.3, 0, 5, 0)); body.add(mesh(G3.sph(12), visor, 1.7, .9, 1.5, -1.1, 5.2, 0));
    body.add(mesh(G3.box(), m, 3, 5, 3, 2.6, .5, 0));
    for (const z of [-1.1, 1.1]) body.add(mesh(G3.cyl(10), m, .8, 2.2, .8, 2.6, -2.6, z));
    for (const z of [-1, 1]) body.add(mesh(G3.cap(), dark, 1, 1.4, 1, .3, -5.3, z));
    body.add(mesh(G3.box(), m, 7, 1.4, 1.4, -3.5, .3, 2.2)); body.add(mesh(G3.sph(8), glow('#ff8a1e', 3), .6, .6, .6, -7.2, .3, 2.2));
    const fl = [];
    for (const z of [-1.1, 1.1]) { const f = mesh(G3.cone(10), additive('#ff9a2a', 3), .8, 3, .8, 2.6, -4.6, z); f.rotation.z = Math.PI; fl.push(f); body.add(f); }
    return { root, mats: [armor, dark, m, visor], anim(e, t) { for (const f of fl) f.scale.y = 2.4 + Math.sin(t * 50 + f.position.z) * 1.2; root.rotation.z = e.vx * -.003; } };
  },
  blob() {
    const skin = new THREE.MeshPhysicalMaterial({ color: 0x0c0612, roughness: .15, metalness: .1, clearcoat: 1, clearcoatRoughness: .1, emissive: 0x3a1060, emissiveIntensity: .35 });
    const eyeM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .8 });
    const root = new THREE.Group(), core = mesh(G3.ico(3), skin, 5, 4.6, 5); root.add(core);
    const bumps = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, b = mesh(G3.sph(10), skin, 2, 2, 2, Math.cos(a) * 4, Math.sin(a) * 3.4, (i % 2 ? 1 : -1) * 1.5); bumps.push([b, a]); root.add(b); }
    for (const s of [-1, 1]) { const e = mesh(G3.sph(12), eyeM, 1.6, .8, .5, -2.4, 1.2, s * 2.2); e.rotation.z = s * .5; e.rotation.y = -s * .6; root.add(e); }
    const mouth = mesh(G3.sph(12), std({ color: 0x400010, roughness: .4 }), 2.2, 1, .8, -4.2, -1.5, 0); root.add(mouth);
    return { root, mats: [skin], anim(e, t) { const k = 1 + Math.sin(t * 12) * .12; core.scale.set(5 * k, 4.6 / k, 5 * k); for (const [b, a] of bumps) b.position.set(Math.cos(a + t * 2) * 4.4 * k, Math.sin(a + t * 2) * 3.8, b.position.z); root.rotation.z = Math.atan2(e.vy, -e.vx) * -.5; } };
  },
  eye() {
    const shell = std({ color: 0x1a8a7a, roughness: .3, metalness: .7 }), white = std({ color: 0xf0f0f0, roughness: .25, metalness: 0 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x20e0c0, emissive: 0x20e0c0, emissiveIntensity: 1.5 });
    const root = new THREE.Group(), ball = new THREE.Group(); root.add(ball);
    ball.add(mesh(G3.sph(28), white, 6.2));
    const ir = mesh(G3.cyl(24), iris, 3, .6, 3, 0, 0, 5.9); ir.rotation.x = Math.PI / 2; ball.add(ir);
    const pu = mesh(G3.cyl(20), glow('#ffe04a', 4), 1.3, .7, 1.3, 0, 0, 6.2); pu.rotation.x = Math.PI / 2; ball.add(pu);
    const ring = mesh(G3.tor(), shell, 8, 8, 8); root.add(ring);
    const ring2 = mesh(G3.tor(), shell, 7.4, 7.4, 7.4); ring2.rotation.y = Math.PI / 2; root.add(ring2);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; root.add(rot(mesh(G3.cone(8), shell, 1.2, 3.5, 1.2, Math.cos(a) * 9, Math.sin(a) * 9, 0), 'z', a - Math.PI / 2)); }
    const tgt = new THREE.Vector3();
    return { root, mats: [shell, white, iris], anim(e, t, P) { tgt.set(P.x, -P.y, 60); root.worldToLocal(tgt); ball.lookAt(tgt.add(ball.position)); ring.rotation.x = t * 1.5; ring2.rotation.x = -t * 1.2; } };
  },
  gunship() {
    const hull = std({ color: 0x5a6070, roughness: .35, metalness: .8 }), dark = std({ color: 0x20242e, roughness: .4, metalness: .6 });
    const root = new THREE.Group();
    const h = mesh(G3.cap(), hull, 4.2, 5.5, 4.2); h.rotation.z = Math.PI / 2; root.add(h);
    root.add(mesh(G3.sph(16), glow('#ff3050', 2.5), 2.6, 1.8, 2.6, -8, 1.4, 0));
    root.add(mesh(G3.box(), dark, 12, 1, 18, 2, 0, 0));
    for (const z of [-8.5, 8.5]) { root.add(rot(mesh(G3.cyl(14), dark, 2, 5, 2, 7, 0, z), 'z', Math.PI / 2)); root.add(rot(mesh(G3.cyl(14), glow('#4ad8ff', 4), 1.6, .4, 1.6, 9.6, 0, z), 'z', Math.PI / 2)); }
    const tur = new THREE.Group(); tur.position.set(-2, -4.2, 0); root.add(tur);
    tur.add(mesh(G3.sph(12), dark, 2.2)); tur.add(mesh(G3.box(), hull, 6, .9, .9, -3, 0, .8), mesh(G3.box(), hull, 6, .9, .9, -3, 0, -.8));
    return { root, mats: [hull, dark], anim(e, t, P) { tur.rotation.z = Math.atan2(-(P.y - e.y), P.x - e.x) + Math.PI; root.rotation.z = Math.sin(t * 1.5) * .06; } };
  },
};

// ---------- BOSS ----------
export const BOSS = {
  vulture() {
    const plate = std({ color: 0x3e5a3a, roughness: .35, metalness: .75 }), light = std({ color: 0x8aa874, roughness: .4, metalness: .6 });
    const gold = std({ color: 0xffc23a, roughness: .3, metalness: .9 }), steel = std({ color: 0x9aa0b0, roughness: .3, metalness: .9 });
    const root = new THREE.Group();
    const b = mesh(G3.cap(), plate, 8, 7, 7); b.rotation.z = Math.PI / 2 - .2; root.add(b);
    root.add(mesh(G3.box(), glow('#8aff5a', 3), 14, 1.2, 1, -2, -1, 7.2));
    const head = new THREE.Group(); head.position.set(-14, 6, 0); root.add(head);
    head.add(mesh(G3.sph(20), plate, 5, 4.5, 4.5)); head.add(mesh(G3.sph(12), glow('#ff2030', 4), 1.3, 1, .8, -3.2, 1.2, 3.3));
    const beak = mesh(G3.cone(12), gold, 2, 8, 2, -7, -.5, 0); beak.rotation.z = Math.PI / 2 + .25; head.add(beak);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(-1, 5, s * 5); root.add(w);
      for (let i = 0; i < 7; i++) {
        const f = mesh(G3.box(), i % 2 ? plate : light, 28 - i * 2.4, 2.2, .8, (28 - i * 2.4) / 2, 0, 0);
        const fg = new THREE.Group(); fg.rotation.z = .9 - i * .2; fg.add(f); w.add(fg);
      }
      wings.push([w, s]);
    }
    const tail = mesh(G3.cone(14), additive('#ff8a1e', 3), 3, 12, 3, 16, 1, 0); tail.rotation.z = -Math.PI / 2; root.add(tail);
    root.add(rot(mesh(G3.cyl(14), steel, 3, 4, 3, 12, 1.5, 0), 'z', Math.PI / 2));
    for (const z of [-3, 3]) { root.add(mesh(G3.cyl(8), steel, .8, 9, .8, -2, -9, z)); root.add(rot(mesh(G3.cone(8), gold, 1.2, 3, 1.2, -3, -14, z), 'z', .6)); }
    return { root, mats: [plate, light, gold, steel], anim(bo, t) { const fl = Math.sin(t * 9) * .55; for (const [w, s] of wings) { w.rotation.x = s * (.4 + fl * .6); w.rotation.z = fl * .25; } tail.scale.y = 10 + Math.sin(t * 40) * 3; root.rotation.z = Math.sin(t * 1.3) * .08; } };
  },
  octo() {
    const shell = std({ color: 0x4a4a5e, roughness: .3, metalness: .85 }), seg = std({ color: 0x8a8a9e, roughness: .3, metalness: .85 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9af0ff, transparent: true, opacity: .35, roughness: .05, transmission: .2, clearcoat: 1 });
    const root = new THREE.Group();
    root.add(mesh(G3.sph(28), shell, 15, 13, 15, 0, -2, 0));
    root.add(mesh(G3.sph(24), glow('#ff6aa8', 1.4), 8, 7, 8, 1, 6, 0)); root.add(mesh(G3.sph(28), glass, 10.5, 9.5, 10.5, 1, 6, 0));
    root.add(rot(mesh(G3.tor(), std({ color: 0xffb03a, metalness: .9, roughness: .3 }), 13, 13, 30, 0, -1, 0), 'x', Math.PI / 2));
    for (const z of [-3.5, 3.5]) root.add(rot(mesh(G3.cyl(16), glow('#ffe04a', 3), 2.2, 1, 2.2, -12, 0, z), 'z', Math.PI / 2));
    const tent = [];
    for (let k = 0; k < 4; k++) {
      const segs = [];
      for (let s = 0; s < 8; s++) { const m = mesh(G3.sph(12), s % 2 ? seg : shell, 3 - s * .18); root.add(m); segs.push(m); }
      const claw = mesh(G3.cone(10), glow('#ff8a1e', 3), 2.2, 5, 2.2); root.add(claw);
      tent.push({ segs, claw, z: (k - 1.5) * 5 });
    }
    return { root, mats: [shell, seg], anim(bo, t) {
      tent.forEach((T, k) => {
        let x = 0, y = -8; const base = [.4, 1.2, 2.0, 2.8][k] + Math.sin(t * 2 + k) * .3;
        T.segs.forEach((m, s) => { const a = base + Math.sin(t * 3 + s * .6 + k) * .5; x += Math.cos(a) * 5.2; y -= Math.sin(a) * 5.2; m.position.set(x, y, T.z); });
        const a = base + Math.sin(t * 3 + 8 * .6 + k) * .5; T.claw.position.set(x + Math.cos(a) * 3, y - Math.sin(a) * 3, T.z); T.claw.rotation.z = -a - Math.PI / 2;
      });
      root.rotation.z = Math.sin(t * .9) * .1;
    } };
  },
  venom() {
    const skin = new THREE.MeshPhysicalMaterial({ color: 0x07040b, roughness: .12, metalness: .2, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x4a1480, emissiveIntensity: .25 });
    const eyeM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 });
    const tooth = std({ color: 0xf4f0e8, roughness: .3 });
    const root = new THREE.Group(), core = mesh(G3.ico(4), skin, 20, 19, 17); root.add(core);
    const blobs = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, b = mesh(G3.sph(16), skin, 7, 7, 7); blobs.push([b, a, 12 + (i % 3) * 3]); root.add(b); }
    for (const s of [-1, 1]) { const e = mesh(G3.sph(16), eyeM, 5.5, 2.8, 1.5, -8 + s * 1, 7, s * 6.5); e.rotation.set(0, -s * .7, s * .6 - .15); root.add(e); }
    root.add(mesh(G3.sph(16), std({ color: 0x3a0010, roughness: .5 }), 11, 5.5, 8, -10, -4, 0));
    for (let i = 0; i < 9; i++) { const z = (i - 4) * 1.8; root.add(rot(mesh(G3.cone(6), tooth, .8, 3.2, .8, -15.5 + Math.abs(i - 4) * .6, -1.2, z), 'z', Math.PI)); root.add(mesh(G3.cone(6), tooth, .8, 3, .8, -15 + Math.abs(i - 4) * .6, -7, z)); }
    const tongue = mesh(G3.cap(), glow('#ff3060', 1.4), 1.6, 3.5, 1.3); root.add(tongue);
    const tend = [];
    for (let k = 0; k < 7; k++) { const segs = []; for (let s = 0; s < 7; s++) { const m = mesh(G3.sph(10), skin, 2.8 - s * .3); root.add(m); segs.push(m); } tend.push(segs); }
    return { root, mats: [skin, eyeM], anim(bo, t) {
      const k = 1 + Math.sin(t * 5) * .05; core.scale.set(20 * k, 19 / k, 17 * k);
      for (const [b, a, r] of blobs) b.position.set(Math.cos(a + Math.sin(t + a) * .3) * r, Math.sin(a + t * .7) * r * .9, Math.sin(a * 3) * 8);
      tongue.position.set(-17 + Math.sin(t * 8) * 2, -6, 0); tongue.rotation.z = Math.PI / 2 + Math.sin(t * 8) * .4;
      tend.forEach((segs, j) => { let x = 10, y = 0; const base = Math.PI * .6 + j * .3; segs.forEach((m, s) => { const a = base + Math.sin(t * 4 + s + j) * .6; x -= Math.cos(a) * 5.5; y -= Math.sin(a) * 5.5; m.position.set(-x + 20, y, (j - 3) * 3); }); });
    } };
  },
};

// 精英光环
export function eliteAura(root) {
  const h = mesh(G3.tor(), additive('#ffcf4a', .8, .6), 8, 8, 8); h.rotation.x = Math.PI / 2 - .3; root.add(h);
  return h;
}
