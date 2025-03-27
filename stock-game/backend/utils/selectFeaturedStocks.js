const Stock = require('../models/Stock');

// Get 5 random featured stocks
const getFeaturedStocks = async (count = 5) => {
    try {
        const featured = await Stock.aggregate([{ $sample: { size: count } }]);
        return featured;
    } catch (err) {
        console.error("❌ Error fetching featured stocks:", err);
        return [];
    }
};

module.exports = getFeaturedStocks;