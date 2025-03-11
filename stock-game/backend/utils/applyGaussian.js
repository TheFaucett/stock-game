const Stock = require('../models/Stock');
const mongoose = require('mongoose');

// ✅ Gaussian noise function using Geometric Brownian Motion
const applyGaussian = async () => {
    try {
        // Fetch all stocks
        const stocks = await Stock.find();

        // Define market-wide parameters
        const market_drift = 0.0003;  // Expected daily market return
        const market_volatility = 0.01; // Market-wide volatility factor

        for (let stock of stocks) {
            const { price, volatility } = stock;

            // Generate Gaussian noise
            const epsilon = Math.random() * 2 - 1; // Uniformly distributed between -1 and 1
            const market_noise = Math.random() * 2 - 1; // Market-wide random movement

            // Apply GBM formula
            const newPrice = price * Math.exp(
                (market_drift - 0.5 * volatility ** 2) +
                volatility * epsilon +
                market_volatility * market_noise
            );

            // Compute % change
            const change = ((newPrice - price) / price) * 100;

            // Update stock in DB
            await Stock.findByIdAndUpdate(stock._id, { price: newPrice, change });
        }

        console.log("✅ Stock prices updated with Gaussian noise.");
    } catch (error) {
        console.error("❌ Error updating stock prices:", error);
    }
};

module.exports = { applyGaussian };
