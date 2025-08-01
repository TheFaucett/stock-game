const Option = require('../models/Option');
const DEFAULT_MULTIPLIER = 1;

/**
 * Find or mint an option contract.
 */
async function getOption(underlying, variant, strike, expiryTick) {
  const q = {
    underlying: underlying.toUpperCase(),
    variant,           // matches your schema’s `variant` field
    strike,
    expiryTick
  };

  let opt = await Option.findOne(q);
  if (opt) return opt;

  const pct     = variant === 'CALL' ? 0.02 : 0.015;
  const premium = +(strike * pct).toFixed(2);

  opt = await Option.create({
    ...q,
    premium,
    multiplier : DEFAULT_MULTIPLIER,
    createdAt  : new Date()
  });

  return opt;
}

/**
 * Debit the premium and push an option transaction.
 * @param {object} params
 * @param {Document} params.portfolio
 * @param {Document} params.optionDoc
 * @param {number}   params.contracts   # of contracts
 * @param {number}   params.tickNow
 * @param {string}   params.tradeType   "call" or "put"
 */
function recordOptionPurchase({ portfolio, optionDoc, contracts, tickNow, tradeType }) {
  console.log('  ↪️  recordOptionPurchase args:', {
    portfolioId: portfolio._id,
    optionId: optionDoc._id,
    contracts,
    premium: optionDoc.premium,
    multiplier: optionDoc.multiplier
  });

  const DEFAULT_MULTIPLIER = 1;
  const multiplier = optionDoc.multiplier ?? DEFAULT_MULTIPLIER;
  const cost = contracts * optionDoc.premium * multiplier;
  console.log('  💸 Cost for this purchase:', cost);

  if (portfolio.balance < cost) {
    console.warn('  ⚠️ Insufficient balance for options', { balance: portfolio.balance, cost });
    throw new Error('Insufficient balance for option purchase');
  }

  // Debit balance
  portfolio.balance -= cost;
  console.log('  ➖ Debited cost, new balance:', portfolio.balance);

  // NOTE: Removed portfolio.transactions.push() here
  //       The controller will now handle transaction logging with enrichment.
}



module.exports = {
  getOption,
  recordOptionPurchase
};
