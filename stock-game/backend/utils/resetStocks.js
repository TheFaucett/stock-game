require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const Portfolio = require("../models/Portfolio");
const {getOrGenerateSampleTickers} = require("../utils/sampleStocks");
const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_PRICE = 100.00;
const DEFAULT_EARNINGS_TICK = 10;

let didConnect = false;

async function resetStockPrices() {
  try {
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      didConnect = true;
      console.log("✅ Connected to MongoDB");
    }

    // --- STOCKS ---
    const stocks = await Stock.find(
      { ticker: { $in: [...sampleTickers] } },
      {
        _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
        volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
        history: { $slice: -10 } // adjust or make dynamic if you want
      }
    ).lean();
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
            nextEarningsTick: DEFAULT_EARNINGS_TICK,
            lastEarningsReport: null,
            ...(stock.tick !== undefined ? { tick: 0 } : {})
          }
        }
      }
    }));

    if (stockBulkOps.length > 0) {
      const result = await Stock.bulkWrite(stockBulkOps);
      console.log(`✅ Reset ${result.modifiedCount} stocks (price, earnings, tick, history)`);
    }

    // --- FIRMS ---
    const firms = await Firm.find();
    const firmBulkOps = firms.map(firm => ({
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
            startingBalance: 10_000_000,
            ...(firm.tick !== undefined ? { tick: 0 } : {})
          }
        }
      }
    }));

    if (firmBulkOps.length > 0) {
      const result = await Firm.bulkWrite(firmBulkOps);
      console.log(`✅ Reset ${result.modifiedCount} firms (including tick)`);
    }

    // --- PORTFOLIOS ---
    const portfolios = await Portfolio.find();
    const portfolioBulkOps = portfolios.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            transactions: [],
            borrowedShares: {},
            ...(p.tick !== undefined ? { tick: 0 } : {})
          }
        }
      }
    }));

    if (portfolioBulkOps.length > 0) {
      const result = await Portfolio.bulkWrite(portfolioBulkOps);
      console.log(`✅ Reset ${result.modifiedCount} portfolios (including tick)`);
    }

  } catch (err) {
    console.error("❌ Error resetting:", err);
  } finally {
    if (didConnect) {
      await mongoose.connection.close();
      console.log("🔌 Disconnected from MongoDB.");
    }
  }
}

// Exportable if needed elsewhere
module.exports = resetStockPrices;

// Auto-run only if called directly
if (require.main === module) {
  resetStockPrices();
}
