const mongoose = require("mongoose");

/* one row per option contract (strike / expiry) */
const optionSchema = new mongoose.Schema({
  underlying:  { type: String, required: true },            // e.g. "ASTC"
  type:        { type: String, enum: ["CALL", "PUT"], required: true },
  strike:      { type: Number, required: true },
  expiryTick:  { type: Number, required: true },
  premium:     { type: Number, required: true },            // $ per contract
  iv:          { type: Number, default: 0.35 },
  multiplier:  { type: Number, default: 100 }               // contracts × 100 shares
});

module.exports = mongoose.model("Option", optionSchema);
