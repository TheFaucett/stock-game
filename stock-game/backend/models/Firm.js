const mongoose = require('mongoose');

const firmSchema = new mongoose.Schema({
    name: String,
    strategy: String,
    riskTolerance: Number,
    tradingFrequency: Number,
    balance: Number,
    ownedShares: {
        type: Object,
        default: {}
    },
    transactions: {
        type: Array,
        default: []
    },
    lastTradeCycle: Number
});

module.exports = mongoose.model('Firm', firmSchema);