// ============ 3D 渲染入口：同步游戏状态并渲染 ============
import { THREE, scene, composer, bloom, placeCamera, heroLight, Sync, setFlash, disposeMats, applyRim } from './core.js';
import { buildHero, ENEMY, BOSS, eliteAura } from './models.js';
import { World3D } from './world3d.js';
import { FX3D } from './fx3d.js';

World3D.init();
const actors = new THREE.Group(); scene.add(actors);

// 蛛影
const hero = buildHero(); actors.add(hero.root); hero.root.scale.setScalar(1.3); applyRim(hero.root, '#ffb0a0', .9);
function poseHero(P, t) {
  const R = hero.root;
  R.visible = P.alive && G.state !== 'title' && !(P.inv > 0 && ((G.time * 20) | 0) % 2 && P.inv < 1.5);
  R.position.set(P.x, -P.y, 2); R.rotation.z = -P.rot;
  // 手臂：与 2D 版相同的角度逻辑（局部坐标，y 向下取反）
  P.hands.forEach((h, i) => {
    const r = h.rope, A = hero.arms[i];
    let a;
    if (r) { const ex = r.state === 'fly' ? P.x + (r.ax - P.x) * r.t : r.ax, ey = r.state === 'fly' ? P.y + (r.ay - P.y) * r.t : r.ay; a = Math.atan2(ey - P.y, ex - P.x) - P.rot; A.el.rotation.z = -.05; }
    else { a = i === 0 ? 2.3 + Math.sin(t * 10) * .2 : -.3; A.el.rotation.z = i === 0 ? .9 : -.8; }
    A.sh.rotation.z = -a;
  });
  const tuck = Math.abs(P.spin) > 3, sw = Math.max(-.8, Math.min(.8, -P.vx * .004));
  hero.legs.forEach((L, i) => {
    const s = i ? 1 : -1, a = Math.PI / 2 + sw + s * .25 + (tuck ? -1.2 * s : 0), a2 = tuck ? 2 : .4 * s;
    L.hp.rotation.z = -a; L.kn.rotation.z = -a2;
  });
  hero.body.rotation.y = -.55 + Math.sin(t * 2) * .05;
  setFlash(hero, G.ultT > 0 ? .5 + Math.sin(t * 30) * .3 : 0, 0xff2030);
  heroLight.position.set(P.x - 10, -P.y + 20, 40);
  heroLight.intensity = G.ultT > 0 ? 3000 : 1400;
}

// 敌人
const enemies = new Sync(actors, e => {
  const v = ENEMY[e.type](); v.root.scale.setScalar(e.elite ? 2.3 : 1.3); if (e.elite) v.halo = eliteAura(v.root);
  applyRim(v.root, e.elite ? '#ffcf4a' : { drone: '#ff6a80', thug: '#c080ff', blob: '#b070ff', eye: '#40ffd0', gunship: '#80c0ff' }[e.type], e.elite ? 1.2 : .9);
  return v;
}, (e, v, t) => {
  v.root.position.set(e.x, -e.y, 0);
  v.anim(e, t, Player);
  if (v.halo) v.halo.rotation.z = t * 2;
  const f = e.flash > 0; if (f !== v.fl) { v.fl = f; setFlash(v, f ? 2.5 : 0); }
}, disposeMats);

// BOSS
let bossV = null, bossRef = null;
function syncBoss(t) {
  const b = G.boss;
  if (b !== bossRef) { if (bossV) { actors.remove(bossV.root); disposeMats(bossV); } bossV = b ? BOSS[b.def.id]() : null; if (bossV) { bossV.root.scale.setScalar(1.3); applyRim(bossV.root, b.def.col, b.def.id === 'venom' ? .35 : .6); actors.add(bossV.root); } bossRef = b; }
  if (!bossV) return;
  bossV.root.position.set(b.x, -b.y, 0);
  bossV.root.visible = b.state !== 'dying' || ((t * 20) | 0) % 2 === 0 || b.dying > 1;
  bossV.anim(b, t);
  if (b.flash > 0) setFlash(bossV, 2.5);
  else if (b.enraged) setFlash(bossV, .35 + Math.sin(t * 10) * .25, 0xff1020);
  else setFlash(bossV, 0);
}

let lastState = '';
window.R3D = {
  ready: true,
  render(shx, shy) {
    const t = G.time;
    if (G.state === 'play' && lastState !== 'play' && lastState !== 'pick' && lastState !== 'resume' && lastState !== 'pause') enemies.clear();
    lastState = G.state;
    placeCamera(G.cam.x, G.cam.y, shx, shy);
    World3D.update(G.cam.x, G.cam.y, t);
    poseHero(Player, t);
    enemies.run(G.state === 'title' ? [] : Enemies.list, t);
    syncBoss(t);
    FX3D.update(t, G.cam.x, G.cam.y);
    bloom.strength = .7 + (G.ultT > 0 ? .25 : 0) + Math.min(.3, G.flash * .3);
    composer.render();
  },
};
