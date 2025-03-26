const mongoose = require('mongoose');

const firmSchema = new mongoose.Schema({
    name: String,
    strategy: String, // e.g., 'momentum', 'meanReversion', 'value'
    riskTolerance: Number, // 0.0 - 1.0
    tradingFrequency: Number, // e.g., trades every N cycles
    balance: Number,
    portfolio: {
        type: Map,
        of: Number // ticker -> shares
    },
    lastTradeCycle: Number // helps throttle trading
});

module.exports = mongoose.model('Firm', firmSchema);
