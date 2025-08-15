
const { getLatestNewsData } = require("./newsController");
const { addInc, addSet } = require("../utils/patchKit");

// --- helpers ---
function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

// same spirit as your original weighting
function getNewsWeight(item) {
  const score = +item.sentimentScore || 0;           // [-10,10] expected
  const minWeight = 25, maxWeight = 100;
  const absScore = Math.min(10, Math.abs(score));
  const base = minWeight + ((maxWeight - minWeight) * (absScore / 10));
  return base + Math.random() * 3.5;                 // tiny jitter
}

// normalize whatever shape getLatestNewsData returns into [{sector?, ticker?, sentimentScore}]
function normalizeNews(raw = {}) {
  const flat = [];
  for (const [sector, items] of Object.entries(raw)) {
    if (!items) continue;
    const arr = Array.isArray(items) ? items : [items];
    for (const it of arr) {
      if (!it || typeof it !== "object") continue;
      flat.push({
        sector: sector !== "global" ? sector : null,
        ticker: it.ticker ?? null,
        description: it.description,
        sentimentScore: +it.sentimentScore || 0
      });
    }
  }
  return flat;
}

/**
 * Build a single pass of news impact.
 * @param {Array<LeanStock>} stocks - lean docs already fetched
 * @param {Object} opts
 *   - mode: 'patch' | 'delta'  (default 'patch')
 *   - perItemCapPct: max abs impact per news item (default 0.05 = 5%)
 *   - perTickCapPct: max abs total news impact per stock per tick (default 0.08 = 8%)
 *   - volBumpMax: maximum multiplicative vol bump from strong news (default 0.15=+15%)
 * @returns Map
 *   mode='patch' -> Map(_id => {$inc, $set})
 *   mode='delta' -> Map(_id => { deltaPrice, nextVol? })
 */
async function newsPatches(
  stocks = [],
  {
    mode = "patch",
    perItemCapPct = 0.05,
    perTickCapPct = 0.08,
    volBumpMax = 0.15
  } = {}
) {
  const patches = new Map();
  if (!Array.isArray(stocks) || !stocks.length) return patches;

  // Index for fast targeting
  const byTicker = new Map();
  const bySector = new Map();
  for (const s of stocks) {
    byTicker.set(s.ticker, s);
    if (!bySector.has(s.sector)) bySector.set(s.sector, []);
    bySector.get(s.sector).push(s);
  }

  // Load news (no DB stock queries here)
  const rawNews = await getLatestNewsData();
  const items = normalizeNews(rawNews);
  if (!items.length) return patches;

  // Aggregate per-stock effects first so we can cap total impact per tick
  const agg = new Map(); // _id -> { delta, nextVol?:number }
  const VOL_MIN = 0.015, VOL_MAX = 0.35;

  // Target resolver
  const resolveTargets = (ni) => {
    if (ni.ticker && byTicker.has(ni.ticker)) return [byTicker.get(ni.ticker)];
    if (ni.sector && bySector.has(ni.sector)) return bySector.get(ni.sector);
    // global -> all stocks
    return stocks;
  };

  for (const ni of items) {
    const targets = resolveTargets(ni);
    if (!targets || targets.length === 0) continue;

    const weight = getNewsWeight(ni);      // ~25..103
    const sNorm  = clamp((+ni.sentimentScore || 0) / 10, -1, 1);
    const wNorm  = clamp(weight / 100, 0, 1);

    for (const s of targets) {
      const maxPerItem = Math.abs(s.price) * perItemCapPct;
      let delta = sNorm * wNorm * maxPerItem; // signed
      // accumulate
      const prev = agg.get(s._id) || { delta: 0 };
      let nextDelta = prev.delta + delta;

      // per-tick aggregate cap
      const maxTotal = Math.abs(s.price) * perTickCapPct;
      nextDelta = clamp(nextDelta, -maxTotal, maxTotal);

      // volatility bump scales with |sentiment|
      const v0 = (typeof s.volatility === "number" ? s.volatility : 0.018);
      const vMul = 1 + Math.abs(sNorm) * volBumpMax; // up to +15% by default
      const v1 = clamp(+ (v0 * vMul).toFixed(4), VOL_MIN, VOL_MAX);

      agg.set(s._id, { delta: nextDelta, nextVol: v1 });
    }
  }

  // Convert aggregate into either patches ($inc/$set) or raw deltas
  for (const [id, { delta, nextVol }] of agg.entries()) {
    if (mode === "delta") {
      patches.set(id, { deltaPrice: delta, nextVol });
    } else {
      // patch mode: only inc price + set volatility
      // (Do NOT touch change/history here; let the core engine compute those once.)
      if (delta !== 0) addInc(patches, id, { price: +delta.toFixed(4) });
      if (Number.isFinite(nextVol)) addSet(patches, id, { volatility: nextVol });
    }
  }

  return patches;
}

module.exports = { newsPatches };
