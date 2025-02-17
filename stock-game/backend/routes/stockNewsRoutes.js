const express = require('express');
const router = express.Router();
const StockNews = require('../models/StockNews');

// 📌 Get Stock-Specific News
router.get('/:ticker', async (req, res) => {
    try {
        console.log(`Fetching stock news for: ${req.params.ticker}`);
        const stockDoc = await StockNews.findOne().sort({ date: -1 });

        let allNews = [];
        if (stockDoc && stockDoc.sectors) {
            Object.values(stockDoc.sectors).forEach(newsArray => {
                if (Array.isArray(newsArray)) {
                    const tickerNews = newsArray.filter(news => news.ticker === req.params.ticker);
                    allNews = allNews.concat(tickerNews);
                }
            });
        }

        console.log(`Stock news found:`, allNews);
        res.json({ success: true, news: allNews });
    } catch (error) {
        console.error('Error fetching stock news:', error);
        res.status(500).json({ success: false, error: 'Error fetching stock news' });
    }
});

module.exports = router;
