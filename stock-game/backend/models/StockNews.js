const mongoose = require('mongoose');

const StockNewsSchema = new mongoose.Schema({
    sectors: Object, // Each sector contains an array of stock news objects
    date: { type: Date, default: Date.now }
});

StockNewsSchema.statics.getLatest = async function () {
    return this.find().sort({ createdAt: -1 }).limit(5);
}

module.exports = mongoose.model('StockNews', StockNewsSchema);
