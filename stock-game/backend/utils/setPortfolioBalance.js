#!/usr/bin/env node

const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio'); // adjust if needed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stock-game';

// Parse CLI args
// Usage: node setPortfolioBalance.js [--by-id] <ID> <balance>
const argv = process.argv.slice(2);

if (argv.length < 2) {
  console.log('Usage: node setPortfolioBalance.js [--by-id] <userId|portfolioId> <balance>');
  process.exit(1);
}

const SEARCH_BY_PORTFOLIO_ID = argv[0] === '--by-id';
const idArg  = SEARCH_BY_PORTFOLIO_ID ? argv[1] : argv[0];
const balanceArg = SEARCH_BY_PORTFOLIO_ID ? argv[2] : argv[1];
const newBalance = parseFloat(balanceArg);

if (!idArg || isNaN(newBalance)) {
  console.log('Invalid arguments. Example: node setPortfolioBalance.js 6647a... 25000');
  process.exit(1);
}

(async () => {
  await mongoose.connect(MONGO_URI);

  const filter = SEARCH_BY_PORTFOLIO_ID
    ? { _id: idArg }
    : { userId: idArg };

  const updated = await Portfolio.findOneAndUpdate(
    filter,
    { $set: { balance: newBalance } },
    { new: true }
  );

  if (!updated) {
    console.error('Portfolio not found!');
    process.exit(1);
  } else {
    console.log(
      `Success! Set portfolio (${updated._id}) balance to $${updated.balance}`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
})();
