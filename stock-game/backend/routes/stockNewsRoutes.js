const express = require('express');
const router = express.Router();
const StockNews = require('../models/StockNews');
const Stock = require('../models/Stock');


async function getRandomStockTicker() {
    try {
        const randomStock = await Stock.aggregate([{ $sample: { size: 1 } }]);
        return randomStock.length > 0 ? randomStock[0].ticker : null;
    } catch (error) {
        console.error("⚠️ Error fetching random stock:", error);
        return null;
    }
}


async function getRandomStockNewsItem(ticker = null) {
    try {
        const stockNewsDoc = await StockNews.findOne().sort({ date: -1 });
        if (!stockNewsDoc || !stockNewsDoc.sectors) return null;

        let allNews = [];
        for (const [sector, newsArray] of Object.entries(stockNewsDoc.sectors)) {
            if (Array.isArray(newsArray)) {
                // If ticker provided, only include news for that ticker
                if (ticker) {
                    allNews.push(...newsArray.filter(n => n.ticker === ticker));
                } else {
                    allNews.push(...newsArray);
                }
            }
        }
        if (allNews.length === 0) return null;
        const randomIdx = Math.floor(Math.random() * allNews.length);
        return allNews[randomIdx];
    } catch (error) {
        console.error("⚠️ Error picking random stock news:", error);
        return null;
    }
}

// --- Route handler ---
router.get('/:ticker?', async (req, res) => {
    try {
        let { ticker } = req.params;

        // If no ticker, pick a random one (but only used for logging)
        if (!ticker) {
            ticker = await getRandomStockTicker();
            console.log(`🔀 Selected random stock: ${ticker}`);
        }

        // Get a random news item, filtered if ticker given
        const newsItem = await getRandomStockNewsItem(ticker);

        if (!newsItem) {
            return res.json({ success: true, news: [] });
        }
        res.json({ success: true, news: [newsItem] });

    } catch (error) {
        console.error("❌ Error fetching stock news:", error);
        res.status(500).json({ success: false, error: "Error fetching stock news" });
    }
});

module.exports = router;
