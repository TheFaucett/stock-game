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

// Debug memory usage
function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}] RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
}

// --- Constants ---
const HISTORY_LIMIT = 1200;
const TICKS_PER_YEAR = 365;
const SIGNAL_TAIL = 10;
const ANNUAL_DRIFT_BASE = 0.12;
const MARKET_BIAS_ANNUAL = 0.03;
const VOL_MIN = 0.015, VOL_MAX = 0.25, LAMBDA = 0.90, TARGET_DAILY_VOL = 0.020, MEANREV = 0.05, VOL_NOISE = 0.0015;

// Drift calibration
let driftMultiplier = 1.0;
const TARGET_CAGR = 0.12;
const CAL_TICKS = 90;
const MAX_MULT = 1.20, MIN_MULT = 0.95;

// Helpers
function perTickFromAnnual(a) {
  return Math.pow(1 + a, 1 / TICKS_PER_YEAR) - 1;
}
function getPerTickDrift() {
  return perTickFromAnnual(ANNUAL_DRIFT_BASE * driftMultiplier);
}
const MARKET_BIAS_PER_TICK = perTickFromAnnual(MARKET_BIAS_ANNUAL);

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

function randNormal() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function updateVolatility(prevVol, pctMoveAbs) {
  const capped = Math.min(Math.abs(pctMoveAbs), 0.20);
  const ewma = Math.sqrt(LAMBDA * prevVol * prevVol + (1 - LAMBDA) * capped * capped);
  let newVol = ewma + MEANREV * (TARGET_DAILY_VOL - ewma);
  const noiseKick = Math.max(0, randNormal()) * VOL_NOISE;
  return clamp(newVol + noiseKick, VOL_MIN, VOL_MAX);
}

function getAnchor(stock) {
  let tailArr = Array.isArray(stock.history) ? stock.history : [];
  if (tailArr.length < 2) {
    const fallback = stock.price || stock.basePrice || 100;
    tailArr = Array(10).fill(fallback);
  }
  const tailMean = tailArr.reduce((a, b) => a + b, 0) / tailArr.length;
  const base = stock.basePrice ?? tailMean;
  return 0.4 * tailMean + 0.6 * base;
}

let baseCap = null, baseTick = null;
function calibrate(tick, marketCap) {
  if (baseCap == null || baseTick == null) {
    baseCap = marketCap;
    baseTick = tick;
    return;
  }
  const elapsed = tick - baseTick;
  if (elapsed < CAL_TICKS) return;

  const years = elapsed / TICKS_PER_YEAR;
  if (years <= 0 || baseCap <= 0) return;

  const realized = Math.pow(marketCap / baseCap, 1 / years) - 1;
  const err = TARGET_CAGR - realized;
  const KpUp = 0.16, KpDown = 0.05;
  const gain = (err >= 0 ? KpUp : KpDown) * (err / Math.max(0.01, TARGET_CAGR));
  driftMultiplier = clamp(driftMultiplier * (1 + gain), MIN_MULT, MAX_MULT);
  baseCap = marketCap;
  baseTick = tick;
}

// === MAIN TICK FUNCTION ===
async function updateMarket() {
  try {
    const tick = incrementTick();
    logMemoryUsage(`Tick ${tick}`);

    if (tick % 2 === 0) await autoCoverShorts();
    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);

    // Dividends
    let divPaid = 0;
    if (tick % 90 === 0) {
      const d = await payDividends().catch(() => null);
      if (d && typeof d.totalPaid === 'number') divPaid = d.totalPaid;
    }

    // Load stock state
    const stocks = await Stock.find({}, {
      _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
      volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
      history: { $slice: -SIGNAL_TAIL },
    }).lean();

    if (!stocks.length) {
      console.warn("⚠️ No stocks found during market update.");
      return;
    }

    if ((tick % 1000 === 0 || tick === 1) || !getMegaCaps().megaCaps.length) {
      console.log("🔁 Resetting stock prices + selecting megacaps...");
      await resetStockPrices();
      await selectMegaCaps(stocks, tick);
    }
    if (tick === 1 || tick === 2) {
        console.log("🚩first tick states: ",stocks);
    }
    const perTickDrift = getPerTickDrift();
    const core = new Map();
    let updatedMarketCap = 0;
    const metrics = [];

    for (const s of stocks) {
      const prev = s.price;
      const anchor = getAnchor(s);

      const reversion = (anchor - prev) * 0.015;
      const volShockPct = randNormal() * (s.volatility ?? 0.018);
      let finalPrice = prev + reversion + prev * volShockPct;

      finalPrice *= (1 + MARKET_BIAS_PER_TICK);
      finalPrice = Math.max(finalPrice, 0.01);

      // 🧯 Safety clamps
      if (finalPrice > 2000 || finalPrice < 0.1 || !isFinite(finalPrice)) {
        console.warn(`🚨 Spike detected in ${s.ticker}: ${prev} → ${finalPrice.toFixed(2)}. Clamping to anchor: ${anchor.toFixed(2)}`);
        finalPrice = anchor;
      }

      const pctMove = (finalPrice - prev) / prev;
      const newVol = +updateVolatility(s.volatility ?? 0.018, Math.abs(pctMove)).toFixed(4);
      const nextBase = +(((s.basePrice ?? prev) * (1 + perTickDrift))).toFixed(4);

      // Earnings
      if (s.nextEarningsTick !== undefined && tick >= s.nextEarningsTick) {
        const { report, newPrice, nextEarningsTick } = generateEarningsReport(s, tick);
        finalPrice = newPrice;
        addSet(core, s._id, { lastEarningsReport: report, nextEarningsTick });
      }

      addSet(core, s._id, {
        price: +finalPrice.toFixed(4),
        change: +(pctMove * 100).toFixed(2),
        basePrice: nextBase,
        volatility: newVol,
      });

      addPush(core, s._id, 'history', +finalPrice.toFixed(4), HISTORY_LIMIT);

      updatedMarketCap += finalPrice * (s.outstandingShares ?? 1);
      metrics.push({
        ticker: s.ticker,
        price: finalPrice,
        sector: s.sector,
        outstandingShares: s.outstandingShares ?? 1,
        change: pctMove * 100,
      });
    }

    const [news, gauss] = await Promise.all([
      newsPatches(stocks),
      gaussianPatches(stocks),
    ]);

    const merged = mergePatchMaps(core, news, gauss);
    const bulkOps = toBulk(merged);

    if (bulkOps.length) {
      console.log(`📦 Applying ${bulkOps.length} stock updates...`);
      await Stock.bulkWrite(bulkOps, { ordered: false });
    }

    recordMarketIndexHistory(metrics, divPaid);
    recordMarketMood(metrics);
    calibrate(tick, updatedMarketCap);
  } catch (err) {
    console.error('🔥 Market update error:', err);
  }
}

// === Exports ===
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
