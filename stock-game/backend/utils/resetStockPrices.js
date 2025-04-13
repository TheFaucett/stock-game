const mongoose = require("mongoose");
const Stock = require("../models/Stock");

const MONGO_URI = "mongodb://localhost:27017/stock-game"; // Update if needed
const DEFAULT_PRICE = 100.00;

async function resetStockPrices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const stocks = await Stock.find();
    const bulkOps = stocks.map(stock => ({
      updateOne: {
        filter: { _id: stock._id },
        update: {
          $set: {
            price: DEFAULT_PRICE,
            history: Array(30).fill(DEFAULT_PRICE),
            change: 0,
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      const result = await Stock.bulkWrite(bulkOps);
      console.log(`✅ Updated ${result.modifiedCount} stocks to $${DEFAULT_PRICE}`);
    } else {
      console.log("ℹ️ No stocks found to update.");
    }
  } catch (err) {
    console.error("❌ Error resetting stock prices:", err);
  } finally {
    mongoose.connection.close();
  }
}

resetStockPrices();
