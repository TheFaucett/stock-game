const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  type: String,     // buy/sell
  ticker: String,
  shares: Number,
  price: Number,
  total: Number,
  date: Date,
  outcome: String   // win/loss/neutral
}, { _id: false });

const firmSchema = new mongoose.Schema({
    name: String,
    strategy: String,
    riskTolerance: Number,
    tradingFrequency: Number,
    balance: Number,
    ownedShares: { type: Object, default: {} },
    transactions: { type: Array, default: [] },
    lastTradeCycle: Number,

    // memory
    recentTrades: { type: [tradeSchema], default: [] },

    // emotion
    emotions: {
        confidence: { type: Number, default: 0.5 },   // 0 = low, 1 = high
        frustration: { type: Number, default: 0.0 },
        greed:      { type: Number, default: 0.5 },
        regret:     { type: Number, default: 0.0 }
    }
});

module.exports = mongoose.model('Firm', firmSchema);
