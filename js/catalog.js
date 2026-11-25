// IKEA PAX / KOMPLEMENT Katalogdaten (Artikelnummern aus "Kaufhilfe PAX/KOMPLEMENT 10/2026", Farbe Weiß
// sofern nicht anders angegeben). Preise sind in der Kaufhilfe nicht enthalten.

export const DOOR_STYLES = {
  forsand_w:   { profile: 'flat', name: 'FORSAND weiß', color: '#f3f2ee', art: { '50x195': '403.910.92', '50x229': '603.910.91', '25x195': '204.236.02', '25x229': '804.236.04' } },
  forsand_ew:  { profile: 'flat', name: 'FORSAND Eicheneffekt weiß lasiert', color: '#dccdb3', art: { '50x195': '904.349.61', '50x229': '304.349.64', '25x195': '004.848.80', '25x229': '804.848.81' } },
  forsand_gb:  { profile: 'flat', name: 'FORSAND graubeige', color: '#bdb3a2', art: { '50x195': '905.109.26', '50x229': '905.109.31', '25x195': '306.329.64', '25x229': '806.329.66' } },
  forsand_dg:  { profile: 'flat', name: 'FORSAND dunkelgrau', color: '#5d5f60', art: { '50x195': '405.109.24', '50x229': '505.109.28', '25x195': '506.329.63', '25x229': '006.329.65' } },
  bergsbo_w:   { profile: 'frame', name: 'BERGSBO weiß', color: '#f5f5f2', art: { '50x195': '202.074.10', '50x229': '301.604.07' } },
  grimo_w:     { profile: 'grooves', name: 'GRIMO weiß', color: '#f4f4f1', art: { '50x195': '403.434.64', '50x229': '903.434.66' } },
  fardal_hw:   { profile: 'flat', name: 'FARDAL Hochglanz weiß', color: '#fbfbfb', art: { '50x195': '901.905.24', '50x229': '801.905.29', '25x195': '703.446.26', '25x229': '503.446.27' } },
  aheim:       { profile: 'mirror', name: 'ÅHEIM Spiegeltür', color: '#c9d6dc', art: { '50x195': '803.319.30', '50x229': '804.100.55', '25x195': '204.148.29', '25x229': '004.148.30' } },
  tyssedal_w:  { profile: 'frame', name: 'TYSSEDAL weiß', color: '#f6f5f1', art: { '50x195': '902.981.24', '50x229': '402.981.26' } },
  reinsvoll_gb:{ profile: 'flat', name: 'REINSVOLL graubeige', color: '#b8ad9b', art: { '50x195': '004.731.41', '50x229': '604.731.38' } },
  tonstad_ew:  { profile: 'frame', name: 'TONSTAD elfenbeinweiß', color: '#eee9dc', art: { '50x195': '705.102.44', '50x229': '905.102.43' } },
  gullaberg_w: { profile: 'frame', frameW: 95, name: 'GULLABERG weiß', color: '#f4f3ef', art: { '50x195': '405.806.67', '50x229': '805.806.65' } },
  bjorneskogen:{ profile: 'grooves', name: 'BJÖRNESKOGEN Nussbaumfurnier', color: '#7a5539', art: { '50x195': '105.966.41', '50x229': '505.966.39' } },
};

export const PROFILES = { flat: 'glatt', frame: 'Rahmen mit Füllung', grooves: 'senkrechte Rillen', mirror: 'Spiegel mit Rahmen' };

export const HINGES = {
  '195': { name: 'KOMPLEMENT Scharnier, sanft schließend (3 St.) – für 195er Türen', art: '002.145.05', pack: 3 },
  '229': { name: 'KOMPLEMENT Scharnier, sanft schließend (4 St.) – für 229er Türen', art: '302.145.04', pack: 4 },
};

const W58 = (a, b, c) => ({ 58: { 50: a, 75: b, 100: c } });
const W58_35 = (a, b, c, d, e, f) => ({ 58: { 50: a, 75: b, 100: c }, 35: { 50: d, 75: e, 100: f } });

// h = belegte Höhe (mm, Darstellung + Kollisionsprüfung), hang = empfohlener freier Hängeraum darunter
export const INTERIOR = {
  shelf:      { name: 'KOMPLEMENT Regalboden', short: 'Boden', h: 16, color: '#f1f1ee', art: W58_35('302.779.59', '902.779.61', '702.779.57', '402.779.92', '702.779.95', '002.779.89') },
  glass:      { name: 'KOMPLEMENT Glaseinlegeboden', short: 'Glasboden', h: 8, color: '#bcd7dd', art: W58('002.576.46', '802.576.47', '702.576.38') },
  rod:        { name: 'KOMPLEMENT Kleiderstange', short: 'Stange', h: 40, hang: 1000, color: '#9aa1a6', art: W58_35('902.568.93', '402.568.95', '302.568.91', '504.464.52', '804.464.55', '104.464.49') },
  pullout:    { name: 'KOMPLEMENT Ausziehboden mit Dämpfer', short: 'Auszug', h: 64, color: '#f1f1ee', art: W58_35('202.463.60', '302.463.74', '702.463.86', '504.339.87', '904.339.90', '204.339.84') },
  drawer:     { name: 'KOMPLEMENT Schublade 17 cm', short: 'Schublade', h: 170, color: '#f4f4f1', art: W58_35('102.463.08', '102.463.32', '902.463.52', '302.467.22', '702.467.44', '702.467.58') },
  drawerFrame:{ name: 'KOMPLEMENT Schublade mit Frontrahmen 17 cm', short: 'Schubl. Rahmen', h: 170, color: '#eeeeea', art: W58_35('704.466.01', '104.466.04', '504.465.98', '804.465.92', '104.465.95', '404.465.89') },
  drawerGlass:{ name: 'KOMPLEMENT Schublade mit Glasfront 17 cm', short: 'Schubl. Glas', h: 170, color: '#d5e5e8', art: W58('702.466.83', '102.466.95', '202.467.08') },
  basket:     { name: 'KOMPLEMENT Netzdrahtkorb 16 cm', short: 'Drahtkorb', h: 160, color: '#c7cbce', art: W58_35('590.109.88', '990.109.91', '990.109.86', '790.109.87', '390.109.89', '190.109.85') },
  trouser:    { name: 'KOMPLEMENT Hosenaufhängung, ausziehbar', short: 'Hosenhalter', h: 60, hang: 650, color: '#a9afb3', art: W58('304.465.37', '704.465.40', '004.465.34') },
  shoe:       { name: 'KOMPLEMENT Schuhregal', short: 'Schuhregal', h: 200, color: '#d8dadb', art: { 35: { 50: '602.572.57', 75: '802.572.61', 100: '502.572.53' } } },
  shoePull:   { name: 'KOMPLEMENT Schuhregal, ausziehbar', short: 'Schuhauszug', h: 200, color: '#d8dadb', art: W58('802.574.64', '302.574.66', '002.574.63') },
  divider:    { name: 'KOMPLEMENT Trenner 100×58 cm, 81,5 cm hoch', short: 'Trenner', h: 815, color: '#f1f1ee', onlyWidth: 100, art: { 58: { 100: '002.464.17' } } },
  hookRail:   { name: 'KOMPLEMENT Hakenleiste, ausziehbar', short: 'Hakenleiste', h: 90, color: '#b5b9bc', anyWidth: true, art: { 58: '802.624.89', 35: '302.569.09' } },
  mirror:     { name: 'KOMPLEMENT Spiegel, ausziehbar 28×130 cm', short: 'Spiegel', h: 1300, color: '#c4d3d9', anyWidth: true, art: { 58: '206.238.75' } },
  ownShelf:   { name: 'Einlegeboden Multiplex (Eigenbau, auf Bodenträgern)', short: 'Boden (EB)', h: 18, color: '#d9bf92', own: true },
  fixShelf:   { name: 'Konstruktionsboden Multiplex (Eigenbau, fest verschraubt)', short: 'Fester Boden', h: 18, color: '#cfb381', own: true },
  ownRod:     { name: 'Kleiderstange Eigenbau (Rohr Ø25 + Stangenhalter)', short: 'Stange (EB)', h: 40, hang: 1000, color: '#9aa1a6', own: true },
};

export const BED_DEFAULT_SHOP = {
  mech: 'Klappbett-Beschlag vertikal (Gasdruckfedern) – nach Bettgewicht auswählen',
  leg: 'Klappfuß / Bettfußleiste für Schrankbett (Paar)',
  straps: 'Matratzenhaltegurte (Paar)',
};

export const MISC = {
  caps: { name: 'VARIERA Abdeckkappe weiß (100 St.)', art: '002.263.15' },
};
