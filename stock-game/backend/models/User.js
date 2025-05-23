const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId, // ✅ Change _id to ObjectId
    balance: { type: Number, default: 10000 }, // Default balance of 10,000
    ownedShares: { type: Map, of: Number, default: {} }, // Stores stock holdings { "AAPL": 5, "GOOG": 2 }
    transactions: [
        {
            type: { type: String, enum: ['buy', 'sell'], required: true },
            ticker: { type: String, required: true },
            shares: { type: Number, required: true },
            price: { type: Number, required: true },
            total: { type: Number, required: true },
            date: { type: Date, default: Date.now }
        }
    ]
});

// ✅ Ensure Mongoose generates ObjectId automatically if not provided
module.exports = mongoose.model('User', userSchema);
