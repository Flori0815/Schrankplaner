import { INTERIOR } from './catalog.js';
import { RUN_KEYS, RUN_NAMES } from './build.js';

const NS = 'http://www.w3.org/2000/svg';
export const MAT = {
  mpx: ['#e6cc9f', '#8a6a3a'], back: ['#f1e4c8', '#b39a6e'], frame: ['#c9a873', '#7d6238'], filler: ['#e9d4aa', '#8a6a3a'],
  crown: ['#dcc08f', '#7d6238'], bedfront: ['#dcc093', '#7d6238'], rost: ['#c49a5c', '#7d5a2a'], mattress: ['#e7ecf2', '#9aa6b4'],
};
const f1 = v => Math.round(v);

// Profil-Details einer Front (lokal: a entlang Breite, b entlang Höhe, z nach außen)
export function profileParts(prof, w, h) {
  const out = [];
  if (!prof || prof.type === 'flat') return out;
  if (prof.type === 'frame') {
    const fw = Math.min(prof.frameW || 70, w / 4);
    out.push({ a0: 0, a1: fw, b0: 0, b1: h, z0: 0, z1: 5, kind: 'bar' }, { a0: w - fw, a1: w, b0: 0, b1: h, z0: 0, z1: 5, kind: 'bar' },
      { a0: fw, a1: w - fw, b0: h - fw, b1: h, z0: 0, z1: 5, kind: 'bar' }, { a0: fw, a1: w - fw, b0: 0, b1: fw, z0: 0, z1: 5, kind: 'bar' });
  } else if (prof.type === 'grooves') {
    const n = Math.max(2, Math.round(w / 62));
    for (let i = 1; i < n; i++) { const a = i * w / n; out.push({ a0: a - 2.5, a1: a + 2.5, b0: 0, b1: h, z0: 0, z1: 0.6, kind: 'groove' }); }
  } else if (prof.type === 'mirror') {
    out.push({ a0: 30, a1: w - 30, b0: 30, b1: h - 30, z0: 0, z1: 1, kind: 'glass' });
  }
  return out;
}
function profileSVG(prof, x0, y0, w, h) {
  // x0,y0 = linke obere Ecke im SVG, h nach unten
  return profileParts(prof, w, h).map(p => {
    const x = x0 + p.a0, y = y0 + (h - p.b1), ww = p.a1 - p.a0, hh = p.b1 - p.b0;
    if (p.kind === 'bar') return `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" class="pbar"/>`;
    if (p.kind === 'groove') return `<line x1="${x + ww / 2}" y1="${y}" x2="${x + ww / 2}" y2="${y + hh}" class="pgroove"/>`;
    return `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" class="pglass"/>`;
  }).join('');
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function proj(s, key, x, y) {
  if (key === 'back') return [x, y];
  if (key === 'left') return [s.room.left - y, x];
  return [y, s.room.back - x];
}
function projBox(s, key, b) {
  const a = proj(s, key, b.min[0], b.min[1]), c = proj(s, key, b.max[0], b.max[1]);
  return { u0: Math.min(a[0], c[0]), u1: Math.max(a[0], c[0]), d0: Math.min(a[1], c[1]), d1: Math.max(a[1], c[1]), z0: b.min[2], z1: b.max[2] };
}

function dimH(x0, x1, y, text, cls = 'dim') {
  if (x1 - x0 < 1) return '';
  return `<g class="${cls}"><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><line x1="${x0}" y1="${y - 25}" x2="${x0}" y2="${y + 25}"/><line x1="${x1}" y1="${y - 25}" x2="${x1}" y2="${y + 25}"/>` +
    `<text x="${(x0 + x1) / 2}" y="${y - 14}" text-anchor="middle">${text}</text></g>`;
}
function dimV(x, y0, y1, text, cls = 'dim') {
  if (Math.abs(y1 - y0) < 1) return '';
  const ym = (y0 + y1) / 2;
  return `<g class="${cls}"><line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/><line x1="${x - 25}" y1="${y0}" x2="${x + 25}" y2="${y0}"/><line x1="${x - 25}" y1="${y1}" x2="${x + 25}" y2="${y1}"/>` +
    `<text x="${x - 14}" y="${ym}" text-anchor="middle" transform="rotate(-90 ${x - 14} ${ym})">${text}</text></g>`;
}

const DEFS = `<defs><pattern id="hatch" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="60" stroke="#9a8f80" stroke-width="6"/></pattern></defs>`;

// ---------------- Frontansicht (abgewickelt) ----------------
export function renderFront(s, sc, selId, mode) {
  const d = sc.d, gapW = 700;
  const lens = { left: s.room.left, back: s.room.back, right: s.room.right };
  let off = 0, out = '';
  const H = s.room.height;
  for (const key of RUN_KEYS) {
    const L = lens[key];
    let g = `<g transform="translate(${off},0)">`;
    g += `<rect x="0" y="${-H}" width="${L}" height="${H}" class="wall"/>`;
    g += `<text x="${L / 2}" y="${-H - 120}" class="title" text-anchor="middle">${RUN_NAMES[key]} (${L} mm)</text>`;
    // Boxen
    const items = [];
    for (const b of sc.boxes) if (b.views.includes(key)) items.push({ b, p: projBox(s, key, b) });
    if (mode === 'doors') for (const dr of sc.doors) if (dr.view === key) items.push({ door: dr, p: projBox(s, key, dr) });
    items.sort((a, c) => (a.p.d1 - c.p.d1) || (a.p.d0 - c.p.d0));
    for (const it of items) {
      const p = it.p;
      if (it.door) {
        const dr = it.door;
        const hingeU = proj(s, key, dr.hinge[0], dr.hinge[1])[0];
        const hl = Math.abs(hingeU - p.u0) < Math.abs(hingeU - p.u1);
        const xh = hl ? p.u0 : p.u1, xf = hl ? p.u1 : p.u0;
        g += `<g class="door${dr.elemId === selId ? ' sel' : ''}" data-id="${dr.elemId}"><rect x="${p.u0}" y="${-p.z1}" width="${p.u1 - p.u0}" height="${p.z1 - p.z0}" fill="${dr.color}"/>` + profileSVG(dr.profile, p.u0, -p.z1, p.u1 - p.u0, p.z1 - p.z0) +
          `<polyline points="${xh},${-p.z1} ${xf},${-(p.z0 + p.z1) / 2} ${xh},${-p.z0}" class="swing"/>` +
          `<text x="${(p.u0 + p.u1) / 2}" y="${-p.z0 - 80}" text-anchor="middle" class="small">${esc(dr.label)}</text></g>`;
        continue;
      }
      const b = it.b;
      if (b.mat === 'item') {
        const cat = INTERIOR[b.kind];
        g += `<rect x="${p.u0}" y="${-p.z1}" width="${p.u1 - p.u0}" height="${p.z1 - p.z0}" fill="${b.color || '#eee'}" stroke="#777" stroke-width="3" data-id="${b.elemId}"/>`;
        if (cat && cat.hang && mode !== 'doors') { const hh = Math.min(cat.hang, p.z0 - d.intZ0); if (hh > 0) g += `<rect x="${p.u0 + 20}" y="${-p.z0}" width="${p.u1 - p.u0 - 40}" height="${hh}" class="hang"/>`; }
        continue;
      }
      const c = b.color ? [b.color, '#777'] : (MAT[b.mat] || MAT.mpx);
      g += `<rect x="${p.u0}" y="${-p.z1}" width="${p.u1 - p.u0}" height="${p.z1 - p.z0}" fill="${c[0]}" stroke="${c[1]}" stroke-width="3" data-id="${b.elemId}"/>`;
      if (b.profile) g += profileSVG(b.profile, p.u0, -p.z1, p.u1 - p.u0, p.z1 - p.z0);
    }
    for (const bl of sc.blocked) if (bl.view === key) g += `<rect x="${bl.u0}" y="${-d.avail}" width="${bl.u1 - bl.u0}" height="${d.avail}" fill="url(#hatch)" opacity=".55"/><text x="${(bl.u0 + bl.u1) / 2}" y="${-d.avail / 2}" text-anchor="middle" class="small" transform="rotate(-90 ${(bl.u0 + bl.u1) / 2} ${-d.avail / 2})">${bl.label}</text>`;
    // Elemente: Hit-Fläche, Label, Maßkette
    const els = sc.elements.filter(e => e.view === key).sort((a, c) => a.u0 - c.u0);
    for (const e of els) {
      g += `<rect x="${e.u0}" y="${-d.avail}" width="${e.u1 - e.u0}" height="${d.avail}" class="hit${e.id === selId ? ' selected' : ''}" data-id="${e.id}"/>`;
      if (e.u1 - e.u0 > 250) g += `<text x="${(e.u0 + e.u1) / 2}" y="${-d.avail - 40}" text-anchor="middle" class="label">${esc(e.label)}</text>`;
      g += dimH(e.u0, e.u1, 150, f1(e.u1 - e.u0));
    }
    g += dimH(0, L, 330, `${L}`);
    g += `<line x1="-200" y1="0" x2="${L + 200}" y2="0" class="floor"/>`;
    if (key === 'left') {
      let x = -150;
      g += dimV(x, 0, -d.plinth, `${f1(d.plinth)}`);
      g += dimV(x, -d.plinth, -d.Htot, `${f1(d.Htot - d.plinth)}`);
      if (d.Ht > 2) g += dimV(x, -d.Htot, -d.avail, `${f1(d.Ht)}`);
      g += dimV(x - 180, 0, -H, `${H}`);
    }
    g += '</g>';
    out += g;
    off += L + gapW;
  }
  const W = off - gapW;
  return `<svg xmlns="${NS}" class="draw" data-vb="${-600} ${-H - 350} ${W + 1000} ${H + 850}">${DEFS}${out}</svg>`;
}

// ---------------- Draufsicht ----------------
export function renderTop(s, sc, selId, cutZ) {
  const W = s.room.back, L = s.room.left, R = s.room.right;
  let g = '';
  const depthMax = Math.max(L, R);
  g += `<rect x="0" y="0" width="${W}" height="${depthMax}" class="floorplan"/>`;
  g += `<polyline points="-60,${L} -60,-60 ${W + 60},-60 ${W + 60},${R}" class="wallline"/>`;
  // Elemente Grundfläche
  const boxes = sc.boxes.filter(b => b.min[2] <= cutZ && b.max[2] >= cutZ);
  for (const b of boxes) {
    const c = b.color ? [b.color, '#777'] : (MAT[b.mat] || MAT.mpx);
    g += `<rect x="${b.min[0]}" y="${b.min[1]}" width="${b.max[0] - b.min[0]}" height="${b.max[1] - b.min[1]}" fill="${c[0]}" stroke="${c[1]}" stroke-width="3" data-id="${b.elemId}"/>`;
  }
  // Türen + Schwenkbereich
  for (const dr of sc.doors) {
    if (dr.kind === 'top') continue;
    const [hx, hy] = dr.hinge;
    const fx = hx + dr.s[0] * dr.w, fy = hy + dr.s[1] * dr.w;
    const ox = hx + dr.n[0] * dr.w, oy = hy + dr.n[1] * dr.w;
    const cross = dr.s[0] * dr.n[1] - dr.s[1] * dr.n[0];
    g += `<rect x="${dr.min[0]}" y="${dr.min[1]}" width="${dr.max[0] - dr.min[0]}" height="${dr.max[1] - dr.min[1]}" fill="${dr.color}" stroke="#555" stroke-width="3" data-id="${dr.elemId}"/>`;
    g += `<path d="M${fx},${fy} A${dr.w},${dr.w} 0 0 ${cross > 0 ? 1 : 0} ${ox},${oy} L${hx},${hy}" class="arc"/>`;
  }
  // Bett ausgeklappt
  for (const bed of sc.beds) {
    const fr = bed.frame, el = sc.elements.find(e => e.id === bed.id);
    const p = (u, dd) => [fr.P0[0] + fr.eu[0] * u + fr.n[0] * dd, fr.P0[1] + fr.eu[1] * u + fr.n[1] * dd];
    const a = p(bed.uc - el.bed.foW / 2, bed.dp), c = p(bed.uc + el.bed.foW / 2, bed.dp + bed.foL);
    const x0 = Math.min(a[0], c[0]), y0 = Math.min(a[1], c[1]), w = Math.abs(c[0] - a[0]), h = Math.abs(c[1] - a[1]);
    g += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" class="bedopen" data-id="${bed.id}"/><text x="${x0 + w / 2}" y="${y0 + h / 2}" text-anchor="middle" class="label">Klappbett ausgeklappt</text>`;
    g += `<text x="${x0 + w / 2}" y="${y0 + h / 2 + 90}" text-anchor="middle" class="small">${f1(el.bed.foW)} × ${f1(el.bed.foL)}</text>`;
  }
  // Auswahl / Hit
  for (const e of sc.elements) {
    if (e.alias) continue;
    const fr = { back: [[1, 0], [0, 1], [0, 0]], left: [[0, -1], [1, 0], [0, L]], right: [[0, 1], [-1, 0], [W, 0]] }[e.view];
    const p = (u, dd) => [fr[2][0] + fr[0][0] * u + fr[1][0] * dd, fr[2][1] + fr[0][1] * u + fr[1][1] * dd];
    const a = p(e.u0, 0), c = p(e.u1, e.D);
    g += `<rect x="${Math.min(a[0], c[0])}" y="${Math.min(a[1], c[1])}" width="${Math.abs(c[0] - a[0])}" height="${Math.abs(c[1] - a[1])}" class="hit${e.id === selId ? ' selected' : ''}" data-id="${e.id}"/>`;
  }
  // Maße
  g += dimH(0, W, -200, `${W}`);
  g += dimV(-250, L, 0, `${L}`).replace(/rotate\(-90/g, 'rotate(-90');
  g += dimV(W + 300, R, 0, `${R}`);
  const dB = s.runs.back.depth;
  g += dimV(W / 2, dB, 0, `${dB}`);
  return `<svg xmlns="${NS}" class="draw" data-vb="${-600} ${-500} ${W + 1200} ${depthMax + 900}">${DEFS}${g}</svg>`;
}

// ---------------- Bohrplan ----------------
export function renderDrill(s, dr) {
  const D = dr.D, H = dr.H, t = s.mat.t;
  let g = `<rect x="0" y="${-H}" width="${D}" height="${H}" class="panel"/>`;
  g += `<rect x="0" y="${-t}" width="${D}" height="${t}" class="joint"/><rect x="0" y="${-H}" width="${D}" height="${t}" class="joint"/>`;
  const gx = D - s.mat.grooveInset - s.mat.backT - 0.5;
  g += `<rect x="${gx}" y="${-H}" width="${s.mat.backT + 0.5}" height="${H}" class="groove"/>`;
  const r = s.pax.hole.d / 2 * 3;
  for (const x of dr.xs) for (const z of dr.zs) g += `<circle cx="${x}" cy="${-z}" r="${r}" class="hole"/>`;
  for (const p of dr.plates) {
    for (const z of [p.a, p.b]) g += `<circle cx="${dr.hingeX}" cy="${-z}" r="${r * 1.6}" class="${p.onGrid ? 'plateok' : 'plate'}"/>`;
    g += `<line x1="${dr.hingeX - 40}" y1="${-p.zc}" x2="${dr.hingeX + 120}" y2="${-p.zc}" class="cl"/><text x="${dr.hingeX + 130}" y="${-p.zc + 12}" class="small">${f1(p.zc)}</text>`;
  }
  g += dimH(0, D, 120, `${D}`);
  g += dimV(-120, 0, -H, `${f1(H)}`);
  if (dr.xs.length) {
    g += dimH(0, dr.xs[0], -H - 80, `${dr.xs[0]}`);
    g += dimH(0, dr.xs[1], -H - 200, `${dr.xs[1]}`);
    g += dimV(D + 120, 0, -dr.zs[0], `${f1(dr.zs[0])}`);
  }
  g += `<text x="${D / 2}" y="${-H - 300}" text-anchor="middle" class="label">Vorderkante ← links | Hinterkante (Nut) → rechts</text>`;
  return `<svg xmlns="${NS}" class="draw" data-vb="${-450} ${-H - 400} ${D + 800} ${H + 600}">${g}</svg>`;
}

// ---------------- Pan & Zoom ----------------
export function panZoom(svg, keep) {
  const base = svg.dataset.vb.split(' ').map(Number);
  let vb = keep && keep.vb ? keep.vb.slice() : base.slice();
  const apply = () => { svg.setAttribute('viewBox', vb.join(' ')); if (keep) keep.vb = vb; };
  apply();
  const pt = e => { const r = svg.getBoundingClientRect(); const sc = Math.max(vb[2] / r.width, vb[3] / r.height); const ox = (r.width * sc - vb[2]) / 2, oy = (r.height * sc - vb[3]) / 2; return [vb[0] - ox + (e.clientX - r.left) * sc, vb[1] - oy + (e.clientY - r.top) * sc, sc]; };
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, y] = pt(e), k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    vb = [x - (x - vb[0]) * k, y - (y - vb[1]) * k, vb[2] * k, vb[3] * k]; apply();
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vb: vb.slice(), moved: false }; });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = svg.getBoundingClientRect(), sc = Math.max(vb[2] / r.width, vb[3] / r.height);
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; svg.setPointerCapture(e.pointerId); }
    if (drag.moved) { vb = [drag.vb[0] - dx * sc, drag.vb[1] - dy * sc, vb[2], vb[3]]; apply(); }
  });
  svg.addEventListener('pointerup', () => { svg.dataset.dragged = drag && drag.moved ? '1' : ''; drag = null; });
  return { reset() { vb = base.slice(); apply(); } };
}
