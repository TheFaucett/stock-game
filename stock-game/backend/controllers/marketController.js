const { applyImpactToStocks }        = require("../controllers/newsImpactController");
const Stock                          = require("../models/Stock");
const { applyGaussian }              = require("../utils/applyGaussian.js");
const { processFirms }               = require("./firmController");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { maybeApplyShock, getEconomicFactors } = require("../utils/economicEnvironment.js");
const { recordMarketIndexHistory }   = require("../utils/marketIndex.js");
const { autoCoverShorts }            = require("../utils/autoCoverShorts.js");
const { incrementTick }              = require("../utils/tickTracker.js");

let initialMarketCap = null;

async function updateMarket() {
  try {
    console.log("🔄 Updating market state…");
    maybeApplyShock();

    const { inflationRate, currencyStrength } = getEconomicFactors();
    const tick = incrementTick();
    console.log(`⏱️ Tick #${tick} complete`);

    // your existing macro drift
    const macroDriftRate = 0.00031;
    const macroDriftMult = 1 + macroDriftRate;

    applyGaussian();
    await applyImpactToStocks();

    if (tick % 12 === 0) {
      console.log("🧾 Auto-covering shorts");
      await autoCoverShorts();
    }

    const stocks = await Stock.find();
    if (!stocks?.length) {
      console.error("⚠️ No stocks found in DB!");
      return;
    }

    recordMarketIndexHistory(stocks);
    const mood            = recordMarketMood(stocks);
    const firmTradeImpact = await processFirms(mood);

    // market‑cap telemetry
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

    const bulk = stocks.map(stock => {
      if (!stock?.ticker) return null;

      const prevPrice  = stock.history.at(-1) ?? stock.price;
      const volatility = stock.volatility ?? 0.05;

      // 1) Tiny random wiggle: ±12.5% of volatility
      const wiggle    = (Math.random() - 0.5) * 0.25;
      let   newPrice = Math.max(prevPrice * (1 + wiggle * volatility), 0.01);
      totRandom     += wiggle * volatility;

      // 2) Anchor basePrice toward prevPrice
      const anchorRate = 0.05;
      let   basePrice  = stock.basePrice
        ? stock.basePrice + (prevPrice - stock.basePrice) * anchorRate
        : prevPrice;
      if (basePrice / prevPrice > 10 || prevPrice / basePrice > 10) {
        basePrice = prevPrice;
      }
      stock.basePrice = basePrice;

      // 3) Mean‑reversion (capped delta, coef ~0.03)
      const delta       = (basePrice - newPrice) / basePrice;
      const cappedDelta = Math.max(Math.min(delta, 0.4), -0.4);
      const revertMult  = Math.tanh(cappedDelta) * 0.03;
      newPrice         *= 1 + revertMult;
      totRevert        += revertMult;

      // 4) Firm‑trade micro‑impact
      const trades    = firmTradeImpact[stock.ticker] || 0;
      const illiqMult = 1 - (stock.liquidity ?? 0);
      const tradeMult = trades ? 0.0001 * trades * illiqMult : 0;
      newPrice       *= 1 + tradeMult;
      totTrade       += tradeMult;

      // 5) Macro drift
      newPrice *= macroDriftMult;

      // 6) Rare, small shock: 1% chance of up to +10%
      const shock = Math.random() < 0.01
                  ? 1 + Math.random() * 0.10
                  : 1;
      newPrice   *= shock;

      if (stock.ticker === "FINT") {
        console.log(
          `Δ FINT: base=${basePrice.toFixed(2)} prev=${prevPrice.toFixed(2)} ` +
          `δ=${cappedDelta.toFixed(3)} rev=${(revertMult*100).toFixed(2)}%`
        );
      }

      // 7) Percent move & reactive volatility
      const pctMove = ((newPrice - prevPrice) / prevPrice) * 100;
      const newVol  = Math.min(
        Math.max(0.9 * volatility + 0.1 * Math.abs(pctMove)/100, 0.01),
        0.5
      );

      const updatedHist = [...stock.history.slice(-29), newPrice];
      movers.push({ t: stock.ticker, pct: pctMove });

      return {
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price     : newPrice,
              change    : +pctMove.toFixed(2),
              history   : updatedHist,
              volatility: +newVol.toFixed(4),
              basePrice
            }
          }
        }
      };
    }).filter(Boolean);

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
    const top5 = movers.slice(0,5).map(m => `${m.t}:${m.pct.toFixed(1)}%`).join(", ");
    console.log(`📈 wiggle=${avgR}% | reversion=${avgV}% | trade=${avgT}%`);
    console.log(`🚩 movers: ${top5}`);
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
