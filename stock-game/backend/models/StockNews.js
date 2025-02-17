const mongoose = require('mongoose');

const StockNewsSchema = new mongoose.Schema({
    sectors: Object, // Each sector contains an array of stock news objects
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockNews', StockNewsSchema);
