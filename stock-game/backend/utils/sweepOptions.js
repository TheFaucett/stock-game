// utils/sweepOptions.js
const Portfolio = require('../models/Portfolio');
const Stock     = require('../models/Stock');

async function sweepOptionExpiries(currentTick) {
  // 1) load every portfolio
  const portfolios = await Portfolio.find();

  for (const portfolio of portfolios) {
    let dirty = false;

try {
  // 2) find calls/puts that are due or overdue
  for (const tx of portfolio.transactions) {
    if ((tx.type === 'call' || tx.type === 'put') && !tx.expired) {
      
      // Exact expiry tick → settle with payoff
      if (tx.expiryTick === currentTick) {
        console.log(`🔔 Expiring ${tx.type.toUpperCase()} for ${portfolio._id} / ${tx.ticker} at tick ${currentTick}`);

        const stock = await Stock.findOne({ ticker: tx.ticker });
        if (!stock) {
          console.warn(`  ⚠️ Underlying ${tx.ticker} not found, skipping`);
          continue;
        }

        const spot = stock.price;
        const intrinsic = tx.type === 'call'
          ? Math.max(0, spot - tx.strike)
          : Math.max(0, tx.strike - spot);

        const multiplier = tx.multiplier ?? 1;
        const payoff = intrinsic * tx.contracts * multiplier;

        console.log(`  💵 intrinsic=$${intrinsic.toFixed(2)}, contracts=${tx.contracts}, payoff=$${payoff.toFixed(2)}`);

        // Credit user
        portfolio.balance += payoff;

        // Mark expired
        tx.expired = true;

        // Record expire transaction
        const expireType = tx.type === 'call' ? 'call_expire' : 'put_expire';
        portfolio.transactions.push({
          type       : expireType,
          ticker     : tx.ticker,
          shares     : tx.contracts,
          strike     : tx.strike,
          expiryTick : tx.expiryTick,
          price      : intrinsic,
          total      : payoff,
          date       : new Date(),
          tickOpened : currentTick
        });

        dirty = true;

      // Missed expiry (expiryTick already passed) → zero payoff
      } else if (tx.expiryTick < currentTick) {
        console.log(`⚠️ Missed expiry for ${tx.type.toUpperCase()} on ${tx.ticker} (expired ${currentTick - tx.expiryTick} ticks ago)`);

        tx.expired = true;

        const expireType = tx.type === 'call' ? 'call_expire' : 'put_expire';
        portfolio.transactions.push({
          type       : expireType,
          ticker     : tx.ticker,
          shares     : tx.contracts,
          strike     : tx.strike,
          expiryTick : tx.expiryTick,
          price      : 0,
          total      : 0,
          date       : new Date(),
          tickOpened : currentTick
        });

        dirty = true;
      }
    }
  }

  if (dirty) {
    await portfolio.save();
    console.log(`  ✅ Saved portfolio ${portfolio._id}`);
  }
} catch (err) {
  console.error(`❌ Error sweeping portfolio ${portfolio._id}:`, err);
}

  }
}

module.exports = { sweepOptionExpiries };
