const { applyImpactToStocks } = require("../controllers/newsImpactController");
const Stock = require("../models/Stock");

async function updateMarket() {
    try {
        console.log("🔄 Updating market state...");

        // ✅ Fetch news and apply impact before market fluctuations
        await applyImpactToStocks();

        // Fetch all stocks after news impact
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

            // Apply a minor daily fluctuation (without overriding news impact)
            let fluctuation = (Math.random() - 0.5) * 2;
            let newPrice = Math.max(stock.price + (stock.price * fluctuation / 100), 0.01);

            // Ensure history is always 30 entries
            let updatedHistory = [...stock.history.slice(-29), newPrice];

            // Calculate change percentage
            let previousPrice = stock.history.length > 1 ? stock.history[stock.history.length - 1] : stock.price;
            let newChange = parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));

            return {
                updateOne: {
                    filter: { _id: stock._id },
                    update: { $set: { price: newPrice, change: newChange, history: updatedHistory } }
                }
            };
        }).filter(update => update !== null);

        if (bulkUpdates.length > 0) {
            await Stock.bulkWrite(bulkUpdates);
            console.log(`✅ Market update complete. ${bulkUpdates.length} stocks updated.`);
        }
    } catch (error) {
        console.error("⚠️ Error updating stock prices:", error);
    }
}

module.exports = { updateMarket };
