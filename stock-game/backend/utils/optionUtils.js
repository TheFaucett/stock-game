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
  const multiplier = optionDoc.multiplier ?? DEFAULT_MULTIPLIER;
  const cost       = contracts * optionDoc.premium * multiplier;

  if (portfolio.balance < cost) {
    throw new Error('Insufficient balance for option purchase');
  }

  // 1) Debit cash
  portfolio.balance -= cost;

  // 2) Log transaction — **must** include `type`
  portfolio.transactions.push({
    type       : tradeType,                // ← "call" or "put"
    ticker     : optionDoc.underlying,
    shares     : contracts,                // still uses `shares`
    price      : optionDoc.premium,
    total      : cost,
    date       : new Date(),
    tickOpened : tickNow
    // extra fields (optionId, strike, expiryTick, multiplier) will be ignored by your schema
  });
}

module.exports = {
  getOption,
  recordOptionPurchase
};
