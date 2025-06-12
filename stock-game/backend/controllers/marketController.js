const { applyImpactToStocks }        = require("../controllers/newsImpactController");
const Stock                          = require("../models/Stock");
const { applyGaussian }              = require("../utils/applyGaussian.js");
const { processFirms }               = require("./firmController");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { maybeApplyShock, getEconomicFactors } = require("../utils/economicEnvironment.js");
const { recordMarketIndexHistory }   = require("../utils/marketIndex.js");
const { autoCoverShorts }            = require("../utils/autoCoverShorts.js");
const { incrementTick }              = require("../utils/tickTracker.js");
const { sweepOptionExpiries }        = require("../utils/sweepOptions.js");
const { sweepLoanPayments }          = require("../utils/sweepLoans.js");
const { payDividends }               = require("../utils/payDividends.js");    
let initialMarketCap = null;
const HISTORY_LIMIT = 30; // ✅ strict history length

async function updateMarket() {
  try {
    console.log("🔄 Updating market state…");
    maybeApplyShock();



    const { inflationRate, currencyStrength } = getEconomicFactors();
    const tick = incrementTick();
    console.log(`⏱️ Tick #${tick} complete`);

    // 3️⃣ Apply Gaussian only every 2 ticks
    if (tick % 2 === 0) {
      console.log("✨ Applying Gaussian noise");
      applyGaussian();
    }

    await applyImpactToStocks();

    if (tick % 12 === 0) {
      console.log("🧾 Auto-covering shorts");
      await autoCoverShorts();
    }

    if (tick % 2 === 0) {
        console.log("💰 Paying dividends");
        await payDividends();
    }


    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);

    // 1️⃣ Use .lean() + projection
    const stocks = await Stock.find({}, {
      ticker: 1,
      price: 1,
      volatility: 1,
      basePrice: 1,
      liquidity: 1,
      history: 1
    }).lean();

    if (!stocks?.length) {
      console.error("⚠️ No stocks found in DB!");
      return;
    }

    recordMarketIndexHistory(stocks);
    const marketMood      = recordMarketMood(stocks);
    const firmTradeImpact = await processFirms(marketMood);

    // Market cap telemetry
    const marketCap = stocks.reduce((sum, s) => sum + s.price, 0);
    if (tick === 1) {
      initialMarketCap = marketCap;
      console.log(`🟢 Initial market cap $${initialMarketCap.toFixed(2)}`);
    } else {
      const capDelta = ((marketCap - initialMarketCap) / initialMarketCap) * 100;
      console.log(`📊 Market cap since tick 1: ${capDelta.toFixed(2)}%`);
    }

    let totRandom = 0, totRevert = 0, totTrade = 0;
    const movers = [];

    const bulk = stocks
      .map(stock => {
        if (!stock?.ticker) return null;

        const prevPrice  = stock.history.at(-1) ?? stock.price;
        const volatility = stock.volatility ?? 0.05;

        // 1) tiny random wiggle — Gaussian * sqrt(volatility) * 2% base stddev
        const gaussianTerm = (Math.random() + Math.random() + Math.random() - 1.5); // ~Gaussian [-1.5, 1.5]
        const randomImpact = gaussianTerm * Math.sqrt(volatility) * 0.02;
        let newPrice = Math.max(prevPrice * (1 + randomImpact), 0.01);
        totRandom += randomImpact;

        // 2) anchor basePrice toward prevPrice
        const anchorRate = 0.05;
        let basePrice = stock.basePrice
          ? stock.basePrice + (prevPrice - stock.basePrice) * anchorRate
          : prevPrice;
        if (basePrice / prevPrice > 10 || prevPrice / basePrice > 10) {
          basePrice = prevPrice;
        }

        // 3) mean‑reversion
        const delta = (basePrice - newPrice) / basePrice;
        const cappedDelta = Math.max(Math.min(delta, 0.4), -0.4);
        const revertMult = Math.tanh(cappedDelta) * 0.03 + 0.0015;

        newPrice *= 1 + revertMult;
        totRevert += revertMult;

        // 4) firm‑trade micro impact
        const trades = firmTradeImpact[stock.ticker] || 0;
        const illiqMult = 1 - (stock.liquidity ?? 0);
        const tradeMult = trades ? 0.0001 * trades * illiqMult : 0;
        newPrice *= 1 + tradeMult;
        totTrade += tradeMult;

        // 5) macro drift
        const macroDriftRate = 0.0006;
        const macroDriftMult = 1 + macroDriftRate;
        newPrice *= macroDriftMult;

        // 6) rare jump term — 0.1% chance of ±5% move
        const jumpProb = 0.001;
        const jumpMagnitude = (Math.random() < jumpProb) ? (Math.random() * 0.1 - 0.05) : 0;
        newPrice *= 1 + jumpMagnitude;

        // Compute percent move
        const pctMove = ((newPrice - prevPrice) / prevPrice) * 100;
        movers.push({ t: stock.ticker, pct: pctMove });

        // --- DEBUG LOG if move is large ---
        const DEBUG_THRESHOLD = 5; // percent
        if (Math.abs(pctMove) >= DEBUG_THRESHOLD) {
          console.group(`🐛 [${stock.ticker}] tick=${tick} pctMove=${pctMove.toFixed(2)}%`);
          console.log("  prevPrice     :", prevPrice.toFixed(4));
          console.log("  randomImpact  :", (randomImpact * 100).toFixed(3) + "%");
          console.log("  cappedDelta   :", cappedDelta.toFixed(4));
          console.log("  revertMult    :", (revertMult * 100).toFixed(3) + "%");
          console.log("  tradeMult     :", (tradeMult * 100).toFixed(3) + "%");
          console.log("  macroDrift    :", ((macroDriftMult - 1) * 100).toFixed(3) + "%");
          console.log("  jumpMagnitude :", (jumpMagnitude * 100).toFixed(3) + "%");
          console.log("  finalPrice    :", newPrice.toFixed(4));
          console.groupEnd();
        }

        // 7) update volatility & history
        const absPct = Math.abs(pctMove) / 100;
        const learningRate = 0.02;
        let newVol = (1 - learningRate) * volatility + learningRate * absPct;
        newVol = Math.min(Math.max(newVol, 0.01), 0.2); // cap volatility

        const newHist = [...stock.history.slice(-HISTORY_LIMIT + 1), newPrice];

        return {
          updateOne: {
            filter: { _id: stock._id },
            update: {
              $set: {
                price: newPrice,
                change: +pctMove.toFixed(2),
                history: newHist,
                volatility: +newVol.toFixed(4),
                basePrice
              }
            }
          }
        };
      })
      .filter(Boolean);

    if (bulk.length) {
      await Stock.bulkWrite(bulk);
      console.log(`✅ Updated ${bulk.length} stocks`);
    }

    // per‑tick diagnostics
    const n = stocks.length;
    const avgR = (totRandom / n * 100).toFixed(3);
    const avgV = (totRevert / n * 100).toFixed(3);
    const avgT = (totTrade / n * 100).toFixed(3);
    movers.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    const top5 = movers.slice(0, 5).map(m => `${m.t}:${m.pct.toFixed(1)}%`).join(", ");
    console.log(`📈 wiggle=${avgR}% | reversion=${avgV}% | trade=${avgT}%`);
    console.log(`🚩 top movers: ${top5}`);

    // 7️⃣ Memory usage log every 50 ticks
    if (tick % 50 === 0) {
      const mem = process.memoryUsage();
      console.log(`🧠 Memory MB used: Heap ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }


    // 8️⃣ Market move attribution DEBUG
    let totalPctMove = 0;
    let totalPctRandom = 0;
    let totalPctRevert = 0;
    let totalPctTrade  = 0;
    let totalPctMacro  = 0;
    let totalPctJump   = 0;

    movers.forEach(({ pct }) => {
    totalPctMove += pct;
    });

    // Recompute contribution for each stock
    stocks.forEach(stock => {
    const prevPrice  = stock.history.at(-1) ?? stock.price;
    const volatility = stock.volatility ?? 0.05;

    const gaussianTerm = (Math.random() + Math.random() + Math.random() - 1.5);
    const randomImpact = gaussianTerm * Math.sqrt(volatility) * 0.02;
    const impactRandom = 1 + randomImpact;

    const anchorRate = 0.05;
    let basePrice = stock.basePrice
        ? stock.basePrice + (prevPrice - stock.basePrice) * anchorRate
        : prevPrice;
    if (basePrice / prevPrice > 10 || prevPrice / basePrice > 10) {
        basePrice = prevPrice;
    }

    const delta = (basePrice - prevPrice * impactRandom) / basePrice;
    const cappedDelta = Math.max(Math.min(delta, 0.4), -0.4);
    const revertMult = Math.tanh(cappedDelta) * 0.03 + 0.001;//0.0015
    const impactRevert = 1 + revertMult;

    const trades = firmTradeImpact[stock.ticker] || 0;
    const illiqMult = 1 - (stock.liquidity ?? 0);
    const tradeMult = trades ? 0.0001 * trades * illiqMult : 0;
    const impactTrade = 1 + tradeMult;

    const macroDriftRate = 0.0006;
    const macroDriftMult = 1 + macroDriftRate;
    const impactMacro = macroDriftMult;

    const jumpProb = 0.001;
    const jumpMagnitude = (Math.random() < jumpProb) ? (Math.random() * 0.1 - 0.05) : 0;
    const impactJump = 1 + jumpMagnitude;

    const totalImpact = impactRandom * impactRevert * impactTrade * impactMacro * impactJump;
    const pctMoveOverall = (totalImpact - 1) * 100;

    // Proportional attribution
    if (pctMoveOverall !== 0) {
        totalPctRandom += ((impactRandom - 1) / (totalImpact - 1)) * pctMoveOverall;
        totalPctRevert += ((impactRevert - 1) / (totalImpact - 1)) * pctMoveOverall;
        totalPctTrade  += ((impactTrade  - 1) / (totalImpact - 1)) * pctMoveOverall;
        totalPctMacro  += ((impactMacro  - 1) / (totalImpact - 1)) * pctMoveOverall;
        totalPctJump   += ((impactJump   - 1) / (totalImpact - 1)) * pctMoveOverall;
    }
    });

    // Final log
    console.log(`🧮 Market move attribution (avg per stock):`);
    console.log(`  🎲 Random wiggle : ${(totalPctRandom / n).toFixed(3)} %`);
    console.log(`  ↩️  Mean reversion: ${(totalPctRevert / n).toFixed(3)} %`);
    console.log(`  🏦 Firm trades   : ${(totalPctTrade / n).toFixed(3)} %`);
    console.log(`  🌍 Macro drift   : ${(totalPctMacro / n).toFixed(3)} %`);
    console.log(`  ⚡ Jumps         : ${(totalPctJump / n).toFixed(3)} %`);
    console.log(`  📊 TOTAL         : ${(totalPctMove / n).toFixed(3)} %`);



  } catch (err) {
    console.error("⚠️ Market update error:", err);
  }
}

async function getMarketMoodController(req, res) {
  const history = getMoodHistory();
  res.json({ mood: history.at(-1)?.mood || "neutral", moodHistory: history });
}

module.exports = { updateMarket, getMarketMoodController };
