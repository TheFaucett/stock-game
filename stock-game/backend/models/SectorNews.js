const mongoose = require('mongoose');

const SectorNewsSchema = new mongoose.Schema({
    sectors: Object, // Holds all sectors as key-value pairs
    date: { type: Date, default: Date.now }
});

SectorNewsSchema.statics.getLatest = async function () {
    return this.find().sort({ createdAt: -1 }).limit(5);
}


module.exports = mongoose.model('SectorNews', SectorNewsSchema);
