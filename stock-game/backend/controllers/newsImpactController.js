const Stock = require("../models/Stock");
const { getLatestNewsData } = require("../controllers/newsController");

/**
 * Apply impact of latest news on affected stocks and persist to MongoDB.
 */
async function applyImpactToStocks() {
    try {
        const newsData = await getLatestNewsData();

        if (newsData.length === 0) {
            console.log("ℹ️ No news impact to apply.");
            return;
        }

        for (const { newsItem, weight } of newsData) {
            let query = newsItem.ticker ? { ticker: newsItem.ticker } : { sector: newsItem.sector };

            const affectedStocks = await Stock.find(query);
            if (affectedStocks.length === 0) continue;

            for (const stock of affectedStocks) {
                let marketSentiment = (Math.random() - 0.5) * 1.5; // ✅ Reduce sentiment fluctuation
                let sentimentImpact = (marketSentiment / 100) * stock.price;

                // ✅ Scale the news impact more reasonably
                let maxNewsImpact = stock.price * 0.03; // ✅ Max 3% drop per news event
                let adjustedWeight = weight / 2; // ✅ Reduce weight influence slightly
                let newsImpact = Math.max(
                    (newsItem.sentimentScore * adjustedWeight / 100) * stock.price,
                    -maxNewsImpact
                );

                // ✅ Cap max total drop per update to 5%
                let maxTotalDrop = stock.price * 0.05;
                let totalImpact = Math.max(newsImpact + sentimentImpact, -maxTotalDrop);

                const newPrice = parseFloat((stock.price + totalImpact).toFixed(2));
                stock.price = newPrice;

                stock.highPrice = Math.max(stock.highPrice, stock.price);
                stock.lowPrice = Math.min(stock.lowPrice, stock.price);

                stock.history.push(stock.price);
                if (stock.history.length > 30) stock.history.shift();

                let previousPrice = stock.history.length > 1 ? stock.history[stock.history.length - 2] : stock.price;
                stock.change = parseFloat(((stock.price - previousPrice) / previousPrice * 100).toFixed(2));

                console.log(`🧐 ${stock.ticker} | News Score: ${newsItem.sentimentScore}, Weight: ${weight}`);
                console.log(`   📌 Old Price: ${previousPrice} -> 💰 New Price: ${stock.price}`);

                await stock.save();
            }
        }
    } catch (error) {
        console.error("⚠️ Error updating stock prices:", error);
    }
}

module.exports = { applyImpactToStocks };
