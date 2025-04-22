const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { getCurrentTick } = require('../utils/tickTracker');

async function autoCoverShorts() {
  const portfolios = await Portfolio.find();
  const currentTick = getCurrentTick();

  for (const portfolio of portfolios) {
    const shorts = [...portfolio.transactions]
      .filter(tx => tx.type === 'short')
      .slice(-30)
      .reverse(); // Most recent first

    const covers = portfolio.transactions.filter(tx => tx.type === 'cover');

    for (const short of shorts) {
      const { ticker, shares, tickOpened } = short;

      // Skip if no tick info or not expired
      if (!tickOpened || currentTick - tickOpened < 12) continue;

      // Check if this short has already been covered
      const alreadyCovered = covers.some(c =>
        c.ticker === ticker &&
        c.shares === shares &&
        c.tickOpened === tickOpened
      );
      if (alreadyCovered) continue;

      const stock = await Stock.findOne({ ticker });
      if (!stock) continue;

      const borrowed = portfolio.borrowedShares.get(ticker) || 0;
      if (borrowed < shares) continue; // Not enough to cover

      const cost = shares * stock.price;
      if (portfolio.balance < cost) continue;

      // Proceed with cover
      portfolio.balance -= cost;
      const remaining = borrowed - shares;
      if (remaining > 0) {
        portfolio.borrowedShares.set(ticker, remaining);
      } else {
        portfolio.borrowedShares.delete(ticker);
      }

      portfolio.transactions.push({
        type: 'cover',
        ticker,
        shares,
        price: stock.price,
        total: cost,
        date: new Date(),
        tickOpened // for match reference
      });
    }

    await portfolio.save();
  }

  console.log("🔁 Auto-covering of expired shorts complete.");
}

module.exports = { autoCoverShorts };
