const mongoose = require('mongoose');
const { getCurrentTick } = require('../utils/tickTracker.js');
const optionSchema = new mongoose.Schema({
  underlying : { type: String, required: true }, // e.g. "ASTC"
  variant    : { type: String, enum: ['CALL', 'PUT'], required: true },
  strike     : { type: Number, required: true },
  expiryTick : { type: Number, required: true, default: getCurrentTick() + 10 }, // 10 ticks from now
  premium    : { type: Number, required: true }, // price per contract
  createdAt  : { type: Number, required: true, default: getCurrentTick()},
}, { indexes: [{ unique: true, fields: { underlying:1, variant:1, strike:1, expiryTick:1 } }] });

module.exports = mongoose.model('Option', optionSchema);
