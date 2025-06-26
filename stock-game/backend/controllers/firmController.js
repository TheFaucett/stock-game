const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const { getCurrentTick } = require("../utils/tickTracker.js");
const { getEconomicFactors } = require("../utils/economicEnvironment.js");
// Mood influence multipliers
function getMoodBias(mood) {
    return {
        buyBias: 0.4 + mood,     // Buy more as mood → 1
        sellBias: 0.6 - mood,    // Sell less as mood → 1
    };
}
function updateMemoryAndEmotions(firm, stock, action, tradePrice, econ, outcome) {
    // ---- MEMORY ----
    if (!firm.memory) firm.memory = {};
    const ticker = stock.ticker;
    const m = firm.memory[ticker] || { recentPrices: [], lastOutcome: 'neutral' };
    m.recentPrices.push(tradePrice);
    if (m.recentPrices.length > 10) m.recentPrices.shift();
    m.lastOutcome = outcome;
    firm.memory[ticker] = m;

    // ---- EMOTIONS ----
    // Boom/recession as extra effect
    if (!firm.emotions) firm.emotions = { confidence: 0.5, frustration: 0, greed: 0.5, regret: 0 };

    if (outcome === 'win') {
        firm.emotions.confidence = Math.min(1, firm.emotions.confidence + 0.05);
        firm.emotions.frustration = Math.max(0, firm.emotions.frustration - 0.05);
        firm.emotions.greed = Math.min(1, firm.emotions.greed + 0.03);
        firm.emotions.regret = Math.max(0, firm.emotions.regret - 0.03);
    } else if (outcome === 'loss') {
        firm.emotions.confidence = Math.max(0, firm.emotions.confidence - 0.07);
        firm.emotions.frustration = Math.min(1, firm.emotions.frustration + 0.07);
        firm.emotions.greed = Math.max(0, firm.emotions.greed - 0.03);
        firm.emotions.regret = Math.min(1, firm.emotions.regret + 0.05);
    } else { // neutral
        firm.emotions.confidence += (0.5 - firm.emotions.confidence) * 0.05;
        firm.emotions.frustration += (0 - firm.emotions.frustration) * 0.03;
        firm.emotions.greed += (0.5 - firm.emotions.greed) * 0.03;
        firm.emotions.regret += (0 - firm.emotions.regret) * 0.03;
    }

    // Macro event effect
    if (econ.macroEvent === "recession") {
        firm.emotions.confidence = Math.max(0, firm.emotions.confidence - 0.03);
        firm.emotions.regret = Math.min(1, firm.emotions.regret + 0.04);
    }
    if (econ.macroEvent === "boom") {
        firm.emotions.confidence = Math.min(1, firm.emotions.confidence + 0.03);
        firm.emotions.greed = Math.min(1, firm.emotions.greed + 0.02);
    }
}

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const strategies = {
    momentum: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        // Macro event tweaks
        if (econ.macroEvent === "boom") buyBias += 0.08;
        if (econ.macroEvent === "recession") sellBias += 0.10;

        const top = await Stock.find().sort({ change: -1 }).limit(5);
        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(top);
        const sell = randomElement(bottom.filter(s => firm.ownedShares?.[s.ticker] > 0));

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy', econ);
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    contrarian: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "recession") buyBias += 0.05; // Contrarians buy more in downturns
        if (econ.macroEvent === "boom") sellBias += 0.04; // Sell a little more in booms

        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(bottom);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy', econ);
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    growth: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.06;    // Growth loves booms
        if (econ.macroEvent === "recession") sellBias += 0.08; // More likely to sell in recession

        const growth = await Stock.find().sort({ eps: -1 }).limit(5);
        const buy = randomElement(growth);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy', econ);
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    volatility: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        // In high inflation (proxy for macroEvent), increase buy/sell activity
        if (econ.macroEvent === "boom" || econ.inflationRate > 0.04) buyBias += 0.04;
        if (econ.macroEvent === "recession" || econ.inflationRate > 0.05) sellBias += 0.05;

        const volatile = await Stock.find().sort({ volatility: -1 }).limit(5);
        const buy = randomElement(volatile);

        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy', econ);
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    balanced: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        // Macro tweaks, but less extreme for balanced
        if (econ.macroEvent === "boom") buyBias += 0.04;
        if (econ.macroEvent === "recession") sellBias += 0.04;

        const [buy] = await Stock.aggregate([{ $sample: { size: 1 } }]);
        const tickers = Object.keys(firm.ownedShares || {});
        const sellTicker = randomElement(tickers);
        const sell = sellTicker ? await Stock.findOne({ ticker: sellTicker }) : null;

        if (Math.random() < buyBias && buy) return executeFirmTrade(firm, buy, 'buy', econ);
        if (Math.random() < sellBias && sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    }
};


const executeFirmTrade = async (firm, stock, action, econ) => {
    if (!stock) return null;
    firm.ownedShares = firm.ownedShares || {};
    firm.transactions = firm.transactions || [];
    firm.memory = firm.memory || {};
    firm.emotions = firm.emotions || { confidence: 0.5, frustration: 0, greed: 0.5, regret: 0 };

    const currentShares = firm.ownedShares[stock.ticker] || 0;
    let outcome = "neutral";
    let realizedPL = 0;

    if (action === "buy") {
        const shares = Math.floor((firm.balance * firm.riskTolerance) / stock.price);
        if (shares <= 0) return null;
        firm.balance -= shares * stock.price;
        firm.ownedShares[stock.ticker] = currentShares + shares;
        firm.transactions.push({
            type: "buy", ticker: stock.ticker, shares, price: stock.price, total: shares * stock.price, date: new Date()
        });
        // For a buy, wait for sell to determine win/loss.
    } else {
        if (currentShares <= 0) return null;
        const sharesToSell = Math.ceil(currentShares * firm.riskTolerance);
        const proceeds = sharesToSell * stock.price;
        firm.balance += proceeds;
        const remaining = currentShares - sharesToSell;
        if (remaining > 0) firm.ownedShares[stock.ticker] = remaining;
        else delete firm.ownedShares[stock.ticker];
        firm.transactions.push({
            type: "sell", ticker: stock.ticker, shares: sharesToSell, price: stock.price, total: proceeds, date: new Date()
        });

        // Calculate win/loss using memory of entry price
        const mem = firm.memory[stock.ticker];
        if (mem && mem.recentPrices && mem.recentPrices.length) {
            const buyPrice = mem.recentPrices[0];
            realizedPL = stock.price - buyPrice;
            outcome = realizedPL > 0 ? "win" : (realizedPL < 0 ? "loss" : "neutral");
        }
    }

    updateMemoryAndEmotions(firm, stock, action, stock.price, econ, outcome);

    firm.markModified("ownedShares");
    firm.markModified("memory");
    firm.markModified("emotions");
    await firm.save();
    return { ticker: stock.ticker, shares: 1 };
};


const processFirms = async (marketMood) => {
    try {
        const firms = await Firm.find();
        const allTrades = [];
        const currentTick = getCurrentTick();
        const econ = getEconomicFactors(); // <-- Macro context

        for (const firm of firms) {
            // Only trade if enough ticks have passed since last trade
            if (
                typeof firm.lastTradeCycle === "number" &&
                typeof firm.tradingFrequency === "number" &&
                currentTick - firm.lastTradeCycle < firm.tradingFrequency
            ) {
                continue;
            }

            const strategyFn = strategies[firm.strategy];
            if (strategyFn) {
                // Pass econ context to strategy (and thus executeFirmTrade)
                const trade = await strategyFn(firm, marketMood, econ);

                if (trade) {
                    firm.lastTradeCycle = currentTick;
                    await firm.save();
                    allTrades.push(trade);
                }
            }
        }

        // Aggregate trades as before
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
