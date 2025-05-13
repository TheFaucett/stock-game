// utils/sweepOptions.js
const Portfolio = require('../models/Portfolio');
const Stock     = require('../models/Stock');

async function sweepOptionExpiries(currentTick) {
  // 1) load every portfolio
  const portfolios = await Portfolio.find();

  for (const portfolio of portfolios) {
    let dirty = false;

    try {
      // 2) find calls/puts expiring right now
      for (const tx of portfolio.transactions) {
        if ((tx.type === 'call' || tx.type === 'put')
           && tx.expiryTick === currentTick
           // avoid double‐expiry
           && !tx.expired  
        ) {
          console.log(`🔔 Expiring ${tx.type.toUpperCase()} for ${portfolio._id} / ${tx.ticker} at tick ${currentTick}`);

          // 3) get spot price
          const stock = await Stock.findOne({ ticker: tx.ticker });
          if (!stock) {
            console.warn(`  ⚠️ underlying ${tx.ticker} not found, skipping`);
            continue;
          }

          // 4) intrinsic value
          const spot = stock.price;
          const intrinsic = tx.type === 'call'
            ? Math.max(0, spot - tx.strike)
            : Math.max(0, tx.strike - spot);

          // 5) payoff
          const multiplier = tx.multiplier ?? 1;
          const payoff = intrinsic * tx.contracts * multiplier;

          console.log(`  💵 intrinsic=$${intrinsic.toFixed(2)}, contracts=${tx.contracts}, payoff=$${payoff.toFixed(2)}`);

          // 6) credit user
          portfolio.balance += payoff;

          // 7) mark tx as expired so we don’t sweep twice
          tx.expired = true;

          // 8) record an “expire” transaction
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
        }
      }

      // 9) save only if we changed anything
      if (dirty) {
        await portfolio.save();
        console.log(`  ✅ Saved portfolio ${portfolio._id}`);
      }
    } catch (err) {
      console.error(`❌ Error sweeping portfolio ${portfolio._id}:`, err);
      // continue to next portfolio
    }
  }
}

module.exports = { sweepOptionExpiries };
