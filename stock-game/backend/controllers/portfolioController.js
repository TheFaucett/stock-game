const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const mongoose = require('mongoose');
const User = require('../models/User');
const { ObjectId } = mongoose.Types;
const { getCurrentTick } = require('../utils/tickTracker');
const { getOption, recordOptionPurchase } = require('../utils/optionUtils');



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




/* ------------------------------------------------------------------ */
/* POST /api/portfolio/:id/transactions                               */
/* Body: { userId, type, ticker, shares, strike?, expiryTick? }       */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------
   POST /api/portfolio/:id/transactions
   Body: { userId, type, ticker, shares, strike?, expiryTick? }
------------------------------------------------------------------*/
exports.executeTransaction = async (req, res) => {
  try {
    /* ---- destructure body ---- */
    const {
      userId,
      type:  tradeType,           // buy | sell | short | cover | call | put
      ticker,
      shares,
      strike,
      expiryTick
    } = req.body;

    const ALLOWED = ['buy', 'sell', 'short', 'cover', 'call', 'put'];
    console.log('RAW BODY →', req.body);

    if (!userId || !ticker || +shares <= 0 || !ALLOWED.includes(tradeType)) {
      return res.status(400).json({ error: 'Invalid transaction data.' });
    }

    /* ---- fetch or create portfolio ---- */
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $setOnInsert: {
          balance: 10000,
          ownedShares: new Map(),
          borrowedShares: new Map(),
          transactions: []
        }
      },
      { new: true, upsert: true }
    );

    const tickNow = getCurrentTick();


    switch (tradeType) {
      /* ===== STOCK BUY / SELL =================================== */
      case 'buy':
      case 'sell': {
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) return res.status(404).json({ error: 'Stock not found' });

        const cash = shares * stock.price;

        if (tradeType === 'buy') {
          if (portfolio.balance < cash)
            return res.status(400).json({ error: 'Insufficient balance' });

          portfolio.balance -= cash;
          portfolio.ownedShares.set(
            ticker,
            (portfolio.ownedShares.get(ticker) || 0) + shares
          );
        } else {
          const owned = portfolio.ownedShares.get(ticker) || 0;
          if (owned < shares)
            return res.status(400).json({ error: 'Not enough shares to sell' });

          portfolio.balance += cash;
          portfolio.ownedShares.set(ticker, owned - shares);
          if (portfolio.ownedShares.get(ticker) === 0)
            portfolio.ownedShares.delete(ticker);
        }

        portfolio.transactions.push({
          type: tradeType,
          ticker,
          shares,
          price: stock.price,
          total: cash,
          date: new Date(),
          tickOpened: tickNow
        });
        break;
      }

      /* ===== SHORT / COVER ====================================== */
      case 'short':
      case 'cover': {
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) return res.status(404).json({ error: 'Stock not found' });

        const cash = shares * stock.price;

        if (tradeType === 'short') {
          portfolio.balance += cash; // receive proceeds now
          portfolio.borrowedShares.set(
            ticker,
            (portfolio.borrowedShares.get(ticker) || 0) + shares
          );
        } else {                     // cover
          const owed = portfolio.borrowedShares.get(ticker) || 0;
          if (owed < shares)
            return res.status(400).json({ error: 'Not enough shorted shares to cover' });
          if (portfolio.balance < cash)
            return res.status(400).json({ error: 'Insufficient balance to cover' });

          portfolio.balance -= cash;
          portfolio.borrowedShares.set(ticker, owed - shares);
          if (portfolio.borrowedShares.get(ticker) === 0)
            portfolio.borrowedShares.delete(ticker);
        }

        portfolio.transactions.push({
          type: tradeType,
          ticker,
          shares,
          price: stock.price,
          total: cash,
          date: new Date(),
          tickOpened: tickNow
        });
        break;
      }

      /* ===== CALL / PUT ========================================= */
        case 'call':
        case 'put': {
        console.log('⏳ Entering options branch:', { tradeType, ticker, shares, strike, expiryTick });
        
        if (typeof strike === 'undefined' || typeof expiryTick === 'undefined') {
            console.warn('❌ Missing strike or expiryTick', { strike, expiryTick });
            return res.status(400).json({ error: 'strike and expiryTick required for options' });
        }

        console.log('🔎 Looking up option:', { underlying: ticker.toUpperCase(), variant: tradeType.toUpperCase(), strike, expiryTick });
        const optionDoc = await getOption(ticker, tradeType.toUpperCase(), strike, expiryTick);
        console.log('📄 getOption returned:', optionDoc);

        if (!optionDoc) {
            console.error('❌ Option contract not found');
            return res.status(404).json({ error: 'Option contract not found' });
        }

        console.log('💰 Portfolio balance before purchase:', portfolio.balance);
        try {
            recordOptionPurchase({
            portfolio,
            optionDoc,
            contracts: shares,
            tickNow,
            tradeType
            });
            console.log('✅ recordOptionPurchase succeeded, new balance:', portfolio.balance);
        } catch (err) {
            console.error('❌ recordOptionPurchase threw:', err.message);
            return res.status(400).json({ error: err.message });
        }
        break;
        }

    } // end switch

    /* ---- save and respond ---- */
    await portfolio.save();
    res.json({ balance: portfolio.balance, message: 'Transaction recorded' });

  } catch (err) {
    console.error('Transaction error:', err);
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