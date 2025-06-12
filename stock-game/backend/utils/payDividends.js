const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Portfolio = require("../models/Portfolio");

// Your testing Portfolio ObjectId
const TEST_PORTFOLIO_ID = "67af822e5609849ac14d7942"; // change if needed

async function payDividends() {
  try {
    const portfolio = await Portfolio.findOne({
      userId: TEST_PORTFOLIO_ID
    });
    if (!portfolio) {
      console.error(`Portfolio ${TEST_PORTFOLIO_ID} not found!`);
      return;
    }

    console.log("✅ ownedShares:", portfolio.ownedShares);

    const ownedTickers = Array.from(portfolio.ownedShares.keys());

    if (ownedTickers.length === 0) {
      console.log("Portfolio owns no shares — no dividends to pay.");
      return;
    }

    const stocks = await Stock.find({
      ticker: { $in: ownedTickers }
    });

    let totalPaid = 0;
    const now = new Date();
    console.log(`✅ Stocks found for dividend: ${stocks.length}`, stocks.map(s => s.ticker));

    for (const stock of stocks) {
      const sharesOwned = portfolio.ownedShares.get(stock.ticker);


      if (!sharesOwned || sharesOwned <= 0) continue;

      console.log(`🔎 ${stock.ticker} price=${stock.price}, yield=${stock.dividendYield}, shares=${sharesOwned}`);
      const dividendPerShare = stock.price * stock.dividendYield/ 365;
      const totalDividend = dividendPerShare * sharesOwned;

      // Add to portfolio balance
      portfolio.balance += totalDividend/365;
      totalPaid += totalDividend;
      console.log(`Checking ${stock.ticker}: dividendYield=${stock.dividendYield}, sharesOwned=${sharesOwned}`);
      console.log(`➡️ dividendPerShare=${dividendPerShare}, totalDividend=${totalDividend}`);


    }

    await portfolio.save();
    console.log(`💸 Paid $${totalPaid.toFixed(2)} in dividends to test portfolio ${portfolio._id}`);
  }
  catch (err) {
    console.error("⚠️ Error paying dividends:", err);
  }
}


module.exports = { payDividends };
