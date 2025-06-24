// models/Portfolio.js
const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  userId:        { type: String, required: true },
  balance:       { type: Number, default: 10000 },
  ownedShares:   { type: Map, of: Number, default: {} },
  borrowedShares:{ type: Map, of: Number, default: {} },
  transactions: [
    {
      type       : {
        type    : String,
        enum    : [
          'buy','sell','short','cover',
          'call','put','call_expire','put_expire', 'loan', 'loan_payment', 'loan_close', 'deposit', 
          'withdrawal', 'dividend'
        ],
        required: true
      },
      ticker     : { type: String, required: true },
      shares     : { type: Number, required: true },    // REQUIRED
      price      : { type: Number, required: true },
      total      : { type: Number, required: true },
      date       : { type: Date, default: Date.now },
      tickOpened : { type: Number, default: 1 },

      expired    : { type: Boolean, default: false }, // may remain empty for buy/sell

      // option‐specific
      optionId   : { type: mongoose.Schema.Types.ObjectId, ref: 'Option' },
      contracts  : { type: Number },       
      strike     : { type: Number },
      expiryTick : { type: Number },
      multiplier : { type: Number },

      // ← new flag to prevent double‐sweeping
      expired    : { type: Boolean, default: false }
    }
  ],
  watchlist:    { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
