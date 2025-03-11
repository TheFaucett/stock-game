const express = require('express');
const router = express.Router();
const GlobalNews = require('../models/GlobalNews');

/**
 * Fetch a random global news item
 */
async function getRandomGlobalNews() {
    try {
        const newsList = await GlobalNews.find().sort({ date: -1 });

        if (newsList.length === 0) return null;

        return newsList[Math.floor(Math.random() * newsList.length)];
    } catch (error) {
        console.error("⚠️ Error fetching random global news:", error);
        return null;
    }
}

// 📌 Get Global News (With Random Selection)
router.get('/', async (req, res) => {
    try {
        const randomNews = await getRandomGlobalNews();
        if (!randomNews) return res.json({ success: true, news: [] });

        res.json({ success: true, news: randomNews });

    } catch (error) {
        console.error('⚠️ Error fetching global news:', error);
        res.status(500).json({ success: false, error: 'Error fetching global news' });
    }
});

module.exports = router;
