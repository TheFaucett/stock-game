const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  ticker: String,
  price: Number,
  basePrice: Number,
  volatility: Number,
  history: [Number],
  sector: String,
  outstandingShares: Number,
  nextEarningsTick: Number,
}, {
  collection: 'stock-game-test' // forces use of the test collection
});

module.exports = mongoose.model('TestStock', stockSchema);
