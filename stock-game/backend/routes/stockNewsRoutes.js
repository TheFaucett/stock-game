const express = require('express');
const router = express.Router();
const StockNews = require('../models/StockNews');
const Stock = require('../models/Stock'); // Import Stock model for random stock selection

/**
 * Fetch a random stock ticker from the database
 */
async function getRandomStockTicker() {
    try {
        const randomStock = await Stock.aggregate([{ $sample: { size: 1 } }]);
        return randomStock.length > 0 ? randomStock[0].ticker : null;
    } catch (error) {
        console.error("⚠️ Error fetching random stock:", error);
        return null;
    }
}

/**
 * Fetch the latest news for a given stock ticker
 */
async function getSingleStockNews(ticker) {
    try {
        if (!ticker) return null; // Edge case: no stock available

        const stockNewsDoc = await StockNews.findOne().sort({ date: -1 });

        if (!stockNewsDoc || !stockNewsDoc.sectors) {
            console.warn(`⚠️ No stock news found for ${ticker}.`);
            return null;
        }

        console.log(`📢 Raw stock news document:`, JSON.stringify(stockNewsDoc, null, 2));

        let newsItem = null;

        for (const [sector, newsArray] of Object.entries(stockNewsDoc.sectors)) {
            console.log(`📂 Checking sector: ${sector}, News Count: ${newsArray.length}`);

            if (Array.isArray(newsArray)) {
                console.log(`📊 Sector News Data:`, JSON.stringify(newsArray, null, 2));

                // ✅ Pick the first news item (instead of filtering by ticker)
                if (newsArray.length > 0) {
                    newsItem = newsArray[0]; // Grab first item in sector
                    break;
                }
            }
        }

        return newsItem;
    } catch (error) {
        console.error("⚠️ Error fetching stock news:", error);
        return null;
    }
}

// 📌 Get Stock-Specific News
router.get('/:ticker?', async (req, res) => {
    try {
        let { ticker } = req.params;

        // ✅ If no ticker is provided, select a random stock
        if (!ticker) {
            console.warn("⚠️ No ticker provided. Selecting a random stock...");
            ticker = await getRandomStockTicker();

            if (!ticker) {
                console.error("❌ No stocks available to select randomly.");
                return res.status(500).json({ success: false, error: "No stocks available." });
            }

            console.log(`🔀 Selected random stock: ${ticker}`);
        }

        console.log(`📡 Fetching stock news for: ${ticker}`);

        // ✅ Get only ONE news item (ignoring ticker filter)
        const newsItem = await getSingleStockNews(ticker);

        if (!newsItem) {
            console.log(`⚠️ No stock news found for ${ticker}.`);
            return res.json({ success: true, news: [] });
        }

        console.log(`✅ Stock news found: ${newsItem.description}`);
        res.json({ success: true, news: [newsItem] });

    } catch (error) {
        console.error("❌ Error fetching stock news:", error);
        res.status(500).json({ success: false, error: "Error fetching stock news" });
    }
});

module.exports = router;
