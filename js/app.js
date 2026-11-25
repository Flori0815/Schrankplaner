import { defaultState, loadLocal, saveLocal, migrate, uid } from './state.js';
import { buildScene, derive, normalize, presetItems, PRESETS, RUN_KEYS, RUN_NAMES, runRange, sectionWidth, sectionLabel, holeZs, bedDims, rearRow, bedMinDepth } from './build.js';
import { cutList, shopList, drillData, toCSV } from './lists.js';
import { renderFront, renderTop, renderDrill, panZoom } from './svg2d.js';
import { DOOR_STYLES, INTERIOR } from './catalog.js';

let S = loadLocal() || defaultState();
normalize(S);
let sel = null, tab = 'front', sc = null, drills = [], drillSel = 0;
const zoom = { front: {}, top: {}, drill: {} };
let v3d = null, doorsOpen = false, bedOpen = false;

const $ = q => document.querySelector(q);
const side = $('#side'), insp = $('#insp'), view = $('#view'), view3d = $('#view3d'), tb = $('#toolbar');
const r0 = v => Math.round(v);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function getP(path) { return path.split('.').reduce((o, k) => o[k], S); }
function setP(path, v) { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; }
function findSec(id) { for (const k of RUN_KEYS) { const i = S.runs[k].sections.findIndex(x => x.id === id); if (i >= 0) return { run: k, i, sec: S.runs[k].sections[i] }; } return null; }

const num = (label, path, step = 1, extra = '') => `<div class="f"><label>${label}</label><input type="number" step="${step}" data-path="${path}" value="${getP(path)}" ${extra}></div>`;
const selF = (label, path, opts) => `<div class="f"><label>${label}</label><select data-path="${path}">${opts.map(([v, t]) => `<option value="${v}" ${String(getP(path)) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
const chk = (label, path) => `<div class="f"><label>${label}</label><input type="checkbox" data-path="${path}" ${getP(path) ? 'checked' : ''}></div>`;

// ---------------- Seitenleiste ----------------
function renderSide() {
  const d = sc.d, keepOpen = [...side.querySelectorAll('details')].map(x => x.open);
  const cornerOpts = [['L', 'L-Eck (2 Türen, wie PAX Eckanbau)'], ['blindBack', 'Blindeck – Hauptwand läuft durch'], ['blindFlank', 'Blindeck – Flanke läuft durch'], ['none', 'Stoß ohne Eckkorpus']];
  let h = `<details open><summary>Raum</summary>
    ${num('Raumhöhe', 'room.height')}${num('Luft zur Decke', 'room.ceilingGap')}
    ${num('Wand links (Flanke)', 'room.left')}${num('Hauptwand', 'room.back')}${num('Wand rechts (Flanke)', 'room.right')}</details>
  <details open><summary>Höhenaufbau</summary>
    ${selF('Konzept', 'concept', [['229', 'PAX 236 (Tür 229) + Zierleiste'], ['195', 'PAX 201 (Tür 195) + Aufsatz']])}
    ${d.topMode === 'box' ? selF('Aufsatzfronten', 'topFront', [['cut', 'PAX-Tür 229 kürzen'], ['mpx', 'Multiplex-Front']]) : ''}
    <div class="kv"><span>Sockelrahmen</span><b>${r0(d.plinth)} mm</b><span>Korpuskasten</span><b>${r0(d.Htot - d.plinth)} mm</b>
    <span>Korpus OK</span><b>${r0(d.Htot)} mm</b><span>Tür (${d.sizeKey})</span><b>${d.doorH} mm, UK ${r0(d.doorBot)}</b>
    <span>${d.topMode === 'box' ? 'Aufsatz' : 'Zierleiste'}</span><b>${r0(d.Ht)} mm</b><span>Innenhöhe</span><b>${r0(d.intH)} mm</b></div>
    ${selF('Türmodell', 'doorStyle', Object.entries(DOOR_STYLES).map(([k, v]) => [k, v.name]))}</details>
  <details open><summary>Zeilen & Korpusse</summary><datalist id="depths"><option value="580"><option value="350"></datalist>`;
  for (const k of RUN_KEYS) {
    const run = S.runs[k], dm = sc.dims[k];
    h += `<div class="run"><h4>${RUN_NAMES[k]} <button class="mini" data-act="autofill" data-run="${k}" title="Mit PAX-Korpussen auffüllen">Auto</button></h4>
      ${run.sections.some(x => x.type === 'bed') && S.bed.depthMode === 'min' ? `<div class="f"><label>Tiefe</label><b>${run.depth} (Bett-Minimum)</b></div>` : num('Tiefe (580 / 350 = PAX)', `runs.${k}.depth`, 5, 'list="depths"')}
      ${selF('Ausrichtung', `runs.${k}.align`, [['start', 'links bündig'], ['center', 'mittig'], ['end', 'rechts bündig']])}
      <div class="info">Verfügbar ${r0(dm.len)} · belegt ${r0(dm.total)} · <b class="${dm.free < 0 ? 'warn' : ''}">Rest ${r0(dm.free)} mm</b></div>`;
    run.sections.forEach((sec, i) => {
      h += `<div class="sec ${sel === sec.id ? 'sel' : ''}" data-act="select" data-id="${sec.id}"><span>${i + 1}. ${esc(sectionLabel(S, sec))} ${sec.type === 'custom' || sec.type === 'filler' ? `<input class="w" type="number" data-path="runs.${k}.sections.${i}.outer" data-outer="1" value="${r0(sectionWidth(S, sec))}" title="Außenbreite">` : `<small class="info">${r0(sectionWidth(S, sec))}</small>`}</span>
        <button class="mini" data-act="up" data-id="${sec.id}">↑</button><button class="mini" data-act="down" data-id="${sec.id}">↓</button><button class="mini" data-act="del" data-id="${sec.id}">✕</button></div>`;
    });
    h += `<div class="addrow">${[50, 75, 100].map(z => `<button class="mini" data-act="add" data-run="${k}" data-type="pax" data-size="${z}">+${z}</button>`).join('')}
      <button class="mini" data-act="add" data-run="${k}" data-type="custom">+Sonder</button><button class="mini" data-act="add" data-run="${k}" data-type="filler">+Blende</button>
      ${S.runs[k].sections.some(x => x.type === 'bed') ? '' : `<button class="mini" data-act="add" data-run="${k}" data-type="bed">+Klappbett</button>`}</div></div>`;
  }
  h += `</details>
  <details><summary>Ecken</summary>
    ${selF('Ecke links', 'corners.left', cornerOpts)}${selF('Ecke rechts', 'corners.right', cornerOpts)}
    ${num('Öffnung L-Eck', 'corners.open')}${num('Öffnung Blindeck', 'corners.blindOpen')}${num('Eck-Passleiste', 'corners.filler')}${num('Böden im Eckkorpus', 'corners.shelves')}</details>
  <details><summary>Klappbett</summary>${bedFields()}</details>
  <details><summary>Material & Konstruktion</summary>
    ${num('Multiplex Korpus', 'mat.t')}${num('Rückwand', 'mat.backT')}${num('Nuttiefe', 'mat.grooveDepth')}${num('Nut ab Hinterkante', 'mat.grooveInset')}
    ${num('Türstärke', 'mat.doorT')}${num('Fuge Fronten', 'mat.edgeGap', 0.5)}${num('Sockelrahmen Rücksprung', 'mat.frameInset')}${num('Querriegel max. Abstand', 'mat.frameCross')}
    ${num('Zierleiste Stärke', 'mat.crownT')}${num('Dichte kg/m³', 'mat.density')}${num('Min. Aufsatzhöhe', 'topBoxMin')}</details>
  <details><summary>PAX-Maße & Lochraster</summary>
    <div class="note">Werte vor dem Bohren an einem Original-KOMPLEMENT-Teil und an den vorgebohrten Türen nachmessen.</div>
    ${num('Innenbreite 50', 'pax.innerW.50')}${num('Innenbreite 75', 'pax.innerW.75')}${num('Innenbreite 100', 'pax.innerW.100')}
    ${num('Türbreite 50', 'pax.doorW.50')}${num('Türbreite 25', 'pax.doorW.25')}${num('Türhöhe 195', 'pax.doorH.195')}${num('Türhöhe 229', 'pax.doorH.229')}
    ${num('Korpus OK 201er', 'pax.corpusH.195')}${num('Korpus OK 236er', 'pax.corpusH.229')}${num('Tür unter Korpus-OK', 'pax.doorTopReveal')}${num('Luft Tür-UK/Sockel', 'pax.doorBottomGap')}
    ${num('Loch Ø', 'pax.hole.d', 0.5)}${num('Lochabstand', 'pax.hole.pitch')}${num('Lochreihe vorn', 'pax.hole.front')}${num('Lochreihe hinten (0=auto)', 'pax.hole.rear')}
    ${num('1. Loch über Boden', 'pax.hole.start')}${num('Abstand letztes Loch', 'pax.hole.endMargin')}${num('Bohrtiefe', 'pax.hole.depth')}
    ${num('Scharnier ab Türkante', 'pax.hingeEdge')}${num('Montageplatte ±', 'pax.plateHalf')}</details>
  <details open><summary>Hinweise (${sc.warnings.length})</summary>${sc.warnings.length ? sc.warnings.map(w => `<div class="warn" ${w.id ? `data-act="select" data-id="${w.id}"` : ''}>⚠ ${esc(w.m)}</div>`).join('') : '<div class="ok">Keine Konflikte gefunden.</div>'}</details>`;
  const st = side.scrollTop;
  side.innerHTML = h;
  side.querySelectorAll('details').forEach((x, i) => { if (keepOpen.length) x.open = keepOpen[i] ?? x.open; });
  side.scrollTop = st;
}

function bedFields() {
  const el = sc.elements.find(e => e.kind === 'bed');
  const bd = bedDims(S);
  return `${selF('Tiefe Bettzeile', 'bed.depthMode', [['min', `minimal für Bett (${bedMinDepth(S)} mm)`], ['run', 'frei (Zeilentiefe)']])}${num('Matratze Breite', 'bed.matW')}${num('Matratze Länge', 'bed.matL')}${num('Matratze Höhe', 'bed.matH')}${num('Luft um Matratze', 'bed.clear')}
    ${selF('Lattenrost', 'bed.rost', [['2x80', '2 × 80×200 (mit Mittelauflage)'], ['1x160', '1 × 160×200']])}
    ${num('Lattenrost Höhe', 'bed.rostH')}${num('Luftspalt unter Rost', 'bed.airGap')}
    ${num('Rahmen Multiplex', 'bed.frameT')}${num('Zargenhöhe', 'bed.frameH')}${num('Bodenplatte/Front', 'bed.frontT')}
    ${num('Platz Beschlag je Seite', 'bed.mechClear')}${num('Drehpunkt/UK Bett über Boden', 'bed.pivotH')}${num('Bettschrank OK', 'bed.cabinetH')}
    ${num('Matratze kg', 'bed.matKg')}${num('Lattenrost kg (je)', 'bed.rostKg')}
    <div class="kv"><span>Rahmen außen</span><b>${r0(bd.foW)} × ${r0(bd.foL)}</b><span>Schrank außen breit</span><b>${r0(bd.outerW)}</b>
    ${el && el.bed ? `<span>Liegehöhe</span><b>${r0(el.bed.lieH)} mm</b><span>Einklapptiefe</span><b>${r0(el.bed.closedDepth)} mm</b><span>Bettgewicht ca.</span><b>${r0(el.bed.kg)} kg</b>
    <span>Ausladung</span><b>${r0(el.bed.openReach)} mm</b>${el.bed.passage !== undefined ? `<span>Durchgang offen</span><b>${r0(el.bed.passage)} mm</b>` : ''}` : ''}</div>
    <div class="info">Beschlag (Gasdruckfedern) nach Bettgewicht und Herstellerangaben zu Drehpunkt und Seitenabstand wählen, dann „Platz Beschlag“ und „Drehpunkt“ anpassen.</div>`;
}

// ---------------- Inspektor ----------------
function renderInspector() {
  const el = sel && sc.elements.find(e => e.id === sel);
  if (!el) { insp.innerHTML = `<h3>Auswahl</h3><div class="info">Korpus in einer Ansicht oder in der Liste links anklicken.</div>${legend()}`; return; }
  const f = findSec(el.id);
  let h = `<h3>${esc(el.label)}</h3>`;
  const ws = sc.warnings.filter(w => w.id === el.id);
  h += ws.map(w => `<div class="warn">⚠ ${esc(w.m)}</div>`).join('');
  if (el.kind === 'cornerL' || el.kind === 'cornerBlind' || el.kind === 'cornerNone') {
    const sd = el.id.endsWith('left') ? 'left' : 'right';
    h += selF('Eckvariante', `corners.${sd}`, [['L', 'L-Eck'], ['blindBack', 'Blindeck – Hauptwand durch'], ['blindFlank', 'Blindeck – Flanke durch'], ['none', 'Stoß']]);
    h += num('Böden', 'corners.shelves') + num('Öffnung L-Eck', 'corners.open') + num('Öffnung Blindeck', 'corners.blindOpen');
    h += `<div class="info">Eckkorpusse erhalten Eigenbau-Böden auf Bodenträgern. Die Türen sind PAX-Türen 50 cm an den Außenseiten angeschlagen.</div>`;
  } else if (el.kind === 'autofill') {
    h += `<div class="info">Automatische Passblende für den Rest der Zeile. Über „Ausrichtung“ links verschieben oder Korpus ergänzen.</div>`;
  } else if (f) {
    const sec = f.sec, p = `runs.${f.run}.sections.${f.i}`;
    if (sec.type === 'filler') h += num('Breite', `${p}.w`);
    if (sec.type === 'bed') h += `<div class="info">Klappbett-Parameter links unter „Klappbett“.</div>${bedFields()}`;
    if (sec.type === 'pax' || sec.type === 'custom') {
      h += selF('Typ', `${p}.type`, [['pax', 'PAX-Raster (KOMPLEMENT passt)'], ['custom', 'Sonderbreite (Eigenbau-Innenleben)']]);
      if (sec.type === 'pax') h += selF('Breite', `${p}.size`, [[50, '50 cm'], [75, '75 cm'], [100, '100 cm']]);
      else h += `<div class="f"><label>Außenbreite</label><input type="number" data-path="${p}.outer" data-outer="1" value="${r0(el.u1 - el.u0)}"></div>` + num('Innenbreite', `${p}.innerW`);
      h += chk('Türen', `${p}.doors`);
      if (sec.doors && sec.type === 'custom') { if (sec.nDoors === undefined) sec.nDoors = 0; h += selF('Anzahl Fronten', `${p}.nDoors`, [[0, `automatisch (${el.doorLayout.length})`], [1, '1'], [2, '2'], [3, '3'], [4, '4']]); }
      if (sec.doors && el.doorLayout.length % 2 === 1 && !(sec.type === 'pax' && sec.size === 100)) h += selF(sec.size === 75 ? '50er Tür' : 'Anschlag', `${p}.hinge`, [['L', 'links'], ['R', 'rechts']]);
      if (sec.doors && sec.type === 'custom') h += `<div class="info">Fronten je ${el.doorLayout.length ? r0(el.doorLayout[0].u1 - el.doorLayout[0].u0) : 0} mm breit – ${el.doorLayout.length && el.doorLayout[0].u1 - el.doorLayout[0].u0 <= S.pax.doorW[50] ? 'aus PAX-Tür 50 besäumbar' : 'Multiplex-Sonderfront'}.</div>`;
      const inner = el.inner, d = sc.d;
      h += `<div class="kv"><span>Außen</span><b>${r0(el.u1 - el.u0)} × ${el.D}</b><span>Innen B × H</span><b>${r0(inner.u1 - inner.u0)} × ${r0(inner.z1 - inner.z0)}</b><span>Nutzbare Tiefe</span><b>${r0(inner.d1 - inner.d0)}</b><span>Lochreihen</span><b>${S.pax.hole.front} / ${rearRow(S, el.D)}</b></div>`;
      h += `<h3>Inneneinrichtung</h3><div class="presets">${Object.entries(PRESETS).map(([k, v]) => `<button class="mini" data-act="preset" data-id="${sec.id}" data-p="${k}">${v}</button>`).join('')}</div>`;
      const hz = holeZs(S, d);
      const hasDiv = sec.items.some(i => i.type === 'divider');
      const allowed = Object.entries(INTERIOR).filter(([k, v]) => sec.type === 'pax' ? true : v.own);
      h += '<div class="items">';
      sec.items.map((it, j) => [it, j]).sort((a, b) => b[0].n - a[0].n).forEach(([it, j]) => {
        const ip = `${p}.items.${j}`, cat = INTERIOR[it.type];
        const z = hz[it.n] ?? (S.pax.hole.start + it.n * S.pax.hole.pitch);
        h += `<div class="it"><select data-path="${ip}.type">${allowed.map(([k, v]) => `<option value="${k}" ${k === it.type ? 'selected' : ''}>${esc(v.short)}</option>`).join('')}</select>
          <button class="mini" data-act="delitem" data-id="${sec.id}" data-j="${j}">✕</button>
          <div class="row">Loch <button class="mini" data-act="n" data-id="${sec.id}" data-j="${j}" data-dn="-1">−</button><input type="number" data-path="${ip}.n" value="${it.n}" min="0" max="${hz.length - 1}"><button class="mini" data-act="n" data-id="${sec.id}" data-j="${j}" data-dn="1">+</button>
          ${r0(z)} mm · ab Boden ${r0(d.intZ0 + z)}${hasDiv && it.type !== 'divider' ? `<select data-path="${ip}.side" style="width:auto"><option value="full" ${it.side === 'full' ? 'selected' : ''}>ganz</option><option value="left" ${it.side === 'left' ? 'selected' : ''}>links</option><option value="right" ${it.side === 'right' ? 'selected' : ''}>rechts</option></select>` : ''}</div>
          ${cat && cat.hang ? `<div class="row">Hängeraum ca. ${cat.hang} mm</div>` : ''}</div>`;
      });
      h += `</div><div class="addrow"><select id="additem">${allowed.map(([k, v]) => `<option value="${k}">${esc(v.short)}</option>`).join('')}</select><button class="pri" data-act="additem" data-id="${sec.id}">Hinzufügen</button></div>`;
      h += `<div class="info">Positionen rasten im ${S.pax.hole.pitch}-mm-Lochraster. Höhe = Unterkante des Elements über der Oberkante des Korpusbodens.</div>`;
    }
  }
  insp.innerHTML = h + legend();
}
function legend() {
  return `<div class="note">Startwerte für die PAX-Maße und das Lochraster sind Annahmen (siehe links „PAX-Maße“). Vor dem Bohren am Original messen.</div>`;
}

// ---------------- Ansichten ----------------
function renderToolbar() {
  if (tab === 'front') tb.innerHTML = `<button data-act="fmode" data-m="doors" class="${S.view.frontMode === 'doors' ? 'on' : ''}">Mit Türen</button><button data-act="fmode" data-m="inside" class="${S.view.frontMode !== 'doors' ? 'on' : ''}">Innenansicht</button><button data-act="zreset">Zoom zurücksetzen</button><span class="info">Mausrad: Zoom · Ziehen: verschieben · Klick: auswählen</span>`;
  else if (tab === 'top') tb.innerHTML = `<label>Schnitthöhe <input type="number" data-path="view.cutZ" value="${S.view.cutZ}" style="width:90px"> mm</label><button data-act="zreset">Zoom zurücksetzen</button><span class="info">Gestrichelt: Türschwenkbereiche und ausgeklapptes Bett</span>`;
  else if (tab === '3d') tb.innerHTML = `<button data-act="doors3d" class="${doorsOpen ? 'on' : ''}">Türen ${doorsOpen ? 'schließen' : 'öffnen'}</button><button data-act="bed3d" class="${bedOpen ? 'on' : ''}">Bett ${bedOpen ? 'einklappen' : 'ausklappen'}</button><button data-act="room3d">Raum ein/aus</button><button data-act="hidedoors">Türen ein/aus</button>`;
  else if (tab === 'drill') tb.innerHTML = `<label>Seitenwand <select id="drillsel">${drills.map((d, i) => `<option value="${i}" ${i === drillSel ? 'selected' : ''}>${esc(d.label)} – ${d.side === 'L' ? 'linke' : 'rechte'} Seite</option>`).join('')}</select></label><button data-act="zreset">Zoom zurücksetzen</button><button data-act="csv" data-what="drill">CSV</button>`;
  else tb.innerHTML = `<button data-act="csv" data-what="cut">Zuschnitt CSV</button><button data-act="csv" data-what="shop">Einkauf CSV</button><button data-act="print">Drucken</button>`;
}

function renderView() {
  view3d.hidden = tab !== '3d'; view.hidden = tab === '3d';
  view.classList.toggle('doc', tab === 'lists' || tab === 'drill');
  if (tab === 'front') { view.innerHTML = renderFront(S, sc, sel, S.view.frontMode); zoom.cur = panZoom(view.querySelector('svg'), zoom.front); }
  else if (tab === 'top') { view.innerHTML = renderTop(S, sc, sel, S.view.cutZ); zoom.cur = panZoom(view.querySelector('svg'), zoom.top); }
  else if (tab === '3d') {
    if (!v3d) { view3d.innerHTML = ''; v3d = new View3D(view3d, id => { sel = id; renderAll(false); }); }
    v3d.update(S, sc, sel); v3d.setDoors(doorsOpen); v3d.setBed(bedOpen);
  } else if (tab === 'drill') renderDrillTab();
  else renderLists();
}

function renderDrillTab() {
  if (!drills.length) { view.innerHTML = '<p>Keine Korpusse.</p>'; return; }
  if (drillSel >= drills.length) drillSel = 0;
  const dr = drills[drillSel];
  const off = dr.plates.filter(p => !p.onGrid);
  view.innerHTML = `<div style="display:grid;grid-template-columns:minmax(260px,1fr) minmax(260px,420px);gap:16px;height:100%">
    <div style="min-height:420px">${renderDrill(S, dr)}</div>
    <div><h3>${esc(dr.label)} – ${dr.side === 'L' ? 'linke' : 'rechte'} Seite (Innenseite)</h3>
    <div class="kv"><span>Seitenwand</span><b>${r0(dr.H)} × ${dr.D} × ${S.mat.t}</b><span>Unterkante über Boden</span><b>${r0(dr.zBase)}</b>
    <span>Nut ab Hinterkante</span><b>${S.mat.grooveInset} (B ${S.mat.backT + 0.5}, T ${S.mat.grooveDepth})</b>
    ${dr.xs.length ? `<span>Lochreihen ab Vorderkante</span><b>${dr.xs.join(' / ')}</b><span>Löcher je Reihe</span><b>${dr.zs.length} × Ø${S.pax.hole.d}, ${S.pax.hole.depth} tief</b><span>1. Loch ab UK Seite</span><b>${r0(dr.zs[0])}</b><span>Raster</span><b>${S.pax.hole.pitch}</b>` : '<span>Lochreihen</span><b>keine (Eigenbau-Böden: nach Bedarf)</b>'}</div>
    <h3>Scharnier-Montageplatten</h3>
    ${dr.plates.length ? `<table><tr><th>Topfmitte ab UK</th><th>Schrauben</th><th>Raster</th></tr>${dr.plates.map(p => `<tr><td class="n">${r0(p.zc)}</td><td class="n">${r0(p.a)} / ${r0(p.b)}</td><td>${p.onGrid ? '<span class="ok">auf Raster</span>' : '<span class="warn">eigene Bohrung</span>'}</td></tr>`).join('')}</table>` : '<div class="info">Keine Scharniere auf dieser Seite.</div>'}
    ${off.length ? '<div class="note">Rot markierte Montageplatten liegen nicht im Lochraster. Topfbohrungen an der gekauften Tür messen und „Scharnier ab Türkante“ oder „1. Loch über Boden“ anpassen.</div>' : ''}
    ${dr.zs.length ? `<details><summary>Alle Lochhöhen (ab UK Seitenwand)</summary><div class="info">${dr.zs.map(r0).join(', ')}</div></details>` : ''}
    <div class="note">Nur die Innenseite bohren, nicht durchbohren. Löcher mit Lochreihen-Bohrschablone (System 32) setzen.</div></div></div>`;
  zoom.cur = panZoom(view.querySelector('svg'), zoom.drill);
}

function renderLists() {
  const cl = cutList(sc), sl = shopList(sc, S);
  let h = `<h3>Zuschnittliste Multiplex / Rückwand</h3><div class="info">Maße in mm, L × B. Kantenbearbeitung und Nuten nicht eingerechnet. Platten 2500 × 1250 mit 20 % Verschnitt.</div>
    <div class="kv" style="max-width:420px">${Object.keys(cl.area).sort((a, b) => b - a).map(t => `<span>${t} mm</span><b>${cl.area[t].toFixed(2)} m² ≈ ${cl.sheets[t]} Platten</b>`).join('')}</div>
    <table><tr><th>Anz.</th><th>Teil</th><th>L</th><th>B</th><th>Stärke</th></tr>${cl.rows.map(x => `<tr><td class="n">${x.qty}</td><td>${esc(x.name)}</td><td class="n">${x.L}</td><td class="n">${x.W}</td><td class="n">${x.t}</td></tr>`).join('')}</table>
    <h3>Einkaufsliste</h3><table><tr><th>Anz.</th><th>Artikel</th><th>Art.-Nr.</th><th>Gruppe</th><th>Hinweis</th></tr>${sl.map(x => `<tr><td class="n">${x.qty}</td><td>${esc(x.name)}</td><td>${esc(x.art)}</td><td>${esc(x.group)}</td><td>${esc(x.note || '')}</td></tr>`).join('')}</table>
    <div class="note">Artikelnummern aus der IKEA-Kaufhilfe PAX/KOMPLEMENT 10/2026. Verfügbarkeit und Preise auf IKEA.de prüfen.</div>`;
  view.innerHTML = h;
}

function renderAll(rebuild = true) {
  if (rebuild) { normalize(S); sc = buildScene(S); drills = drillData(sc, S); saveLocal(S); }
  renderSide(); renderInspector(); renderToolbar(); renderView();
}

// ---------------- Ereignisse ----------------
function onChange(e) {
  const t = e.target;
  if (t.id === 'drillsel') { drillSel = +t.value; renderView(); return; }
  const path = t.dataset.path; if (!path) return;
  let v = t.type === 'checkbox' ? t.checked : t.value;
  const old = getP(path);
  if (t.type === 'number' || typeof old === 'number' || (t.tagName === 'SELECT' && typeof old !== 'string' && /^-?\d+(\.\d+)?$/.test(v))) { v = parseFloat(v); if (!isFinite(v)) return; }
  if (t.dataset.outer) { applyOuter(path, v); renderAll(); return; }
  setP(path, v);
  if (path.endsWith('.type') && path.includes('.sections.') && !path.includes('.items.')) {
    const sec = getP(path.replace(/\.type$/, ''));
    if (v === 'custom' && !sec.innerW) sec.innerW = S.pax.innerW[sec.size || 50];
    if (v === 'pax' && !sec.size) sec.size = 50;
    if (v === 'custom') sec.items = sec.items.filter(i => INTERIOR[i.type].own);
  }
  if (path.startsWith('view.')) { saveLocal(S); renderView(); return; }
  renderAll();
}
document.addEventListener('change', onChange);

// Außenbreite einer Sonder-/Blendensektion setzen
function applyOuter(path, v) {
  const sec = getP(path.replace(/\.outer$/, ''));
  if (sec.type === 'custom') sec.innerW = Math.max(20, v - 2 * S.mat.t);
  else if (sec.type === 'filler') sec.w = Math.max(1, v);
}
// Live-Aktualisierung beim Tippen in Zahlenfeldern
let liveT = null;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.type !== 'number' || !t.dataset.path || t.dataset.path.startsWith('view.')) return;
  const v = parseFloat(t.value); if (!isFinite(v)) return;
  clearTimeout(liveT);
  liveT = setTimeout(() => {
    if (t.dataset.outer) applyOuter(t.dataset.path, v); else setP(t.dataset.path, v);
    normalize(S); sc = buildScene(S); drills = drillData(sc, S); saveLocal(S); renderView();
  }, 250);
});

document.addEventListener('click', e => {
  if (e.target.matches('input, select, option')) {
    const row = e.target.closest('.sec[data-id]');
    if (row && sel !== row.dataset.id) {
      sel = row.dataset.id;
      side.querySelectorAll('.sec').forEach(x => x.classList.toggle('sel', x === row));
      renderInspector(); renderView();
    }
    return;
  }
  const b = e.target.closest('[data-act],[data-tab]');
  const svg = e.target.closest('svg.draw');
  if (svg && svg.dataset.dragged) return;
  if (!b) {
    const hit = e.target.closest('svg [data-id]');
    if (hit) { sel = hit.dataset.id; renderAll(false); }
    return;
  }
  if (b.dataset.tab) {
    tab = b.dataset.tab;
    document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
    renderToolbar(); renderView(); return;
  }
  const a = b.dataset.act, id = b.dataset.id;
  const f = id ? findSec(id) : null;
  switch (a) {
    case 'select': sel = id; renderAll(false); return;
    case 'add': {
      const run = S.runs[b.dataset.run];
      const sec = { id: uid(), type: b.dataset.type };
      if (sec.type === 'pax') Object.assign(sec, { size: +b.dataset.size, doors: true, hinge: 'L' });
      if (sec.type === 'custom') Object.assign(sec, { innerW: 400, doors: true, nDoors: 0, hinge: 'L' });
      if (sec.type === 'filler') sec.w = 50;
      if (sec.type === 'pax' || sec.type === 'custom') sec.items = presetItems(S, sec, sec.type === 'pax' ? 'shirts' : 'shelves');
      run.sections.push(sec); sel = sec.id; break;
    }
    case 'del': e.stopPropagation(); if (f) { S.runs[f.run].sections.splice(f.i, 1); if (sel === id) sel = null; } break;
    case 'up': case 'down': {
      e.stopPropagation(); if (!f) return;
      const arr = S.runs[f.run].sections, j = f.i + (a === 'up' ? -1 : 1);
      if (j < 0 || j >= arr.length) return;
      [arr[f.i], arr[j]] = [arr[j], arr[f.i]]; break;
    }
    case 'autofill': autofill(b.dataset.run); break;
    case 'preset': if (f) f.sec.items = presetItems(S, f.sec, b.dataset.p); break;
    case 'additem': {
      if (!f) return;
      const type = $('#additem').value, hz = holeZs(S, sc.d);
      const used = new Set(f.sec.items.map(i => i.n));
      let n = Math.floor(hz.length / 2); while (used.has(n) && n > 0) n--;
      f.sec.items.push({ id: uid('i'), type, n, side: 'full' }); break;
    }
    case 'delitem': if (f) f.sec.items.splice(+b.dataset.j, 1); break;
    case 'n': if (f) { const it = f.sec.items[+b.dataset.j]; it.n = Math.max(0, Math.min(holeZs(S, sc.d).length - 1, it.n + +b.dataset.dn)); } break;
    case 'fmode': S.view.frontMode = b.dataset.m; saveLocal(S); renderToolbar(); renderView(); return;
    case 'zreset': zoom.cur && zoom.cur.reset(); return;
    case 'doors3d': doorsOpen = !doorsOpen; v3d && v3d.setDoors(doorsOpen); renderToolbar(); return;
    case 'bed3d': bedOpen = !bedOpen; v3d && v3d.setBed(bedOpen); renderToolbar(); return;
    case 'room3d': if (v3d) { v3d.showRoom = !v3d.showRoom; v3d.update(S, sc, sel); } return;
    case 'hidedoors': if (v3d) { v3d.showDoors = !v3d.showDoors; v3d.update(S, sc, sel); } return;
    case 'csv': return downloadCSV(b.dataset.what);
    case 'print': window.print(); return;
    case 'save': return download('schrankplaner.json', JSON.stringify(S, null, 2), 'application/json');
    case 'load': $('#loadFile').click(); return;
    case 'reset': if (confirm('Planung auf Standardwerte zurücksetzen?')) { S = defaultState(); sel = null; } else return; break;
    default: return;
  }
  renderAll();
});

$('#loadFile').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try { S = migrate(JSON.parse(await file.text())); sel = null; renderAll(); } catch (err) { alert('Datei konnte nicht gelesen werden: ' + err.message); }
  e.target.value = '';
});

function autofill(key) {
  const run = S.runs[key];
  const [a, b] = runRange(S, key);
  const keep = run.sections.filter(x => x.type !== 'pax');
  const fixed = keep.reduce((s0, x) => s0 + sectionWidth(S, x), 0);
  const len = b - a - fixed;
  const w = z => S.pax.innerW[z] + 2 * S.mat.t;
  let best = { used: -1, n: 99, combo: [] };
  for (let i = 0; i * w(100) <= len; i++) for (let j = 0; i * w(100) + j * w(75) <= len; j++) for (let k = 0; i * w(100) + j * w(75) + k * w(50) <= len; k++) {
    const used = i * w(100) + j * w(75) + k * w(50), n = i + j + k;
    if (used > best.used + 0.5 || (Math.abs(used - best.used) < 0.5 && n < best.n)) best = { used, n, combo: [...Array(i).fill(100), ...Array(j).fill(75), ...Array(k).fill(50)] };
  }
  const pax = best.combo.map(z => { const sec = { id: uid(), type: 'pax', size: z, doors: true, hinge: 'L' }; sec.items = presetItems(S, sec, 'shirts'); return sec; });
  run.sections = run.align === 'end' ? [...pax, ...keep] : [...keep, ...pax];
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function downloadCSV(what) {
  if (what === 'cut') download('zuschnitt.csv', toCSV(cutList(sc).rows, [['qty', 'Anzahl'], ['name', 'Teil'], ['L', 'Länge'], ['W', 'Breite'], ['t', 'Stärke']]), 'text/csv');
  else if (what === 'shop') download('einkauf.csv', toCSV(shopList(sc, S), [['qty', 'Anzahl'], ['name', 'Artikel'], ['art', 'Artikelnr.'], ['group', 'Gruppe'], ['note', 'Hinweis']]), 'text/csv');
  else {
    const rows = [];
    for (const dr of drills) {
      for (const x of dr.xs) for (const z of dr.zs) rows.push({ part: `${dr.label} ${dr.side}`, kind: 'Lochreihe', x, z: r0(z) });
      for (const p of dr.plates) for (const z of [p.a, p.b]) rows.push({ part: `${dr.label} ${dr.side}`, kind: p.onGrid ? 'Montageplatte (Raster)' : 'Montageplatte (Zusatz)', x: dr.hingeX, z: r0(z) });
    }
    download('bohrplan.csv', toCSV(rows, [['part', 'Seitenwand'], ['kind', 'Art'], ['x', 'ab Vorderkante'], ['z', 'ab Unterkante']]), 'text/csv');
  }
}

let View3D = null;
import('./view3d.js').then(m => { View3D = m.View3D; if (tab === '3d') renderView(); }).catch(err => console.warn('3D nicht verfügbar', err));
const _rv = renderView;
// 3D erst rendern, wenn Modul geladen ist
renderView = function () { if (tab === '3d' && !View3D) { view3d.hidden = false; view.hidden = true; view3d.innerHTML = '<p style="padding:16px">3D wird geladen …</p>'; return; } return _rv(); };

renderAll();
