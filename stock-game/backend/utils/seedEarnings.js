require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const generateEarningsReport = require('../utils/generateEarnings');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const stocks = await Stock.find({});
    const currentTick = 1; // just a starting tick

    for (const stock of stocks) {
      const { report, newPrice, nextEarningsTick } = generateEarningsReport(stock, currentTick);

      stock.price = newPrice;
      stock.lastEarningsReport = report;
      stock.nextEarningsTick = nextEarningsTick;

      await stock.save();
      console.log(`📄 Seeded earnings for ${stock.ticker} | EPS: ${report.eps}`);
    }

    console.log(`✅ Finished seeding earnings for ${stocks.length} stocks`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding earnings:', err);
    process.exit(1);
  }
})();
