const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock'); // Ensure correct model import

// GET all stocks
router.get('/', async (req, res) => {
    try {
        const stocks = await Stock.find();
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching stocks' });
    }
});

module.exports = router;
