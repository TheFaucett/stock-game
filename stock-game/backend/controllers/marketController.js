const { applyImpactToStocks } = require("../controllers/newsImpactController");
const Stock = require("../models/Stock");
const { applyGaussian } = require("../utils/applyGaussian.js");
const { processFirms } = require("./firmController");

async function updateMarket() {
    try {
        console.log("🔄 Updating market state...");

        applyGaussian();
        await applyImpactToStocks();
        const firmTradeImpact = await processFirms();

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

            const volatility = stock.volatility ?? 0.03;

            // 🎲 Step 1: Apply random Gaussian-like base fluctuation
            const baseFluctuation = (Math.random() - 0.5) * 2; // range: -1 to 1
            let newPrice = Math.max(stock.price * (1 + (baseFluctuation * volatility)), 0.01);

            // 📉 Step 2: Apply firm trading effect (with liquidity adjustment)
            const trades = firmTradeImpact[stock.ticker] || 0;
            const liquidity = stock.liquidity ?? 0; // range: -1 (illiquid) to 1 (high liquidity)
            if (trades > 0) {
                const liquidityMultiplier = 1 - liquidity;
                const tradeImpact = 0.0001 * trades * liquidityMultiplier;
                newPrice *= (1 + tradeImpact);
                console.log(`${stock.ticker} adjusted by trading: ${stock.price} → ${newPrice} | liquidity: ${liquidity}`);
            }

            // 🧠 Step 3: Calculate percent change & volatility smoothing
            const percentChange = parseFloat(((newPrice - prevPrice) / prevPrice * 100).toFixed(2));
            const changeMagnitude = Math.abs(percentChange / 100);
            const shock = Math.random() < 0.05 ? 1 + Math.random() * 0.5 : 1;
            const adjustedChange = changeMagnitude * shock;

            let updatedVolatility = 0.9 * volatility + 0.1 * adjustedChange;
            updatedVolatility = Math.max(0.01, Math.min(updatedVolatility, 0.5));

            // 🗂️ Step 4: Update price history
            const updatedHistory = [...stock.history.slice(-29), newPrice];

            return {
                updateOne: {
                    filter: { _id: stock._id },
                    update: {
                        $set: {
                            price: newPrice,
                            change: percentChange,
                            history: updatedHistory,
                            volatility: parseFloat(updatedVolatility.toFixed(4))
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
