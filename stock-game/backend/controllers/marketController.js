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

function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}] RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
}

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

// === Constants ===
const HISTORY_LIMIT = 1200;
const TICKS_PER_YEAR = 365;
const SIGNAL_TAIL = 10;
const ANNUAL_DRIFT_BASE = 0.12;
const MARKET_BIAS_ANNUAL = 0.03;
const VOL_MIN = 0.015, VOL_MAX = 0.125, LAMBDA = 0.90, TARGET_DAILY_VOL = 0.020, MEANREV = 0.05, VOL_NOISE = 0.0015;

let driftMultiplier = 1.0;
const TARGET_CAGR = 0.12;
const CAL_TICKS = 90;
const MAX_MULT = 1.20, MIN_MULT = 0.95;

function perTickFromAnnual(a) {
  return Math.pow(1 + a, 1 / TICKS_PER_YEAR) - 1;
}
function getPerTickDrift() {
  return perTickFromAnnual(ANNUAL_DRIFT_BASE * driftMultiplier);
}
const MARKET_BIAS_PER_TICK = perTickFromAnnual(MARKET_BIAS_ANNUAL);

function updateVolatility(prevVol = 0.02, pctMoveAbs = 0.01) {
  const capped = Math.min(Math.abs(pctMoveAbs), 0.20);
  const ewma = Math.sqrt(LAMBDA * prevVol ** 2 + (1 - LAMBDA) * capped ** 2);
  const meanReverted = ewma + MEANREV * (TARGET_DAILY_VOL - ewma);
  const noise = randNormal() * VOL_NOISE;
  const result = meanReverted + noise;
  return Number.isFinite(result) ? clamp(result, VOL_MIN, VOL_MAX) : 0.02;
}

function getAnchor(stock) {
  let tail = Array.isArray(stock.history) ? stock.history.slice(-10) : [];
  if (tail.length < 2) {
    const fallback = safeNumber(stock.price, 100);
    tail = Array(10).fill(fallback);
  }
  const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
  const base = safeNumber(stock.basePrice, tailMean);
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
  const realized = Math.pow(marketCap / baseCap, 1 / years) - 1;
  const err = TARGET_CAGR - realized;
  const Kp = err >= 0 ? 0.16 : 0.05;
  const gain = Kp * (err / Math.max(0.01, TARGET_CAGR));

  driftMultiplier = clamp(driftMultiplier * (1 + gain), MIN_MULT, MAX_MULT);
  baseCap = marketCap;
  baseTick = tick;
  console.log(`🎯 Drift multiplier updated: ${driftMultiplier.toFixed(4)} (realized=${(realized * 100).toFixed(2)}%)`);
}

// === DEBUGGING ===
const DEBUG_TICKERS = ['ASTC', 'SPEX', 'XENK', 'TUVO', 'ZENQ'];

async function updateMarket() {
  try {
    const tick = incrementTick();
    logMemoryUsage(`Tick ${tick}`);

    if (tick % 2 === 0) await autoCoverShorts();
    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);

    let divPaid = 0;
    if (tick % 90 === 0) {
      const d = await payDividends().catch(() => null);
      if (d?.totalPaid) divPaid = d.totalPaid;
    }

    const stocks = await Stock.find({}, {
      _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
      volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
      history: { $slice: -SIGNAL_TAIL }
    }).lean();

    if (!stocks.length) {
      console.warn("⚠️ No stocks found during market update.");
      return;
    }

    console.log(`🧪 Updating ${stocks.length} stocks on tick ${tick}`);

    if ((tick % 1000 === 0 || tick === 1) || !getMegaCaps().megaCaps.length) {
      console.log("🔁 Resetting stock prices + selecting megacaps...");
      await resetStockPrices();
      await selectMegaCaps(stocks, tick);
    }

    const core = new Map();
    let updatedMarketCap = 0;
    const metrics = [];

    for (const s of stocks) {
      const prev = safeNumber(s.price, 100);
      const vol = safeNumber(s.volatility, 0.02);
      const shares = safeNumber(s.outstandingShares, 1);
      const base = safeNumber(s.basePrice, prev);

      const anchor = getAnchor(s);
      const reversion = (anchor - prev) * 0.015;
      const volShockPct = randNormal() * vol;
      const rawPrice = prev + reversion + prev * volShockPct;

      let finalPrice = rawPrice * (1 + MARKET_BIAS_PER_TICK);
      finalPrice = Math.max(finalPrice, 0.01);

      if (!Number.isFinite(finalPrice)) {
        console.warn(`🚨 Invalid price for ${s.ticker}:`, { prev, anchor, vol, volShockPct });
        finalPrice = anchor;
      }

      const pctMove = prev ? (finalPrice - prev) / prev : 0;
      const absMove = Math.abs(pctMove * 100);
      const newVol = +updateVolatility(vol, Math.abs(pctMove)).toFixed(4);

      // 🎯 New Base Calculation
      const baseBlend = 0.10;
      const nextBase = +(base * (1 - baseBlend) + finalPrice * baseBlend).toFixed(4);

      if (absMove > 10) {
        console.warn(`📈 ${s.ticker} moved ${absMove.toFixed(2)}% → ${prev.toFixed(2)} → ${finalPrice.toFixed(2)}`);
      }

      if (DEBUG_TICKERS.includes(s.ticker)) {
        console.log(`--- 🧠 DEBUG: ${s.ticker} on Tick ${tick} ---`);
        console.log(`prev=${prev.toFixed(4)}, base=${base.toFixed(4)}, anchor=${anchor.toFixed(2)}`);
        console.log(`vol=${vol.toFixed(4)}, volShockPct=${volShockPct.toFixed(4)} (${(volShockPct / vol).toFixed(2)}σ)`);
        console.log(`reversionEffect=${reversion.toFixed(4)}`);
        console.log(`raw finalPrice=${rawPrice.toFixed(4)}`);
        console.log(`finalPrice (after bias & floor)=${finalPrice.toFixed(4)}`);
        console.log(`pctMove=${(pctMove * 100).toFixed(2)}%, newVol=${newVol.toFixed(4)}, nextBase=${nextBase}`);
      }

      if (Number.isFinite(s.nextEarningsTick) && tick >= s.nextEarningsTick) {
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

      updatedMarketCap += finalPrice * shares;
      metrics.push({
        ticker: s.ticker,
        price: finalPrice,
        sector: s.sector,
        outstandingShares: shares,
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
