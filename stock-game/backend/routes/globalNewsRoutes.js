const express = require('express');
const router = express.Router();
const GlobalNews = require('../models/GlobalNews');

// 📌 Get Global News
router.get('/', async (req, res) => {
    try {
        const news = await GlobalNews.find({}).sort({ date: -1 });
        console.log('Fetched global news:', news);
        res.json({ success: true, news });
    } catch (error) {
        console.error('Error fetching global news:', error);
        res.status(500).json({ success: false, error: 'Error fetching global news' });
    }
});

module.exports = router;
