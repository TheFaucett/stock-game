const GlobalNews = require("../models/GlobalNews");
const SectorNews = require("../models/SectorNews");
const StockNews = require("../models/StockNews");

/**
 * Fetch current news data
 */
async function getCurrentNews(req, res) {
    try {
        const globalNews = await GlobalNews.getLatest();
        const sectorNews = await SectorNews.getLatest();
        const stockNews = await StockNews.getLatest();

        res.json({ globalNews, sectorNews, stockNews });
    } catch (error) {
        console.error("⚠️ Error fetching news:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { getCurrentNews };
