const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

exports.getPortfolio = async (req, res) => {
    try {
        console.log("Incoming request for portfolio:", req.query);
        let { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Convert userId to ObjectId before querying
        const portfolio = await Portfolio.findOne({ userId: new ObjectId(userId) });

        console.log("Found portfolio:", portfolio);
        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        res.json(portfolio);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.executeTransaction = async (req, res) => {
    try {
        const { userId, type, ticker, shares } = req.body;

        if (!userId || !ticker || shares <= 0) {
            return res.status(400).json({ error: 'Invalid transaction data.' });
        }

        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) return res.status(404).json({ error: 'Stock not found' });

        const portfolio = await Portfolio.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { $setOnInsert: { balance: 10000, ownedShares: new Map(), transactions: [] } },
            { new: true, upsert: true }
        );

        const totalCost = shares * stock.price;

        if (type === 'buy' && portfolio.balance < totalCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (type === 'sell' && (!portfolio.ownedShares.get(ticker) || portfolio.ownedShares.get(ticker) < shares)) {
            return res.status(400).json({ error: 'Not enough shares to sell' });
        }

        const balanceChange = type === 'buy' ? -totalCost : totalCost;
        const shareChange = type === 'buy' ? shares : -shares;

        // ✅ Atomic update
        portfolio.balance += balanceChange;
        portfolio.ownedShares.set(ticker, (portfolio.ownedShares.get(ticker) || 0) + shareChange);

        if (portfolio.ownedShares.get(ticker) === 0) {
            portfolio.ownedShares.delete(ticker);
        }

        portfolio.transactions.push({
            type,
            ticker,
            shares,
            price: stock.price,
            total: totalCost,
            date: new Date()
        });

        await portfolio.save();
        res.json({ message: `Transaction successful`, portfolio });

    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 🟢 Sync Shares (Updates Portfolio with Provided Owned Shares)
exports.syncShares = async (req, res) => {
    try {
        const { userId, ownedShares } = req.body;

        if (!userId || !ownedShares || typeof ownedShares !== 'object') {
            return res.status(400).json({ error: 'Invalid data. Ensure userId and ownedShares are provided.' });
        }

        const portfolio = await Portfolio.findOne({ user: userId });

        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        portfolio.ownedShares = ownedShares;
        await portfolio.save();

        res.json({ message: 'Owned shares synced successfully' });
    } catch (error) {
        console.error('Error syncing shares:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// 📌 GET User Watchlist
exports.getWatchlist = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const portfolio = await Portfolio.findOne({ userId });

        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        res.json({ watchlist: portfolio.watchlist });
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 📌 ADD Stock to Watchlist
exports.addToWatchlist = async (req, res) => {
    try {
        const { userId } = req.params;
        const { ticker } = req.body;

        if (!ticker || typeof ticker !== 'string') {
            return res.status(400).json({ error: 'Invalid stock ticker' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const portfolio = await Portfolio.findOneAndUpdate(
            { userId },
            { $addToSet: { watchlist: ticker.toUpperCase() } }, // ✅ Prevent duplicates
            { new: true, upsert: true }
        );

        res.json({ watchlist: portfolio.watchlist });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 📌 REMOVE Stock from Watchlist
exports.removeFromWatchlist = async (req, res) => {
    try {
        const { userId, ticker } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const portfolio = await Portfolio.findOneAndUpdate(
            { userId },
            { $pull: { watchlist: ticker.toUpperCase() } }, // ✅ Remove stock from watchlist
            { new: true }
        );

        res.json({ watchlist: portfolio.watchlist });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};