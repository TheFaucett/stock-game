const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const Portfolio = require("../models/Portfolio");

const MONGO_URI = "mongodb://localhost:27017/stock-game";
const DEFAULT_PRICE = 100.00;

let didConnect = false;

async function resetStockPrices() {
  try {
    // Only connect if we're not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      didConnect = true;
      console.log("✅ Connected to MongoDB");
    }

    // --- STOCKS ---
    const stocks = await Stock.find();
    const stockBulkOps = stocks.map(stock => ({
      updateOne: {
        filter: { _id: stock._id },
        update: {
          $set: {
            price: DEFAULT_PRICE,
            history: Array(30).fill(DEFAULT_PRICE),
            change: 0,
            volatility: 0.01,
            basePrice: DEFAULT_PRICE,
          }
        }
      }
    }));

    if (stockBulkOps.length > 0) {
      const result = await Stock.bulkWrite(stockBulkOps);
      console.log(`✅ Updated ${result.modifiedCount} stocks to $${DEFAULT_PRICE} (history reset)`);
    }


    const firmBulkOps = (await Firm.find()).map(firm => ({
    updateOne: {
        filter: { _id: firm._id },
        update: {
        $set: {
            ownedShares: {},
            transactions: [],
            balance: 10_000_000,
            lastTradeCycle: 0,
            emotions: {
            confidence: 0.5,
            frustration: 0.2,
            greed: 0.5,
            regret: 0.2
            },
            memory: {},
            cooldownUntil: null,
            riskTolerance: 0.15 + Math.random() * 0.2,
            startingBalance: 10_000_000
        }
        }
    }
    }));

    if (firmBulkOps.length > 0) {
    const result = await Firm.bulkWrite(firmBulkOps);
    console.log(`✅ Reset ${result.modifiedCount} firms.`);
    }


    // --- PORTFOLIOS ---
    const portfolioBulkOps = (await Portfolio.find()).map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            transactions: [],
            borrowedShares: {},
          }
        }
      }
    }));
    if (portfolioBulkOps.length > 0) {
      const result = await Portfolio.bulkWrite(portfolioBulkOps);
      console.log(`✅ Reset ${result.modifiedCount} portfolios.`);
    }

  } catch (err) {
    console.error("❌ Error resetting:", err);
  } finally {
    if (didConnect) {
      await mongoose.connection.close(); // only if we opened it
    }
  }
}

// Exportable if needed elsewhere
module.exports = resetStockPrices;

// Auto-run only if this file is run directly (not imported)
if (require.main === module) {
  resetStockPrices();
}
