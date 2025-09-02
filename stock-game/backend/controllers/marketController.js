const Stock = require("../models/Stock");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { recordMarketIndexHistory } = require("../utils/marketIndex.js");
const { incrementTick } = require("../utils/tickTracker.js");
const { autoCoverShorts } = require("../utils/autoCoverShorts.js");
const { sweepOptionExpiries } = require("../utils/sweepOptions.js");
const { sweepLoanPayments } = require("../utils/sweepLoans.js");
const { payDividends } = require("../utils/payDividends.js");
const resetStockPrices = require("../utils/resetStocks.js");
const { selectMegaCaps, getMegaCaps } = require("../utils/megaCaps.js");
const generateEarningsReport = require("../utils/generateEarnings.js");
const { gaussianPatches } = require("../utils/applyGaussian.js");
const { newsPatches } = require("./newsImpactController.js");
const { addSet, addPush, mergePatchMaps, toBulk } = require("../utils/patchKit");

// === Helpers ===
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
function randNormal() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function safeNumber(val, fallback = 0) {
  return Number.isFinite(val) ? val : fallback;
}
function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}] RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
}

// === Constants ===
const VOL_MIN = 0.005;
const VOL_MAX = 0.030;
const VOL_NOISE = 0.0005;
const VOL_DECAY = 0.001;
const MAX_MOVE_PER_TICK = 0.04;
const STRONG_REVERSION = 0.015;
const BASE_BLEND = 0.1;
const BASE_DRIFT_ANNUAL = 0.04;
const HISTORY_LIMIT = 1200;
const SIGNAL_TAIL = 10;
const TICKS_PER_YEAR = 365;

function perTickFromAnnual(a) {
  return Math.pow(1 + a, 1 / TICKS_PER_YEAR) - 1;
}
const BASE_DRIFT_PER_TICK = perTickFromAnnual(BASE_DRIFT_ANNUAL);

// === Volatility logic ===
function updateVolatility(prevVol, pctMoveAbs) {
  const capped = Math.min(pctMoveAbs, 0.20);
  const ewma = Math.sqrt(0.9 * prevVol ** 2 + 0.1 * capped ** 2);
  const reversionTarget = 0.015;
  let adjusted = ewma * 0.7 + reversionTarget * 0.3;

  if (pctMoveAbs < 0.005) adjusted -= VOL_DECAY;
  if (pctMoveAbs > 0.05) adjusted += VOL_DECAY * 2;

  adjusted += clamp(randNormal() * VOL_NOISE, -0.001, 0.001);
  return clamp(adjusted, VOL_MIN, VOL_MAX);
}

function getAnchor(stock) {
  const tail = Array.isArray(stock.history) ? stock.history.slice(-10) : [];
  const fallback = safeNumber(stock.price, 100);
  const base = safeNumber(stock.basePrice, fallback);
  const tailMean = tail.length > 1 ? tail.reduce((a, b) => a + b, 0) / tail.length : fallback;
  return 0.5 * base + 0.5 * tailMean;
}

// === Debugging ===
const DEBUG_TICKERS = ['SPEX', 'ASTC'];

async function updateMarket() {
  try {
    const tick = incrementTick();
    logMemoryUsage(`Tick ${tick}`);

    if (tick % 2 === 0) await autoCoverShorts();
    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);
    if (tick % 90 === 0) await payDividends();

    const stocks = await Stock.find({}, {
      _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
      volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
      history: { $slice: -SIGNAL_TAIL }
    }).lean();

    if (!stocks.length) return console.warn("⚠️ No stocks found.");

    const core = new Map();
    let updatedMarketCap = 0;
    const metrics = [];

    for (const s of stocks) {
      const prev = safeNumber(s.price, 100);
      const vol = safeNumber(s.volatility, 0.015);
      const base = safeNumber(s.basePrice, prev);
      const shares = safeNumber(s.outstandingShares, 1);
      const anchor = getAnchor(s);

      const reversion = (anchor - prev) * STRONG_REVERSION;
      const shock = randNormal() * vol * 0.5;
      let rawPrice = prev + reversion + prev * shock;
      rawPrice = Math.max(0.01, rawPrice);

      let pctMove = (rawPrice - prev) / prev;
      pctMove = clamp(pctMove, -MAX_MOVE_PER_TICK, MAX_MOVE_PER_TICK);
      const finalPrice = +(prev * (1 + pctMove)).toFixed(4);

      const nextVol = +updateVolatility(vol, Math.abs(pctMove)).toFixed(4);

      // Drift base price upward over time
      const driftedBase = base * (1 + BASE_DRIFT_PER_TICK);
      const nextBase = +(driftedBase * (1 - BASE_BLEND) + finalPrice * BASE_BLEND).toFixed(4);

      if (DEBUG_TICKERS.includes(s.ticker)) {
        console.log(`--- DEBUG: ${s.ticker} Tick ${tick} ---`);
        console.log(`prev=${prev}, anchor=${anchor}, reversion=${reversion.toFixed(4)}, shock=${shock.toFixed(4)}`);
        console.log(`rawPrice=${rawPrice.toFixed(4)}, pctMove=${(pctMove * 100).toFixed(2)}%, nextVol=${nextVol}`);
      }

      if (Number.isFinite(s.nextEarningsTick) && tick >= s.nextEarningsTick) {
        const { report, newPrice, nextEarningsTick } = generateEarningsReport(s, tick);
        addSet(core, s._id, { lastEarningsReport: report, nextEarningsTick });
      }

      addSet(core, s._id, {
        price: finalPrice,
        change: +(pctMove * 100).toFixed(2),
        volatility: nextVol,
        basePrice: nextBase,
      });

      addPush(core, s._id, 'history', finalPrice, HISTORY_LIMIT);
      updatedMarketCap += finalPrice * shares;

      metrics.push({
        ticker: s.ticker,
        price: finalPrice,
        sector: s.sector,
        outstandingShares: shares,
        change: pctMove * 100,
      });
    }

    const [news, gauss] = await Promise.all([newsPatches(stocks), gaussianPatches(stocks)]);
    const merged = mergePatchMaps(core, news, gauss);
    const bulkOps = toBulk(merged);

    if (bulkOps.length) {
      console.log(`📦 Committing ${bulkOps.length} stock updates`);
      await Stock.bulkWrite(bulkOps, { ordered: false });
    }

    recordMarketIndexHistory(metrics, 0);
    recordMarketMood(metrics);

  } catch (err) {
    console.error("🔥 Market update error:", err);
  }
}

module.exports = {
  updateMarket,
  getMarketMoodController: (req, res) => {
    const history = getMoodHistory();
    res.json({
      mood: history.at(-1)?.mood || 'neutral',
      moodHistory: history
    });
  }
};
