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

module.exports = router;
