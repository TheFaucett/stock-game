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
const resetStockPrices = require("../utils/resetStocks.js");
const { selectMegaCaps, getMegaCaps } = require("../utils/megaCaps.js");

const HISTORY_LIMIT = 1200;
const TRADING_DAYS = 365;
const ANNUAL_DRIFT = 0.09;
const DAILY_DRIFT = ANNUAL_DRIFT / TRADING_DAYS;
const MEAN_REVERT_ALPHA = 0.03;

// 📈 Dynamic Mean Reversion Config
const meanRevertMap = new Map();
const ALPHA_VARIATION = 0.01; // +/- around the mean
const ALPHA_CHANGE_PROB = 0.005; // 0.5% chance per tick
function getAlpha(ticker) {
  if (!meanRevertMap.has(ticker)) {
    meanRevertMap.set(ticker, MEAN_REVERT_ALPHA);
  }
  return meanRevertMap.get(ticker);
}
function maybeChangeAlpha(ticker) {
  if (Math.random() < ALPHA_CHANGE_PROB) {
    const variation = (Math.random() * 2 - 1) * ALPHA_VARIATION;
    let newAlpha = MEAN_REVERT_ALPHA + variation;
    newAlpha = Math.max(0.015, Math.min(0.045, newAlpha));
    meanRevertMap.set(ticker, newAlpha);
  }
}

// 📈 Matthew Effect Drift
const matthewDriftMap = new Map();
const MAX_MATTHEW_DRIFT = 0.001;
const MIN_MATTHEW_DRIFT = -0.001;
const MATTHEW_STEP = 0.000001;

// 🌪️ Macro chop state
let macroChopWindow = false;
let chopDuration = 0;
let initialMarketCap = null;

function getHistoricalMean(stock) {
  const prices = stock.history;
  if (!Array.isArray(prices) || prices.length === 0) return stock.basePrice || stock.price;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
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

function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}] RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
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
      ticker: 1,
      price: 1,
      basePrice: 1,
      volatility: 1,
      history: 1,
      outstandingShares: 1,
      change: 1
    }).lean();

    if (!stocks.length) return console.error("⚠️ No stocks found in DB");

    if ((tick % 1000 === 0 || tick === 1) || !getMegaCaps().megaCaps.length) {
      await resetStockPrices();
      await selectMegaCaps(stocks, tick);
    }

    const isChoppy = applyMacroChop(tick);
    const bulk = [];

    for (const stock of stocks) {
      const prevPrice = stock.price;
      const historicalMean = getHistoricalMean(stock);

      // 🎯 Dynamic Mean Reversion
      maybeChangeAlpha(stock.ticker);
      const dynamicAlpha = getAlpha(stock.ticker);
      const deviation = historicalMean - prevPrice;
      const reversionForce = deviation * dynamicAlpha;

      // 📈 Matthew Drift
      const prevDrift = matthewDriftMap.get(stock.ticker) ?? 0;
      const driftAdj = computeMatthewDrift(stock.history);
      const newDrift = Math.max(MIN_MATTHEW_DRIFT, Math.min(MAX_MATTHEW_DRIFT, prevDrift + driftAdj));
      matthewDriftMap.set(stock.ticker, newDrift);
      const matthewEffect = prevPrice * newDrift;

      // 🌪️ Chop noise
      const chopNoise = isChoppy ? (Math.random() - 0.5) * 0.01 * prevPrice : 0;

      const updatedPrice = Math.max(prevPrice + reversionForce + matthewEffect + chopNoise, 0.01);
      const updatedHistory = [...(stock.history || []).slice(-HISTORY_LIMIT + 1), updatedPrice];
      const changePercent = ((updatedPrice - prevPrice) / prevPrice) * 100;

      bulk.push({
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: +updatedPrice.toFixed(4),
              change: +changePercent.toFixed(2),
              basePrice: +(stock.basePrice * (1 + DAILY_DRIFT)).toFixed(4),
              history: updatedHistory
            }
          }
        }
      });
    }

    if (bulk.length) {
      await Stock.bulkWrite(bulk);
      console.log(`✅ Dynamic alpha + Matthew drift${isChoppy ? " + volatility chop" : ""} applied to ${bulk.length} stocks.`);
    }

    await applyImpactToStocks();
    await applyGaussian();

    const marketCap = stocks.reduce((sum, s) => sum + s.price * (s.outstandingShares ?? 1), 0);
    if (!initialMarketCap) initialMarketCap = marketCap;
    const delta = ((marketCap - initialMarketCap) / initialMarketCap) * 100;
    console.log(`📊 Market cap since baseline: ${delta.toFixed(2)}%`);

    recordMarketIndexHistory(stocks);
    const mood = recordMarketMood(stocks);
    processFirms(mood);

  } catch (err) {
    console.error("🔥 Market update error:", err);
  }
}

module.exports = {
  updateMarket,
  getMarketMoodController: (req, res) => {
    const history = getMoodHistory();
    res.json({
      mood: history.at(-1)?.mood || "neutral",
      moodHistory: history
    });
  }
};
