const GlobalNews = require("../models/GlobalNews");
const SectorNews = require("../models/SectorNews");
const StockNews = require("../models/StockNews");

/**
 * Fetch and return the latest news data
 */
async function getLatestNewsData() {
    try {
        console.log("📰 Fetching latest news...");
        const globalNews = await GlobalNews.getLatest();
        const sectorNews = await SectorNews.getLatest();
        const stockNews = await StockNews.getLatest();

        const newsItems = [...(globalNews || []), ...(sectorNews || []), ...(stockNews || [])];

        if (newsItems.length === 0) {
            console.log("ℹ️ No relevant news to process.");
            return [];
        }

        return newsItems.map(newsItem => ({
            newsItem,
            weight: determineNewsWeight(newsItem)
        }));
    } catch (error) {
        console.error("⚠️ Error fetching news:", error);
        return [];
    }
}

/**
 * Determine the impact weight of a news item
 * @param {Object} newsItem - The news event affecting stocks
 * @returns {Number} - Weight of impact
 */
function determineNewsWeight(newsItem) {
    if (newsItem.type === "global") return 1.22;
    if (newsItem.type === "sector") return 1.45;
    if (newsItem.type === "stock") return 1.8;
    return 1.0; // Default weight
}

module.exports = { getLatestNewsData };
