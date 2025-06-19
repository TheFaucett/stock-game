const Stock = require("../models/Stock");
const Portfolio = require("../models/Portfolio");

async function payDividends() {
  try {
    // 1. Fetch all portfolios
    const portfolios = await Portfolio.find();
    if (!portfolios.length) {
      console.log("No portfolios found—no dividends to pay.");
      return;
    }

    // 2. Gather all tickers owned by anyone
    const allOwnedTickers = new Set();
    portfolios.forEach(portfolio => {
      Object.keys(portfolio.ownedShares || {}).forEach(ticker => {
        allOwnedTickers.add(ticker);
      });
    });

    if (!allOwnedTickers.size) {
      console.log("No owned shares in any portfolio—no dividends to pay.");
      return;
    }

    // 3. Fetch all relevant stocks in a single query
    const stocks = await Stock.find({ ticker: { $in: Array.from(allOwnedTickers) } });
    const stockMap = {};
    stocks.forEach(stock => {
      stockMap[stock.ticker] = stock;
    });

    // 4. Pay out dividends to each portfolio
    let totalDividendsPaid = 0;
    for (const portfolio of portfolios) {
      let portfolioDividends = 0;
      for (const [ticker, sharesOwned] of Object.entries(portfolio.ownedShares || {})) {
        const stock = stockMap[ticker];
        if (!stock || !sharesOwned || sharesOwned <= 0) continue;
        const yieldPerYear = stock.dividendYield || 0;
        const dividendPerShare = stock.price * yieldPerYear / 365;
        const totalDividend = dividendPerShare * sharesOwned;

        portfolio.balance += totalDividend;
        portfolioDividends += totalDividend;
      }
      if (portfolioDividends > 0) {
        await portfolio.save();
        totalDividendsPaid += portfolioDividends;
        console.log(
          `💸 Paid $${portfolioDividends.toFixed(2)} in dividends to portfolio ${portfolio._id} (userId=${portfolio.userId})`
        );
      }
    }

    console.log(`🎉 Total dividends paid to all portfolios: $${totalDividendsPaid.toFixed(2)}`);
  } catch (err) {
    console.error("⚠️ Error paying dividends:", err);
  }
}

module.exports = { payDividends };
