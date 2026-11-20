// Chapter 5: building without a plan. Our own small agent model of stigmergy (after the idea Grassé named in 1959,
// and the kind of models Deneubourg and others built later). Each termite wanders, carrying a soil pellet. It drops
// the pellet with a small base chance, plus a much bigger chance where fresh "building scent" (a pheromone added
// with every pellet) is strong. The scent spreads a little and fades. No termite knows the plan; pillars appear anyway.
import { THREE, M, COL, swarm, rng, fmt, clamp, frame } from '../mound.js';

const G = 40, CELL = 0.08, A = 180, HMAX = 140, DH = 0.012;

export default {
  id: 'build',
  short: 'Building without a plan',
  title: 'No architect, no blueprint',
  subtitle: 'Each termite follows a few simple local rules. Put millions together and a tower grows.',
  view: { pos: [0.2, 2.6, 3.6], target: [0, 0.3, 0] },
  learn: `<p>No termite has a plan of the mound, and no one is in charge. The queen only lays eggs. So how do a million or more tiny workers, none of which can take in the whole mound, build something so organised?</p>
    <p>In 1959 the French biologist <b>Pierre-Paul Grassé</b> gave a name to the trick: <b>stigmergy</b>. Workers react to the <b>work already done</b>. A small heap of fresh soil, marked with a scent, makes it more likely that the next termite to pass will add its pellet there too. The structure itself carries the instructions from one worker to the next.</p>
    <p>This is <b>positive feedback</b>: heaps that grow attract more building, and grow faster. Combined with the scent fading over time, it turns a random scatter into evenly spaced <b>pillars</b>, then arches and walls. Other cues matter too: one study found termites extend the mound where humid air from inside reaches past the surface. The same ideas now guide <b>swarm robots</b>: in 2014 Justin Werfel, Kirstin Petersen and Radhika Nagpal at Harvard showed TERMES robots that build towers and staircases from bricks using only local rules, with no foreman.</p>
    <p class="tip"><b>Try it:</b> turn the feedback down to zero and the pellets spread out evenly. Turn it up and pillars rise from nowhere.</p>
    <p class="note">Our own toy model, drawn as a small patch of ground, not to scale. Real termites respond to scent, soil moisture, air movement, gases and more.</p>`,
  terms: [
    { t: 'Stigmergy', d: 'Coordination through the work itself: each change to the structure prompts the next action.' },
    { t: 'Positive feedback', d: 'When an effect makes itself stronger, like a heap that attracts more building because it is a heap.' },
    { t: 'Pheromone', d: 'A chemical signal made by an animal that changes the behaviour of others of its kind.' },
    { t: 'Self-organisation', d: 'Order that emerges from many local interactions, without a leader or plan.' },
  ],
  defaults: { feedback: 0.8, workers: 180, speed: 1, seed: 1 },
  controls: [
    { key: 'feedback', type: 'range', label: 'Feedback from the building scent', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + ' %', ends: ['ignore it', 'follow it'] },
    { key: 'workers', type: 'range', label: 'Workers', min: 20, max: 180, step: 1, fmt: (v) => Math.round(v) },
    { key: 'speed', type: 'range', label: 'Speed', min: 0.2, max: 3, step: 0.1, fmt: (v) => v.toFixed(1) + '×' },
    { key: 'go', type: 'buttons', label: 'Ground', items: [{ label: 'Clear and start again', act: (s, inst) => inst.reset() }] },
  ],
  quiz: [
    { q: 'Who decides the shape of a termite mound?', options: ['The queen', 'A few lead workers', 'Nobody: it emerges from simple local rules', 'The soldiers'], answer: 2, why: 'Each worker reacts only to what is around it. The shape emerges from millions of small acts.' },
    { q: 'What is stigmergy?', options: ['A kind of fungus', 'Coordination through changes left in the environment', 'A termite disease', 'A way of measuring heat'], answer: 1, why: 'Grassé coined the word for workers that respond to the work already done.' },
    { q: 'In the model, what happens with no feedback?', options: ['Tall pillars grow', 'Pellets end up spread out evenly', 'Nothing is built', 'The termites leave'], answer: 1, why: 'Without positive feedback, every spot is equally likely, so pellets pile up evenly.' },
  ],
  reel: [
    { ms: 5600, caption: 'No termite has a plan. Each one drops soil where others have just built, and pillars rise.', set: { feedback: 0.85, workers: 180, speed: 3 }, act: (s, inst) => inst.reset(), view: { pos: [0.2, 2.6, 3.6], target: [0, 0.3, 0] }, spin: 0.6 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stage.floor.position.y = -0.06; frame(stage, 0.1, 0); stage.scene.background = new THREE.Color(0x0b0d12);
    const root = stage.root;
    const base = new THREE.Mesh(new THREE.BoxGeometry(G * CELL + 0.1, 0.06, G * CELL + 0.1), M.matte(0x5e3520)); base.position.y = -0.03; base.receiveShadow = true; root.add(base);
    const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.96, 1, CELL * 0.96), new THREE.MeshStandardMaterial({ roughness: 0.95 }), G * G);
    cells.castShadow = true; cells.receiveShadow = true; cells.frustumCulled = false; root.add(cells);
    const bugs = swarm(A, new THREE.CapsuleGeometry(0.012, 0.035, 3, 6), M.matte(0x2a170b)); bugs.frustumCulled = false; root.add(bugs);
    const pellets = swarm(A, new THREE.SphereGeometry(0.014, 8, 6), M.matte(0xd08a55)); pellets.frustumCulled = false; root.add(pellets);
    const lbl = stage.label('', [0, 1.6, 0], root, 'hot');
    let h, ph, tmp, ag, R, placed, acc;
    const O = new THREE.Object3D(), C = new THREE.Color(), cSoil = new THREE.Color(COL.soil), cTop = new THREE.Color(COL.sand), cScent = new THREE.Color(COL.lime);
    const X = (i) => (i - G / 2 + 0.5) * CELL;
    function reset() {
      R = rng(1000 + (s.seed | 0)); h = new Uint16Array(G * G); ph = new Float32Array(G * G); tmp = new Float32Array(G * G); placed = 0; acc = 0;
      ag = Array.from({ length: A }, () => ({ i: Math.floor(R() * G), j: Math.floor(R() * G), dir: Math.floor(R() * 4) }));
      draw();
    }
    const DI = [1, 0, -1, 0], DJ = [0, 1, 0, -1];
    function step(nw, fb) {
      for (let a = 0; a < nw; a++) {
        const g = ag[a];
        // move: mostly forward, sometimes turn; with feedback, prefer the neighbour with more scent
        let best = g.dir;
        if (R() < 0.35) best = Math.floor(R() * 4);
        if (fb > 0 && R() < 0.5 * fb) {
          let bv = -1;
          for (let d = 0; d < 4; d++) { const ii = (g.i + DI[d] + G) % G, jj = (g.j + DJ[d] + G) % G, v = ph[ii * G + jj] + 0.02 * R(); if (v > bv) { bv = v; best = d; } }
        }
        g.dir = best; g.i = (g.i + DI[best] + G) % G; g.j = (g.j + DJ[best] + G) % G;
        const k = g.i * G + g.j, sc = ph[k];
        const p = 0.004 + fb * 0.6 * Math.min(1, (sc * sc) / 4) + (1 - fb) * 0.02;
        if (h[k] < HMAX && R() < p) { h[k]++; ph[k] += 1; placed++; }
      }
      // scent spreads a little and fades
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const k = i * G + j, n = ph[((i + 1) % G) * G + j] + ph[((i - 1 + G) % G) * G + j] + ph[i * G + (j + 1) % G] + ph[i * G + (j - 1 + G) % G];
        tmp[k] = (ph[k] * 0.8 + n * 0.05) * 0.985;
      }
      ph.set(tmp);
    }
    function draw() {
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const k = i * G + j, hh = Math.max(0.0005, h[k] * DH);
        O.position.set(X(i), hh / 2, X(j)); O.scale.set(1, hh, 1); O.rotation.set(0, 0, 0); O.updateMatrix(); cells.setMatrixAt(k, O.matrix);
        C.copy(cSoil).lerp(cTop, clamp(h[k] / 80, 0, 1) * 0.6).lerp(cScent, clamp(ph[k] / 6, 0, 1) * 0.45);
        cells.setColorAt(k, C);
      }
      cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
    }
    reset();
    let t = 0;
    return {
      reset,
      update(dt, st) {
        t += dt;
        const nw = Math.round(st.workers);
        acc += dt * 30 * st.speed;
        let n = 0;
        while (acc >= 1 && n < 12) { step(nw, st.feedback); acc -= 1; n++; }
        if (n) draw();
        for (let a = 0; a < A; a++) {
          const g = ag[a], on = a < nw, k = g.i * G + g.j, y = h[k] * DH + 0.015;
          const rot = [0, (g.dir * Math.PI) / 2, Math.PI / 2];
          bugs.place(a, [X(g.i), y, X(g.j)], rot, on ? 1 : 0.0001);
          pellets.place(a, [X(g.i) + 0.03 * Math.cos(g.dir * Math.PI / 2), y + 0.02, X(g.j) - 0.03 * Math.sin(g.dir * Math.PI / 2)], null, on ? 1 : 0.0001);
        }
        bugs.done(); pellets.done();
        let top = 0; for (let k = 0; k < G * G; k++) top = Math.max(top, h[k]);
        lbl.position.set(0, top * DH + 0.35, 0);
        lbl.element.textContent = `${fmt(placed, 0)} pellets placed`;
      },
      readout(st) {
        let top = 0, sum = 0, peaks = 0;
        for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
          const k = i * G + j, v = h[k]; top = Math.max(top, v); sum += v;
          if (v >= 12) { let m = true; for (let di = -2; di <= 2 && m; di++) for (let dj = -2; dj <= 2; dj++) { if (!di && !dj) continue; const q = ((i + di + G) % G) * G + ((j + dj + G) % G); if (h[q] > v) { m = false; break; } } if (m) peaks++; }
        }
        const mean = sum / (G * G);
        return `<div class="big">${peaks} pillar${peaks === 1 ? '' : 's'}</div>
          <p class="r-say">${st.feedback < 0.15 ? 'Without feedback, pellets spread out evenly. No pillars form.' : 'Fresh scent attracts more pellets, so heaps grow into pillars.'}</p>
          <div class="row"><span>Pellets placed</span><b>${fmt(placed, 0)}</b></div>
          <div class="row"><span>Tallest stack</span><b>${top} pellets</b></div>
          <div class="row"><span>Average stack</span><b>${fmt(mean, 1)} pellets</b></div>
          <div class="row"><span>Tallest ÷ average</span><b>${fmt(mean ? top / mean : 0, 1)}×</b></div>`;
      },
    };
  },
};
