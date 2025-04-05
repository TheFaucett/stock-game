const { applyImpactToStocks } = require("../controllers/newsImpactController");
const Stock = require("../models/Stock");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { processFirms } = require("./firmController");
const { recordMarketMood, getMoodHistory } = require("../utils/getMarketMood.js");
const { maybeApplyShock, getEconomicFactors } = require("../utils/economicEnvironment.js");

async function updateMarket() {
  try {
    console.log("🔄 Updating market state...");
    maybeApplyShock(); //shake it up a lil
    const { inflationRate, currencyStrength } = getEconomicFactors();



    applyGaussian();
    await applyImpactToStocks();
    const firmTradeImpact = await processFirms();

    const stocks = await Stock.find();
    if (!stocks || stocks.length === 0) {
      console.error("⚠️ No stocks found in the database!");
      return;
    }

    // ✅ Record market mood once per update
    const marketMood = recordMarketMood(stocks);
    console.log("📈 Recorded market mood:", marketMood);

    const bulkUpdates = stocks.map((stock) => {
      if (!stock || !stock.ticker) {
        console.error("❌ Invalid stock found:", stock);
        return null;
      }

      const prevPrice = stock.history.length > 1
        ? stock.history[stock.history.length - 1]
        : stock.price;

      const volatility = stock.volatility ?? 0.03;
      const baseFluctuation = (Math.random() - 0.5) * 2;
      let newPrice = Math.max(stock.price * (1 + baseFluctuation * volatility), 0.01);

      const trades = firmTradeImpact[stock.ticker] || 0;
      const liquidity = stock.liquidity ?? 0;
      if (trades > 0) {
        const liquidityMultiplier = 1 - liquidity;
        const tradeImpact = 0.0001 * trades * liquidityMultiplier;
        newPrice *= (1 + tradeImpact);
      }

      const percentChange = parseFloat(((newPrice - prevPrice) / prevPrice * 100).toFixed(2));
      const changeMagnitude = Math.abs(percentChange / 100);
      const shock = Math.random() < 0.05 ? 1 + Math.random() * 0.5 : 1;
      const adjustedChange = changeMagnitude * shock;

      // ✅ Mood effect now uses the recorded mood
      if (marketMood === "slightly bullish") newPrice *= 1.01;
      else if (marketMood === "slightly bearish") newPrice *= 0.99;
      newPrice *= (1 + inflationRate);
      newPrice /= currencyStrength;

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
  const history = getMoodHistory(); // ✅ just reads stored moods
  const mood = history[history.length - 1]?.mood || "neutral"; // fallback just in case

  res.json({ mood, moodHistory: history });
};




module.exports = { updateMarket, getMarketMoodController };
