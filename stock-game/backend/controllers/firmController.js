const Stock = require("../models/Stock");
const Firm = require("../models/Firm");

// Utility: Pick a random element
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const strategies = {
    momentum: async (firm) => {
        const topStocks = await Stock.find().sort({ change: -1 }).limit(5);
        const bottomStocks = await Stock.find().sort({ change: 1 }).limit(5);

        const buyCandidate = randomElement(topStocks);
        const sellCandidate = randomElement(
            bottomStocks.filter(s => firm.ownedShares?.[s.ticker] > 0)
        );

        if (Math.random() < 0.5 && buyCandidate) {
            console.log(`📈 ${firm.name} [Momentum] buying ${buyCandidate.ticker}`);
            return await executeFirmTrade(firm, buyCandidate, 'buy');
        }

        if (sellCandidate) {
            console.log(`📉 ${firm.name} [Momentum] selling ${sellCandidate.ticker}`);
            return await executeFirmTrade(firm, sellCandidate, 'sell');
        }

        return null;
    },

    contrarian: async (firm) => {
        const bottomStocks = await Stock.find().sort({ change: 1 }).limit(5);
        const buyCandidate = randomElement(bottomStocks);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sellCandidate = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < 0.5 && buyCandidate) {
            console.log(`📈 ${firm.name} [Contrarian] buying ${buyCandidate.ticker}`);
            return await executeFirmTrade(firm, buyCandidate, 'buy');
        }

        if (sellCandidate) {
            console.log(`📉 ${firm.name} [Contrarian] selling ${sellCandidate.ticker}`);
            return await executeFirmTrade(firm, sellCandidate, 'sell');
        }

        return null;
    },

    growth: async (firm) => {
        const growthStocks = await Stock.find().sort({ eps: -1 }).limit(5);
        const buyCandidate = randomElement(growthStocks);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sellCandidate = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < 0.6 && buyCandidate) {
            console.log(`📈 ${firm.name} [Growth] buying ${buyCandidate.ticker}`);
            return await executeFirmTrade(firm, buyCandidate, 'buy');
        }

        if (sellCandidate) {
            console.log(`📉 ${firm.name} [Growth] selling ${sellCandidate.ticker}`);
            return await executeFirmTrade(firm, sellCandidate, 'sell');
        }

        return null;
    },

    volatility: async (firm) => {
        const volatileStocks = await Stock.find().sort({ volatility: -1 }).limit(5);
        const buyCandidate = randomElement(volatileStocks);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sellCandidate = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < 0.5 && buyCandidate) {
            console.log(`📈 ${firm.name} [Volatility] buying ${buyCandidate.ticker}`);
            return await executeFirmTrade(firm, buyCandidate, 'buy');
        }

        if (sellCandidate) {
            console.log(`📉 ${firm.name} [Volatility] selling ${sellCandidate.ticker}`);
            return await executeFirmTrade(firm, sellCandidate, 'sell');
        }

        return null;
    },

    balanced: async (firm) => {
        const [buyCandidate] = await Stock.aggregate([{ $sample: { size: 1 } }]);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sellCandidate = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < 0.5 && buyCandidate) {
            console.log(`📈 ${firm.name} [Balanced] buying ${buyCandidate.ticker}`);
            return await executeFirmTrade(firm, buyCandidate, 'buy');
        }

        if (sellCandidate) {
            console.log(`📉 ${firm.name} [Balanced] selling ${sellCandidate.ticker}`);
            return await executeFirmTrade(firm, sellCandidate, 'sell');
        }

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

        firm.ownedShares[stock.ticker] = currentShares + shares;
        firm.balance -= shares * stock.price;

        firm.transactions.push({
            type: 'buy',
            ticker: stock.ticker,
            shares,
            price: stock.price,
            total: shares * stock.price,
            date: new Date()
        });

        console.log(`🏢 ${firm.name} bought ${shares} shares of ${stock.ticker}`);
    }

    if (action === 'sell') {
        if (currentShares <= 0) return null;

        const sharesToSell = Math.ceil(currentShares * firm.riskTolerance);
        const proceeds = sharesToSell * stock.price;

        firm.balance += proceeds;
        const remaining = currentShares - sharesToSell;

        if (remaining > 0) {
            firm.ownedShares[stock.ticker] = remaining;
        } else {
            delete firm.ownedShares[stock.ticker];
        }

        firm.transactions.push({
            type: 'sell',
            ticker: stock.ticker,
            shares: sharesToSell,
            price: stock.price,
            total: proceeds,
            date: new Date()
        });

        console.log(`🏢 ${firm.name} sold ${sharesToSell} shares of ${stock.ticker}`);
    }

    firm.markModified('ownedShares'); // ✅ Ensures Mongoose tracks the nested object update
    await firm.save();
    console.log(`${firm.name} portfolio after trade:`, firm.ownedShares);

    return { ticker: stock.ticker, shares: 1 };
};

const processFirms = async () => {
    try {
        const firms = await Firm.find();
        const allTrades = [];

        for (const firm of firms) {
            const strategyFn = strategies[firm.strategy];
            if (strategyFn) {
                const trade = await strategyFn(firm);
                if (trade) allTrades.push(trade);
            }
        }

        return allTrades;
    } catch (err) {
        console.error("Error processing firms:", err);
        return [];
    }
};

module.exports = { processFirms };
