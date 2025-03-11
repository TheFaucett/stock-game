const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
    ticker: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    change: { type: Number, default: 0 },
    sector: { type: String, required: true },
    eps: { type: Number, required: true },
    outstandingShares: { type: Number, required: true },
    peRatio: { type: Number },
    dividendYield: { type: Number },
    history: { type: [Number], default: [] },
    volatility: { type: Number, default: 0.02 },
}, { timestamps: true, versionKey: false }); // ✅ Disables __v versioning

module.exports = mongoose.model('Stock', StockSchema);
