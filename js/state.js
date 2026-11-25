// Zustand, Standardwerte, Persistenz
let idc = 1;
export const uid = (p = 's') => `${p}${Date.now().toString(36)}${(idc++).toString(36)}`;

export function defaultState() {
  return {
    version: 3,
    room: { height: 2450, ceilingGap: 10, left: 1200, back: 3400, right: 2400 },
    concept: '229',            // '229' = PAX 236 + Zierleiste, '195' = PAX 201 + Aufsatzkorpus
    topBoxMin: 150,            // ab dieser Resthöhe wird ein Aufsatzkorpus gebaut, sonst Blende
    topFront: 'cut',           // 'cut' = PAX-Tür 229 gekürzt, 'mpx' = Multiplex-Front
    doorStyle: 'forsand_w',
    doorProfile: 'auto',       // 'auto' = wie Original-Modell, sonst flat/frame/grooves/mirror
    mat: {
      t: 18,                   // Multiplex Korpus
      backT: 6,                // Rückwand (Multiplex/HDF) in Nut
      grooveDepth: 8,          // Nuttiefe
      grooveInset: 12,         // Abstand Hinterkante -> Nut
      doorT: 20,               // Türstärke (für Darstellung)
      frameInset: 25,          // Rücksprung Sockelrahmen vorne
      frameCross: 600,         // max. Abstand Querriegel Sockelrahmen
      crownT: 18,              // Zierleiste Stärke
      density: 680,            // kg/m³ Birke-Multiplex
      edgeGap: 3,              // Fuge Front/Front
    },
    pax: {
      innerW: { 50: 464, 75: 714, 100: 964 },
      doorW: { 50: 495, 25: 245 },
      doorH: { 195: 1951, 229: 2294 },
      corpusH: { 195: 2012, 229: 2364 },
      doorTopReveal: 2,        // Tür-OK unter Korpus-OK
      doorBottomGap: 3,        // Luft Tür-UK zu Sockel
      hole: { d: 5, pitch: 32, front: 37, rear: 0, start: 32, endMargin: 32, depth: 12 }, // rear 0 = automatisch
      hingeEdge: 100,          // Topfmitte ab Türkante (oben/unten)
      plateHalf: 16,           // Montageplatte: Schrauben ±16 mm um Topfmitte
    },
    corners: {
      left: 'L', right: 'blindBack',   // 'L' | 'blindBack' | 'blindFlank' | 'none'
      open: 525,               // Öffnung L-Eck (wie PAX Eckanbauelement 52,5)
      blindOpen: 500,          // Öffnung Blindeck-Korpus (Altwert)
      blindOpenL: 500, blindOpenR: 500,  // Öffnung Blindeck je Seite (500 = 1 PAX-Tür)
      filler: 50,              // Passleiste Ecke
      shelves: 4,              // Böden im Eckkorpus
    },
    runs: {
      left:  { depth: 580, align: 'end',   autoFiller: false, sections: [] },
      back:  { depth: 580, align: 'start', autoFiller: true, sections: [
        { id: uid(), type: 'pax', size: 100, doors: true, hinge: 'L', preset: 'shirts' },
        { id: uid(), type: 'custom', innerW: 384, doors: false, nDoors: 0, preset: 'shelves' },
      ] },
      right: { depth: 580, align: 'start', autoFiller: true, sections: [
        { id: uid(), type: 'bed' },
      ] },
    },
    bed: {
      matW: 1600, matL: 2000, matH: 200, clear: 10,
      rost: '2x80',            // '2x80' | '1x160'
      rostH: 55, airGap: 12,
      frameT: 18, frameH: 180, frontT: 15,
      mechClear: 25,           // seitlicher Platz für Beschlag
      pivotH: 250,             // Unterkante Bett (ausgeklappt) über Boden
      cabinetH: 2364,
      depthMode: 'min',
      cladding: 'pax',         // 'pax' = Bettfront aus PAX-Türen (50/25), 'none' = ohne
      widthGrid: 250,          // Bettschrankbreite auf dieses Raster aufrunden (0 = minimal)        // 'min' = Zeilentiefe auf Bett-Minimum, 'run' = frei
      matKg: 28, rostKg: 9,
    },
    view: { frontMode: 'doors', cutZ: 1000 },
  };
}

const KEY = 'schrankplaner.v2';
export function saveLocal(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
export function loadLocal() {
  try { const t = localStorage.getItem(KEY); if (t) return migrate(JSON.parse(t)); } catch (e) { /* ignore */ }
  return null;
}

export function migrate(s) {
  const d = defaultState();
  if (!s || (s.version !== 2 && s.version !== 3)) return d;
  if (s.version === 2) { s.version = 3; if (s.runs && s.runs.left) s.runs.left.autoFiller = false; }
  const merge = (a, b) => {
    for (const k of Object.keys(a)) {
      if (b[k] === undefined) b[k] = a[k];
      else if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object') merge(a[k], b[k]);
    }
    return b;
  };
  return merge(d, s);
}
