const express = require('express');
const router = express.Router();
const SectorNews = require('../models/SectorNews');

// 📌 Get Sector News
router.get('/:sector', async (req, res) => {
    try {
        console.log(`Fetching sector news for: ${req.params.sector}`);
        const sectorDoc = await SectorNews.findOne().sort({ date: -1 });

        if (!sectorDoc || !sectorDoc.sectors[req.params.sector]) {
            return res.json({ success: true, news: [] });
        }

        console.log(`Sector news found:`, sectorDoc.sectors[req.params.sector]);
        res.json({ success: true, news: sectorDoc.sectors[req.params.sector] });
    } catch (error) {
        console.error('Error fetching sector news:', error);
        res.status(500).json({ success: false, error: 'Error fetching sector news' });
    }
});

module.exports = router;
