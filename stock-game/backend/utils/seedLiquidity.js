


//This file was used to seed liquidity for all stocks but is useless rn 😜














/*const mongoose = require("mongoose");
const Stock = require("../models/Stock");

const seedLiquidity = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/stock-game");

    const stocks = await Stock.find();

    for (const stock of stocks) {
      stock.liquidity = Math.round((Math.random() * 2 - 1) * 100) / 100; // Range: -1 to 1
      await stock.save();
    }

    console.log("✅ Liquidity seeded for all stocks.");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error seeding liquidity:", err);
  }
};

seedLiquidity();
*/