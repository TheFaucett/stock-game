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
const generateEarningsReport = require("../utils/generateEarnings.js");

const HISTORY_LIMIT = 1200;

// ===== Time & Drift =====
const TRADING_DAYS = 365;
const ANNUAL_DRIFT_BASE = 0.12;               // target baseline ~9%/yr
let driftMultiplier = 1.0;                    // adaptive multiplier (auto-calibrated)
const TARGET_CAGR = 0.09;                     // aim for ~9% CAGR
const CALIBRATION_PERIOD = 90;                // re-calibrate about quarterly
const MAX_MULT = 1.15, MIN_MULT = 0.85;       // tight clamps to prevent runaway
const Kp = 0.15;                              // tiny proportional gain (PID-lite)
function getDailyDrift() {
  return (ANNUAL_DRIFT_BASE * driftMultiplier) / TRADING_DAYS;
}

// ===== Mean Reversion =====
const MEAN_REVERT_ALPHA = 0.03;
const meanRevertMap = new Map();
const ALPHA_VARIATION = 0.01;
const ALPHA_CHANGE_PROB = 0.005;
function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function getAlpha(ticker) {
  if (!meanRevertMap.has(ticker)) meanRevertMap.set(ticker, MEAN_REVERT_ALPHA);
  return meanRevertMap.get(ticker);
}
function maybeChangeAlpha(ticker) {
  if (Math.random() < ALPHA_CHANGE_PROB) {
    const variation = (Math.random() * 2 - 1) * ALPHA_VARIATION;
    let next = MEAN_REVERT_ALPHA + variation;
    meanRevertMap.set(ticker, clamp(next, 0.015, 0.045));
  }
}

// ===== Matthew Effect =====
const matthewDriftMap = new Map();
const MAX_MATTHEW_DRIFT = 0.001;
const MIN_MATTHEW_DRIFT = -0.001;
const MATTHEW_STEP = 0.000001;
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

// ===== Macro Chop =====
let macroChopWindow = false;
let chopDuration = 0;
let initialMarketCapForUI = null; // for the UI baseline you already log
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

// ===== Helpers =====
function randNormal() {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function getHistoricalMean(stock) {
  const prices = stock.history;
  if (!Array.isArray(prices) || prices.length === 0) return stock.basePrice || stock.price;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}
function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}] RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
}

// ===== Volatility model (adaptive) =====
// daily vol in decimal (0.02 = 2%)
// EWMA of squared returns + mean‑reversion to target + tiny positive noise
const VOL_MIN = 0.015;
const VOL_MAX = 0.25;
const LAMBDA = 0.90;            // memory (lower => reacts faster)
const TARGET_DAILY_VOL = 0.020; // ~2% daily (≈32% annualized)
const MEANREV = 0.05;           // pull strength
const VOL_NOISE = 0.0015;       // small stochastic kick
function updateVolatility(prevVol, pctMoveAbs) {
  const capped = Math.min(Math.abs(pctMoveAbs), 0.20);
  const ewma = Math.sqrt(
    LAMBDA * prevVol * prevVol +
    (1 - LAMBDA) * capped * capped
  );
  let newVol = ewma + MEANREV * (TARGET_DAILY_VOL - ewma);
  const noiseKick = Math.max(0, randNormal()) * VOL_NOISE; // non-negative
  return clamp(newVol + noiseKick, VOL_MIN, VOL_MAX);
}

// ===== Drift Calibrator (PID-lite) =====
let calibrationBaseCap = null;
let calibrationBaseTick = null;
function calibrateDriftIfNeeded(tick, currentMarketCap) {
  if (calibrationBaseCap == null || calibrationBaseTick == null) {
    if (currentMarketCap > 0) {
      calibrationBaseCap = currentMarketCap;
      calibrationBaseTick = tick;
      console.log(`🎯 Drift calibration baseline set at tick ${tick}`);
    }
    return;
  }

  const elapsed = tick - calibrationBaseTick;
  if (elapsed < CALIBRATION_PERIOD) return;

  const years = elapsed / TRADING_DAYS;
  if (years <= 0 || calibrationBaseCap <= 0) return;

  const realizedCAGR = Math.pow(currentMarketCap / calibrationBaseCap, 1 / years) - 1;
  const error = TARGET_CAGR - realizedCAGR;

  // proportional bump within tight clamps (prevents runaway/walks)
  const next = driftMultiplier * (1 + Kp * (error / Math.max(0.01, TARGET_CAGR)));
  driftMultiplier = clamp(next, MIN_MULT, MAX_MULT);

  console.log(
    `🎛️ Drift calibrator: realized=${(realizedCAGR*100).toFixed(2)}% | ` +
    `mult=${driftMultiplier.toFixed(4)} | window=${elapsed} ticks`
  );

  // reset window to avoid chasing noise
  calibrationBaseCap = currentMarketCap;
  calibrationBaseTick = tick;
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
      change: 1,
      nextEarningsTick: 1
    }).lean();

    if (!stocks.length) return console.error("⚠️ No stocks found in DB");

    if ((tick % 1000 === 0 || tick === 1) || !getMegaCaps().megaCaps.length) {
      await resetStockPrices();
      await selectMegaCaps(stocks, tick);
    }

    const isChoppy = applyMacroChop(tick);
    const bulk = [];

    let totalChangePct = 0;
    let sampleLogs = [];

    for (const stock of stocks) {
      const prevPrice = stock.price;
      const historicalMean = getHistoricalMean(stock);

      // 🎯 Dynamic Mean Reversion
      maybeChangeAlpha(stock.ticker);
      const dynamicAlpha = getAlpha(stock.ticker);
      const deviation = historicalMean - prevPrice;
      const reversionForce = deviation * dynamicAlpha; // absolute $

      // 📈 Matthew Drift
      const prevDrift = matthewDriftMap.get(stock.ticker) ?? 0;
      const driftAdj = computeMatthewDrift(stock.history);
      const newDrift = clamp(prevDrift + driftAdj, MIN_MATTHEW_DRIFT, MAX_MATTHEW_DRIFT);
      matthewDriftMap.set(stock.ticker, newDrift);
      const matthewEffect = prevPrice * newDrift; // absolute $

      // 🌀 Volatility‑scaled random shock
      const vol = typeof stock.volatility === "number" ? stock.volatility : 0.018;
      const chopMultiplier = isChoppy ? 1.3 : 1.0;     // +30% during chop window
      const volShockPct = randNormal() * vol * chopMultiplier; // % move
      const volShockAbs = prevPrice * volShockPct;     // absolute $

      // 🌪️ Small legacy chop noise
      const chopNoise = isChoppy ? (Math.random() - 0.5) * 0.004 * prevPrice : 0;

      // Combine forces (drift toward anchor happens via basePrice evolution below)
      let finalPrice = prevPrice + reversionForce + matthewEffect + volShockAbs + chopNoise;

      // 📢 Earnings Report
      if (stock.nextEarningsTick !== undefined && tick >= stock.nextEarningsTick) {
        const { report, newPrice, nextEarningsTick } = generateEarningsReport(stock, tick);
        console.log(`💰 ${stock.ticker} earnings at tick ${tick}: EPS $${report.eps}, surprise ${report.surprise}%`);
        finalPrice = newPrice;
        bulk.push({
          updateOne: {
            filter: { _id: stock._id },
            update: { $set: { lastEarningsReport: report, nextEarningsTick } }
          }
        });
      }

      // Safety floor
      finalPrice = Math.max(finalPrice, 0.01);

      const pctMove = (finalPrice - prevPrice) / prevPrice;
      const newVol = +updateVolatility(vol, Math.abs(pctMove)).toFixed(4);

      // Advance the base anchor with ADAPTIVE daily drift (calibrator)
      const dailyDrift = getDailyDrift();
      const nextBase = +( (stock.basePrice ?? prevPrice) * (1 + dailyDrift) ).toFixed(4);

      const finalHistory = [...(stock.history || []).slice(-HISTORY_LIMIT + 1), finalPrice];
      const finalChangePercent = pctMove * 100;
      totalChangePct += finalChangePercent;

      if (sampleLogs.length < 5 && Math.random() < 0.01) {
        sampleLogs.push({
          ticker: stock.ticker,
          prevPrice,
          updatedPrice: finalPrice,
          reversionForce,
          matthewEffect,
          volShockAbs,
          chopNoise,
          vol: newVol,
          changePercent: finalChangePercent
        });
      }

      bulk.push({
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: +finalPrice.toFixed(4),
              change: +finalChangePercent.toFixed(2),
              basePrice: nextBase,
              history: finalHistory,
              volatility: newVol
            }
          }
        }
      });
    }

    if (bulk.length) {
      await Stock.bulkWrite(bulk);
      console.log(`✅ Applied updates to ${bulk.length} stocks.`);
    }

    // Logs
    console.log(`📊 Avg % change this tick: ${(totalChangePct / stocks.length).toFixed(4)}%`);
    if (sampleLogs.length) {
      console.log("🔍 Sample stock adjustments:");
      sampleLogs.forEach(s => {
        console.log(
          `${s.ticker} | Prev: ${s.prevPrice.toFixed(2)} → New: ${s.updatedPrice.toFixed(2)} | Δ: ${s.changePercent.toFixed(2)}% | ` +
          `Revert: ${s.reversionForce.toFixed(4)} | Matthew: ${s.matthewEffect.toFixed(4)} | VolShock: ${s.volShockAbs.toFixed(4)} | ` +
          `Chop: ${s.chopNoise.toFixed(4)} | Vol: ${s.vol.toFixed(4)}`
        );
      });
    }

    // News + Gaussian (global adjustments)
    await applyImpactToStocks?.();
    await applyGaussian();

    // Market cap & drift calibration & mood/firms
    const marketCap = stocks.reduce((sum, s) => sum + s.price * (s.outstandingShares ?? 1), 0);

    // (UI) market cap baseline log
    if (!initialMarketCapForUI) initialMarketCapForUI = marketCap;
    const delta = ((marketCap - initialMarketCapForUI) / initialMarketCapForUI) * 100;
    console.log(`🏦 Market cap change since baseline: ${delta.toFixed(2)}%`);

    // Calibrate drift toward TARGET_CAGR safely
    calibrateDriftIfNeeded(tick, marketCap);

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
