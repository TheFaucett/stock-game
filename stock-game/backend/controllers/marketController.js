const Stock = require("../models/Stock");

async function updateMarket() {
    try {
        console.log("🔄 Updating market state...");

        // Fetch all stocks from MongoDB
        const stocks = await Stock.find();

        // 🔎 Debugging step: Log stock data
      //  console.log("📊 Stocks Retrieved:", stocks);

        if (!stocks || stocks.length === 0) {
            console.error("⚠️ No stocks found in the database!");
            return;
        }

        for (const stock of stocks) {
            if (!stock || !stock.ticker) {
                console.error("❌ Invalid stock found:", stock);
                continue;
            }

            let fluctuation = (Math.random() - 0.5) * 2;
            let newPrice = stock.price + (stock.price * fluctuation / 100);
            stock.price = Math.max(newPrice, 0.01);

            stock.history.push(stock.price);
            if (stock.history.length > 30) stock.history.shift();

            stock.change = parseFloat(((stock.price - stock.history[stock.history.length - 2]) / stock.history[stock.history.length - 2] * 100).toFixed(2));

            await stock.save();
        }

        console.log("✅ Market update complete.");
    } catch (error) {
        console.error("⚠️ Error updating stock prices:", error);
    }
}

module.exports = { updateMarket };
