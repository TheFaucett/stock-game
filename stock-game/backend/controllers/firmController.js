const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
// Utility: Pick a random element
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Simulated strategies
const strategies = {
    momentum: async (firm) => {
        const topStocks = await Stock.find().sort({ change: -1 }).limit(5);
        const pick = randomElement(topStocks);
        return await executeFirmTrade(firm, pick, 'buy');
    },

    contrarian: async (firm) => {
        const bottomStocks = await Stock.find().sort({ change: 1 }).limit(5);
        const pick = randomElement(bottomStocks);
        return await executeFirmTrade(firm, pick, 'buy');
    },

    growth: async (firm) => {
        const growthStocks = await Stock.find().sort({ eps: -1 }).limit(5);
        const pick = randomElement(growthStocks);
        return await executeFirmTrade(firm, pick, 'buy');
    },

    volatility: async (firm) => {
        const volatileStocks = await Stock.find().sort({ volatility: -1 }).limit(5);
        const pick = randomElement(volatileStocks);
        return await executeFirmTrade(firm, pick, 'buy');
    },

    balanced: async (firm) => {
        const pick = await Stock.aggregate([{ $sample: { size: 1 } }]);
        if (pick.length) return await executeFirmTrade(firm, pick[0], 'buy');
        return null;
    }
};

// Buy helper
const executeFirmTrade = async (firm, stock, action) => {
    if (action !== 'buy') return null; // Placeholder for future sell logic

    const shares = Math.floor((firm.balance * firm.riskTolerance) / stock.price);
    if (shares <= 0) return null;

    const totalCost = shares * stock.price;
    firm.balance -= totalCost;

    // Ensure ownedShares is a Map
    if (!(firm.ownedShares instanceof Map)) {
        firm.ownedShares = new Map(Object.entries(firm.ownedShares || {}));
    }

    // Ensure transactions is an array
    if (!Array.isArray(firm.transactions)) {
        firm.transactions = [];
    }

    firm.ownedShares.set(stock.ticker, (firm.ownedShares.get(stock.ticker) || 0) + shares);

    firm.transactions.push({
        type: 'buy',
        ticker: stock.ticker,
        shares,
        price: stock.price,
        total: totalCost,
        date: new Date()
    });

    // Convert Map back to plain object before saving
    firm.ownedShares = Object.fromEntries(firm.ownedShares);

    await firm.save();
    console.log(`🏢 Firm ${firm.name} bought ${shares} shares of ${stock.ticker}`);

    return { ticker: stock.ticker, shares }; // Return trade info
};

// Main function to simulate firm activity
const processFirms = async () => {
    try {
        const firms = await Firm.find();
        const allTrades = [];

        for (const firm of firms) {
            const strategy = strategies[firm.strategy];
            if (strategy) {
                const trade = await strategy(firm);
                if (trade) allTrades.push(trade);
            } else {
                console.warn(`⚠️ No strategy implemented for ${firm.strategy}`);
            }
        }

        return allTrades; // Return all trades
    } catch (err) {
        console.error('Error processing firms:', err);
        return [];
    }
};

module.exports = { processFirms };
