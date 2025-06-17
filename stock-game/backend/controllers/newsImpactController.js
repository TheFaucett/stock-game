const Stock = require("../models/Stock");
const { getLatestNewsData } = require("../controllers/newsController");

/**
 * Apply impact of latest news on affected stocks and persist to MongoDB.
 * Uses bulkWrite for speed and atomicity.
 */
async function applyImpactToStocks() {
    try {
        const newsData = await getLatestNewsData();

        if (newsData.length === 0) {
            console.log("ℹ️ No news impact to apply.");
            return;
        }

        // To avoid multiple updates on same stock, aggregate impacts
        const impactMap = new Map(); // ticker -> { totalImpact, logs, ... }

        for (const { newsItem, weight } of newsData) {
            let query = newsItem.ticker ? { ticker: newsItem.ticker } : { sector: newsItem.sector };
            const affectedStocks = await Stock.find(query);

            for (const stock of affectedStocks) {
                // Normalize sentiment/weight
                const normalizedSentiment = Math.max(-1, Math.min(1, newsItem.sentimentScore / 100));
                const normalizedWeight = Math.max(0, Math.min(1, weight / 100));

                // Market sentiment can be sector- or market-wide
                let marketSentiment = (Math.random() - 0.5) * 1.5; // Optionally add sector bias

                let sentimentImpact = (marketSentiment / 100) * stock.price;
                let maxNewsImpact = stock.price * 0.04;
                let newsImpact = normalizedSentiment * normalizedWeight * maxNewsImpact;

                // Cap both up and down
                let maxTotalDelta = stock.price * 0.05;
                let totalImpact = Math.max(Math.min(newsImpact + sentimentImpact, maxTotalDelta), -maxTotalDelta);

                // If we've already got an impact for this stock, sum the impacts (but halve the second, etc.)
                if (impactMap.has(stock.ticker)) {
                    // Diminishing returns for stacking news
                    const prev = impactMap.get(stock.ticker);
                    totalImpact = prev.totalImpact + totalImpact * 0.5;
                    impactMap.set(stock.ticker, {
                        ...prev,
                        totalImpact,
                        logs: [
                            ...prev.logs,
                            `[stacked news] Impact +${(totalImpact).toFixed(3)}`
                        ]
                    });
                } else {
                    impactMap.set(stock.ticker, {
                        stock,
                        totalImpact,
                        logs: [
                            `NewsScore: ${newsItem.sentimentScore}, Weight: ${weight}, Δ: ${totalImpact.toFixed(2)}`
                        ]
                    });
                }
            }
        }

        // Prepare bulk operations
        const ops = [];
        for (const { stock, totalImpact, logs } of impactMap.values()) {
            let newPrice = parseFloat((stock.price + totalImpact).toFixed(2));
            newPrice = Math.max(0.01, newPrice);

            const newHist = [...(stock.history || []), newPrice];
            while (newHist.length > 30) newHist.shift();

            let previousPrice = newHist.length > 1 ? newHist[newHist.length - 2] : newPrice;
            let change = previousPrice === 0
                ? 0
                : parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));

            // Logging, robust
            console.log(`🧐 ${stock.ticker} | ${logs.join(' | ')}`);
            console.log(`   📌 Old: ${previousPrice} → 💰 New: ${newPrice} (${change >= 0 ? "+" : ""}${change}%)`);

            ops.push({
                updateOne: {
                    filter: { _id: stock._id },
                    update: {
                        $set: {
                            price: newPrice,
                            change,
                            history: newHist
                        }
                    }
                }
            });
        }

        if (ops.length) {
            await Stock.bulkWrite(ops);
            console.log(`✅ Bulk-updated ${ops.length} stocks with news impact`);
        } else {
            console.log("ℹ️ No impacted stocks to update.");
        }
    } catch (error) {
        console.error("⚠️ Error updating stock prices:", error);
    }
}

module.exports = { applyImpactToStocks };
