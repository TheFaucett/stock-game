const { applyImpactToStocks } = require("../controllers/newsImpactController");
const Stock = require("../models/Stock");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { processFirms } = require("./firmController");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { maybeApplyShock, getEconomicFactors } = require("../utils/economicEnvironment.js");
const { recordMarketIndexHistory } = require("../utils/marketIndex.js");

let count = 0;
let initialMarketCap = null;

async function updateMarket() {
  try {
    console.log("🔄 Updating market state...");
    maybeApplyShock();

    const { inflationRate, currencyStrength } = getEconomicFactors();
    count++;

    applyGaussian();
    await applyImpactToStocks();

    const stocks = await Stock.find();
    if (!stocks || stocks.length === 0) {
      console.error("⚠️ No stocks found in the database!");
      return;
    }

    recordMarketIndexHistory(stocks);
    const marketMood = recordMarketMood(stocks);
    const firmTradeImpact = await processFirms(marketMood);

    // 🌍 Calculate total market value
    const currentTotalValue = stocks.reduce((acc, stock) => acc + stock.price, 0);

    if (count === 1) {
      initialMarketCap = currentTotalValue;
      console.log(`🟢 Initial market cap set to $${initialMarketCap.toFixed(2)}`);
    } else if (initialMarketCap) {
      const changePercent = ((currentTotalValue - initialMarketCap) / initialMarketCap) * 100;
      console.log(`📊 Market cap since update 1: ${changePercent.toFixed(2)}%`);
    }

    const bulkUpdates = stocks.map((stock) => {
      if (!stock || !stock.ticker) {
        console.error("❌ Invalid stock found:", stock);
        return null;
      }

      const prevPrice =
        stock.history.length > 1 ? stock.history[stock.history.length - 1] : stock.price;

      const volatility = stock.volatility ?? 0.05;
      const baseFluctuation = (Math.random() - 0.5) * 2;
      let newPrice = Math.max(stock.price * (1 + baseFluctuation * volatility), 0.01);

      const trades = firmTradeImpact[stock.ticker] || 0;
      const liquidity = stock.liquidity ?? 0;
      if (trades > 0) {
        const liquidityMultiplier = 1 - liquidity;
        const tradeImpact = 0.0001 * trades * liquidityMultiplier;
        console.log("tradeImpact:", tradeImpact);
        newPrice *= 1 + tradeImpact;
      }

      const percentChange = parseFloat(
        ((newPrice - prevPrice) / prevPrice * 100).toFixed(2)
      );
      const changeMagnitude = Math.abs(percentChange / 100);
      const shock = Math.random() < 0.05 ? 1 + Math.random() * 0.5 : 1;
      const adjustedChange = changeMagnitude * shock;

      newPrice *= 1 + Math.min(inflationRate, 0.0000794);
      newPrice /= currencyStrength;

      let updatedVolatility = 0.9 * volatility + 0.1 * adjustedChange;
      updatedVolatility = Math.max(0.01, Math.min(updatedVolatility, 0.5));

      const updatedHistory = [...stock.history.slice(-29), newPrice];

      console.log("baseFluct:", baseFluctuation * volatility);

      console.log("inflationRate:", inflationRate);




      return {
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: newPrice,
              change: percentChange,
              history: updatedHistory,
              volatility: parseFloat(updatedVolatility.toFixed(4)),
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
