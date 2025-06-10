const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Portfolio = require("../models/Portfolio");

// Your testing Portfolio ObjectId
const TEST_PORTFOLIO_ID = "67af822e5609849ac14d7942"; // change if needed

async function payDividendsToTestPortfolio() {
  try {
    const portfolio = await Portfolio.findById(TEST_PORTFOLIO_ID);
    if (!portfolio) {
      console.error(`Portfolio ${TEST_PORTFOLIO_ID} not found!`);
      return;
    }

    const ownedTickers = Object.keys(portfolio.ownedShares || {});
    if (ownedTickers.length === 0) {
      console.log("Portfolio owns no shares — no dividends to pay.");
      return;
    }

    const stocks = await Stock.find({
      ticker: { $in: ownedTickers }
    });

    let totalPaid = 0;
    const now = new Date();

    for (const stock of stocks) {
      const sharesOwned = portfolio.ownedShares[stock.ticker];
      if (!sharesOwned || stock.dividendYield <= 0) continue;

      const dividendPerShare = stock.price * stock.dividendYield;
      const totalDividend = dividendPerShare * sharesOwned;

      // Add to portfolio balance
      portfolio.balance += totalDividend;
      totalPaid += totalDividend;

      // Optional: record dividend transaction
      portfolio.transactions.push({
        type: 'dividend',
        ticker: stock.ticker,
        shares: sharesOwned,
        dividendPerShare: +dividendPerShare.toFixed(4),
        totalDividend: +totalDividend.toFixed(2),
        date: now
      });
    }

    await portfolio.save();
    console.log(`💸 Paid $${totalPaid.toFixed(2)} in dividends to test portfolio ${portfolio._id}`);
  }
  catch (err) {
    console.error("⚠️ Error paying dividends:", err);
  }
}

module.exports = { payDividendsToTestPortfolio };
