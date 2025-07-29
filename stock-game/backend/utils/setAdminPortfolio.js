







//This utils is now deprecated (and lowk didnt work anyways 💀)








// This code set up an admin portfolio used for dev purposes








/*const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio'); // adjust path if needed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/YOUR_DB_NAME';

// Usage: node setPortfolioBalance.js <userId> <balance>
const argv = process.argv.slice(2);

if (argv.length < 2) {
  console.log('Usage: node setPortfolioBalance.js <userId> <balance>');
  process.exit(1);
}

const userId = argv[0];
const newBalance = parseFloat(argv[1]);

if (!userId || isNaN(newBalance)) {
  console.log('Invalid arguments. Example: node setPortfolioBalance.js u_h7yz7vlk2v 25000');
  process.exit(1);
}

(async () => {
  await mongoose.connect(MONGO_URI);

  // Find or create the portfolio for this userId
  let portfolio = await Portfolio.findOne({ userId });

  if (!portfolio) {
    // If it doesn't exist, create it with starting fields
    portfolio = new Portfolio({
      userId,
      balance: newBalance,
      ownedShares: {},
      borrowedShares: {},
      transactions: [],
      watchlist: [],
    });
    await portfolio.save();
    console.log(`Created new portfolio for userId ${userId} with balance $${portfolio.balance}`);
  } else {
    portfolio.balance = newBalance;
    await portfolio.save();
    console.log(`Set portfolio (${portfolio._id}) balance to $${portfolio.balance}`);
  }

  await mongoose.disconnect();
  process.exit(0);
})();
*/