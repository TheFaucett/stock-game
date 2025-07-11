const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const Portfolio = require("../models/Portfolio");
const MONGO_URI = "mongodb://localhost:27017/stock-game";
const DEFAULT_PRICE = 100.00;

async function resetStockPrices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

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
    } else {
      console.log("ℹ️ No stocks found to update.");
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
            balance: 100000,
            lastTradeCycle: 0
          }
        }
      }
    }));

    if (firmBulkOps.length > 0) {
      const result = await Firm.bulkWrite(firmBulkOps);
      console.log(`✅ Reset ${result.modifiedCount} firms.`);
    } else {
      console.log("ℹ️ No firms found to update.");
    }

  } catch (err) {
    console.error("❌ Error resetting:", err);
  } finally {
    mongoose.connection.close();
  }
}

async function resetStockPrices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ... STOCK/FIRM logic ...

    // --- PORTFOLIOS ---
    const portfolios = await Portfolio.find();
    const portfolioBulkOps = portfolios.map(portfolio => ({
      updateOne: {
        filter: { _id: portfolio._id },
        update: {
          $set: {
            transactions: [],      // 🧹 clear some irrelevant info from the frontend if there is a resetStocks call
            borrowedShares: {},    // shorts/calls/puts

          }
        }
      }
    }));

    if (portfolioBulkOps.length > 0) {
      const result = await Portfolio.bulkWrite(portfolioBulkOps);
      console.log(`✅ Reset ${result.modifiedCount} portfolios.`);
    } else {
      console.log("ℹ️ No portfolios found to update.");
    }

  } catch (err) {
    console.error("❌ Error resetting:", err);
  } finally {
    mongoose.connection.close();
  }
}
resetStockPrices();
