
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const Stock = require("../models/Stock");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { maybeApplyShock } = require("../utils/economicEnvironment.js");
const { recordMarketIndexHistory } = require("../utils/marketIndex.js");
const { autoCoverShorts } = require("../utils/autoCoverShorts.js");
const { incrementTick } = require("../utils/tickTracker.js");
const { sweepOptionExpiries } = require("../utils/sweepOptions.js");
const { sweepLoanPayments } = require("../utils/sweepLoans.js");
const { payDividends } = require("../utils/payDividends.js");
const { processFirms } = require("./firmController.js");
const HISTORY_LIMIT = 1200

// Macro parameters
const TRADING_DAYS = 365;               // trading days per year
const ANNUAL_DRIFT = 0.09;              // +9% per year
const DAILY_DRIFT = ANNUAL_DRIFT / TRADING_DAYS;    // ≈ 0.000357
const MEAN_REVERT_ALPHA = 0.01;         // 1% mean reversion per day

// Sector/stock “personality” (in-memory, not persisted)
const sectorTrends = {};
const SECTOR_STEP = 0.00005, SECTOR_CLAMP = 0.001;

const stockDrifts = new Map();
const DRIFT_STEP = 0.00002, DRIFT_CLAMP = 0.0005;
let initialMarketCap = null;
// Normal random helper
function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
function logMemoryUsage(context = "") {
  const mem = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";
  console.log(
    `[MEMORY${context ? " | " + context : ""}]`,
    `RSS: ${mb(mem.rss)} | Heap Used: ${mb(mem.heapUsed)} | Heap Total: ${mb(mem.heapTotal)}`
  );
}

async function updateMarket() {
  try {
    console.log("🔄 Updating market state…");
    logMemoryUsage("before market update");
    maybeApplyShock();

    const tick = incrementTick();
    console.log(`⏱️ Tick #${tick} complete`);

    if (tick % 2 === 0) applyGaussian();

    if (tick % 12 === 0) await autoCoverShorts();
    if (tick % 90 === 0) await payDividends();

    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);

    // Only fetch fields in schema!
    const stocks = await Stock.find({}, {
      ticker: 1, price: 1, volatility: 1, history: 1, sector: 1, liquidity: 1, basePrice: 1, change: 1, outstandingShares: 1, eps: 1, peRatio: 1, dividendYield: 1,  // see this if you can't find something but its in mongo.
    }).lean();

    if (!stocks.length) {
      console.error("⚠️ No stocks found in DB!");
      return;
    }

    // Sector trends: gentle random-walk per sector
    const allSectors = [...new Set(stocks.map(s => s.sector).filter(Boolean))];
    for (const sector of allSectors) {
      sectorTrends[sector] = clamp(
        (sectorTrends[sector] ?? 0) + (Math.random() - 0.5) * SECTOR_STEP,
        -SECTOR_CLAMP, SECTOR_CLAMP
      );
    }

    // Stock drifts: gentle random-walk in-memory
    for (const stock of stocks) {
      const drift = clamp(
        (stockDrifts.get(stock.ticker) ?? (Math.random()-0.5)*0.0001)
        + (Math.random() - 0.5) * DRIFT_STEP,
        -DRIFT_CLAMP, DRIFT_CLAMP
      );
      stockDrifts.set(stock.ticker, drift);
    }

    const bulk = [];

    // MAIN: Per-stock update
    logMemoryUsage("before single stock updates");
    for (const s of stocks) {
      const prev = s.price;
      const volatility = s.volatility ?? 0.015;
      const sectorBias = sectorTrends[s.sector] ?? 0;
      const stockDrift = stockDrifts.get(s.ticker) ?? 0;

      // 1. Advance the “baseline” macro anchor
      let basePrice = s.basePrice ?? prev;
      basePrice = basePrice * (1 + DAILY_DRIFT);

      // 2. Daily stochastic noise
      const shock = randNormal() * volatility;
      let tempPrice = prev * (1 + shock);

      // 3. Mean-revert 1% of gap to anchor
      tempPrice += MEAN_REVERT_ALPHA * (basePrice - tempPrice);

      // 4. Add sector/stock “flavor”
      tempPrice *= (1 + sectorBias);
      tempPrice *= (1 + stockDrift);

      // 5. Clamp for bankruptcy
      if (tempPrice < 0.1) tempPrice = 0.01;

      // 6. Prepare history, change, learning volatility
      const pctMove = (tempPrice - prev) / prev;
      const newHist = [...(s.history || []).slice(-HISTORY_LIMIT+1), tempPrice];
      const learning = 0.02;
      const absPct = Math.min(Math.abs(pctMove), 1);
      const newVol = clamp((1 - learning) * volatility + learning * absPct, 0.01, 0.2);

      bulk.push({
        updateOne: {
          filter: { _id: s._id },
          update: {
            $set: {
              price: +tempPrice.toFixed(4),
              change: +(pctMove*100).toFixed(2),
              history: newHist,
              volatility: +newVol.toFixed(4),
              basePrice: +basePrice.toFixed(4) // keep evolving anchor in sync
            }
          }
        }
      });
    }
    logMemoryUsage("after single stock updates");

      
      const marketCap = stocks.reduce((sum, s) => sum + s.price * (s.outstandingShares ?? 1), 0);
      console.log(marketCap);
    // Only set once, at the first market update with valid data
      if (initialMarketCap === null || initialMarketCap === 0) {
      if (marketCap > 0) {
        initialMarketCap = marketCap;
          console.log(`🟢 Initial market cap set: $${initialMarketCap.toFixed(2)}`);
      } else {
          console.warn(`⚠️ Cannot set initial market cap, current market cap is zero.`);
      }
      } else {
      const capDelta = ((marketCap - initialMarketCap) / initialMarketCap) * 100;
      console.log(`📊 Market cap since baseline: ${capDelta.toFixed(2)}%`);
      }


    if (bulk.length) {
      await Stock.bulkWrite(bulk);
      console.log(`✅ Updated ${bulk.length} stocks`);
    }
    logMemoryUsage("after stock updates");
    recordMarketIndexHistory(stocks);
    const marketMood = recordMarketMood(stocks);
    processFirms(marketMood);
  } catch (err) {
    console.error("🔥 Market update error:", err);
  }
}

module.exports = { updateMarket };




async function getMarketMoodController(req, res) {
  const history = getMoodHistory();
  res.json({ mood: history.at(-1)?.mood || "neutral", moodHistory: history });
}

module.exports = { updateMarket, getMarketMoodController };
