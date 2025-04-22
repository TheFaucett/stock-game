const { applyImpactToStocks } = require("../controllers/newsImpactController");
const Stock = require("../models/Stock");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { processFirms } = require("./firmController");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { maybeApplyShock, getEconomicFactors } = require("../utils/economicEnvironment.js");
const { recordMarketIndexHistory } = require("../utils/marketIndex.js");
const { autoCoverShorts } = require("../utils/autoCoverShorts.js");
const { incrementTick, getCurrentTick } = require("../utils/tickTracker.js");

let initialMarketCap = null;

async function updateMarket() {
  try {
    console.log("🔄 Updating market state...");
    maybeApplyShock();

    const { inflationRate, currencyStrength } = getEconomicFactors();
    const tick = incrementTick(); // ⏱️ Advance and retrieve current tick
    console.log(`⏱️ Tick #${tick} complete`);

    const earlyMarket = tick <= 100;
    const inflationEffective = earlyMarket ? inflationRate * 0.25 : inflationRate;
    const productivityGrowth = earlyMarket ? 0.005 : 0.015;
    const baseGrowthRate = earlyMarket ? 0.02 / 365 : 0.11 / 365;

    const inflationTickMultiplier = Math.pow(1 + inflationEffective, 1 / 365);
    const currencyTickMultiplier = Math.pow(currencyStrength, 1 / 365);
    const productivityMultiplier = Math.pow(1 + productivityGrowth, 1 / 365);

    if (tick === 101) {
      console.log("🚀 Market has exited early phase. Full macro factors are now in play.");
    }

    applyGaussian();
    await applyImpactToStocks();

    // ✅ Auto-cover shorts every 12 ticks
    if (tick % 12 === 0) {
      console.log("🧾 Performing scheduled auto-cover for shorts");
      await autoCoverShorts();
    }

    const stocks = await Stock.find();
    if (!stocks || stocks.length === 0) {
      console.error("⚠️ No stocks found in the database!");
      return;
    }

    recordMarketIndexHistory(stocks);
    const marketMood = recordMarketMood(stocks);
    const firmTradeImpact = await processFirms(marketMood);

    const currentTotalValue = stocks.reduce((acc, stock) => acc + stock.price, 0);
    if (tick === 1) {
      initialMarketCap = currentTotalValue;
      console.log(`🟢 Initial market cap set to $${initialMarketCap.toFixed(2)}`);
    } else {
      const changePercent = ((currentTotalValue - initialMarketCap) / initialMarketCap) * 100;
      console.log(`📊 Market cap since update 1: ${changePercent.toFixed(2)}%`);
    }

    const bulkUpdates = stocks.map((stock) => {
      if (!stock || !stock.ticker) return null;

      const updatedBasePrice = stock.basePrice
        ? stock.basePrice * (1 + baseGrowthRate)
        : 100;

      const prevPrice = stock.history.at(-1) ?? stock.price;
      const volatility = stock.volatility ?? 0.05;
      const baseFluctuation = (Math.random() - 0.45) * 1.0;
      let newPrice = Math.max(stock.price * (1 + baseFluctuation * volatility), 0.01);

      const targetPrice = stock.basePrice ?? 100;
      const delta = (targetPrice - newPrice) / targetPrice;
      const reversionEffect = Math.tanh(delta * 1.5) * 0.03;
      newPrice *= (1 + reversionEffect);

      newPrice *= productivityMultiplier;

      const trades = firmTradeImpact[stock.ticker] || 0;
      const liquidity = stock.liquidity ?? 0;
      if (trades > 0) {
        const liquidityMultiplier = 1 - liquidity;
        const tradeImpact = 0.0002 * trades * liquidityMultiplier;
        newPrice *= 1 + tradeImpact;
      }

      const percentChange = parseFloat(((newPrice - prevPrice) / prevPrice * 100).toFixed(2));
      const changeMagnitude = Math.abs(percentChange / 100);
      const shock = Math.random() < 0.05 ? 1 + Math.random() * 0.5 : 1;
      const adjustedChange = changeMagnitude * shock;

      newPrice *= inflationTickMultiplier;
      // newPrice /= currencyTickMultiplier;

      let updatedVolatility = 0.9 * volatility + 0.1 * adjustedChange;
      updatedVolatility = Math.max(0.01, Math.min(updatedVolatility, 0.5));
      const updatedHistory = [...stock.history.slice(-29), newPrice];

      return {
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: newPrice,
              change: percentChange,
              history: updatedHistory,
              volatility: parseFloat(updatedVolatility.toFixed(4)),
              basePrice: updatedBasePrice,
            },
          },
        },
      };
    }).filter(Boolean);

    if (bulkUpdates.length > 0) {
      await Stock.bulkWrite(bulkUpdates);
      console.log(`✅ Market update complete. ${bulkUpdates.length} stocks updated.`);
    }
  } catch (error) {
    console.error("⚠️ Error updating stock prices:", error);
  }
}

const getMarketMoodController = async (req, res) => {
  const history = getMoodHistory();
  const mood = history[history.length - 1]?.mood || "neutral";
  res.json({ mood, moodHistory: history });
};

module.exports = { updateMarket, getMarketMoodController };
