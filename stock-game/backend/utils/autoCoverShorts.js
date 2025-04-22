const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { getCurrentTick } = require('../utils/tickTracker');

async function autoCoverShorts() {
  const portfolios = await Portfolio.find();
  const currentTick = getCurrentTick();

  for (const portfolio of portfolios) {
    const shortTxs = portfolio.transactions
      .filter(tx => tx.type === 'short')
      .slice(-30); // Look at last 30 short transactions only

    for (const shortTx of shortTxs) {
      const { ticker, shares, tickOpened } = shortTx;

      if (!tickOpened || currentTick - tickOpened < 12) continue; // Skip if not expired

      const stock = await Stock.findOne({ ticker });
      if (!stock) continue;

      const borrowedShares = portfolio.borrowedShares.get(ticker);
      if (!borrowedShares || borrowedShares < shares) continue;

      const coverCost = borrowedShares * stock.price;

      if (portfolio.balance >= coverCost) {
        portfolio.balance -= coverCost;
        portfolio.borrowedShares.set(ticker, 0);
        portfolio.borrowedShares.delete(ticker);

        portfolio.transactions.push({
          type: 'cover',
          ticker,
          shares: borrowedShares,
          price: stock.price,
          total: coverCost,
          date: new Date(),
          tickOpened // Carry forward the tick it was opened (for reference)
        });
      }
    }

    await portfolio.save();
  }

  console.log("🔁 Auto-covering of shorts complete.");
}

module.exports = { autoCoverShorts };
