// Chapter 3: wind and the porous wall. Wind pushes on the upwind face and sucks on the sides and back.
// Gusts make those pressures rise and fall, so air in the surface conduits sloshes back and forth
// ("tidal" ventilation) while gases cross the porous wall. Our own simplified model: the air flow around
// the mound uses the textbook ideal flow past a cylinder at each height, with a rough wake behind it.
import { THREE, M, COL, makeMound, loopParticles, swarm, rng, fmt, clamp, inCut, frame } from '../mound.js';

const RHO_AIR = 1.2;   // kg/m³
const NP = 340;        // wind particles
const ND = 140;        // gas dots crossing the wall

// Pressure coefficient around the mound: about +1 facing the wind, about -1 at the sides, about -0.5 behind.
const cp = (cosPhi) => (cosPhi > 0 ? 1 - 2 * (1 - cosPhi * cosPhi) : -1 + 0.5 * Math.min(1, -cosPhi * 1.6));
const gust = (t, on) => (on ? 1 + 0.42 * Math.sin(1.7 * t) + 0.22 * Math.sin(4.3 * t + 1) + 0.12 * Math.sin(9.1 * t + 2) : 1);

export default {
  id: 'wind',
  short: 'Wind and the porous wall',
  title: 'Gusts, pores and a mound that works like a lung',
  subtitle: 'Wind presses on one side and pulls on the other. Gusts make the air inside slosh to and fro.',
  view: { pos: [-1.2, 2.6, 7.2], target: [0.3, 1.1, 0] },
  learn: `<p>Wind also presses on a mound. It <b>pushes</b> on the side that faces it and <b>pulls</b> (lowers the pressure) on the sides and the back. Because the wall is porous, those small pressure differences reach the conduits just inside.</p>
    <p>The physiologist <b>J. Scott Turner</b> studied <i>Macrotermes michaelseni</i> mounds in northern Namibia for over 25 years, with the engineer <b>Rupert Soar</b>. He called the mound an accessory organ of gas exchange: less an air conditioner than a <b>lung</b>, built and constantly repaired by the termites. In his view, gusty wind makes the air in the outer conduits move <b>back and forth</b>, like a tide, mixing fresh and stale air while gases <b>diffuse</b> through the porous wall. Later work by Soar's group found that small tunnels the termites open in the surface in the rainy season let even weak, gusty winds stir the air inside.</p>
    <p>Not everyone agrees how much this matters. The Harvard team that measured Indian mounds calculated that wind pushes air through the wall far too slowly to ventilate them, and the 2017 Namibian study found the daily flows did not follow the wind. A 2019 X-ray study of termite nest walls found both: gas escaped through the pores mainly by diffusion in light wind, and was pushed by wind when it blew hard. It probably depends on the species, the mound, the weather and the season. <b>This is still an open question.</b></p>
    <p class="tip"><b>Try it:</b> turn on the surface pressure, then raise the wind. Switch gusts on and watch the air inside the conduits rock to and fro while gases slip through the wall.</p>
    <p class="note">Our own simplified model. The flow around the mound is ideal flow past a cylinder at each height, with a rough wake behind it. Real air separates and swirls.</p>`,
  terms: [
    { t: 'Porous wall', d: 'A wall full of tiny connected holes that let gases pass slowly but stop strong drafts.' },
    { t: 'Diffusion', d: 'Molecules spreading from where they are crowded to where they are scarce, with no flow needed.' },
    { t: 'Tidal ventilation', d: 'Air moving back and forth in the same passages, like breathing in and out.' },
    { t: 'Dynamic pressure', d: 'The pressure a wind can exert when it is brought to a stop: one half times air density times speed squared.' },
    { t: 'Wake', d: 'The region of slower, swirling air behind an obstacle.' },
  ],
  defaults: { wind: 3, gusty: true, pressure: true, peel: 0.55 },
  controls: [
    { key: 'wind', type: 'range', label: 'Wind speed', min: 0, max: 8, step: 0.1, fmt: (v) => v.toFixed(1) + ' m/s' },
    { key: 'gusty', type: 'toggle', label: 'Gusty wind', hint: 'Steady wind gives a steady push; gusts make the inside air slosh.' },
    { key: 'pressure', type: 'toggle', label: 'Show surface pressure', hint: 'Coral: pushed in. Blue: pulled out.' },
    { key: 'peel', type: 'range', label: 'Peel the mound open', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 140) + '°' },
  ],
  quiz: [
    { q: 'Which side of the mound gets pushed hardest by the wind?', options: ['The side facing the wind', 'The back', 'The top', 'All sides equally'], answer: 0, why: 'Air stops against the upwind face, so the pressure is highest there. The sides and back feel suction.' },
    { q: 'According to J. Scott Turner, what do gusts mostly do to the air in the outer conduits?', options: ['Blow it straight through', 'Make it move back and forth, like a tide', 'Freeze it', 'Nothing'], answer: 1, why: 'Changing gusts rock the air to and fro, which mixes it and helps gases cross the wall.' },
    { q: 'How do gases get through the outer wall?', options: ['Through big open windows', 'By diffusing through tiny pores', 'They cannot', 'Termites carry them'], answer: 1, why: 'The wall is porous. Carbon dioxide diffuses out and oxygen diffuses in.' },
    { q: 'Is it settled whether sun or wind matters more?', options: ['Yes, only wind matters', 'Yes, only sun matters', 'No, studies disagree and it may depend on species, mound and weather', 'Nobody has measured it'], answer: 2, why: 'Sun-driven flows and wind effects have both been measured, in different mounds. Their balance is still debated.' },
  ],
  reel: [
    { ms: 5600, caption: 'Wind pushes on one side of the mound and pulls on the other. Gusts make the air inside slosh to and fro.', set: { wind: 1, gusty: true, pressure: true, peel: 0.55 }, anim: { wind: [1, 5] }, view: { pos: [-1.2, 2.6, 7.2], target: [0.3, 1.1, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stage.floor.position.y = -1.37; frame(stage, 0.1, 0); stage.scene.background = new THREE.Color(0x0b1018);
    const root = stage.root;
    const mound = makeMound(stage, { H: 3, peel: s.peel, workers: 120 });
    root.add(mound.group);
    const R = rng(11);
    let U = s.wind, gk = 1, showP = s.pressure;
    mound.colorAt = (C, y, th) => {
      const n = 0.5 + 0.5 * Math.sin(41 * th + 17 * y) * Math.sin(23 * y - 9 * th);
      C.setHex(COL.soil).lerp(new THREE.Color(COL.sand), 0.3 * (y / 3) + 0.15 * n).multiplyScalar(0.8 + 0.25 * n);
      if (!showP) return;
      const c = cp(-Math.sin(th)), k = clamp(U / 5, 0, 1) * Math.min(1, Math.abs(c));
      C.lerp(new THREE.Color(c > 0 ? COL.warm : COL.cool), 0.75 * k);
    };
    // wind particles
    const wind = swarm(NP, new THREE.SphereGeometry(0.022, 6, 4), M.glow(0xdfe9ff, { transparent: true, opacity: 0.6 }));
    wind.castShadow = false; wind.frustumCulled = false; root.add(wind);
    const P = Array.from({ length: NP }, () => ({ x: -4 + 8 * R(), y: 0.1 + 3.4 * R(), z: -2.4 + 4.8 * R(), ph: R() * 6.28 }));
    const tidal = loopParticles(root, 26, 0.04); tidal.setLoops(mound.loops);
    // gas dots crossing the wall: CO2 out (violet), O2 in (green)
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 8, 6), M.glow(0xffffff), ND);
    dots.frustumCulled = false; root.add(dots);
    const D = Array.from({ length: ND }, (_, i) => ({ th: R() * 6.283, y: 0.15 + 2.2 * R(), ph: R(), out: i % 2 === 0 }));
    const arrowL = stage.label('Wind →', [-2.6, 0.25, 1.6], root, 'hot');
    const lblHi = stage.label('Pushed in', [-1.35, 0.5, 0.2], root);
    const lblLo = stage.label('Pulled out', [0.15, 0.5, 1.45], root);
    const O = new THREE.Object3D(), C = new THREE.Color();
    let t = 0, sig = '', tideU = 0;
    return {
      update(dt, st) {
        t += dt;
        gk = gust(t, st.gusty);
        const k = `${st.peel}|${st.pressure}|${st.wind.toFixed(1)}`;
        if (k !== sig) { const pk = sig.split('|')[0]; sig = k; U = st.wind; showP = st.pressure; if (String(st.peel) !== pk) mound.set({ peel: st.peel }); mound.repaint(); }
        const u0 = st.wind * gk, sh = mound.shape, vis = 0.32;
        for (let i = 0; i < NP; i++) {
          const p = P[i];
          const a = p.y < sh.H ? sh.R(p.y) * 1.08 + 0.05 : 0.0001, r2 = p.x * p.x + p.z * p.z, a2 = a * a;
          let vx = u0, vz = 0;
          if (r2 > a2) { const r4 = r2 * r2; vx = u0 * (1 - (a2 * (p.x * p.x - p.z * p.z)) / r4); vz = -u0 * (2 * a2 * p.x * p.z) / r4; }
          if (p.x > 0 && Math.abs(p.z) < a * 1.4 && p.y < sh.H) { vx *= 0.45; vz += u0 * 0.5 * Math.sin(t * 5 + p.ph + p.x * 3); }
          p.x += vx * vis * dt; p.z += vz * vis * dt;
          if (p.x > 4 || r2 < a2 * 0.9 || Math.abs(p.z) > 2.6) { p.x = -4 - 0.3 * R(); p.z = -2.4 + 4.8 * R(); p.y = 0.1 + 3.4 * R(); }
          O.position.set(p.x, p.y, p.z); O.scale.setScalar(st.wind < 0.05 ? 0.0001 : 1); O.updateMatrix(); wind.setMatrixAt(i, O.matrix);
        }
        wind.done();
        // tidal sloshing: the gust part of the wind rocks the conduit air back and forth
        const swing = st.gusty ? st.wind * (gk - 1) * 2.2 : 0;
        const tv = swing * 0.12 + 0.02 * st.wind;
        tideU = tv;
        tidal.update(dt, tv, () => COL.co2, (i) => mound.conduits[i]?.visible, 1);
        // gases through the porous wall
        const rate = 0.18 + 0.1 * st.wind * (st.gusty ? gk : 1);
        for (let i = 0; i < ND; i++) {
          const d = D[i]; d.ph += rate * dt * (0.6 + 0.8 * ((i * 37) % 10) / 10);
          if (d.ph > 1) { d.ph -= 1; d.th = R() * 6.283; d.y = 0.15 + 2.2 * R(); }
          const hidden = inCut(d.th, mound.cut * 1.05);
          const r = sh.r(d.y, d.th), f = d.out ? d.ph : 1 - d.ph, rr = r - 0.14 + 0.36 * f;
          O.position.set(rr * Math.sin(d.th), d.y, rr * Math.cos(d.th)); O.scale.setScalar(hidden ? 0.0001 : Math.sin(Math.PI * d.ph) * 1.1); O.updateMatrix();
          dots.setMatrixAt(i, O.matrix); C.setHex(d.out ? COL.co2 : COL.o2); dots.setColorAt(i, C);
        }
        dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
        mound.update(dt, t);
        arrowL.element.textContent = st.wind < 0.05 ? 'No wind' : `Wind ${fmt(u0, 1)} m/s →`;
        lblHi.element.style.opacity = lblLo.element.style.opacity = st.pressure && st.wind > 0.5 ? 1 : 0;
      },
      readout(st) {
        const q = 0.5 * RHO_AIR * st.wind * st.wind, dp = 1.5 * q;
        const buoy = RHO_AIR * 9.81 * 2.5 * 5 / 300;  // 5 °C difference over 2.5 m of height
        return `<div class="big">${fmt(dp, 1)} Pa across the mound</div>
          <p class="r-say">Tiny pressures, about a ten-thousandth of normal air pressure or less, but enough to move air through pores and tunnels.</p>
          <div class="row"><span>Dynamic pressure ½ρU²</span><b>${fmt(q, 1)} Pa</b></div>
          <div class="row"><span>Upwind push to downwind pull (rough)</span><b>${fmt(dp, 1)} Pa</b></div>
          <div class="row"><span>Compare: 5 °C warmer air, 2.5 m tall</span><b>${fmt(buoy, 2)} Pa</b></div>
          <div class="row"><span>Inside air</span><b>${st.gusty && st.wind > 0.3 ? 'sloshing to and fro' : st.wind > 0.3 ? 'small steady drift' : 'still'}</b></div>
          <p class="note">Wind pushes harder than warm air lifts, but it keeps changing direction. That is why it mostly mixes rather than flushes.</p>`;
      },
    };
  },
};
