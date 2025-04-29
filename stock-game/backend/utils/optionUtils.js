const Option = require("../models/Option");

/* fetch a live option matching the request */
async function getOption(underlying, variant, strike, expiryTick) {
  return Option.findOne({
    underlying: underlying.toUpperCase(),
    type: variant,
    strike,
    expiryTick
  });
}

/* debit cash + push a transaction row into portfolio.transactions */
function recordOptionPurchase({ portfolio, optionDoc, contracts, tickNow }) {
  const cashNeeded = contracts * optionDoc.premium * optionDoc.multiplier;
  if (portfolio.balance < cashNeeded) {
    throw new Error("Insufficient balance for option purchase");
  }

  portfolio.balance -= cashNeeded;

  portfolio.transactions.push({
    type: optionDoc.type === "CALL" ? "call" : "put",
    ticker: optionDoc.underlying,
    optionId: optionDoc._id,
    contracts,
    multiplier: optionDoc.multiplier,
    price: optionDoc.premium,
    total: cashNeeded,
    date: new Date(),
    tickOpened: tickNow
  });
}

module.exports = { getOption, recordOptionPurchase };
