const mongoose = require('mongoose');

const GlobalNewsSchema = new mongoose.Schema({
    description: String,
    sentimentScore: Number,
    date: { type: Date, default: Date.now }
});

GlobalNewsSchema.statics.getLatest = async function () {
    return this.find().sort({ createdAt: -1 }).limit(5);
}


module.exports = mongoose.model('GlobalNews', GlobalNewsSchema);
