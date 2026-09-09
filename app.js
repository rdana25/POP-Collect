/* =========================================================================
   Cardline — Margin & Market Monitor
   Demo data + rendering. No network calls: this is a credential-free
   prototype of the Shopify x eBay card margin & price alert app.
   ========================================================================= */

/* ------------------------------- ICONS ---------------------------------- */

const ICONS = {
  up: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M4 17L10 10L14 14L20 6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 6h6v6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  down: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M4 7L10 14L14 10L20 18" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 18h6v-6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  flat: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M4 12h16" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>`,
  refresh: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0113.7-5.7M20 12a8 8 0 01-13.7 5.7M17 4v3.3h-3.3M7 20v-3.3h3.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  grid: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/></svg>`,
  dollar: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 6.7c0-1.9-2.2-3.4-5-3.4s-5 1.3-5 3.2c0 4 10 1.9 10 6 0 1.9-2.2 3.5-5 3.5s-5-1.6-5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  percent: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><circle cx="7.5" cy="7.5" r="2.6" stroke="currentColor" stroke-width="1.8"/><circle cx="16.5" cy="16.5" r="2.6" stroke="currentColor" stroke-width="1.8"/><path d="M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  bell: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M12 4v2M12 4a6 6 0 016 6c0 3.2.8 4.6 1.6 5.6.3.4 0 1-.5 1H4.9c-.5 0-.8-.6-.5-1C5.2 14.6 6 13.2 6 10a6 6 0 016-6zM9.5 19a2.6 2.6 0 005 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l11-11a2.1 2.1 0 00-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
};

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ------------------------------- DATA ------------------------------------ */

const CATEGORY_META = {
  pokemon: { label: 'Pokémon TCG', c1: 'var(--cat-pokemon-1)', c2: 'var(--cat-pokemon-2)' },
  basketball: { label: 'Basketball', c1: 'var(--cat-basketball-1)', c2: 'var(--cat-basketball-2)' },
  baseball: { label: 'Baseball', c1: 'var(--cat-baseball-1)', c2: 'var(--cat-baseball-2)' },
  mtg: { label: 'Magic: The Gathering', c1: 'var(--cat-mtg-1)', c2: 'var(--cat-mtg-2)' },
  onepiece: { label: 'One Piece TCG', c1: 'var(--cat-onepiece-1)', c2: 'var(--cat-onepiece-2)' },
};

const STATUS_META = {
  gain: { label: 'Opportunity', flagLabel: 'Price opportunity', flagClass: 'good', deltaClass: 'good', pillClass: 'status-good', icon: ICONS.up },
  risk: { label: 'At risk', flagLabel: 'Margin risk', flagClass: 'critical', deltaClass: 'critical', pillClass: 'status-critical', icon: ICONS.down },
  stable: { label: 'Stable', flagLabel: 'Stable', flagClass: 'stable', deltaClass: 'neutral', pillClass: 'status-neutral', icon: ICONS.flat },
};

// median: the outlier-mitigated figure (median of the last 3-5 sales) that drives
// status/alerts, per the spec. lastSoldPrice: the single most recent sale — shown
// alongside median so it's clear why the smoothed figure can differ from it.
const CARDS = [
  { id: 'chzx-199', name: 'Charizard ex #199', set: 'Obsidian Flames · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'CHZX-199-P10', mono: 'CE', qty: 1, cost: 210, retail: 389, median: 462, lastSoldPrice: 471, sales: 5, lastSoldDate: 'Sep 6', history: [268, 301, 329, 352, 398, 431, 462] },
  { id: 'umbv-215', name: 'Umbreon VMAX Alt Art #215', set: 'Evolving Skies · Pokémon TCG', category: 'pokemon', grade: 'PSA 9', sku: 'UMBV-215-P9', mono: 'UV', qty: 1, cost: 735, retail: 799, median: 690, lastSoldPrice: 675, sales: 4, lastSoldDate: 'Sep 7', history: [810, 795, 772, 748, 726, 705, 690] },
  { id: 'lugv-186', name: 'Lugia V Alt Art #186', set: 'Silver Tempest · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'LUGV-186-P10', mono: 'LV', qty: 2, cost: 164, retail: 270, median: 315.5, lastSoldPrice: 322, sales: 4, lastSoldDate: 'Sep 7', history: [196, 214, 238, 256, 281, 299, 315.5] },
  { id: 'wemb-299', name: 'Victor Wembanyama RC #299', set: '2023 Prizm · Basketball', category: 'basketball', grade: 'PSA 10', sku: 'WEMB-299-P10', mono: 'VW', qty: 1, cost: 640, retail: 900, median: 1240, lastSoldPrice: 1310, sales: 5, lastSoldDate: 'Sep 8', history: [720, 810, 905, 1010, 1120, 1185, 1240] },
  { id: 'ohtn-001', name: 'Shohei Ohtani RC', set: '2018 Bowman Chrome · Baseball', category: 'baseball', grade: 'BGS 9.5', sku: 'OHTN-001-B95', mono: 'SO', qty: 1, cost: 1200, retail: 1550, median: 1480, lastSoldPrice: 1465, sales: 5, lastSoldDate: 'Sep 5', history: [1390, 1420, 1465, 1510, 1495, 1470, 1480] },
  { id: 'moxs-unl', name: 'Mox Sapphire', set: 'Unlimited Edition · Magic: The Gathering', category: 'mtg', grade: 'BGS 8.5', sku: 'MOXS-UNL-B85', mono: 'MS', qty: 1, cost: 4200, retail: 5200, median: 4050, lastSoldPrice: 3980, sales: 3, lastSoldDate: 'Sep 4', history: [5100, 4950, 4700, 4500, 4300, 4150, 4050] },
  { id: 'lufy-aa', name: 'Monkey D. Luffy Alt Art', set: 'Wings of the Captain · One Piece TCG', category: 'onepiece', grade: 'PSA 10', sku: 'LUFY-AA-P10', mono: 'ML', qty: 3, cost: 95, retail: 160, median: 210, lastSoldPrice: 215, sales: 5, lastSoldDate: 'Sep 8', history: [128, 142, 158, 175, 188, 199, 210] },
  { id: 'jrdn-057', name: 'Michael Jordan RC #57', set: '1986 Fleer · Basketball', category: 'basketball', grade: 'PSA 8', sku: 'JRDN-057-P8', mono: 'MJ', qty: 1, cost: 8200, retail: 9800, median: 9400, lastSoldPrice: 9450, sales: 3, lastSoldDate: 'Sep 3', history: [9050, 9150, 9280, 9360, 9300, 9350, 9400] },
  { id: 'pika-173', name: 'Pikachu #173', set: 'Pokémon 151 · Pokémon TCG', category: 'pokemon', grade: 'PSA 10', sku: 'PIKA-173-P10', mono: 'PK', qty: 2, cost: 250, retail: 320, median: 400, lastSoldPrice: 412, sales: 5, lastSoldDate: 'Sep 6', history: [298, 315, 332, 354, 371, 388, 400] },
  { id: 'grif-001', name: 'Ken Griffey Jr RC #1', set: '1989 Upper Deck · Baseball', category: 'baseball', grade: 'PSA 10', sku: 'GRIF-001-P10', mono: 'KG', qty: 1, cost: 1450, retail: 1900, median: 1610, lastSoldPrice: 1595, sales: 4, lastSoldDate: 'Sep 2', history: [1720, 1695, 1670, 1650, 1630, 1615, 1610] },
  { id: 'chzb-004s', name: 'Charizard Shadowless #4', set: 'Base Set · Pokémon TCG', category: 'pokemon', grade: 'PSA 9', sku: 'CHZB-004S-P9', mono: 'CS', qty: 1, cost: 3800, retail: 4600, median: 4550, lastSoldPrice: 4560, sales: 3, lastSoldDate: 'Sep 1', history: [4420, 4470, 4510, 4530, 4545, 4548, 4550] },
  { id: 'kobe-138', name: 'Kobe Bryant RC #138', set: '1996 Topps Chrome · Basketball', category: 'basketball', grade: 'PSA 10', sku: 'KOBE-138-P10', mono: 'KB', qty: 1, cost: 2600, retail: 3200, median: 2500, lastSoldPrice: 2470, sales: 4, lastSoldDate: 'Sep 7', history: [3050, 2950, 2820, 2700, 2610, 2550, 2500] },
];

// Draggable plan slider: card capacity → monthly price. Index order matters —
// the slider's native <input type="range"> value is this array's index.
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
const CURRENT_PLAN_INDEX_DEFAULT = PRICING_TIERS.findIndex((t) => t.limit === 800);

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
};

const activityLog = [
  { text: 'Synced 12 SKUs against eBay sold listings — 2 new alerts', time: '4m ago', alert: true },
  { text: 'Retail suggestion flagged for Victor Wembanyama RC #299', time: '22m ago', alert: true },
  { text: 'Manual sync completed by Riccardo', time: '1h ago', alert: false },
  { text: 'Margin warning cleared for Lugia V Alt Art #186', time: '3h ago', alert: false },
  { text: 'Scheduled sync — 214 SKUs checked, 0 errors', time: '6h ago', alert: false },
];

const syncLog = [
  { time: '09:42 AM', detail: 'Manual sync', result: '12 SKUs checked · 2 alerts generated · 3.4s' },
  { time: '07:30 AM', detail: 'Scheduled sync', result: '12 SKUs checked · 0 alerts generated · 3.1s' },
  { time: 'Sep 8, 5:30 PM', detail: 'Scheduled sync', result: '12 SKUs checked · 1 alert generated · 2.9s' },
  { time: 'Sep 8, 9:15 AM', detail: 'Scheduled sync', result: '12 SKUs checked · 0 alerts generated · 3.0s' },
];

/* ---------------------------- CALC HELPERS --------------------------------- */

const moneyStr = (n, decimals) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// fmt: itemized monetary values (card prices, cost, retail, alert math) — respects the
// selected currency's normal decimal precision (e.g. 2 for USD, 0 for JPY).
const fmt = (n) => `${CURRENCIES[state.currency].symbol}${moneyStr(n, CURRENCIES[state.currency].decimals)}`;
// fmtWhole: rounded headline figures (KPI totals, plan prices) — always whole numbers,
// regardless of currency, since these are display totals rather than exact prices.
const fmtWhole = (n) => `${CURRENCIES[state.currency].symbol}${moneyStr(Math.round(n), 0)}`;
const pct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const getStatus = (c) => (c.median > c.retail ? 'gain' : c.median <= c.cost ? 'risk' : 'stable');
const deltaPct = (c) => ((c.median - c.retail) / c.retail) * 100;
const marketMarginPct = (c) => ((c.median - c.cost) / c.median) * 100;
const marketValue = (c) => c.median * c.qty;

function opportunityMath(card) {
  const current = card.retail;
  const suggested = Math.max(1, Math.round(card.median));
  const priceDelta = suggested - current;
  const pctDelta = (priceDelta / current) * 100;
  const extraPerCard = priceDelta;
  const extraTotal = extraPerCard * card.qty;
  return { current, suggested, priceDelta, pctDelta, extraPerCard, extraTotal };
}

// The headline profit/loss figure for a card's current position: additional profit
// available (opportunity), value already lost to a market drop (at risk), or plain
// unrealized profit at today's market price (stable).
function pnlInfo(card, status) {
  if (status === 'gain') return { label: 'Opportunity', value: opportunityMath(card).extraTotal, cls: 'good', sign: '+' };
  if (status === 'risk') return { label: 'At risk', value: (card.cost - card.median) * card.qty, cls: 'critical', sign: '-' };
  return { label: 'Unrealized profit', value: (card.median - card.cost) * card.qty, cls: 'neutral', sign: '+' };
}

function sparkline(history, dotColorVar, w, h) {
  const min = Math.min(...history), max = Math.max(...history);
  const range = max - min || 1;
  const stepX = w / (history.length - 1);
  const pad = 3;
  const pts = history.map((v, i) => [i * stepX, pad + (1 - (v - min) / range) * (h - pad * 2)]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${path}" fill="none" style="stroke:var(--ink-300)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" style="fill:${dotColorVar}"/>
  </svg>`;
}

function rangeGauge(card, status) {
  const vals = [card.cost, card.retail, card.median];
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.2 || hi * 0.1;
  lo -= pad; hi += pad;
  const span = hi - lo || 1;
  const at = (v) => (((v - lo) / span) * 100).toFixed(1);
  const costPct = at(card.cost), retailPct = at(card.retail), medianPct = at(card.median);
  let zone = '';
  if (status === 'gain') zone = `<span class="range-track-zone good" style="left:${retailPct}%;right:0"></span>`;
  else if (status === 'risk') zone = `<span class="range-track-zone critical" style="left:0;width:${costPct}%"></span>`;
  const dotClass = status === 'gain' ? 'good' : status === 'risk' ? 'critical' : 'stable';
  return `<div class="range-gauge">
    <div class="range-track">
      ${zone}
      <span class="range-tick" style="left:${costPct}%" title="Cost ${fmt(card.cost)}"></span>
      <span class="range-tick" style="left:${retailPct}%" title="Retail ${fmt(card.retail)}"></span>
      <span class="range-dot ${dotClass}" style="left:${medianPct}%" title="Market median ${fmt(card.median)}"></span>
    </div>
    <div class="range-labels">
      <span>Cost <b>${fmt(card.cost)}</b></span>
      <span>Retail <b>${fmt(card.retail)}</b></span>
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

/* Shared inline-edit fields — used by both the grid tile and the list row so
   editing looks and behaves identically wherever it's triggered from. No modal:
   these render directly in place of the card's normal content. */
function cardEditFieldsHTML(card) {
  const categoryOptions = Object.entries(CATEGORY_META)
    .map(([key, m]) => `<option value="${key}" ${key === card.category ? 'selected' : ''}>${m.label}</option>`)
    .join('');
  const symbol = CURRENCIES[state.currency].symbol;
  const f = (field, extra = '') => `data-field="${field}" data-id="${card.id}" ${extra}`;
  return `
    <label class="form-field">Card name<input type="text" ${f('name')} value="${escapeAttr(card.name)}"></label>
    <div class="form-row">
      <label class="form-field">Set<input type="text" ${f('set')} value="${escapeAttr(card.set)}"></label>
      <label class="form-field">Grade<input type="text" ${f('grade')} value="${escapeAttr(card.grade)}"></label>
    </div>
    <div class="form-row">
      <label class="form-field">Category<select ${f('category')}>${categoryOptions}</select></label>
      <label class="form-field">SKU / ticker<input type="text" ${f('sku')} value="${escapeAttr(card.sku)}" class="mono"></label>
    </div>
    <div class="form-row three">
      <label class="form-field">Qty in stock<input type="number" min="0" step="1" ${f('qty')} value="${card.qty}"></label>
      <label class="form-field"><span>Cost (${symbol})</span><input type="number" min="0" step="0.01" ${f('cost')} value="${card.cost}"></label>
      <label class="form-field"><span>Retail (${symbol})</span><input type="number" min="0" step="0.01" ${f('retail')} value="${card.retail}"></label>
    </div>`;
}

function cardTileHTML(card) {
  if (state.editingId === card.id) return cardTileEditHTML(card);
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const cat = CATEGORY_META[card.category];
  const d = deltaPct(card);
  const pnl = pnlInfo(card, status);
  return `
  <article class="card-tile" data-id="${card.id}">
    <div class="card-art" style="background:linear-gradient(135deg, ${cat.c1}, ${cat.c2})">
      <span class="status-flag ${meta.flagClass}">${meta.icon(11)}${meta.flagLabel}</span>
      <span class="grade-chip">${card.grade}</span>
      <span class="card-art-mono" aria-hidden="true">${card.mono}</span>
    </div>
    <div class="card-body">
      <div class="card-heading">
        <div class="card-name">${card.name}</div>
        <div class="card-set">${card.set}</div>
      </div>
      <div class="card-ticker-row">
        <span class="t-symbol">$${card.sku}</span>
        <span class="card-spark">${sparkline(card.history, `var(--${meta.deltaClass === 'good' ? 'good' : meta.deltaClass === 'critical' ? 'critical' : 'neutral'}-500)`, 140, 26)}</span>
      </div>
      <div>
        <span class="field-label">Market median</span>
        <div class="card-price-row">
          <span class="card-price mono">${fmt(card.median)}</span>
          <span class="card-delta ${meta.deltaClass}">${meta.icon(11)}${pct(d)}</span>
        </div>
        <div class="card-lastsold">Last sold <b class="mono">${fmt(card.lastSoldPrice)}</b> · ${card.lastSoldDate}</div>
      </div>
      ${rangeGauge(card, status)}
      <div class="card-pnl ${pnl.cls}">
        <span>${pnl.label}</span>
        <b class="mono">${pnl.sign}${fmt(Math.abs(pnl.value))}</b>
      </div>
      <div class="card-foot">
        <span class="card-foot-meta">Qty ${card.qty} · ${card.sales} sales</span>
        <span class="card-foot-actions">
          <button class="card-foot-btn" data-refresh="${card.id}" type="button">${ICONS.refresh(13)}<span>Refresh</span></button>
          <button class="card-foot-btn" data-edit="${card.id}" type="button">${ICONS.edit(13)}<span>Edit</span></button>
        </span>
      </div>
    </div>
  </article>`;
}

function cardTileEditHTML(card) {
  const cat = CATEGORY_META[card.category];
  return `
  <article class="card-tile is-editing" data-id="${card.id}">
    <div class="card-art" style="background:linear-gradient(135deg, ${cat.c1}, ${cat.c2})">
      <span class="status-flag stable" style="background:rgba(255,255,255,0.92)">${ICONS.edit(11)}Editing</span>
      <span class="card-art-mono" aria-hidden="true">${card.mono}</span>
    </div>
    <div class="card-body card-edit-fields">
      ${cardEditFieldsHTML(card)}
      <div class="card-foot">
        <span class="card-foot-meta">Changes save as you type</span>
        <button class="card-foot-btn card-foot-btn-primary" data-done-edit="${card.id}" type="button">${ICONS.check(13)}<span>Done</span></button>
      </div>
    </div>
  </article>`;
}

function listRowHTML(card) {
  if (state.editingId === card.id) return listRowEditHTML(card);
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const cat = CATEGORY_META[card.category];
  const d = deltaPct(card);
  const pnl = pnlInfo(card, status);
  return `
  <div class="list-row" data-id="${card.id}">
    <div class="list-card-cell">
      <span class="list-thumb" style="background:linear-gradient(135deg, ${cat.c1}, ${cat.c2})">${card.mono}</span>
      <div class="list-card-text">
        <div class="list-card-name">${card.name}</div>
        <div class="list-card-set">${card.set} · ${card.grade}</div>
      </div>
    </div>
    <div class="list-ticker">
      <span class="t-symbol">$${card.sku}</span>
      <span class="list-spark">${sparkline(card.history, `var(--${meta.deltaClass === 'good' ? 'good' : meta.deltaClass === 'critical' ? 'critical' : 'neutral'}-500)`, 44, 16)}</span>
    </div>
    <span class="mono-cell">${fmt(card.cost)}</span>
    <span class="mono-cell">${fmt(card.lastSoldPrice)}</span>
    <span class="mono-cell">${fmt(card.median)}</span>
    <span class="mono-cell">${fmt(card.retail)}</span>
    <span class="mono-cell">${fmt(marketValue(card))}</span>
    <span class="mono-cell">${marketMarginPct(card).toFixed(0)}%</span>
    <span class="delta-cell ${meta.deltaClass}">${meta.icon(11)}${pct(d)}</span>
    <span class="delta-cell ${pnl.cls}">${pnl.sign}${fmt(Math.abs(pnl.value))}</span>
    <span><span class="status-pill ${meta.pillClass}">${meta.label}</span></span>
    <span class="mono" style="color:var(--ink-400); font-size:11.5px;">${card.lastSoldDate}</span>
    <span class="list-actions">
      <button class="list-sync-btn" data-refresh="${card.id}" type="button" aria-label="Refresh ${card.name}">${ICONS.refresh(14)}</button>
      <button class="list-sync-btn" data-edit="${card.id}" type="button" aria-label="Edit ${card.name}">${ICONS.edit(14)}</button>
    </span>
  </div>`;
}

function listRowEditHTML(card) {
  return `
  <div class="list-row list-row-editing" data-id="${card.id}">
    <div class="list-edit-fields">
      ${cardEditFieldsHTML(card)}
    </div>
    <div class="list-edit-actions">
      <span class="card-foot-meta">Changes save as you type</span>
      <button class="btn btn-primary btn-sm" data-done-edit="${card.id}" type="button">${ICONS.check(13)}<span>Done editing</span></button>
    </div>
  </div>`;
}

function tickerChipHTML(card) {
  const meta = STATUS_META[getStatus(card)];
  const d = deltaPct(card);
  return `
  <button class="ticker-chip" data-goto="${card.id}" type="button">
    <span class="t-symbol">$${card.sku}</span>
    <span class="t-price mono">${fmt(card.median)}</span>
    <span class="t-delta ${meta.deltaClass}">${meta.icon(10)}${pct(d)}</span>
  </button>`;
}

function attentionRowHTML(card) {
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const d = deltaPct(card);
  return `
  <button class="attention-row" data-goto="${card.id}" type="button">
    <span class="attention-flag ${meta.flagClass}">${meta.icon(15)}</span>
    <span class="attention-main">
      <span class="attention-title">${card.name}</span>
      <span class="attention-sub">${meta.flagLabel} · ${card.set.split('·')[0].trim()}</span>
    </span>
    <span class="attention-value">
      <span class="attention-price mono">${fmt(card.median)}</span>
      <span class="attention-pct ${meta.deltaClass}">${pct(d)}</span>
    </span>
  </button>`;
}

function alertCardHTML(card) {
  const status = getStatus(card);
  const meta = STATUS_META[status];
  const reviewed = state.reviewed.has(card.id);
  const d = deltaPct(card);
  const compareLabel = status === 'gain' ? 'Shopify retail' : 'Shopify cost';
  const compareValue = status === 'gain' ? card.retail : card.cost;
  const headline = status === 'gain' ? 'Price increase opportunity' : 'Margin loss warning';

  let body;
  if (status === 'gain') {
    const m = opportunityMath(card);
    body = `
      <div class="alert-math">
        <p class="alert-math-explain">
          Your last <b>${card.sales} eBay sales</b> settled at a median of <b>${fmt(card.median)}</b> —
          <b>${pct(d)}</b> above your current <b>${fmt(card.retail)}</b> retail price. Demand is running ahead of your price.
        </p>
        <div class="alert-math-figures">
          <div class="alert-math-figure"><span>Reprice to</span><b>${fmt(m.suggested)}</b></div>
          <div class="alert-math-figure"><span>Price increase</span><b class="good">+${fmt(Math.abs(m.priceDelta))} · ${pct(m.pctDelta)}</b></div>
          <div class="alert-math-figure"><span>Extra profit${card.qty > 1 ? ` · ${card.qty} in stock` : ' per card'}</span><b class="good">+${fmt(m.extraTotal)}</b></div>
        </div>
      </div>`;
  } else {
    body = `<p class="alert-action"><b>Suggested action —</b> Market value has slipped to or below cost. Pull the listing or re-evaluate your holding strategy.</p>`;
  }

  return `
  <article class="alert-card ${reviewed ? 'is-reviewed' : ''}" data-id="${card.id}">
    <span class="alert-icon ${meta.flagClass}">${meta.icon(18)}</span>
    <div class="alert-main">
      <div class="alert-top">
        <span class="alert-headline ${meta.flagClass}">${headline}</span>
        <span class="alert-time">Synced ${card.lastSoldDate}</span>
      </div>
      <div class="alert-card-name">${card.name} <span style="color:var(--ink-400); font-weight:500;">· ${card.grade}</span></div>
      <div class="alert-card-set">${card.set} · $${card.sku}</div>
      <div class="alert-figures">
        <div class="alert-figure"><span>eBay sold median</span><span>${fmt(card.median)}</span></div>
        <div class="alert-figure"><span>${compareLabel}</span><span>${fmt(compareValue)}</span></div>
        <div class="alert-figure"><span>Δ vs retail</span><span class="${meta.deltaClass}">${pct(d)}</span></div>
      </div>
      ${body}
    </div>
    <div class="alert-actions">
      <button class="btn btn-secondary btn-sm" data-goto="${card.id}" type="button">View card</button>
      <button class="btn ${reviewed ? 'btn-secondary' : 'btn-primary'} btn-sm" data-toggle-reviewed="${card.id}" type="button">${reviewed ? 'Reviewed' : 'Mark reviewed'}</button>
    </div>
  </article>`;
}

/* ------------------------------- RENDERERS --------------------------------- */

function renderKPIs() {
  const total = CARDS.length;
  const limit = PRICING_TIERS[state.currentPlanIndex].limit;
  const portfolioValue = CARDS.reduce((s, c) => s + marketValue(c), 0);
  const retailValue = CARDS.reduce((s, c) => s + c.retail * c.qty, 0);
  const avgMargin = CARDS.reduce((s, c) => s + marketMarginPct(c), 0) / total;
  const gainCount = CARDS.filter((c) => getStatus(c) === 'gain').length;
  const riskCount = CARDS.filter((c) => getStatus(c) === 'risk').length;
  const valueUp = portfolioValue >= retailValue;

  const tiles = [
    {
      label: 'Tracked SKUs', icon: ICONS.grid(15), iconBg: 'var(--accent-soft)', iconColor: 'var(--accent-ink)',
      value: `${total} <span style="font-size:15px;color:var(--ink-400);font-weight:500;">/ ${limit.toLocaleString('en-US')}</span>`,
      sub: `<div class="kpi-foot-meter"><div class="kpi-foot-meter-fill" style="width:${Math.max(2, (total / limit) * 100)}%"></div></div>`,
      subClass: '',
    },
    {
      label: 'Portfolio market value', icon: ICONS.dollar(15), iconBg: 'var(--accent-soft)', iconColor: 'var(--accent-ink)',
      value: fmtWhole(portfolioValue),
      sub: `${valueUp ? ICONS.up(11) : ICONS.down(11)} ${fmtWhole(retailValue)} at retail`,
      subClass: valueUp ? 'good' : 'critical',
    },
    {
      label: 'Avg. market margin', icon: ICONS.percent(15), iconBg: 'var(--accent-soft)', iconColor: 'var(--accent-ink)',
      value: `${avgMargin.toFixed(0)}%`,
      sub: `Median across ${total} tracked cards`,
      subClass: '',
    },
    {
      label: 'Active alerts', icon: ICONS.bell(15), iconBg: riskCount ? 'var(--critical-soft)' : 'var(--good-soft)', iconColor: riskCount ? 'var(--critical-600)' : 'var(--good-600)',
      value: `${gainCount + riskCount}`,
      sub: `${gainCount} opportunities · ${riskCount} at risk`,
      subClass: riskCount ? 'critical' : 'good',
    },
  ];

  document.getElementById('kpiGrid').innerHTML = tiles.map((t) => `
    <div class="kpi-tile">
      <div class="kpi-head">
        <span class="kpi-label">${t.label}</span>
        <span class="kpi-icon" style="background:${t.iconBg}; color:${t.iconColor}">${t.icon}</span>
      </div>
      <div class="kpi-value mono">${t.value}</div>
      <div class="kpi-sub ${t.subClass}">${t.sub}</div>
    </div>`).join('');
}

function renderTicker() {
  const sorted = [...CARDS].sort((a, b) => Math.abs(deltaPct(b)) - Math.abs(deltaPct(a)));
  document.getElementById('tickerStrip').innerHTML = sorted.map(tickerChipHTML).join('');
}

function renderAttention() {
  const list = CARDS.filter((c) => getStatus(c) !== 'stable').sort((a, b) => Math.abs(deltaPct(b)) - Math.abs(deltaPct(a))).slice(0, 6);
  const el = document.getElementById('attentionList');
  el.innerHTML = list.length ? list.map(attentionRowHTML).join('') : `<p style="color:var(--ink-400); font-size:12.5px; padding:8px 2px;">Nothing needs attention right now.</p>`;
}

function renderActivityList() {
  document.getElementById('activityList').innerHTML = activityLog.slice(0, 6).map((a) => `
    <li class="activity-item ${a.alert ? 'is-alert' : ''}">
      <span class="activity-dot"></span>
      <span>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </span>
    </li>`).join('');
}

function renderSyncLogList() {
  document.getElementById('syncLog').innerHTML = syncLog.slice(0, 6).map((s) => `
    <div class="sync-log-row">
      <span class="sync-log-time">${s.time}</span>
      <span class="sync-log-detail"><b>${s.detail}</b></span>
      <span class="sync-log-detail">${s.result}</span>
    </div>`).join('');
}

function renderPlanSliderTicks() {
  document.getElementById('planSliderTicks').innerHTML = PRICING_TIERS.map((tier, i) => `
    <span class="plan-slider-tick" data-idx="${i}">${tier.limit.toLocaleString('en-US')}${i === state.currentPlanIndex ? '<span class="tick-current-dot" title="Your current plan"></span>' : ''}</span>
  `).join('');
}

function renderPlanSlider() {
  const idx = state.planIndex;
  const tier = PRICING_TIERS[idx];
  const slider = document.getElementById('planSlider');
  slider.value = idx;
  slider.style.setProperty('--fill', `${(idx / (PRICING_TIERS.length - 1)) * 100}%`);

  document.getElementById('planReadoutPrice').innerHTML = `${fmtWhole(tier.price)}<span>/mo</span>`;
  document.getElementById('planReadoutLimit').innerHTML = `Up to <b>${tier.limit.toLocaleString('en-US')}</b> cards tracked`;

  document.querySelectorAll('.plan-slider-tick').forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.idx) === idx);
  });

  const switchBtn = document.getElementById('planSwitchBtn');
  const isCurrent = idx === state.currentPlanIndex;
  switchBtn.textContent = isCurrent ? 'Current plan' : `Switch to this plan — ${fmtWhole(tier.price)}/mo`;
  switchBtn.disabled = isCurrent;
  switchBtn.classList.toggle('btn-secondary', isCurrent);
  switchBtn.classList.toggle('btn-primary', !isCurrent);
}

function updateBillingPanel() {
  const tier = PRICING_TIERS[state.currentPlanIndex];
  document.getElementById('currentPlanHeading').textContent = `${tier.limit.toLocaleString('en-US')}-card plan — ${fmtWhole(tier.price)}/mo`;
  document.getElementById('currentPlanSub').textContent = 'Renews Oct 9, 2026 · Email, Slack & Discord alerts included';
  document.getElementById('usageNote').textContent = `Need to track more than ${tier.limit.toLocaleString('en-US')} cards? Drag the slider below to move to a bigger plan.`;
}

function getFilteredSortedCards() {
  const q = state.search.trim().toLowerCase();
  let list = CARDS.filter((c) => {
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
  document.getElementById('resultsCount').textContent = `${list.length} of ${CARDS.length} cards`;
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
  el.innerHTML = list.length ? list.map(alertCardHTML).join('') : `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h3>No alerts here</h3>
      <p>You're all caught up for this filter.</p>
    </div>`;
}

/* ------------------------- INDIVIDUAL EDIT (inline, no modal) --------------- */

function populateSelect(select, includeAll) {
  const options = (includeAll ? ['<option value="all">All categories</option>'] : [])
    .concat(Object.entries(CATEGORY_META).map(([key, meta]) => `<option value="${key}">${meta.label}</option>`));
  select.innerHTML = options.join('');
}

// Only one card edits inline at a time. Starting a new edit re-renders the
// inventory so that one tile/row swaps to its editable fields in place.
function startCardEdit(id) {
  if (state.editingId === id) return;
  state.editingId = id;
  renderInventory();
  requestAnimationFrame(() => {
    const first = document.querySelector('.is-editing input, .list-row-editing input');
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

// Fields commit straight to the CARDS array as you type — matches the bulk
// spreadsheet's "changes save as you type" behavior, just scoped to one card.
function handleInlineEditInput(e) {
  const el = e.target.closest('[data-field]');
  if (!el || !el.closest('.is-editing, .list-row-editing')) return;
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
  return `
  <tr data-id="${card.id}">
    <td class="sheet-rownum-cell">${index + 1}</td>
    <td><input type="text" value="${escapeAttr(card.name)}" data-field="name" data-id="${card.id}"></td>
    <td><input type="text" value="${escapeAttr(card.set)}" data-field="set" data-id="${card.id}"></td>
    <td><select data-field="category" data-id="${card.id}">${categoryOptions}</select></td>
    <td><input type="text" value="${escapeAttr(card.grade)}" data-field="grade" data-id="${card.id}"></td>
    <td><input type="text" value="${escapeAttr(card.sku)}" data-field="sku" data-id="${card.id}" class="mono"></td>
    <td><input type="number" min="0" step="1" value="${card.qty}" data-field="qty" data-id="${card.id}"></td>
    <td><input type="number" min="0" step="0.01" value="${card.cost}" data-field="cost" data-id="${card.id}"></td>
    <td><input type="number" min="0" step="0.01" value="${card.retail}" data-field="retail" data-id="${card.id}"></td>
    <td class="readonly mono sheet-median">${fmt(card.median)}</td>
    <td class="readonly mono sheet-margin">${marketMarginPct(card).toFixed(0)}%</td>
    <td class="readonly sheet-status"><span class="status-pill ${meta.pillClass}">${meta.label}</span></td>
  </tr>`;
}

function renderSheet() {
  document.getElementById('sheetBody').innerHTML = CARDS.map(sheetRowHTML).join('');
}

function updateSheetRowComputed(card) {
  const row = document.querySelector(`#sheetBody tr[data-id="${card.id}"]`);
  if (!row) return;
  const meta = STATUS_META[getStatus(card)];
  row.querySelector('.sheet-median').textContent = `${fmt(card.median)}`;
  row.querySelector('.sheet-margin').textContent = `${marketMarginPct(card).toFixed(0)}%`;
  row.querySelector('.sheet-status').innerHTML = `<span class="status-pill ${meta.pillClass}">${meta.label}</span>`;
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
  document.getElementById('resultsCount').hidden = true;
  document.getElementById('cardGrid').hidden = true;
  document.getElementById('cardList').hidden = true;
  document.getElementById('emptyState').hidden = true;
  renderSheet();
  document.getElementById('sheetView').hidden = false;
}

function exitSheetMode() {
  document.getElementById('sheetView').hidden = true;
  document.querySelector('#tab-inventory .toolbar').hidden = false;
  document.getElementById('resultsCount').hidden = false;
  document.getElementById('cardGrid').hidden = state.view !== 'grid';
  document.getElementById('cardList').hidden = state.view !== 'list';
  renderAll();
  showToast(sheetTouched.size ? `Saved changes to ${sheetTouched.size} card${sheetTouched.size > 1 ? 's' : ''}` : 'No changes made');
}

function updateNavBadges() {
  const unreviewed = CARDS.filter((c) => getStatus(c) !== 'stable' && !state.reviewed.has(c.id)).length;
  document.getElementById('navInventoryCount').textContent = CARDS.length;
  document.getElementById('navAlertsBadge').textContent = unreviewed;
  document.getElementById('navAlertsBadge').style.display = unreviewed ? '' : 'none';
  document.getElementById('notifDot').style.display = unreviewed ? '' : 'none';
}

function updatePlanWidgets() {
  const limit = PRICING_TIERS[state.currentPlanIndex].limit;
  const usedPct = Math.max(2, (CARDS.length / limit) * 100);
  document.getElementById('planMeterFill').style.width = `${usedPct}%`;
  document.getElementById('planMeterLabel').textContent = `${CARDS.length} of ${limit.toLocaleString('en-US')} SKUs tracked`;
  document.getElementById('usageSkuFill').style.width = `${usedPct}%`;
  document.getElementById('usageSkuLabel').textContent = `${CARDS.length} / ${limit.toLocaleString('en-US')}`;
  document.getElementById('metaMapped').textContent = `${CARDS.length} products`;
}

function updateSyncPill() {
  document.getElementById('metaLastSync').textContent = state.minutesSinceSync < 1 ? 'Just now' : `${state.minutesSinceSync} minutes ago`;
}

function renderAll() {
  renderKPIs();
  renderTicker();
  renderAttention();
  renderInventory();
  renderAlerts();
  updateNavBadges();
  updatePlanWidgets();
}

/* ------------------------------- TABS -------------------------------------- */

const TAB_META = {
  overview: { title: 'Overview', subtitle: 'Your card portfolio against the live eBay market, at a glance.' },
  inventory: { title: 'Inventory', subtitle: 'Every tracked SKU, synced against live eBay sold prices.' },
  alerts: { title: 'Alerts', subtitle: 'Price opportunities and margin warnings from your latest sync.' },
  sync: { title: 'Sync & integrations', subtitle: 'Manage your Shopify and eBay connections and alert destinations.' },
  billing: { title: 'Plan & billing', subtitle: 'Manage your subscription, usage, and plan limits.' },
  settings: { title: 'Account settings', subtitle: 'Manage your registration details, profile, password, and currency.' },
};

function setActiveTab(tab) {
  if (!TAB_META[tab]) return;
  state.activeTab = tab;
  document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('is-active', p.id === `tab-${tab}`));
  document.getElementById('pageTitle').textContent = TAB_META[tab].title;
  document.getElementById('pageSubtitle').textContent = TAB_META[tab].subtitle;
  document.getElementById('avatarBtn').classList.toggle('is-active', tab === 'billing' || tab === 'settings');
  if (tab === 'alerts') { document.getElementById('notifDot').style.display = 'none'; }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function jumpToCard(id) {
  const card = CARDS.find((c) => c.id === id);
  if (!card) return;
  setActiveTab('inventory');
  state.search = card.sku;
  state.category = 'all';
  state.status = 'all';
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
  btn.querySelector('span').textContent = 'Syncing…';

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
    addSyncLogEntry('Manual sync', `${CARDS.length} SKUs checked · ${newAlerts} alert${newAlerts === 1 ? '' : 's'} generated · ${(2 + Math.random() * 1.5).toFixed(1)}s`);
    addActivityEntry(`Manual sync completed — ${CARDS.length} SKUs checked${newAlerts ? `, ${newAlerts} new alert${newAlerts > 1 ? 's' : ''}` : ''}`, newAlerts > 0);
    showToast(newAlerts ? `Synced ${CARDS.length} cards · ${newAlerts} new alert${newAlerts > 1 ? 's' : ''}` : `Synced ${CARDS.length} cards · no new alerts`);

    btn.classList.remove('is-loading');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sync now';
    state.syncing = false;
  }, 1000);
}

function handleCardRefresh(id, btnEl) {
  const card = CARDS.find((c) => c.id === id);
  if (!card || !btnEl) return;
  btnEl.classList.add('is-syncing');
  btnEl.disabled = true;
  setTimeout(() => {
    driftCard(card);
    renderAll();
    showToast(`Refreshed $${card.sku} — market median now ${fmt(card.median)}`);
  }, 650);
}

/* -------------------------------- EVENTS ------------------------------------ */

function populateCategoryFilter() {
  populateSelect(document.getElementById('filterCategory'), true);
}

function populateCurrencySelect() {
  const select = document.getElementById('currencySelect');
  select.innerHTML = Object.entries(CURRENCIES)
    .map(([code, c]) => `<option value="${code}" ${code === state.currency ? 'selected' : ''}>${c.label} (${c.symbol}) — ${code}</option>`)
    .join('');
}

function bindEvents() {
  // nav + tab links
  document.querySelectorAll('.nav-item[data-tab]').forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
  document.querySelectorAll('[data-tab-link]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); setActiveTab(el.dataset.tabLink); }));

  // global search jumps into inventory
  document.getElementById('globalSearch').addEventListener('input', (e) => {
    const v = e.target.value;
    if (v && state.activeTab !== 'inventory') setActiveTab('inventory');
    state.search = v;
    document.getElementById('inventorySearch').value = v;
    renderInventory();
  });

  // inventory toolbar
  document.getElementById('inventorySearch').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderInventory();
  });
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
  const gridEl = document.getElementById('cardGrid');
  const listEl = document.getElementById('cardList');
  function setView(view) {
    state.view = view;
    gridBtn.classList.toggle('is-active', view === 'grid');
    listBtn.classList.toggle('is-active', view === 'list');
    gridBtn.setAttribute('aria-pressed', String(view === 'grid'));
    listBtn.setAttribute('aria-pressed', String(view === 'list'));
    gridEl.hidden = view !== 'grid';
    listEl.hidden = view !== 'list';
  }
  gridBtn.addEventListener('click', () => setView('grid'));
  listBtn.addEventListener('click', () => setView('list'));

  // card refresh + inline edit (event delegation, survives re-renders)
  document.getElementById('tab-inventory').addEventListener('click', (e) => {
    const refreshBtn = e.target.closest('[data-refresh]');
    if (refreshBtn) { handleCardRefresh(refreshBtn.dataset.refresh, refreshBtn); return; }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { startCardEdit(editBtn.dataset.edit); return; }
    const doneBtn = e.target.closest('[data-done-edit]');
    if (doneBtn) { stopCardEdit(); return; }
  });
  document.getElementById('tab-inventory').addEventListener('input', handleInlineEditInput);
  document.getElementById('tab-inventory').addEventListener('change', handleInlineEditInput);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.editingId) stopCardEdit();
  });

  // edit all → spreadsheet mode
  document.getElementById('editAllBtn').addEventListener('click', enterSheetMode);
  document.getElementById('doneEditingBtn').addEventListener('click', exitSheetMode);
  document.getElementById('sheetBody').addEventListener('input', handleSheetInput);
  document.getElementById('sheetBody').addEventListener('change', handleSheetInput);

  // account menu dropdown
  const avatarBtn = document.getElementById('avatarBtn');
  const accountDropdown = document.getElementById('accountDropdown');
  function closeAccountMenu() {
    accountDropdown.hidden = true;
    avatarBtn.setAttribute('aria-expanded', 'false');
  }
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = accountDropdown.hidden;
    accountDropdown.hidden = !willOpen;
    avatarBtn.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (e) => {
    if (!accountDropdown.hidden && !document.getElementById('accountMenu').contains(e.target)) closeAccountMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !accountDropdown.hidden) closeAccountMenu();
  });
  accountDropdown.addEventListener('click', (e) => {
    if (e.target.closest('[data-tab-link]')) closeAccountMenu();
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    closeAccountMenu();
    showToast('This is a prototype — log out is not wired up.');
  });

  // overview: jump-to-card (ticker chips + attention rows)
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

  // sync now
  document.getElementById('syncNowBtn').addEventListener('click', handleSyncNow);
  document.getElementById('notifBtn').addEventListener('click', () => setActiveTab('alerts'));
  document.getElementById('storeSwitcher').addEventListener('click', () => showToast('Multi-store switching is available on the Enterprise plan.'));

  // sync tab interactions
  document.querySelectorAll('.connection-card .btn').forEach((btn) => {
    btn.addEventListener('click', () => showToast(btn.textContent.includes('Reauthorize') ? 'Shopify connection looks good — no action needed.' : 'eBay API test succeeded — 42ms response.'));
  });
  document.querySelector('.destinations').addEventListener('click', (e) => {
    const sw = e.target.closest('.switch');
    if (!sw) return;
    const isOn = sw.classList.toggle('is-on');
    sw.setAttribute('aria-checked', String(isOn));
    const label = sw.closest('.destination-row').querySelector('.destination-label').textContent.trim();
    showToast(`${label} alerts turned ${isOn ? 'on' : 'off'}.`);
  });
  document.querySelector('.destinations').addEventListener('keydown', (e) => {
    const sw = e.target.closest('.switch');
    if (sw && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sw.click(); }
  });

  // billing — draggable plan slider
  document.getElementById('planSlider').addEventListener('input', (e) => {
    state.planIndex = parseInt(e.target.value, 10);
    renderPlanSlider();
  });
  document.getElementById('planSwitchBtn').addEventListener('click', () => {
    if (state.planIndex === state.currentPlanIndex) return;
    state.currentPlanIndex = state.planIndex;
    updateBillingPanel();
    updatePlanWidgets();
    renderKPIs();
    renderPlanSliderTicks();
    renderPlanSlider();
    const tier = PRICING_TIERS[state.currentPlanIndex];
    showToast(`Switched to the ${tier.limit.toLocaleString('en-US')}-card plan — ${fmtWhole(tier.price)}/mo.`);
  });
  document.querySelector('.current-plan-panel .btn').addEventListener('click', () => showToast("Opening Shopify's subscription management page…"));

  // account settings
  document.getElementById('registrationForm').addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Saved business registration details.');
  });
  document.getElementById('accountForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('acctName').value.trim();
    const email = document.getElementById('acctEmail').value.trim();
    if (name) {
      document.querySelector('.account-name').textContent = name;
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'RD';
      document.querySelectorAll('.avatar').forEach((el) => { el.textContent = initials; });
    }
    if (email) document.querySelector('.account-email').textContent = email;
    showToast('Saved account details.');
  });
  document.getElementById('passwordForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const newPw = document.getElementById('pwNew').value;
    const confirmPw = document.getElementById('pwConfirm').value;
    if (newPw !== confirmPw) { showToast("New password and confirmation don't match."); return; }
    if (newPw.length < 8) { showToast('Use at least 8 characters for your new password.'); return; }
    form.reset();
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
  populateCategoryFilter();
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
