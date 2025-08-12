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

const HISTORY_LIMIT = 1200; // how much we KEEP in Mongo for charts

// ====== TIMEBASE (one tick == one sim day) ======
const TICKS_PER_DAY = 1;                 // ✅ your sim uses 1 tick per in-day
const TRADING_DAYS = 365;
const TICKS_PER_YEAR = TRADING_DAYS * TICKS_PER_DAY;

// Project only a small tail each tick (OOM-safe), keep long history in Mongo
const SIGNAL_TAIL_DAYS = 10;
const SIGNAL_TAIL = SIGNAL_TAIL_DAYS * TICKS_PER_DAY; // = 10

// ====== DRIFT / CALIBRATOR ======
const ANNUAL_DRIFT_BASE = 0.12;          // baseline ~12%/yr
let driftMultiplier = 1.0;               // adaptive multiplier (auto-calibrated)

// Slight bullish bias (+3%/yr) that the calibrator does NOT try to remove
const MARKET_BIAS_ANNUAL = 0.03;

const TARGET_CAGR = 0.12;                // aim for ~12%/yr realized
const CALIBRATION_PERIOD_DAYS = 90;
const CALIBRATION_PERIOD_TICKS = CALIBRATION_PERIOD_DAYS * TICKS_PER_DAY;
const MAX_MULT = 1.20;
const MIN_MULT = 0.95;

function perTickFromAnnual(a) {
  return Math.pow(1 + a, 1 / TICKS_PER_YEAR) - 1;
}
function getPerTickDrift() {
  return perTickFromAnnual(ANNUAL_DRIFT_BASE * driftMultiplier);
}
const MARKET_BIAS_PER_TICK = perTickFromAnnual(MARKET_BIAS_ANNUAL);

// ====== MEAN REVERSION ======
let MEAN_REVERT_ALPHA = 0.015;           // gentle pull
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
    const next = MEAN_REVERT_ALPHA + variation;
    meanRevertMap.set(ticker, clamp(next, 0.012, 0.030));
  }
}
// Anchor tilted toward basePrice (which drifts upward) to avoid persistent down-pull
function getAnchor(stock) {
  const tail = Array.isArray(stock.history) && stock.history.length
    ? stock.history.reduce((a, b) => a + b, 0) / stock.history.length
    : (stock.basePrice ?? stock.price);
  const base = stock.basePrice ?? tail;
  return 0.4 * tail + 0.6 * base;
}

// ====== MATTHEW EFFECT (zero-mean, vol-normalized) ======
const MATT_WIN = 60;         // lookback (ticks)
const MATT_MIN_WIN = 20;     // need at least this many points
const MATT_MAX_BPS = 0.00005; // ±0.5 bps per tick

function computeMatthewSignal(historyTail = []) {
  if (!Array.isArray(historyTail) || historyTail.length < MATT_MIN_WIN + 1) return 0;
  const n = historyTail.length;
  const win = Math.min(MATT_WIN, n - 1);
  const curr = historyTail[n - 1];
  const past = historyTail[n - 1 - win];
  if (!past || past <= 0 || !curr) return 0;

  const roc = (curr / past) - 1;

  // mean absolute 1-step returns within window (vol proxy)
  let sumAbs = 0, cnt = 0;
  for (let i = n - win; i < n; i++) {
    const prev = historyTail[i - 1];
    const v = prev ? Math.abs((historyTail[i] - prev) / prev) : 0;
    if (Number.isFinite(v)) { sumAbs += v; cnt++; }
  }
  const vol = Math.max(1e-6, sumAbs / Math.max(1, cnt));
  const z = roc / vol;
  return Math.tanh(z); // [-1, 1]
}

// ====== MACRO CHOP ======
let macroChopWindow = false;
let chopDuration = 0;
let initialMarketCapForUI = null; // for baseline log

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

// ====== HELPERS ======
function randNormal() {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(`[MEMORY${context ? " | " + context : ""}] RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`);
}

// ====== VOLATILITY (daily, applied once per tick) ======
const VOL_MIN = 0.015;
const VOL_MAX = 0.25;
const LAMBDA = 0.90;            // memory
const TARGET_DAILY_VOL = 0.020; // ~2% daily (≈32% annualized)
const MEANREV = 0.05;
const VOL_NOISE = 0.0015;

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

// ====== DRIFT CALIBRATOR (tick-based, asymmetric) ======
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

  const elapsedTicks = tick - calibrationBaseTick;
  if (elapsedTicks < CALIBRATION_PERIOD_TICKS) return;

  const years = elapsedTicks / TICKS_PER_YEAR;
  if (years <= 0 || calibrationBaseCap <= 0) return;

  const realizedCAGR = Math.pow(currentMarketCap / calibrationBaseCap, 1 / years) - 1;
  const error = TARGET_CAGR - realizedCAGR;

  // Push up faster than we pull down (asymmetric)
  const KpUp = 0.16;
  const KpDown = 0.05;
  const gain = (error >= 0 ? KpUp : KpDown) * (error / Math.max(0.01, TARGET_CAGR));
  const next = driftMultiplier * (1 + gain);

  driftMultiplier = clamp(next, MIN_MULT, MAX_MULT);

  console.log(
    `🎛️ Drift calibrator: realized=${(realizedCAGR * 100).toFixed(2)}% | ` +
    `mult=${driftMultiplier.toFixed(4)} | window=${elapsedTicks} ticks`
  );

  calibrationBaseCap = currentMarketCap;
  calibrationBaseTick = tick;
}

// ====== MAIN TICK ======
async function updateMarket() {
  try {
    console.log("🔄 Starting market tick update...");
    logMemoryUsage("before update");

    const tick = incrementTick();
    console.log(`⏱️ Tick #${tick}`);

    if (tick % 2 === 0) await autoCoverShorts();

    // Dividends (collect totalPaid if util returns it)
    let divInfo = { totalPaid: 0 };
    if (tick % 90 === 0) {
      try {
        const maybe = await payDividends();
        if (maybe && typeof maybe.totalPaid === "number") divInfo.totalPaid = maybe.totalPaid;
      } catch (e) {
        console.warn("⚠️ payDividends failed (continuing):", e?.message || e);
      }
    }

    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);

    // Only load a small tail each tick (OOM-safe)
    const stocks = await Stock.find(
      {},
      {
        ticker: 1,
        sector: 1,
        price: 1,
        basePrice: 1,
        volatility: 1,
        outstandingShares: 1,
        change: 1,
        nextEarningsTick: 1,
        history: { $slice: -SIGNAL_TAIL },
      }
    ).lean();

    if (!stocks.length) {
      console.error("⚠️ No stocks found in DB");
      return;
    }

    if ((tick % 1000 === 0 || tick === 1) || !getMegaCaps().megaCaps.length) {
      await resetStockPrices();
      await selectMegaCaps(stocks, tick);
    }

    const isChoppy = applyMacroChop(tick);
    const perTickDrift = getPerTickDrift();

    const bulk = [];
    let totalChangePct = 0;
    let updatedMarketCap = 0;
    const updatedStocksForMetrics = [];
    const sampleLogs = [];

    // Precompute Matthew signals and de-mean
    const mattSignals = new Map();
    let sumSignals = 0, countSignals = 0;
    for (const s of stocks) {
      const sig = computeMatthewSignal(s.history);
      if (sig !== 0) { sumSignals += sig; countSignals++; }
      mattSignals.set(s.ticker, sig);
    }
    const meanSignal = countSignals ? (sumSignals / countSignals) : 0;

    for (const stock of stocks) {
      const prevPrice = stock.price;

      // Mean reversion toward anchor
      maybeChangeAlpha(stock.ticker);
      const dynamicAlpha = getAlpha(stock.ticker);
      const anchor = getAnchor(stock);
      const reversionForce = (anchor - prevPrice) * dynamicAlpha; // absolute $

      // Matthew (zero-mean, capped bps)
      const rawSig = mattSignals.get(stock.ticker) || 0;
      const deMeaned = rawSig - meanSignal;
      const matthewPct = clamp(deMeaned * MATT_MAX_BPS, -MATT_MAX_BPS, MATT_MAX_BPS);
      const matthewEffect = prevPrice * matthewPct;

      // Volatility-scaled random shock (daily, once per tick)
      const vol = typeof stock.volatility === "number" ? stock.volatility : 0.018;
      const chopMultiplier = isChoppy ? 1.15 : 1.0;  // softened to avoid cascades
      const volShockPct = randNormal() * vol * chopMultiplier;
      const volShockAbs = prevPrice * volShockPct;

      // Small legacy chop noise
      const chopNoise = isChoppy ? (Math.random() - 0.5) * 0.004 * prevPrice : 0;

      // Combine forces
      let finalPrice = prevPrice + reversionForce + matthewEffect + volShockAbs + chopNoise;

      // Always-on bullish bias outside the calibrator
      finalPrice *= (1 + MARKET_BIAS_PER_TICK);

      // Earnings
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

      // Floor
      finalPrice = Math.max(finalPrice, 0.01);

      const pctMove = (finalPrice - prevPrice) / prevPrice;
      const newVol = +updateVolatility(vol, Math.abs(pctMove)).toFixed(4);

      // Drift the base anchor per tick
      const nextBase = +(((stock.basePrice ?? prevPrice) * (1 + perTickDrift))).toFixed(4);

      const changePct = pctMove * 100;
      totalChangePct += changePct;

      // Batch DB updates (Mongo keeps rolling history)
      bulk.push({
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: +finalPrice.toFixed(4),
              change: +changePct.toFixed(2), // for UI lists
              basePrice: nextBase,
              volatility: newVol
            },
            $push: {
              history: { $each: [ +finalPrice.toFixed(4) ], $slice: -HISTORY_LIMIT }
            }
          }
        }
      });

      // Minimal payload for metrics / index / mood
      updatedStocksForMetrics.push({
        ticker: stock.ticker,
        price: finalPrice,
        sector: stock.sector,
        outstandingShares: stock.outstandingShares ?? 1,
        change: changePct
      });
      updatedMarketCap += finalPrice * (stock.outstandingShares ?? 1);

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
          changePercent: changePct
        });
      }
    }

    if (bulk.length) {
      await Stock.bulkWrite(bulk, { ordered: false });
      console.log(`✅ Applied updates to ${bulk.length} stocks.`);
    }

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

    // Global adjustments (news / gaussian)
    await applyImpactToStocks?.();
    await applyGaussian();

    // Market cap baseline + calibrator + metrics
    if (!initialMarketCapForUI) initialMarketCapForUI = updatedMarketCap;
    const delta = ((updatedMarketCap - initialMarketCapForUI) / initialMarketCapForUI) * 100;
    console.log(`🏦 Market cap change since baseline: ${delta.toFixed(2)}%`);

    calibrateDriftIfNeeded(tick, updatedMarketCap);

    // Total-return index (include dividends if available)
    recordMarketIndexHistory(updatedStocksForMetrics, (divInfo.totalPaid || 0));

    const mood = recordMarketMood(updatedStocksForMetrics);
    processFirms(mood);

    console.log(
      `🎚 driftMult=${driftMultiplier.toFixed(4)} | perTick=${(getPerTickDrift() * 1e4).toFixed(3)}bps | ` +
      `bias=${(MARKET_BIAS_PER_TICK * 1e4).toFixed(3)}bps`
    );
    logMemoryUsage("after update");
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
