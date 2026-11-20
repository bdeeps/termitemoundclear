// Shared parts for TermiteMoundClear: colours, a fungus-growing termite mound that can be peeled open,
// its tunnels, the underground nest, and a simple day-night temperature model.
// Scene units: 1 unit = 1 metre. Every model here is our own simplified teaching model, not a measurement.
import { THREE, M, tube, sphere, swarm, canvasTexture, clamp, lerp, smooth, approach } from './kit.js';

export { THREE, M, tube, sphere, swarm, canvasTexture, clamp, lerp, smooth, approach };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const fmt = (v, d = 1) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');
export const FONT = (px, w = 400) => `${w} ${px}px Geist, system-ui, sans-serif`;

export const COL = {
  soil: 0x9c4f2a, soilDark: 0x5e3520, soilCut: 0x7a3f22, sand: 0xc08a55, grass: 0x6d7d3a,
  fungus: 0xeee2c4, queen: 0xf6ecd8, termite: 0x3a2412,
  warm: 0xff7a59, hot: 0xffb547, cool: 0x8ef0ff, co2: 0xc49bff, o2: 0xa3e635, water: 0x4aa8ff, lime: 0xa3e635,
};

// ---------------------------------------------------------------- the mound shape
// Radius of the mound at height y (0..H) and angle th. A broad base, a tapering spire and
// rounded ridges (buttresses) on the lower part. th is measured like three.js cylinders: x = r sin th, z = r cos th.
export function moundShape({ H = 3, R0 = 1.25, ridges = 7, ridge = 0.14, th0 = Math.PI / 7 } = {}) {
  const R = (y) => { const u = clamp(y / H, 0, 1); return R0 * (0.82 * Math.pow(1 - u, 1.7) + 0.2 * Math.pow(1 - u, 0.6)); };
  const r = (y, th) => {
    const u = clamp(y / H, 0, 1);
    const a = ridge * Math.pow(1 - u, 0.6);
    const n = 0.025 * Math.sin(13 * th + 7 * y) + 0.018 * Math.sin(29 * th - 11 * y);
    return Math.max(0, R(y) * (1 + a * Math.cos(ridges * (th - th0)) + n));
  };
  const ridgeAngles = Array.from({ length: ridges }, (_, k) => th0 + (2 * Math.PI * k) / ridges);
  return { H, R0, R, r, ridges, ridgeAngles };
}

const wrap = (a) => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
// Is angle th inside the cut-away wedge centred on th = 0 (facing +z)?
export const inCut = (th, cut) => { const a = wrap(th); return Math.min(a, 2 * Math.PI - a) < cut / 2; };

// The outer shell: a parametric surface that can leave out a wedge so we can look in.
function shellGeometry(shape, rings = 70, seg = 140) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((rings + 1) * (seg + 1) * 3), col = new Float32Array((rings + 1) * (seg + 1) * 3);
  const idx = [];
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.userData = { rings, seg };
  return g;
}
function fillShell(g, shape, cut, colorAt) {
  const { rings, seg } = g.userData, p = g.attributes.position, c = g.attributes.color, C = new THREE.Color();
  const t0 = cut / 2, span = 2 * Math.PI - cut;
  for (let i = 0; i <= rings; i++) {
    const y = -0.04 + (shape.H + 0.04) * Math.pow(i / rings, 0.9);
    for (let j = 0; j <= seg; j++) {
      const th = t0 + (span * j) / seg, r = shape.r(y, th), k = i * (seg + 1) + j;
      p.setXYZ(k, r * Math.sin(th), y, r * Math.cos(th));
      if (colorAt) colorAt(C, y, th); else {
        const n = 0.5 + 0.5 * Math.sin(41 * th + 17 * y) * Math.sin(23 * y - 9 * th);
        C.setHex(COL.soil).lerp(new THREE.Color(COL.sand), 0.3 * (y / shape.H) + 0.15 * n).multiplyScalar(0.8 + 0.25 * n);
      }
      c.setXYZ(k, C.r, C.g, C.b);
    }
  }
  p.needsUpdate = true; c.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

// A flat cross-section from the axis out to the surface at angle th: a strip of quads.
function cutFace(shape, th, n = 60) {
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const y = -0.04 + (shape.H + 0.04) * (i / n), r = shape.r(y, th);
    pos.push(0, y, 0, r * Math.sin(th), y, r * Math.cos(th));
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- tunnels
// Each ridge has a conduit running just under the surface. Together with the central chimney and the
// nest, each one makes a closed loop: nest -> chimney -> top -> out to the ridge -> down the conduit -> back to the nest.
export function loops(shape) {
  const H = shape.H;
  return shape.ridgeAngles.map((th) => {
    const s = (y) => shape.r(y, th) - 0.17 - 0.03 * (1 - y / H);
    const P = (rad, y) => V(rad * Math.sin(th), y, rad * Math.cos(th));
    const pts = [P(0.05, -0.32), P(0, 0.1 * H), P(0, 0.45 * H), P(0, 0.78 * H), P(0.35 * s(0.74 * H), 0.8 * H), P(s(0.7 * H), 0.72 * H)];
    for (let k = 1; k <= 6; k++) { const y = lerp(0.7 * H, 0.06 * H, k / 6); pts.push(P(s(y), y)); }
    pts.push(P(s(0.02) * 0.85, -0.12), P(s(0.02) * 0.45, -0.3));
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const N = 400, samp = curve.getSpacedPoints(N);
    // which part of the loop is the chimney (0), the outer conduit (1) or a connector (0.5)
    const part = samp.map((p) => { const rad = Math.hypot(p.x, p.z); return rad < 0.08 ? 0 : p.y > 0.1 * H && p.y < 0.72 * H && rad > s(p.y) - 0.1 ? 1 : 0.5; });
    return { th, curve, samp, part, len: curve.getLength(), N };
  });
}
export function loopAt(L, u) { const f = ((u % 1) + 1) % 1 * L.N, i = Math.floor(f), k = f - i; return L.samp[i].clone().lerp(L.samp[(i + 1) % L.N], k); }
export function partAt(L, u) { return L.part[Math.floor((((u % 1) + 1) % 1) * L.N) % L.N]; }

// ---------------------------------------------------------------- the whole mound
// Returns { group, shape, loops, set({ peel, H }), ... }. peel 0..1 opens a wedge up to 140 degrees.
export function makeMound(stage, opts = {}) {
  const group = new THREE.Group();
  let shape = moundShape(opts), L = loops(shape), cut = -1;
  const shellMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
  const shellG = shellGeometry(shape);
  const shell = new THREE.Mesh(shellG, shellMat); shell.castShadow = true; shell.receiveShadow = true;
  group.add(shell);
  const faceMat = new THREE.MeshStandardMaterial({ color: COL.soilCut, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const faces = [new THREE.Mesh(new THREE.BufferGeometry(), faceMat), new THREE.Mesh(new THREE.BufferGeometry(), faceMat)];
  faces.forEach((f) => { f.renderOrder = 2; group.add(f); });

  // ground: a disc of soil with the same wedge cut, and a sandy top
  const GR = opts.groundR ?? 1.75, GD = opts.groundD ?? 1.15;
  const soilMat = new THREE.MeshStandardMaterial({ color: COL.soilDark, roughness: 1, side: THREE.DoubleSide });
  const topMat = new THREE.MeshStandardMaterial({ color: 0x8c6a42, roughness: 1, side: THREE.DoubleSide });
  const gFaceMat = new THREE.MeshStandardMaterial({ color: 0x6a3f22, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.8, depthWrite: false });
  let soil = null, top = null; const gfaces = [];
  const showGround = opts.ground !== false;

  // tunnels
  const tunnels = new THREE.Group(); group.add(tunnels);
  const tunMat = M.ghost(0xffe2b0, 0.4), chimMat = M.ghost(0xffe2b0, 0.35);
  let chim = null, cond = [];
  function buildTunnels() {
    tunnels.children.forEach((o) => o.geometry?.dispose());
    tunnels.clear();
    chim = tube([V(0, -0.3, 0), V(0, 0.3 * shape.H, 0), V(0, 0.6 * shape.H, 0), V(0, 0.8 * shape.H, 0)], 0.1, chimMat, false, 40);
    chim.castShadow = false; tunnels.add(chim);
    cond = L.map((l) => { const m = new THREE.Mesh(new THREE.TubeGeometry(l.curve, 260, 0.045, 8, true), tunMat); tunnels.add(m); return m; });
  }

  // nest: a chamber under the mound with fungus combs, the royal cell and the queen
  const nest = new THREE.Group(); group.add(nest);
  const NY = -0.56;
  const cave = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 1, side: THREE.BackSide }));
  cave.scale.set(0.85, 0.4, 0.85); cave.position.y = NY; nest.add(cave);
  const R = rng(7), combMat = new THREE.MeshStandardMaterial({ color: COL.fungus, roughness: 0.9, vertexColors: false });
  const combs = [];
  for (let i = 0; i < 16; i++) {
    const a = (R() - 0.5) * 2.6, rad = 0.25 + 0.45 * R(), y = NY + (R() - 0.5) * 0.4;
    const g = new THREE.IcosahedronGeometry(0.11 + 0.07 * R(), 3);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = V(p.getX(k), p.getY(k), p.getZ(k)); const n = 1 + 0.18 * Math.sin(v.x * 70) * Math.sin(v.y * 60) * Math.sin(v.z * 80); v.multiplyScalar(n); p.setXYZ(k, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, combMat); m.position.set(rad * Math.sin(a), y, rad * Math.cos(a)); m.scale.y = 0.8; m.castShadow = true;
    nest.add(m); combs.push(m);
  }
  const royal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 1, side: THREE.DoubleSide }));
  royal.scale.y = 0.6; royal.position.set(0, NY - 0.2, 0.32); nest.add(royal);
  const queen = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.13, 6, 12), new THREE.MeshStandardMaterial({ color: COL.queen, roughness: 0.6 }));
  queen.rotation.z = Math.PI / 2; queen.position.set(0, NY - 0.17, 0.32); nest.add(queen);
  const qHead = sphere(0.025, M.matte(0x8a5a36)); qHead.position.set(0.1, NY - 0.17, 0.32); nest.add(qHead);

  // workers: a few hundred dots stand in for the millions
  const NW = opts.workers ?? 260;
  const workers = swarm(NW, new THREE.CapsuleGeometry(0.008, 0.02, 3, 6), M.matte(COL.termite));
  workers.castShadow = false; workers.frustumCulled = false; nest.add(workers);
  const W = Array.from({ length: NW }, () => ({ a: R() * Math.PI * 2, r: 0.2 + 0.55 * R(), y: NY + (R() - 0.5) * 0.35, v: (R() - 0.5) * 0.6 }));

  function set({ peel = 0, H = shape.H } = {}) {
    const c = Math.PI * 0.78 * smooth(peel);
    if (H !== shape.H) { shape = moundShape({ ...opts, H }); L = loops(shape); api.shape = shape; api.loops = L; cut = -1; buildTunnels(); }
    if (Math.abs(c - cut) < 1e-4) return;
    cut = c;
    fillShell(shellG, shape, c, api.colorAt || opts.colorAt);
    faces.forEach((f, i) => { f.geometry.dispose(); f.geometry = cutFace(shape, i ? -c / 2 : c / 2); f.visible = c > 0.01; });
    cond.forEach((m, i) => { m.visible = !inCut(L[i].th, c * 1.15); });
    if (showGround) {
      [soil, top, ...gfaces].forEach((o) => { if (o) { group.remove(o); o.geometry.dispose(); } });
      gfaces.length = 0;
      const t0 = c / 2, span = 2 * Math.PI - Math.max(c, 0.0001);
      soil = new THREE.Mesh(new THREE.CylinderGeometry(GR, GR, GD, 96, 1, true, t0, span), soilMat); soil.position.y = -GD / 2; soil.receiveShadow = true;
      top = new THREE.Mesh(new THREE.RingGeometry(0.01, GR, 96, 1, Math.PI / 2 - t0 - span, span), topMat);
      top.rotation.x = Math.PI / 2; top.position.y = -0.005; top.receiveShadow = true;
      group.add(soil, top);
      if (c > 0.01) for (const th of [c / 2, -c / 2]) {
        const g = new THREE.PlaneGeometry(GR, GD); g.translate(GR / 2, -GD / 2, 0);
        const f = new THREE.Mesh(g, gFaceMat); f.rotation.y = th - Math.PI / 2; f.renderOrder = 1; group.add(f); gfaces.push(f);
      }
      const bot = new THREE.Mesh(new THREE.CircleGeometry(GR, 64), soilMat); bot.rotation.x = Math.PI / 2; bot.position.y = -GD; group.add(bot); gfaces.push(bot);
    }
    nest.visible = c > 0.01;
  }

  function update(dt, t) {
    for (let i = 0; i < NW; i++) {
      const w = W[i]; w.a += w.v * dt * (0.6 + 0.4 * Math.sin(t * 1.3 + i));
      const x = w.r * Math.sin(w.a), z = w.r * Math.cos(w.a);
      workers.place(i, [x, w.y + 0.01 * Math.sin(t * 9 + i), z], [0, w.a + (w.v > 0 ? Math.PI / 2 : -Math.PI / 2), Math.PI / 2], 1);
    }
    workers.done();
  }

  function repaint() { if (cut >= 0) fillShell(shellG, shape, cut, api.colorAt || opts.colorAt); }

  const api = { group, shape, repaint, colorAt: null, loops: L, set, update, nest, tunnels, shell, faces, combs, queen, royal, NY, get chimney() { return chim; }, get conduits() { return cond; }, get cut() { return cut; } };
  buildTunnels();
  set({ peel: opts.peel ?? 0 });
  return api;
}

// ---------------------------------------------------------------- flowing particles along the loops
// Particles ride the closed loops. speed in m/s along the loop: positive = up the chimney and down the
// outer conduits (night), negative = up the outer conduits and down the chimney (day).
export function loopParticles(parent, per = 26, r = 0.03) {
  const geo = new THREE.SphereGeometry(r, 8, 6);
  const mesh = new THREE.InstancedMesh(geo, M.glow(0xffffff), 1);
  let n = 0, us = [], Ls = [];
  parent.add(mesh);
  const C = new THREE.Color(), O = new THREE.Object3D();
  const api = {
    mesh,
    setLoops(L) {
      Ls = L; n = L.length * per;
      parent.remove(mesh); mesh.dispose();
      api.mesh = new THREE.InstancedMesh(geo, M.glow(0xffffff), n);
      api.mesh.frustumCulled = false; parent.add(api.mesh);
      us = Array.from({ length: n }, (_, i) => (i % per) / per + 0.013 * Math.floor(i / per));
    },
    // colour(u, part) -> hex; vis(loopIndex) -> bool
    update(dt, speed, colour, vis = () => true, scale = 1) {
      const m = api.mesh;
      for (let i = 0; i < n; i++) {
        const li = Math.floor(i / per), Lp = Ls[li];
        us[i] += (speed * dt) / Lp.len;
        const show = vis(li);
        const p = loopAt(Lp, us[i]);
        O.position.copy(p); O.scale.setScalar(show ? scale : 0.0001); O.updateMatrix();
        m.setMatrixAt(i, O.matrix);
        C.setHex(colour(us[i], partAt(Lp, us[i]), p)); m.setColorAt(i, C);
      }
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    },
  };
  return api;
}

// ---------------------------------------------------------------- a chart docked to the screen
// A canvas drawn every frame on a plane fixed to the camera: bottom-right normally, top-right in the video.
const HUDS = new Set();
export function clearHuds() { HUDS.forEach((m) => { m.parent?.remove(m); m.material.map?.dispose(); m.material.dispose(); m.geometry.dispose(); }); HUDS.clear(); }
export function hud(stage, pxW, pxH, draw, { wFrac = 0.4, reelFrac = 0.36 } = {}) {
  const ct = canvasTexture(pxW, pxH, (g, W, Hh, ...a) => { g.clearRect(0, 0, W, Hh); if (a.length) draw(g, W, Hh, ...a); });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, pxH / pxW), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 999; mesh.frustumCulled = false;
  if (!stage.camera.parent) stage.scene.add(stage.camera);
  stage.camera.add(mesh); HUDS.add(mesh);
  const dock = () => {
    const cam = stage.camera, D = 10, hh = D * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hw = hh * cam.aspect;
    const reel = document.body.classList.contains('gb-reel');
    const [sx, sy] = stage.shift || [0, 0];
    const w = (reel ? reelFrac : Math.min(wFrac * (cam.aspect < 1 ? 1.25 : 1), 0.9)) * 2 * hw, h = w * (pxH / pxW), m = 0.03 * 2 * hh;
    mesh.scale.set(w, w, 1);
    // undo the view offset so the card stays put on screen
    const ox = -sx * 2 * hw, oy = -sy * 2 * hh;
    mesh.position.set(hw - w / 2 - m + ox, reel ? hh - h / 2 - m + oy : -hh + h / 2 + m + oy, -D);
  };
  dock();
  return { mesh, redraw: ct.redraw, dock };
}
export function panel(g, w, h, title) {
  g.fillStyle = 'rgba(7,8,12,0.82)'; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2;
  const r = 22; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, r); g.fill(); g.stroke();
  g.fillStyle = '#eef0f6'; g.font = FONT(26, 600); g.textAlign = 'left'; g.fillText(title, 26, 44);
}

// ---------------------------------------------------------------- day and night
// Our simplified day model for a sunny, dry-season day. Air is coolest near dawn and warmest in the mid
// afternoon. The core and nest, insulated by soil, change slowly. The thin outer conduits swing more: a few
// degrees warmer than the core in the afternoon, and more degrees cooler at night (in Indian mounds the night-time
// difference was the larger one). Numbers are illustrative, not measured values.
export const DAY = { mean: 26, swing: 9, coreSwing: 1.2, coreLag: 5, offset: -1.6, flute: 4.2 };
export function temps(hour, d = DAY) {
  const w = (2 * Math.PI) / 24;
  const air = d.mean + d.swing * Math.sin(w * (hour - 9));
  const sun = Math.max(0, Math.sin(w * (hour - 6)));                 // 0 at night, 1 at noon
  const core = d.mean + 0.4 + d.coreSwing * Math.sin(w * (hour - 9 - d.coreLag));
  const surface = core + d.offset + d.flute * Math.sin(w * (hour - 9));
  return { air, surface, core, sun, delta: surface - core };
}
export const clock = (h) => { h = ((h % 24) + 24) % 24; const H = Math.floor(h), m = Math.floor((h - H) * 60); return `${String(H).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };

// A sun that moves over the scene: rises in the east (+x), sets in the west (-x).
export function makeSun(parent, dist = 9) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12), M.glow(0xffd27a));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12), M.glow(0xdfe6ff));
  const light = new THREE.DirectionalLight(0xffe2b0, 0);
  g.add(ball, moon, light, light.target); parent.add(g);
  return {
    set(hour) {
      const a = ((hour - 6) / 12) * Math.PI;                         // 0 at 06:00, pi at 18:00
      ball.position.set(dist * Math.cos(a), dist * Math.sin(a) * 0.9, -2.5);
      moon.position.set(-dist * Math.cos(a), -dist * Math.sin(a) * 0.9, -2.5);
      ball.visible = ball.position.y > -0.3; moon.visible = moon.position.y > -0.3;
      light.position.copy(ball.position); light.intensity = Math.max(0, Math.sin(a)) * 1.6;
    },
  };
}

// Nudge the picture so the readout and chart don't hide it, but keep it centred in the video.
export function frame(stage, x = 0, y = 0) {
  if (document.body.classList.contains('gb-reel')) stage.setShift(0, 0); else stage.setShift(x, y);
}
