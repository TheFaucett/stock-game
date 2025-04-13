const Stock = require("../models/Stock");
const Firm = require("../models/Firm");

// Mood influence multipliers
function getMoodBias(mood) {
    return {
        buyBias: 0.4 + mood,     // Buy more as mood → 1
        sellBias: 0.6 - mood,    // Sell less as mood → 1
    };
}

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const strategies = {
    momentum: async (firm, mood) => {
        const { buyBias, sellBias } = getMoodBias(mood);
        const top = await Stock.find().sort({ change: -1 }).limit(5);
        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(top);
        const sell = randomElement(bottom.filter(s => firm.ownedShares?.[s.ticker] > 0));

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy');
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell');
        return null;
    },

    contrarian: async (firm, mood) => {
        const { buyBias, sellBias } = getMoodBias(mood);
        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(bottom);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy');
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell');
        return null;
    },

    growth: async (firm, mood) => {
        const { buyBias, sellBias } = getMoodBias(mood);
        const growth = await Stock.find().sort({ eps: -1 }).limit(5);
        const buy = randomElement(growth);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy');
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell');
        return null;
    },

    volatility: async (firm, mood) => {
        const { buyBias, sellBias } = getMoodBias(mood);
        const volatile = await Stock.find().sort({ volatility: -1 }).limit(5);
        const buy = randomElement(volatile);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy');
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell');
        return null;
    },

    balanced: async (firm, mood) => {
        const { buyBias, sellBias } = getMoodBias(mood);
        const [buy] = await Stock.aggregate([{ $sample: { size: 1 } }]);
        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy');
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell');
        return null;
    }
};

const executeFirmTrade = async (firm, stock, action) => {
    if (!stock) return null;
    firm.ownedShares = firm.ownedShares || {};
    firm.transactions = firm.transactions || [];

    const currentShares = firm.ownedShares[stock.ticker] || 0;

    if (action === 'buy') {
        const shares = Math.floor((firm.balance * firm.riskTolerance) / stock.price);
        if (shares <= 0) return null;
        firm.balance -= shares * stock.price;
        firm.ownedShares[stock.ticker] = currentShares + shares;
        firm.transactions.push({ type: 'buy', ticker: stock.ticker, shares, price: stock.price, total: shares * stock.price, date: new Date() });
    } else {
        if (currentShares <= 0) return null;
        const sharesToSell = Math.ceil(currentShares * firm.riskTolerance);
        const proceeds = sharesToSell * stock.price;
        firm.balance += proceeds;
        const remaining = currentShares - sharesToSell;
        if (remaining > 0) firm.ownedShares[stock.ticker] = remaining;
        else delete firm.ownedShares[stock.ticker];
        firm.transactions.push({ type: 'sell', ticker: stock.ticker, shares: sharesToSell, price: stock.price, total: proceeds, date: new Date() });
    }

    firm.markModified('ownedShares');
    await firm.save();
    return { ticker: stock.ticker, shares: 1 };
};

const processFirms = async (marketMood) => {
    try {
        const firms = await Firm.find();
        const allTrades = [];

        for (const firm of firms) {
            const strategyFn = strategies[firm.strategy];
            if (strategyFn) {
                const trade = await strategyFn(firm, marketMood); // 👈 pass mood in
                if (trade) allTrades.push(trade);
            }
        }

        return allTrades.reduce((acc, t) => {
            acc[t.ticker] = (acc[t.ticker] || 0) + t.shares;
            return acc;
        }, {});
    } catch (err) {
        console.error("Error processing firms:", err);
        return {};
    }
};

module.exports = { processFirms };
