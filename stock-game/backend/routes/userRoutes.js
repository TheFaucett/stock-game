const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import User model
const mongoose = require('mongoose'); // Needed for ObjectId conversion

// 📌 Get user's balance (by ObjectId)
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Ensure valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        let user = await User.findById(userId);

        if (!user) {
            // If user doesn't exist, create with default balance
            user = await User.create({ _id: userId, name: "New User", balance: 10000 });
        }

        res.json({ balance: user.balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching balance' });
    }
});

// 📌 Update user's balance (by ObjectId)
router.post('/:userId', async (req, res) => {
    const { amount } = req.body;

    if (typeof amount !== 'number') {
        return res.status(400).json({ error: 'Invalid balance amount' });
    }

    try {
        const userId = req.params.userId;
        
        // Ensure valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: amount } }, // ✅ Atomic balance update
            { new: true, upsert: true } // ✅ Create if not exists
        );

        res.json({ balance: user.balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating balance' });
    }
});

module.exports = router;
