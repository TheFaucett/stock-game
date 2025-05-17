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
let initialMarketCap = null;

async function updateMarket() {
  try {
    console.log("🔄 Updating market state…");
    maybeApplyShock();

    const { inflationRate, currencyStrength } = getEconomicFactors();
    const tick = incrementTick();
    console.log(`⏱️ Tick #${tick} complete`);

    // macro drift: +0.031% per tick
    const macroDriftRate = 0.00031;
    const macroDriftMult = 1 + macroDriftRate;

    applyGaussian();
    await applyImpactToStocks();

    if (tick % 12 === 0) {
      console.log("🧾 Auto-covering shorts");
      await autoCoverShorts();
    }

    await sweepOptionExpiries(tick);
    await sweepLoanPayments(tick);
    const stocks = await Stock.find();
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

        // 1) tiny random wiggle
        const wiggleTerm = (Math.random() - 0.5) * 0.25;
        const randomImpact = wiggleTerm * volatility;
        let   newPrice     = Math.max(prevPrice * (1 + randomImpact), 0.01);
        totRandom        += randomImpact;

        // 2) anchor basePrice toward prevPrice
        const anchorRate = 0.05;
        let   basePrice  = stock.basePrice
          ? stock.basePrice + (prevPrice - stock.basePrice) * anchorRate
          : prevPrice;
        if (basePrice / prevPrice > 10 || prevPrice / basePrice > 10) {
          basePrice = prevPrice;
        }
        stock.basePrice = basePrice;

        // 3) mean‑reversion
        const delta       = (basePrice - newPrice) / basePrice;
        const cappedDelta = Math.max(Math.min(delta, 0.4), -0.4);
        const revertMult  = Math.tanh(cappedDelta) * 0.03;
        newPrice         *= 1 + revertMult;
        totRevert        += revertMult;

        // 4) firm‑trade micro impact
        const trades    = firmTradeImpact[stock.ticker] || 0;
        const illiqMult = 1 - (stock.liquidity ?? 0);
        const tradeMult = trades ? 0.0001 * trades * illiqMult : 0;
        newPrice       *= 1 + tradeMult;
        totTrade       += tradeMult;

        // 5) macro drift
        newPrice *= macroDriftMult;

        // 6) rare 1% small shock
        const shock = Math.random() < 0.001
                    ? 1 + Math.random() * 0.10
                    : 1;
        newPrice   *= shock;

        // Compute percent move
        const pctMove = ((newPrice - prevPrice) / prevPrice) * 100;
        movers.push({ t: stock.ticker, pct: pctMove });

        // --- DEBUG LOG if move is large ---
        const DEBUG_THRESHOLD = 5; // percent
        if (Math.abs(pctMove) >= DEBUG_THRESHOLD) {
          console.group(`🐛 [${stock.ticker}] tick=${tick} pctMove=${pctMove.toFixed(2)}%`);
          console.log("  prevPrice     :", prevPrice.toFixed(4));
          console.log("  randomImpact  :", (randomImpact*100).toFixed(3) + "%");
          console.log("  cappedDelta   :", cappedDelta.toFixed(4));
          console.log("  revertMult    :", (revertMult*100).toFixed(3) + "%");
          console.log("  tradeMult     :", (tradeMult*100).toFixed(3) + "%");
          console.log("  macroDrift    :", ((macroDriftMult-1)*100).toFixed(3) + "%");
          console.log("  shockMult     :", shock.toFixed(4));
          console.log("  finalPrice    :", newPrice.toFixed(4));
          console.groupEnd();
        }

        // 7) update volatility & history
        const absPct   = Math.abs(pctMove)/100;
        let   newVol   = Math.min(Math.max(0.9 * volatility + 0.1 * absPct, 0.01), 0.5);
        const newHist  = [...stock.history.slice(-29), newPrice];

        return {
          updateOne: {
            filter: { _id: stock._id },
            update: {
              $set: {
                price     : newPrice,
                change    : +pctMove.toFixed(2),
                history   : newHist,
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
    const n    = stocks.length;
    const avgR = (totRandom / n * 100).toFixed(3);
    const avgV = (totRevert / n * 100).toFixed(3);
    const avgT = (totTrade  / n * 100).toFixed(3);
    movers.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    const top5 = movers.slice(0,5).map(m=>`${m.t}:${m.pct.toFixed(1)}%`).join(", ");
    console.log(`📈 wiggle=${avgR}% | reversion=${avgV}% | trade=${avgT}%`);
    console.log(`🚩 top movers: ${top5}`);
  }
  catch (err) {
    console.error("⚠️ Market update error:", err);
  }
}

async function getMarketMoodController(req, res) {
  const history = getMoodHistory();
  res.json({ mood: history.at(-1)?.mood || "neutral", moodHistory: history });
}

module.exports = { updateMarket, getMarketMoodController };
