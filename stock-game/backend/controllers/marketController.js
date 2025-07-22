const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const Stock = require("../models/Stock");
const { applyImpactToStocks } = require("./newsImpactController.js");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { recordMarketIndexHistory } = require("../utils/marketIndex.js");
const { autoCoverShorts } = require("../utils/autoCoverShorts.js");
const { incrementTick } = require("../utils/tickTracker.js");
const { sweepOptionExpiries } = require("../utils/sweepOptions.js");
const { sweepLoanPayments } = require("../utils/sweepLoans.js");
const { payDividends } = require("../utils/payDividends.js");
const { processFirms } = require("./firmController.js");

const HISTORY_LIMIT = 1200;
const TRADING_DAYS = 365;
const ANNUAL_DRIFT = 0.09;
const DAILY_DRIFT = ANNUAL_DRIFT / TRADING_DAYS;
const MEAN_REVERT_ALPHA = 0.01;

// 📈 Matthew Effect Drift
const matthewDriftMap = new Map();
const MAX_MATTHEW_DRIFT = 0.001;
const MIN_MATTHEW_DRIFT = -0.001;
const MATTHEW_STEP = 0.000001;

// 🌪️ Macro chop state
let macroChopWindow = false;
let chopDuration = 0;

let initialMarketCap = null;

function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}]`, `RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
}

function computeMatthewDrift(history = []) {
  if (history.length < 30) return 0;
  const past = history[history.length - 30];
  const current = history[history.length - 1];
  if (!past || past === 0) return 0;

  const pctChange = (current - past) / past;
  if (pctChange > 0.05) return MATTHEW_STEP;
  if (pctChange < -0.05) return -MATTHEW_STEP * 0.33;
  return 0;
}

function applyMacroChop(tick) {
  if (macroChopWindow) {
    chopDuration--;
    if (chopDuration <= 0) macroChopWindow = false;
  } else if (Math.random() < 0.03 && tick > 30) {
    macroChopWindow = true;
    chopDuration = Math.floor(Math.random() * 10 + 5);
    console.log(`🌪️ Entering macro volatility window for ${chopDuration} ticks!`);
  }
  return macroChopWindow;
}

async function updateMarket() {
  try {
    console.log("🔄 Starting market tick update...");
    logMemoryUsage("before update");

    const tick = incrementTick();
    console.log(`⏱️ Tick #${tick}`);

    if (tick % 2 === 0) await autoCoverShorts();
    if (tick % 90 === 0) await payDividends();
    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);

    const stocks = await Stock.find({}, {
      ticker: 1, price: 1, basePrice: 1, volatility: 1,
      history: 1, outstandingShares: 1
    }).lean();

    if (!stocks.length) return console.error("⚠️ No stocks found in DB");

    const isChoppy = applyMacroChop(tick);
    const bulk = [];

    for (const stock of stocks) {
      const prev = stock.price;
      const base = stock.basePrice ?? prev;
      const driftedBase = base * (1 + DAILY_DRIFT);

      // ⛅ Mean reversion
      const performanceScore = (prev - base) / base;
      const revert = MEAN_REVERT_ALPHA * (driftedBase - prev);
      const extremeRevert = performanceScore > 0.3 ? revert * 1.5 : revert;

      // 🧠 Matthew Effect
      const prevDrift = matthewDriftMap.get(stock.ticker) ?? 0;
      const driftAdj = computeMatthewDrift(stock.history);
      const newDrift = Math.max(MIN_MATTHEW_DRIFT, Math.min(MAX_MATTHEW_DRIFT, prevDrift + driftAdj));
      matthewDriftMap.set(stock.ticker, newDrift);
      const driftEffect = prev * newDrift;

      // 🌪️ Chop noise
      const chopNoise = isChoppy ? (Math.random() - 0.5) * 0.01 * prev : 0;

      const newPrice = Math.max(prev + extremeRevert + driftEffect + chopNoise, 0.01);
      const history = [...(stock.history || []).slice(-HISTORY_LIMIT + 1), newPrice];
      const change = ((newPrice - prev) / prev) * 100;

      bulk.push({
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: +newPrice.toFixed(4),
              change: +change.toFixed(2),
              basePrice: +driftedBase.toFixed(4),
              history
            }
          }
        }
      });
    }

    if (bulk.length) {
      await Stock.bulkWrite(bulk);
      console.log(`✅ Macro + mean reversion + Matthew drift${isChoppy ? " + volatility chop" : ""} applied to ${bulk.length} stocks.`);
    }

    await applyImpactToStocks();
    await applyGaussian();

    const marketCap = stocks.reduce((sum, s) => sum + s.price * (s.outstandingShares ?? 1), 0);
    if (!initialMarketCap) initialMarketCap = marketCap;
    const capDelta = ((marketCap - initialMarketCap) / initialMarketCap) * 100;
    console.log(`📊 Market cap since baseline: ${capDelta.toFixed(2)}%`);

    recordMarketIndexHistory(stocks);
    const marketMood = recordMarketMood(stocks);
    processFirms(marketMood);

  } catch (err) {
    console.error("🔥 Market update error:", err);
  }
}

module.exports = {
  updateMarket,
  getMarketMoodController: (req, res) => {
    const history = getMoodHistory();
    res.json({ mood: history.at(-1)?.mood || "neutral", moodHistory: history });
  }
};
