const { getLatestNewsData } = require("./newsController");
const { addInc, addSet } = require("../utils/patchKit");

// --- helpers ---
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

function getNewsWeight(item) {
  const score = +item.sentimentScore || 0;
  const minWeight = 25, maxWeight = 100;
  const absScore = Math.min(10, Math.abs(score));
  const base = minWeight + ((maxWeight - minWeight) * (absScore / 10));
  return base + Math.random() * 3.5;
}

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
        summary: it.description ?? null,
        sentimentScore: +it.sentimentScore || 0,
      });
    }
  }
  return flat;
}

/**
 * Build a single pass of news impact.
 * @param {Array<LeanStock>} stocks - lean docs already fetched
 * @param {Object} opts
 * @returns {Object} { patches: Map, log: Array }
 */
async function newsPatches(
  stocks = [],
  {
    mode = "patch",
    perItemCapPct = 0.05,
    perTickCapPct = 0.08,
    volBumpMax = 0.15,
  } = {}
) {
  const patches = new Map();
  const newsLog = [];

  console.log(`🟡 [newsPatches] Called with ${stocks?.length || 0} stocks`);

  if (!Array.isArray(stocks) || !stocks.length) {
    console.warn("⚠️ [newsPatches] No stocks provided. Exiting early.");
    return { patches, log: newsLog };
  }

  // Index stocks
  const byTicker = new Map();
  const bySector = new Map();
  for (const s of stocks) {
    byTicker.set(s.ticker, s);
    if (!bySector.has(s.sector)) bySector.set(s.sector, []);
    bySector.get(s.sector).push(s);
  }

  // Load news
  const rawNews = await getLatestNewsData();
  const items = normalizeNews(rawNews);
  console.log(`🧼 [newsPatches] Normalized news items: ${items.length}`);

  if (!items.length) return { patches, log: newsLog };

  const agg = new Map();
  const VOL_MIN = 0.015, VOL_MAX = 0.35;

  for (const ni of items) {
    if (!ni) continue;

    const targets = ni.ticker && byTicker.has(ni.ticker)
      ? [byTicker.get(ni.ticker)]
      : ni.sector && bySector.has(ni.sector)
        ? bySector.get(ni.sector)
        : []; // skip global for log simplicity

    if (!targets.length) continue;

    const weight = getNewsWeight(ni);
    const sNorm = clamp((+ni.sentimentScore || 0) / 10, -1, 1);
    const wNorm = clamp(weight / 100, 0, 1);

    for (const s of targets) {
      const maxPerItem = Math.abs(s.price) * perItemCapPct;
      const delta = sNorm * wNorm * maxPerItem;

      const prev = agg.get(s._id) || { delta: 0 };
      let nextDelta = prev.delta + delta;

      const maxTotal = Math.abs(s.price) * perTickCapPct;
      nextDelta = clamp(nextDelta, -maxTotal, maxTotal);

      const v0 = typeof s.volatility === "number" ? s.volatility : 0.018;
      const vMul = 1 + Math.abs(sNorm) * volBumpMax;
      const v1 = clamp(+(v0 * vMul).toFixed(4), VOL_MIN, VOL_MAX);

      agg.set(s._id, { delta: nextDelta, nextVol: v1 });

      if (ni.ticker) {
        newsLog.push({
          ticker: s.ticker,
          sector: s.sector,
          source: 'ticker',
          reason: ni.summary || '(no summary)',
          delta: +delta.toFixed(4),
          aggDelta: +nextDelta.toFixed(4),
          volBump: +(v1 - v0).toFixed(4),
          volNext: v1
        });

        // Log just ticker-specific impacts
        if (delta !== 0 || (v1 - v0) !== 0) {
          console.log(`🔸 ${s.ticker} [NEWS]: Δ=${delta.toFixed(4)}, aggΔ=${nextDelta.toFixed(4)}, vol→${v1.toFixed(4)}`);
        }
      }
    }
  }

  // Convert to patch format
  for (const [id, { delta, nextVol }] of agg.entries()) {
    const stock = stocks.find(s => s._id.equals(id));
    if (!stock) continue;

    if (mode === "delta") {
      patches.set(id, { deltaPrice: delta, nextVol });
    } else {
      if (delta !== 0) addInc(patches, id, { price: +delta.toFixed(4) });
      if (Number.isFinite(nextVol)) addSet(patches, id, { volatility: nextVol });
    }

    const entry = newsLog.find(e => e.ticker === stock.ticker);
    if (entry && (entry.delta !== 0 || entry.volBump !== 0)) {
      console.log(`📦 [Patch] ${stock.ticker} [${stock.sector}]: Δprice=${delta.toFixed(4)}, +vol=${(nextVol || 0).toFixed(4)}`);
    }
  }

  console.log(`✅ [newsPatches] Final patch count: ${patches.size}`);
  return { patches, log: newsLog };
}

module.exports = { newsPatches };
