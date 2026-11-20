// Chapter 4: keeping temperature and humidity steady. Outside air swings by many degrees between day and night;
// the nest, buried in soil under a thick mound, swings much less. Our own simplified model: the nest follows the
// soil temperature plus a little colony heat, with a much smaller daily swing. Mound type changes how much heat
// is kept in. Numbers are illustrative and sit inside published ranges.
import { THREE, M, COL, makeMound, hud, clearHuds, panel, swarm, rng, clock, fmt, hex, FONT, clamp, frame } from '../mound.js';

const SEASON = {
  hot: { n: 'Hot dry season', mean: 27, swing: 10, rh: '10–30 %' },
  wet: { n: 'Rainy season', mean: 25, swing: 5, rh: '60–90 %' },
  cool: { n: 'Cool dry season', mean: 18, swing: 11, rh: '20–40 %' },
};
// Savanna mounds stand in the open; forest domes stand in shade (cooler, smaller daily swing). Large savanna nests
// held near 30 °C, forest nests about 28 °C (Korb & Linsenmair). The model pulls the nest most of the way toward
// that set point and keeps a small daily swing.
const TYPE = {
  open: { n: 'Thin-walled, ridged', ridge: 0.2, R0: 1.25, H: 3, shade: 0, swingK: 1, set: 30, damp: 0.1 },
  dome: { n: 'Thick-walled dome', ridge: 0.03, R0: 1.45, H: 2.1, shade: -3, swingK: 0.6, set: 28, damp: 0.06 },
};
const w = (2 * Math.PI) / 24;
const air = (h, se, ty) => se.mean + ty.shade + se.swing * ty.swingK * Math.sin(w * (h - 9));
const nest = (h, se, ty) => 0.25 * (se.mean + ty.shade + 2) + 0.75 * ty.set + ty.damp * se.swing * Math.sin(w * (h - 15));

export default {
  id: 'climate',
  short: 'Steady and humid',
  title: 'A steady home for a fussy fungus',
  subtitle: 'Outside, the air swings by ten degrees or more in a day. Down in the nest it barely moves.',
  view: { pos: [2.8, 1.5, 6.4], target: [0.6, 0.45, 0] },
  learn: `<p>The termites' real crop is a fungus, <b>Termitomyces</b>. It grows on combs of chewed plant matter in the nest and helps turn tough plant fibre into food. It grows best at about 29 to 30 °C, in very humid air.</p>
    <p>Much of the nest's steadiness comes from where it is: <b>buried in soil</b>, under a thick mass of earth. Soil changes temperature slowly, so hot afternoons and cold nights are smoothed out. In Côte d'Ivoire, Judith Korb and Eduard Linsenmair found that large savanna nests of <i>Macrotermes bellicosus</i> stay near 30 °C all year, varying by less than 2 °C while the air outside ranges over about 35 °C. Small mounds simply follow the outside air: it takes a big mound and the heat of a big colony to hold 30 °C.</p>
    <p>Mound shape also changes with the surroundings. In hot open savanna the same species builds thin-walled, ridged "cathedral" mounds full of channels; in shaded gallery forest it builds thick-walled domes, whose nests run about 2 °C cooler. When researchers cut shade trees, the termites built more ridged mounds. <b>Water</b> comes mostly from the damp soil around and below the nest, and the air in the mound's tunnels has been measured at about 93 percent humidity.</p>
    <p class="tip"><b>Try it:</b> switch the season and compare the two lines on the chart. Then switch to the shaded forest dome: cooler, calmer air outside, and a nest about 2 °C cooler.</p>
    <p class="note">Our own simplified model with illustrative numbers. Real nests vary by species, place, mound size and season; some, like <i>M. michaelseni</i> in Namibia, warm and cool with the seasons.</p>`,
  terms: [
    { t: 'Termitomyces', d: 'A genus of fungi grown only by fungus-farming termites. Some species make large edible mushrooms.' },
    { t: 'Thermal mass', d: 'A heavy material, like soil, that takes a long time to warm up or cool down.' },
    { t: 'Homeostasis', d: 'Keeping conditions inside steady while the outside changes.' },
    { t: 'Relative humidity', d: 'How much water vapour the air holds, as a percentage of the most it could hold at that temperature.' },
  ],
  defaults: { season: 'hot', type: 'open', hour: 15, play: false },
  controls: [
    { key: 'season', type: 'seg', label: 'Season', options: [{ v: 'hot', label: 'Hot dry' }, { v: 'wet', label: 'Rainy' }, { v: 'cool', label: 'Cool dry' }] },
    { key: 'type', type: 'seg', label: 'Mound type', options: [{ v: 'open', label: 'Ridged (savanna)' }, { v: 'dome', label: 'Thick dome (forest)' }] },
    { key: 'hour', type: 'range', label: 'Time of day', min: 0, max: 24, step: 0.05, fmt: (v) => clock(v) },
    { key: 'play', type: 'toggle', label: 'Run the day' },
  ],
  quiz: [
    { q: 'What do fungus-growing termites farm in their nest?', options: ['Ants', 'Termitomyces fungus', 'Moss', 'Bacteria in jars'], answer: 1, why: 'They grow Termitomyces on combs of chewed plant matter.' },
    { q: 'In Côte d\'Ivoire, about how much did large savanna nests vary over the year?', options: ['Less than 2 °C', 'About 10 °C', 'About 35 °C', 'Over 50 °C'], answer: 0, why: 'Korb and Linsenmair found large nests near 30 °C, varying by less than 2 °C while outside air ranged over about 35 °C.' },
    { q: 'Why does the nest swing so little in temperature over a day?', options: ['The termites switch on heaters', 'It is buried in soil, which changes temperature slowly', 'The mound is made of metal', 'It is always night underground'], answer: 1, why: 'Soil has a lot of thermal mass, so it smooths out hot afternoons and cold nights.' },
    { q: 'Where does most of the water in a nest\'s air come from?', options: ['Rain falling through a hole in the top', 'The damp soil around and below the nest', 'Dew on the outside', 'The termites\' breath alone'], answer: 1, why: 'Measurements in Kenya found most of the water leaving a nest came from the soil, not from the termites\' metabolism.' },
  ],
  reel: [
    { ms: 5600, caption: 'Outside, the air swings by ten degrees or more. Down in the nest, it barely moves.', set: { season: 'hot', type: 'open', hour: 4, play: false }, anim: { hour: [4, 20] }, view: { pos: [2.8, 1.5, 6.4], target: [0.6, 0.45, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stage.floor.position.y = -1.37; frame(stage, -0.12, -0.04); stage.scene.background = new THREE.Color(0x0a0d14);
    const root = stage.root;
    const opts = { H: TYPE[s.type].H, ridge: TYPE[s.type].ridge, R0: TYPE[s.type].R0, peel: 0.85, workers: 160 };
    const mound = makeMound(stage, opts);
    root.add(mound.group);
    const combMat = mound.combs[0].material;
    // a warm glow on the nest
    const glow = new THREE.PointLight(0xffb070, 0.6, 2.2); glow.position.set(0, mound.NY, 0.3); root.add(glow);
    // water: drops rising from damp soil below
    const R = rng(5), NDROP = 60;
    const drops = swarm(NDROP, new THREE.SphereGeometry(0.022, 8, 6), M.glow(COL.water)); drops.castShadow = false; drops.frustumCulled = false; root.add(drops);
    const D = Array.from({ length: NDROP }, () => ({ a: 0.3 + 0.6 * R(), r: 0.1 + 0.6 * R(), ph: R() }));
    const lblWater = stage.label('Moisture from damp soil', [0.9, -1.2, 1.1], root);
    const lblNest = stage.label('', [0, 0, 0], root, 'hot');
    const lblAir = stage.label('', [-1.6, 2.4, 0.3], root);
    const chart = hud(stage, 720, 460, (g, W, H, st) => draw(g, W, H, st));
    const O = new THREE.Object3D();
    let t = 0, sig = '';

    function draw(g, W, H, st) {
      const se = SEASON[st.season], ty = TYPE[st.type], hr = ((st.hour % 24) + 24) % 24;
      panel(g, W, H, `${se.n}: one day`);
      const L = 76, Rr = W - 40, T = 96, B = H - 66;
      const X = (x) => L + ((Rr - L) * x) / 24, Y = (T0) => B - ((B - T) * (T0 - 5)) / 40;
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5; g.font = FONT(19); g.fillStyle = '#8a91a6'; g.textAlign = 'right';
      for (let T0 = 10; T0 <= 40; T0 += 10) { g.beginPath(); g.moveTo(L, Y(T0)); g.lineTo(Rr, Y(T0)); g.stroke(); g.fillText(T0 + '°C', L - 8, Y(T0) + 6); }
      g.textAlign = 'center';
      for (let x = 0; x <= 24; x += 6) g.fillText(clock(x), X(x), B + 28);
      const curve = (fn, col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); for (let i = 0; i <= 96; i++) { const x = (i / 96) * 24; i ? g.lineTo(X(x), Y(fn(x))) : g.moveTo(X(x), Y(fn(x))); } g.stroke(); };
      curve((x) => air(x, se, ty), '#c9cdd8', 3);
      curve((x) => nest(x, se, ty), hex(COL.hot), 5);
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X(hr), T); g.lineTo(X(hr), B); g.stroke(); g.setLineDash([]);
      g.textAlign = 'left'; g.font = FONT(20, 500);
      g.fillStyle = '#c9cdd8'; g.fillRect(L, 70, 18, 5); g.fillText('Outside air', L + 26, 78);
      g.fillStyle = hex(COL.hot); g.fillRect(L + 200, 70, 18, 5); g.fillText('Nest (model)', L + 226, 78);
    }

    return {
      dispose() { clearHuds(); },
      update(dt, st) {
        t += dt;
        if (st.play) st.hour = (st.hour + dt * 1.5) % 24;
        if (st.type !== sig) {
          sig = st.type; const ty = TYPE[st.type];
          Object.assign(opts, { ridge: ty.ridge, R0: ty.R0 });
          mound.set({ peel: 0.85, H: ty.H });
        }
        const se = SEASON[st.season], ty = TYPE[st.type], hr = ((st.hour % 24) + 24) % 24;
        const Tn = nest(hr, se, ty), Ta = air(hr, se, ty);
        const k = clamp((Tn - 18) / 16, 0, 1);
        combMat.color.setHex(COL.fungus).lerp(new THREE.Color(0xffc68a), k * 0.5);
        glow.intensity = 0.25 + 0.8 * k;
        for (let i = 0; i < NDROP; i++) {
          const d = D[i]; d.ph = (d.ph + dt * 0.18) % 1;
          const y = -1.32 + (mound.NY + 1.32 - 0.15) * d.ph, a = d.a + 0.3 * Math.sin(d.ph * 6 + i);
          O.position.set(d.r * Math.sin(a), y, d.r * Math.cos(a)); O.scale.setScalar(Math.sin(Math.PI * d.ph)); O.updateMatrix(); drops.setMatrixAt(i, O.matrix);
        }
        drops.done();
        mound.update(dt, t);
        lblNest.position.set(-0.7, mound.NY + 0.4, 0.55);
        lblNest.element.textContent = `Nest ${fmt(Tn, 1)} °C`;
        lblAir.position.set(-1.1, 0.15, 1.5);
        lblAir.element.textContent = `Air ${fmt(Ta, 1)} °C`;
        chart.redraw(st); chart.dock();
      },
      readout(st) {
        const se = SEASON[st.season], ty = TYPE[st.type], hr = ((st.hour % 24) + 24) % 24;
        let lo = 99, hi = -99, nlo = 99, nhi = -99;
        for (let x = 0; x < 24; x += 0.25) { const a = air(x, se, ty), n = nest(x, se, ty); lo = Math.min(lo, a); hi = Math.max(hi, a); nlo = Math.min(nlo, n); nhi = Math.max(nhi, n); }
        return `<div class="big">Nest ${fmt(nest(hr, se, ty), 1)} °C at ${clock(hr)}</div>
          <p class="r-say">${se.n}, ${ty.n.toLowerCase()} mound.</p>
          <div class="row"><span>Outside air, over the day</span><b>${fmt(lo, 0)}–${fmt(hi, 0)} °C</b></div>
          <div class="row"><span>Nest, over the day (model)</span><b>${fmt(nlo, 1)}–${fmt(nhi, 1)} °C</b></div>
          <div class="row"><span>Outside humidity (typical)</span><b>${se.rh}</b></div>
          <div class="row"><span>Mound tunnel air (measured)</span><b>about 93 % humid</b></div>`;
      },
    };
  },
};
