const Stock = require("../models/Stock");
const { getLatestNewsData } = require("../controllers/newsController");

/**
 * Returns a weight (0–100) for a news item based on its tier/importance.
 * If no tier, returns 20–80 randomly.
 */
function getNewsWeight(newsItem) {
    if (newsItem.tier === 'breaking')      return 90 + Math.random() * 10; // 90–100
    if (newsItem.tier === 'major')         return 60 + Math.random() * 20; // 60–80
    if (newsItem.tier === 'routine')       return 20 + Math.random() * 20; // 20–40
    // fallback: random between 30–60
    return 30 + Math.random() * 30;
}

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

        for (const { newsItem, weight: inputWeight } of newsData) {
            // Variable weights per news item
            const weight = typeof inputWeight === "number"
                ? inputWeight
                : getNewsWeight(newsItem);

            let query = newsItem.ticker ? { ticker: newsItem.ticker } : { sector: newsItem.sector };
            const affectedStocks = await Stock.find(query);

            for (const stock of affectedStocks) {
                // Normalize sentiment/weight
                const normalizedSentiment = Math.max(-1, Math.min(1, newsItem.sentimentScore / 10)); // -10..10 -> -1..1
                const normalizedWeight    = Math.max(0, Math.min(1, weight / 100)); // 0..100 -> 0..1

                // Market sentiment kicker (very mild, so news dominates)
                let marketSentiment = (Math.random() - 0.5) * 0.01 * stock.price; // ±0.5%

                // Cap for news impact as fraction of price
                let maxNewsImpact = stock.price * 0.08; // 8% per major news

                let newsImpact = normalizedSentiment * normalizedWeight * maxNewsImpact;

                // Cap total per-tick impact both up and down (e.g., max 5%)
                let maxTotalDelta = stock.price * 0.05;
                let totalImpact = Math.max(Math.min(newsImpact + marketSentiment, maxTotalDelta), -maxTotalDelta);

                // Diminishing returns for stacking news in one tick
                if (impactMap.has(stock.ticker)) {
                    const prev = impactMap.get(stock.ticker);
                    totalImpact = prev.totalImpact + totalImpact * 0.5;
                    impactMap.set(stock.ticker, {
                        ...prev,
                        totalImpact,
                        logs: [
                            ...prev.logs,
                            `[stacked news] Sentiment: ${newsItem.sentimentScore}, Weight: ${weight}, Δ: ${totalImpact.toFixed(2)}`
                        ]
                    });
                } else {
                    impactMap.set(stock.ticker, {
                        stock,
                        totalImpact,
                        logs: [
                            `Tier: ${newsItem.tier || "unknown"}, Sentiment: ${newsItem.sentimentScore}, Weight: ${weight}, Δ: ${totalImpact.toFixed(2)}`
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
