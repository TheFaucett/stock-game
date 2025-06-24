const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { getCurrentTick } = require('../utils/tickTracker');
const { getOption, recordOptionPurchase } = require('../utils/optionUtils');
const findOrCreatePortfolio = require('../middleware/findOrCreatePortfolio');

// 📌 GET Portfolio
exports.getPortfolio = async (req, res) => {
    try {
        let { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const portfolio = await findOrCreatePortfolio(userId);

        res.json(portfolio);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 📌 POST /api/portfolio/:id/transactions
exports.executeTransaction = async (req, res) => {
    try {
        const {
            userId,
            type: tradeType, // buy | sell | short | cover | call | put
            ticker,
            shares,
            strike,
            expiryTick
        } = req.body;

        const ALLOWED = ['buy', 'sell', 'short', 'cover', 'call', 'put'];
        if (!userId || !ticker || +shares <= 0 || !ALLOWED.includes(tradeType)) {
            return res.status(400).json({ error: 'Invalid transaction data.' });
        }

        const portfolio = await findOrCreatePortfolio(userId);
        const tickNow = getCurrentTick();

        switch (tradeType) {
            // ===== STOCK BUY / SELL =====
            case 'buy':
            case 'sell': {
                const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
                if (!stock) return res.status(404).json({ error: 'Stock not found' });

                const cash = shares * stock.price;
                const key = ticker.toUpperCase();

                if (tradeType === 'buy') {
                    if (portfolio.balance < cash)
                        return res.status(400).json({ error: 'Insufficient balance' });

                    portfolio.balance -= cash;
                    // Update shares
                    portfolio.ownedShares[key] = (portfolio.ownedShares[key] || 0) + shares;
                } else {
                    const owned = portfolio.ownedShares[key] || 0;
                    if (owned < shares)
                        return res.status(400).json({ error: 'Not enough shares to sell' });

                    portfolio.balance += cash;
                    portfolio.ownedShares[key] = owned - shares;
                    if (portfolio.ownedShares[key] === 0) delete portfolio.ownedShares[key];
                }

                portfolio.transactions.push({
                    type: tradeType,
                    ticker: key,
                    shares,
                    price: stock.price,
                    total: cash,
                    date: new Date(),
                    tickOpened: tickNow
                });
                break;
            }

            // ===== SHORT / COVER =====
            case 'short':
            case 'cover': {
                const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
                if (!stock) return res.status(404).json({ error: 'Stock not found' });

                const cash = shares * stock.price;
                const key = ticker.toUpperCase();

                if (tradeType === 'short') {
                    portfolio.balance += cash;
                    portfolio.borrowedShares[key] = (portfolio.borrowedShares[key] || 0) + shares;
                } else {
                    const owed = portfolio.borrowedShares[key] || 0;
                    if (owed < shares)
                        return res.status(400).json({ error: 'Not enough shorted shares to cover' });
                    if (portfolio.balance < cash)
                        return res.status(400).json({ error: 'Insufficient balance to cover' });

                    portfolio.balance -= cash;
                    portfolio.borrowedShares[key] = owed - shares;
                    if (portfolio.borrowedShares[key] === 0) delete portfolio.borrowedShares[key];
                }

                portfolio.transactions.push({
                    type: tradeType,
                    ticker: key,
                    shares,
                    price: stock.price,
                    total: cash,
                    date: new Date(),
                    tickOpened: tickNow
                });
                break;
            }

            // ===== CALL / PUT =====
            case 'call':
            case 'put': {
                if (typeof strike === 'undefined' || typeof expiryTick === 'undefined') {
                    return res.status(400).json({ error: 'strike and expiryTick required for options' });
                }

                const optionDoc = await getOption(ticker, tradeType.toUpperCase(), strike, expiryTick);
                if (!optionDoc) {
                    return res.status(404).json({ error: 'Option contract not found' });
                }

                try {
                    recordOptionPurchase({
                        portfolio,
                        optionDoc,
                        contracts: shares,
                        tickNow,
                        tradeType
                    });
                } catch (err) {
                    return res.status(400).json({ error: err.message });
                }
                break;
            }
        }

        await portfolio.save();
        res.json({ balance: portfolio.balance, message: 'Transaction recorded' });

    } catch (err) {
        console.error('Transaction error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 🟢 Sync Shares
exports.syncShares = async (req, res) => {
    try {
        const { userId, ownedShares } = req.body;
        if (!userId || !ownedShares || typeof ownedShares !== 'object') {
            return res.status(400).json({ error: 'Invalid data. Ensure userId and ownedShares are provided.' });
        }

        const portfolio = await findOrCreatePortfolio(userId);
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

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const portfolio = await findOrCreatePortfolio(userId);

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

        const portfolio = await findOrCreatePortfolio(userId);

        const symbol = ticker.toUpperCase();
        if (!portfolio.watchlist.includes(symbol)) {
            portfolio.watchlist.push(symbol);
            await portfolio.save();
        }

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

        if (!ticker || typeof ticker !== 'string') {
            return res.status(400).json({ error: 'Invalid stock ticker' });
        }

        const portfolio = await findOrCreatePortfolio(userId);

        const symbol = ticker.toUpperCase();
        portfolio.watchlist = portfolio.watchlist.filter(t => t !== symbol);
        await portfolio.save();

        res.json({ watchlist: portfolio.watchlist });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
