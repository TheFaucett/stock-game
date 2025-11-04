// backend/controllers/marketController.js
const Stock = require("../models/Stock");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { recordMarketIndexHistory } = require("../utils/marketIndex.js");
const { incrementTick } = require("../utils/tickTracker.js");
const { autoCoverShorts } = require("../utils/autoCoverShorts.js");
const { sweepOptionExpiries } = require("../utils/sweepOptions.js");
const { sweepLoanPayments } = require("../utils/sweepLoans.js");
const { payDividends } = require("../utils/payDividends.js");
const { gaussianPatches } = require("../utils/applyGaussian.js");
const { newsPatches } = require("./newsImpactController.js");
const { addSet, addPush, mergePatchMaps, toBulk } = require("../utils/patchKit");
const { getMarketProfile } = require("../utils/marketState");
const generateEarningsReport = require("../utils/generateEarnings.js");
const { getOrGenerateSampleTickers } = require("../utils/sampleStocks"); // ✅ persistent random 50

// 🔁 Constants
let lastResetTick = 0;
const RESET_INTERVAL = 1000;
const DEBUG_TICKERS = ['SPEX', 'ASTC'];
const SAMPLE_LIMIT = 50;

// 🔧 Utilities
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

function updateVolatility(prevVol, pctMoveAbs, profile) {
  const capped = Math.min(pctMoveAbs, 0.20);
  const ewma = Math.sqrt(0.9 * prevVol ** 2 + 0.1 * capped ** 2);
  const reversionTarget = profile.volatilityBase;
  let adjusted = ewma * 0.7 + reversionTarget * 0.3;

  if (pctMoveAbs < 0.005) adjusted -= profile.volatilityDecay;
  if (pctMoveAbs > 0.05) adjusted += profile.volatilityDecay * 2;

  adjusted += clamp(randNormal() * profile.volatilityNoise, -0.001, 0.001);
  return clamp(adjusted, profile.volatilityClamp[0], profile.volatilityClamp[1]);
}

function getAnchor(stock) {
  const tail = Array.isArray(stock.history) ? stock.history.slice(-10) : [];
  const fallback = safeNumber(stock.price, 100);
  const base = safeNumber(stock.basePrice, fallback);
  const tailMean = tail.length > 1 ? tail.reduce((a, b) => a + b, 0) / tail.length : fallback;
  return 0.5 * base + 0.5 * tailMean;
}

// 🧠 Main market logic
async function updateMarket() {
  try {
    const profile = getMarketProfile();
    const tick = incrementTick();
    if (!Number.isFinite(tick) || tick <= 0) {
      console.warn("⚠️ Invalid tick value:", tick);
      return;
    }

    logMemoryUsage(`Tick ${tick}`);

    // 🔧 Dev/Scenario tuning
    const scenario = getMarketProfile();
    if (scenario.marketModifiers) {
      if (scenario.marketModifiers.volatilityMultiplier) {
        profile.volatilityBase *= scenario.marketModifiers.volatilityMultiplier;
      }
      if (scenario.marketModifiers.sectorBias) {
        profile.sectorBias = scenario.marketModifiers.sectorBias;
      }
    }

    // 🔁 System-level sweeps
    if (tick % 2 === 0) await autoCoverShorts();
    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);
    if (tick % 90 === 0) await payDividends();

    // 🎯 Fetch the persistent sample set
    const sampleTickers = await getOrGenerateSampleTickers(SAMPLE_LIMIT);
    console.log(`🎯 Updating ${sampleTickers.size} persistent sample stocks...`);

    // 🧠 Load only those stocks
    const stocks = await Stock.find(
      { ticker: { $in: [...sampleTickers] } },
      {
        _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
        volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
        history: { $slice: -profile.signalTail },
      }
    ).lean();

    if (!stocks.length) return console.warn("⚠️ No sample stocks found.");

    const core = new Map();
    const metrics = [];
    let updatedMarketCap = 0;
    const driftPerTick = Math.pow(1 + profile.driftAnnual, 1 / profile.ticksPerYear) - 1;

    // 💹 Main stock updates
    for (const s of stocks) {
      const prev = safeNumber(s.price, 100);
      const vol = safeNumber(s.volatility, profile.volatilityBase);
      const base = safeNumber(s.basePrice, prev);
      const shares = safeNumber(s.outstandingShares, 1);
      const anchor = getAnchor(s);

      let sectorBias = profile.sectorBias?.[s.sector] || 0;
      const reversion = (anchor - prev) * profile.meanRevertAlpha;
      const shock = randNormal() * vol * 0.5;

      let rawPrice = prev + reversion + prev * shock;
      rawPrice *= (1 + sectorBias);
      rawPrice = Math.max(0.01, rawPrice);

      let pctMove = (rawPrice - prev) / prev;
      pctMove = clamp(pctMove, -profile.maxMovePerTick, profile.maxMovePerTick);
      const finalPrice = +(prev * (1 + pctMove)).toFixed(4);

      const nextVol = +updateVolatility(vol, Math.abs(pctMove), profile).toFixed(4);
      const driftedBase = base * (1 + driftPerTick);
      const nextBase = +(driftedBase * (1 - profile.baseBlend) + finalPrice * profile.baseBlend).toFixed(4);

      if (DEBUG_TICKERS.includes(s.ticker)) {
        console.log(`--- DEBUG: ${s.ticker} Tick ${tick} ---`);
        console.log(`prev=${prev}, anchor=${anchor}, reversion=${reversion.toFixed(4)}, shock=${shock.toFixed(4)}`);
        console.log(`rawPrice=${rawPrice.toFixed(4)}, pctMove=${(pctMove * 100).toFixed(2)}%, nextVol=${nextVol}`);
      }

      if (Number.isFinite(s.nextEarningsTick) && tick >= s.nextEarningsTick) {
        const { report, nextEarningsTick } = generateEarningsReport(s, tick);
        addSet(core, s._id, { lastEarningsReport: report, nextEarningsTick });
      }

      addSet(core, s._id, {
        price: finalPrice,
        change: +(pctMove * 100).toFixed(2),
        volatility: nextVol,
        basePrice: nextBase,
      });

      addPush(core, s._id, 'history', finalPrice, profile.historyLimit);
      updatedMarketCap += finalPrice * shares;

      metrics.push({
        ticker: s.ticker,
        price: finalPrice,
        sector: s.sector,
        outstandingShares: shares,
        change: pctMove * 100,
      });
    }

    // 🧩 Apply external patches (news + Gaussian)
    const [{ patches: news, log: newsLog }, gauss] = await Promise.all([
      newsPatches(stocks),
      gaussianPatches(stocks),
    ]);

    // 📰 Log ticker-specific news impacts
    if (newsLog.length) {
      const impactful = newsLog.filter(e => e.source === 'ticker' && (e.delta !== 0 || e.volBump !== 0));
      if (impactful.length) {
        console.log("📰 News Impact Log:");
        impactful.forEach(entry => {
          console.log(`🔸 ${entry.ticker}: Δ=${entry.delta}, +vol=${entry.volBump}`);
        });
      }
    }

    // 🧾 Merge all patches and commit
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

// 🔍 Exported controllers
module.exports = {
  updateMarket,
  getMarketMoodController: (req, res) => {
    const history = getMoodHistory();
    res.json({
      mood: history.at(-1)?.mood || 'neutral',
      moodHistory: history,
    });
  },
};
