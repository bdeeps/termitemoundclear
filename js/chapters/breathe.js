// Chapter 2: the mound breathes with the day. Our own simplified model (not a fluid simulation):
// the thin outer conduits follow the sun and the air, the core and nest change slowly. When the outer
// conduits are warmer than the chimney, air rises along the outside and sinks down the chimney (day);
// when they are cooler, it flips (night). Flow speed is taken as proportional to that temperature
// difference, and the nest's CO2 is flushed faster when the flow is stronger.
import { THREE, COL, makeMound, loopParticles, hud, clearHuds, panel, temps, clock, makeSun, fmt, hex, FONT, clamp, frame } from '../mound.js';

const K_FLOW = 0.6;        // model: cm/s of flow per degree C of temperature difference
const THERMO = 0.8;        // model: a small, steady flow driven by colony heat alone (cm/s)
const VIS = 0.12;          // drawing speed: metres per second on screen per cm/s of real flow
const CO2_AIR = 0.04;      // % CO2 in outside air

const flow = (h, model) => (model === 'thermo' ? THERMO : K_FLOW * temps(h).delta);   // + = up the outside (day)

// CO2 in the nest over a day (our model): production P, flushing (k0 + k1 v²)(C - air). Run a few days so the
// numbers settle into a daily cycle, then store one day in 0.1 h steps.
function co2Table(model) {
  const P = 1.4, k0 = 0.04, k1 = 0.3, dt = 0.02;
  let C = 1, out = [];
  for (let day = 0; day < 6; day++) for (let i = 0; i < 1200; i++) {
    const h = i * dt; const v = flow(h, model); C += dt * (P - (k0 + k1 * v * v) * (C - CO2_AIR));
    if (day === 5 && i % 5 === 0) out.push(C);
  }
  return out;
}
const TABLES = { daily: co2Table('daily'), thermo: co2Table('thermo') };
const co2At = (h, model) => { const T = TABLES[model], f = ((((h % 24) + 24) % 24) / 24) * T.length, i = Math.floor(f) % T.length; return T[i] + (T[(i + 1) % T.length] - T[i]) * (f - Math.floor(f)); };
const tcol = (T) => { const k = clamp((T - 16) / 22, 0, 1); return new THREE.Color(COL.cool).lerp(new THREE.Color(COL.warm), k).getHex(); };

export default {
  id: 'breathe',
  short: 'Breathing with the sun',
  title: 'A mound that breathes with the day',
  subtitle: 'The colony needs fresh air. The daily swing of temperature pumps it, and the flow flips at night.',
  view: { pos: [3.0, 2.0, 7.0], target: [0.5, 0.75, 0] },
  learn: `<p>A big colony and its fungus gardens <b>use oxygen</b> and give off <b>carbon dioxide</b>, water and heat, much like a large animal. The fungus does most of that breathing: by one estimate, about 85 percent of the mound's metabolism. A large nest in Kenya was measured giving off 800 to 1,500 litres of CO2 a day. Sealed in, the colony would suffocate, so the nest has to swap stale air for fresh.</p>
    <p>For decades the favourite idea was a <b>thermosiphon</b>, made famous by the Swiss entomologist Martin Lüscher in 1961: the colony's own heat warms the air in the chimney, it rises, cools near the walls and sinks again, in a steady loop. Others proposed <b>induced flow</b>, with wind drawing air out of the top.</p>
    <p>Measurements inside real mounds told a different story. In 2015 a Harvard team, Hunter King, Samuel Ocko and L. Mahadevan, put sensors in mounds of <i>Odontotermes obesus</i> near Bangalore, India. <b>By day</b>, the thin outer flutes heat up faster than the deep chimney, so air rises along the outside and sinks down the middle. <b>At night</b> the flutes cool first and the flow reverses. CO2 built up to nearly 6 percent in the nest by day and was flushed out at night. The mound runs on the <b>daily swing of temperature</b>, not on a steady engine. A 2017 study of <i>Macrotermes michaelseni</i> in Namibia found the same sun-driven, twice-a-day reversal.</p>
    <p class="tip"><b>Try it:</b> drag the time of day slowly. When the outer conduits and the core are at the same temperature, the flow stalls and CO2 builds up. Then switch to the old thermosiphon idea: a weak, steady loop leaves the nest stale all day.</p>
    <p class="note">This is our own simplified model, not a fluid simulation. Flow is set proportional to the temperature difference (measured flows are around a centimetre per second); particles are drawn many times faster than real.</p>`,
  terms: [
    { t: 'Thermosiphon', d: 'A loop in which warm fluid rises, cools and sinks, driven by a steady heat source.' },
    { t: 'Induced flow', d: 'Air drawn out of an opening by wind blowing across it.' },
    { t: 'Diurnal', d: 'Happening once a day, like the rise and fall of air temperature.' },
    { t: 'Buoyancy', d: 'Warmer air is lighter than the cooler air around it, so it tends to rise.' },
    { t: 'Ventilation', d: 'Exchanging stale air for fresh air.' },
  ],
  defaults: { hour: 13, play: false, model: 'daily', peel: 0.8 },
  controls: [
    { key: 'hour', type: 'range', label: 'Time of day', min: 0, max: 24, step: 0.05, fmt: (v) => clock(v), ends: ['midnight', 'midnight'] },
    { key: 'play', type: 'toggle', label: 'Run the day', hint: 'About 1.5 hours pass every second.' },
    { key: 'model', type: 'seg', label: 'Which idea', options: [{ v: 'daily', label: 'Daily swing (measured)' }, { v: 'thermo', label: 'Thermosiphon (old idea)' }] },
    { key: 'peel', type: 'range', label: 'Peel the mound open', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 140) + '°' },
  ],
  quiz: [
    { q: 'In the daytime, which part of the mound warms up fastest?', options: ['The nest', 'The thick core and chimney', 'The thin outer conduits near the surface', 'The soil under the nest'], answer: 2, why: 'The thin outer walls take in sunlight and warm air quickly, while the thick core changes slowly.' },
    { q: 'By day, which way does air flow in the measured mounds?', options: ['Up the chimney, down the outside', 'Up the outer conduits, down the chimney', 'It does not move', 'Straight out of a hole at the top'], answer: 1, why: 'Warm air in the outer channels rises, so the cooler air in the chimney sinks to replace it.' },
    { q: 'What drives the flow, according to King, Ocko and Mahadevan (2015)?', options: ['A steady engine of colony heat', 'The daily rise and fall of outside temperature', 'Termites fanning their wings', 'The Earth spinning'], answer: 1, why: 'The swing between day and night creates temperature differences that switch the flow direction twice a day.' },
    { q: 'In this model, when is the nest air most stale?', options: ['At noon', 'At midnight', 'Around the switchover hours, when the flow stalls', 'It is always the same'], answer: 2, why: 'When the outside and core are at nearly the same temperature, there is little to drive the flow.' },
  ],
  reel: [
    { ms: 5600, caption: 'The colony burns oxygen and breathes out CO2, so the mound must change its air.', set: { hour: 13, play: false, model: 'daily', peel: 0.8 }, view: { pos: [3.0, 2.0, 7.0], target: [0.5, 0.75, 0] }, spin: 0 },
    { ms: 5600, caption: 'By day, the thin outer channels heat up first. Air rises along the outside and sinks down the middle.', set: { hour: 9, play: false, model: 'daily', peel: 0.8 }, anim: { hour: [9, 14] }, view: { pos: [2.4, 1.7, 6.0], target: [0.3, 0.9, 0] }, spin: 0 },
    { ms: 5600, caption: 'At night the outside cools first, and the whole flow turns around.', set: { hour: 17, play: false, model: 'daily', peel: 0.8 }, anim: { hour: [17, 23.5] }, view: { pos: [3.0, 2.0, 7.0], target: [0.5, 0.75, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stage.floor.position.y = -1.37; frame(stage, -0.12, -0.04);
    const root = stage.root;
    const mound = makeMound(stage, { H: 3, peel: s.peel, workers: 160 });
    root.add(mound.group);
    const sun = makeSun(root, 8);
    const parts = loopParticles(root, 34, 0.04); parts.setLoops(mound.loops);
    let surfT = 30;
    mound.colorAt = (C, y, th) => {
      const n = 0.5 + 0.5 * Math.sin(41 * th + 17 * y) * Math.sin(23 * y - 9 * th);
      C.setHex(COL.soil).lerp(new THREE.Color(COL.sand), 0.3 * (y / 3) + 0.15 * n).multiplyScalar(0.8 + 0.25 * n);
      const k = clamp((surfT - 26) / 14, -1, 1);
      C.lerp(new THREE.Color(k > 0 ? COL.warm : COL.cool), Math.abs(k) * 0.35);
    };
    const chart = hud(stage, 720, 500, (g, w, h, st) => draw(g, w, h, st));
    const lblDir = stage.label('', [0, -1.3, 1.6], root, 'hot');
    const lblChim = stage.label('Chimney', [0.1, 1.6, 0.15], root);
    const lblOut = stage.label('Outer conduits', [0, 0, 0], root);
    const day = new THREE.Color(0x1a2333), night = new THREE.Color(0x05060b);
    stage.scene.background = night.clone();
    let t = 0, peelSig = -1, lastPaint = -99;

    function draw(g, w, h, st) {
      const hr = ((st.hour % 24) + 24) % 24;
      panel(g, w, h, st.model === 'thermo' ? 'Old idea: steady thermosiphon' : 'A day in the mound (our model)');
      const L = 70, R = w - 70, T = 118, B = h - 50;
      const X = (x) => L + ((R - L) * x) / 24, Y = (T0) => B - ((B - T) * (T0 - 12)) / 34;
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5; g.font = FONT(19); g.fillStyle = '#8a91a6'; g.textAlign = 'right';
      for (let T0 = 15; T0 <= 45; T0 += 10) { g.beginPath(); g.moveTo(L, Y(T0)); g.lineTo(R, Y(T0)); g.stroke(); g.fillText(T0 + '°C', L - 8, Y(T0) + 6); }
      g.textAlign = 'center';
      for (let x = 0; x <= 24; x += 6) g.fillText(clock(x).slice(0, 5), X(x), B + 28);
      const curve = (fn, col, wdt = 3.5) => { g.strokeStyle = col; g.lineWidth = wdt; g.beginPath(); for (let i = 0; i <= 96; i++) { const x = (i / 96) * 24, y = fn(x); i ? g.lineTo(X(x), y) : g.moveTo(X(x), y); } g.stroke(); };
      curve((x) => Y(temps(x).air), 'rgba(238,240,246,0.55)', 2.5);
      curve((x) => Y(temps(x).surface), hex(COL.warm));
      curve((x) => Y(temps(x).core), hex(COL.hot));
      // CO2 on its own scale: 0..6 %
      const Yc = (c) => B - ((B - T) * c) / 6;
      curve((x) => Yc(co2At(x, st.model)), hex(COL.co2), 3);
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X(hr), T); g.lineTo(X(hr), B); g.stroke(); g.setLineDash([]);
      g.textAlign = 'left';
      const key = [['Outer conduits', hex(COL.warm)], ['Core & chimney', hex(COL.hot)], ['Outside air', '#c9cdd8'], ['Nest CO2 (0–6 %)', hex(COL.co2)]];
      g.font = FONT(19, 500);
      key.forEach(([n, c], i) => { const x = 26 + (i % 2) * 330, y = 74 + Math.floor(i / 2) * 26; g.fillStyle = c; g.fillRect(x, y - 12, 16, 5); g.fillText(n, x + 22, y - 4); });
    }

    return {
      dispose() { clearHuds(); },
      update(dt, st) {
        t += dt;
        if (st.play) st.hour = (st.hour + dt * 1.5) % 24;
        const hr = ((st.hour % 24) + 24) % 24, T0 = temps(hr);
        if (st.peel !== peelSig) { peelSig = st.peel; mound.set({ peel: st.peel }); lastPaint = -99; }
        surfT = T0.surface;
        if (Math.abs(hr - lastPaint) > 0.25) { lastPaint = hr; mound.repaint(); }
        sun.set(hr);
        stage.scene.background.copy(night).lerp(day, T0.sun);
        const v = flow(hr, st.model);
        // particles: + flow = up the outside. Loops run up the chimney when u increases, so move them backwards.
        parts.update(dt, -v * VIS, (u, part) => tcol(part === 0 ? T0.core : part === 1 ? T0.surface : (T0.core + T0.surface) / 2),
          (i) => !mound.conduits[i] || mound.conduits[i].visible, 1);
        mound.update(dt, t);
        chart.redraw(st); chart.dock();
        const up = v > 0.15, down = v < -0.15;
        lblDir.element.textContent = up ? 'Air rises up the outside, sinks down the chimney' : down ? 'Air rises up the chimney, sinks down the outside' : 'Flow stalls: outside and core are the same temperature';
        const th = mound.cut / 2 + 0.35, y = 1.2, r = mound.shape.r(y, th);
        lblOut.position.set(r * Math.sin(th), y, r * Math.cos(th));
        lblChim.element.style.opacity = lblOut.element.style.opacity = st.peel > 0.2 ? 1 : 0;
      },
      readout(st) {
        const hr = ((st.hour % 24) + 24) % 24, T0 = temps(hr), v = flow(hr, st.model), c = co2At(hr, st.model);
        const dir = Math.abs(v) < 0.15 ? 'stalled' : v > 0 ? 'up the outside' : 'up the chimney';
        return `<div class="big">${clock(hr)} · flow ${dir}</div>
          <p class="r-say">${st.model === 'thermo' ? 'The old idea: colony heat drives a steady loop, day and night, always the same way.' : 'Outer conduits minus core temperature sets which way the air goes, and how fast.'}</p>
          <div class="row"><span>Outside air</span><b>${fmt(T0.air, 1)} °C</b></div>
          <div class="row"><span>Outer conduits</span><b>${fmt(T0.surface, 1)} °C</b></div>
          <div class="row"><span>Core and chimney</span><b>${fmt(T0.core, 1)} °C</b></div>
          <div class="row"><span>Flow speed (model)</span><b>${fmt(Math.abs(v), 1)} cm/s</b></div>
          <div class="row"><span>Nest CO2 (model)</span><b>${fmt(c, 2)} %</b></div>
          <p class="note">Outside air holds about 0.04 % CO2. Illustrative model values.</p>`;
      },
    };
  },
};
