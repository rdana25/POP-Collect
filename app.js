/* =========================================================================
   Cardline — Margin & market monitor
   Demo data + rendering. No network calls: this is a credential-free
   prototype of the Shopify x eBay card margin & price alert app.
   ========================================================================= */

/* ------------------------------- ICONS ---------------------------------- */

const ICONS = {
  up: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M6 14l6-6 6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  down: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M6 10l6 6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  flat: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M6 12h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  refresh: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 8.5l2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  // Direction glyphs for status: a diagonal arrow reads as "market moved", not "on/off".
  bell: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M10.268 21a2 2 0 0 0 3.464 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trendUp: (s = 11) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trendDown: (s = 11) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 9v8H9" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trendFlat: (s = 11) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------- DATA ------------------------------------ */

const CATEGORY_META = {
  pokemon: { label: 'Pokémon TCG', grad: 'cat-pokemon', color: '#3B7DD8' },
  mtg: { label: 'Magic: The Gathering', grad: 'cat-mtg', color: '#6B4FBB' },
  yugioh: { label: 'Yu-Gi-Oh!', grad: 'cat-yugioh', color: '#B07A3E' },
};

// cls drives every colored element: up (opportunity), down (risk), flat (stable).
const STATUS_META = {
  gain: { label: 'Opportunity', headline: 'Price increase opportunity', cls: 'up', icon: ICONS.up, glyph: ICONS.trendUp },
  risk: { label: 'At risk', headline: 'Margin loss warning', cls: 'down', icon: ICONS.down, glyph: ICONS.trendDown },
  stable: { label: 'Stable', headline: 'Stable', cls: 'flat', icon: ICONS.flat, glyph: ICONS.trendFlat },
};

// Status is always shown as a direction, never as a colored dot.
const pillHTML = (meta) => `<span class="pill ${meta.cls}">${meta.glyph(11)}${meta.label}</span>`;
const signalHTML = (meta, text) => `<span class="signal ${meta.cls}">${meta.glyph(12)}${text}</span>`;

// median: the outlier-mitigated figure (median of the last 3-5 sales) that drives
// status/alerts. lastSoldPrice: the single most recent sale. history: weekly
// anchors, oldest first, ending at the current median. image: official card
// scans where a public source exists (Pokémon TCG API, Scryfall); cards without
// one fall back to a tinted monogram slab.
const POKE = (set, n) => `https://images.pokemontcg.io/${set}/${n}.png`;
const YGO = (id) => `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`;
const SCRY = (path) => `https://cards.scryfall.io/small/front/${path}.jpg`;
const CARDS = [
  { id: 'chzx-223', name: 'Charizard ex #223', set: 'Obsidian Flames · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'CHZX-223-P10', mono: 'CE', qty: 1, cost: 210, retail: 389, median: 462, lastSoldPrice: 471, sales: 5, lastSoldDate: 'Sep 6', history: [268, 301, 329, 352, 398, 431, 462], image: POKE('sv3', 223) },
  { id: 'umbv-215', name: 'Umbreon VMAX Alt Art #215', set: 'Evolving Skies · Pokémon TCG', category: 'pokemon', grade: 'PSA 9', sku: 'UMBV-215-P9', mono: 'UV', qty: 1, cost: 735, retail: 799, median: 690, lastSoldPrice: 675, sales: 4, lastSoldDate: 'Sep 7', history: [760, 750, 735, 720, 705, 695, 690], image: POKE('swsh7', 215) },
  { id: 'lugv-186', name: 'Lugia V Alt Art #186', set: 'Silver Tempest · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'LUGV-186-P10', mono: 'LV', qty: 2, cost: 164, retail: 270, median: 315.5, lastSoldPrice: 322, sales: 4, lastSoldDate: 'Sep 7', history: [196, 214, 238, 256, 281, 299, 315.5], image: POKE('swsh12', 186) },
  { id: 'rayq-218', name: 'Rayquaza VMAX Alt Art #218', set: 'Evolving Skies · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'RAYQ-218-P10', mono: 'RV', qty: 1, cost: 640, retail: 900, median: 1240, lastSoldPrice: 1310, sales: 5, lastSoldDate: 'Sep 8', history: [720, 810, 905, 1010, 1120, 1185, 1240], image: POKE('swsh7', 218) },
  { id: 'bewd-lob', name: 'Blue-Eyes White Dragon', set: 'Legend of Blue Eyes 1st Ed · Yu-Gi-Oh!', category: 'yugioh', grade: 'BGS 9.5', sku: 'BEWD-LOB-B95', mono: 'BE', qty: 1, cost: 1200, retail: 1550, median: 1480, lastSoldPrice: 1465, sales: 5, lastSoldDate: 'Sep 5', history: [1330, 1360, 1400, 1430, 1455, 1470, 1480], image: YGO(89631139) },
  { id: 'moxs-unl', name: 'Mox Sapphire', set: 'Unlimited Edition · Magic: The Gathering', category: 'mtg', grade: 'BGS 8.5', sku: 'MOXS-UNL-B85', mono: 'MS', qty: 1, cost: 4200, retail: 5200, median: 4050, lastSoldPrice: 3980, sales: 3, lastSoldDate: 'Sep 4', history: [4700, 4600, 4450, 4300, 4200, 4100, 4050], image: 'https://cards.scryfall.io/small/front/f/7/f7d82f1d-631e-4668-9d10-7bf0ee515267.jpg' },
  { id: 'gira-186', name: 'Giratina V Alt Art #186', set: 'Lost Origin · Pokémon TCG', category: 'pokemon', grade: 'PSA 9', sku: 'GIRA-186-P9', mono: 'GV', qty: 3, cost: 95, retail: 160, median: 210, lastSoldPrice: 215, sales: 5, lastSoldDate: 'Sep 8', history: [128, 142, 158, 175, 188, 199, 210], image: POKE('swsh11', 186) },
  { id: 'ancr-unl', name: 'Ancestral Recall', set: 'Unlimited Edition · Magic: The Gathering', category: 'mtg', grade: 'BGS 8', sku: 'ANCR-UNL-B8', mono: 'AR', qty: 1, cost: 8200, retail: 9800, median: 9400, lastSoldPrice: 9450, sales: 3, lastSoldDate: 'Sep 3', history: [8650, 8800, 8930, 9080, 9200, 9320, 9400], image: SCRY('2/d/2dd41293-d7c8-4422-9f0c-b3e96350f5c9') },
  { id: 'pika-173', name: 'Pikachu #173', set: 'Pokémon 151 · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'PIKA-173-P10', mono: 'PK', qty: 2, cost: 250, retail: 320, median: 400, lastSoldPrice: 412, sales: 5, lastSoldDate: 'Sep 6', history: [298, 315, 332, 354, 371, 388, 400], image: POKE('sv3pt5', 173) },
  { id: 'dmag-lob', name: 'Dark Magician', set: 'Legend of Blue Eyes 1st Ed · Yu-Gi-Oh!', category: 'yugioh', grade: 'PSA 9', sku: 'DMAG-LOB-P9', mono: 'DM', qty: 1, cost: 1450, retail: 1900, median: 1610, lastSoldPrice: 1595, sales: 4, lastSoldDate: 'Sep 2', history: [1700, 1690, 1670, 1655, 1635, 1620, 1610], image: YGO(46986414) },
  { id: 'chzb-004s', name: 'Charizard Shadowless #4', set: 'Base Set · Pokémon TCG', category: 'pokemon', grade: 'PSA 9', sku: 'CHZB-004S-P9', mono: 'CS', qty: 1, cost: 3800, retail: 4600, median: 4550, lastSoldPrice: 4560, sales: 3, lastSoldDate: 'Sep 1', history: [4150, 4230, 4320, 4400, 4470, 4520, 4550], image: POKE('base1', 4) },
  { id: 'moxr-unl', name: 'Mox Ruby', set: 'Unlimited Edition · Magic: The Gathering', category: 'mtg', grade: 'BGS 8', sku: 'MOXR-UNL-B8', mono: 'MR', qty: 1, cost: 2600, retail: 3200, median: 2500, lastSoldPrice: 2470, sales: 4, lastSoldDate: 'Sep 7', history: [2900, 2820, 2720, 2640, 2580, 2530, 2500], image: SCRY('2/1/21b7cbae-6647-4f36-b02d-5535ac88b1a6') },
];

// Plan slider: card capacity → monthly price. The <input type="range"> value
// is this array's index.
const PRICING_TIERS = [
  { limit: 25, price: 9 },
  { limit: 50, price: 14 },
  { limit: 100, price: 19 },
  { limit: 150, price: 28 },
  { limit: 250, price: 35 },
  { limit: 400, price: 50 },
  { limit: 600, price: 80 },
  { limit: 800, price: 99 },
  { limit: 1000, price: 118 },
];
const CURRENT_PLAN_INDEX_DEFAULT = PRICING_TIERS.findIndex((t) => t.limit === 100);

const CURRENCIES = {
  USD: { label: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { label: 'Euro', symbol: '€', decimals: 2 },
  GBP: { label: 'British Pound', symbol: '£', decimals: 2 },
  JPY: { label: 'Japanese Yen', symbol: '¥', decimals: 0 },
  CAD: { label: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
  AUD: { label: 'Australian Dollar', symbol: 'AU$', decimals: 2 },
};

/* ------------------------------- STATE ------------------------------------ */

const state = {
  activeTab: 'overview',
  search: '',
  category: 'all',
  status: 'all',
  sort: 'delta-desc',
  view: 'grid',
  alertFilter: 'all',
  reviewed: new Set(),
  minutesSinceSync: 4,
  syncing: false,
  currency: 'USD',
  planIndex: CURRENT_PLAN_INDEX_DEFAULT,
  currentPlanIndex: CURRENT_PLAN_INDEX_DEFAULT,
  editingId: null,
  expandedId: null,
  chartRange: 30,
};

const activityLog = [
  { text: 'Synced 12 cards against eBay sold listings, 2 new alerts', time: '4m ago', alert: true },
  { text: 'Retail suggestion flagged for Rayquaza VMAX Alt Art #218', time: '22m ago', alert: true },
  { text: 'Manual sync completed by Riccardo', time: '1h ago', alert: false },
  { text: 'Margin warning cleared for Lugia V Alt Art #186', time: '3h ago', alert: false },
  { text: 'Scheduled sync, 12 cards checked, 0 errors', time: '6h ago', alert: false },
];

const syncLog = [
  { time: '09:42 AM', detail: 'Manual sync', result: '12 cards checked · 2 alerts · 3.4s' },
  { time: '07:30 AM', detail: 'Scheduled sync', result: '12 cards checked · 0 alerts · 3.1s' },
  { time: 'Sep 8, 5:30 PM', detail: 'Scheduled sync', result: '12 cards checked · 1 alert · 2.9s' },
  { time: 'Sep 8, 9:15 AM', detail: 'Scheduled sync', result: '12 cards checked · 0 alerts · 3.0s' },
];

/* ---------------------------- CALC HELPERS --------------------------------- */

const moneyStr = (n, decimals) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// fmt: itemized values (card prices, cost, retail) at the currency's precision.
const fmt = (n) => `${CURRENCIES[state.currency].symbol}${moneyStr(n, CURRENCIES[state.currency].decimals)}`;
// fmtWhole: headline totals (portfolio value, plan prices), always whole.
const fmtWhole = (n) => `${CURRENCIES[state.currency].symbol}${moneyStr(Math.round(n), 0)}`;
const pct = (n) => (Math.abs(n) < 0.05 ? '0.0%' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`);
const getStatus = (c) => (c.median > c.retail ? 'gain' : c.median <= c.cost ? 'risk' : 'stable');
const deltaPct = (c) => ((c.median - c.retail) / c.retail) * 100;
const marketMarginPct = (c) => ((c.median - c.cost) / c.median) * 100;
const marketValue = (c) => c.median * c.qty;
const trendCls = (n, eps = 0.05) => (n > eps ? 'up' : n < -eps ? 'down' : 'flat');

function opportunityMath(card) {
  const current = card.retail;
  const suggested = Math.max(1, Math.round(card.median));
  const priceDelta = suggested - current;
  const pctDelta = (priceDelta / current) * 100;
  return { current, suggested, priceDelta, pctDelta, extraPerCard: priceDelta, extraTotal: priceDelta * card.qty };
}

// The headline profit/loss figure for a card's current position.
function pnlInfo(card, status) {
  if (status === 'gain') return { label: 'Opportunity', value: opportunityMath(card).extraTotal, cls: 'up', sign: '+' };
  if (status === 'risk') return { label: 'At risk', value: (card.cost - card.median) * card.qty, cls: 'down', sign: '−' };
  return { label: 'Unrealized profit', value: (card.median - card.cost) * card.qty, cls: 'flat', sign: '+' };
}

/* --------------------------- SERIES & CURVES -------------------------------- */

// Deterministic daily series (90 points) per card, interpolated through its
// weekly anchors with a little seeded noise so the curve reads as real market
// data and stays stable across re-renders. Regenerated when history changes.
const seriesCache = new Map();
function seededRandom(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function monotoneSlopes(ys) {
  const n = ys.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push(ys[i + 1] - ys[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return m;
}
function seriesFor(card) {
  const key = `${card.id}|${card.history.join(',')}`;
  if (seriesCache.has(key)) return seriesCache.get(key);
  const anchors = card.history;
  const N = 90, out = [];
  // The 7 anchors sit at the last 43 days; before that we walk back gently.
  const ax = anchors.map((_, i) => N - 1 - (anchors.length - 1 - i) * 7);
  const m = monotoneSlopes(anchors);
  const rnd = seededRandom(card.id);
  const noiseAmp = 0.0015;
  let backVal = anchors[0];
  const back = [];
  for (let i = ax[0] - 1; i >= 0; i--) { backVal = backVal * (1 + (rnd() - 0.5) * 0.008); back.unshift(backVal); }
  for (let i = 0; i < N; i++) {
    let v;
    if (i < ax[0]) v = back[i];
    else {
      let k = 0; while (k < ax.length - 2 && i > ax[k + 1]) k++;
      const x0 = ax[k], x1 = ax[k + 1], h = x1 - x0, t = (i - x0) / h;
      const y0 = anchors[k], y1 = anchors[k + 1];
      const t2 = t * t, t3 = t2 * t;
      v = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[k + 1];
    }
    const isAnchor = ax.includes(i);
    out.push(isAnchor ? v : v * (1 + (rnd() - 0.5) * 2 * noiseAmp));
  }
  out[N - 1] = card.median;
  seriesCache.set(key, out);
  return out;
}

function smoothPath(pts) {
  // pts: [[x,y]...] → monotone cubic path (no overshoot).
  if (pts.length < 2) return '';
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const m = monotoneSlopes(ys);
  let d = `M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`;
  // m[] is dy per index step and points are evenly spaced, so the tangent
  // offset for one-third of a step is simply m/3 (no multiply by the x step).
  for (let i = 0; i < pts.length - 1; i++) {
    const h = xs[i + 1] - xs[i];
    const c1x = xs[i] + h / 3, c1y = ys[i] + m[i] / 3;
    const c2x = xs[i + 1] - h / 3, c2y = ys[i + 1] - m[i + 1] / 3;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${xs[i + 1].toFixed(2)},${ys[i + 1].toFixed(2)}`;
  }
  return d;
}

function sparkline(card, w, h, cls) {
  const vals = seriesFor(card).slice(-30);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const pad = 2.5;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, pad + (1 - (v - min) / range) * (h - pad * 2)]);
  const last = pts[pts.length - 1];
  const color = cls === 'up' ? 'var(--up)' : cls === 'down' ? 'var(--down)' : 'var(--ink-4)';
  const line = smoothPath(pts);
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path d="${line} L${w},${h} L0,${h} Z" fill="url(#spark-${cls})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.2" fill="${color}"/>
  </svg>`;
}

/* ------------------------------ COMPONENTS ---------------------------------- */

// A graded card in its holder: label strip with the grade, category-tinted
// art window with the card's monogram, sheen sweep on hover.
function slabSVG(card) {
  const cat = CATEGORY_META[card.category];
  const [grader = '', grade = ''] = String(card.grade).split(/\s+/);
  // Label strip mirrors a real grading label: grader at left, barcode ticks, grade at right.
  const bars = [21.5, 23, 24.2, 26, 27.6, 28.6, 30.3].map((x, i) => `<rect x="${x}" y="8.5" width="${i % 3 === 1 ? .9 : .5}" height="6" fill="#fff" opacity=".55"/>`).join('');
  // Art window is true card proportion (63:88) so nothing is cropped.
  return `<svg class="slab" viewBox="0 0 52 80" aria-hidden="true">
    <rect x=".5" y=".5" width="51" height="79" rx="7" fill="#fff" stroke="rgba(14,18,32,.14)"/>
    <rect x="7" y="6" width="38" height="11" rx="2" fill="#0E1220"/>
    <text x="9.5" y="14.2" font-size="5.6" font-weight="700" fill="#fff" letter-spacing=".3">${esc(grader)}</text>
    ${bars}
    <text x="42.8" y="14.4" text-anchor="end" font-size="7.4" font-weight="700" fill="#fff">${esc(grade)}</text>
    <svg x="7" y="20" width="38" height="53" viewBox="0 0 38 53">
      <rect width="38" height="53" rx="2.5" fill="url(#${cat.grad})"/>
      ${card.image
        ? `<image href="${esc(card.image)}" width="38" height="53" preserveAspectRatio="xMidYMid slice"/>`
        : `<rect x="3" y="3" width="32" height="47" rx="2" fill="#fff" opacity=".12"/>
      <text x="19" y="31" text-anchor="middle" font-size="12" font-weight="600" fill="#fff" opacity=".94">${esc(card.mono)}</text>`}
      <rect class="slab-sheen" width="38" height="53" fill="url(#slab-sheen)"/>
    </svg>
    <rect x=".5" y=".5" width="51" height="79" rx="7" fill="url(#slab-shine)"/>
  </svg>`;
}

// Cost → retail band with the market marker. When the market is above retail
// the zone extends green; at or below cost it extends red.
function priceRail(card, status) {
  const vals = [card.cost, card.retail, card.median];
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.18 || hi * 0.1;
  lo -= pad; hi += pad;
  const span = hi - lo || 1;
  const at = (v) => (((v - lo) / span) * 100).toFixed(2);
  const costPct = at(card.cost), retailPct = at(card.retail), medPct = at(card.median);
  const cls = STATUS_META[status].cls;
  let zone = '';
  if (status === 'gain') zone = `<span class="rail-zone up" style="left:${retailPct}%;width:${(medPct - retailPct).toFixed(2)}%"></span>`;
  else if (status === 'risk') zone = `<span class="rail-zone down" style="left:${medPct}%;width:${(costPct - medPct).toFixed(2)}%"></span>`;
  return `<div class="rail-price">
    <div class="rail-track">
      <span class="rail-band" style="left:${costPct}%;width:${(retailPct - costPct).toFixed(2)}%"></span>
      ${zone}
      <span class="rail-tick" style="left:${costPct}%" title="Cost ${fmt(card.cost)}"></span>
      <span class="rail-tick" style="left:${retailPct}%" title="Retail ${fmt(card.retail)}"></span>
      <span class="rail-mark ${cls}" style="left:${medPct}%" title="Market ${fmt(card.median)}"></span>
    </div>
    <div class="rail-labels">
      <span>Cost <b>${fmt(card.cost)}</b></span>
      <span>Retail <b>${fmt(card.retail)}</b></span>
      <span class="lab-market ${cls}">Market <b>${fmt(card.median)}</b></span>
    </div>
  </div>`;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

/* ------------------------------ TEMPLATES ---------------------------------- */

// Shared inline-edit fields for both the grid tile and the list row.
function cardEditFieldsHTML(card) {
  const categoryOptions = Object.entries(CATEGORY_META)
    .map(([key, m]) => `<option value="${key}" ${key === card.category ? 'selected' : ''}>${m.label}</option>`)
    .join('');
  const symbol = CURRENCIES[state.currency].symbol;
  const f = (field) => `data-field="${field}" data-id="${card.id}"`;
  return `
    <label class="field">Card name<input type="text" ${f('name')} value="${esc(card.name)}"></label>
    <div class="form-row">
      <label class="field">Set<input type="text" ${f('set')} value="${esc(card.set)}"></label>
      <label class="field">Grade<input type="text" ${f('grade')} value="${esc(card.grade)}"></label>
    </div>
    <div class="form-row">
      <label class="field">Category<span class="select-wrap"><select ${f('category')}>${categoryOptions}</select></span></label>
      <label class="field">SKU<input type="text" ${f('sku')} value="${esc(card.sku)}" class="mono"></label>
    </div>
    <div class="form-row three">
      <label class="field">Qty<input type="number" min="0" step="1" ${f('qty')} value="${card.qty}"></label>
      <label class="field">Cost (${symbol})<input type="number" min="0" step="0.01" ${f('cost')} value="${card.cost}"></label>
      <label class="field">Retail (${symbol})<input type="number" min="0" step="0.01" ${f('retail')} value="${card.retail}"></label>
    </div>`;
}

// Shared geometry for the hero chart and the expanded-card chart: a market
// line drawn inside the cost→retail band, scaled to fill the height.
function chartGeometry(pts, retailRef, costRef, W, H, top = 10, bottom = 10) {
  const n = pts.length;
  let lo = Math.min(...pts, retailRef, costRef), hi = Math.max(...pts, retailRef, costRef);
  const minSpan = pts[n - 1] * 0.14;
  if (hi - lo < minSpan) { const mid = (hi + lo) / 2; lo = mid - minSpan / 2; hi = mid + minSpan / 2; }
  const pad = (hi - lo) * 0.06;
  lo -= pad; hi += pad;
  const x = (i) => (i / (n - 1)) * W;
  const y = (v) => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  const xy = pts.map((v, i) => [x(i), y(v)]);
  const line = smoothPath(xy);
  return { n, xy, line, area: `${line} L${W},${H} L0,${H} Z`, refY: y(retailRef), costY: y(costRef) };
}

function chartSVG(g, W, H) {
  return `
    <rect class="band" x="0" y="${g.refY.toFixed(1)}" width="${W}" height="${(g.costY - g.refY).toFixed(1)}"/>
    <path class="area" d="${g.area}"/>
    <line class="ref" x1="0" x2="${W}" y1="${g.refY.toFixed(1)}" y2="${g.refY.toFixed(1)}"/>
    <line class="ref cost" x1="0" x2="${W}" y1="${g.costY.toFixed(1)}" y2="${g.costY.toFixed(1)}"/>
    <path class="line" pathLength="1" d="${g.line}"/>`;
}

function cardChartHTML(card) {
  const pts = seriesFor(card);
  const W = 1000, H = 170;
  const g = chartGeometry(pts, card.retail, card.cost, W, H);
  const endTop = `${(g.xy[g.n - 1][1] / H) * 100}%`;
  const labels = [0, 30, 60, 89].map((i) => `<span style="left:${(i / (g.n - 1)) * 100}%">${i === 89 ? 'Today' : dateLabel(89 - i)}</span>`).join('');
  return `
  <div class="card-chart">
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${chartSVG(g, W, H)}</svg>
    <span class="chart-ylabel" style="top:${(g.refY / H) * 100}%">Retail ${fmt(card.retail)}</span>
    <span class="chart-ylabel" style="top:${(g.costY / H) * 100}%">Cost ${fmt(card.cost)}</span>
    <div class="chart-end" style="top:${endTop}"></div>
    <span class="chart-tag" style="top:${endTop}">${fmt(card.median)}</span>
    <div class="chart-labels">${labels}</div>
  </div>`;
}

function cardTileExpandedHTML(card) {
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const d = deltaPct(card);
  const pnl = pnlInfo(card, status);
  const reviewed = state.reviewed.has(card.id);
  let suggest;
  if (status === 'gain') {
    const m = opportunityMath(card);
    suggest = `<div class="alert-suggest up"><b>Reprice to ${fmt(m.suggested)}</b> — ${pct(m.pctDelta)} on each card, +${fmt(m.extraPerCard)} per sale${card.qty > 1 ? `, +${fmt(m.extraTotal)} across ${card.qty} in stock` : ''}.</div>`;
  } else if (status === 'risk') {
    suggest = `<div class="alert-suggest down"><b>Hold or pull the listing.</b> The market is ${fmt(card.cost - card.median)} under what you paid. Wait for sales to recover before repricing, or accept the loss to free up capital.</div>`;
  } else {
    suggest = `<div class="alert-suggest"><b>Inside your margin band.</b> The market sits between your cost and retail price. No action needed.</div>`;
  }
  const first = seriesFor(card)[0];
  const change90 = ((card.median - first) / first) * 100;
  return `
  <article class="card is-expanded" data-id="${card.id}">
    <div class="x-art">${slabSVG(card)}</div>
    <div class="x-main">
      <div class="x-head">
        <div class="x-title">
          <div class="card-name">${esc(card.name)}</div>
          <div class="card-set">${esc(card.set)}</div>
          <div class="card-meta"><span class="t-sym">$${esc(card.sku)}</span><span class="sep"></span><span>${esc(card.grade)}</span><span class="sep"></span><span>Qty ${card.qty}</span><span class="sep"></span><span class="card-status ${meta.cls}">${meta.glyph(11)}${meta.label}</span></div>
        </div>
        <button class="icon-btn x-close" data-close-expand type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="x-price-row">
        <div>
          <div class="card-price">${fmt(card.median)}</div>
          <span class="card-price-label">eBay sold median · <span class="${meta.cls === 'flat' ? '' : meta.cls}" style="font-weight:600">${pct(d)}</span> vs retail</span>
        </div>
        <span class="x-range">${pct(change90)} over 90 days</span>
      </div>
      ${cardChartHTML(card)}
      <div class="stat-row x-stats">
        <div class="stat"><span class="stat-label">Cost</span><span class="stat-value">${fmt(card.cost)}</span><span class="stat-sub">What you paid</span></div>
        <div class="stat"><span class="stat-label">Retail</span><span class="stat-value">${fmt(card.retail)}</span><span class="stat-sub">Listed on Shopify</span></div>
        <div class="stat"><span class="stat-label">Last sold</span><span class="stat-value">${fmt(card.lastSoldPrice)}</span><span class="stat-sub">${esc(card.lastSoldDate)}</span></div>
        <div class="stat"><span class="stat-label">Sales in window</span><span class="stat-value">${card.sales}</span><span class="stat-sub">Median of last ${card.sales}</span></div>
        <div class="stat"><span class="stat-label">Market margin</span><span class="stat-value">${marketMarginPct(card).toFixed(0)}%</span><span class="stat-sub">At today's median</span></div>
        <div class="stat"><span class="stat-label">${pnl.label}</span><span class="stat-value ${pnl.cls === 'flat' ? '' : pnl.cls}">${pnl.sign}${fmt(Math.abs(pnl.value))}</span><span class="stat-sub">${card.qty > 1 ? `${card.qty} in stock` : 'Per card'}</span></div>
      </div>
      ${suggest}
      <div class="x-actions">
        <button class="btn btn-ghost btn-sm" data-refresh="${card.id}" type="button">${ICONS.refresh(13)}<span>Refresh price</span></button>
        <button class="btn btn-ghost btn-sm" data-edit="${card.id}" type="button">${ICONS.edit(13)}<span>Edit card</span></button>
        ${status !== 'stable' ? `<button class="btn ${reviewed ? 'btn-ghost' : 'btn-ink'} btn-sm" data-toggle-reviewed="${card.id}" type="button">${reviewed ? 'Reviewed' : 'Mark reviewed'}</button>` : ''}
      </div>
    </div>
  </article>`;
}

function cardTileHTML(card, index) {
  if (state.editingId === card.id) return cardTileEditHTML(card);
  if (state.expandedId === card.id) return cardTileExpandedHTML(card);
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const d = deltaPct(card);
  const pnl = pnlInfo(card, status);
  return `
  <article class="card" data-id="${card.id}" style="animation-delay:${Math.min(index, 8) * 40}ms">
    <div class="card-art">${slabSVG(card)}</div>
    <div class="card-body">
    <div class="card-top">
      <div class="card-title">
        <div class="card-title-row">
          <div class="card-name">${esc(card.name)}</div>
          <span class="card-status ${meta.cls}">${meta.glyph(11)}${meta.label}</span>
        </div>
        <div class="card-set">${esc(card.set)}</div>
        <div class="card-meta"><span class="t-sym">$${esc(card.sku)}</span><span class="sep"></span><span>${esc(card.grade)}</span><span class="sep"></span><span>Qty ${card.qty}</span></div>
      </div>
    </div>
    <div class="card-price-row">
      <div>
        <div class="card-price">${fmt(card.median)}</div>
        <span class="card-price-label">Market median · <span class="${meta.cls === 'flat' ? '' : meta.cls}" style="font-weight:600">${pct(d)}</span> vs retail</span>
        <span class="card-price-label">Last sold ${fmt(card.lastSoldPrice)} · ${esc(card.lastSoldDate)}</span>
      </div>
      <div class="card-spark">${sparkline(card, 96, 34, meta.cls)}</div>
    </div>
    ${priceRail(card, status)}
    <div class="card-foot">
      <span class="card-pnl ${pnl.cls}"><span>${pnl.label}</span><b>${pnl.sign}${fmt(Math.abs(pnl.value))}</b></span>
      <span class="card-actions">
        <button class="mini-btn" data-refresh="${card.id}" type="button">${ICONS.refresh(13)}<span>Refresh</span></button>
        <button class="mini-btn" data-edit="${card.id}" type="button">${ICONS.edit(13)}<span>Edit</span></button>
      </span>
    </div>
    </div>
  </article>`;
}

function cardTileEditHTML(card) {
  return `
  <article class="card is-editing" data-id="${card.id}">
    <div class="card-art">${slabSVG(card)}</div>
    <div class="card-body">
      <div class="card-title">
        <div class="card-name">${esc(card.name)}</div>
        <div class="card-set">Editing · changes save as you type</div>
      </div>
      <div class="card-edit">${cardEditFieldsHTML(card)}</div>
      <div class="card-edit-foot">
        <span class="card-foot-meta">Esc to close</span>
        <button class="btn btn-ink btn-sm" data-done-edit="${card.id}" type="button">${ICONS.check(13)}<span>Done</span></button>
      </div>
    </div>
  </article>`;
}

function listRowHTML(card) {
  if (state.editingId === card.id) return listRowEditHTML(card);
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const d = deltaPct(card);
  const pnl = pnlInfo(card, status);
  return `
  <div class="row" data-id="${card.id}">
    <div class="row-card">
      ${slabSVG(card)}
      <div style="min-width:0">
        <div class="row-name">${esc(card.name)}</div>
        <div class="row-set">${esc(card.set)} · ${esc(card.grade)}</div>
      </div>
    </div>
    <div class="row-ticker"><span class="t-sym">$${esc(card.sku)}</span><span class="t-spark">${sparkline(card, 36, 16, meta.cls)}</span></div>
    <span class="cell r">${fmt(card.cost)}</span>
    <span class="cell r"><b>${fmt(card.median)}</b><small>Last ${fmt(card.lastSoldPrice)}</small></span>
    <span class="cell r">${fmt(card.retail)}</span>
    <span class="cell r">${fmt(marketValue(card))}</span>
    <span class="cell r">${marketMarginPct(card).toFixed(0)}%</span>
    <span class="cell r ${meta.cls}">${pct(d)}</span>
    <span class="cell r ${pnl.cls}">${pnl.sign}${fmt(Math.abs(pnl.value))}</span>
    <span>${pillHTML(meta)}</span>
    <span class="row-actions">
      <button class="mini-btn" data-refresh="${card.id}" type="button" aria-label="Refresh ${esc(card.name)}">${ICONS.refresh(14)}</button>
      <button class="mini-btn" data-edit="${card.id}" type="button" aria-label="Edit ${esc(card.name)}">${ICONS.edit(14)}</button>
    </span>
  </div>`;
}

function listRowEditHTML(card) {
  return `
  <div class="row is-editing" data-id="${card.id}">
    <div class="form">${cardEditFieldsHTML(card)}</div>
    <div class="row-edit-foot">
      <span class="card-foot-meta">Changes save as you type · Esc to close</span>
      <button class="btn btn-ink btn-sm" data-done-edit="${card.id}" type="button">${ICONS.check(13)}<span>Done</span></button>
    </div>
  </div>`;
}

// Each attention row carries the decision, not just the flag: what to
// reprice to and what it is worth, or how far under cost the card sits.
function attentionHTML(card) {
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const d = deltaPct(card);
  let math;
  if (status === 'gain') {
    const m = opportunityMath(card);
    math = `<b class="up">Reprice to ${fmt(m.suggested)}</b><small>+${fmt(m.extraTotal)} upside${card.qty > 1 ? ` · ${card.qty} in stock` : ''}</small>`;
  } else {
    math = `<b class="down">${fmt((card.cost - card.median) * card.qty)} below cost</b><small>Hold or pull the listing</small>`;
  }
  return `
  <button class="attention" data-goto="${card.id}" type="button">
    ${slabSVG(card)}
    <span class="attention-main">
      <span class="attention-title">${esc(card.name)}</span>
      <span class="attention-sub">${signalHTML(meta, meta.headline)}<span>·</span><span>${esc(card.set.split('·')[0].trim())}</span></span>
    </span>
    <span class="attention-math">${math}</span>
    <span class="attention-value">
      <span class="attention-price">${fmt(card.median)}</span>
      <span class="attention-pct ${meta.cls}">${pct(d)} vs retail</span>
    </span>
  </button>`;
}

function alertHTML(card, index) {
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const reviewed = state.reviewed.has(card.id);
  const d = deltaPct(card);
  const compareLabel = status === 'gain' ? 'Shopify retail' : 'Shopify cost';
  const compareValue = status === 'gain' ? card.retail : card.cost;

  let extra = '', explain = '', suggest = '';
  if (status === 'gain') {
    const m = opportunityMath(card);
    extra = `<div class="alert-figure"><span>Extra profit${card.qty > 1 ? ` · ${card.qty} in stock` : ''}</span><b class="up">+${fmt(m.extraTotal)}</b></div>`;
    explain = `Your last <b>${card.sales} eBay sales</b> settled at a median of <b>${fmt(card.median)}</b>, <b>${pct(d)}</b> above your <b>${fmt(card.retail)}</b> retail price. Demand is running ahead of your price.`;
    suggest = `<div class="alert-suggest up"><b>Reprice to ${fmt(m.suggested)}</b> — ${pct(m.pctDelta)} on each card, +${fmt(m.extraPerCard)} per sale.</div>`;
  } else {
    const gap = card.cost - card.median;
    extra = `<div class="alert-figure"><span>Below cost${card.qty > 1 ? ` · ${card.qty} in stock` : ''}</span><b class="down">−${fmt(gap * card.qty)}</b></div>`;
    explain = `Recent eBay sales have slipped to a median of <b>${fmt(card.median)}</b>, <b>${fmt(gap)}</b> under what you paid. At today's market this card sells at a loss.`;
    suggest = `<div class="alert-suggest down"><b>Hold or pull the listing.</b> Wait for sales to recover before repricing, or accept the loss to free up capital.</div>`;
  }

  return `
  <article class="alert ${reviewed ? 'is-reviewed' : ''}" data-id="${card.id}" style="animation-delay:${Math.min(index, 6) * 50}ms">
    <div class="alert-main">
      <div class="alert-kind">${signalHTML(meta, meta.headline)}<span class="alert-time">Synced ${esc(card.lastSoldDate)}</span></div>
      <div class="alert-card">
        ${slabSVG(card)}
        <div>
          <div class="alert-name">${esc(card.name)} <span>· ${esc(card.grade)}</span></div>
          <div class="alert-set">${esc(card.set)} · <span class="mono">$${esc(card.sku)}</span></div>
        </div>
      </div>
      <div class="alert-figures">
        <div class="alert-figure"><span>eBay sold median</span><b>${fmt(card.median)}</b></div>
        <div class="alert-figure"><span>${compareLabel}</span><b>${fmt(compareValue)}</b></div>
        <div class="alert-figure"><span>Δ vs retail</span><b class="${meta.cls}">${pct(d)}</b></div>
        ${extra}
      </div>
      <p class="alert-explain">${explain}</p>
      ${suggest}
    </div>
    <div class="alert-actions">
      <button class="btn ${reviewed ? 'btn-ghost' : 'btn-ink'} btn-sm" data-toggle-reviewed="${card.id}" type="button">${reviewed ? 'Reviewed' : 'Mark reviewed'}</button>
      <button class="btn btn-ghost btn-sm" data-goto="${card.id}" type="button">View card</button>
    </div>
  </article>`;
}

/* ------------------------------- HERO -------------------------------------- */

function portfolioSeries() {
  const N = 90, out = new Array(N).fill(0);
  CARDS.forEach((c) => { const s = seriesFor(c); for (let i = 0; i < N; i++) out[i] += s[i] * c.qty; });
  return out;
}

function dateLabel(daysAgo) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

let chartModel = null;

function renderHero() {
  const total = CARDS.length;
  const limit = PRICING_TIERS[state.currentPlanIndex].limit;
  const portfolioValue = CARDS.reduce((s, c) => s + marketValue(c), 0);
  const retailValue = CARDS.reduce((s, c) => s + c.retail * c.qty, 0);
  const costValue = CARDS.reduce((s, c) => s + c.cost * c.qty, 0);
  const avgMargin = CARDS.reduce((s, c) => s + marketMarginPct(c), 0) / total;
  const gainCount = CARDS.filter((c) => getStatus(c) === 'gain').length;
  const riskCount = CARDS.filter((c) => getStatus(c) === 'risk').length;

  const series = portfolioSeries();
  const pts = series.slice(-state.chartRange);
  const start = pts[0];
  const change = portfolioValue - start;
  const changePct = (change / start) * 100;
  const cls = trendCls(changePct);

  document.getElementById('heroValue').textContent = fmtWhole(portfolioValue);
  const chip = document.getElementById('heroDelta');
  chip.className = `delta-chip ${cls}`;
  chip.innerHTML = `${cls === 'up' ? ICONS.up(11) : cls === 'down' ? ICONS.down(11) : ''}${pct(changePct)}`;
  document.getElementById('heroSub').innerHTML = `<b>${change >= 0 ? '+' : '−'}${fmtWhole(Math.abs(change))}</b> over the last ${state.chartRange} days · ${total} cards at eBay sold median`;

  const vsRetail = ((portfolioValue - retailValue) / retailValue) * 100;
  const vsCost = ((portfolioValue - costValue) / costValue) * 100;
  const stats = [
    { label: 'Listed at retail', value: fmtWhole(retailValue), sub: `${pct(vsRetail)} market vs retail`, cls: trendCls(vsRetail) },
    { label: 'Cost basis', value: fmtWhole(costValue), sub: `${pct(vsCost)} unrealized`, cls: trendCls(vsCost) },
    { label: 'Avg. market margin', value: `${avgMargin.toFixed(0)}%`, sub: `Across ${total} cards` },
    { label: 'Tracked cards', value: `${total}<small>/ ${limit.toLocaleString('en-US')}</small>`, meter: Math.max(2, (total / limit) * 100) },
    { label: 'Active alerts', value: `${gainCount + riskCount}`, sub: `${gainCount} opportunities · ${riskCount} at risk`, cls: riskCount ? 'down' : 'up' },
  ];
  document.getElementById('statRow').innerHTML = stats.map((s) => `
    <div class="stat">
      <span class="stat-label">${s.label}</span>
      <span class="stat-value">${s.value}</span>
      ${s.meter != null ? `<div class="meter"><div class="meter-fill" style="width:${s.meter}%"></div></div>` : `<span class="stat-sub ${s.cls || ''}">${s.sub}</span>`}
    </div>`).join('');

  renderChart(pts, retailValue, costValue);
}

// Market value drawn inside the portfolio's margin band: cost basis below,
// listed retail above. The same logic as each card's price rail, scaled up.
function renderChart(pts, retailRef, costRef) {
  const svg = document.querySelector('#heroChart .chart-svg');
  const chart = document.getElementById('heroChart');
  const W = 1000, H = 230;
  const g = chartGeometry(pts, retailRef, costRef, W, H);
  const { n, xy, refY, costY } = g;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = chartSVG(g, W, H);

  // Restart the draw animation on re-render.
  const lineEl = svg.querySelector('.line');
  lineEl.style.animation = 'none'; void lineEl.offsetWidth; lineEl.style.animation = '';

  // End marker, value tag, ref label and date labels live in HTML so they never stretch.
  chart.querySelectorAll('.chart-end, .chart-tag, .chart-ylabel').forEach((el) => el.remove());
  const endTop = `${(xy[n - 1][1] / H) * 100}%`;
  const end = document.createElement('div');
  end.className = 'chart-end';
  end.style.top = endTop;
  chart.appendChild(end);
  const tag = document.createElement('span');
  tag.className = 'chart-tag';
  tag.style.top = endTop;
  tag.textContent = fmtWhole(pts[n - 1]);
  chart.appendChild(tag);
  [[refY, `Retail ${fmtWhole(retailRef)}`], [costY, `Cost ${fmtWhole(costRef)}`]].forEach(([yy, text]) => {
    const yl = document.createElement('span');
    yl.className = 'chart-ylabel';
    yl.style.top = `${(yy / H) * 100}%`;
    yl.textContent = text;
    chart.appendChild(yl);
  });

  const maxLabels = chart.clientWidth < 520 ? 3 : 6;
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const labels = [];
  for (let i = 0; i < n; i += step) labels.push(i);
  if (labels[labels.length - 1] !== n - 1) labels.push(n - 1);
  document.getElementById('chartLabels').innerHTML = labels.map((i) => `<span style="left:${(i / (n - 1)) * 100}%">${i === n - 1 ? 'Today' : dateLabel(n - 1 - i)}</span>`).join('');

  chartModel = { pts, xy, n, H, retailRef, costRef };
}

function bindChartCursor() {
  const chart = document.getElementById('heroChart');
  const cursor = document.getElementById('chartCursor');
  const tip = cursor.querySelector('.chart-tip');
  const dot = cursor.querySelector('.chart-cursor-dot');
  function move(e) {
    if (!chartModel) return;
    const rect = chart.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const i = Math.round(ratio * (chartModel.n - 1));
    const v = chartModel.pts[i];
    const left = (i / (chartModel.n - 1)) * 100;
    cursor.hidden = false;
    cursor.style.left = `${left}%`;
    dot.style.top = `${(chartModel.xy[i][1] / chartModel.H) * 100}%`;
    tip.classList.toggle('flip', ratio > 0.68);
    tip.querySelector('.chart-tip-date').textContent = i === chartModel.n - 1 ? 'Today' : dateLabel(chartModel.n - 1 - i);
    tip.querySelector('.chart-tip-value').textContent = fmtWhole(v);
    const diff = v - chartModel.retailRef;
    const gain = v - chartModel.costRef;
    const sub = tip.querySelector('.chart-tip-sub');
    sub.className = `chart-tip-sub ${diff >= 0 ? 'up' : 'down'}`;
    sub.textContent = `${diff >= 0 ? '+' : '−'}${fmtWhole(Math.abs(diff))} vs retail · +${fmtWhole(gain)} over cost`;
  }
  chart.addEventListener('pointermove', move);
  chart.addEventListener('pointerenter', move);
  chart.addEventListener('pointerleave', () => { cursor.hidden = true; });
}

/* ------------------------------- RENDERERS --------------------------------- */

// Decorative ribbon: many hairline curves sharing a drifting centreline,
// spread across a band whose width flips sign so the band twists.
function renderRibbon() {
  const el = document.getElementById('ribbon');
  if (!el) return;
  const W = 760, H = 300, N = 24;
  const paths = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) - 0.5;
    const pts = [];
    for (let x = 0; x <= W; x += 10) {
      const u = x / W;
      // Starts low (behind the hero panel), rises into the open slot on the
      // right, then eases back down toward the edge.
      const s = Math.min(1, Math.max(0, (u - 0.08) / 0.54));
      const rise = s * s * (3 - 2 * s);
      const center = 250 - 172 * rise + 46 * Math.max(0, u - 0.72) / 0.28 + 12 * Math.sin(u * Math.PI * 3.2 + 1.5);
      const width = 130 * Math.cos(u * Math.PI * 1.9 + 0.9);
      const shear = 26 * t * t * Math.sin(u * 5.5 + 1);
      pts.push([x, center + t * width + shear]);
    }
    paths.push(`<path d="${smoothPath(pts)}" opacity="${(0.25 + 0.75 * (1 - Math.abs(t) * 1.4)).toFixed(2)}"/>`);
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="ribbon-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#7A9BFF" stop-opacity="0"/>
        <stop offset=".22" stop-color="#7A9BFF" stop-opacity=".38"/>
        <stop offset=".55" stop-color="#B08CFF" stop-opacity=".34"/>
        <stop offset=".82" stop-color="#5FD3C6" stop-opacity=".3"/>
        <stop offset="1" stop-color="#5FD3C6" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g fill="none" stroke="url(#ribbon-grad)" stroke-width=".7" stroke-linecap="round" vector-effect="non-scaling-stroke">${paths.join('')}</g>
  </svg>`;
}

function renderVault() {
  const sorted = [...CARDS].sort((a, b) => marketValue(b) - marketValue(a));
  const total = sorted.reduce((s, c) => s + marketValue(c), 0);
  document.getElementById('vaultNote').textContent = `${sorted.length} cards · ${fmtWhole(total)} at market · sorted by value`;
  document.getElementById('vaultShelf').innerHTML = sorted.map((card) => {
    const cls = STATUS_META[getStatus(card)].cls;
    return `
    <button class="vault-slot" data-goto="${card.id}" type="button" title="${esc(card.name)}">
      ${slabSVG(card)}
      <span class="vault-name">${esc(card.name)}</span>
      <span class="vault-price">${fmtWhole(card.median)}<i class="${cls}">${pct(deltaPct(card))}</i></span>
    </button>`;
  }).join('');
}

// Market value by category: share bar + rows with 30-day change.
function renderCategories() {
  const groups = Object.keys(CATEGORY_META).map((key) => {
    const cards = CARDS.filter((c) => c.category === key);
    const now = cards.reduce((s, c) => s + marketValue(c), 0);
    const then = cards.reduce((s, c) => s + seriesFor(c)[59] * c.qty, 0);
    return { key, meta: CATEGORY_META[key], cards, now, change: then ? ((now - then) / then) * 100 : 0 };
  }).filter((g) => g.cards.length).sort((a, b) => b.now - a.now);
  const total = groups.reduce((s, g) => s + g.now, 0) || 1;

  document.getElementById('catBar').innerHTML = groups.map((g) => `<span style="width:${((g.now / total) * 100).toFixed(1)}%;background:${g.meta.color}" title="${g.meta.label}"></span>`).join('');
  document.getElementById('catList').innerHTML = groups.map((g) => `
    <div class="cat-row">
      <i class="cat-swatch" style="background:${g.meta.color}"></i>
      <span class="cat-name">${g.meta.label}<small>${g.cards.length} card${g.cards.length === 1 ? '' : 's'} · ${((g.now / total) * 100).toFixed(0)}%</small></span>
      <span class="cat-value">${fmtWhole(g.now)}</span>
      <span class="cat-delta ${trendCls(g.change)}">${pct(g.change)}</span>
    </div>`).join('');
}

function renderAttention() {
  const list = CARDS.filter((c) => getStatus(c) !== 'stable').sort((a, b) => Math.abs(deltaPct(b)) - Math.abs(deltaPct(a))).slice(0, 8);
  const el = document.getElementById('attentionList');
  el.innerHTML = list.length ? list.map(attentionHTML).join('') : `<p class="surface-note" style="padding:8px 0">Nothing needs attention right now.</p>`;
}

function renderActivityList() {
  document.getElementById('activityList').innerHTML = activityLog.slice(0, 4).map((a) => `
    <li class="activity ${a.alert ? 'is-alert' : ''}">
      <span class="activity-icon">${a.alert ? ICONS.bell(13) : ICONS.refresh(13)}</span>
      <span>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </span>
    </li>`).join('');
}

function renderSyncLogList() {
  document.getElementById('syncLog').innerHTML = syncLog.slice(0, 6).map((s) => `
    <div class="sync-row">
      <span class="sync-time">${s.time}</span>
      <span class="sync-kind">${s.detail}</span>
      <span class="sync-result">${s.result}</span>
    </div>`).join('');
}

function renderPlanSliderTicks() {
  document.getElementById('planSliderTicks').innerHTML = PRICING_TIERS.map((tier, i) => `
    <span class="slider-tick" data-idx="${i}">${i === state.currentPlanIndex ? '<span class="tick-current">Current</span>' : ''}${tier.limit.toLocaleString('en-US')}</span>`).join('');
}

function renderPlanSlider() {
  const idx = state.planIndex;
  const tier = PRICING_TIERS[idx];
  const slider = document.getElementById('planSlider');
  slider.value = idx;
  slider.style.setProperty('--fill', `${(idx / (PRICING_TIERS.length - 1)) * 100}%`);
  document.getElementById('planReadoutPrice').innerHTML = `${fmtWhole(tier.price)}<span>/mo</span>`;
  document.getElementById('planReadoutLimit').innerHTML = `Up to <b>${tier.limit.toLocaleString('en-US')}</b> cards tracked`;
  document.querySelectorAll('.slider-tick').forEach((el) => el.classList.toggle('is-active', Number(el.dataset.idx) === idx));
  const switchBtn = document.getElementById('planSwitchBtn');
  const isCurrent = idx === state.currentPlanIndex;
  switchBtn.textContent = isCurrent ? 'Current plan' : `Switch to ${tier.limit.toLocaleString('en-US')} cards · ${fmtWhole(tier.price)}/mo`;
  switchBtn.disabled = isCurrent;
  switchBtn.classList.toggle('btn-ghost', isCurrent);
  switchBtn.classList.toggle('btn-ink', !isCurrent);
}

function updateBillingPanel() {
  const tier = PRICING_TIERS[state.currentPlanIndex];
  document.getElementById('currentPlanHeading').textContent = `${tier.limit.toLocaleString('en-US')} cards · ${fmtWhole(tier.price)}/mo`;
  document.getElementById('currentPlanSub').textContent = 'Renews Oct 9, 2026 · Email, Slack and Discord alerts included';
  document.getElementById('usageNote').textContent = `Tracking more than ${tier.limit.toLocaleString('en-US')} cards? Drag the slider below to move up a tier.`;
}

function getFilteredSortedCards() {
  const q = state.search.trim().toLowerCase();
  const list = CARDS.filter((c) => {
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.set.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q);
    const matchesCategory = state.category === 'all' || c.category === state.category;
    const matchesStatus = state.status === 'all' || getStatus(c) === state.status;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const sorters = {
    'delta-desc': (a, b) => deltaPct(b) - deltaPct(a),
    'delta-asc': (a, b) => deltaPct(a) - deltaPct(b),
    'margin-desc': (a, b) => marketMarginPct(b) - marketMarginPct(a),
    'value-desc': (a, b) => marketValue(b) - marketValue(a),
    'name-asc': (a, b) => a.name.localeCompare(b.name),
  };
  return list.sort(sorters[state.sort]);
}

function renderInventory() {
  const list = getFilteredSortedCards();
  const value = list.reduce((s, c) => s + marketValue(c), 0);
  document.getElementById('resultsCount').textContent = `${list.length} of ${CARDS.length} cards · ${fmtWhole(value)} at market`;
  document.getElementById('emptyState').hidden = list.length !== 0;
  document.getElementById('cardGrid').innerHTML = list.map(cardTileHTML).join('');
  document.getElementById('cardListBody').innerHTML = list.map(listRowHTML).join('');
}

function renderAlerts() {
  let list = CARDS.filter((c) => getStatus(c) !== 'stable');
  if (state.alertFilter === 'gain') list = list.filter((c) => getStatus(c) === 'gain');
  else if (state.alertFilter === 'risk') list = list.filter((c) => getStatus(c) === 'risk');
  else if (state.alertFilter === 'reviewed') list = list.filter((c) => state.reviewed.has(c.id));

  list = [...list].sort((a, b) => {
    const ra = state.reviewed.has(a.id), rb = state.reviewed.has(b.id);
    if (ra !== rb) return ra ? 1 : -1;
    return Math.abs(deltaPct(b)) - Math.abs(deltaPct(a));
  });

  const el = document.getElementById('alertFeed');
  el.innerHTML = list.length ? list.map(alertHTML).join('') : `
    <div class="empty surface">
      <svg viewBox="0 0 48 48" width="44" height="44" fill="none"><circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="1.6"/><path d="M16 24.5l5.5 5.5L32 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h3>No alerts here</h3>
      <p>You're caught up for this filter.</p>
    </div>`;
}

/* ------------------------- INLINE EDIT (no modal) --------------------------- */

function populateSelect(select, includeAll) {
  const options = (includeAll ? ['<option value="all">All categories</option>'] : [])
    .concat(Object.entries(CATEGORY_META).map(([key, meta]) => `<option value="${key}">${meta.label}</option>`));
  select.innerHTML = options.join('');
}

function setExpanded(id) {
  state.expandedId = state.expandedId === id ? null : id;
  renderInventory();
  if (state.expandedId) {
    requestAnimationFrame(() => {
      const el = document.querySelector('.card.is-expanded');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

function startCardEdit(id) {
  if (state.editingId === id) return;
  state.editingId = id;
  state.expandedId = null;
  renderInventory();
  requestAnimationFrame(() => {
    const first = document.querySelector('.card.is-editing input, .row.is-editing input');
    if (first) first.focus();
  });
}

function stopCardEdit() {
  const id = state.editingId;
  if (!id) return;
  state.editingId = null;
  renderAll();
  const card = CARDS.find((c) => c.id === id);
  if (card) showToast(`Saved changes to ${card.name}`);
}

function handleInlineEditInput(e) {
  const el = e.target.closest('[data-field]');
  if (!el || !el.closest('.card.is-editing, .row.is-editing')) return;
  const card = CARDS.find((c) => c.id === el.dataset.id);
  if (!card) return;
  const field = el.dataset.field;
  if (field === 'qty' || field === 'cost' || field === 'retail') {
    const num = parseFloat(el.value);
    if (!isNaN(num) && num >= 0) card[field] = num;
  } else {
    card[field] = el.value;
  }
}

/* --------------------------- BULK EDIT (spreadsheet) ------------------------ */

const sheetTouched = new Set();

function sheetRowHTML(card, index) {
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const categoryOptions = Object.entries(CATEGORY_META)
    .map(([key, m]) => `<option value="${key}" ${key === card.category ? 'selected' : ''}>${m.label}</option>`)
    .join('');
  const f = (field) => `data-field="${field}" data-id="${card.id}"`;
  return `
  <tr data-id="${card.id}">
    <td class="sheet-rownum-cell">${index + 1}</td>
    <td><input type="text" value="${esc(card.name)}" ${f('name')}></td>
    <td><input type="text" value="${esc(card.set)}" ${f('set')}></td>
    <td><select ${f('category')}>${categoryOptions}</select></td>
    <td><input type="text" value="${esc(card.grade)}" ${f('grade')}></td>
    <td><input type="text" value="${esc(card.sku)}" ${f('sku')} class="mono"></td>
    <td><input type="number" min="0" step="1" value="${card.qty}" ${f('qty')}></td>
    <td><input type="number" min="0" step="0.01" value="${card.cost}" ${f('cost')}></td>
    <td><input type="number" min="0" step="0.01" value="${card.retail}" ${f('retail')}></td>
    <td class="readonly r sheet-median">${fmt(card.median)}</td>
    <td class="readonly r sheet-margin">${marketMarginPct(card).toFixed(0)}%</td>
    <td class="readonly sheet-status">${pillHTML(meta)}</td>
  </tr>`;
}

function renderSheet() {
  document.getElementById('sheetBody').innerHTML = CARDS.map(sheetRowHTML).join('');
}

function updateSheetRowComputed(card) {
  const row = document.querySelector(`#sheetBody tr[data-id="${card.id}"]`);
  if (!row) return;
  const meta = STATUS_META[getStatus(card)];
  row.querySelector('.sheet-median').textContent = fmt(card.median);
  row.querySelector('.sheet-margin').textContent = `${marketMarginPct(card).toFixed(0)}%`;
  row.querySelector('.sheet-status').innerHTML = pillHTML(meta);
}

function handleSheetInput(e) {
  const el = e.target.closest('[data-field]');
  if (!el) return;
  const card = CARDS.find((c) => c.id === el.dataset.id);
  if (!card) return;
  const field = el.dataset.field;
  if (field === 'qty' || field === 'cost' || field === 'retail') {
    const num = parseFloat(el.value);
    if (!isNaN(num) && num >= 0) card[field] = num;
  } else {
    card[field] = el.value;
  }
  sheetTouched.add(card.id);
  updateSheetRowComputed(card);
}

function enterSheetMode() {
  sheetTouched.clear();
  document.querySelector('#tab-inventory .toolbar').hidden = true;
  document.getElementById('editAllBtn').hidden = true;
  document.getElementById('cardGrid').hidden = true;
  document.getElementById('cardList').hidden = true;
  document.getElementById('emptyState').hidden = true;
  renderSheet();
  document.getElementById('sheetView').hidden = false;
}

function exitSheetMode() {
  document.getElementById('sheetView').hidden = true;
  document.querySelector('#tab-inventory .toolbar').hidden = false;
  document.getElementById('editAllBtn').hidden = false;
  document.getElementById('cardGrid').hidden = state.view !== 'grid';
  document.getElementById('cardList').hidden = state.view !== 'list';
  renderAll();
  showToast(sheetTouched.size ? `Saved changes to ${sheetTouched.size} card${sheetTouched.size > 1 ? 's' : ''}` : 'No changes made');
}

function updateNavBadges() {
  const unreviewed = CARDS.filter((c) => getStatus(c) !== 'stable' && !state.reviewed.has(c.id)).length;
  document.getElementById('navInventoryCount').textContent = CARDS.length;
  const badge = document.getElementById('navAlertsBadge');
  badge.textContent = unreviewed;
  badge.style.display = unreviewed ? '' : 'none';
  const notif = document.getElementById('notifDot');
  notif.textContent = unreviewed;
  notif.style.display = unreviewed ? '' : 'none';
}

function updatePlanWidgets() {
  const limit = PRICING_TIERS[state.currentPlanIndex].limit;
  const usedPct = Math.max(2, (CARDS.length / limit) * 100);
  document.getElementById('planRing').style.strokeDashoffset = `${100 - Math.max(5, usedPct)}`;
  document.getElementById('planMeterLabel').textContent = `${CARDS.length} of ${limit.toLocaleString('en-US')}`;
  document.getElementById('usageSkuFill').style.width = `${usedPct}%`;
  document.getElementById('usageSkuLabel').textContent = `${CARDS.length} / ${limit.toLocaleString('en-US')}`;
  document.getElementById('metaMapped').textContent = `${CARDS.length} products`;
}

function updateSyncPill() {
  const m = state.minutesSinceSync;
  const text = m < 1 ? 'Synced just now' : `Synced ${m} min ago`;
  document.getElementById('syncPillText').textContent = text;
  document.getElementById('metaLastSync').textContent = m < 1 ? 'Just now' : `${m} minutes ago`;
}

function renderAll() {
  renderHero();
  renderVault();
  renderCategories();
  renderAttention();
  renderInventory();
  renderAlerts();
  updateNavBadges();
  updatePlanWidgets();
}

/* ------------------------------- TABS -------------------------------------- */

const TABS = ['overview', 'inventory', 'alerts', 'sync', 'billing', 'settings'];

function setActiveTab(tab) {
  if (!TABS.includes(tab)) return;
  state.activeTab = tab;
  document.querySelectorAll('.nav-item[data-tab], .tabbar-item[data-tab]').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('is-active', p.id === `tab-${tab}`));
  document.getElementById('avatarBtn').classList.toggle('is-active', tab === 'billing' || tab === 'settings');
  if (tab === 'alerts') document.getElementById('notifDot').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function jumpToCard(id) {
  const card = CARDS.find((c) => c.id === id);
  if (!card) return;
  setActiveTab('inventory');
  state.search = card.sku;
  state.category = 'all';
  state.status = 'all';
  state.expandedId = id;
  state.editingId = null;
  document.getElementById('inventorySearch').value = card.sku;
  document.getElementById('globalSearch').value = '';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterStatus').value = 'all';
  renderInventory();
}

/* --------------------------------- SYNC ------------------------------------- */

function driftCard(card) {
  const drift = Math.random() * 0.07 - 0.035;
  card.median = Math.max(5, +(card.median * (1 + drift)).toFixed(2));
  card.history = [...card.history.slice(1), card.median];
  const saleDrift = Math.random() * 0.06 - 0.03;
  card.lastSoldPrice = Math.max(5, +(card.median * (1 + saleDrift)).toFixed(2));
  card.lastSoldDate = 'Just now';
}

function addActivityEntry(text, alert) {
  activityLog.unshift({ text, time: 'Just now', alert });
  activityLog.length = Math.min(activityLog.length, 8);
  renderActivityList();
}
function addSyncLogEntry(detail, result) {
  syncLog.unshift({ time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), detail, result });
  syncLog.length = Math.min(syncLog.length, 8);
  renderSyncLogList();
}

function handleSyncNow() {
  if (state.syncing) return;
  state.syncing = true;
  const btn = document.getElementById('syncNowBtn');
  btn.classList.add('is-loading');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Syncing';
  document.body.classList.add('is-syncing');
  document.getElementById('syncPillText').textContent = 'Checking eBay sold listings';

  setTimeout(() => {
    let newAlerts = 0;
    CARDS.forEach((c) => {
      const prev = getStatus(c);
      driftCard(c);
      const next = getStatus(c);
      if (next !== 'stable' && next !== prev) newAlerts++;
    });
    state.minutesSinceSync = 0;
    updateSyncPill();
    renderAll();
    addSyncLogEntry('Manual sync', `${CARDS.length} cards checked · ${newAlerts} alert${newAlerts === 1 ? '' : 's'} · ${(2 + Math.random() * 1.5).toFixed(1)}s`);
    addActivityEntry(`Manual sync completed, ${CARDS.length} cards checked${newAlerts ? `, ${newAlerts} new alert${newAlerts > 1 ? 's' : ''}` : ''}`, newAlerts > 0);
    showToast(newAlerts ? `Synced ${CARDS.length} cards · ${newAlerts} new alert${newAlerts > 1 ? 's' : ''}` : `Synced ${CARDS.length} cards · no new alerts`);

    btn.classList.remove('is-loading');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sync now';
    document.body.classList.remove('is-syncing');
    state.syncing = false;
  }, 1400);
}

function handleCardRefresh(id, btnEl) {
  const card = CARDS.find((c) => c.id === id);
  if (!card || !btnEl) return;
  btnEl.classList.add('is-syncing');
  btnEl.disabled = true;
  setTimeout(() => {
    driftCard(card);
    renderAll();
    showToast(`Refreshed $${card.sku} · market median now ${fmt(card.median)}`);
  }, 650);
}

/* -------------------------------- EVENTS ------------------------------------ */

function populateCurrencySelect() {
  const select = document.getElementById('currencySelect');
  select.innerHTML = Object.entries(CURRENCIES)
    .map(([code, c]) => `<option value="${code}" ${code === state.currency ? 'selected' : ''}>${c.label} (${c.symbol}) — ${code}</option>`)
    .join('');
}

function bindEvents() {
  // collapsible rail, remembered across reloads
  const app = document.querySelector('.app');
  const railToggle = document.getElementById('railToggle');
  function setRail(collapsed) {
    app.classList.toggle('rail-collapsed', collapsed);
    railToggle.setAttribute('aria-expanded', String(!collapsed));
    railToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    try { localStorage.setItem('cardline.rail', collapsed ? 'collapsed' : 'open'); } catch (_) {}
  }
  let railPref = 'open';
  try { railPref = localStorage.getItem('cardline.rail') || 'open'; } catch (_) {}
  setRail(railPref === 'collapsed');
  railToggle.addEventListener('click', () => setRail(!app.classList.contains('rail-collapsed')));
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (!typing && e.key === '[' ) setRail(!app.classList.contains('rail-collapsed'));
  });

  // nav, mobile tab bar and in-page links
  document.querySelectorAll('.nav-item[data-tab], .tabbar-item[data-tab]').forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
  document.querySelectorAll('[data-tab-link]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); setActiveTab(el.dataset.tabLink); }));

  // chart range
  document.getElementById('chartRange').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    state.chartRange = Number(btn.dataset.range);
    document.querySelectorAll('#chartRange button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderHero();
  });
  bindChartCursor();

  // global search jumps into inventory; "/" focuses it
  const globalSearch = document.getElementById('globalSearch');
  globalSearch.addEventListener('input', (e) => {
    const v = e.target.value;
    if (v && state.activeTab !== 'inventory') setActiveTab('inventory');
    state.search = v;
    document.getElementById('inventorySearch').value = v;
    renderInventory();
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (e.key === '/' && !typing) { e.preventDefault(); globalSearch.focus(); }
  });

  // inventory toolbar
  document.getElementById('inventorySearch').addEventListener('input', (e) => { state.search = e.target.value; renderInventory(); });
  document.getElementById('filterCategory').addEventListener('change', (e) => { state.category = e.target.value; renderInventory(); });
  document.getElementById('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; renderInventory(); });
  document.getElementById('sortBy').addEventListener('change', (e) => { state.sort = e.target.value; renderInventory(); });
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.search = ''; state.category = 'all'; state.status = 'all';
    document.getElementById('inventorySearch').value = '';
    document.getElementById('globalSearch').value = '';
    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    renderInventory();
  });

  // view toggle
  const gridBtn = document.getElementById('viewGridBtn');
  const listBtn = document.getElementById('viewListBtn');
  function setView(view) {
    state.view = view;
    gridBtn.setAttribute('aria-pressed', String(view === 'grid'));
    listBtn.setAttribute('aria-pressed', String(view === 'list'));
    document.getElementById('cardGrid').hidden = view !== 'grid';
    document.getElementById('cardList').hidden = view !== 'list';
  }
  gridBtn.addEventListener('click', () => setView('grid'));
  listBtn.addEventListener('click', () => setView('list'));

  // card refresh + inline edit (delegated, survives re-renders)
  document.getElementById('tab-inventory').addEventListener('click', (e) => {
    const refreshBtn = e.target.closest('[data-refresh]');
    if (refreshBtn) { handleCardRefresh(refreshBtn.dataset.refresh, refreshBtn); return; }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { startCardEdit(editBtn.dataset.edit); return; }
    const doneBtn = e.target.closest('[data-done-edit]');
    if (doneBtn) { stopCardEdit(); return; }
    const reviewBtn = e.target.closest('[data-toggle-reviewed]');
    if (reviewBtn) {
      const id = reviewBtn.dataset.toggleReviewed;
      if (state.reviewed.has(id)) state.reviewed.delete(id); else state.reviewed.add(id);
      renderInventory(); renderAlerts(); updateNavBadges();
      return;
    }
    if (e.target.closest('[data-close-expand]')) { setExpanded(state.expandedId); return; }
    // Clicking a tile (anywhere that isn't a control) expands it in place.
    const tile = e.target.closest('.card');
    if (tile && !tile.classList.contains('is-editing') && !e.target.closest('button, input, select, a, label')) {
      if (window.getSelection && String(window.getSelection()).length) return;
      setExpanded(tile.dataset.id);
    }
  });
  document.getElementById('tab-inventory').addEventListener('input', handleInlineEditInput);
  document.getElementById('tab-inventory').addEventListener('change', handleInlineEditInput);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.editingId) stopCardEdit();
    else if (state.expandedId) setExpanded(state.expandedId);
  });

  // edit all → spreadsheet
  document.getElementById('editAllBtn').addEventListener('click', enterSheetMode);
  document.getElementById('doneEditingBtn').addEventListener('click', exitSheetMode);
  document.getElementById('sheetBody').addEventListener('input', handleSheetInput);
  document.getElementById('sheetBody').addEventListener('change', handleSheetInput);

  // account menu
  const avatarBtn = document.getElementById('avatarBtn');
  const accountDropdown = document.getElementById('accountDropdown');
  function closeAccountMenu() { accountDropdown.hidden = true; avatarBtn.setAttribute('aria-expanded', 'false'); }
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = accountDropdown.hidden;
    accountDropdown.hidden = !willOpen;
    avatarBtn.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (e) => { if (!accountDropdown.hidden && !document.getElementById('accountMenu').contains(e.target)) closeAccountMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !accountDropdown.hidden) closeAccountMenu(); });
  accountDropdown.addEventListener('click', (e) => { if (e.target.closest('[data-tab-link]')) closeAccountMenu(); });
  document.getElementById('logoutBtn').addEventListener('click', () => { closeAccountMenu(); showToast('Log out is not wired up in this prototype.'); });

  // vault shelf scrolling
  const shelf = document.getElementById('vaultShelf');
  document.getElementById('vaultPrev').addEventListener('click', () => shelf.scrollBy({ left: -shelf.clientWidth * 0.8, behavior: 'smooth' }));
  document.getElementById('vaultNext').addEventListener('click', () => shelf.scrollBy({ left: shelf.clientWidth * 0.8, behavior: 'smooth' }));

  // overview: jump to card
  document.getElementById('tab-overview').addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) jumpToCard(goto.dataset.goto);
  });

  // alerts
  document.getElementById('alertFilterChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#alertFilterChips .chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.alertFilter = chip.dataset.filter;
    renderAlerts();
  });
  document.getElementById('alertFeed').addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) { jumpToCard(goto.dataset.goto); return; }
    const toggle = e.target.closest('[data-toggle-reviewed]');
    if (toggle) {
      const id = toggle.dataset.toggleReviewed;
      if (state.reviewed.has(id)) state.reviewed.delete(id); else state.reviewed.add(id);
      renderAlerts();
      updateNavBadges();
    }
  });

  // sync
  document.getElementById('syncNowBtn').addEventListener('click', handleSyncNow);
  document.getElementById('notifBtn').addEventListener('click', () => setActiveTab('alerts'));
  document.getElementById('storeSwitcher').addEventListener('click', () => showToast('Multi-store switching is available on the Enterprise plan.'));
  document.querySelectorAll('.connection .btn').forEach((btn) => {
    btn.addEventListener('click', () => showToast(btn.textContent.includes('Reauthorize') ? 'Shopify connection looks good. No action needed.' : 'eBay API test succeeded, 42ms response.'));
  });
  document.querySelector('.destinations').addEventListener('click', (e) => {
    const sw = e.target.closest('.switch');
    if (!sw) return;
    const isOn = sw.classList.toggle('is-on');
    sw.setAttribute('aria-checked', String(isOn));
    const label = sw.closest('.destination').querySelector('.destination-label').textContent.trim();
    showToast(`${label} alerts turned ${isOn ? 'on' : 'off'}.`);
  });

  // billing: plan slider
  document.getElementById('planSlider').addEventListener('input', (e) => { state.planIndex = parseInt(e.target.value, 10); renderPlanSlider(); });
  document.getElementById('planSwitchBtn').addEventListener('click', () => {
    if (state.planIndex === state.currentPlanIndex) return;
    state.currentPlanIndex = state.planIndex;
    updateBillingPanel();
    updatePlanWidgets();
    renderHero();
    renderPlanSliderTicks();
    renderPlanSlider();
    const tier = PRICING_TIERS[state.currentPlanIndex];
    showToast(`Switched to the ${tier.limit.toLocaleString('en-US')}-card plan, ${fmtWhole(tier.price)}/mo.`);
  });
  document.querySelector('.current-plan .btn').addEventListener('click', () => showToast("Opening Shopify's subscription management page."));

  // account settings
  document.getElementById('registrationForm').addEventListener('submit', (e) => { e.preventDefault(); showToast('Saved business registration details.'); });
  document.getElementById('accountForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('acctName').value.trim();
    const email = document.getElementById('acctEmail').value.trim();
    if (name) document.querySelector('.account-name').textContent = name;
    if (email) document.querySelector('.account-email').textContent = email;
    showToast('Saved account details.');
  });
  document.getElementById('passwordForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newPw = document.getElementById('pwNew').value;
    const confirmPw = document.getElementById('pwConfirm').value;
    if (newPw !== confirmPw) { showToast("New password and confirmation don't match."); return; }
    if (newPw.length < 8) { showToast('Use at least 8 characters for your new password.'); return; }
    e.target.reset();
    showToast('Password updated.');
  });
  document.getElementById('currencySelect').addEventListener('change', (e) => {
    state.currency = e.target.value;
    renderAll();
    renderPlanSlider();
    updateBillingPanel();
    const c = CURRENCIES[state.currency];
    showToast(`Prices now shown in ${c.label} (${c.symbol}).`);
  });
}

/* --------------------------------- INIT -------------------------------------- */

function init() {
  renderRibbon();
  populateSelect(document.getElementById('filterCategory'), true);
  populateCurrencySelect();
  bindEvents();
  renderActivityList();
  renderSyncLogList();
  renderPlanSliderTicks();
  renderPlanSlider();
  updateBillingPanel();
  renderAll();
  updateSyncPill();
  setInterval(() => { state.minutesSinceSync++; updateSyncPill(); }, 60000);
}

init();
