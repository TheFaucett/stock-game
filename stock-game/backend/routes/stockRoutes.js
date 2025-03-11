const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock'); // Ensure correct model import

// GET all stocks with rounded values
router.get('/', async (req, res) => {
    try {
        let stocks = await Stock.find();

        // Round numeric values before sending response
        stocks = stocks.map(stock => ({
            ...stock.toObject(),
            price: parseFloat(stock.price.toFixed(2)),
            change: parseFloat(stock.change.toFixed(2)),
            peRatio: parseFloat(stock.peRatio.toFixed(2)),
            dividendYield: parseFloat(stock.dividendYield.toFixed(4)), // Keeping 4 decimal places for yield
            history: stock.history.map(value => parseFloat(value.toFixed(2))) // Ensuring history values are rounded too
        }));

        res.json(stocks);
    } catch (error) {
        console.error('Error fetching stocks:', error);
        res.status(500).json({ error: 'Error fetching stocks' });
    }
});
router.get("/heatmap", async (req, res) => {
    try {
        // Get all stocks from the database
        const stocks = await Stock.find();

        // 📌 Group stocks by sector
        const groupedStocks = stocks.reduce((acc, stock) => {
            if (!acc[stock.sector]) acc[stock.sector] = [];
            acc[stock.sector].push({
                ticker: stock.ticker,
                marketCap: stock.outstandingShares * stock.price, // Determines size
                change: stock.change // Determines color
            });
            return acc;
        }, {});

        // Convert into array of sector objects
        const sectors = Object.keys(groupedStocks).map(sector => ({
            name: sector,
            stocks: groupedStocks[sector]
        }));

        res.json({ success: true, sectors });
    } catch (error) {
        console.error("❌ Error fetching heatmap data:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});
module.exports = router;
