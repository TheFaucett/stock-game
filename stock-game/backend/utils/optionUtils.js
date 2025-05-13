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

  const multiplier = optionDoc.multiplier ?? DEFAULT_MULTIPLIER;
  const cost = contracts * optionDoc.premium * multiplier;
  console.log('  💸 Cost for this purchase:', cost);

  if (portfolio.balance < cost) {
    console.warn('  ⚠️ Insufficient balance for options', { balance: portfolio.balance, cost });
    throw new Error('Insufficient balance for option purchase');
  }

  portfolio.balance -= cost;
  console.log('  ➖ Debited cost, new balance:', portfolio.balance);

  portfolio.transactions.push({
    type       : tradeType,           // "call" or "put"
    ticker     : optionDoc.underlying,
    shares     : contracts,           // <— this satisfies your schema’s required `shares`
    contracts  : contracts,           // optional, for clarity
    multiplier : multiplier,          // optional
    optionId   : optionDoc._id,
    strike     : optionDoc.strike,
    expiryTick : optionDoc.expiryTick,
    price      : optionDoc.premium,
    total      : cost,
    date       : new Date(),
    tickOpened : tickNow
  });
  console.log('  📝 Logged option transaction at index', portfolio.transactions.length - 1);
}


module.exports = {
  getOption,
  recordOptionPurchase
};
