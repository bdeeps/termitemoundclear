// Chapter 1: inside the mound. A cutaway of a fungus-growing (Macrotermes-style) mound: the nest below
// ground with the queen and the fungus gardens, the central chimney, the conduits under the ridged
// surface, and the thin porous outer wall. The shape is our own drawing, not a scan of a real mound.
import { THREE, COL, makeMound, fmt, frame } from '../mound.js';

export default {
  id: 'inside',
  short: 'Inside the mound',
  title: 'A tower built on top of a home',
  subtitle: 'The mound is not where the termites live. It sits on top of their nest like a set of lungs.',
  view: { pos: [2.9, 2.1, 5.6], target: [0, 0.75, 0] },
  learn: `<p>In the savannas of Africa and South Asia, some termites build earth towers taller than a person. The best studied belong to <b>Macrotermes</b>, a genus of fungus-farming termites. In Namibia, <i>Macrotermes michaelseni</i> mounds stand about 1 to 3 metres high, some reach 5 metres or more, and the record books list mounds of about 8 metres.</p>
    <p>The colony mostly does not live in the tower. It lives in the <b>nest</b>, a round mass of chambers at or below ground level. There the <b>queen</b> lays eggs in a royal cell, and workers tend <b>fungus gardens</b>, spongy combs of chewed plant matter on which they grow a fungus called <i>Termitomyces</i>. A big colony holds one to two million termites, and the fungus takes up far more room in the nest than they do.</p>
    <p>Above the nest rises the mound itself: a wide <b>chimney</b> up the middle, and a web of narrower <b>conduits</b>, about 2 to 10 centimetres across, that run just under the surface, often inside ridges. The <b>outer wall</b> is thin and full of tiny pores. Gases can pass through it, but wind and rain cannot rush in.</p>
    <p class="tip"><b>Try it:</b> peel the mound open, then change its height. The nest stays the same size; the tower is the colony's breathing apparatus.</p>
    <p class="note">Drawn to show the parts, not to scale; the queen is enlarged so you can see her. Some species, such as <i>M. michaelseni</i>, build closed mounds with no big opening; others leave open vents at the top.</p>`,
  terms: [
    { t: 'Macrotermes', d: 'A genus of large fungus-growing termites from Africa and Asia that build big mounds.' },
    { t: 'Nest', d: 'The chambers where the colony lives, with the queen, the young and the fungus gardens.' },
    { t: 'Fungus garden', d: 'A spongy comb of chewed plant matter on which the termites grow Termitomyces fungus as food.' },
    { t: 'Chimney', d: 'The large central channel that rises from the nest into the mound.' },
    { t: 'Surface conduits', d: 'Narrow tunnels that run close to the porous outer wall.' },
  ],
  defaults: { peel: 0.75, H: 3 },
  controls: [
    { key: 'peel', type: 'range', label: 'Peel the mound open', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 140) + '°', ends: ['closed', 'cut away'] },
    { key: 'H', type: 'range', label: 'Mound height', min: 1.5, max: 8, step: 0.1, fmt: (v) => v.toFixed(1) + ' m', hint: 'Many are 1 to 3 m tall. Records reach about 8 m.' },
  ],
  quiz: [
    { q: 'Where do most of the termites in a Macrotermes colony live?', options: ['At the top of the tower', 'In the nest at or below ground', 'Outside the mound', 'Inside the outer wall'], answer: 1, why: 'The colony lives in the nest at the base. The tower above it is mostly for exchanging air.' },
    { q: 'What do these termites grow in their fungus gardens?', options: ['Bacteria', 'Grass seeds', 'A fungus called Termitomyces', 'Algae'], answer: 2, why: 'They farm Termitomyces on combs of chewed plant matter, and the fungus helps break down the plant food.' },
    { q: 'What is special about the outer wall?', options: ['It is thick and airtight', 'It is thin and porous, so gases pass through it', 'It is made of wood', 'It has big open windows'], answer: 1, why: 'Tiny pores let carbon dioxide out and oxygen in without letting wind blow straight through.' },
  ],
  reel: [
    { ms: 5200, caption: 'A termite mound can stand taller than a person. Peel it open.', set: { peel: 0, H: 3 }, anim: { peel: [0, 0.8] }, view: { pos: [3.4, 2.3, 6.6], target: [0, 0.6, 0] }, spin: 0.6 },
    { ms: 5200, caption: 'The colony lives below: a queen, workers, and gardens of fungus. The tower above is for air.', set: { peel: 0.85, H: 3 }, view: { pos: [2.0, 0.7, 4.4], target: [0, -0.35, 0] }, spin: 0.3 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stage.floor.position.y = -1.37; frame(stage, 0.14, 0);
    const mound = makeMound(stage, { H: s.H, peel: s.peel });
    stage.root.add(mound.group);
    const lbl = {
      chim: stage.label('Chimney', [0, 0, 0], mound.group),
      cond: stage.label('Conduits under the surface', [0, 0, 0], mound.group),
      wall: stage.label('Thin, porous wall', [0, 0, 0], mound.group),
      nest: stage.label('Nest', [0, 0, 0], mound.group, 'hot'),
      fung: stage.label('Fungus gardens', [0, 0, 0], mound.group),
      queen: stage.label('Queen in her royal cell', [0, 0, 0], mound.group),
      soil: stage.label('Ground level', [0, 0, 0], mound.group),
    };
    let t = 0, sig = '';
    const place = () => {
      const sh = mound.shape, H = sh.H, c = mound.cut, open = c > 0.2;
      lbl.chim.position.set(0, 0.62 * H, 0.12);
      const th = c / 2 + 0.25, y = 0.42 * H, r = sh.r(y, th);
      lbl.cond.position.set((r - 0.15) * Math.sin(th), y, (r - 0.15) * Math.cos(th));
      const tw = -1.2, yw = 0.3 * H, rw = sh.r(yw, tw);
      lbl.wall.position.set(rw * Math.sin(tw), yw, rw * Math.cos(tw));
      lbl.nest.position.set(-0.75, mound.NY + 0.35, 0.5);
      lbl.fung.position.set(0.55, mound.NY + 0.05, 0.6);
      lbl.queen.position.set(0.1, mound.NY - 0.38, 0.45);
      lbl.soil.position.set(2.1, 0.02, 1.2);
      [lbl.chim, lbl.cond, lbl.nest, lbl.fung, lbl.queen].forEach((o) => { o.element.style.opacity = open ? 1 : 0; });
    };
    return {
      update(dt, st) {
        t += dt;
        const k = `${st.peel.toFixed(3)}|${st.H.toFixed(2)}`;
        if (k !== sig) { sig = k; mound.set({ peel: st.peel, H: st.H }); place(); }
        mound.update(dt, t);
      },
      readout(st) {
        return `<div class="big">${fmt(st.H, 1)} m tall</div>
          <p class="r-say">A tower of soil on top of a nest. The nest is where the colony lives; the tower is how it breathes.</p>
          <div class="row"><span>M. michaelseni, Namibia</span><b>about 1–3 m</b></div>
          <div class="row"><span>Record mounds</span><b>about 8 m</b></div>
          <div class="row"><span>Termites in a big colony</span><b>1–2 million</b></div>
          <div class="row"><span>Conduits</span><b>about 2–10 cm wide</b></div>
          <div class="row"><span>Termites drawn here</span><b>260</b></div>`;
      },
    };
  },
};
