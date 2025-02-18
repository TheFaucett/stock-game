const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

exports.getPortfolio = async (req, res) => {
    try {
        console.log("Incoming request for portfolio:", req.query);
        let { userId } = req.query;

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
        const { userId, type, ticker, shares } = req.body; // Make sure userId is coming from the body

        if (!userId || !ticker || shares <= 0) {
            return res.status(400).json({ error: 'Invalid transaction data. userId is required.' });
        }

        const stock = await Stock.findOne({ ticker });
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        let portfolio = await Portfolio.findOne({ userId }); // Ensure query uses userId

        if (!portfolio) {
            portfolio = new Portfolio({ 
                userId, 
                balance: 10000, 
                ownedShares: new Map(), 
                transactions: [] 
            });
        }

        const transactionTotal = shares * stock.price;

        if (type === 'buy') {
            if (portfolio.balance < transactionTotal) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            portfolio.balance -= transactionTotal;
            portfolio.ownedShares.set(ticker, (portfolio.ownedShares.get(ticker) || 0) + shares);
        } else if (type === 'sell') {
            if (!portfolio.ownedShares.get(ticker) || portfolio.ownedShares.get(ticker) < shares) {
                return res.status(400).json({ error: 'Not enough shares to sell' });
            }
            portfolio.balance += transactionTotal;
            portfolio.ownedShares.set(ticker, portfolio.ownedShares.get(ticker) - shares);
            if (portfolio.ownedShares.get(ticker) === 0) {
                portfolio.ownedShares.delete(ticker);
            }
        } else {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        portfolio.transactions.push({
            type,
            ticker,
            shares,
            price: stock.price,
            total: transactionTotal,
            date: new Date().toISOString(),
        });

        await portfolio.save();
        res.json(portfolio);
    } catch (error) {
        console.error('Error processing transaction:', error);
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
