const express = require('express');
const router = express.Router();
const StockNews = require('../models/StockNews');
const Stock = require('../models/Stock'); // Import Stock model to fetch random stocks

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

// 📌 Get Stock-Specific News
router.get('/:ticker?', async (req, res) => {
    try {
        let { ticker } = req.params;

        // ✅ If no ticker is provided, get a random stock
        if (!ticker) {
            console.warn("⚠️ No ticker provided. Selecting a random stock...");
            ticker = await getRandomStockTicker();

            if (!ticker) {
                console.error("❌ No stocks available to select randomly.");
                return res.status(500).json({ success: false, error: "No stocks available." });
            }

            console.log(`🔀 Selected random stock: ${ticker}`);
        }

        console.log(`Fetching stock news for: ${ticker}`);

        // ✅ Fetch the most recent stock news document
        const stockDoc = await StockNews.findOne().sort({ date: -1 });

        if (!stockDoc || !stockDoc.sectors) {
            console.log(`⚠️ No stock news found for ${ticker}.`);
            return res.json({ success: true, news: [] });
        }

        let allNews = [];

        // ✅ Check all sectors for news containing the requested ticker
        for (const [sector, newsArray] of Object.entries(stockDoc.sectors)) {
            if (Array.isArray(newsArray)) {
                const tickerNews = newsArray.filter(news => news.ticker === ticker);
                allNews = allNews.concat(tickerNews);
            }
        }

        console.log(`✅ Stock news found for ${ticker}: ${allNews.length} articles`);
        res.json({ success: true, news: allNews });

    } catch (error) {
        console.error('❌ Error fetching stock news:', error);
        res.status(500).json({ success: false, error: 'Error fetching stock news' });
    }
});

module.exports = router;
