const express = require('express');
const router = express.Router();
const User = require('../models/User'); // ✅ Import User model
const mongoose = require('mongoose'); // ✅ Required for ObjectId conversion


//TEST
router.get('/', (req, res) => {
    res.json({ message: "Users route is working!" });
});


// 📌 GET User Balance (by ObjectId)
router.get('/:userId/balance', async (req, res) => {
    try {
        const userId = req.params.userId;

        // ✅ Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ balance: user.balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching balance' });
    }
});

// 📌 UPDATE User Balance

/* This logic is already implemented in portfolioController.js 
router.post('/:userId/balance', async (req, res) => {
    const { amount } = req.body;

    if (typeof amount !== 'number') {
        return res.status(400).json({ error: 'Invalid balance amount' });
    }

    try {
        const userId = req.params.userId;

        // ✅ Ensure valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: amount } }, // ✅ Atomic balance update
            { new: true, upsert: true }
        );

        res.json({ balance: user.balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating balance' });
    }
});
*/
module.exports = router;
