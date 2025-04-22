const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  balance: { type: Number, default: 10000 },
  ownedShares: { type: Map, of: Number, default: {} },
  borrowedShares: { type: Map, of: Number, default: {} },
  transactions: [
    {
      type: { type: String, enum: ['buy', 'sell', 'short', 'cover'], required: true },
      ticker: { type: String, required: true },
      shares: { type: Number, required: true },
      price: { type: Number, required: true },
      total: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      tickOpened: { type: Number, default : 1},
    }
  ],
  watchlist: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
