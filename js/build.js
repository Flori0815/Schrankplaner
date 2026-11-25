// Geometrie: erzeugt aus dem Zustand eine Szene aus achsparallelen Bauteilen (mm).
// Weltkoordinaten: x entlang Hauptwand (0 = linke Wand), y von Hauptwand in den Raum, z Höhe.
import { INTERIOR, DOOR_STYLES } from './catalog.js';

export const RUN_KEYS = ['left', 'back', 'right'];
export const RUN_NAMES = { left: 'Flanke links', back: 'Hauptwand', right: 'Flanke rechts' };

export function derive(s) {
  const P = s.pax, M = s.mat, c = s.concept;
  const Htot = P.corpusH[c];
  const doorH = P.doorH[c];
  const doorTop = Htot - P.doorTopReveal;
  const doorBot = doorTop - doorH;
  const plinth = Math.max(0, doorBot - P.doorBottomGap);   // Höhe Sockelrahmen
  const avail = s.room.height - s.room.ceilingGap;
  const Ht = avail - Htot;
  const topMode = Ht >= s.topBoxMin ? 'box' : Ht > 2 ? 'crown' : 'none';
  const t = M.t;
  const intZ0 = plinth + t;
  const intH = Htot - t - intZ0;
  const backInner = M.grooveInset + M.backT;
  return { Htot, doorH, doorTop, doorBot, plinth, avail, Ht, topMode, t, intZ0, intH, backInner, sizeKey: c };
}

export function rearRow(s, D) {
  const h = s.pax.hole;
  if (h.rear > 0) return h.rear;
  const bi = s.mat.grooveInset + s.mat.backT;
  return h.front + h.pitch * Math.max(1, Math.floor((D - bi - 2 * h.front) / h.pitch));
}

export function holeZs(s, d) {      // Lochpositionen relativ Innenboden-Oberkante
  const h = s.pax.hole, out = [];
  for (let z = h.start; z <= d.intH - h.endMargin; z += h.pitch) out.push(z);
  return out;
}

export function bedDims(s) {
  const b = s.bed, t = s.mat.t;
  const fiW = b.matW + 2 * b.clear, fiL = b.matL + 2 * b.clear;
  const foW = fiW + 2 * b.frameT, foL = fiL + 2 * b.frameT;
  const innerW = foW + 2 * b.mechClear;
  return { fiW, fiL, foW, foL, innerW, outerW: innerW + 2 * t };
}

export function sectionWidth(s, sec) {
  const t = s.mat.t;
  switch (sec.type) {
    case 'pax': return s.pax.innerW[sec.size] + 2 * t;
    case 'custom': return sec.innerW + 2 * t;
    case 'filler': return sec.w;
    case 'bed': return bedDims(s).outerW;
  }
  return 0;
}

export function sectionLabel(s, sec) {
  switch (sec.type) {
    case 'pax': return `PAX ${sec.size}`;
    case 'custom': return `Sonder ${sec.innerW + 2 * s.mat.t}`;
    case 'filler': return `Passblende ${sec.w}`;
    case 'bed': return `Klappbett ${s.bed.matW / 10}×${s.bed.matL / 10}`;
  }
  return '?';
}

function runFrame(s, key) {
  const W = s.room.back;
  if (key === 'back') return { key, P0: [0, 0], eu: [1, 0], n: [0, 1] };
  if (key === 'left') return { key, P0: [0, s.room.left], eu: [0, -1], n: [1, 0] };
  return { key, P0: [W, 0], eu: [0, 1], n: [-1, 0] };
}
const toW = (fr, u, d) => [fr.P0[0] + fr.eu[0] * u + fr.n[0] * d, fr.P0[1] + fr.eu[1] * u + fr.n[1] * d];

// Eck-Ausdehnung entlang Hauptwand / Flanke
export function cornerExt(s, side) {
  const C = s.corners, type = C[side];
  const Db = s.runs.back.depth, Df = s.runs[side].depth;
  switch (type) {
    case 'L': return { back: Df + C.open, flank: Db + C.open };
    case 'blindBack': return { back: Df + C.filler + C.blindOpen, flank: Db + C.filler };
    case 'blindFlank': return { back: Df + C.filler, flank: Db + C.filler + C.blindOpen };
    default: return { back: 0, flank: Db + C.filler };
  }
}

export function runRange(s, key) {
  const W = s.room.back;
  if (key === 'back') return [cornerExt(s, 'left').back, W - cornerExt(s, 'right').back];
  if (key === 'left') return [0, s.room.left - cornerExt(s, 'left').flank];
  return [cornerExt(s, 'right').flank, s.room.right];
}

// u-Koordinate "Abstand von der Ecke" für einen Lauf
function cornerU(s, runKey, side, dist) {
  if (runKey === 'back') return side === 'left' ? dist : s.room.back - dist;
  if (runKey === 'left') return s.room.left - dist;
  return dist;
}

// ---------- Inneneinrichtungs-Vorlagen ----------
export const PRESETS = {
  shirts: 'Hemden/Jacken (2 Stangen)',
  long: 'Lange Kleidung',
  drawers: 'Schubladen + Stange',
  shelves: 'Regalböden',
  shoes: 'Schuhe + Böden',
  empty: 'Leer',
};
export function presetItems(s, sec, preset) {
  const d = derive(s), h = s.pax.hole;
  const own = sec.type !== 'pax';
  const N = z => Math.max(0, Math.round((z - h.start) / h.pitch));
  const top = d.intH;
  const shelf = own ? 'ownShelf' : 'shelf', rod = own ? 'ownRod' : 'rod';
  const it = (type, z) => ({ type, n: N(z), side: 'full' });
  switch (preset) {
    case 'shirts': return [it(shelf, top - 330), it(rod, top - 400), it(rod, top - 400 - 1050)];
    case 'long': return [it(shelf, top - 330), it(rod, top - 400), it(shelf, 60)];
    case 'drawers': return [it(own ? shelf : 'drawer', 32), it(own ? shelf : 'drawer', 224), it(own ? shelf : 'drawer', 416), it(shelf, 640), it(shelf, top - 330), it(rod, top - 400)];
    case 'shelves': { const out = []; const n = Math.max(2, Math.round(top / 350)); for (let i = 1; i < n; i++) out.push(it(shelf, i * top / n)); return out; }
    case 'shoes': return own ? [it(shelf, 200), it(shelf, 400), it(shelf, 700), it(shelf, 1100), it(shelf, 1500), it(shelf, top - 330)]
      : [it('shoePull', 32), it('shoePull', 256), it('pullout', 512), it('shelf', 800), it('shelf', 1150), it('shelf', 1500), it('shelf', top - 330)];
  }
  return [];
}

export function normalize(s) {
  for (const k of RUN_KEYS) for (const sec of s.runs[k].sections) {
    if (sec.type === 'pax' || sec.type === 'custom') {
      if (!sec.items) sec.items = presetItems(s, sec, sec.preset || 'empty');
      const d = derive(s), maxN = holeZs(s, d).length - 1;
      sec.items.forEach(i => {
        if (!i.id) i.id = Math.random().toString(36).slice(2, 9);
        if (!i.side) i.side = 'full';
        const hgt = (INTERIOR[i.type] || { h: 0 }).h;
        while (i.n > 0 && s.pax.hole.start + i.n * s.pax.hole.pitch + hgt > d.intH) i.n--;
        i.n = Math.max(0, Math.min(maxN, i.n));
      });
      delete sec.preset;
    }
  }
}

// ---------- Szene ----------
export function buildScene(s) {
  const d = derive(s), M = s.mat, P = s.pax, t = M.t;
  const style = DOOR_STYLES[s.doorStyle] || DOOR_STYLES.forsand_w;
  const sc = { d, boxes: [], doors: [], beds: [], elements: [], blocked: [], warnings: [], buy: [], drill: [], dims: {} };
  const W = s.room.back;
  const warn = (m, id) => sc.warnings.push({ m, id });

  const add = (min, max, o) => sc.boxes.push({ min, max, ...o });
  const boxR = (fr, u0, u1, z0, z1, d0, d1, o) => {
    const a = toW(fr, u0, d0), b = toW(fr, u1, d1);
    add([Math.min(a[0], b[0]), Math.min(a[1], b[1]), z0], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), z1], { views: [fr.key], ...o });
  };
  const cut = (name, T) => ({ name, t: T });

  // Tür hinzufügen (lokal im Lauf)
  function door(fr, elemId, du0, du1, z0, h, D, hinge, info) {
    const uh = hinge === 'L' ? du0 : du1;
    const w = du1 - du0;
    const s_ = hinge === 'L' ? fr.eu : [-fr.eu[0], -fr.eu[1]];
    const a = toW(fr, du0, D), b = toW(fr, du1, D + M.doorT);
    sc.doors.push({
      elemId, view: fr.key, hinge: toW(fr, uh, D), s: s_, n: fr.n, w, h, z0, t: M.doorT,
      min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), z0], max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), z0 + h],
      ...info,
    });
  }
  function hingeZs(doorTopAbs, h) {
    const n = h > 2000 ? 4 : h > 1200 ? 3 : 2, e = P.hingeEdge;
    const out = [];
    for (let i = 0; i < n; i++) out.push(doorTopAbs - e - i * (h - 2 * e) / (n - 1));
    return out;
  }

  // Sockelrahmen unter einem Korpus
  function frameUnder(fr, u0, Wd, D, elemId, views) {
    if (d.plinth <= 0) return;
    const ft = t, inset = M.frameInset, o = { mat: 'frame', elemId, views };
    boxR(fr, u0, u0 + Wd, 0, d.plinth, D - inset - ft, D - inset, { ...o, cut: cut('Sockelrahmen Front', ft) });
    boxR(fr, u0, u0 + Wd, 0, d.plinth, 0, ft, { ...o, cut: cut('Sockelrahmen hinten', ft) });
    const inner = D - inset - 2 * ft;
    const nCross = Math.max(2, Math.ceil(Wd / M.frameCross) + 1);
    for (let i = 0; i < nCross; i++) {
      const uc = u0 + i * (Wd - ft) / (nCross - 1);
      boxR(fr, uc, uc + ft, 0, d.plinth, ft, ft + inner, { ...o, cut: cut('Sockelrahmen Querriegel', ft) });
    }
  }

  // Korpuskasten (Seiten, Boden, Deckel zwischen den Seiten, Rückwand in Nut)
  function carcass(fr, u0, Wd, D, z0, H, elemId, label, opts = {}) {
    const o = { mat: 'mpx', elemId };
    const g = M.grooveDepth, gi = M.grooveInset, bt = M.backT;
    boxR(fr, u0, u0 + t, z0, z0 + H, 0, D, { ...o, cut: cut(`${label}: Seite`, t), part: 'sideL' });
    boxR(fr, u0 + Wd - t, u0 + Wd, z0, z0 + H, 0, D, { ...o, cut: cut(`${label}: Seite`, t), part: 'sideR' });
    boxR(fr, u0 + t, u0 + Wd - t, z0, z0 + t, 0, D, { ...o, cut: cut(`${label}: Boden`, t) });
    boxR(fr, u0 + t, u0 + Wd - t, z0 + H - t, z0 + H, 0, D, { ...o, cut: cut(`${label}: Deckel`, t) });
    boxR(fr, u0 + t - g + 1, u0 + Wd - t + g - 1, z0 + t - g + 1, z0 + H - t + g - 1, gi, gi + bt, { mat: 'back', elemId, cut: cut(`${label}: Rückwand (in Nut)`, bt) });
    for (const zf of (opts.fixed || [])) boxR(fr, u0 + t, u0 + Wd - t, zf, zf + t, gi + bt, D, { ...o, cut: cut(`${label}: Konstruktionsboden`, t) });
    return { u0: u0 + t, u1: u0 + Wd - t, z0: z0 + t, z1: z0 + H - t, d0: gi + bt, d1: D };
  }

  // Innenausstattung
  function interior(fr, sec, inner, D, elemId, widthKey) {
    const h = P.hole, depthKey = D >= 500 ? 58 : 35;
    const spans = { full: [], left: [], right: [] };
    const hasDiv = sec.items.some(i => i.type === 'divider');
    for (const it of sec.items) {
      const cat = INTERIOR[it.type]; if (!cat) continue;
      const z = inner.z0 + h.start + it.n * h.pitch;
      let u0 = inner.u0, u1 = inner.u1;
      const mid = (u0 + u1) / 2;
      if (it.side === 'left' && hasDiv) u1 = mid - 9; if (it.side === 'right' && hasDiv) u0 = mid + 9;
      const o = { mat: 'item', color: cat.color, elemId, itemId: it.id, kind: it.type };
      const dIn = inner.d0 + 4, dOut = D - 12;
      if (it.type === 'divider') boxR(fr, mid - 9, mid + 9, z, z + cat.h, dIn, dOut, o);
      else if (it.type === 'hookRail' || it.type === 'mirror') boxR(fr, u0 + 2, u0 + 30, z, z + cat.h, dIn + 20, dOut - 20, o);
      else if (it.type === 'rod' || it.type === 'ownRod') boxR(fr, u0, u1, z + 8, z + 33, (dIn + dOut) / 2 - 12, (dIn + dOut) / 2 + 12, o);
      else if (it.type.startsWith('drawer')) { boxR(fr, u0 + 4, u1 - 4, z, z + cat.h - 6, dIn + 30, dOut - 18, o); boxR(fr, u0 + 2, u1 - 2, z, z + cat.h - 4, dOut - 18, dOut, { ...o, kind: 'front' }); }
      else if (it.type === 'ownShelf' || it.type === 'fixShelf') boxR(fr, u0 + 1, u1 - 1, z, z + t, inner.d0 + 2, D - 10, { ...o, mat: 'mpx', color: null, cut: cut(`${elemLabel(sec)}: ${cat.short}`, t) });
      else boxR(fr, u0 + 2, u1 - 2, z, z + cat.h, dIn, dOut, o);
      if (z + cat.h > inner.z1) warn(`${elemLabel(sec)}: ${cat.short} ragt über den Deckel`, elemId);
      const side = (it.type === 'divider' || it.type === 'hookRail' || it.type === 'mirror') ? null : (hasDiv ? it.side : 'full');
      if (side) spans[side].push([z, z + cat.h, cat.short]);
      // Einkauf
      if (!cat.own) {
        let art = cat.art[depthKey];
        if (art && typeof art === 'object') art = art[(it.side !== 'full' && hasDiv) ? 50 : widthKey];
        if (cat.onlyWidth && widthKey !== cat.onlyWidth) warn(`${cat.short} passt nur in 100er Korpus`, elemId);
        if (!art) warn(`${cat.short}: kein Artikel für ${widthKey}×${depthKey} – ggf. Eigenbau`, elemId);
        sc.buy.push({ group: 'KOMPLEMENT Inneneinrichtung', name: `${cat.name} ${cat.anyWidth ? '' : ((it.side !== 'full' && hasDiv) ? 50 : widthKey) + '×'}${depthKey} cm`, art: art || '–', qty: 1 });
      } else if (it.type === 'ownShelf') sc.buy.push({ group: 'Beschläge', name: 'Bodenträger Ø5 mm', art: '', qty: 4 });
      else if (it.type === 'ownRod') { sc.buy.push({ group: 'Beschläge', name: 'Kleiderstangenhalter (Paar) + Rohr Ø25', art: '', qty: 1 }); }
    }
    for (const k in spans) {
      const a = spans[k].sort((p, q) => p[0] - q[0]);
      for (let i = 1; i < a.length; i++) if (a[i][0] < a[i - 1][1] - 0.5) warn(`${elemLabel(sec)}: ${a[i - 1][2]} und ${a[i][2]} überschneiden sich`, elemId);
    }
  }

  const labels = {};
  const elemLabel = sec => labels[sec.id] || sec.id;

  // Bohrbild einer Seite registrieren
  function drillSide(elemId, label, side, D, zBase, H, hinges, holes) {
    sc.drill.push({ elemId, label, side, D, zBase, H, hinges, holes, groove: M.grooveInset, rear: rearRow(s, D) });
  }

  // Oberer Abschluss: Aufsatzkorpus oder Zierleiste
  function topPart(fr, u0, Wd, D, zTop, elemId, label, doorsLayout, view) {
    const Ht = d.avail - zTop;
    if (Ht <= 2) return;
    if (Ht >= s.topBoxMin) {
      carcass(fr, u0, Wd, D, zTop, Ht, elemId, `${label} Aufsatz`);
      if (doorsLayout) {
        const z0 = zTop - P.doorTopReveal + M.edgeGap, h = d.avail - P.doorTopReveal - z0;
        for (const dl of doorsLayout) {
          door(fr, elemId, dl.u0, dl.u1, z0, h, D, dl.hinge, { kind: 'top', color: style.color, label: `Aufsatzfront ${Math.round(dl.u1 - dl.u0)}×${Math.round(h)}` });
          sc.buy.push({ group: 'Fronten', name: s.topFront === 'cut' ? `PAX-Tür ${dl.nominal}×229 auf ${Math.round(h)} mm kürzen (${style.name})` : `Aufsatzfront Multiplex ${Math.round(dl.u1 - dl.u0)}×${Math.round(h)}`, art: s.topFront === 'cut' ? (style.art[`${dl.nominal}x229`] || '–') : '', qty: 1 });
          sc.buy.push({ group: 'Scharniere', name: 'KOMPLEMENT Scharnier einzeln (Aufsatz)', art: 'hinge-single', qty: 2, hinge: true });
        }
        const sides = { L: [], R: [] };
        for (const dl of doorsLayout) sides[dl.hinge].push(...hingeZs(z0 + h, h));
        drillSide(elemId, `${label} Aufsatz`, 'L', D, zTop, Ht, sides.L, false);
        drillSide(elemId, `${label} Aufsatz`, 'R', D, zTop, Ht, sides.R, false);
      }
    } else {
      const a = toW(fr, u0, D), b = toW(fr, u0 + Wd, D + M.crownT);
      add([Math.min(a[0], b[0]), Math.min(a[1], b[1]), zTop], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), d.avail], { views: [view || fr.key], mat: 'crown', elemId, cut: cut('Zierleiste (je Wand durchgehend fertigen)', M.crownT) });
    }
  }

  // ---------- Läufe ----------
  const frames = {};
  for (const key of RUN_KEYS) {
    const fr = frames[key] = runFrame(s, key);
    const run = s.runs[key], D = run.depth;
    const [ua, ub] = runRange(s, key);
    const len = ub - ua;
    const widths = run.sections.map(sec => sectionWidth(s, sec));
    const total = widths.reduce((a, b) => a + b, 0);
    const free = len - total;
    sc.dims[key] = { ua, ub, len, total, free };
    if (free < -0.5) warn(`${RUN_NAMES[key]}: ${Math.round(-free)} mm zu lang (verfügbar ${Math.round(len)} mm)`);
    let startFill = 0, endFill = 0;
    if (free > 0) {
      if (run.align === 'start') endFill = free; else if (run.align === 'end') startFill = free; else { startFill = free / 2; endFill = free / 2; }
    }
    if (free > 250 && run.autoFiller) warn(`${RUN_NAMES[key]}: Rest ${Math.round(free)} mm – Korpus ergänzen?`);
    const fillers = [];
    let u = ua;
    if (startFill > 0.5) { fillers.push([u, u + startFill]); u += startFill; }
    run.sections.forEach((sec, i) => {
      const Wd = widths[i], u0 = u; u += Wd;
      const id = sec.id;
      const label = labels[id] = `${key === 'back' ? 'H' : key === 'left' ? 'L' : 'R'}${i + 1} ${sectionLabel(s, sec)}`;
      const el = { id, kind: sec.type, label, view: key, u0, u1: u0 + Wd, sec, run: key, D };
      sc.elements.push(el);
      if (sec.type === 'filler') { fillers.push([u0, u0 + Wd, id]); return; }
      if (sec.type === 'bed') { buildBed(fr, sec, u0, Wd, D, el); return; }
      // Korpus
      frameUnder(fr, u0, Wd, D, id, [key]);
      const H = d.Htot - d.plinth;
      const inner = carcass(fr, u0, Wd, D, d.plinth, H, id, label);
      el.inner = inner;
      interior(fr, sec, inner, D, id, sec.type === 'pax' ? sec.size : null);
      // Türen
      let layout = [];
      if (sec.doors) {
        let ws;
        if (sec.type === 'pax') ws = sec.size === 50 ? [50] : sec.size === 75 ? (sec.hinge === 'R' ? [25, 50] : [50, 25]) : [50, 50];
        else ws = sec.nDoors === 2 ? ['c', 'c'] : ['c'];
        const n = ws.length;
        const real = ws.map(w => w === 'c' ? (Wd - (n + 1) * M.edgeGap) / n : P.doorW[w]);
        const gap = (Wd - real.reduce((a, b) => a + b, 0)) / (n + 1);
        let x = u0 + gap;
        real.forEach((w, j) => {
          const hinge = n === 1 ? (sec.hinge || 'L') : (j === 0 ? 'L' : 'R');
          layout.push({ u0: x, u1: x + w, hinge, nominal: ws[j] === 'c' ? 50 : ws[j] });
          x += w + gap;
        });
        if (gap < 1) warn(`${label}: Türen zu breit für Korpus (Fuge ${gap.toFixed(1)} mm)`, id);
        for (const dl of layout) {
          const custom = sec.type !== 'pax';
          door(fr, id, dl.u0, dl.u1, d.doorBot, d.doorH, D, dl.hinge, { kind: custom ? 'custom' : 'pax', color: style.color, label: custom ? `Sonderfront ${Math.round(dl.u1 - dl.u0)}` : `${style.name} ${dl.nominal}×${d.sizeKey}` });
          if (custom) sc.buy.push({ group: 'Fronten', name: `Sonderfront ${Math.round(dl.u1 - dl.u0)}×${d.doorH} (z. B. PAX-Tür 50×${d.sizeKey} besäumen oder Multiplex)`, art: '', qty: 1 });
          else sc.buy.push({ group: 'Fronten', name: `${style.name} Tür ${dl.nominal}×${d.sizeKey} cm`, art: style.art[`${dl.nominal}x${d.sizeKey}`] || 'nicht verfügbar', qty: 1 });
          sc.buy.push({ group: 'Scharniere', name: 'hinge', art: 'hinge-main', qty: 1, hinge: true, main: true });
        }
      }
      el.doorLayout = layout;
      const hs = { L: [], R: [] };
      for (const dl of layout) hs[dl.hinge].push(...hingeZs(d.doorTop, d.doorH));
      drillSide(id, label, 'L', D, d.plinth, H, hs.L, true);
      drillSide(id, label, 'R', D, d.plinth, H, hs.R, true);
      el.holes = true;
      topPart(fr, u0, Wd, D, d.Htot, id, label, sec.doors ? layout : null);
    });
    if (endFill > 0.5) fillers.push([u, u + endFill]);
    // Passblenden
    for (const f of fillers) {
      const [f0, f1, fid] = f;
      const id = fid || `fill_${key}_${Math.round(f0)}`;
      if (!fid) sc.elements.push({ id, kind: 'autofill', label: `Passblende ${Math.round(f1 - f0)}`, view: key, u0: f0, u1: f1, run: key, D });
      boxR(fr, f0 + 0.5, f1 - 0.5, 0, d.Htot - P.doorTopReveal, D, D + M.t, { mat: 'filler', elemId: id, cut: cut('Passblende', t) });
      if (f1 - f0 > 60) boxR(fr, f0 + 0.5, f1 - 0.5, 0, d.Htot, D - 80, D, { mat: 'frame', elemId: id, cut: cut('Passblende Unterkonstruktion', t) });
      topPart(fr, f0, f1 - f0, D, d.Htot, id, 'Passblende', null);
    }
  }

  // ---------- Klappbett ----------
  function buildBed(fr, sec, u0, Wd, D, el) {
    const b = s.bed, bd = bedDims(s), id = sec.id;
    const H = b.cabinetH - d.plinth;
    frameUnder(fr, u0, Wd, D, id, [fr.key]);
    const inner = carcass(fr, u0, Wd, D, d.plinth, H, id, 'Bettschrank');
    el.inner = inner;
    const uc = u0 + Wd / 2, hp = b.pivotH, dp = D - 6;
    const yr = b.frontT + b.airGap;          // UK Lattenrost
    const ytop = yr + b.rostH + b.matH;      // OK Matratze
    const parts = [];
    const P_ = (X0, X1, Y0, Y1, Z0, Z1, mat, cutName, T, extra = {}) => parts.push({ X0, X1, Y0, Y1, Z0, Z1, mat, cut: cutName ? cut(cutName, T) : null, ...extra });
    const hw = bd.foW / 2, ft = b.frameT;
    P_(-hw, hw, 0, b.frontT, 0, bd.foL, 'bedfront', 'Klappbett: Bodenplatte/Front', b.frontT);
    P_(-hw, -hw + ft, b.frontT, b.frontT + b.frameH, 0, bd.foL, 'mpx', 'Klappbett: Seitenzarge', ft);
    P_(hw - ft, hw, b.frontT, b.frontT + b.frameH, 0, bd.foL, 'mpx', 'Klappbett: Seitenzarge', ft);
    P_(-hw + ft, hw - ft, b.frontT, b.frontT + b.frameH, 0, ft, 'mpx', 'Klappbett: Kopfzarge', ft);
    P_(-hw + ft, hw - ft, b.frontT, b.frontT + b.frameH, bd.foL - ft, bd.foL, 'mpx', 'Klappbett: Fußzarge', ft);
    P_(-hw + ft, -hw + ft + 24, b.frontT, yr, ft, bd.foL - ft, 'frame', null);
    P_(hw - ft - 24, hw - ft, b.frontT, yr, ft, bd.foL - ft, 'frame', null);
    const iw = bd.fiW, x0 = -iw / 2;
    if (b.rost === '2x80') {
      P_(-20, 20, b.frontT, yr, ft, bd.foL - ft, 'frame', null);
      P_(x0 + 2, -2, yr, yr + b.rostH, ft + 2, bd.foL - ft - 2, 'rost', null);
      P_(2, -x0 - 2, yr, yr + b.rostH, ft + 2, bd.foL - ft - 2, 'rost', null);
    } else P_(x0 + 2, -x0 - 2, yr, yr + b.rostH, ft + 2, bd.foL - ft - 2, 'rost', null);
    P_(x0 + b.clear, -x0 - b.clear, yr + b.rostH, ytop, ft + b.clear, bd.foL - ft - b.clear, 'mattress', null);
    // Fuß (nur offen sichtbar)
    const legs = [[-hw + 40, -hw + 80], [hw - 80, hw - 40]];
    sc.beds.push({ id, run: fr.key, frame: fr, uc, hp, dp, parts, legs, foL: bd.foL, label: el.label });
    // Geschlossene Lage als Boxen (2D, Zuschnitt)
    for (const p of parts) {
      boxR(fr, uc + p.X0, uc + p.X1, hp + p.Z0, hp + p.Z1, dp - p.Y1, dp - p.Y0, { mat: p.mat, elemId: id, cut: p.cut, bedPart: true });
    }
    // Leisten für Lattenrost
    sc.buy.push({ group: 'Holz', name: `Auflageleiste 24×${Math.round(yr - b.frontT)} mm, Länge ${Math.round(bd.foL - 2 * ft)} mm`, art: '', qty: b.rost === '2x80' ? 3 : 2 });
    // Prüfungen
    const closedDepth = ytop + 6;
    const freeD = dp - inner.d0;
    if (closedDepth > freeD) warn(`Klappbett: eingeklappt ${Math.round(closedDepth)} mm tief, nur ${Math.round(freeD)} mm frei`, id);
    if (hp + bd.foL + 10 > inner.z1) warn(`Klappbett: Bett ${Math.round(hp + bd.foL)} mm hoch, Schrank innen nur bis ${Math.round(inner.z1)} mm`, id);
    if (hp < inner.z0 + 10) warn('Klappbett: Drehpunkt liegt unter dem Schrankboden', id);
    // Gewicht
    const vol = parts.filter(p => p.cut).reduce((a, p) => a + (p.X1 - p.X0) * (p.Y1 - p.Y0) * (p.Z1 - p.Z0), 0) / 1e9;
    const nR = b.rost === '2x80' ? 2 : 1;
    const kg = vol * M.density + b.matKg + nR * b.rostKg;
    el.bed = { kg, lieH: hp + ytop, closedDepth, openReach: dp + bd.foL, height: hp + bd.foL, foW: bd.foW, foL: bd.foL };
    sc.buy.push({ group: 'Klappbett', name: `Klappbett-Beschlag vertikal (Gasdruckfedern), Bettgewicht ca. ${Math.round(kg)} kg, Breite ${b.matW / 10} cm`, art: '', qty: 1 });
    sc.buy.push({ group: 'Klappbett', name: b.rost === '2x80' ? `Lattenrost 80×${b.matL / 10} (H ≤ ${b.rostH} mm)` : `Lattenrost ${b.matW / 10}×${b.matL / 10} (H ≤ ${b.rostH} mm)`, art: '', qty: nR });
    sc.buy.push({ group: 'Klappbett', name: `Matratze ${b.matW / 10}×${b.matL / 10}, max. ${b.matH / 10} cm hoch`, art: '', qty: 1 });
    sc.buy.push({ group: 'Klappbett', name: 'Klappfuß für Schrankbett (Paar)', art: '', qty: 1 });
    sc.buy.push({ group: 'Klappbett', name: 'Matratzenhaltegurte (Paar)', art: '', qty: 1 });
    topPart(fr, u0, Wd, D, b.cabinetH, id, 'Bettschrank', null);
  }

  // ---------- Ecken ----------
  for (const side of ['left', 'right']) {
    const type = s.corners[side];
    const C = s.corners, Db = s.runs.back.depth, Df = s.runs[side].depth;
    const fk = side;            // Flanken-Lauf
    const ext = cornerExt(s, side);
    const id = `corner_${side}`;
    const nm = side === 'left' ? 'Ecke links' : 'Ecke rechts';
    if (type === 'L') {
      const a = ext.back, b = ext.flank;
      const X = p => side === 'left' ? p : W - p;
      const addPQ = (p0, p1, q0, q1, z0, z1, views, o) => add([Math.min(X(p0), X(p1)), q0, z0], [Math.max(X(p0), X(p1)), q1, z1], { views, elemId: id, ...o });
      const H = d.Htot - d.plinth, z0 = d.plinth, z1 = d.Htot;
      const g = M.grooveDepth, gi = M.grooveInset, bt = M.backT;
      const mpx = n => ({ mat: 'mpx', cut: cut(`${nm}: ${n}`, t) });
      // Sockelrahmen
      const fi = M.frameInset;
      addPQ(Df - fi, a, Db - fi - t, Db - fi, 0, d.plinth, ['back'], { mat: 'frame', cut: cut(`${nm}: Sockelrahmen Front`, t) });
      addPQ(Df - fi - t, Df - fi, Db - fi, b, 0, d.plinth, [fk], { mat: 'frame', cut: cut(`${nm}: Sockelrahmen Front`, t) });
      addPQ(0, a, 0, t, 0, d.plinth, ['back'], { mat: 'frame', cut: cut(`${nm}: Sockelrahmen hinten`, t) });
      addPQ(0, t, t, b, 0, d.plinth, [fk], { mat: 'frame', cut: cut(`${nm}: Sockelrahmen hinten`, t) });
      addPQ(a - t, a, t, Db - fi - t, 0, d.plinth, ['back'], { mat: 'frame', cut: cut(`${nm}: Sockelrahmen Querriegel`, t) });
      addPQ(t, Df - fi - t, b - t, b, 0, d.plinth, [fk], { mat: 'frame', cut: cut(`${nm}: Sockelrahmen Querriegel`, t) });
      // Korpus
      addPQ(a - t, a, 0, Db, z0, z1, ['back'], { ...mpx('Seite'), part: 'cornerSideB' });
      addPQ(0, Df, b - t, b, z0, z1, [fk], { ...mpx('Seite'), part: 'cornerSideF' });
      for (const [zz, n] of [[z0, 'Boden'], [z1 - t, 'Deckel']]) {
        addPQ(0, a - t, 0, Db, zz, zz + t, ['back', fk], mpx(`${n} Teil A`));
        addPQ(0, Df, Db, b - t, zz, zz + t, [fk], mpx(`${n} Teil B`));
      }
      addPQ(gi, a - t + g - 1, gi, gi + bt, z0 + t - g + 1, z1 - t + g - 1, ['back'], { mat: 'back', cut: cut(`${nm}: Rückwand A (in Nut)`, bt) });
      addPQ(gi, gi + bt, gi + bt, b - t + g - 1, z0 + t - g + 1, z1 - t + g - 1, [fk], { mat: 'back', cut: cut(`${nm}: Rückwand B (in Nut)`, bt) });
      const bi = gi + bt;
      for (let i = 1; i <= C.shelves; i++) {
        const zz = z0 + t + i * (H - 2 * t) / (C.shelves + 1);
        addPQ(bi, a - t, bi, Db - 10, zz, zz + t, ['back', fk], mpx('Eckboden A'));
        addPQ(bi, Df - 10, Db - 10, b - t, zz, zz + t, [fk], mpx('Eckboden B'));
        sc.buy.push({ group: 'Beschläge', name: 'Bodenträger Ø5 mm', art: '', qty: 6 });
      }
      // Türen
      const dw = P.doorW[50], e = (C.open - dw) / 2;
      const mk = (hingeP, sDir, nDir, view, minP, maxP) => {
        sc.doors.push({ elemId: id, view, hinge: hingeP, s: sDir, n: nDir, w: dw, h: d.doorH, z0: d.doorBot, t: M.doorT, kind: 'pax', color: style.color, label: `${style.name} 50×${d.sizeKey}`, min: minP, max: maxP });
        sc.buy.push({ group: 'Fronten', name: `${style.name} Tür 50×${d.sizeKey} cm`, art: style.art[`50x${d.sizeKey}`] || '–', qty: 1 });
        sc.buy.push({ group: 'Scharniere', name: 'hinge', art: 'hinge-main', qty: 1, hinge: true, main: true });
      };
      const sgn = side === 'left' ? 1 : -1;
      const pa = a - e, pb = b - e;
      mk([X(pa), Db], [-sgn, 0], [0, 1], 'back', [Math.min(X(pa), X(pa - dw)), Db, d.doorBot], [Math.max(X(pa), X(pa - dw)), Db + M.doorT, d.doorBot + d.doorH]);
      mk([X(Df), pb], [0, -1], [sgn, 0], fk, [Math.min(X(Df), X(Df + M.doorT)), pb - dw, d.doorBot], [Math.max(X(Df), X(Df + M.doorT)), pb, d.doorBot + d.doorH]);
      sc.elements.push({ id, kind: 'cornerL', label: `${nm} (L-Eck)`, view: 'back', u0: side === 'left' ? 0 : W - a, u1: side === 'left' ? a : W, run: 'back', D: Db });
      sc.elements.push({ id, kind: 'cornerL', label: `${nm} (L-Eck)`, view: fk, u0: cornerU(s, fk, side, b), u1: cornerU(s, fk, side, 0), run: fk, D: Df, alias: true });
      sc.elements.forEach(el => { if (el.id === id && el.u0 > el.u1) [el.u0, el.u1] = [el.u1, el.u0]; });
      sc.blocked.push({ view: 'back', u0: Math.min(cornerU(s, 'back', side, 0), cornerU(s, 'back', side, Df)), u1: Math.max(cornerU(s, 'back', side, 0), cornerU(s, 'back', side, Df)), label: 'Eckbereich' });
      sc.blocked.push({ view: fk, u0: Math.min(cornerU(s, fk, side, 0), cornerU(s, fk, side, Db)), u1: Math.max(cornerU(s, fk, side, 0), cornerU(s, fk, side, Db)), label: 'Eckbereich' });
      const hz = hingeZs(d.doorTop, d.doorH);
      drillSide(id, `${nm} Seite Hauptwand`, side === 'left' ? 'R' : 'L', Db, d.plinth, H, hz, false);
      drillSide(id, `${nm} Seite Flanke`, side === 'left' ? 'L' : 'R', Df, d.plinth, H, hz, false);
      // Oberer Abschluss
      if (d.topMode === 'crown') {
        addPQ(Df, a, Db, Db + M.crownT, d.Htot, d.avail, ['back'], { mat: 'crown', cut: cut('Zierleiste (je Wand durchgehend fertigen)', M.crownT) });
        addPQ(Df, Df + M.crownT, Db + M.crownT, b, d.Htot, d.avail, [fk], { mat: 'crown', cut: cut('Zierleiste (je Wand durchgehend fertigen)', M.crownT) });
      } else if (d.topMode === 'box') {
        const Ht = d.Ht;
        addPQ(a - t, a, 0, Db, d.Htot, d.avail, ['back'], mpx('Aufsatz Seite'));
        addPQ(0, Df, b - t, b, d.Htot, d.avail, [fk], mpx('Aufsatz Seite'));
        for (const zz of [d.Htot, d.avail - t]) { addPQ(0, a - t, 0, Db, zz, zz + t, ['back', fk], mpx('Aufsatz Boden/Deckel A')); addPQ(0, Df, Db, b - t, zz, zz + t, [fk], mpx('Aufsatz Boden/Deckel B')); }
        const tz0 = d.Htot - P.doorTopReveal + M.edgeGap, th = d.avail - P.doorTopReveal - tz0;
        sc.doors.push({ elemId: id, view: 'back', hinge: [X(pa), Db], s: [-sgn, 0], n: [0, 1], w: dw, h: th, z0: tz0, t: M.doorT, kind: 'top', color: style.color, label: 'Aufsatzfront', min: [Math.min(X(pa), X(pa - dw)), Db, tz0], max: [Math.max(X(pa), X(pa - dw)), Db + M.doorT, tz0 + th] });
        sc.doors.push({ elemId: id, view: fk, hinge: [X(Df), pb], s: [0, -1], n: [sgn, 0], w: dw, h: th, z0: tz0, t: M.doorT, kind: 'top', color: style.color, label: 'Aufsatzfront', min: [Math.min(X(Df), X(Df + M.doorT)), pb - dw, tz0], max: [Math.max(X(Df), X(Df + M.doorT)), pb, tz0 + th] });
        for (let k = 0; k < 2; k++) {
          sc.buy.push({ group: 'Fronten', name: `Aufsatzfront 495×${Math.round(th)} (${s.topFront === 'cut' ? 'PAX-Tür 50×229 kürzen' : 'Multiplex'})`, art: s.topFront === 'cut' ? (style.art['50x229'] || '') : '', qty: 1 });
          sc.buy.push({ group: 'Scharniere', name: 'KOMPLEMENT Scharnier einzeln (Aufsatz)', art: 'hinge-single', qty: 2, hinge: true });
        }
      }
    } else {
      // Blindecke / Stoß
      const passRun = type === 'blindFlank' ? fk : 'back';
      const otherRun = passRun === 'back' ? fk : 'back';
      const Dpass = s.runs[passRun].depth, Dother = s.runs[otherRun].depth;
      const frP = runFrame(s, passRun), frO = runFrame(s, otherRun);
      // Passleiste am anderen Lauf
      {
        const ua = cornerU(s, otherRun, side, Dpass + M.doorT), ub = cornerU(s, otherRun, side, Dpass + C.filler);
        boxR(frO, Math.min(ua, ub), Math.max(ua, ub), 0, d.Htot - P.doorTopReveal, Dother, Dother + t, { mat: 'filler', elemId: id, cut: cut('Eck-Passleiste', t) });
        if (d.topMode === 'crown') boxR(frO, Math.min(ua, ub), Math.max(ua, ub), d.Htot, d.avail, Dother, Dother + M.crownT, { mat: 'crown', elemId: id, cut: cut('Zierleiste (je Wand durchgehend fertigen)', M.crownT) });
      }
      const blk0 = cornerU(s, passRun, side, 0), blk1 = cornerU(s, passRun, side, Dother + C.filler);
      sc.blocked.push({ view: passRun, u0: Math.min(blk0, blk1), u1: Math.max(blk0, blk1), label: 'verdeckt' });
      { const o0 = cornerU(s, otherRun, side, 0), o1 = cornerU(s, otherRun, side, Dpass); sc.blocked.push({ view: otherRun, u0: Math.min(o0, o1), u1: Math.max(o0, o1), label: 'Eckbereich' }); }
      if (type === 'none') { sc.elements.push({ id, kind: 'cornerNone', label: `${nm} (Stoß)`, view: otherRun, u0: Math.min(cornerU(s, otherRun, side, 0), cornerU(s, otherRun, side, Dpass + C.filler)), u1: Math.max(cornerU(s, otherRun, side, 0), cornerU(s, otherRun, side, Dpass + C.filler)), run: otherRun, D: Dother }); continue; }
      const Wb = Dother + C.filler + C.blindOpen;
      const c0 = cornerU(s, passRun, side, 0), c1 = cornerU(s, passRun, side, Wb);
      const u0 = Math.min(c0, c1);
      const outerIsU1 = c1 > c0;    // äußeres Ende (weg von Ecke)
      frameUnder(frP, u0, Wb, Dpass, id, [passRun]);
      const H = d.Htot - d.plinth;
      const inner = carcass(frP, u0, Wb, Dpass, d.plinth, H, id, `${nm} Blindeck`);
      const HH = inner.z1 - inner.z0;
      for (let i = 1; i <= C.shelves; i++) {
        const zz = inner.z0 + i * HH / (C.shelves + 1);
        boxR(frP, inner.u0 + 1, inner.u1 - 1, zz, zz + t, inner.d0 + 2, Dpass - 10, { mat: 'mpx', elemId: id, cut: cut(`${nm}: Einlegeboden`, t) });
        sc.buy.push({ group: 'Beschläge', name: 'Bodenträger Ø5 mm', art: '', qty: 4 });
      }
      const dw = P.doorW[50], e = (C.blindOpen - dw) / 2;
      const du0 = outerIsU1 ? u0 + Wb - e - dw : u0 + e, du1 = du0 + dw;
      const hinge = outerIsU1 ? 'R' : 'L';
      door(frP, id, du0, du1, d.doorBot, d.doorH, Dpass, hinge, { kind: 'pax', color: style.color, label: `${style.name} 50×${d.sizeKey}` });
      sc.buy.push({ group: 'Fronten', name: `${style.name} Tür 50×${d.sizeKey} cm`, art: style.art[`50x${d.sizeKey}`] || '–', qty: 1 });
      sc.buy.push({ group: 'Scharniere', name: 'hinge', art: 'hinge-main', qty: 1, hinge: true, main: true });
      const bl0 = outerIsU1 ? u0 + 1 : du1 + M.edgeGap, bl1 = outerIsU1 ? du0 - M.edgeGap : u0 + Wb - 1;
      boxR(frP, bl0, bl1, d.doorBot, d.doorTop, Dpass, Dpass + M.doorT, { mat: 'filler', elemId: id, cut: cut(`${nm}: Eckblende`, t) });
      const lbl = `${nm} (Blindeck)`;
      sc.elements.push({ id, kind: 'cornerBlind', label: lbl, view: passRun, u0, u1: u0 + Wb, run: passRun, D: Dpass, inner });
      const hz = hingeZs(d.doorTop, d.doorH);
      drillSide(id, lbl, 'L', Dpass, d.plinth, H, hinge === 'L' ? hz : [], true);
      drillSide(id, lbl, 'R', Dpass, d.plinth, H, hinge === 'R' ? hz : [], true);
      topPart(frP, u0, Wb, Dpass, d.Htot, id, lbl, [{ u0: du0, u1: du1, hinge, nominal: 50 }]);
      if (d.topMode === 'box') boxR(frP, bl0, bl1, d.Htot - P.doorTopReveal + M.edgeGap, d.avail - P.doorTopReveal, Dpass, Dpass + M.doorT, { mat: 'filler', elemId: id, cut: cut(`${nm}: Eckblende Aufsatz`, t) });
    }
  }

  // Bett: Freiraum vor ausgeklapptem Bett prüfen
  for (const bed of sc.beds) {
    const el = sc.elements.find(e => e.id === bed.id);
    if (bed.run === 'right' || bed.run === 'left') {
      const reachX = bed.run === 'right' ? W - el.bed.openReach : el.bed.openReach;
      const opp = bed.run === 'right' ? s.runs.left.depth + M.doorT : W - s.runs.right.depth - M.doorT;
      const oppLen = bed.run === 'right' ? s.room.left : s.room.right;
      if (el.u0 < oppLen) {
        const free = bed.run === 'right' ? reachX - opp : opp - reachX;
        el.bed.passage = free;
        if (free < 400) warn(`Klappbett: ausgeklappt nur ${Math.round(free)} mm Durchgang zur gegenüberliegenden Zeile`, bed.id);
      }
    }
  }
  if (d.topMode === 'box' && s.concept === '229') warn('Aufsatz über 236er-Korpus – Raumhöhe prüfen');
  return sc;
}
