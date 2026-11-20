// Chapter 6: the Eastgate Centre in Harare, Zimbabwe (architect Mick Pearce, opened 1996). A schematic of its
// passive cooling: heavy concrete floors store the day's heat; at night, fans push cool outside air through hollow
// floors to flush it out, and warm air leaves through chimneys on the roof. Our own simplified drawing and model,
// not the real building's plans or measured data.
import { THREE, M, COL, swarm, rng, clock, fmt, clamp, makeSun, frame } from '../mound.js';

const FL = 9, FH = 0.3, LEN = 5.2, BW = 1.25, GAP = 0.9;      // floors, floor height, block length, block width, atrium gap
const w = (2 * Math.PI) / 24;
const outside = (h) => 21 + 5 * Math.sin(w * (h - 9));   // a daily swing of about 10 °C, as reported for Harare
// slab temperature: the concrete moves slowly toward the day's mean; the night flush pulls it down
function slab(h, fans) {
  let T = 23;
  for (let d = 0; d < 4; d++) for (let x = 0; x < 24; x += 0.1) {
    const night = x < 7 || x > 19, rate = night && fans ? 0.22 : 0.05, heat = x > 8 && x < 18 ? 0.25 : 0;
    T += 0.1 * (rate * (outside(x) - T) + heat * (fans ? 1 : 1.3));
    if (d === 3 && Math.abs(x - h) < 0.05) return T;
  }
  return T;
}
const SLAB = { true: Array.from({ length: 240 }, (_, i) => slab(i / 10, true)), false: Array.from({ length: 240 }, (_, i) => slab(i / 10, false)) };
const slabAt = (h, fans) => SLAB[fans][Math.floor((((h % 24) + 24) % 24) * 10) % 240];

export default {
  id: 'eastgate',
  short: 'The Eastgate Centre',
  title: 'A building that copied a termite mound',
  subtitle: 'In Harare, an office block keeps cool without conventional air conditioning. Termite mounds gave the idea.',
  view: { pos: [5.2, 3.4, 6.6], target: [0, 1.2, 0] },
  learn: `<p>The <b>Eastgate Centre</b> in Harare, Zimbabwe, opened in 1996: nine storeys of offices and shops, about 55,000 square metres. Its architect, <b>Mick Pearce</b>, worked with the engineers <b>Arup</b> to cool it without conventional air conditioning, taking his inspiration from termite mounds.</p>
    <p>The trick is <b>thermal mass</b> plus <b>night flushing</b>. Harare sits high, at about 1,500 metres, so nights are cool even after hot days. The heavy concrete floors soak up heat during the day. At night, fans in the lower part of the building push cool outside air through hollow spaces in the floors, carrying the stored heat away, and the warm air rises out through <b>48 brick chimneys</b> on the roof. In 1996 the design was reported to change the air about twice an hour by day and seven times an hour at night.</p>
    <p>How much energy does it save? Arup says it uses <b>90 percent less energy</b> to heat and cool, and Pearce's own site says about a tenth of the energy of comparable buildings. Other reports give smaller savings, such as 35 percent less total energy than similar buildings, so the figures depend on what is counted. And there is a twist: the design followed the older, steady-chimney picture of how mounds work. Later research showed real mounds breathe in more complex ways, and some found they do not hold their temperature as tightly as once thought. The <b>biology was messier</b> than the inspiration, yet the building still works.</p>
    <p class="tip"><b>Try it:</b> run the day with the night fans on, then off. Watch how warm the concrete floors stay without the night flush.</p>
    <p class="note">Schematic drawing and a simple model of our own, not the building's real plans or measured data.</p>`,
  terms: [
    { t: 'Passive cooling', d: 'Keeping a building cool using its shape, materials and natural air flow, with little or no machine cooling.' },
    { t: 'Night flushing', d: 'Blowing cool night air through a building to carry away heat stored during the day.' },
    { t: 'Thermal mass', d: 'Heavy material, like concrete or soil, that stores heat and releases it slowly.' },
    { t: 'Biomimicry', d: 'Designing things by learning from how living things solve similar problems.' },
  ],
  defaults: { hour: 22, fans: true, play: false },
  controls: [
    { key: 'hour', type: 'range', label: 'Time of day', min: 0, max: 24, step: 0.05, fmt: (v) => clock(v) },
    { key: 'fans', type: 'toggle', label: 'Night fans on', hint: 'Fans push cool night air through the hollow floors.' },
    { key: 'play', type: 'toggle', label: 'Run the day' },
  ],
  quiz: [
    { q: 'Where is the Eastgate Centre?', options: ['Nairobi, Kenya', 'Harare, Zimbabwe', 'Cape Town, South Africa', 'Lagos, Nigeria'], answer: 1, why: 'It is in Harare, Zimbabwe, and opened in 1996.' },
    { q: 'What does the building do at night?', options: ['Heats the floors', 'Pushes cool outside air through hollow floors to carry heat away', 'Closes every opening', 'Turns on big air conditioners'], answer: 1, why: 'Night flushing cools the heavy concrete so it can soak up heat again the next day.' },
    { q: 'What happened to the termite science that inspired it?', options: ['It was proven exactly right', 'Later research showed mounds work in more complex ways', 'Termites were found not to build mounds', 'Nothing has been studied since'], answer: 1, why: 'Newer measurements found daily reversing flows and wind effects, not just a steady chimney.' },
  ],
  reel: [
    { ms: 5800, caption: 'In Harare, the Eastgate Centre borrowed the idea. Concrete soaks up the day; cool night air flushes it out.', set: { hour: 19, fans: true, play: false }, anim: { hour: [19, 26] }, view: { pos: [5.2, 3.4, 6.6], target: [0, 1.2, 0] }, spin: 0.4 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stage.floor.position.y = 0; frame(stage, 0.1, 0);
    const root = stage.root;
    const sun = makeSun(root, 9);
    const day = new THREE.Color(0x1a2333), night = new THREE.Color(0x05060b);
    stage.scene.background = night.clone();
    const ground = new THREE.Mesh(new THREE.BoxGeometry(LEN + 3, 0.08, 2 * BW + GAP + 3), M.matte(0x3a3f45)); ground.position.y = -0.04; ground.receiveShadow = true; root.add(ground);
    const concrete = new THREE.Color(0xb7bcc6), warm = new THREE.Color(COL.warm), cool = new THREE.Color(COL.cool);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xb7bcc6, roughness: 0.9 });
    const wallMat = M.clear(0xcfe8ff, 0.12);
    const brick = M.matte(0x8a5a44);
    const blocks = [];
    for (const side of [-1, 1]) {
      const g = new THREE.Group(); g.position.z = side * (GAP / 2 + BW / 2); root.add(g); blocks.push(g);
      for (let f = 0; f <= FL; f++) {
        const sl = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.07, BW), slabMat); sl.position.y = f * FH + 0.035; sl.castShadow = sl.receiveShadow = true; g.add(sl);
      }
      const skin = new THREE.Mesh(new THREE.BoxGeometry(LEN, FL * FH, BW), wallMat); skin.position.y = (FL * FH) / 2; g.add(skin);
      // piers along the facade
      for (let i = 0; i <= 10; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, FL * FH, 0.06), M.matte(0x9a9fa8)); p.position.set(-LEN / 2 + (i * LEN) / 10, (FL * FH) / 2, side * BW / 2); g.add(p); }
      // chimneys on the roof
      for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.55, 0.13), brick); c.position.set(-LEN / 2 + 0.3 + (i * (LEN - 0.6)) / 11, FL * FH + 0.28, (r ? 0.28 : -0.28)); c.castShadow = true; g.add(c); }
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.02, GAP), M.clear(0x9fd8ff, 0.22)); roof.position.y = FL * FH + 0.1; root.add(roof);
    // air particles: up the atrium side, across a floor void, out of a chimney
    const R = rng(3), N = 360;
    const air = swarm(N, new THREE.SphereGeometry(0.03, 8, 6), M.glow(0xffffff)); air.castShadow = false; air.frustumCulled = false; root.add(air);
    const P = Array.from({ length: N }, () => ({ u: R(), f: 1 + Math.floor(R() * (FL - 1)), x: -LEN / 2 + 0.3 + Math.floor(R() * 12) * ((LEN - 0.6) / 11), side: R() < 0.5 ? -1 : 1 }));
    const C = new THREE.Color();
    const pathAt = (p, u) => {
      const z0 = p.side * (GAP / 2 + 0.05), z1 = p.side * (GAP / 2 + BW * 0.75), yf = p.f * FH - 0.06, top = FL * FH + 0.65;
      if (u < 0.3) { const k = u / 0.3; return [p.x + 0.3 * Math.sin(k * 3), 0.08 + (yf - 0.08) * k, z0]; }      // up from the fans
      if (u < 0.6) { const k = (u - 0.3) / 0.3; return [p.x, yf, z0 + (p.side * 0.25 - z0) * 0 + (z1 - z0) * k]; } // across the floor void
      const k = (u - 0.6) / 0.4; const zc = p.side * (GAP / 2 + BW / 2) + p.side * 0.25 * 0; return [p.x, yf + (top - yf) * k, z1 + (zc + p.side * 0.25 - z1) * Math.min(1, k * 3)];
    };
    const lblFan = stage.label('Fans push in night air', [0, 0.25, 0], root);
    const lblCh = stage.label('Warm air out of the chimneys', [LEN / 2 - 0.3, FL * FH + 1.0, 0.8], root);
    const lblSlab = stage.label('', [-LEN / 2 - 0.2, FL * FH * 0.5, 1.6], root, 'hot');
    let t = 0;
    return {
      update(dt, st) {
        t += dt;
        if (st.play) st.hour = (st.hour + dt * 1.5) % 24;
        const hr = ((st.hour % 24) + 24) % 24, Ts = slabAt(hr, st.fans), To = outside(hr);
        const nightF = hr < 7 || hr > 19;
        const flow = nightF && st.fans ? 1 : 2 / 7;   // reported: about 7 air changes an hour at night, 2 by day
        sun.set(hr);
        const sunUp = Math.max(0, Math.sin(((hr - 6) / 12) * Math.PI));
        stage.scene.background.copy(night).lerp(day, sunUp);
        const k = clamp((Ts - 18) / 12, 0, 1);
        slabMat.color.copy(concrete).lerp(k > 0.5 ? warm : cool, Math.abs(k - 0.5) * 1.1);
        for (let i = 0; i < N; i++) {
          const p = P[i]; p.u += dt * flow * (0.18 + 0.05 * ((i * 13) % 7) / 7);
          if (p.u > 1) { p.u -= 1; p.f = 1 + Math.floor(R() * (FL - 1)); p.side = R() < 0.5 ? -1 : 1; }
          const show = i < N * (0.25 + 0.75 * flow);
          air.place(i, pathAt(p, p.u), null, show ? 1 : 0.0001);
          C.copy(cool).lerp(warm, clamp((p.u - 0.3) / 0.6, 0, 1) * clamp((Ts - To) / 6 + 0.3, 0, 1)); air.setColorAt(i, C);
        }
        air.done(); if (air.instanceColor) air.instanceColor.needsUpdate = true;
        lblFan.element.style.opacity = nightF && st.fans ? 1 : 0.35;
        lblSlab.element.textContent = `Concrete floors ${fmt(Ts, 1)} °C`;
      },
      readout(st) {
        const hr = ((st.hour % 24) + 24) % 24, Ts = slabAt(hr, st.fans), To = outside(hr), nightF = hr < 7 || hr > 19;
        let mx = 0; for (let x = 0; x < 24; x += 0.1) mx = Math.max(mx, slabAt(x, st.fans));
        return `<div class="big">${clock(hr)} · ${nightF ? (st.fans ? 'night flush' : 'fans off') : 'storing the day\'s heat'}</div>
          <p class="r-say">${nightF ? 'Cool night air carries the heat out of the concrete and up the chimneys.' : 'The heavy floors soak up heat, so the rooms warm slowly.'}</p>
          <div class="row"><span>Outside air (model)</span><b>${fmt(To, 1)} °C</b></div>
          <div class="row"><span>Concrete floors (model)</span><b>${fmt(Ts, 1)} °C</b></div>
          <div class="row"><span>Warmest the floors get today</span><b>${fmt(mx, 1)} °C</b></div>
          <div class="row"><span>Air changes (reported, 1996)</span><b>${nightF && st.fans ? '7' : '2'} per hour</b></div>
          <div class="row"><span>Opened</span><b>1996, Harare</b></div>`;
      },
    };
  },
};
