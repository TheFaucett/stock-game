const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { getCurrentTick } = require('../utils/tickTracker');
const { getOption, recordOptionPurchase } = require('../utils/optionUtils');
const findOrCreatePortfolio = require('../middleware/findOrCreatePortfolio');

//
// 📌 GET Portfolio
//
exports.getPortfolio = async (req, res) => {
  try {
    const { userId } = req.params;
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

//
// 📌 POST /api/portfolio/:userId/transactions
//
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
      //
      // ===== STOCK BUY / SELL =====
      //
      case 'buy':
      case 'sell': {
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) return res.status(404).json({ error: 'Stock not found' });

        const cash = shares * stock.price;
        const key = ticker.toUpperCase();

        // Ensure ownedShares is a Map
        if (!(portfolio.ownedShares instanceof Map)) {
          portfolio.ownedShares = new Map(Object.entries(portfolio.ownedShares || {}));
        }

        if (tradeType === 'buy') {
          if (portfolio.balance < cash) {
            return res.status(400).json({ error: 'Insufficient balance' });
          }
          portfolio.balance -= cash;
          const prev = portfolio.ownedShares.get(key) || 0;
          portfolio.ownedShares.set(key, prev + shares);
          portfolio.markModified('ownedShares');
          await portfolio.save();
        } else {
          const owned = portfolio.ownedShares.get(key) || 0;
          if (owned < shares) {
            return res.status(400).json({ error: 'Not enough shares to sell' });
          }
          portfolio.balance += cash;
          portfolio.ownedShares.set(key, owned - shares);
          if (portfolio.ownedShares.get(key) === 0) portfolio.ownedShares.delete(key);
        }

        portfolio.markModified('ownedShares');

        const enriched = await enrichTransactionData({
          tradeType,
          ticker: key,
          shares,
          price: stock.price,
          strike,
          expiryTick,
          portfolio
        });

        portfolio.transactions.push({
          type: tradeType,
          ticker: key,
          shares,
          price: stock.price,
          total: cash,
          date: new Date(),
          tickOpened: tickNow,
          ...enriched
        });
        break;
      }

      //
      // ===== SHORT / COVER =====
      //
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
          if (owed < shares) {
            return res.status(400).json({ error: 'Not enough shorted shares to cover' });
          }
          if (portfolio.balance < cash) {
            return res.status(400).json({ error: 'Insufficient balance to cover' });
          }
          portfolio.balance -= cash;
          portfolio.borrowedShares[key] = owed - shares;
          if (portfolio.borrowedShares[key] === 0) delete portfolio.borrowedShares[key];
        }

        const enriched = await enrichTransactionData({
          tradeType,
          ticker: key,
          shares,
          price: stock.price,
          strike,
          expiryTick,
          portfolio
        });

        portfolio.transactions.push({
          type: tradeType,
          ticker: key,
          shares,
          price: stock.price,
          total: cash,
          date: new Date(),
          tickOpened: tickNow,
          ...enriched
        });
        break;
      }

      //
      // ===== CALL / PUT =====
      //
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

          const optionPrice = optionDoc.premium; // per contract price
          const totalCost = optionPrice * shares;

          const enriched = await enrichTransactionData({
            tradeType,
            ticker: ticker.toUpperCase(),
            shares,
            price: optionPrice,
            strike,
            expiryTick,
            portfolio
          });

          portfolio.transactions.push({
            type: tradeType,
            ticker: ticker.toUpperCase(),
            shares,
            price: optionPrice,
            total: totalCost,
            date: new Date(),
            tickOpened: tickNow,
            ...enriched
          });
        } catch (err) {
          return res.status(400).json({ error: err.message });
        }
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid trade type' });
    }

    await portfolio.save();
    res.json({ balance: portfolio.balance, message: 'Transaction recorded' });
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//
// Helper: Calculate enrichment fields
//
async function enrichTransactionData({ tradeType, ticker, shares, price, strike, expiryTick, portfolio }) {
  const stock = await Stock.findOne({ ticker }).lean();
  if (!stock) return {};

  const currentPrice = stock.price;
  let realizedPL = null, unrealizedPL = null, percentChange = null, breakEven = null;

  // Average buy price
  let avgBuyPrice = price;
  const pastBuys = portfolio.transactions.filter(tx => tx.ticker === ticker && tx.type === 'buy');
  if (pastBuys.length) {
    const totalShares = pastBuys.reduce((sum, tx) => sum + tx.shares, 0);
    const totalCost = pastBuys.reduce((sum, tx) => sum + (tx.price * tx.shares), 0);
    avgBuyPrice = totalShares > 0 ? totalCost / totalShares : price;
  }

  if (tradeType === 'sell' || tradeType === 'cover') {
    realizedPL = (price - avgBuyPrice) * shares;
    percentChange = ((price - avgBuyPrice) / avgBuyPrice) * 100;
  } else if (tradeType === 'buy' || tradeType === 'short') {
    unrealizedPL = (currentPrice - avgBuyPrice) * shares;
    percentChange = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
  }

  if (tradeType === 'call' || tradeType === 'put') {
    const premium = price;
    breakEven = tradeType === 'call'
      ? strike + premium
      : strike - premium;
  }

  return { realizedPL, unrealizedPL, percentChange, breakEven, expiryTick };
}

//
// 📌 Sync Shares
//
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

//
// 📌 GET User Watchlist
//
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

//
// 📌 ADD Stock to Watchlist
//
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

//
// 📌 REMOVE Stock from Watchlist
//
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
