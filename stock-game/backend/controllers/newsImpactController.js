const Stock = require("../models/Stock");

/**
 * Apply impact of news on affected stocks and persist to MongoDB.
 * @param {Object} newsItem - The news event affecting stocks.
 * @param {Number} weight - The impact weight of the news type.
 */
async function applyImpactToStocks(newsItem, weight) {
    try {
        let query = {};

        if (newsItem.ticker) {
            query = { ticker: newsItem.ticker }; // News affects a single stock
        } else if (newsItem.sector) {
            query = { sector: newsItem.sector }; // News affects an entire sector
        }

        // Fetch affected stocks from MongoDB
        const affectedStocks = await Stock.find(query);

        if (affectedStocks.length === 0) return;

        for (const stock of affectedStocks) {
            let marketSentiment = (Math.random() - 0.5) * 2; // Random market effect
            let sentimentImpact = (marketSentiment / 100) * stock.price;
            let newsImpact = (newsItem.sentimentScore * weight / 100) * stock.price;
            let totalImpact = newsImpact + sentimentImpact;

            stock.price = Math.max(stock.price + totalImpact, 0.01);
            stock.highPrice = Math.max(stock.highPrice, stock.price);
            stock.lowPrice = Math.min(stock.lowPrice, stock.price);

            // Maintain 30-day rolling history
            stock.history.push(stock.price);
            if (stock.history.length > 30) stock.history.shift();

            // Update stock change percentage
            let previousPrice = stock.history.length > 1 ? stock.history[stock.history.length - 2] : stock.price;
            stock.change = parseFloat(((stock.price - previousPrice) / previousPrice * 100).toFixed(2));

            // Persist updates to MongoDB

            await stock.save();
        }

        console.log(`📊 Updated ${affectedStocks.length} stocks based on news impact.`);
    } catch (error) {
        console.error("⚠️ Error updating stock prices:", error);
    }
}

module.exports = { applyImpactToStocks };
