const { applyImpactToStocks } = require("../controllers/newsImpactController");
const Stock = require("../models/Stock");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { processFirms } = require("./firmController");
async function updateMarket() {
    try {
        console.log("🔄 Updating market state...");

        applyGaussian();
        await applyImpactToStocks();
        const firmTradeImpact = await processFirms(); //'firm trading' means to mimic how other investors affect the price of a stock



        const stocks = await Stock.find();

        if (!stocks || stocks.length === 0) {
            console.error("⚠️ No stocks found in the database!");
            return;
        }

        const bulkUpdates = stocks.map((stock) => {
            if (!stock || !stock.ticker) {
                console.error("❌ Invalid stock found:", stock);
                return null;
            }

            const prevPrice = stock.history.length > 1
                ? stock.history[stock.history.length - 1]
                : stock.price;

            const currentVolatility = stock.volatility ?? 0.03;


            const baseFluctuation = (Math.random() - 0.5) * 2; // -1 to 1
            const adjustedFluctuation = baseFluctuation * currentVolatility * 100;
            const newPrice = Math.max(stock.price * (1 + adjustedFluctuation / 100), 0.01);
       

            const tradesForThisStock = firmTradeImpact[stock.ticker] || 0;
            if (tradesForThisStock > 0) {
                const tradeEffect = 0.0005 * tradesForThisStock; // 🛠️ Tunable multiplier
                newPrice *= (1 + tradeEffect);
                console.log("I worked! 🤩");
            }
            const updatedHistory = [...stock.history.slice(-29), newPrice];
            const newChange = parseFloat(
                ((newPrice - prevPrice) / prevPrice * 100).toFixed(2)
            );

            // 🔁 Smooth volatility update
            const changeMagnitude = Math.abs(newChange / 100);
            const shock = Math.random() < 0.05 ? 1 + Math.random() * 0.5 : 1;
            const adjustedChange = changeMagnitude * shock;

            let newVolatility = 0.9 * currentVolatility + 0.1 * adjustedChange;

            // Clamp volatility between min and max
            newVolatility = Math.max(0.01, Math.min(newVolatility, 0.5));

            return {
                updateOne: {
                    filter: { _id: stock._id },
                    update: {
                        $set: {
                            price: newPrice,
                            change: newChange,
                            history: updatedHistory,
                            volatility: parseFloat(newVolatility.toFixed(4))
                        }
                    }
                }
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

module.exports = { updateMarket };
