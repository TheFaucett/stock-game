const mongoose = require('mongoose');

const GlobalNewsSchema = new mongoose.Schema({
    description: String,
    sentimentScore: Number,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GlobalNews', GlobalNewsSchema);
