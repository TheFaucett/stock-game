const mongoose = require('mongoose');

const SectorNewsSchema = new mongoose.Schema({
    sectors: Object, // Holds all sectors as key-value pairs
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SectorNews', SectorNewsSchema);
