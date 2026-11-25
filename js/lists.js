import { HINGES, MISC } from './catalog.js';

const r = v => Math.round(v);

export function cutList(sc) {
  const map = new Map();
  for (const b of sc.boxes) {
    if (!b.cut) continue;
    const ext = [0, 1, 2].map(i => b.max[i] - b.min[i]);
    // Stärke = Ausdehnung, die der Plattenstärke am nächsten liegt
    let ti = 0, best = Infinity;
    ext.forEach((e, i) => { const dd = Math.abs(e - b.cut.t); if (dd < best) { best = dd; ti = i; } });
    const rest = ext.filter((_, i) => i !== ti).sort((a, c) => c - a);
    const key = `${b.cut.name}|${r(rest[0])}|${r(rest[1])}|${b.cut.t}`;
    const e = map.get(key);
    if (e) e.qty++; else map.set(key, { name: b.cut.name, L: r(rest[0]), W: r(rest[1]), t: b.cut.t, qty: 1 });
  }
  const rows = [...map.values()].sort((a, b) => b.t - a.t || a.name.localeCompare(b.name) || b.L - a.L);
  const area = {};
  for (const x of rows) area[x.t] = (area[x.t] || 0) + x.L * x.W * x.qty / 1e6;
  const sheets = {};
  for (const t in area) sheets[t] = Math.ceil(area[t] * 1.2 / (2.5 * 1.25));
  return { rows, area, sheets };
}

export function shopList(sc, s) {
  const map = new Map();
  let mainDoors = 0, single = 0;
  for (const b of sc.buy) {
    if (b.hinge) { if (b.main) mainDoors += b.qty; else single += b.qty; continue; }
    const key = `${b.group}|${b.name}|${b.art}`;
    const e = map.get(key);
    if (e) e.qty += b.qty; else map.set(key, { ...b });
  }
  const H = HINGES[s.concept];
  const rows = [...map.values()];
  if (mainDoors) rows.push({ group: 'Scharniere', name: H.name, art: H.art, qty: mainDoors, note: `1 Pack je Tür (${mainDoors * H.pack} Scharniere)` });
  if (single) {
    const packs = Math.ceil(single / 3);
    rows.push({ group: 'Scharniere', name: HINGES['195'].name + ' – für Aufsatzfronten', art: HINGES['195'].art, qty: packs, note: `${single} Scharniere benötigt` });
  }
  // Abdeckkappen für Lochreihen
  let holes = 0;
  for (const dr of sc.drill) if (dr.holes) holes += dr.zs ? dr.zs.length * 2 : 0;
  // Korpusverbinder & Wandbefestigung
  const corp = sc.drill.filter(x => x.holes).length / 2;
  rows.push({ group: 'Beschläge', name: 'Korpusverbinder / Konfirmat 7×50 (4 je Verbindung)', art: '', qty: Math.ceil(corp * 16 + 16) });
  rows.push({ group: 'Beschläge', name: 'Kippschutz / Wandwinkel + Dübel', art: '', qty: Math.ceil(corp * 2 + 4) });
  rows.push({ group: 'Beschläge', name: MISC.caps.name, art: MISC.caps.art, qty: Math.max(1, Math.ceil(holes / 100)) });
  const order = ['Fronten', 'Scharniere', 'KOMPLEMENT Inneneinrichtung', 'Klappbett', 'Beschläge', 'Holz'];
  rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name));
  return rows;
}

// Bohrdaten je Seitenwand (alle Maße ab Unterkante Seitenwand bzw. Vorderkante)
export function drillData(sc, s) {
  const d = sc.d, h = s.pax.hole, t = s.mat.t;
  return sc.drill.map(dr => {
    const zs = [];
    if (dr.holes) for (let z = t + h.start; z <= dr.H - t - h.endMargin; z += h.pitch) zs.push(z);
    dr.zs = zs;
    const plates = dr.hinges.map(zAbs => {
      const zc = zAbs - dr.zBase;
      const a = zc - s.pax.plateHalf, b = zc + s.pax.plateHalf;
      const onGrid = dr.holes && zs.some(z => Math.abs(z - a) < 0.6) && zs.some(z => Math.abs(z - b) < 0.6);
      return { zc, a, b, onGrid };
    });
    return { ...dr, zs, plates, xs: dr.holes ? [h.front, dr.rear] : [], hingeX: h.front };
  });
}

export function toCSV(rows, cols) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(c => esc(c[1])).join(';'), ...rows.map(r0 => cols.map(c => esc(r0[c[0]])).join(';'))].join('\n');
}
