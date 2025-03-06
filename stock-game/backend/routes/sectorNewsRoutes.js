const express = require('express');
const router = express.Router();
const SectorNews = require('../models/SectorNews');

// 📌 Get Sector News
router.get('/:sector?', async (req, res) => {
    try {
        const sectorParam = req.params.sector;
        console.log(`Fetching sector news for: ${sectorParam || "all sectors"}`);

        const sectorDoc = await SectorNews.findOne().sort({ date: -1 });

        if (!sectorDoc) {
            return res.json({ success: true, news: [] });
        }

        if (sectorParam) {
            // If a specific sector is requested
            const sectorNews = sectorDoc.sectors[sectorParam];
            if (!sectorNews) {
                return res.json({ success: true, news: [] });
            }
            console.log(`Sector news found:`, sectorNews);
            return res.json({ success: true, news: sectorNews });
        }

        // If no specific sector is requested, return all sector news
        console.log(`Returning all sector news.`);
        return res.json({ success: true, news: sectorDoc.sectors });

    } catch (error) {
        console.error('Error fetching sector news:', error);
        res.status(500).json({ success: false, error: 'Error fetching sector news' });
    }
});

module.exports = router;
