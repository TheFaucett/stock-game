const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  portfolioId: { type: String, ref: 'Portfolio', required: true },
  amount:      { type: Number, required: true },  // principal at origination
  balance:     { type: Number, required: true },  // remaining principal
  term:        { type: Number, required: true },  // in ticks
  rate:        { type: Number, required: true },  // APR (as fraction per tick)
  startTick:   { type: Number, required: true },
  closed:      { type: Boolean, default: false },
  payments: [                                   // amortization history
    {
      tick:      { type: Number, required: true },
      principal: { type: Number, required: true },
      interest:  { type: Number, required: true },
      total:     { type: Number, required: true },

    }
  ]
});

const depositSchema = new mongoose.Schema({
  portfolioId: { type: String, ref: 'Portfolio', required: true },
  amount:      { type: Number, required: true },
  rate:        { type: Number, required: true },  // APR (as fraction per tick)
  startTick:   { type: Number, required: true },
  closed:      { type: Boolean, default: false },
  withdrawals: [                                // if you support early withdrawal
    {
      tick:   { type: Number, required: true },
      amount: { type: Number, required: true },

    }
  ]
});

const bankSchema = new mongoose.Schema({
  loans:    [loanSchema],
  deposits: [depositSchema]
});

module.exports = mongoose.model('Bank', bankSchema);
