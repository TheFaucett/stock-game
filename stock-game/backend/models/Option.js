const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  underlying : { type: String, required: true }, // e.g. "ASTC"
  variant    : { type: String, enum: ['CALL', 'PUT'], required: true },
  strike     : { type: Number, required: true },
  expiryTick : { type: Number, required: true },
  premium    : { type: Number, required: true }, // price per contract
  createdAt  : { type: Date,   default: Date.now }
}, { indexes: [{ unique: true, fields: { underlying:1, variant:1, strike:1, expiryTick:1 } }] });

module.exports = mongoose.model('Option', optionSchema);
