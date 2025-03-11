const express = require('express');
const router = express.Router();
const SectorNews = require('../models/SectorNews');

/**
 * Fetch a random sector if none is provided
 */
async function getRandomSector() {
    try {
        const sectorDoc = await SectorNews.findOne().sort({ date: -1 });

        if (!sectorDoc || !sectorDoc.sectors) return null;

        const sectorKeys = Object.keys(sectorDoc.sectors);
        if (sectorKeys.length === 0) return null;

        return sectorKeys[Math.floor(Math.random() * sectorKeys.length)];
    } catch (error) {
        console.error("⚠️ Error fetching random sector:", error);
        return null;
    }
}

// 📌 Get Sector News (With Random Selection)
router.get('/:sector?', async (req, res) => {
    try {
        let sector = req.params.sector;

        if (!sector) {
            sector = await getRandomSector(); // ✅ Pick a random sector if none provided
            if (!sector) return res.json({ success: true, news: [] });
        }

        const sectorDoc = await SectorNews.findOne().sort({ date: -1 });

        if (!sectorDoc || !sectorDoc.sectors[sector]) {
            return res.json({ success: true, news: [] });
        }

        // ✅ Pick a random news item from that sector
        const sectorNewsArray = sectorDoc.sectors[sector];
        const randomNews = sectorNewsArray[Math.floor(Math.random() * sectorNewsArray.length)];

        res.json({ success: true, news: randomNews });

    } catch (error) {
        console.error('⚠️ Error fetching sector news:', error);
        res.status(500).json({ success: false, error: 'Error fetching sector news' });
    }
});

module.exports = router;
